import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";

async function run() {
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL || "file:./data/lead-magnets.db",
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  const db = drizzle(client);

  console.log("[migrate] Running migrations...");
  await migrate(db, { migrationsFolder: "./drizzle" });
  console.log("[migrate] Done.");

  client.close();
}

run().catch((err) => {
  console.error("[migrate] Failed:", err);
  process.exit(1);
});
