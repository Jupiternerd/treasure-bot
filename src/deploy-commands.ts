import { REST, Routes, SlashCommandBuilder } from "discord.js";
import { config } from "./config";

const commands = [
  new SlashCommandBuilder()
    .setName("feedback")
    .setDescription("Browse feedback entries from Notion"),
];

const rest = new REST({ version: "10" }).setToken(config.DISCORD_TOKEN);

async function deploy() {
  try {
    console.log("Registering slash commands...");

    await rest.put(
      Routes.applicationGuildCommands(
        config.DISCORD_CLIENT_ID,
        config.DISCORD_GUILD_ID,
      ),
      { body: commands.map((cmd) => cmd.toJSON()) },
    );

    console.log("Slash commands registered successfully.");
  } catch (error) {
    console.error("Failed to register commands:", error);
    process.exit(1);
  }
}

deploy();
