import { Router, type IRouter, type RequestHandler } from "express";
import { clerkClient, getAuth } from "@clerk/express";
import { and, desc, eq, inArray } from "drizzle-orm";
import {
  db,
  demoOrdersTable,
  storeProductsTable,
  storeSettingsTable,
  type DemoOrder,
} from "@workspace/db";
import {
  CreateAdminProductBody,
  CreateAdminProductResponse,
  CreateDemoOrderBody,
  CreateDemoOrderResponse,
  DeleteAdminOrderParams,
  DeleteAdminProductParams,
  GetAdminMeResponse,
  GetAdminOverviewResponse,
  GetAdminSettingsResponse,
  GetStorefrontResponse,
  ListAdminOrdersResponse,
  ListAdminProductsResponse,
  UpdateAdminOrderBody,
  UpdateAdminOrderParams,
  UpdateAdminOrderResponse,
  UpdateAdminProductBody,
  UpdateAdminProductParams,
  UpdateAdminProductResponse,
  UpdateAdminSettingsBody,
  UpdateAdminSettingsResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

const defaultSettings = {
  id: 1,
  brandName: "DriveGuard",
  announcement: "The road changes. Your confidence doesn't have to.",
  heroTitle: "Ready for the road ahead.",
  heroDescription: "From changing weather to everyday commutes, the right dash cam helps you keep the details. Find the camera setup that fits the way you drive.",
  heroImageUrl: "/images/road-hero.jpg",
  trustTitle: "Be ready for the road ahead.",
  trustDescription: "The right recording gear makes it easier to understand what happened. We keep the shopping experience focused, helpful, and straightforward.",
  shippingThresholdCents: 10000,
  shippingCents: 1200,
  supportEmail: "",
};

async function ensureStore() {
  const [created] = await db.insert(storeSettingsTable)
    .values(defaultSettings)
    .onConflictDoNothing()
    .returning();
  if (created) {
    await db.insert(storeProductsTable).values({
      slug: "roadview-4k-dual",
      name: "RoadView 4K Dual Dash Cam",
      description: "A clear view of the road ahead and behind. RoadView is our sample dual-channel camera listing, shown here to demonstrate the shopping experience until your actual product details arrive.",
      imageUrl: "/images/roadview-sample.jpg",
      priceCents: 32900,
      stock: 25,
      category: "dual",
      featured: true,
      active: true,
    }).onConflictDoNothing();
  }
  const [settings] = await db.select().from(storeSettingsTable).where(eq(storeSettingsTable.id, 1));
  if (!settings) throw new Error("Store settings are unavailable");
  return settings;
}

function isSafeImageUrl(value: string) {
  if (value === "") return true;
  if (/^\/images\/[a-zA-Z0-9/_\-.]+$/.test(value)) return true;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

const requireAdmin: RequestHandler = async (req, res, next) => {
  const userId = getAuth(req).userId;
  if (!userId) {
    res.status(401).json({ error: "Sign in required" });
    return;
  }
  const allowedEmail = process.env.STORE_ADMIN_EMAIL?.trim().toLowerCase();
  if (!allowedEmail) {
    res.status(503).json({ error: "Store administrator has not been configured" });
    return;
  }
  try {
    const user = await clerkClient.users.getUser(userId);
    const email = user.primaryEmailAddress;
    if (!email || email.emailAddress.toLowerCase() !== allowedEmail || email.verification?.status !== "verified") {
      res.status(403).json({ error: "This account does not have store admin access" });
      return;
    }
    next();
  } catch (error) {
    req.log.error({ err: error }, "Could not verify store administrator");
    res.status(503).json({ error: "Unable to verify admin access right now" });
  }
};

// Browser admin writes must originate from the same storefront. API reads and
// Clerk's own proxy remain unaffected; cross-origin credentialed CORS is off.
const requireSameOriginWrite: RequestHandler = (req, res, next) => {
  if (req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS") {
    next();
    return;
  }
  const site = req.get("sec-fetch-site");
  if (site && site !== "same-origin") {
    res.status(403).json({ error: "Cross-origin admin requests are not allowed" });
    return;
  }
  if (!site && req.get("origin")) {
    try {
      const originHost = new URL(req.get("origin")!).host;
      const hosts = [req.get("host"), req.get("x-forwarded-host")?.split(",")[0].trim()];
      if (!hosts.includes(originHost)) {
        res.status(403).json({ error: "Cross-origin admin requests are not allowed" });
        return;
      }
    } catch {
      res.status(403).json({ error: "Invalid request origin" });
      return;
    }
  }
  next();
};

const formatOrder = (order: DemoOrder) => ({ ...order, createdAt: order.createdAt.toISOString() });

router.get("/storefront", async (_req, res): Promise<void> => {
  const settings = await ensureStore();
  const products = await db.select().from(storeProductsTable)
    .where(eq(storeProductsTable.active, true))
    .orderBy(desc(storeProductsTable.featured), desc(storeProductsTable.id));
  res.json(GetStorefrontResponse.parse({ settings, products }));
});

router.post("/demo-orders", async (req, res): Promise<void> => {
  const parsed = CreateDemoOrderBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid demo order" });
    return;
  }
  const settings = await ensureStore();
  const quantities = new Map<number, number>();
  for (const item of parsed.data.items) {
    quantities.set(item.productId, (quantities.get(item.productId) ?? 0) + item.quantity);
  }
  if ([...quantities.values()].some(quantity => quantity > 99)) {
    res.status(400).json({ error: "Quantity exceeds demo order limit" });
    return;
  }
  const products = await db.select().from(storeProductsTable)
    .where(and(inArray(storeProductsTable.id, [...quantities.keys()]), eq(storeProductsTable.active, true)));
  if (products.length !== quantities.size || products.some(product => product.stock < quantities.get(product.id)!)) {
    res.status(409).json({ error: "One or more items are unavailable. Please update your cart." });
    return;
  }
  const items = products.map(product => ({
    productId: product.id,
    name: product.name,
    unitPriceCents: product.priceCents,
    quantity: quantities.get(product.id)!,
  }));
  const subtotalCents = items.reduce((sum, item) => sum + item.unitPriceCents * item.quantity, 0);
  const shippingCents = subtotalCents >= settings.shippingThresholdCents ? 0 : settings.shippingCents;
  if (!Number.isSafeInteger(subtotalCents) || subtotalCents > 2_147_483_647 - shippingCents) {
    res.status(422).json({ error: "Demo order total is too large" });
    return;
  }
  const [order] = await db.insert(demoOrdersTable).values({
    cardType: parsed.data.cardType,
    items,
    subtotalCents,
    shippingCents,
    totalCents: subtotalCents + shippingCents,
  }).returning();
  res.status(201).json(CreateDemoOrderResponse.parse(formatOrder(order)));
});

router.use("/admin", requireSameOriginWrite, requireAdmin);

router.get("/admin/me", async (_req, res): Promise<void> => {
  res.json(GetAdminMeResponse.parse({ isAdmin: true }));
});

router.get("/admin/overview", async (_req, res): Promise<void> => {
  await ensureStore();
  const [products, orders] = await Promise.all([
    db.select().from(storeProductsTable),
    db.select().from(demoOrdersTable),
  ]);
  res.json(GetAdminOverviewResponse.parse({
    productCount: products.length,
    activeProductCount: products.filter(product => product.active).length,
    totalOrders: orders.length,
    simulatedRevenueCents: orders.filter(order => order.status !== "cancelled").reduce((sum, order) => sum + order.totalCents, 0),
  }));
});

router.get("/admin/products", async (_req, res): Promise<void> => {
  await ensureStore();
  const products = await db.select().from(storeProductsTable).orderBy(desc(storeProductsTable.id));
  res.json(ListAdminProductsResponse.parse(products));
});

router.post("/admin/products", async (req, res): Promise<void> => {
  const parsed = CreateAdminProductBody.safeParse(req.body);
  if (!parsed.success || !isSafeImageUrl(parsed.data?.imageUrl ?? "")) {
    res.status(400).json({ error: "Check the product fields and image URL" });
    return;
  }
  const [existing] = await db.select({ id: storeProductsTable.id }).from(storeProductsTable).where(eq(storeProductsTable.slug, parsed.data.slug));
  if (existing) {
    res.status(409).json({ error: "That product URL is already in use" });
    return;
  }
  const [product] = await db.insert(storeProductsTable).values(parsed.data).returning();
  res.status(201).json(CreateAdminProductResponse.parse(product));
});

router.patch("/admin/products/:id", async (req, res): Promise<void> => {
  const params = UpdateAdminProductParams.safeParse(req.params);
  const parsed = UpdateAdminProductBody.safeParse(req.body);
  if (!params.success || !parsed.success || (parsed.data.imageUrl !== undefined && !isSafeImageUrl(parsed.data.imageUrl))) {
    res.status(400).json({ error: "Check the product fields and image URL" });
    return;
  }
  if (!Object.keys(parsed.data).length) {
    res.status(400).json({ error: "No changes provided" });
    return;
  }
  if (parsed.data.slug) {
    const [existing] = await db.select({ id: storeProductsTable.id }).from(storeProductsTable).where(eq(storeProductsTable.slug, parsed.data.slug));
    if (existing && existing.id !== params.data.id) {
      res.status(409).json({ error: "That product URL is already in use" });
      return;
    }
  }
  const [product] = await db.update(storeProductsTable).set(parsed.data)
    .where(eq(storeProductsTable.id, params.data.id)).returning();
  if (!product) {
    res.status(404).json({ error: "Product not found" });
    return;
  }
  res.json(UpdateAdminProductResponse.parse(product));
});

router.delete("/admin/products/:id", async (req, res): Promise<void> => {
  const params = DeleteAdminProductParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid product ID" });
    return;
  }
  const [product] = await db.delete(storeProductsTable).where(eq(storeProductsTable.id, params.data.id)).returning();
  if (!product) {
    res.status(404).json({ error: "Product not found" });
    return;
  }
  res.sendStatus(204);
});

