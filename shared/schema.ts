import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const lookups = sqliteTable("lookups", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  dotNumber: text("dot_number").notNull(),
  email: text("email").notNull(),
  paymentIntentId: text("payment_intent_id"),
  paymentStatus: text("payment_status").notNull().default("pending"), // pending | paid | failed | free | subscription
  reportData: text("report_data"), // JSON string of FMCSA data
  createdAt: text("created_at").notNull(),
});

export const subscribers = sqliteTable("subscribers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  email: text("email").notNull().unique(),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  plan: text("plan").notNull().default("free"), // free | starter | broker_pro | unlimited
  billingInterval: text("billing_interval"), // month | year
  lookupsUsed: integer("lookups_used").notNull().default(0),
  lookupsLimit: integer("lookups_limit").notNull().default(1), // 1 free, 10 starter, 30 broker_pro, -1 unlimited
  status: text("status").notNull().default("active"), // active | cancelled | past_due
  periodStart: text("period_start"),
  periodEnd: text("period_end"),
  createdAt: text("created_at").notNull(),
});

export const insertLookupSchema = createInsertSchema(lookups).omit({
  id: true,
  reportData: true,
  paymentIntentId: true,
});

export const insertSubscriberSchema = createInsertSchema(subscribers).omit({
  id: true,
});

export type InsertLookup = z.infer<typeof insertLookupSchema>;
export type Lookup = typeof lookups.$inferSelect;
export type InsertSubscriber = z.infer<typeof insertSubscriberSchema>;
export type Subscriber = typeof subscribers.$inferSelect;
