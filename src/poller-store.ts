import { Database } from "bun:sqlite";
import path from "path";

const DB_PATH = path.join(import.meta.dir, "../data/poller.db");

const db = new Database(DB_PATH, { create: true });
db.run(`
  CREATE TABLE IF NOT EXISTS seen_pages (
    page_id TEXT PRIMARY KEY,
    seen_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);
db.run(`
  CREATE TABLE IF NOT EXISTS poller_state (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  )
`);

export function hasSeenPage(pageId: string): boolean {
  const row = db.query("SELECT 1 FROM seen_pages WHERE page_id = ?").get(pageId);
  return row !== null;
}

export function markPageSeen(pageId: string): void {
  db.run(
    "INSERT OR IGNORE INTO seen_pages (page_id) VALUES (?)",
    [pageId],
  );
}

export function getLastPollTime(): string | null {
  const row = db.query("SELECT value FROM poller_state WHERE key = 'last_poll_time'").get() as
    | { value: string }
    | null;
  return row?.value ?? null;
}

export function setLastPollTime(time: string): void {
  db.run(
    "INSERT OR REPLACE INTO poller_state (key, value) VALUES ('last_poll_time', ?)",
    [time],
  );
}

/** Remove entries older than `days` to keep the table small. */
export function pruneOldPages(days = 30): void {
  db.run(
    "DELETE FROM seen_pages WHERE seen_at < datetime('now', ?)",
    [`-${days} days`],
  );
}
