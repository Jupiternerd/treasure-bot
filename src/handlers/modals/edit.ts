import type { ModalSubmitInteraction } from "discord.js";
import { buildActionRow, buildFeedbackEmbed } from "../../builders/feedback-embed";
import { store } from "../../store";
import type { ModalHandler } from "../index";

export const editModal: ModalHandler = {
  customIdPrefix: "modal_edit",

  async execute(interaction: ModalSubmitInteraction, pageId?: string) {
    const entry = store.get(pageId!);

    if (!entry) {
      await interaction.reply({
        content: "Entry no longer available.",
        flags: 64,
      });
      return;
    }

    const edited = interaction.fields.getTextInputValue("response_text");
    entry.draftResponse = edited;

    await interaction.deferUpdate();
    await interaction.editReply({
      embeds: [buildFeedbackEmbed(entry)],
      components: [buildActionRow(pageId!)],
    });
  },
};
