import {
  ActionRowBuilder,
  type ButtonInteraction,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";
import { sessionManager } from "../../sessions/manager";
import { store } from "../../store";
import type { ButtonHandler } from "../index";

export const editResponseButton: ButtonHandler = {
  customIdPrefix: "edit_response",

  async execute(interaction: ButtonInteraction, pageId?: string) {
    const entry = store.get(pageId!);

    if (!entry) {
      await interaction.reply({
        content: "Entry no longer available.",
        flags: 64,
      });
      return;
    }

    const modal = new ModalBuilder()
      .setCustomId(`modal_edit:${pageId}`)
      .setTitle("Edit Response");

    const input = new TextInputBuilder()
      .setCustomId("response_text")
      .setLabel("Draft Response")
      .setStyle(TextInputStyle.Paragraph)
      .setValue(entry.draftResponse.slice(0, 4000));

    modal.addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(input),
    );

    await interaction.showModal(modal);
    sessionManager.refresh(interaction.message.id);
  },
};
