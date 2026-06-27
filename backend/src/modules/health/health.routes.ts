import { Router } from "express";
import { prisma } from "../../config/prisma";

export const healthRouter = Router();

healthRouter.get("/", async (_req, res) => {
  res.json({ success: true, data: { status: "ok", timestamp: new Date().toISOString() } });
});

// Separate DB-check endpoint so a basic health probe doesn't always hit the DB.
healthRouter.get("/db", async (_req, res) => {
  await prisma.$queryRaw`SELECT 1`;
  res.json({ success: true, data: { status: "ok", database: "connected" } });
});
