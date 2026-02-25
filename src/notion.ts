import { Client } from "@notionhq/client";
import { config } from "./config";
import {
  getLastPollTime,
  tryMarkPageSeen,
  tryMarkContentSeen,
  hashFeedbackContent,
  pruneOldPages,
  setLastPollTime,
} from "./poller-store";

const notion = new Client({ auth: config.NOTION_TOKEN });

export interface NotionFeedbackPage {
  pageId: string;
  feedbackType: string;
  lovelyTellUsMore: string;
  status: string;
  responseId: string;
  phone: string;
  whatsBroken: string;
  responseText: string;
  responseLink: string;
}

function extractProperty(property: any): string {
  if (!property) return "";
  switch (property.type) {
    case "select":
      return property.select?.name ?? "";
    case "status":
      return property.status?.name ?? "";
    case "email":
      return property.email ?? "";
    case "phone_number":
      return property.phone_number ?? "";
    case "rich_text":
      return property.rich_text?.[0]?.plain_text ?? "";
    case "title":
      return property.title?.[0]?.plain_text ?? "";
    case "url":
      return property.url ?? "";
    default:
      return "";
  }
}

function extractPage(page: any): NotionFeedbackPage | null {
  if (!("properties" in page)) return null;

  const props = page.properties;
  return {
    pageId: page.id,
    feedbackType: extractProperty(props["Feedback Type"]),
    lovelyTellUsMore: extractProperty(props["Lovely, tell us more!"]),
    status: extractProperty(props["Status"]),
    responseId: extractProperty(props["Response ID"]),
    phone: extractProperty(props["Phone"]),
    whatsBroken: extractProperty(props["What's broken?"]),
    responseText: extractProperty(props["response_text"]),
    responseLink: extractProperty(props["response_link"]),
  };
}

export async function fetchFeedbackPages(statusFilter?: string): Promise<NotionFeedbackPage[]> {
  try {
    const response = await notion.databases.query({
      database_id: config.NOTION_DATABASE_ID,
      sorts: [{ timestamp: "created_time", direction: "descending" }],
      page_size: 100,
      ...(statusFilter && {
        filter: { property: "Status", status: { equals: statusFilter } },
      }),
    });

    const pages: NotionFeedbackPage[] = [];
    for (const result of response.results) {
      const page = extractPage(result);
      if (page) pages.push(page);
    }
    return pages;
  } catch (error) {
    console.error("Failed to fetch feedback pages:", error);
    return [];
  }
}

export async function fetchFeedbackPage(
  pageId: string,
): Promise<NotionFeedbackPage | null> {
  try {
    const result = await notion.pages.retrieve({ page_id: pageId });
    return extractPage(result);
  } catch (error) {
    console.error("Failed to fetch feedback page:", error);
    return null;
  }
}

export async function updateFeedbackResponse(
  pageId: string,
  responseLink: string,
  responseText: string,
): Promise<void> {
  const chunks: { type: "text"; text: { content: string } }[] = [];
  for (let i = 0; i < responseText.length; i += 2000) {
    chunks.push({ type: "text", text: { content: responseText.slice(i, i + 2000) } });
  }

  await notion.pages.update({
    page_id: pageId,
    properties: {
      response_link: { url: responseLink },
      response_text: { rich_text: chunks },
    },
  });
}

export async function updateFeedbackStatus(
  pageId: string,
  status: string,
): Promise<void> {
  await notion.pages.update({
    page_id: pageId,
    properties: {
      Status: { status: { name: status } },
    },
  });
}

export async function startNotionPoller(
  onNewPage: (page: NotionFeedbackPage) => void | Promise<void>,
): Promise<void> {
  let lastPollCursor = getLastPollTime() ?? new Date().toISOString();

  // Prune seen-pages older than 30 days on startup
  pruneOldPages(30);

  const poll = async () => {
    try {
      console.log("Polling Notion for new pages since", lastPollCursor);
      const response = await notion.databases.query({
        database_id: config.NOTION_DATABASE_ID,
        filter: {
          timestamp: "created_time",
          created_time: { after: lastPollCursor },
        },
        sorts: [{ timestamp: "created_time", direction: "ascending" }],
      });

      console.log(`Notion poll returned ${response.results.length} results`);

      for (const result of response.results) {
        const page = extractPage(result);
        if (!page) continue;

        if (!tryMarkPageSeen(page.pageId)) {
          console.log(`Skipping already-seen page ${page.pageId}`);
          continue;
        }

        const contentHash = hashFeedbackContent(page.feedbackType, page.lovelyTellUsMore, page.whatsBroken);
        if (!tryMarkContentSeen(contentHash, page.pageId)) {
          console.log(`Skipping duplicate content for page ${page.pageId}`);
          continue;
        }

        await onNewPage(page);
      }

      if (response.results.length > 0) {
        const lastPage = response.results[response.results.length - 1];
        if ("created_time" in lastPage) {
          lastPollCursor = lastPage.created_time;
          setLastPollTime(lastPollCursor);
        }
      }
    } catch (error) {
      console.error("Notion polling error:", error);
    }
  };

  const scheduleNext = () => setTimeout(async () => {
    await poll();
    scheduleNext();
  }, 5 * 1000);

  await poll();
  scheduleNext();
  console.log("Notion poller started (5s chained timeout)");
}
