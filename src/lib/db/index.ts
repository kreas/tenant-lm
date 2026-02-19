import Database from "better-sqlite3";
import { drizzle, BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import path from "path";
import fs from "fs";

const DB_PATH = path.join(process.cwd(), "data", "lead-magnets.db");

type DB = BetterSQLite3Database<typeof schema>;

const globalForDb = globalThis as unknown as { __db?: DB };

function getDb(): DB {
  if (globalForDb.__db) return globalForDb.__db;

  // Ensure data directory exists
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

  const sqlite = new Database(DB_PATH);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("busy_timeout = 5000");

  // Auto-create tables
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS lead_magnets (
      id TEXT PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS submissions (
      id TEXT PRIMARY KEY,
      lead_magnet_id TEXT NOT NULL REFERENCES lead_magnets(id),
      email TEXT NOT NULL,
      name TEXT,
      data TEXT,
      created_at INTEGER NOT NULL
    );
  `);

  const instance = drizzle(sqlite, { schema });
  globalForDb.__db = instance;
  return instance;
}

// Export a proxy that lazily initializes the DB on first use
export const db = new Proxy({} as DB, {
  get(_target, prop) {
    const instance = getDb();
    const value = instance[prop as keyof DB];
    if (typeof value === "function") {
      return value.bind(instance);
    }
    return value;
  },
});
