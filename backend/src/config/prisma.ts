import { PrismaClient } from "@prisma/client";

// Single shared Prisma client instance across the app.
// In dev with tsx watch, this guards against creating a new client
// (and therefore a new connection pool) on every hot reload.

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

export const prisma =
  global.__prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV === "development") {
  global.__prisma = prisma;
}
