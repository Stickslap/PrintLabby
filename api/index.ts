/**
 * Vercel Serverless API Handler
 *
 * IMPORTANT: This file is completely self-contained and does NOT import from server.ts.
 * server.ts uses firebase-admin with native gRPC bindings that cannot be bundled by
 * Vercel's build system, causing FUNCTION_INVOCATION_FAILED on every request.
 *
 * This file uses only pure-JS / well-supported deps (express, axios, cors).
 * Firebase Admin and Square are lazy-loaded only when actually needed.
 */

import express from "express";
import axios from "axios";
import cors from "cors";
import type { Request, Response } from "express";

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));

// ─── BigCommerce Helpers ───────────────────────────────────────────────────────

function getBCConfig() {
  const storeHash = (
    process.env.BIGCOMMERCE_STORE_HASH ||
    process.env.BC_STORE_HASH ||
    ""
  ).replace(/['"]/g, "").trim();

  const accessToken = (
    process.env.BIGCOMMERCE_ACCESS_TOKEN ||
    process.env.BC_ACCESS_TOKEN ||
    ""
  ).replace(/['"]/g, "").trim();

  if (!storeHash || !accessToken) return null;
  return { storeHash, accessToken };
}

function getBCClient() {
  const config = getBCConfig();
  if (!config) return null;
  const { storeHash, accessToken } = config;
  return axios.create({
    baseURL: `https://api.bigcommerce.com/stores/${storeHash}/v3`,
    headers: {
      "X-Auth-Token": accessToken,
      "Accept": "application/json",
      "Content-Type": "application/json",
    },
    timeout: 25000,
  });
}

function getBCV2Client() {
  const config = getBCConfig();
  if (!config) return null;
  const { storeHash, accessToken } = config;
  return axios.create({
    baseURL: `https://api.bigcommerce.com/stores/${storeHash}/v2`,
    headers: {
      "X-Auth-Token": accessToken,
      "Accept": "application/json",
      "Content-Type": "application/json",
    },
    timeout: 25000,
  });
}

// ─── Health & Debug ────────────────────────────────────────────────────────────

app.get("/api/health", async (_req: Request, res: Response) => {
  const config = getBCConfig();
  let bcStatus = "not_configured";

  if (config) {
    try {
      const bc = getBCClient()!;
      await bc.get("/catalog/summary");
      bcStatus = "connected";
    } catch (e: any) {
      bcStatus = `error: ${e.response?.status} ${e.message?.slice(0, 80)}`;
    }
  }

  const present = (k: string) => !!process.env[k];
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    node_version: process.version,
    handler: "api/index.ts (standalone)",
    services: { bigcommerce: bcStatus },
    env_vars: {
      BIGCOMMERCE_STORE_HASH: present("BIGCOMMERCE_STORE_HASH"),
      BIGCOMMERCE_ACCESS_TOKEN: present("BIGCOMMERCE_ACCESS_TOKEN"),
      FIREBASE_PROJECT_ID: present("FIREBASE_PROJECT_ID"),
      SQUARE_ACCESS_TOKEN: present("SQUARE_ACCESS_TOKEN"),
    },
  });
});

app.get("/api/env-dump", (_req: Request, res: Response) => {
  const out: Record<string, string | undefined> = {};
  for (const key of Object.keys(process.env)) {
    if (
      key.includes("BIGCOMMERCE") ||
      key.includes("BC_") ||
      key.includes("SQUARE") ||
      key.includes("FIREBASE") ||
      key.includes("VITE_")
    ) {
      out[key] = process.env[key];
    }
  }
  res.json(out);
});

// ─── Products ─────────────────────────────────────────────────────────────────

app.get("/api/products", async (_req: Request, res: Response) => {
  const bc = getBCClient();
  if (!bc) {
    return res.status(500).json({
      error: "BigCommerce is not configured. Check BIGCOMMERCE_STORE_HASH and BIGCOMMERCE_ACCESS_TOKEN environment variables in Vercel.",
    });
  }

  try {
    let allProducts: any[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore && page <= 10) {
      const response = await bc.get(
        `/catalog/products?include=images,variants,primary_image,options,modifiers,custom_fields&limit=250&page=${page}&sort=id&direction=desc`
      );
      const data = response.data.data || [];
      allProducts = [...allProducts, ...data];
      const pagination = response.data.meta?.pagination;
      if (pagination && pagination.current_page < pagination.total_pages) {
        page++;
      } else {
        hasMore = false;
      }
    }

    res.json({ data: allProducts });
  } catch (error: any) {
    console.error("BC Products Error:", error.response?.status, error.message);
    res.status(error.response?.status || 500).json({
      error: error.message,
      details: error.response?.data,
    });
  }
});

app.get("/api/products/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!id || id === "undefined") return res.status(400).json({ error: "Invalid product ID" });

  const bc = getBCClient();
  if (!bc) return res.status(500).json({ error: "BigCommerce is not configured." });

  try {
    const response = await bc.get(
      `/catalog/products/${id}?include=images,variants,primary_image,options,modifiers,custom_fields`
    );
    res.json(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json({
      error: error.message,
      details: error.response?.data,
    });
  }
});

// ─── Categories ───────────────────────────────────────────────────────────────

app.get("/api/categories", async (_req: Request, res: Response) => {
  const bc = getBCClient();
  if (!bc) return res.status(500).json({ error: "BigCommerce is not configured." });

  try {
    const response = await bc.get("/catalog/categories?limit=250");
    res.json(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json({
      error: error.message,
      details: error.response?.data,
    });
  }
});

// ─── Journals (Firestore — lazy) ──────────────────────────────────────────────

app.get("/api/journals", async (_req: Request, res: Response) => {
  try {
    const { initializeApp, getApps } = await import("firebase-admin/app");
    const { getFirestore } = await import("firebase-admin/firestore");

    const projectId = process.env.FIREBASE_PROJECT_ID;
    if (!projectId) return res.json([]);

    if (!getApps().length) initializeApp({ projectId });

    const dbId = process.env.FIREBASE_DATABASE_ID;
    const db = dbId ? getFirestore(dbId) : getFirestore();

    const snap = await db.collection("journals").orderBy("createdAt", "desc").limit(50).get();
    const journals = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    res.json(journals);
  } catch (e: any) {
    console.error("Journals fetch error:", e.message);
    res.json([]);
  }
});

// ─── Admin — Staff Login ───────────────────────────────────────────────────────

app.post("/api/admin/staff-login", (req: Request, res: Response) => {
  const { username, password } = req.body;

  // Credentials are set via Vercel Environment Variables:
  //   STAFF_USERNAME  — the login username  (default: "admin")
  //   STAFF_PASSWORD  — the login password  (default: "Hammock568@")
  // Change them anytime in: Vercel Dashboard → Project → Settings → Environment Variables
  const staffUsername = (process.env.STAFF_USERNAME || "admin").trim();
  const staffPassword = (process.env.STAFF_PASSWORD || "Hammock568@").trim();

  const usernameMatch = (username || "").trim().toLowerCase() === staffUsername.toLowerCase();
  const passwordMatch = (password || "").trim() === staffPassword;

  if (usernameMatch && passwordMatch) {
    return res.json({ success: true, message: "Authentication Successful" });
  }

  console.warn(`[Auth] Failed login. Username match: ${usernameMatch}, Password match: ${passwordMatch}`);
  res.status(401).json({ error: "Invalid credentials. Check username and password." });
});

// ─── Admin — Order Statuses ──────────────────────────────────────────────────

app.get("/api/admin/order-statuses", async (_req: Request, res: Response) => {
  const config = getBCConfig();
  if (!config) return res.status(500).json({ error: "BigCommerce is not configured." });
  const { storeHash, accessToken } = config;
  try {
    const response = await axios.get(
      `https://api.bigcommerce.com/stores/${storeHash}/v2/order_statuses.json`,
      { headers: { "X-Auth-Token": accessToken, Accept: "application/json" } }
    );
    res.json(response.data);
  } catch (e: any) {
    // Return a minimal fallback so the dashboard still renders
    console.error("BC order-statuses error:", e.message);
    res.json([
      { id: 1, status: "Pending" },
      { id: 2, status: "Awaiting Payment" },
      { id: 7, status: "Awaiting Fulfillment" },
      { id: 8, status: "Awaiting Shipment" },
      { id: 9, status: "Awaiting Pickup" },
      { id: 10, status: "Partially Shipped" },
      { id: 3, status: "Shipped" },
      { id: 4, status: "Completed" },
      { id: 5, status: "Cancelled" },
      { id: 6, status: "Declined" },
      { id: 13, status: "Disputed" },
      { id: 11, status: "Refunded" },
    ]);
  }
});

// ─── Admin — Shipping ─────────────────────────────────────────────────────────

app.get("/api/admin/shipping/methods", (_req: Request, res: Response) => {
  res.json([
    { id: 1, name: "FREE SHIPPING - GROUND", status: "Active", type: "Flat Rate" },
    { id: 2, name: "UPS GROUND TRANSIT", status: "Active", type: "Carrier" },
    { id: 3, name: "Free Standard Shipping", status: "Active", type: "Flat Rate" },
  ]);
});

app.get("/api/admin/shipping/orders", async (_req: Request, res: Response) => {
  const config = getBCConfig();
  if (!config) return res.status(500).json({ error: "BigCommerce is not configured." });
  const { storeHash, accessToken } = config;
  try {
    const response = await axios.get(
      `https://api.bigcommerce.com/stores/${storeHash}/v2/orders.json`,
      { headers: { "X-Auth-Token": accessToken, Accept: "application/json" }, timeout: 15000 }
    );
    if (response.status === 204 || !response.data) return res.json([]);
    const bcOrders = Array.isArray(response.data) ? response.data : [];
    res.json(
      bcOrders.map((o: any) => ({
        id: o.id.toString(),
        customer: o.billing_address ? `${o.billing_address.first_name} ${o.billing_address.last_name}` : "Guest",
        shipping_method: o.shipping_method || "Standard Shipping",
        tracking_number: "",
        carrier: "USPS",
        ship_date: o.date_shipped || o.date_created,
        delivery_status: o.status === "Completed" ? "delivered" : o.status === "Shipped" ? "transit" : "pretransit",
        status: o.status,
      }))
    );
  } catch (e: any) {
    res.status(500).json({ error: "Failed to fetch shipping orders", details: e.message });
  }
});

// ─── Orders ───────────────────────────────────────────────────────────────────

app.get("/api/admin/orders", async (_req: Request, res: Response) => {
  const bc = getBCV2Client();
  if (!bc) return res.status(500).json({ error: "BigCommerce is not configured." });
  try {
    const response = await bc.get("/orders.json");
    const bcOrders = Array.isArray(response.data) ? response.data : [];
    res.json(
      bcOrders.map((o: any) => ({
        id: o.id,
        customer: o.billing_address ? `${o.billing_address.first_name} ${o.billing_address.last_name}` : "Guest",
        status: o.status || "Pending",
        total: parseFloat(o.total_inc_tax) || 0,
        date: o.date_created,
      }))
    );
  } catch (e: any) {
    res.status(500).json({ error: "Failed to fetch orders", details: e.message });
  }
});

app.get("/api/admin/orders/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  const bc = getBCV2Client();
  if (!bc) return res.status(500).json({ error: "BigCommerce is not configured." });
  try {
    const [orderRes, productsRes] = await Promise.all([
      bc.get(`/orders/${id}.json`),
      bc.get(`/orders/${id}/products.json`),
    ]);
    const o = orderRes.data;
    res.json({
      id: o.id,
      customer: o.billing_address ? `${o.billing_address.first_name} ${o.billing_address.last_name}` : "Guest",
      status: o.status,
      status_id: o.status_id,
      total: parseFloat(o.total_inc_tax) || 0,
      date: o.date_created,
      billing_address: o.billing_address,
      payment_method: o.payment_method,
      products: Array.isArray(productsRes.data)
        ? productsRes.data.map((p: any) => ({
            id: p.id,
            product_id: p.product_id,
            name: p.name,
            sku: p.sku || "N/A",
            quantity: p.quantity,
            price: parseFloat(p.price_inc_tax) || 0,
            total: (parseFloat(p.price_inc_tax) || 0) * p.quantity,
          }))
        : [],
    });
  } catch (e: any) {
    res.status(500).json({ error: "Failed to fetch order", details: e.message });
  }
});

app.put("/api/admin/orders/:id/status", async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status_id } = req.body;
  const bc = getBCV2Client();
  if (!bc) return res.status(500).json({ error: "BigCommerce is not configured." });
  try {
    const response = await bc.put(`/orders/${id}.json`, { status_id });
    res.json(response.data);
  } catch (e: any) {
    res.status(500).json({ error: "Failed to update order status", details: e.message });
  }
});

