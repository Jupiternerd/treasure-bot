import type { ModalSubmitInteraction } from "discord.js";
import { buildActionRow, buildFeedbackEmbed } from "../../builders/feedback-embed";
import { generateDraft } from "../../gemini";
import { store } from "../../store";
import type { ModalHandler } from "../index";

export const repromptModal: ModalHandler = {
  customIdPrefix: "modal_reprompt",

  async execute(interaction: ModalSubmitInteraction, pageId?: string) {
    const entry = store.get(pageId!);

    if (!entry) {
      await interaction.reply({
        content: "Entry no longer available.",
        flags: 64,
      });
      return;
    }

    await interaction.deferUpdate();

    const instructions =
      interaction.fields.getTextInputValue("instructions_text");
    const newDraft = await generateDraft(entry, instructions || undefined);
    entry.draftResponse = newDraft;

    await interaction.editReply({
      embeds: [buildFeedbackEmbed(entry)],
      components: [buildActionRow(pageId!)],
    });
  },
};
