import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { lookups, type Lookup, type InsertLookup } from "@shared/schema";
import { eq } from "drizzle-orm";

const sqlite = new Database("data.db");
export const db = drizzle(sqlite);

// Create table if not exists
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS lookups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    dot_number TEXT NOT NULL,
    email TEXT NOT NULL,
    payment_intent_id TEXT,
    payment_status TEXT NOT NULL DEFAULT 'pending',
    report_data TEXT,
    created_at TEXT NOT NULL
  )
`);

export interface IStorage {
  createLookup(data: InsertLookup): Lookup;
  getLookupById(id: number): Lookup | undefined;
  getLookupByPaymentIntent(paymentIntentId: string): Lookup | undefined;
  updateLookupPayment(id: number, paymentIntentId: string, status: string): Lookup | undefined;
  updateLookupReport(id: number, reportData: string): Lookup | undefined;
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
}

export const storage = new Storage();
