/* Simple Express API that talks to Postgres via Prisma */
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { PrismaClient } = require("@prisma/client");

const app = express();
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json({ limit: "2mb" }));

app.get("/api/health", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: "ok", message: "API is running", database: "connected" });
  } catch (err) {
    res.status(500).json({ status: "error", message: "Database connection failed", error: String(err) });
  }
});

app.post("/api/save-data", async (req, res) => {
  try {
    const payload = req.body || {};
    const customerCode = payload.customerCode || payload.customer_code;
    if (!customerCode) {
      return res.status(400).json({ success: false, error: "Customer code is required" });
    }

    const now = new Date();
    const dataToStore = {
      ...payload,
      savedAt: payload.savedAt ?? now.toISOString(),
      lastUpdated: now.toISOString(),
    };

    await prisma.customerData.upsert({
      where: { customerCode },
      update: { data: dataToStore, lastUpdated: now },
      create: {
        customerCode,
        data: dataToStore,
        savedAt: now,
        createdAt: now,
      },
    });

    res.json({
      success: true,
      message: "Data saved successfully",
      customerCode,
      savedAt: dataToStore.savedAt,
    });
  } catch (err) {
    console.error("save-data error", err);
    res.status(500).json({ success: false, error: "Database error" });
  }
});

app.get("/api/load-data/:customerCode", async (req, res) => {
  try {
    const customerCode = req.params.customerCode;
    if (!customerCode) {
      return res.status(400).json({ success: false, error: "Customer code is required" });
    }

    const record = await prisma.customerData.findUnique({
      where: { customerCode },
      select: { data: true },
    });

    if (!record) {
      return res.status(404).json({ success: false, error: "Data not found" });
    }

    res.json({ success: true, data: record.data });
  } catch (err) {
    console.error("load-data error", err);
    res.status(500).json({ success: false, error: "Database error" });
  }
});

app.get("/api/list-customers", async (_req, res) => {
  try {
    const customers = await prisma.customerData.findMany({
      select: { customerCode: true },
      orderBy: { lastUpdated: "desc" },
    });
    res.json({ success: true, customers: customers.map((c) => c.customerCode) });
  } catch (err) {
    console.error("list-customers error", err);
    res.status(500).json({ success: false, error: "Database error" });
  }
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`API server running on http://0.0.0.0:${PORT}`);
});

process.on("SIGINT", async () => {
  await prisma.$disconnect();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await prisma.$disconnect();
  process.exit(0);
});