// ─── Square Checkout (lazy) ───────────────────────────────────────────────────

app.post("/api/create-payment", async (req: Request, res: Response) => {
  try {
    const { SquareClient, SquareEnvironment } = await import("square");
    const token = process.env.SQUARE_ACCESS_TOKEN;
    if (!token) return res.status(500).json({ error: "Square not configured." });

    const isProduction =
      process.env.VITE_SQUARE_APPLICATION_ID?.startsWith("sq0idp-") ||
      token.startsWith("EAAA");

    const client = new SquareClient({
      token,
      environment: isProduction ? SquareEnvironment.Production : SquareEnvironment.Sandbox,
    });

    const { sourceId, amount, currency = "USD", orderId, note } = req.body;
    if (!sourceId || !amount) {
      return res.status(400).json({ error: "sourceId and amount are required." });
    }

    const { result } = await client.payments.create({
      sourceId,
      idempotencyKey: `${orderId || "order"}-${Date.now()}`,
      amountMoney: { amount: BigInt(Math.round(amount * 100)), currency },
      note: note || `Order #${orderId}`,
    });

    res.json({ success: true, payment: result.payment });
  } catch (e: any) {
    console.error("Square payment error:", e.message);
    res.status(500).json({ error: e.message, details: e.errors });
  }
});

