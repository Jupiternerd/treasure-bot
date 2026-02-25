import { Client, GatewayIntentBits, TextChannel } from "discord.js";
import { buildActionRow, buildFeedbackEmbed } from "./builders/feedback-embed";
import { config } from "./config";
import { generateDraft } from "./gemini";
import { handleInteraction, registerHandlers } from "./handlers";
import { startNotionPoller } from "./notion";
import { sessionManager } from "./sessions/manager";
import { store, type FeedbackEntry } from "./store";

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

registerHandlers();

client.on("interactionCreate", handleInteraction);

client.once("clientReady", async (c) => {
  console.log(`Ready as ${c.user.tag}`);

  sessionManager.setClient(c);
  await sessionManager.rehydrate();

  await startNotionPoller(async (page) => {
    try {
      const draftResponse = await generateDraft(page);

      const entry: FeedbackEntry = {
        ...page,
        messageId: "",
        draftResponse,
      };
      store.set(page.pageId, entry);

      const channel = await client.channels.fetch(config.NOTION_CHANNEL_ID);
      if (!channel || !(channel instanceof TextChannel)) {
        console.error("Target channel not found or not a text channel");
        return;
      }

      const message = await channel.send({
        embeds: [buildFeedbackEmbed(entry)],
        components: [buildActionRow(page.pageId)],
      });

      entry.messageId = message.id;
    } catch (error) {
      console.error("Error processing new feedback page:", error);
    }
  });
});

client.login(config.DISCORD_TOKEN);
