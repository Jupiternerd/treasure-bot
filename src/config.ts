const required = [
  "DISCORD_TOKEN",
  "DISCORD_CLIENT_ID",
  "DISCORD_GUILD_ID",
  "NOTION_TOKEN",
  "NOTION_DATABASE_ID",
  "NOTION_CHANNEL_ID",
  "GEMINI_API_KEY",
  "RESEND_API_KEY",
] as const;

type ConfigKey = (typeof required)[number] | "RESEND_FROM_EMAIL";

const entries = required.map((key) => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return [key, value] as const;
});

export const config = Object.freeze(
  Object.fromEntries([
    ...entries,
    ["RESEND_FROM_EMAIL", process.env.RESEND_FROM_EMAIL || "support@ontreasure.com"],
  ]) as Record<ConfigKey, string>,
);
