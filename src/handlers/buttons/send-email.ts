import {
  ActionRowBuilder,
  type ButtonInteraction,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";
import { parseSubjectAndBody } from "../../gemini";
import { sessionManager } from "../../sessions/manager";
import { store } from "../../store";
import type { ButtonHandler } from "../index";

export const sendEmailButton: ButtonHandler = {
  customIdPrefix: "send_email",

  async execute(interaction: ButtonInteraction, pageId?: string) {
    const entry = store.get(pageId!);

    if (!entry) {
      await interaction.reply({
        content: "Entry no longer available.",
        flags: 64,
      });
      return;
    }

    const { subject, body } = parseSubjectAndBody(entry.draftResponse);

    const modal = new ModalBuilder()
      .setCustomId(`modal_send_email:${pageId}`)
      .setTitle("Send Email");

    const emailTo = new TextInputBuilder()
      .setCustomId("email_to")
      .setLabel("Recipient Email")
      .setStyle(TextInputStyle.Short)
      .setValue(entry.responseId);

    const emailSubject = new TextInputBuilder()
      .setCustomId("email_subject")
      .setLabel("Subject")
      .setStyle(TextInputStyle.Short)
      .setValue(subject);

    const emailBody = new TextInputBuilder()
      .setCustomId("email_body")
      .setLabel("Email Body")
      .setStyle(TextInputStyle.Paragraph)
      .setValue(body.slice(0, 4000));

    modal.addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(emailTo),
      new ActionRowBuilder<TextInputBuilder>().addComponents(emailSubject),
      new ActionRowBuilder<TextInputBuilder>().addComponents(emailBody),
    );

    await interaction.showModal(modal);
    sessionManager.refresh(interaction.message.id);
  },
};
