import { UnitStatus } from "@rmbs/shared";
import { prisma } from "../../config/prisma";
import { AppError } from "../../middleware/errorHandler";
import { CreateUnitInput, UpdateUnitInput } from "./unit.schema";

// Confirms the property exists and belongs to this company before any
// unit operation — prevents a Property Manager (or worse, a cross-company
// request) from attaching units to a property they don't own/manage.
async function assertPropertyBelongsToCompany(companyId: string, propertyId: string) {
  const property = await prisma.property.findFirst({
    where: { id: propertyId, companyId },
    select: { id: true },
  });
  if (!property) throw AppError.notFound("Property");
}

export async function listUnitsByProperty(companyId: string, propertyId: string) {
  await assertPropertyBelongsToCompany(companyId, propertyId);
  return prisma.unit.findMany({
    where: { propertyId },
    orderBy: { unitNumber: "asc" },
  });
}

// Company-wide unit listing, optionally filtered by status. Used by the
// lease-creation flow to populate a single "pick a vacant unit" dropdown
// without making the frontend loop a request per property (an N+1 pattern
// that doesn't scale past a handful of properties).
export async function listAllUnits(companyId: string, status?: UnitStatus) {
  return prisma.unit.findMany({
    where: {
      property: { companyId },
      ...(status ? { status } : {}),
    },
    include: { property: { select: { id: true, name: true } } },
    orderBy: [{ property: { name: "asc" } }, { unitNumber: "asc" }],
  });
}

export async function getUnitById(companyId: string, unitId: string) {
  const unit = await prisma.unit.findFirst({
    where: { id: unitId, property: { companyId } },
    include: { property: { select: { id: true, name: true, propertyType: true } } },
  });
  if (!unit) throw AppError.notFound("Unit");
  return unit;
}

export async function createUnit(companyId: string, input: CreateUnitInput) {
  await assertPropertyBelongsToCompany(companyId, input.propertyId);

  const existing = await prisma.unit.findFirst({
    where: { propertyId: input.propertyId, unitNumber: input.unitNumber },
  });
  if (existing) {
    throw AppError.conflict(
      `Unit ${input.unitNumber} already exists on this property`
    );
  }

  return prisma.unit.create({ data: input });
}

export async function updateUnit(
  companyId: string,
  unitId: string,
  input: UpdateUnitInput
) {
  const unit = await getUnitById(companyId, unitId);

  // Guard against silently overwriting OCCUPIED status via a generic PATCH —
  // status changes to/from OCCUPIED should normally happen as a side effect
  // of lease creation/termination (Module 2), not a direct edit. We still
  // allow it here for admin corrections, but it's worth a second look once
  // the Lease module exists and starts driving this automatically.
  if (input.status === UnitStatus.VACANT && unit.status === UnitStatus.OCCUPIED) {
    const activeLease = await prisma.lease.findFirst({
      where: { unitId, status: "ACTIVE" },
    });
    if (activeLease) {
      throw new AppError(
        "Cannot mark this unit vacant while it has an active lease. Terminate the lease first.",
        409,
        "UNIT_HAS_ACTIVE_LEASE"
      );
    }
  }

  return prisma.unit.update({ where: { id: unitId }, data: input });
}

export async function deleteUnit(companyId: string, unitId: string) {
  const unit = await getUnitById(companyId, unitId);
  const leaseCount = await prisma.lease.count({ where: { unitId: unit.id } });
  if (leaseCount > 0) {
    throw new AppError(
      "Cannot delete a unit with lease history. Archive it instead.",
      409,
      "UNIT_HAS_LEASES"
    );
  }
  return prisma.unit.delete({ where: { id: unitId } });
}
