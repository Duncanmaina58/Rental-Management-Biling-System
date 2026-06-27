import { Prisma } from "@prisma/client";
import type { Decimal } from "@prisma/client/runtime/library";
import { ChargeType, InvoiceStatus, LeaseStatus } from "@rmbs/shared";
import { prisma } from "../../config/prisma";
import { AppError } from "../../middleware/errorHandler";
import { BulkGenerateInvoicesInput, CreateSingleInvoiceInput } from "./billing.schema";

interface PeriodWindow {
  periodStart: Date;
  periodEnd: Date;
}

// Pro-rates rent for the portion of the billing period the lease was
// actually active. A lease that starts mid-period only owes rent for the
// days it covered; a lease that started before the period and runs past
// its end owes the full period. This is what spec Module 4.1 calls out
// as "pro-rated billing for partial months at move-in/move-out."
function calculateProRatedRent(
  monthlyRent: number,
  leaseStart: Date,
  leaseEnd: Date | null,
  period: PeriodWindow
): { amount: number; daysCharged: number; daysInPeriod: number } {
  const periodStartMs = period.periodStart.getTime();
  const periodEndMs = period.periodEnd.getTime();
  const daysInPeriod = Math.round((periodEndMs - periodStartMs) / 86_400_000) + 1;

  const effectiveStart = Math.max(periodStartMs, leaseStart.getTime());
  const effectiveEnd = leaseEnd ? Math.min(periodEndMs, leaseEnd.getTime()) : periodEndMs;

  if (effectiveEnd < effectiveStart) {
    return { amount: 0, daysCharged: 0, daysInPeriod };
  }

  const daysCharged = Math.round((effectiveEnd - effectiveStart) / 86_400_000) + 1;
  const isFullPeriod = daysCharged >= daysInPeriod;

  const amount = isFullPeriod ? monthlyRent : (monthlyRent / daysInPeriod) * daysCharged;

  return { amount: Math.round(amount * 100) / 100, daysCharged, daysInPeriod };
}

function calculateCamCharge(camRatePerSqm: number | null, unitSizeSqm: number | null): number {
  if (!camRatePerSqm || !unitSizeSqm) return 0;
  return Math.round(camRatePerSqm * unitSizeSqm * 100) / 100;
}

async function nextInvoiceNumber(tx: Prisma.TransactionClient): Promise<string> {
  // Simple sequential numbering: count existing invoices and increment.
  // Fine for a single-company deployment at this scale; if invoice volume
  // or concurrent generation ever becomes a contention risk, switch to a
  // dedicated sequence/counter row rather than COUNT(*).
  const count = await tx.invoice.count();
  const year = new Date().getFullYear();
  return `INV-${year}-${String(count + 1).padStart(5, "0")}`;
}

interface LeaseForBilling {
  id: string;
  rentAmount: Decimal;
  startDate: Date;
  endDate: Date | null;
  status: string;
  unit: {
    sizeSqm: Decimal | null;
    property: { camRatePerSqm: Decimal | null };
  };
}

async function buildInvoiceForLease(
  tx: Prisma.TransactionClient,
  lease: LeaseForBilling,
  period: PeriodWindow,
  dueDate: Date,
  utilities: { waterAmount?: number; electricityAmount?: number },
  oneOffCharges: { description: string; amount: number }[] = []
) {
  const lineItems: {
    chargeType: ChargeType;
    description: string;
    quantity: number;
    unitPrice: number;
    amount: number;
  }[] = [];

  const rent = calculateProRatedRent(
    Number(lease.rentAmount),
    lease.startDate,
    lease.endDate,
    period
  );
  if (rent.amount > 0) {
    const isProRated = rent.daysCharged < rent.daysInPeriod;
    lineItems.push({
      chargeType: ChargeType.RENT,
      description: isProRated
        ? `Rent (pro-rated, ${rent.daysCharged}/${rent.daysInPeriod} days)`
        : "Rent",
      quantity: 1,
      unitPrice: rent.amount,
      amount: rent.amount,
    });
  }

  const camAmount = calculateCamCharge(
    lease.unit.property.camRatePerSqm ? Number(lease.unit.property.camRatePerSqm) : null,
    lease.unit.sizeSqm ? Number(lease.unit.sizeSqm) : null
  );
  if (camAmount > 0) {
    lineItems.push({
      chargeType: ChargeType.CAM_SERVICE_CHARGE,
      description: `CAM charge (${lease.unit.sizeSqm} sqm)`,
      quantity: 1,
      unitPrice: camAmount,
      amount: camAmount,
    });
  }

  if (utilities.waterAmount && utilities.waterAmount > 0) {
    lineItems.push({
      chargeType: ChargeType.UTILITY_WATER,
      description: "Water",
      quantity: 1,
      unitPrice: utilities.waterAmount,
      amount: utilities.waterAmount,
    });
  }
  if (utilities.electricityAmount && utilities.electricityAmount > 0) {
    lineItems.push({
      chargeType: ChargeType.UTILITY_ELECTRICITY,
      description: "Electricity",
      quantity: 1,
      unitPrice: utilities.electricityAmount,
      amount: utilities.electricityAmount,
    });
  }

  for (const charge of oneOffCharges) {
    lineItems.push({
      chargeType: ChargeType.ONE_OFF,
      description: charge.description,
      quantity: 1,
      unitPrice: charge.amount,
      amount: charge.amount,
    });
  }

  if (lineItems.length === 0) {
    return null; // nothing to bill — e.g. lease window doesn't overlap period at all
  }

  const subtotal = lineItems.reduce((sum, item) => sum + item.amount, 0);
  const invoiceNumber = await nextInvoiceNumber(tx);

  return tx.invoice.create({
    data: {
      leaseId: lease.id,
      invoiceNumber,
      status: InvoiceStatus.ISSUED,
      issueDate: new Date(),
      dueDate,
      periodStart: period.periodStart,
      periodEnd: period.periodEnd,
      subtotal,
      vatAmount: 0, // VAT handling lands with the tax module (spec Module 8.4)
      totalAmount: subtotal,
      amountPaid: 0,
      lineItems: { create: lineItems },
    },
    include: { lineItems: true },
  });
}

