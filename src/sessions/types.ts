export interface Session {
  messageId: string;
  channelId: string;
  pageId: string;
  userId: string;
  createdAt: number;
  type: "feedback_list" | "feedback_embed";
}
