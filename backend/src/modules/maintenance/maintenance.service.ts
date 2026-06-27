import { Prisma } from "@prisma/client";
import { MaintenanceStatus, TrustTransactionType } from "@rmbs/shared";
import { prisma } from "../../config/prisma";
import { AppError } from "../../middleware/errorHandler";
import {
  CreateMaintenanceRequestInput,
  UpdateMaintenanceRequestInput,
} from "./maintenance.schema";

async function assertUnitBelongsToCompany(companyId: string, unitId: string) {
  const unit = await prisma.unit.findFirst({
    where: { id: unitId, property: { companyId } },
  });
  if (!unit) throw AppError.notFound("Unit");
  return unit;
}

export async function listMaintenanceRequests(companyId: string, status?: MaintenanceStatus) {
  return prisma.maintenanceRequest.findMany({
    where: {
      unit: { property: { companyId } },
      ...(status ? { status } : {}),
    },
    include: {
      unit: { select: { id: true, unitNumber: true, property: { select: { id: true, name: true } } } },
      raisedByTenant: { select: { id: true, fullName: true } },
      assignedTo: { select: { id: true, fullName: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getMaintenanceRequestById(companyId: string, requestId: string) {
  const request = await prisma.maintenanceRequest.findFirst({
    where: { id: requestId, unit: { property: { companyId } } },
    include: {
      unit: { include: { property: true } },
      raisedByTenant: true,
      assignedTo: { select: { id: true, fullName: true } },
    },
  });
  if (!request) throw AppError.notFound("Maintenance request");
  return request;
}

export async function createMaintenanceRequest(
  companyId: string,
  raisedByUserId: string | undefined,
  input: CreateMaintenanceRequestInput
) {
  await assertUnitBelongsToCompany(companyId, input.unitId);

  return prisma.maintenanceRequest.create({
    data: {
      unitId: input.unitId,
      title: input.title,
      description: input.description,
      photoUrls: input.photoUrls,
      raisedByTenantId: input.raisedByTenantId,
      raisedByUserId,
      status: MaintenanceStatus.OPEN,
    },
  });
}

// Status transitions follow the lifecycle from spec Module 9.1:
// OPEN -> ASSIGNED -> IN_PROGRESS -> COMPLETED -> CLOSED. This guard
// doesn't enforce strict linear progression (a request can jump from
// OPEN straight to COMPLETED for a quick fix logged after the fact),
// but it does block the one transition that would be a genuine mistake:
// reopening a CLOSED request, which should be a new request instead.
function assertValidStatusTransition(current: MaintenanceStatus, next: MaintenanceStatus) {
  if (current === MaintenanceStatus.CLOSED && next !== MaintenanceStatus.CLOSED) {
    throw new AppError(
      "A closed maintenance request cannot be reopened. Raise a new request instead.",
      409,
      "REQUEST_CLOSED"
    );
  }
}

export async function updateMaintenanceRequest(
  companyId: string,
  requestId: string,
  input: UpdateMaintenanceRequestInput
) {
  const request = await getMaintenanceRequestById(companyId, requestId);

  if (input.status) {
    assertValidStatusTransition(request.status as MaintenanceStatus, input.status);
  }

  return prisma.maintenanceRequest.update({ where: { id: requestId }, data: input });
}

// Recording a cost on a maintenance request posts a corresponding
// EXPENSE_PAID trust transaction against the unit's property owner(s),
// split proportionally by ownership % for co-owned properties — the same
// pattern Trust Accounting already uses for RENT_RECEIVED. This is what
// makes Disbursement's expensesDeducted field (sitting at a permanent
// zero since the Disbursements module was built) finally mean something:
// its calculation sums EXPENSE_PAID transactions for the period exactly
// the way it already sums RENT_RECEIVED ones.
export async function recordMaintenanceCost(
  companyId: string,
  requestId: string,
  cost: number,
  postedByUserId: string
) {
  const request = await prisma.maintenanceRequest.findFirst({
    where: { id: requestId, unit: { property: { companyId } } },
    include: {
      unit: {
        include: {
          property: { include: { ownerLinks: true } },
        },
      },
    },
  });
  if (!request) throw AppError.notFound("Maintenance request");

  if (request.cost !== null) {
    throw new AppError(
      "A cost has already been recorded for this request. Only one cost entry is supported per request currently.",
      409,
      "COST_ALREADY_RECORDED"
    );
  }

  const ownerLinks = request.unit.property.ownerLinks;
  let totalOwnershipPercent = 0;
  for (const link of ownerLinks) {
    totalOwnershipPercent += Number(link.ownershipPercent);
  }
  if (totalOwnershipPercent <= 0) totalOwnershipPercent = 100;

  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const updated = await tx.maintenanceRequest.update({
      where: { id: requestId },
      data: { cost },
    });

    for (const link of ownerLinks) {
      const ownerShare = Number(link.ownershipPercent) / totalOwnershipPercent;
      const ownerAmount = Math.round(cost * ownerShare * 100) / 100;
      if (ownerAmount <= 0) continue;

      await tx.trustTransaction.create({
        data: {
          type: TrustTransactionType.EXPENSE_PAID,
          amount: ownerAmount * -1, // outflow from trust
          ownerId: link.ownerId,
          description: `Maintenance cost: ${request.title} (unit ${request.unitId})`,
          postedByUserId,
          isReversal: false,
        },
      });
    }

    return updated;
  });
}
