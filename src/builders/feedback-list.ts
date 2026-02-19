import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  StringSelectMenuBuilder,
} from "discord.js";
import type { NotionFeedbackPage } from "../notion";

const ITEMS_PER_PAGE = 5;

export function buildFeedbackListEmbed(
  pages: NotionFeedbackPage[],
  currentPage: number,
): EmbedBuilder {
  const totalPages = Math.ceil(pages.length / ITEMS_PER_PAGE);
  const start = currentPage * ITEMS_PER_PAGE;
  const slice = pages.slice(start, start + ITEMS_PER_PAGE);

  const description = slice
    .map((page, i) => {
      const num = start + i + 1;
      const type = page.feedbackType || "Unknown";
      const preview =
        (page.lovelyTellUsMore || page.whatsBroken || "No details").slice(0, 80);
      return `**${num}.** \`${type}\` — ${preview}`;
    })
    .join("\n");

  return new EmbedBuilder()
    .setTitle("Feedback Entries")
    .setColor(0x5865f2)
    .setDescription(description || "No entries.")
    .setFooter({ text: `Page ${currentPage + 1} of ${totalPages}` });
}

export function buildFeedbackSelectMenu(
  pages: NotionFeedbackPage[],
  currentPage: number,
): ActionRowBuilder<StringSelectMenuBuilder> {
  const start = currentPage * ITEMS_PER_PAGE;
  const slice = pages.slice(start, start + ITEMS_PER_PAGE);

  const select = new StringSelectMenuBuilder()
    .setCustomId("feedback_select")
    .setPlaceholder("Select a feedback entry...")
    .addOptions(
      slice.map((page) => ({
        label: (page.feedbackType || "Unknown").slice(0, 100),
        description: (page.lovelyTellUsMore || page.whatsBroken || "No details").slice(0, 100),
        value: page.pageId,
      })),
    );

  return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select);
}

export function buildPaginationRow(
  currentPage: number,
  totalItems: number,
  statusFilter?: string,
): ActionRowBuilder<ButtonBuilder> {
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
  const suffix = statusFilter ? `:${statusFilter}` : "";

  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`feedback_prev:${currentPage}${suffix}`)
      .setLabel("Previous")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(currentPage <= 0),
    new ButtonBuilder()
      .setCustomId(`feedback_next:${currentPage}${suffix}`)
      .setLabel("Next")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(currentPage >= totalPages - 1),
  );
}

const STATUS_OPTIONS = [
  "All",
  "No Response (Done)",
  "New",
  "In Progress",
  "No Response (Needs Follow-Up)",
  "Done",
];

export function buildStatusFilterRow(
  activeFilter?: string,
): ActionRowBuilder<StringSelectMenuBuilder> {
  const select = new StringSelectMenuBuilder()
    .setCustomId("status_filter")
    .setPlaceholder("Filter by status...")
    .addOptions(
      STATUS_OPTIONS.map((option) => ({
        label: option,
        value: option,
        default: option === (activeFilter || "All"),
      })),
    );

  return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select);
}
