import type { ButtonInteraction } from "discord.js";
import {
  buildFeedbackListEmbed,
  buildFeedbackSelectMenu,
  buildPaginationRow,
  buildStatusFilterRow,
} from "../../builders/feedback-list";
import { fetchFeedbackPages } from "../../notion";
import { sessionManager } from "../../sessions/manager";
import type { ButtonHandler } from "../index";

export const feedbackPrevButton: ButtonHandler = {
  customIdPrefix: "feedback_prev",

  async execute(interaction: ButtonInteraction, arg?: string) {
    const parts = (arg || "0").split(":");
    const currentPage = parseInt(parts[0], 10);
    const statusFilter = parts[1] || undefined;
    const newPage = Math.max(0, currentPage - 1);

    await interaction.deferUpdate();

    const pages = await fetchFeedbackPages(statusFilter);
    const embed = buildFeedbackListEmbed(pages, newPage);
    const statusFilterRow = buildStatusFilterRow(statusFilter);
    const components: Parameters<typeof interaction.editReply>[0]["components"] = [statusFilterRow];

    if (pages.length > 0) {
      components.push(buildFeedbackSelectMenu(pages, newPage));
      components.push(buildPaginationRow(newPage, pages.length, statusFilter));
    }

    await interaction.editReply({
      embeds: [embed],
      components,
    });

    sessionManager.refresh(interaction.message.id);
  },
};

export const feedbackNextButton: ButtonHandler = {
  customIdPrefix: "feedback_next",

  async execute(interaction: ButtonInteraction, arg?: string) {
    const parts = (arg || "0").split(":");
    const currentPage = parseInt(parts[0], 10);
    const statusFilter = parts[1] || undefined;
    const newPage = currentPage + 1;

    await interaction.deferUpdate();

    const pages = await fetchFeedbackPages(statusFilter);
    const embed = buildFeedbackListEmbed(pages, newPage);
    const statusFilterRow = buildStatusFilterRow(statusFilter);
    const components: Parameters<typeof interaction.editReply>[0]["components"] = [statusFilterRow];

    if (pages.length > 0) {
      components.push(buildFeedbackSelectMenu(pages, newPage));
      components.push(buildPaginationRow(newPage, pages.length, statusFilter));
    }

    await interaction.editReply({
      embeds: [embed],
      components,
    });

    sessionManager.refresh(interaction.message.id);
  },
};
