import { Router, type Request, type RequestHandler } from "express";
import { pool } from "@workspace/db";
import {
  GetShopCatalogResponse, QuoteShopCartBody, QuoteShopCartResponse, CreateShopOrderBody, CreateShopOrderResponse,
  AccessShopOrderParams, AccessShopOrderBody, AccessShopOrderResponse, GetShopAdminResponse,
  SaveShopSettingsBody, CreateShopCategoryBody, UpdateShopCategoryBody, CreateShopProductBody,
  UpdateShopProductBody, SaveShopDomainBody, UpdateShopOrderBody,
} from "@workspace/api-zod";
import { requireAdmin, requireSameOriginWrite } from "./store";
import {
  ShopError, hash, hostname, transaction, getShopSettings, validShopImages, shopCatalog, orderResponse,
  saveOrder, releaseOrderStock, expireShopOrders, quoteCart, matchesToken, type ShopOrderData,
} from "../lib/physicalStore";

const router = Router();
function requestHost(req: Request) {
  const value = (req.get("x-forwarded-host")?.split(",")[0].trim() || req.get("host") || "").replace(/:\d+$/, "");
  try { return hostname(value); } catch { return "localhost"; }
}
const handled = (fn: RequestHandler): RequestHandler => async (req, res, next) => {
  try { await fn(req, res, next); }
  catch (error) {
    if (error instanceof ShopError) { res.status(error.status).json({ error: error.message }); return; }
    const code = (error as { code?: string }).code;
    if (code === "23505") { res.status(409).json({ error: "That slug or request already exists." }); return; }
    if (code === "23503" || code === "23514") { res.status(409).json({ error: "Stock or category changed. Refresh the store and try again." }); return; }
    req.log.error({ err: error instanceof Error ? { name: error.name, message: error instanceof ShopError ? error.message : "Physical store operation failed" } : undefined }, "Physical store request failed");
    res.status(500).json({ error: "The store could not complete this request. Please try again." });
  }
};
const limitEntries = new Map<string, { count: number; until: number }>();
const publicLimit: RequestHandler = (req, res, next) => {
  const key = req.ip || req.socket.remoteAddress || "unknown";
  const now = Date.now();
  let entry = limitEntries.get(key);
  if (!entry || entry.until < now) {
    entry = { count: 0, until: now + 60_000 }; limitEntries.set(key, entry);
    if (limitEntries.size > 10_000) for (const [k, v] of limitEntries) if (v.until < now) limitEntries.delete(k);
  }
  if (++entry.count > 180) { res.status(429).json({ error: "Too many requests. Wait a moment and try again." }); return; }
  next();
};
router.get("/website-resolution", handled(async (req, res) => {
  const result = await pool.query("SELECT website_type FROM shop_domains WHERE hostname=$1", [requestHost(req)]);
  const websiteType = result.rows[0]?.website_type ?? "existing";
  res.setHeader("Cache-Control", "no-store");
  res.json({ websiteType, previewPath: websiteType === "physical-store" ? "/shop/" : "/", configured: !!result.rows.length });
}));
router.use("/physical-store", publicLimit);
router.get("/physical-store/catalog", handled(async (_req, res) => {
  await expireShopOrders();
  res.setHeader("Cache-Control", "no-store");
  res.json(GetShopCatalogResponse.parse(await shopCatalog()));
}));
router.post("/physical-store/quote", handled(async (req, res) => {
  const parsed = QuoteShopCartBody.strict().safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid cart." }); return; }
  await expireShopOrders();
  res.json(QuoteShopCartResponse.parse(await quoteCart(parsed.data)));
}));
router.post("/physical-store/orders", requireSameOriginWrite, handled(async (req, res) => {
  const parsed = CreateShopOrderBody.strict().safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Enter valid contact, delivery, and card details." }); return; }
  const input = parsed.data;
  for (const address of [input.shippingAddress, input.billingAddress]) {
    const validPostal = address.country === "US" ? /^\d{5}(-\d{4})?$/.test(address.postalCode.trim()) : /^[A-Z]\d[A-Z] ?\d[A-Z]\d$/i.test(address.postalCode.trim());
    if (!validPostal || !address.fullName.trim() || !address.line1.trim() || !address.city.trim() || address.region.trim().length < 2) throw new ShopError(400, "Enter a complete US or Canadian address.");
  }
  if (input.contactPhone.replace(/\D/g, "").length < 10 || !input.cardholderName.trim()) throw new ShopError(400, "Enter a valid phone number and cardholder name.");
  await expireShopOrders();
  const requestHash = hash(JSON.stringify(input));
  const result = await transaction(async client => {
    // Serializes retries of the same checkout before any stock reservation.
    await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [input.requestKey]);
    const existing = await client.query("SELECT * FROM shop_orders WHERE request_key=$1 FOR UPDATE", [input.requestKey]);
    if (existing.rows[0]) {
      if (existing.rows[0].request_hash !== requestHash || !matchesToken(input.accessToken, existing.rows[0].access_token_hash)) throw new ShopError(409, "This checkout key has already been used.");
      return orderResponse(existing.rows[0]);
    }
    const quote = await quoteCart(input, client, true);
    for (const item of quote.items) await client.query("UPDATE shop_variants SET reserved=reserved+$1 WHERE id=$2", [item.quantity, item.variantId]);
    const data: ShopOrderData = {
      ...quote, status: "pending", paymentStatus: "simulated_pending", verificationState: "waiting", verificationMethod: null,
      contactEmail: input.contactEmail.trim().toLowerCase(), contactPhone: input.contactPhone.trim(),
      shippingAddress: input.shippingAddress, billingAddress: input.billingAddress,
      cardType: input.cardType, cardholderName: input.cardholderName.trim(), cardLast4: input.cardLast4,
      website: "physical-store", domain: requestHost(req),
      shippingStatus: "unfulfilled", carrier: "", trackingNumber: "", trackingUrl: "",
    };
    const inserted = await client.query("INSERT INTO shop_orders (request_key,request_hash,access_token_hash,data,expires_at) VALUES ($1,$2,$3,$4,NOW()+INTERVAL '30 minutes') RETURNING *", [input.requestKey, requestHash, hash(input.accessToken), JSON.stringify(data)]);
    return orderResponse(inserted.rows[0]);
  });
  res.status(201).json(CreateShopOrderResponse.parse({ order: result, accessToken: input.accessToken }));
}));
router.post("/physical-store/orders/:id/access", requireSameOriginWrite, handled(async (req, res) => {
  if (typeof req.body?.accessToken !== "string" || !/^[a-f0-9]{64}$/.test(req.body.accessToken))
    throw new ShopError(404, "Order not found or private access key is incorrect.");
  const params = AccessShopOrderParams.safeParse(req.params), parsed = AccessShopOrderBody.strict().safeParse(req.body);
  if (!params.success || !parsed.success) { res.status(400).json({ error: "Invalid order access." }); return; }
  await expireShopOrders();
  const response = await transaction(async client => {
    const result = await client.query("SELECT * FROM shop_orders WHERE id=$1 FOR UPDATE", [params.data.id]);
    const row = result.rows[0];
    if (!row || !matchesToken(parsed.data.accessToken, row.access_token_hash)) throw new ShopError(404, "Order not found or private access key is incorrect.");
    const d: ShopOrderData = row.data;
    if (parsed.data.action === "cancel") {
      if (d.status === "fulfilled" || ["shipped", "delivered"].includes(d.shippingStatus)) throw new ShopError(409, "Contact the store to cancel a shipped order.");
      if (["pending", "confirmed"].includes(d.status)) {
        await releaseOrderStock(client, d);
        d.status = "cancelled"; d.paymentStatus = "cancelled"; d.verificationState = "cancelled";
      }
    } else if (parsed.data.action === "method") {
      if (!parsed.data.method) throw new ShopError(400, "Choose a method.");
      if (d.verificationState === "method_selected" && d.verificationMethod === parsed.data.method) return orderResponse(row);
      if (d.status !== "pending" || d.verificationState !== "requested") throw new ShopError(409, "The verification method cannot be selected yet.");
      d.verificationMethod = parsed.data.method; d.verificationState = "method_selected";
    } else if (parsed.data.action === "code") {
      if (!parsed.data.code) throw new ShopError(400, "Enter the six-digit test code.");
      if (d.verificationState === "code_submitted") return orderResponse(row);
      if (d.status !== "pending" || !["code_ready", "invalid_code"].includes(d.verificationState)) throw new ShopError(409, "The team has not confirmed sharing a test code yet.");
      d.verificationState = "code_submitted";
      // Test code remains only on the protected admin side, never on public order responses.
      (d as ShopOrderData & { testCode?: string }).testCode = parsed.data.code;
    }
    await saveOrder(client, row);
    return orderResponse(row);
  });
  res.setHeader("Cache-Control", "no-store");
  res.json(AccessShopOrderResponse.parse(response));
}));
router.use("/admin/physical-store", requireSameOriginWrite, requireAdmin);
router.get("/admin/physical-store", handled(async (_req, res) => {
  await expireShopOrders();
  const [catalog, orders, domains] = await Promise.all([
    shopCatalog(true), pool.query("SELECT * FROM shop_orders ORDER BY id DESC LIMIT 1000"),
    pool.query('SELECT id,hostname,website_type AS "websiteType" FROM shop_domains ORDER BY id'),
  ]);
  const list = orders.rows.map(orderResponse);
  res.setHeader("Cache-Control", "no-store");
  const response = GetShopAdminResponse.parse({ ...catalog, orders: list, domains: domains.rows, summary: {
    productCount: catalog.products.length, activeProductCount: catalog.products.filter(p => p.active).length,
    pendingOrders: list.filter(o => o.status === "pending").length,
    confirmedOrders: list.filter(o => ["confirmed", "fulfilled"].includes(o.status)).length,
    simulatedSalesCents: list.filter(o => o.paymentStatus === "simulated_approved").reduce((s, o) => s + o.totalCents, 0),
  } });
  // Additional protected field: manually submitted simulation test codes.
  res.json({ ...response, orders: response.orders.map(o => ({ ...o, testCode: orders.rows.find(row => row.id === o.id)?.data.testCode ?? null })) });
}));
router.put("/admin/physical-store/settings", handled(async (req, res) => {
  const parsed = SaveShopSettingsBody.strict().safeParse(req.body);
  if (!parsed.success || !parsed.data.brandName.trim()) { res.status(400).json({ error: "Invalid store settings." }); return; }
  if (!(await validShopImages([parsed.data.logoUrl, parsed.data.heroImageUrl]))) throw new ShopError(400, "Use a safe image URL or an uploaded image.");
  if (parsed.data.supportEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(parsed.data.supportEmail)) throw new ShopError(400, "Enter a valid support email.");
  await pool.query("UPDATE shop_settings SET data=$1 WHERE id=1", [JSON.stringify(parsed.data)]);
  res.json(parsed.data);
}));
for (const update of [false, true]) {
  router[update ? "put" : "post"](`/admin/physical-store/categories${update ? "/:id" : ""}`, handled(async (req, res) => {
    const parsed = (update ? UpdateShopCategoryBody : CreateShopCategoryBody).strict().safeParse(req.body);
    const id = update ? Number(req.params.id) : 0;
    if (!parsed.success || (update && (!Number.isSafeInteger(id) || id <= 0))) { res.status(400).json({ error: "Invalid category." }); return; }
    const d = parsed.data;
    if (!d.name.trim()) throw new ShopError(400, "Enter a category name.");
    if (!(await validShopImages([d.imageUrl]))) throw new ShopError(400, "Invalid category image.");
    const result = update
      ? await pool.query('UPDATE shop_categories SET name=$1,slug=$2,description=$3,image_url=$4,active=$5 WHERE id=$6 RETURNING id,name,slug,description,image_url AS "imageUrl",active', [d.name.trim(), d.slug, d.description, d.imageUrl, d.active, id])
      : await pool.query('INSERT INTO shop_categories (name,slug,description,image_url,active) VALUES ($1,$2,$3,$4,$5) RETURNING id,name,slug,description,image_url AS "imageUrl",active', [d.name.trim(), d.slug, d.description, d.imageUrl, d.active]);
    if (!result.rows[0]) throw new ShopError(404, "Category not found.");
    res.status(update ? 200 : 201).json(result.rows[0]);
  }));
}
router.delete("/admin/physical-store/categories/:id", handled(async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id <= 0) throw new ShopError(400, "Invalid category ID.");
  const result = await pool.query("DELETE FROM shop_categories WHERE id=$1 RETURNING id", [id]);
  if (!result.rows.length) throw new ShopError(404, "Category not found.");
  res.status(204).end();
}));
for (const update of [false, true]) {
  router[update ? "put" : "post"](`/admin/physical-store/products${update ? "/:id" : ""}`, handled(async (req, res) => {
    const parsed = (update ? UpdateShopProductBody : CreateShopProductBody).strict().safeParse(req.body);
    const id = update ? Number(req.params.id) : 0;
    if (!parsed.success || (update && (!Number.isSafeInteger(id) || id <= 0))) { res.status(400).json({ error: "Invalid product or variants." }); return; }
    const d = parsed.data;
    if (!d.name.trim() || d.variants.some(v => !v.label.trim())) throw new ShopError(400, "Enter a product name and a name for every variant.");
    if (!(await validShopImages(d.imageUrls))) throw new ShopError(400, "Invalid product image.");
    const savedId = await transaction(async client => {
      if (d.categoryId !== null) {
        const cat = await client.query("SELECT id FROM shop_categories WHERE id=$1", [d.categoryId]);
        if (!cat.rows.length) throw new ShopError(400, "Choose an existing category.");
      }
      let productId = id;
      if (update) {
        const p = await client.query("SELECT id FROM shop_products WHERE id=$1 AND deleted=false FOR UPDATE", [id]);
        if (!p.rows.length) throw new ShopError(404, "Product not found.");
        await client.query("UPDATE shop_products SET name=$1,slug=$2,description=$3,category_id=$4,image_urls=$5,active=$6,featured=$7 WHERE id=$8", [d.name.trim(), d.slug, d.description, d.categoryId, d.imageUrls, d.active, d.featured, id]);
      } else {
        if (d.variants.some(v => v.id !== undefined)) throw new ShopError(400, "New variants must not have existing IDs.");
        const p = await client.query("INSERT INTO shop_products (name,slug,description,category_id,image_urls,active,featured) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id", [d.name.trim(), d.slug, d.description, d.categoryId, d.imageUrls, d.active, d.featured]);
        productId = p.rows[0].id;
      }
      const prior = await client.query("SELECT * FROM shop_variants WHERE product_id=$1 ORDER BY id FOR UPDATE", [productId]);
      const retained = new Set<number>();
      for (const v of d.variants) {
        if (v.id !== undefined) {
          if (retained.has(v.id)) throw new ShopError(400, "Variant IDs must be unique.");
          retained.add(v.id);
          const old = prior.rows.find(row => row.id === v.id && !row.deleted);
          if (!old) throw new ShopError(400, "Variant does not belong to this product.");
          if (v.stock < old.reserved + old.simulated_sold) throw new ShopError(409, `Stock for ${v.label} cannot be below ${old.reserved + old.simulated_sold} reserved/simulated units.`);
          await client.query("UPDATE shop_variants SET label=$1,sku=$2,price_cents=$3,stock=$4,active=$5 WHERE id=$6", [v.label.trim(), v.sku, v.priceCents, v.stock, v.active, v.id]);
        } else await client.query("INSERT INTO shop_variants (product_id,label,sku,price_cents,stock,active) VALUES ($1,$2,$3,$4,$5,$6)", [productId, v.label.trim(), v.sku, v.priceCents, v.stock, v.active]);
      }
      for (const old of prior.rows) if (!retained.has(old.id)) await client.query("UPDATE shop_variants SET deleted=true,active=false WHERE id=$1", [old.id]);
      return productId;
    });
    const catalog = await shopCatalog(true);
    res.status(update ? 200 : 201).json(catalog.products.find(p => p.id === savedId));
  }));
}
router.delete("/admin/physical-store/products/:id", handled(async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id <= 0) throw new ShopError(400, "Invalid product ID.");
  await transaction(async client => {
    const p = await client.query("UPDATE shop_products SET deleted=true,active=false WHERE id=$1 AND deleted=false RETURNING id", [id]);
    if (!p.rows.length) throw new ShopError(404, "Product not found.");
    await client.query("UPDATE shop_variants SET active=false WHERE product_id=$1", [id]);
  });
  res.status(204).end();
}));
router.put("/admin/physical-store/domains", handled(async (req, res) => {
  const parsed = SaveShopDomainBody.strict().safeParse(req.body);
  if (!parsed.success) throw new ShopError(400, "Invalid domain assignment.");
  const host = hostname(parsed.data.hostname);
  const result = await pool.query('INSERT INTO shop_domains (hostname,website_type) VALUES ($1,$2) ON CONFLICT (hostname) DO UPDATE SET website_type=EXCLUDED.website_type RETURNING id,hostname,website_type AS "websiteType"', [host, parsed.data.websiteType]);
  res.json(result.rows[0]);
}));
router.delete("/admin/physical-store/domains/:id", handled(async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id <= 0) throw new ShopError(400, "Invalid domain ID.");
  const result = await pool.query("DELETE FROM shop_domains WHERE id=$1 RETURNING id", [id]);
  if (!result.rows.length) throw new ShopError(404, "Domain not found.");
  res.status(204).end();
}));
router.post("/admin/physical-store/orders/:id", handled(async (req, res) => {
  const id = Number(req.params.id), parsed = UpdateShopOrderBody.strict().safeParse(req.body);
  if (!parsed.success || !Number.isSafeInteger(id) || id <= 0) throw new ShopError(400, "Invalid order update.");
  await expireShopOrders();
  const action = parsed.data.action;
  const response = await transaction(async client => {
    const result = await client.query("SELECT * FROM shop_orders WHERE id=$1 FOR UPDATE", [id]);
    const row = result.rows[0];
    if (!row) throw new ShopError(404, "Order not found.");
    const d: ShopOrderData = row.data;
    const transitions = { request_verification: ["waiting", "requested"], code_shared: ["method_selected", "code_ready"], invalid_code: ["code_submitted", "invalid_code"] } as const;
    if (action in transitions) {
      const [from, to] = transitions[action as keyof typeof transitions];
      if (d.verificationState === to) return orderResponse(row);
      if (d.status !== "pending" || d.verificationState !== from) throw new ShopError(409, "That verification action is not available in the current state.");
      d.verificationState = to;
    } else if (action === "approve") {
      if (d.paymentStatus === "simulated_approved") return orderResponse(row);
      if (d.status !== "pending" || d.verificationState !== "code_submitted") throw new ShopError(409, "Only submitted test codes can be approved.");
      for (const item of [...d.items].sort((a, b) => a.variantId - b.variantId))
        await client.query("UPDATE shop_variants SET reserved=reserved-$1,simulated_sold=simulated_sold+$1 WHERE id=$2", [item.quantity, item.variantId]);
      d.status = "confirmed"; d.paymentStatus = "simulated_approved"; d.verificationState = "approved";
    } else if (["cancel", "expire", "decline"].includes(action)) {
      if (["cancelled", "expired"].includes(d.status)) return orderResponse(row);
      if (d.status === "fulfilled" || ["shipped", "delivered"].includes(d.shippingStatus)) throw new ShopError(409, "A shipped or fulfilled order cannot be cancelled here.");
      if (action !== "cancel" && d.status !== "pending") throw new ShopError(409, "Only pending orders can be expired or declined.");
      await releaseOrderStock(client, d);
      d.status = action === "expire" ? "expired" : "cancelled";
      d.paymentStatus = action === "decline" ? "simulated_declined" : action === "expire" ? "expired" : "cancelled";
      d.verificationState = action === "decline" ? "declined" : action === "expire" ? "expired" : "cancelled";
    } else if (action === "fulfill") {
      if (d.status === "fulfilled") return orderResponse(row);
      if (d.status !== "confirmed" || d.paymentStatus !== "simulated_approved") throw new ShopError(409, "Only approved simulated orders can be fulfilled.");
      d.status = "fulfilled"; d.shippingStatus = "delivered";
    } else if (action === "update_shipping") {
      if (!["confirmed", "fulfilled"].includes(d.status)) throw new ShopError(409, "Approve the simulated order before updating shipping.");
      if (parsed.data.trackingUrl) {
        try {
          const url = new URL(parsed.data.trackingUrl);
          if (url.protocol !== "https:" || url.username || url.password) throw new Error("Unsafe URL");
        } catch { throw new ShopError(400, "Enter a valid HTTPS tracking link."); }
      }
      d.shippingStatus = parsed.data.shippingStatus ?? d.shippingStatus;
      d.carrier = parsed.data.carrier ?? d.carrier;
      d.trackingNumber = parsed.data.trackingNumber ?? d.trackingNumber;
      d.trackingUrl = parsed.data.trackingUrl ?? d.trackingUrl;
      if (d.shippingStatus === "delivered") d.status = "fulfilled";
    }
    await saveOrder(client, row);
    return orderResponse(row);
  });
  res.json(AccessShopOrderResponse.parse(response));
}));
export default router;
