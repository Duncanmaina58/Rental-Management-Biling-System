import { Prisma } from "@prisma/client";
import { UnitStatus, LeaseStatus } from "@rmbs/shared";
import { prisma } from "../../config/prisma";
import { AppError } from "../../middleware/errorHandler";
import { CreateLeaseInput, UpdateLeaseInput } from "./lease.schema";

async function assertUnitBelongsToCompany(companyId: string, unitId: string) {
  const unit = await prisma.unit.findFirst({
    where: { id: unitId, property: { companyId } },
  });
  if (!unit) throw AppError.notFound("Unit");
  return unit;
}

async function assertTenantBelongsToCompany(companyId: string, tenantId: string) {
  const tenant = await prisma.tenant.findFirst({ where: { id: tenantId, companyId } });
  if (!tenant) throw AppError.notFound("Tenant");
  return tenant;
}

export async function listLeases(companyId: string) {
  return prisma.lease.findMany({
    where: { unit: { property: { companyId } } },
    include: {
      unit: { include: { property: { select: { id: true, name: true, camRatePerSqm: true } } } },
      primaryTenant: { select: { id: true, fullName: true, isBusinessTenant: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getLeaseById(companyId: string, leaseId: string) {
  const lease = await prisma.lease.findFirst({
    where: { id: leaseId, unit: { property: { companyId } } },
    include: {
      unit: { include: { property: true } },
      primaryTenant: true,
      tenantLinks: { include: { tenant: true } },
      invoices: { orderBy: { issueDate: "desc" }, take: 5 },
    },
  });
  if (!lease) throw AppError.notFound("Lease");
  return lease;
}

// Lease creation is the one place in the app so far where a single user
// action needs to touch two tables consistently: the Lease row itself,
// and the Unit's status flag (VACANT -> OCCUPIED). Wrapped in a
// transaction so a crash between the two writes can't leave a unit
// marked vacant while a lease silently exists against it, or vice versa.
export async function createLease(companyId: string, input: CreateLeaseInput) {
  const unit = await assertUnitBelongsToCompany(companyId, input.unitId);
  await assertTenantBelongsToCompany(companyId, input.primaryTenantId);

  if (unit.status !== UnitStatus.VACANT) {
    throw new AppError(
      `Unit is currently ${unit.status.toLowerCase()} and cannot be leased until it's vacant.`,
      409,
      "UNIT_NOT_VACANT"
    );
  }

  const primaryTenant = await prisma.tenant.findUnique({ where: { id: input.primaryTenantId } });
  if (primaryTenant?.isBlacklisted) {
    throw new AppError(
      "This tenant is flagged as blacklisted and cannot be assigned a new lease.",
      409,
      "TENANT_BLACKLISTED"
    );
  }

  for (const additional of input.additionalTenants) {
    await assertTenantBelongsToCompany(companyId, additional.tenantId);
  }

  const { additionalTenants, ...leaseData } = input;

  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const lease = await tx.lease.create({
      data: {
        ...leaseData,
        status: LeaseStatus.ACTIVE,
        tenantLinks: {
          create: [
            { tenantId: input.primaryTenantId, isPrimary: true },
            ...additionalTenants.map((t) => ({
              tenantId: t.tenantId,
              isPrimary: false,
              liabilitySharePercent: t.liabilitySharePercent,
            })),
          ],
        },
      },
      include: { unit: true, primaryTenant: true, tenantLinks: { include: { tenant: true } } },
    });

    await tx.unit.update({
      where: { id: input.unitId },
      data: { status: UnitStatus.OCCUPIED },
    });

    return lease;
  });
}

export async function updateLease(
  companyId: string,
  leaseId: string,
  input: UpdateLeaseInput
) {
  const lease = await getLeaseById(companyId, leaseId);

  // Terminating or expiring a lease should free up the unit automatically —
  // this is the inverse of the OCCUPIED flip on creation, kept consistent
  // in the same transaction so unit status never drifts from lease reality.
  const freeingStatuses: string[] = [LeaseStatus.TERMINATED, LeaseStatus.EXPIRED];
  const isFreeingUnit = input.status && freeingStatuses.includes(input.status);

  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const updated = await tx.lease.update({ where: { id: leaseId }, data: input });

    if (isFreeingUnit) {
      await tx.unit.update({
        where: { id: lease.unitId },
        data: { status: UnitStatus.VACANT },
      });
    }

    return updated;
  });
}
