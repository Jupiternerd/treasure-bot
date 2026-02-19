export interface FeedbackEntry {
  pageId: string;
  messageId: string;
  feedbackType: string;
  lovelyTellUsMore: string;
  status: string;
  responseId: string;
  phone: string;
  whatsBroken: string;
  responseText: string;
  responseLink: string;
  draftResponse: string;
}

export const store = new Map<string, FeedbackEntry>();