// ─── Customers ────────────────────────────────────────────────────────────────

app.get("/api/admin/customers", async (_req: Request, res: Response) => {
  const bc = getBCClient();
  if (!bc) return res.status(500).json({ error: "BigCommerce is not configured." });
  try {
    const response = await bc.get("/customers?limit=100");
    res.json(response.data.data || []);
  } catch (e: any) {
    res.status(500).json({ error: "Failed to fetch customers", details: e.message });
  }
});

// ─── Admin Stats ──────────────────────────────────────────────────────────────

app.get("/api/admin/stats", (_req: Request, res: Response) => {
  res.json({ revenue: 0, orders: 0, customers: 0, conversion: "0%" });
});

// ─── Order Messages ───────────────────────────────────────────────────────────

app.get("/api/admin/orders/:id/messages", async (req: Request, res: Response) => {
  const { id } = req.params;
  const config = getBCConfig();
  if (!config) return res.json([]);
  const { storeHash, accessToken } = config;
  try {
    const response = await axios.get(
      `https://api.bigcommerce.com/stores/${storeHash}/v2/orders/${id}/messages.json`,
      {
        headers: { "X-Auth-Token": accessToken, Accept: "application/json" },
        validateStatus: (s) => (s >= 200 && s < 300) || s === 404 || s === 204,
      }
    );
    if (response.status === 404 || response.status === 204 || !response.data) return res.json([]);
    res.json(Array.isArray(response.data) ? response.data : []);
  } catch (e: any) {
    res.json([]); // fail gracefully — no messages is fine
  }
});

