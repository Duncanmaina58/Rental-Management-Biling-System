import { prisma } from "../../config/prisma";
import { AppError } from "../../middleware/errorHandler";
import { CreateOwnerInput, UpdateOwnerInput } from "./owner.schema";

export async function listOwners(companyId: string) {
  return prisma.owner.findMany({
    where: { companyId },
    orderBy: { fullName: "asc" },
  });
}

export async function getOwnerById(companyId: string, ownerId: string) {
  const owner = await prisma.owner.findFirst({
    where: { id: ownerId, companyId },
    include: { propertyLinks: { include: { property: true } } },
  });
  if (!owner) throw AppError.notFound("Owner");
  return owner;
}

export async function createOwner(companyId: string, input: CreateOwnerInput) {
  return prisma.owner.create({
    data: { ...input, companyId },
  });
}

export async function updateOwner(
  companyId: string,
  ownerId: string,
  input: UpdateOwnerInput
) {
  // Confirm the owner belongs to this company before allowing the update —
  // prevents cross-company data leakage in a multi-tenant deployment.
  await getOwnerById(companyId, ownerId);
  return prisma.owner.update({ where: { id: ownerId }, data: input });
}

export async function deleteOwner(companyId: string, ownerId: string) {
  const owner = await getOwnerById(companyId, ownerId);
  if (owner.propertyLinks.length > 0) {
    throw new AppError(
      "Cannot delete an owner who still has properties linked to them. Reassign or remove those properties first.",
      409,
      "OWNER_HAS_PROPERTIES"
    );
  }
  // Soft-delete pattern recommended in production (e.g. an isActive flag)
  // rather than hard delete, to preserve referential history for
  // disbursements/trust transactions already linked to this owner.
  // Hard delete here is a placeholder for the MVP.
  return prisma.owner.delete({ where: { id: ownerId } });
}
