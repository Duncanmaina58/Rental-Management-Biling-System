import { app } from "./app";
import { config } from "./config/env";
import { prisma } from "./config/prisma";

async function main() {
  await prisma.$connect();
  console.log("Database connected");

  app.listen(config.port, () => {
    console.log(`RMBS backend listening on port ${config.port} [${config.env}]`);
  });
}

main().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});

// Graceful shutdown
process.on("SIGTERM", async () => {
  await prisma.$disconnect();
  process.exit(0);
});
process.on("SIGINT", async () => {
  await prisma.$disconnect();
  process.exit(0);
});