app.post("/api/admin/orders/:id/messages", async (req: Request, res: Response) => {
  const { id } = req.params;
  const { message, is_customer_visible } = req.body;
  const config = getBCConfig();
  if (!config) return res.status(500).json({ error: "BigCommerce is not configured." });
  const { storeHash, accessToken } = config;
  try {
    // Need customer_id from the order first
    const orderRes = await axios.get(
      `https://api.bigcommerce.com/stores/${storeHash}/v2/orders/${id}.json`,
      { headers: { "X-Auth-Token": accessToken, Accept: "application/json" } }
    );
    const customerId = orderRes.data.customer_id;
    const response = await axios.post(
      `https://api.bigcommerce.com/stores/${storeHash}/v2/orders/${id}/messages.json`,
      {
        order_id: parseInt(id),
        customer_id: customerId,
        message,
        subject: "Order Update",
        is_customer_visible: is_customer_visible ?? true,
        status: "read",
      },
      { headers: { "X-Auth-Token": accessToken, Accept: "application/json", "Content-Type": "application/json" } }
    );
    res.json(response.data);
  } catch (e: any) {
    res.status(500).json({ error: "Failed to send message", details: e.response?.data || e.message });
  }
});

// ─── Order Actions ────────────────────────────────────────────────────────────

app.put("/api/admin/orders/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  const bc = getBCV2Client();
  if (!bc) return res.status(500).json({ error: "BigCommerce is not configured." });
  try {
    const response = await bc.put(`/orders/${id}.json`, req.body);
    res.json(response.data);
  } catch (e: any) {
    res.status(500).json({ error: "Failed to update order", details: e.message });
  }
});

