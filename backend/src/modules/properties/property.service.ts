import { Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { AppError } from "../../middleware/errorHandler";
import {
  CreatePropertyInput,
  UpdatePropertyInput,
  SetPropertyOwnersInput,
} from "./property.schema";

// Ownership percentages across all linked owners must sum to exactly 100.
// Allowing anything else would silently corrupt later disbursement
// calculations (Module 7), which split rent proportionally by ownership %.
function assertOwnershipSumsTo100(owners: { ownershipPercent: number }[]) {
  const total = owners.reduce((sum, o) => sum + o.ownershipPercent, 0);
  // Allow tiny floating point slack (e.g. 33.33 + 33.33 + 33.34).
  if (Math.abs(total - 100) > 0.01) {
    throw new AppError(
      `Ownership percentages must sum to 100. Received ${total}.`,
      422,
      "INVALID_OWNERSHIP_SPLIT"
    );
  }
}

async function assertOwnersBelongToCompany(companyId: string, ownerIds: string[]) {
  const owners = await prisma.owner.findMany({
    where: { id: { in: ownerIds }, companyId },
    select: { id: true },
  });
  if (owners.length !== ownerIds.length) {
    throw new AppError(
      "One or more owners were not found in your company",
      404,
      "OWNER_NOT_FOUND"
    );
  }
}

export async function listProperties(companyId: string) {
  return prisma.property.findMany({
    where: { companyId },
    include: {
      ownerLinks: { include: { owner: { select: { id: true, fullName: true } } } },
      _count: { select: { units: true } },
    },
    orderBy: { name: "asc" },
  });
}

export async function getPropertyById(companyId: string, propertyId: string) {
  const property = await prisma.property.findFirst({
    where: { id: propertyId, companyId },
    include: {
      ownerLinks: { include: { owner: true } },
      units: true,
    },
  });
  if (!property) throw AppError.notFound("Property");
  return property;
}

export async function createProperty(companyId: string, input: CreatePropertyInput) {
  assertOwnershipSumsTo100(input.owners);
  await assertOwnersBelongToCompany(companyId, input.owners.map((o) => o.ownerId));

  const { owners, ...propertyData } = input;

  return prisma.property.create({
    data: {
      ...propertyData,
      companyId,
      ownerLinks: {
        create: owners.map((o) => ({
          ownerId: o.ownerId,
          ownershipPercent: o.ownershipPercent,
        })),
      },
    },
    include: { ownerLinks: { include: { owner: true } } },
  });
}

export async function updateProperty(
  companyId: string,
  propertyId: string,
  input: UpdatePropertyInput
) {
  await getPropertyById(companyId, propertyId);
  return prisma.property.update({ where: { id: propertyId }, data: input });
}

// Replaces the full set of ownership links in one transaction — simpler
// and less error-prone than trying to diff/patch individual links from
// the client, and ownership changes are infrequent enough that this is fine.
export async function setPropertyOwners(
  companyId: string,
  propertyId: string,
  input: SetPropertyOwnersInput
) {
  await getPropertyById(companyId, propertyId);
  assertOwnershipSumsTo100(input.owners);
  await assertOwnersBelongToCompany(companyId, input.owners.map((o) => o.ownerId));

  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    await tx.propertyOwner.deleteMany({ where: { propertyId } });
    await tx.propertyOwner.createMany({
      data: input.owners.map((o) => ({
        propertyId,
        ownerId: o.ownerId,
        ownershipPercent: o.ownershipPercent,
      })),
    });
    return tx.property.findUnique({
      where: { id: propertyId },
      include: { ownerLinks: { include: { owner: true } } },
    });
  });
}

export async function deleteProperty(companyId: string, propertyId: string) {
  const property = await getPropertyById(companyId, propertyId);
  if (property.units.length > 0) {
    throw new AppError(
      "Cannot delete a property that still has units. Remove or reassign its units first.",
      409,
      "PROPERTY_HAS_UNITS"
    );
  }
  return prisma.property.delete({ where: { id: propertyId } });
}
