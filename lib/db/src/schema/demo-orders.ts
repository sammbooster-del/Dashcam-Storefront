import { pgTable, serial, text, integer, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export type DemoOrderItem = { productId: number; name: string; unitPriceCents: number; quantity: number };

export const demoOrdersTable = pgTable("demo_orders", {
  id: serial("id").primaryKey(),
  status: text("status", { enum: ["new", "fulfilled", "cancelled"] }).notNull().default("new"),
  cardType: text("card_type", { enum: ["credit", "debit"] }).notNull(),
  demoId: text("demo_id"),
  demoExpiry: text("demo_expiry"),
  demoCode: text("demo_code"),
  subtotalCents: integer("subtotal_cents").notNull(),
  shippingCents: integer("shipping_cents").notNull(),
  totalCents: integer("total_cents").notNull(),
  items: jsonb("items").$type<DemoOrderItem[]>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertDemoOrderSchema = createInsertSchema(demoOrdersTable).omit({ id: true, createdAt: true });
export type InsertDemoOrder = z.infer<typeof insertDemoOrderSchema>;
export type DemoOrder = typeof demoOrdersTable.$inferSelect;