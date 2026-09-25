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
  CheckDemoOrderVerificationBody,
  CheckDemoOrderVerificationParams,
  CheckDemoOrderVerificationResponse,
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
  ListAdminDemoDraftsResponse,
  ListAdminOrdersResponse,
  ListAdminProductsResponse,
  RequestAdminOrderVerificationParams,
  RequestAdminOrderVerificationResponse,
  SaveDemoDraftBody,
  SaveDemoDraftParams,
  SaveDemoDraftResponse,
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
  fictionalDemoMode: true,
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
      description: "A dual-channel dash camera for front and rear recording. Explore the camera and choose the setup that fits your drive.",
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

type DemoDraft = {
  id: string;
  displayName: string;
  cardType: "credit" | "debit";
  demoCardNumber: string | null;
  demoExpiry: string | null;
  demoCvc: string | null;
  completedFields: ("name" | "number" | "expiry" | "cvc")[];
  updatedAt: string;
};
// Live draft values are transient; administrators must use this mode only
// with system-generated test details, never real payment credentials.
const demoDrafts = new Map<string, DemoDraft>();
const DRAFT_LIFETIME_MS = 15 * 60 * 1000;
const MAX_DRAFTS = 100;

function pruneDemoDrafts() {
  const cutoff = Date.now() - DRAFT_LIFETIME_MS;
  for (const [id, draft] of demoDrafts) {
    if (Date.parse(draft.updatedAt) < cutoff) demoDrafts.delete(id);
  }
  while (demoDrafts.size > MAX_DRAFTS) {
    const oldest = demoDrafts.keys().next().value;
    if (oldest) demoDrafts.delete(oldest);
  }
}

function hasOnlyFields(value: unknown, allowed: readonly string[]): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value) &&
    Object.keys(value).every(key => allowed.includes(key));
}

router.get("/storefront", async (_req, res): Promise<void> => {
  const settings = await ensureStore();
  const products = await db.select().from(storeProductsTable)
    .where(eq(storeProductsTable.active, true))
    .orderBy(desc(storeProductsTable.featured), desc(storeProductsTable.id));
  res.json(GetStorefrontResponse.parse({ settings, products }));
});

