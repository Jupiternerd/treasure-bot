import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} from "discord.js";
import type { FeedbackEntry } from "../store";

function truncate(value: string, max = 1024): string {
  return value.length > max ? value.slice(0, max - 3) + "..." : value;
}

export function buildFeedbackEmbed(entry: FeedbackEntry): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setTitle("📬 New Feedback Received")
    .setColor(0x5865f2);

  const fields: { name: string; value: string; inline?: boolean }[] = [];

  if (entry.feedbackType) fields.push({ name: "📋 Feedback Type", value: entry.feedbackType, inline: true });
  if (entry.status) fields.push({ name: "📊 Status", value: entry.status, inline: true });
  if (entry.responseId) fields.push({ name: "🆔 Response ID", value: entry.responseId, inline: true });
  if (entry.phone) fields.push({ name: "📞 Phone", value: entry.phone, inline: true });
  if (entry.lovelyTellUsMore) fields.push({ name: "💬 Lovely, Tell Us More", value: truncate(entry.lovelyTellUsMore) });
  if (entry.whatsBroken) fields.push({ name: "🔧 What's Broken", value: truncate(entry.whatsBroken) });
  if (entry.draftResponse) fields.push({ name: "🤖 AI Draft Response", value: truncate(entry.draftResponse) });

  if (entry.status === "Done" || entry.status === "In Progress") {
    if (entry.responseText) fields.push({ name: "✉️ Sent Response Text", value: truncate(entry.responseText) });
    if (entry.responseLink) fields.push({ name: "🔗 Response Link", value: entry.responseLink });
  }

  const notionUrl = `https://notion.so/${entry.pageId.replace(/-/g, "")}`;
  fields.push({ name: "📎 Notion", value: `[Open in Notion](${notionUrl})` });

  embed.addFields(fields);

  return embed.setTimestamp();
}

export function buildActionRow(
  pageId: string,
): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`edit_response:${pageId}`)
      .setLabel("Edit Response")
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(`reprompt_ai:${pageId}`)
      .setLabel("Reprompt AI")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`send_email:${pageId}`)
      .setLabel("Send Email")
      .setStyle(ButtonStyle.Success),
  );
}
