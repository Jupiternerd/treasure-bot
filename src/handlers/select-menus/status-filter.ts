import type { StringSelectMenuInteraction } from "discord.js";
import {
  buildFeedbackListEmbed,
  buildFeedbackSelectMenu,
  buildPaginationRow,
  buildStatusFilterRow,
} from "../../builders/feedback-list";
import { fetchFeedbackPages } from "../../notion";
import { sessionManager } from "../../sessions/manager";
import type { SelectMenuHandler } from "../index";

export const statusFilterMenu: SelectMenuHandler = {
  customIdPrefix: "status_filter",

  async execute(interaction: StringSelectMenuInteraction) {
    const selected = interaction.values[0];
    const statusFilter = selected === "All" ? undefined : selected;

    await interaction.deferUpdate();

    const pages = await fetchFeedbackPages(statusFilter);
    const currentPage = 0;

    const embed = buildFeedbackListEmbed(pages, currentPage);
    const statusFilterRow = buildStatusFilterRow(selected);
    const components: Parameters<typeof interaction.editReply>[0]["components"] = [statusFilterRow];

    if (pages.length > 0) {
      components.push(buildFeedbackSelectMenu(pages, currentPage));
      components.push(buildPaginationRow(currentPage, pages.length, statusFilter));
    }

    await interaction.editReply({
      embeds: [embed],
      components,
    });

    sessionManager.refresh(interaction.message.id);
  },
};