app.post("/api/admin/orders/:id/resend-invoice", async (req: Request, res: Response) => {
  const { id } = req.params;
  const config = getBCConfig();
  if (!config) return res.status(500).json({ error: "BigCommerce is not configured." });
  const { storeHash, accessToken } = config;
  try {
    await axios.post(
      `https://api.bigcommerce.com/stores/${storeHash}/v2/orders/${id}/email_invoice`,
      {},
      { headers: { "X-Auth-Token": accessToken, Accept: "application/json" } }
    );
    res.json({ success: true, message: "Invoice resent" });
  } catch (e: any) {
    res.status(e.response?.status || 500).json({ error: "Failed to resend invoice", details: e.response?.data || e.message });
  }
});

// ─── Customers (detail + update) ──────────────────────────────────────────────

app.get("/api/admin/customers/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  const bc = getBCClient();
  if (!bc) return res.status(500).json({ error: "BigCommerce is not configured." });
  try {
    const custRes = await bc.get(`/customers?id:in=${id}`);
    const customers = custRes.data.data;
    if (!customers || customers.length === 0) return res.status(404).json({ error: "Customer not found" });
    const c = customers[0];

    let addresses: any[] = [];
    try {
      const addrRes = await bc.get(`/customers/addresses?customer_id:in=${c.id}`);
      addresses = addrRes.data.data || [];
    } catch (_) {}

    let orders: any[] = [];
    try {
      const config = getBCConfig()!;
      const { storeHash, accessToken } = config;
      const ordersRes = await axios.get(
        `https://api.bigcommerce.com/stores/${storeHash}/v2/orders.json?email=${encodeURIComponent(c.email)}&limit=10`,
        { headers: { "X-Auth-Token": accessToken, Accept: "application/json" } }
      );
      orders = Array.isArray(ordersRes.data) ? ordersRes.data : [];
    } catch (_) {}

    res.json({
      ...c,
      addresses,
      orders: orders.map((o: any) => ({
        id: o.id,
        status: o.status || "Pending",
        total: parseFloat(o.total_inc_tax) || 0,
        date: new Date(o.date_created).toLocaleDateString(),
      })),
    });
  } catch (e: any) {
    res.status(500).json({ error: "Failed to fetch customer", details: e.message });
  }
});

app.put("/api/admin/customers/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  const bc = getBCClient();
  if (!bc) return res.status(500).json({ error: "BigCommerce is not configured." });
  try {
    const response = await bc.put(`/customers`, [{ id: parseInt(id), ...req.body }]);
    res.json(response.data);
  } catch (e: any) {
    res.status(500).json({ error: "Failed to update customer", details: e.message });
  }
});

// ─── Journals (Firestore CRUD) ────────────────────────────────────────────────

app.post("/api/admin/journals", async (req: Request, res: Response) => {
  try {
    const { initializeApp, getApps } = await import("firebase-admin/app");
    const { getFirestore, FieldValue } = await import("firebase-admin/firestore");
    const projectId = process.env.FIREBASE_PROJECT_ID;
    if (!projectId) return res.status(500).json({ error: "Firebase not configured" });
    if (!getApps().length) initializeApp({ projectId });
    const dbId = process.env.FIREBASE_DATABASE_ID;
    const db = dbId ? getFirestore(dbId) : getFirestore();
    const ref = await db.collection("journals").add({ ...req.body, createdAt: FieldValue.serverTimestamp() });
    res.json({ id: ref.id, ...req.body });
  } catch (e: any) {
    res.status(500).json({ error: "Failed to create journal", details: e.message });
  }
});

