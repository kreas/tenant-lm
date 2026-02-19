import { createClient } from "@libsql/client";
import { drizzle, LibSQLDatabase } from "drizzle-orm/libsql";
import * as schema from "./schema";

type DB = LibSQLDatabase<typeof schema>;

const globalForDb = globalThis as unknown as { __db?: DB };

function getDb(): DB {
  if (globalForDb.__db) return globalForDb.__db;

  const client = createClient({
    url: process.env.TURSO_DATABASE_URL || "file:./data/lead-magnets.db",
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  const instance = drizzle(client, { schema });
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
