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

export const repromptAiButton: ButtonHandler = {
  customIdPrefix: "reprompt_ai",

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
      .setCustomId(`modal_reprompt:${pageId}`)
      .setTitle("Reprompt AI");

    const input = new TextInputBuilder()
      .setCustomId("instructions_text")
      .setLabel("Additional Instructions")
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder(
        "e.g. Make it more formal, mention our refund policy...",
      )
      .setRequired(false);

    modal.addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(input),
    );

    await interaction.showModal(modal);
    sessionManager.refresh(interaction.message.id);
  },
};
