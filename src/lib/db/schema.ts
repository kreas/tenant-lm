import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const leadMagnets = sqliteTable("lead_magnets", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  status: text("status", { enum: ["active", "draft", "archived"] })
    .notNull()
    .default("active"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const submissions = sqliteTable("submissions", {
  id: text("id").primaryKey(),
  leadMagnetId: text("lead_magnet_id")
    .notNull()
    .references(() => leadMagnets.id),
  email: text("email").notNull(),
  name: text("name"),
  data: text("data"), // JSON string for any extra form fields
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});
