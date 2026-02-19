import type { ModalSubmitInteraction } from "discord.js";
import { buildFeedbackEmbed } from "../../builders/feedback-embed";
import { updateFeedbackResponse, updateFeedbackStatus } from "../../notion";
import { sendEmail } from "../../resend";
import { sessionManager } from "../../sessions/manager";
import { store } from "../../store";
import type { ModalHandler } from "../index";

export const sendEmailModal: ModalHandler = {
  customIdPrefix: "modal_send_email",

  async execute(interaction: ModalSubmitInteraction, arg?: string) {
    const [pageId, messageId] = arg?.split(":") ?? [];
    const to = interaction.fields.getTextInputValue("email_to");
    const subject = interaction.fields.getTextInputValue("email_subject");
    const body = interaction.fields.getTextInputValue("email_body");

    await interaction.deferUpdate();

    try {
      const emailId = await sendEmail(to, subject, body);
      await interaction.followUp({
        content: `Email sent to ${to}.`,
        flags: 64,
      });

      const link = pageId ? `https://resend.com/emails/${emailId}?tab=text` : "";

      if (pageId) {
        const entry = store.get(pageId);
        if (entry) {
          entry.status = "In Progress";
          entry.responseText = body;
          entry.responseLink = link;
          await interaction.editReply({ embeds: [buildFeedbackEmbed(entry)] });
        }
      }

      if (messageId) {
        await sessionManager.close(messageId);
      }

      if (pageId) {
        updateFeedbackResponse(pageId, link, body).catch((error) => {
          console.error("Failed to update Notion response:", error);
        });
        updateFeedbackStatus(pageId, "In Progress").catch((error) => {
          console.error("Failed to update Notion status:", error);
        });
      }
    } catch (error) {
      console.error("Failed to send email:", error);
      await interaction.followUp({
        content: `Failed to send email: ${error instanceof Error ? error.message : String(error)}`,
        flags: 64,
      });
    }
  },
};