app.put("/api/admin/journals/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const { initializeApp, getApps } = await import("firebase-admin/app");
    const { getFirestore, FieldValue } = await import("firebase-admin/firestore");
    const projectId = process.env.FIREBASE_PROJECT_ID;
    if (!projectId) return res.status(500).json({ error: "Firebase not configured" });
    if (!getApps().length) initializeApp({ projectId });
    const dbId = process.env.FIREBASE_DATABASE_ID;
    const db = dbId ? getFirestore(dbId) : getFirestore();
    await db.collection("journals").doc(id).set({ ...req.body, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: "Failed to update journal", details: e.message });
  }
});

app.delete("/api/admin/journals/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const { initializeApp, getApps } = await import("firebase-admin/app");
    const { getFirestore } = await import("firebase-admin/firestore");
    const projectId = process.env.FIREBASE_PROJECT_ID;
    if (!projectId) return res.status(500).json({ error: "Firebase not configured" });
    if (!getApps().length) initializeApp({ projectId });
    const dbId = process.env.FIREBASE_DATABASE_ID;
    const db = dbId ? getFirestore(dbId) : getFirestore();
    await db.collection("journals").doc(id).delete();
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: "Failed to delete journal", details: e.message });
  }
});

// ─── Email Templates (BigCommerce) ────────────────────────────────────────────

app.get("/api/admin/email-templates", async (_req: Request, res: Response) => {
  const config = getBCConfig();
  if (!config) return res.json([]);
  const { storeHash, accessToken } = config;
  try {
    const response = await axios.get(
      `https://api.bigcommerce.com/stores/${storeHash}/v3/marketing/email-templates`,
      { headers: { "X-Auth-Token": accessToken, Accept: "application/json" } }
    );
    res.json(response.data.data || []);
  } catch (e: any) {
    res.json([]); // fail gracefully
  }
});

app.put("/api/admin/email-templates/:typeId", async (req: Request, res: Response) => {
  const { typeId } = req.params;
  const config = getBCConfig();
  if (!config) return res.status(500).json({ error: "BigCommerce is not configured." });
  const { storeHash, accessToken } = config;
  try {
    const response = await axios.put(
      `https://api.bigcommerce.com/stores/${storeHash}/v3/marketing/email-templates/${typeId}`,
      req.body,
      { headers: { "X-Auth-Token": accessToken, Accept: "application/json", "Content-Type": "application/json" } }
    );
    res.json(response.data);
  } catch (e: any) {
    res.status(500).json({ error: "Failed to update email template", details: e.message });
  }
});

app.post("/api/admin/email-templates/test", async (req: Request, res: Response) => {
  // Just acknowledge — actual email sending would need Resend/SendGrid
  res.json({ success: true, message: "Test email queued" });
});

// ─── Admin Threads (Firestore) ────────────────────────────────────────────────

app.post("/api/admin/threads/:threadId/reply", async (req: Request, res: Response) => {
  const { threadId } = req.params;
  try {
    const { initializeApp, getApps } = await import("firebase-admin/app");
    const { getFirestore, FieldValue } = await import("firebase-admin/firestore");
    const projectId = process.env.FIREBASE_PROJECT_ID;
    if (!projectId) return res.status(500).json({ error: "Firebase not configured" });
    if (!getApps().length) initializeApp({ projectId });
    const dbId = process.env.FIREBASE_DATABASE_ID;
    const db = dbId ? getFirestore(dbId) : getFirestore();
    await db.collection(`threads/${threadId}/messages`).add({
      ...req.body,
      createdAt: FieldValue.serverTimestamp(),
      isAdmin: true,
    });
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: "Failed to send reply", details: e.message });
  }
});

// ─── Catch-all 404 ────────────────────────────────────────────────────────────

app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: "API route not found" });
});

export default app;

