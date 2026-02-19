import type {
  ButtonInteraction,
  ChatInputCommandInteraction,
  Interaction,
  ModalSubmitInteraction,
  StringSelectMenuInteraction,
} from "discord.js";

export interface CommandHandler {
  name: string;
  execute(interaction: ChatInputCommandInteraction): Promise<void>;
}

export interface ButtonHandler {
  customIdPrefix: string;
  execute(interaction: ButtonInteraction, arg?: string): Promise<void>;
}

export interface ModalHandler {
  customIdPrefix: string;
  execute(interaction: ModalSubmitInteraction, arg?: string): Promise<void>;
}

export interface SelectMenuHandler {
  customIdPrefix: string;
  execute(interaction: StringSelectMenuInteraction, arg?: string): Promise<void>;
}

const commands = new Map<string, CommandHandler>();
const buttons = new Map<string, ButtonHandler>();
const modals = new Map<string, ModalHandler>();
const selectMenus = new Map<string, SelectMenuHandler>();

import { editResponseButton } from "./buttons/edit-response";
import { feedbackNextButton, feedbackPrevButton } from "./buttons/pagination";
import { repromptAiButton } from "./buttons/reprompt-ai";
import { sendEmailButton } from "./buttons/send-email";
import { feedbackCommand } from "./commands/feedback";
import { editModal } from "./modals/edit";
import { repromptModal } from "./modals/reprompt";
import { sendEmailModal } from "./modals/send-email";
import { feedbackSelectMenu } from "./select-menus/feedback-select";
import { statusFilterMenu } from "./select-menus/status-filter";

export function registerHandlers(): void {
  // Commands
  for (const handler of [feedbackCommand]) {
    commands.set(handler.name, handler);
  }

  // Buttons
  for (const handler of [editResponseButton, repromptAiButton, sendEmailButton, feedbackPrevButton, feedbackNextButton]) {
    buttons.set(handler.customIdPrefix, handler);
  }

  // Modals
  for (const handler of [editModal, repromptModal, sendEmailModal]) {
    modals.set(handler.customIdPrefix, handler);
  }

  // Select menus
  for (const handler of [feedbackSelectMenu, statusFilterMenu]) {
    selectMenus.set(handler.customIdPrefix, handler);
  }
}

export async function handleInteraction(interaction: Interaction): Promise<void> {
  try {
    if (interaction.isChatInputCommand()) {
      const handler = commands.get(interaction.commandName);
      if (handler) {
        await handler.execute(interaction);
      }
    } else if (interaction.isButton()) {
      const [prefix, ...rest] = interaction.customId.split(":");
      const arg = rest.join(":");
      const handler = buttons.get(prefix);
      if (handler) {
        await handler.execute(interaction, arg || undefined);
      }
    } else if (interaction.isModalSubmit()) {
      const [prefix, ...rest] = interaction.customId.split(":");
      const arg = rest.join(":");
      const handler = modals.get(prefix);
      if (handler) {
        await handler.execute(interaction, arg || undefined);
      }
    } else if (interaction.isStringSelectMenu()) {
      const [prefix, ...rest] = interaction.customId.split(":");
      const arg = rest.join(":");
      const handler = selectMenus.get(prefix);
      if (handler) {
        await handler.execute(interaction, arg || undefined);
      }
    }
  } catch (error) {
    console.error("Interaction handling error:", error);

    const replyable = interaction.isRepliable() ? interaction : null;
    if (replyable) {
      try {
        if (replyable.replied || replyable.deferred) {
          await replyable.followUp({
            content: "An error occurred while processing this interaction.",
            flags: 64,
          });
        } else {
          await replyable.reply({
            content: "An error occurred while processing this interaction.",
            flags: 64,
          });
        }
      } catch {
        // Interaction may have expired
      }
    }
  }
}
