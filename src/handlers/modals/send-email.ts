import type { ModalSubmitInteraction } from "discord.js";
import { updateFeedbackResponse, updateFeedbackStatus } from "../../notion";
import { sendEmail } from "../../resend";
import { sessionManager } from "../../sessions/manager";
import type { ModalHandler } from "../index";

export const sendEmailModal: ModalHandler = {
  customIdPrefix: "modal_send_email",

  async execute(interaction: ModalSubmitInteraction, arg?: string) {
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

      if (interaction.message) {
        await sessionManager.close(interaction.message.id);
      }

      if (arg) {
        const link = `https://resend.com/emails/${emailId}?tab=text`;
        updateFeedbackResponse(arg, link, body).catch((error) => {
          console.error("Failed to update Notion response:", error);
        });
        updateFeedbackStatus(arg, "In Progress").catch((error) => {
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
