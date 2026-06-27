import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { TAX_PARAM_DEFAULTS } from "@rmbs/shared";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  const company = await prisma.company.upsert({
    where: { id: "00000000-0000-0000-0000-000000000001" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000001",
      name: "Dun-Star Property Management",
      kraPin: "P000000000A",
      address: "Nairobi, Kenya",
      defaultCurrency: "KES",
    },
  });
  console.log(`Company ready: ${company.name}`);

  const adminPasswordHash = await bcrypt.hash("ChangeMe123!", 10);
  const admin = await prisma.user.upsert({
    where: { email: "admin@dunstar.co.ke" },
    update: {},
    create: {
      companyId: company.id,
      email: "admin@dunstar.co.ke",
      passwordHash: adminPasswordHash,
      fullName: "System Administrator",
      role: "ADMIN",
    },
  });
  console.log(`Admin user ready: ${admin.email} (password: ChangeMe123! — change immediately)`);

  // Seed Kenya tax parameters from shared defaults so the tax engine (Module 8)
  // has working values out of the box. These MUST be reviewed by a tax
  // professional before production go-live — see spec Module 8 note.
  const effectiveFrom = new Date("2026-01-01");
  for (const [key, value] of Object.entries(TAX_PARAM_DEFAULTS)) {
    await prisma.taxParameter.upsert({
      where: { key },
      update: { value },
      create: {
        key,
        value,
        effectiveFrom,
        description: `Seeded default for ${key}`,
      },
    });
  }
  console.log(`Seeded ${Object.keys(TAX_PARAM_DEFAULTS).length} tax parameters`);

  console.log("Seeding complete.");
}

main()
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
