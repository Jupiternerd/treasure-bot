import { Database } from "bun:sqlite";
import path from "path";
import type { Session } from "./types";

const DB_PATH = path.join(import.meta.dir, "../../data/sessions.db");

const db = new Database(DB_PATH, { create: true });
db.run(`
  CREATE TABLE IF NOT EXISTS sessions (
    message_id TEXT PRIMARY KEY,
    data TEXT NOT NULL
  )
`);

export function loadSessions(): Session[] {
  const rows = db.query("SELECT data FROM sessions").all() as { data: string }[];
  return rows.map((row) => JSON.parse(row.data) as Session);
}

export function saveSessions(sessions: Session[]): void {
  db.run("DELETE FROM sessions");
  const insert = db.prepare(
    "INSERT INTO sessions (message_id, data) VALUES (?, ?)",
  );
  for (const session of sessions) {
    insert.run(session.messageId, JSON.stringify(session));
  }
}
