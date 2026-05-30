import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { lookups, subscribers, type Lookup, type InsertLookup, type Subscriber, type InsertSubscriber } from "@shared/schema";
import { eq } from "drizzle-orm";

const sqlite = new Database("data.db");
export const db = drizzle(sqlite);

// Create tables if not exists
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS lookups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    dot_number TEXT NOT NULL,
    email TEXT NOT NULL,
    payment_intent_id TEXT,
    payment_status TEXT NOT NULL DEFAULT 'pending',
    report_data TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS carrier_reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    dot_number TEXT NOT NULL,
    email TEXT NOT NULL,
    stars INTEGER NOT NULL,
    comment TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS app_reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL,
    stars INTEGER NOT NULL,
    comment TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS subscribers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    plan TEXT NOT NULL DEFAULT 'free',
    billing_interval TEXT,
    lookups_used INTEGER NOT NULL DEFAULT 0,
    lookups_limit INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'active',
    period_start TEXT,
    period_end TEXT,
    created_at TEXT NOT NULL
  );
`);

export interface IStorage {
  // Lookups
  createLookup(data: InsertLookup): Lookup;
  getLookupById(id: number): Lookup | undefined;
  getLookupByPaymentIntent(paymentIntentId: string): Lookup | undefined;
  updateLookupPayment(id: number, paymentIntentId: string, status: string): Lookup | undefined;
  updateLookupReport(id: number, reportData: string): Lookup | undefined;
  // Subscribers
  getSubscriberByEmail(email: string): Subscriber | undefined;
  getSubscriberByStripeId(stripeSubscriptionId: string): Subscriber | undefined;
  createSubscriber(data: InsertSubscriber): Subscriber;
  updateSubscriber(id: number, data: Partial<Subscriber>): Subscriber | undefined;
  incrementLookupsUsed(id: number): Subscriber | undefined;
}

export class Storage implements IStorage {
  createLookup(data: InsertLookup): Lookup {
    return db.insert(lookups).values(data).returning().get();
  }

  getLookupById(id: number): Lookup | undefined {
    return db.select().from(lookups).where(eq(lookups.id, id)).get();
  }

  getLookupByPaymentIntent(paymentIntentId: string): Lookup | undefined {
    return db.select().from(lookups).where(eq(lookups.paymentIntentId, paymentIntentId)).get();
  }

  updateLookupPayment(id: number, paymentIntentId: string, status: string): Lookup | undefined {
    return db.update(lookups)
      .set({ paymentIntentId, paymentStatus: status })
      .where(eq(lookups.id, id))
      .returning()
      .get();
  }

  updateLookupReport(id: number, reportData: string): Lookup | undefined {
    return db.update(lookups)
      .set({ reportData, paymentStatus: "paid" })
      .where(eq(lookups.id, id))
      .returning()
      .get();
  }

  getSubscriberByEmail(email: string): Subscriber | undefined {
    return db.select().from(subscribers).where(eq(subscribers.email, email)).get();
  }

  getSubscriberByStripeId(stripeSubscriptionId: string): Subscriber | undefined {
    return db.select().from(subscribers).where(eq(subscribers.stripeSubscriptionId, stripeSubscriptionId)).get();
  }

  createSubscriber(data: InsertSubscriber): Subscriber {
    return db.insert(subscribers).values(data).returning().get();
  }

  updateSubscriber(id: number, data: Partial<Subscriber>): Subscriber | undefined {
    return db.update(subscribers).set(data).where(eq(subscribers.id, id)).returning().get();
  }

  incrementLookupsUsed(id: number): Subscriber | undefined {
    const sub = db.select().from(subscribers).where(eq(subscribers.id, id)).get();
    if (!sub) return undefined;
    return db.update(subscribers)
      .set({ lookupsUsed: sub.lookupsUsed + 1 })
      .where(eq(subscribers.id, id))
      .returning()
      .get();
  }

  // Carrier reviews
  addCarrierReview(dotNumber: string, email: string, stars: number, comment: string) {
    return sqlite.prepare(
      `INSERT INTO carrier_reviews (dot_number, email, stars, comment, created_at) VALUES (?, ?, ?, ?, ?)`
    ).run(dotNumber, email, stars, comment || "", new Date().toISOString());
  }

  getCarrierReviews(dotNumber: string) {
    return sqlite.prepare(
      `SELECT stars, comment, created_at FROM carrier_reviews WHERE dot_number = ? ORDER BY created_at DESC LIMIT 50`
    ).all(dotNumber) as { stars: number; comment: string; created_at: string }[];
  }

  getCarrierRating(dotNumber: string): { avg: number; count: number } {
    const row = sqlite.prepare(
      `SELECT AVG(stars) as avg, COUNT(*) as count FROM carrier_reviews WHERE dot_number = ?`
    ).get(dotNumber) as { avg: number; count: number };
    return { avg: Math.round((row.avg || 0) * 10) / 10, count: row.count || 0 };
  }

  // App reviews
  addAppReview(email: string, stars: number, comment: string) {
    return sqlite.prepare(
      `INSERT INTO app_reviews (email, stars, comment, created_at) VALUES (?, ?, ?, ?)`
    ).run(email, stars, comment || "", new Date().toISOString());
  }

  getAppReviews() {
    return sqlite.prepare(
      `SELECT stars, comment, created_at FROM app_reviews ORDER BY created_at DESC LIMIT 20`
    ).all() as { stars: number; comment: string; created_at: string }[];
  }

  getAppRating(): { avg: number; count: number } {
    const row = sqlite.prepare(
      `SELECT AVG(stars) as avg, COUNT(*) as count FROM app_reviews`
    ).get() as { avg: number; count: number };
    return { avg: Math.round((row.avg || 0) * 10) / 10, count: row.count || 0 };
  }
}

export const storage = new Storage();