router.get("/admin/settings", async (_req, res): Promise<void> => {
  res.json(GetAdminSettingsResponse.parse(await ensureStore()));
});

router.put("/admin/settings", async (req, res): Promise<void> => {
  const parsed = UpdateAdminSettingsBody.safeParse(req.body);
  if (!parsed.success || !isSafeImageUrl(parsed.data?.heroImageUrl ?? "") ||
    (parsed.data?.supportEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(parsed.data.supportEmail))) {
    res.status(400).json({ error: "Check the store settings and image URL" });
    return;
  }
  await ensureStore();
  const [settings] = await db.update(storeSettingsTable).set(parsed.data)
    .where(eq(storeSettingsTable.id, 1)).returning();
  res.json(UpdateAdminSettingsResponse.parse(settings));
});

router.get("/admin/orders", async (_req, res): Promise<void> => {
  const orders = await db.select().from(demoOrdersTable).orderBy(desc(demoOrdersTable.createdAt));
  res.json(ListAdminOrdersResponse.parse(orders.map(formatOrder)));
});

router.patch("/admin/orders/:id", async (req, res): Promise<void> => {
  const params = UpdateAdminOrderParams.safeParse(req.params);
  const parsed = UpdateAdminOrderBody.safeParse(req.body);
  if (!params.success || !parsed.success) {
    res.status(400).json({ error: "Invalid order update" });
    return;
  }
  const [order] = await db.update(demoOrdersTable).set({ status: parsed.data.status })
    .where(eq(demoOrdersTable.id, params.data.id)).returning();
  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }
  res.json(UpdateAdminOrderResponse.parse(formatOrder(order)));
});

router.delete("/admin/orders/:id", async (req, res): Promise<void> => {
  const params = DeleteAdminOrderParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid order ID" });
    return;
  }
  const [order] = await db.delete(demoOrdersTable).where(eq(demoOrdersTable.id, params.data.id)).returning();
  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;