import type { StringSelectMenuInteraction } from "discord.js";
import { buildActionRow, buildFeedbackEmbed } from "../../builders/feedback-embed";
import { generateDraft } from "../../gemini";
import { fetchFeedbackPage } from "../../notion";
import { sessionManager } from "../../sessions/manager";
import { store, type FeedbackEntry } from "../../store";
import type { SelectMenuHandler } from "../index";

export const feedbackSelectMenu: SelectMenuHandler = {
  customIdPrefix: "feedback_select",

  async execute(interaction: StringSelectMenuInteraction) {
    const selectedPageId = interaction.values[0];

    await interaction.deferUpdate();

    const page = await fetchFeedbackPage(selectedPageId);

    if (!page) {
      await interaction.editReply({
        content: "Feedback entry not found.",
        embeds: [],
        components: [],
      });
      return;
    }

    const existing = store.get(selectedPageId);
    const draftResponse = existing?.draftResponse
      ?? (page.responseText || (await generateDraft(page)));

    const entry: FeedbackEntry = {
      ...page,
      messageId: existing?.messageId ?? "",
      draftResponse,
    };

    store.set(selectedPageId, entry);

    const reply = await interaction.editReply({
      embeds: [buildFeedbackEmbed(entry)],
      components: [buildActionRow(selectedPageId)],
    });

    entry.messageId = reply.id;

    await sessionManager.create({
      messageId: reply.id,
      channelId: interaction.channelId,
      pageId: selectedPageId,
      userId: interaction.user.id,
      createdAt: Date.now(),
      type: "feedback_embed",
    });
  },
};
