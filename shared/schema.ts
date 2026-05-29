import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const lookups = sqliteTable("lookups", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  dotNumber: text("dot_number").notNull(),
  email: text("email").notNull(),
  paymentIntentId: text("payment_intent_id"),
  paymentStatus: text("payment_status").notNull().default("pending"), // pending | paid | failed
  reportData: text("report_data"), // JSON string of FMCSA data
  createdAt: text("created_at").notNull(),
});

export const insertLookupSchema = createInsertSchema(lookups).omit({
  id: true,
  reportData: true,
  paymentIntentId: true,
});

export type InsertLookup = z.infer<typeof insertLookupSchema>;
export type Lookup = typeof lookups.$inferSelect;