async function getLeaseForBilling(companyId: string, leaseId: string): Promise<LeaseForBilling> {
  const lease = await prisma.lease.findFirst({
    where: { id: leaseId, unit: { property: { companyId } } },
    select: {
      id: true,
      rentAmount: true,
      startDate: true,
      endDate: true,
      status: true,
      unit: { select: { sizeSqm: true, property: { select: { camRatePerSqm: true } } } },
    },
  });
  if (!lease) throw AppError.notFound("Lease");
  return lease;
}

export async function generateSingleInvoice(companyId: string, input: CreateSingleInvoiceInput) {
  const lease = await getLeaseForBilling(companyId, input.leaseId);

  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const invoice = await buildInvoiceForLease(
      tx,
      lease,
      { periodStart: new Date(input.periodStart), periodEnd: new Date(input.periodEnd) },
      new Date(input.dueDate),
      { waterAmount: input.waterAmount, electricityAmount: input.electricityAmount },
      input.oneOffCharges
    );
    if (!invoice) {
      throw new AppError(
        "No chargeable items for this lease in the given period.",
        422,
        "NOTHING_TO_BILL"
      );
    }
    return invoice;
  });
}

interface BulkGenerationResult {
  created: number;
  skipped: { leaseId: string; reason: string }[];
}

export async function bulkGenerateInvoices(
  companyId: string,
  input: BulkGenerateInvoicesInput
): Promise<BulkGenerationResult> {
  const period: PeriodWindow = {
    periodStart: new Date(input.periodStart),
    periodEnd: new Date(input.periodEnd),
  };
  const dueDate = new Date(input.dueDate);

  const leases = await prisma.lease.findMany({
    where: {
      status: LeaseStatus.ACTIVE,
      unit: { property: { companyId } },
      ...(input.leaseIds ? { id: { in: input.leaseIds } } : {}),
    },
    select: {
      id: true,
      rentAmount: true,
      startDate: true,
      endDate: true,
      status: true,
      unit: { select: { sizeSqm: true, property: { select: { camRatePerSqm: true } } } },
    },
  });

  const utilitiesByLeaseId = new Map(input.utilityCharges.map((u) => [u.leaseId, u]));

  const result: BulkGenerationResult = { created: 0, skipped: [] };

  // Each lease's invoice is its own transaction rather than one giant
  // transaction for the whole batch — a problem with one lease (e.g. a
  // data inconsistency) shouldn't roll back successfully generated
  // invoices for every other lease in the run.
  for (const lease of leases) {
    try {
      const utilities = utilitiesByLeaseId.get(lease.id) ?? {};
      const invoice = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        // Guard against double-billing: skip if an invoice already exists
        // for this lease covering this exact period.
        const existing = await tx.invoice.findFirst({
          where: { leaseId: lease.id, periodStart: period.periodStart, periodEnd: period.periodEnd },
        });
        if (existing) {
          throw new AppError("DUPLICATE_PERIOD", 409, "DUPLICATE_PERIOD");
        }
        return buildInvoiceForLease(tx, lease, period, dueDate, utilities);
      });

      if (invoice) {
        result.created += 1;
      } else {
        result.skipped.push({ leaseId: lease.id, reason: "Nothing to bill for this period" });
      }
    } catch (err) {
      const reason =
        err instanceof AppError && err.code === "DUPLICATE_PERIOD"
          ? "An invoice for this exact period already exists"
          : "Unexpected error generating this invoice";
      result.skipped.push({ leaseId: lease.id, reason });
    }
  }

  return result;
}

export async function listInvoices(companyId: string, leaseId?: string) {
  return prisma.invoice.findMany({
    where: {
      lease: { unit: { property: { companyId } }, ...(leaseId ? { id: leaseId } : {}) },
    },
    include: {
      lineItems: true,
      lease: {
        select: {
          id: true,
          primaryTenant: { select: { id: true, fullName: true } },
          unit: { select: { id: true, unitNumber: true, property: { select: { name: true } } } },
        },
      },
    },
    orderBy: { issueDate: "desc" },
  });
}

export async function getInvoiceById(companyId: string, invoiceId: string) {
  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, lease: { unit: { property: { companyId } } } },
    include: {
      lineItems: true,
      lease: { include: { unit: { include: { property: true } }, primaryTenant: true } },
    },
  });
  if (!invoice) throw AppError.notFound("Invoice");
  return invoice;
}
