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
  CREATE TABLE IF NOT EXISTS seen_content_hashes (
    content_hash TEXT PRIMARY KEY,
    page_id TEXT NOT NULL,
    seen_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);
db.run(`
  CREATE TABLE IF NOT EXISTS poller_state (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  )
`);

/** Atomically mark a page as seen. Returns true if newly inserted, false if already seen. */
export function tryMarkPageSeen(pageId: string): boolean {
  const stmt = db.prepare(
    "INSERT OR IGNORE INTO seen_pages (page_id) VALUES (?)"
  );
  const result = stmt.run(pageId);
  return result.changes > 0;
}

/** Atomically mark content as seen. Returns true if new content, false if duplicate. */
export function tryMarkContentSeen(contentHash: string, pageId: string): boolean {
  const stmt = db.prepare(
    "INSERT OR IGNORE INTO seen_content_hashes (content_hash, page_id) VALUES (?, ?)"
  );
  const result = stmt.run(contentHash, pageId);
  return result.changes > 0;
}

/** Hash the substantive feedback fields for content-level dedup. */
export function hashFeedbackContent(feedbackType: string, lovelyTellUsMore: string, whatsBroken: string): string {
  const hasher = new Bun.CryptoHasher("sha256");
  hasher.update(`${feedbackType}||${lovelyTellUsMore}||${whatsBroken}`);
  return hasher.digest("hex");
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

/** Remove entries older than `days` to keep the tables small. */
export function pruneOldPages(days = 30): void {
  db.run(
    "DELETE FROM seen_pages WHERE seen_at < datetime('now', ?)",
    [`-${days} days`],
  );
  db.run(
    "DELETE FROM seen_content_hashes WHERE seen_at < datetime('now', ?)",
    [`-${days} days`],
  );
}