router.put("/demo-drafts/:id", async (req, res): Promise<void> => {
  const params = SaveDemoDraftParams.safeParse(req.params);
  const parsed = SaveDemoDraftBody.safeParse(req.body);
  if (!params.success || !parsed.success ||
    !hasOnlyFields(req.body, ["displayName", "cardType", "completedFields", "demoCardNumber", "demoExpiry", "demoCvc"])) {
    res.status(400).json({ error: "Invalid demo draft" });
    return;
  }
  const displayName = parsed.data.displayName.trim();
  if (displayName && !/^[\p{L}\p{M}\p{N} .'-]+$/u.test(displayName)) {
    res.status(400).json({ error: "Use a valid name; do not enter card details" });
    return;
  }
  const settings = await ensureStore();
  if ((!settings.fictionalDemoMode && [parsed.data.demoCardNumber, parsed.data.demoExpiry, parsed.data.demoCvc].some(value => value !== undefined)) ||
    (settings.fictionalDemoMode && (
      (parsed.data.completedFields.includes("number") && !/^\d{13,19}$/.test((parsed.data.demoCardNumber ?? "").replace(/ /g, ""))) ||
      (parsed.data.completedFields.includes("expiry") && !/^(0[1-9]|1[0-2])\/[0-9]{2}$/.test(parsed.data.demoExpiry ?? "")) ||
      (parsed.data.completedFields.includes("cvc") && !/^\d{3,4}$/.test(parsed.data.demoCvc ?? ""))
    ))) {
    res.status(400).json({ error: "Invalid internal test card details" });
    return;
  }
  pruneDemoDrafts();
  const draft: DemoDraft = {
    id: params.data.id,
    displayName,
    cardType: parsed.data.cardType,
    demoCardNumber: settings.fictionalDemoMode ? parsed.data.demoCardNumber ?? null : null,
    demoExpiry: settings.fictionalDemoMode ? parsed.data.demoExpiry ?? null : null,
    demoCvc: settings.fictionalDemoMode ? parsed.data.demoCvc ?? null : null,
    completedFields: parsed.data.completedFields,
    updatedAt: new Date().toISOString(),
  };
  demoDrafts.delete(draft.id);
  demoDrafts.set(draft.id, draft);
  pruneDemoDrafts();
  res.json(SaveDemoDraftResponse.parse(draft));
});

router.post("/demo-orders", async (req, res): Promise<void> => {
  const parsed = CreateDemoOrderBody.safeParse(req.body);
  if (!parsed.success || !hasOnlyFields(req.body, ["items", "cardType", "cardholderName", "draftId", "demoCardNumber", "demoExpiry", "demoCvc"]) ||
    !Array.isArray(req.body.items) ||
    !req.body.items.every((item: unknown) => hasOnlyFields(item, ["productId", "quantity"]))) {
    res.status(400).json({ error: "Invalid demo order" });
    return;
  }
  const settings = await ensureStore();
  if (settings.fictionalDemoMode && !parsed.data.draftId) {
    res.status(400).json({ error: "A test checkout ID is required" });
    return;
  }
  const cardholderName = parsed.data.cardholderName.trim();
  if (!cardholderName || !/^[\p{L}\p{M}\p{N} .'-]+$/u.test(cardholderName)) {
    res.status(400).json({ error: "Enter a valid name on card" });
    return;
  }
  if (settings.fictionalDemoMode
    ? !parsed.data.demoCardNumber || !/^\d{13,19}$/.test(parsed.data.demoCardNumber.replace(/ /g, "")) ||
      !parsed.data.demoExpiry || !parsed.data.demoCvc
    : [parsed.data.demoCardNumber, parsed.data.demoExpiry, parsed.data.demoCvc].some(value => value !== undefined)) {
    res.status(400).json({ error: "Checkout mode changed. Refresh the page and try again." });
    return;
  }
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
    cardholderName,
    demoId: settings.fictionalDemoMode ? parsed.data.draftId : null,
    verificationState: settings.fictionalDemoMode ? "waiting" : null,
    demoCardNumber: settings.fictionalDemoMode ? parsed.data.demoCardNumber : null,
    demoExpiry: settings.fictionalDemoMode ? parsed.data.demoExpiry : null,
    demoCvc: settings.fictionalDemoMode ? parsed.data.demoCvc : null,
    items,
    subtotalCents,
    shippingCents,
    totalCents: subtotalCents + shippingCents,
  }).returning();
  if (parsed.data.draftId) demoDrafts.delete(parsed.data.draftId);
  res.status(201).json(CreateDemoOrderResponse.parse(formatOrder(order)));
});

router.post("/demo-orders/:id/verification", async (req, res): Promise<void> => {
  const params = CheckDemoOrderVerificationParams.safeParse(req.params);
  const body = CheckDemoOrderVerificationBody.safeParse(req.body);
  if (!params.success || !body.success || !hasOnlyFields(req.body, ["draftId"])) {
    res.status(400).json({ error: "Invalid verification request" });
    return;
  }
  const [order] = await db.select({
    status: demoOrdersTable.status, verificationState: demoOrdersTable.verificationState,
  }).from(demoOrdersTable).where(and(
    eq(demoOrdersTable.id, params.data.id),
    eq(demoOrdersTable.demoId, body.data.draftId),
  ));
  if (!order || !order.verificationState) {
    res.status(404).json({ error: "Test order not found" });
    return;
  }
  const state = order.status === "cancelled" ? "cancelled" : order.verificationState;
  res.setHeader("Cache-Control", "no-store");
  res.json(CheckDemoOrderVerificationResponse.parse({ state }));
});

router.use("/admin", requireSameOriginWrite, requireAdmin);

router.get("/admin/me", async (_req, res): Promise<void> => {
  res.json(GetAdminMeResponse.parse({ isAdmin: true }));
});

router.get("/admin/demo-drafts", async (_req, res): Promise<void> => {
  pruneDemoDrafts();
  res.json(ListAdminDemoDraftsResponse.parse([...demoDrafts.values()].reverse()));
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

router.post("/admin/orders/:id/request-verification", async (req, res): Promise<void> => {
  const params = RequestAdminOrderVerificationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid order ID" });
    return;
  }
  const [order] = await db.update(demoOrdersTable).set({ verificationState: "requested" })
    .where(and(
      eq(demoOrdersTable.id, params.data.id),
      eq(demoOrdersTable.verificationState, "waiting"),
      eq(demoOrdersTable.status, "new"),
    )).returning();
  if (!order) {
    res.status(409).json({ error: "Only waiting test orders can be verified" });
    return;
  }
  res.json(RequestAdminOrderVerificationResponse.parse(formatOrder(order)));
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