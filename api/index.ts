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
  const staffUser = "PrintPrint LabbyCo";
  const staffPass = process.env.STAFF_PASSWORD || "Hammock568@";
  if (username === staffUser && password === staffPass) {
    return res.json({ success: true, message: "Authentication Successful" });
  }
  res.status(401).json({ error: "Invalid Security Credentials" });
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

// ─── Catch-all 404 ────────────────────────────────────────────────────────────

app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: "API route not found" });
});

export default app;
