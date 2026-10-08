import { createHash, timingSafeEqual } from "node:crypto";
import { pool, type PoolClient } from "@workspace/db";
import { SaveShopSettingsBody, AccessShopOrderResponse, QuoteShopCartBody } from "@workspace/api-zod";
import { isProductImageObjectPath, productImageIdFromPath, validateProductImageObject } from "./productImageStorage";

export type Connection = PoolClient;
export type ShopSettings = typeof SaveShopSettingsBody._type;
export type ShopOrderData = Omit<typeof AccessShopOrderResponse._type, "id" | "createdAt" | "expiresAt">;
export class ShopError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export const defaultShopSettings: ShopSettings = {
  brandName: "Everyday Store", logoUrl: "", accentColor: "#315848",
  description: "Small finds for better everyday living. Skincare, useful essentials, and thoughtful things for your day.",
  heroTitle: "Good things for your everyday.", heroImageUrl: "",
  supportEmail: "", shippingCents: 495, shippingThresholdCents: 5000,
  discountCode: "", discountPercent: 0,
};
export const hash = (value: string) => createHash("sha256").update(value).digest("hex");
export function matchesToken(token: string, digest: string) {
  const a = Buffer.from(hash(token), "hex"), b = Buffer.from(digest, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}
export function hostname(input: string) {
  const raw = input.trim().toLowerCase();
  if (!raw || /[\/\\@?#\s]/.test(raw)) throw new ShopError(400, "Enter a hostname only, without a URL, path, or port.");
  const value = new URL(`https://${raw}`).hostname.replace(/\.$/, "");
  if (!/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9-]{2,63}$/.test(value) || value.length > 253)
    throw new ShopError(400, "Enter a valid domain, such as shop.example.com.");
  return value;
}
export async function transaction<T>(fn: (client: Connection) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally { client.release(); }
}
export async function getShopSettings(client: Pick<Connection, "query"> = pool): Promise<ShopSettings> {
  const result = await client.query("SELECT data FROM shop_settings WHERE id = 1");
  if (!result.rows[0]) throw new ShopError(503, "Store settings are not available yet.");
  return SaveShopSettingsBody.parse(result.rows[0].data);
}
export async function validShopImages(urls: string[]) {
  for (const value of urls) {
    if (!value) continue;
    if (/^\/shop\/images\/[a-zA-Z0-9/_\-.]+$/.test(value) && !value.split("/").some(part => part === "." || part === "..")) continue;
    if (isProductImageObjectPath(value)) {
      const id = productImageIdFromPath(value);
      if (!id) return false;
      try { await validateProductImageObject(id); } catch { return false; }
      continue;
    }
    try {
      const url = new URL(value);
      if (!["https:", "http:"].includes(url.protocol) || url.username || url.password) return false;
    } catch { return false; }
  }
  return true;
}
export async function shopCatalog(admin = false) {
  const [settings, categories, products, variants] = await Promise.all([
    getShopSettings(),
    pool.query(`SELECT id, name, slug, description, image_url AS "imageUrl", active FROM shop_categories ${admin ? "" : "WHERE active = true"} ORDER BY id`),
    pool.query(`SELECT p.id, p.name, p.slug, p.description, p.category_id AS "categoryId", p.image_urls AS "imageUrls", p.active, p.featured
      FROM shop_products p LEFT JOIN shop_categories c ON c.id = p.category_id
      WHERE p.deleted = false ${admin ? "" : "AND p.active = true AND (p.category_id IS NULL OR c.active = true)"} ORDER BY p.featured DESC, p.id`),
    pool.query(`SELECT id, product_id AS "productId", label, sku, price_cents AS "priceCents", stock,
      stock - reserved - simulated_sold AS "availableStock", active FROM shop_variants
      WHERE deleted = false ${admin ? "" : "AND active = true"} ORDER BY id`),
  ]);
  return { settings, categories: categories.rows, products: products.rows.map(p => ({ ...p, variants: variants.rows.filter(v => v.productId === p.id) })) };
}
export function orderResponse(row: { id: number; data: ShopOrderData; created_at: Date; expires_at: Date }) {
  return { ...row.data, id: row.id, createdAt: new Date(row.created_at).toISOString(), expiresAt: new Date(row.expires_at).toISOString() };
}
export async function saveOrder(client: Connection, row: { id: number; data: ShopOrderData }) {
  await client.query("UPDATE shop_orders SET data=$1, status=$2 WHERE id=$3", [JSON.stringify(row.data), row.data.status, row.id]);
}
export async function releaseOrderStock(client: Connection, data: ShopOrderData) {
  if (data.status !== "pending" && data.status !== "confirmed") return;
  // Simulated sales use separate counters. Configured physical stock is never decremented.
  for (const item of [...data.items].sort((a, b) => a.variantId - b.variantId)) {
    if (data.status === "pending") {
      await client.query("UPDATE shop_variants SET reserved=reserved-$1 WHERE id=$2", [item.quantity, item.variantId]);
    } else {
      await client.query("UPDATE shop_variants SET simulated_sold=simulated_sold-$1 WHERE id=$2", [item.quantity, item.variantId]);
    }
  }
}
export async function expireShopOrders() {
  await transaction(async client => {
    const result = await client.query("SELECT id, data FROM shop_orders WHERE status='pending' AND expires_at <= NOW() ORDER BY id FOR UPDATE SKIP LOCKED");
    const quantities = new Map<number, number>();
    for (const row of result.rows) for (const item of (row.data as ShopOrderData).items)
      quantities.set(item.variantId, (quantities.get(item.variantId) ?? 0) + item.quantity);
    for (const [id, quantity] of [...quantities.entries()].sort((a, b) => a[0] - b[0]))
      await client.query("UPDATE shop_variants SET reserved=reserved-$1 WHERE id=$2", [quantity, id]);
    for (const row of result.rows) {
      row.data.status = "expired";
      row.data.paymentStatus = "expired";
      row.data.verificationState = "expired";
      await saveOrder(client, row);
    }
  });
}
export async function quoteCart(input: typeof QuoteShopCartBody._type, client: Pick<Connection, "query"> = pool, lock = false) {
  const quantities = new Map<number, number>();
  for (const item of input.items) quantities.set(item.variantId, (quantities.get(item.variantId) ?? 0) + item.quantity);
  if ([...quantities.values()].some(q => q > 99)) throw new ShopError(400, "Maximum quantity is 99 per variant.");
  const ids = [...quantities.keys()].sort((a, b) => a - b);
  const result = await client.query(`SELECT v.id, v.product_id, v.label, v.price_cents, v.stock-v.reserved-v.simulated_sold AS available,
    p.name FROM shop_variants v JOIN shop_products p ON p.id=v.product_id LEFT JOIN shop_categories c ON c.id=p.category_id
    WHERE v.id=ANY($1::int[]) AND v.active=true AND v.deleted=false AND p.active=true AND p.deleted=false
      AND (p.category_id IS NULL OR c.active=true) ORDER BY v.id ${lock ? "FOR UPDATE OF v" : ""}`, [ids]);
  if (result.rows.length !== ids.length) throw new ShopError(409, "A product or variant is no longer available.");
  const items = result.rows.map(v => {
    const quantity = quantities.get(v.id)!;
    if (v.available < quantity) throw new ShopError(409, `${v.name} (${v.label}) has only ${v.available} available.`);
    return { variantId: v.id, productId: v.product_id, name: v.name, variantLabel: v.label, unitPriceCents: v.price_cents, quantity };
  });
  const settings = await getShopSettings(client);
  const code = input.discountCode?.trim().toUpperCase() ?? "";
  if (code && (!settings.discountCode || code !== settings.discountCode.trim().toUpperCase())) throw new ShopError(422, "That discount code is not valid.");
  const subtotalCents = items.reduce((sum, i) => sum + i.quantity * i.unitPriceCents, 0);
  const discountCents = code ? Math.floor(subtotalCents * settings.discountPercent / 100) : 0;
  const shippingCents = subtotalCents - discountCents >= settings.shippingThresholdCents ? 0 : settings.shippingCents;
  const totalCents = subtotalCents - discountCents + shippingCents;
  if (!Number.isSafeInteger(totalCents) || totalCents > 2_147_483_647) throw new ShopError(422, "Order total exceeds the supported limit.");
  return { items, subtotalCents, discountCents, shippingCents, totalCents };
}
export async function seedShop() {
  await transaction(async client => {
    const created = await client.query("INSERT INTO shop_settings (id,data) VALUES (1,$1) ON CONFLICT DO NOTHING RETURNING id", [JSON.stringify(defaultShopSettings)]);
    // Seed once only. Deleting a sample product must not recreate it on restart.
    if (!created.rows.length) return;
    const seeds = [
      { category: "Skincare", slug: "skincare", name: "Clear Days Pimple Patches", productSlug: "clear-days-pimple-patches", image: "clear-days-pimple-patches.jpg", description: "Comfortable hydrocolloid patches that cover blemishes. A small addition to your daily skincare routine.", labels: ["24 patches", "48 patches"], prices: [895, 1495] },
      { category: "Everyday carry", slug: "everyday-carry", name: "Everyday Canvas Tote", productSlug: "everyday-canvas-tote", image: "everyday-canvas-tote.jpg", description: "A roomy, reusable cotton canvas tote for groceries, books, and the things you carry every day.", labels: ["Natural", "Sage"], prices: [1800, 1800] },
      { category: "Stationery", slug: "stationery", name: "Soft Cover Notebook", productSlug: "soft-cover-notebook", image: "soft-cover-notebook.jpg", description: "An A5 soft-cover notebook with 160 ruled pages for notes, lists, and everyday ideas.", labels: ["Sand", "Olive"], prices: [1200, 1200] },
      { category: "Everyday carry", slug: "everyday-carry", name: "Daily Water Bottle", productSlug: "daily-water-bottle", image: "daily-water-bottle.jpg", description: "A reusable stainless-steel water bottle with a secure screw lid. Choose the capacity that fits your day.", labels: ["500 ml", "750 ml"], prices: [2200, 2600] },
    ];
    for (const [n, seed] of seeds.entries()) {
      const cat = await client.query("INSERT INTO shop_categories (name,slug,description) VALUES ($1,$2,$3) ON CONFLICT (slug) DO UPDATE SET slug=EXCLUDED.slug RETURNING id", [seed.category, seed.slug, `Explore our ${seed.category.toLowerCase()} collection.`]);
      const p = await client.query("INSERT INTO shop_products (name,slug,description,category_id,image_urls,featured) VALUES ($1,$2,$3,$4,$5,true) RETURNING id", [seed.name, seed.productSlug, seed.description, cat.rows[0].id, [`/shop/images/${seed.image}`]]);
      for (const [i, label] of seed.labels.entries()) await client.query("INSERT INTO shop_variants (product_id,label,sku,price_cents,stock) VALUES ($1,$2,$3,$4,30)", [p.rows[0].id, label, `EVERY-${n + 1}-${i + 1}`, seed.prices[i]]);
    }
  });
}
