import type { ChatInputCommandInteraction } from "discord.js";
import {
  buildFeedbackListEmbed,
  buildFeedbackSelectMenu,
  buildPaginationRow,
  buildStatusFilterRow,
} from "../../builders/feedback-list";
import { fetchFeedbackPages } from "../../notion";
import { sessionManager } from "../../sessions/manager";
import type { CommandHandler } from "../index";

export const feedbackCommand: CommandHandler = {
  name: "feedback",

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    const pages = await fetchFeedbackPages();

    if (pages.length === 0) {
      await interaction.editReply({ content: "No feedback entries found." });
      return;
    }

    const currentPage = 0;
    const embed = buildFeedbackListEmbed(pages, currentPage);
    const statusFilterRow = buildStatusFilterRow();
    const selectRow = buildFeedbackSelectMenu(pages, currentPage);
    const paginationRow = buildPaginationRow(currentPage, pages.length);

    const reply = await interaction.editReply({
      embeds: [embed],
      components: [statusFilterRow, selectRow, paginationRow],
    });

    await sessionManager.create({
      messageId: reply.id,
      channelId: interaction.channelId,
      pageId: "",
      userId: interaction.user.id,
      createdAt: Date.now(),
      type: "feedback_list",
    });
  },
};
