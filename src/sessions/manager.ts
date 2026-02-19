import {
  ActionRow,
  ActionRowBuilder,
  type APIActionRowComponent,
  type APIComponentInMessageActionRow,
  type Client,
  type MessageActionRowComponent,
  type MessageActionRowComponentBuilder,
  TextChannel,
} from "discord.js";
import { loadSessions, saveSessions } from "./store";
import type { Session } from "./types";

const SESSION_TIMEOUT_MS = 12 * 60 * 60 * 1000; // 12 hours
  
class SessionManager {
  private sessions = new Map<string, Session>();
  private timeouts = new Map<string, Timer>();
  private client: Client | null = null;

  setClient(client: Client): void {
    this.client = client;
  }

  async create(session: Session): Promise<void> {
    // Only close a conflicting session when a feedback_embed targets the same pageId
    if (session.type === "feedback_embed" && session.pageId) {
      for (const [msgId, existing] of this.sessions) {
        if (
          existing.type === "feedback_embed" &&
          existing.pageId === session.pageId &&
          msgId !== session.messageId
        ) {
          await this.close(msgId);
        }
      }
    }

    // If this message already has a session (e.g. list → detail in-place),
    // just clear its old timeout without disabling components
    if (this.sessions.has(session.messageId)) {
      const oldTimeout = this.timeouts.get(session.messageId);
      if (oldTimeout) clearTimeout(oldTimeout);
      this.timeouts.delete(session.messageId);
    }

    this.sessions.set(session.messageId, session);
    this.armTimeout(session.messageId);
    this.persist();
  }

  async close(messageId: string): Promise<void> {
    const timeout = this.timeouts.get(messageId);
    if (timeout) {
      clearTimeout(timeout);
      this.timeouts.delete(messageId);
    }

    const session = this.sessions.get(messageId);
    if (session) {
      await this.disableMessageComponents(session.channelId, session.messageId);
      this.sessions.delete(messageId);
    }

    this.persist();
  }

  refresh(messageId: string): void {
    const session = this.sessions.get(messageId);
    if (!session) return;

    const timeout = this.timeouts.get(messageId);
    if (timeout) clearTimeout(timeout);

    session.createdAt = Date.now();
    this.armTimeout(messageId);
    this.persist();
  }

  async rehydrate(): Promise<void> {
    const sessions = loadSessions();

    for (const session of sessions) {
      const elapsed = Date.now() - session.createdAt;

      if (elapsed < SESSION_TIMEOUT_MS) {
        this.sessions.set(session.messageId, session);
        this.timeouts.set(
          session.messageId,
          setTimeout(() => this.close(session.messageId), SESSION_TIMEOUT_MS - elapsed),
        );
      } else {
        await this.disableMessageComponents(session.channelId, session.messageId);
      }
    }

    this.persist();
  }

  private async disableMessageComponents(
    channelId: string,
    messageId: string,
  ): Promise<void> {
    if (!this.client) return;

    try {
      const channel = await this.client.channels.fetch(channelId);
      if (!channel || !(channel instanceof TextChannel)) return;

      const message = await channel.messages.fetch(messageId);
      const disabledRows: ActionRowBuilder<MessageActionRowComponentBuilder>[] = [];

      for (const row of message.components) {
        if (!(row instanceof ActionRow)) continue;

        const disabledComponents = (row as ActionRow<MessageActionRowComponent>)
          .components.map((component) => ({
            ...component.data,
            disabled: true,
          })) as APIComponentInMessageActionRow[];

        disabledRows.push(
          ActionRowBuilder.from<MessageActionRowComponentBuilder>({
            type: 1,
            components: disabledComponents,
          } as APIActionRowComponent<APIComponentInMessageActionRow>),
        );
      }

      await message.edit({ components: disabledRows });
    } catch (error) {
      console.error("Failed to disable message components:", error);
    }
  }

  private armTimeout(messageId: string): void {
    this.timeouts.set(
      messageId,
      setTimeout(() => this.close(messageId), SESSION_TIMEOUT_MS),
    );
  }

  private persist(): void {
    saveSessions(Array.from(this.sessions.values()));
  }
}

export const sessionManager = new SessionManager();
