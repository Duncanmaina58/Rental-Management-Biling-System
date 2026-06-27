import { Prisma } from "@prisma/client";
import {
  FeeBasis,
  OwnerResidency,
  TrustTransactionType,
  DisbursementStatus,
} from "@rmbs/shared";
import { TAX_PARAM_KEYS } from "@rmbs/shared";
import { prisma } from "../../config/prisma";
import { AppError } from "../../middleware/errorHandler";

async function getOwnerForDisbursement(companyId: string, ownerId: string) {
  const owner = await prisma.owner.findFirst({ where: { id: ownerId, companyId } });
  if (!owner) throw AppError.notFound("Owner");
  return owner;
}

async function getTaxRate(key: string): Promise<number> {
  const param = await prisma.taxParameter.findUnique({ where: { key } });
  if (!param) {
    throw new AppError(
      `Tax parameter ${key} is not configured. Seed it before running disbursements.`,
      500,
      "TAX_PARAMETER_MISSING"
    );
  }
  return Number(param.value);
}

interface DisbursementCalculation {
  grossRentCollected: number;
  managementFee: number;
  withholdingTaxDeducted: number;
  expensesDeducted: number;
  netPayable: number;
  trustTransactionIds: string[];
}

// The actual money math, shared by both the read-only preview endpoint
// and the real disbursement-creation endpoint, so "what you see in the
// preview" and "what you get when you commit" can never drift apart —
// there is exactly one place this calculation happens.
async function calculateDisbursement(
  companyId: string,
  ownerId: string,
  periodStart: Date,
  periodEnd: Date
): Promise<DisbursementCalculation> {
  const owner = await getOwnerForDisbursement(companyId, ownerId);

  // Gross rent collected = every RENT_RECEIVED trust transaction posted
  // for this owner in the period, minus any reversals against them.
  // Trust transactions are the source of truth here, not invoices —
  // disbursement is about money actually held in trust, not money billed.
  // Reversals are stored with type=REVERSAL regardless of what they
  // reverse (rent, expense, anything else) — type alone can't tell us
  // which side of the ledger a given reversal belongs to. We fetch every
  // RENT_RECEIVED transaction for the period AND every REVERSAL in the
  // period, then only keep reversals whose `reversesTransactionId` points
  // at a RENT_RECEIVED transaction — otherwise a reversal of an expense
  // or fee could get incorrectly summed into gross rent collected.
  const [rentReceivedTxns, reversalTxns] = await Promise.all([
    prisma.trustTransaction.findMany({
      where: {
        ownerId,
        type: TrustTransactionType.RENT_RECEIVED,
        createdAt: { gte: periodStart, lte: periodEnd },
      },
      select: { id: true, amount: true },
    }),
    prisma.trustTransaction.findMany({
      where: {
        ownerId,
        type: TrustTransactionType.REVERSAL,
        createdAt: { gte: periodStart, lte: periodEnd },
      },
      select: { id: true, amount: true, reversesTransactionId: true },
    }),
  ]);

  const reversedOriginalIds: string[] = [];
  for (const r of reversalTxns) {
    if (r.reversesTransactionId) reversedOriginalIds.push(r.reversesTransactionId);
  }

  const reversedOriginalTypes = await prisma.trustTransaction.findMany({
    where: { id: { in: reversedOriginalIds } },
    select: { id: true, type: true },
  });
  const originalTypeById = new Map<string, string>();
  for (const o of reversedOriginalTypes) {
    originalTypeById.set(o.id, o.type);
  }

  let grossRentCollected = 0;
  const trustTransactionIds: string[] = [];
  for (const txn of rentReceivedTxns) {
    grossRentCollected += Number(txn.amount);
    trustTransactionIds.push(txn.id);
  }
  for (const reversal of reversalTxns) {
    const originalType = reversal.reversesTransactionId
      ? originalTypeById.get(reversal.reversesTransactionId)
      : undefined;
    if (originalType === TrustTransactionType.RENT_RECEIVED) {
      grossRentCollected += Number(reversal.amount);
      trustTransactionIds.push(reversal.id);
    }
  }

  if (grossRentCollected < 0) grossRentCollected = 0;

  // Maintenance expenses charged against this owner in the period — see
  // maintenance.service.ts's recordMaintenanceCost, which posts these as
  // EXPENSE_PAID trust outflows. Summed the same way rent is: take the
  // absolute value since EXPENSE_PAID is stored as a negative (outflow).
  const expenseTxns = await prisma.trustTransaction.findMany({
    where: {
      ownerId,
      type: TrustTransactionType.EXPENSE_PAID,
      createdAt: { gte: periodStart, lte: periodEnd },
    },
    select: { id: true, amount: true },
  });
  let expensesDeducted = 0;
  for (const txn of expenseTxns) {
    expensesDeducted += Math.abs(Number(txn.amount));
    trustTransactionIds.push(txn.id);
  }

  // Management fee per the owner's configured basis. PERCENT_OF_BILLED
  // would require pulling invoice totals rather than trust transactions;
  // since gross rent *collected* is what we have on hand here, BILLED and
  // COLLECTED bases currently compute identically (both apply % to the
  // collected figure). This is a known simplification — see README note —
  // worth revisiting once a "billed but uncollected" figure is tracked
  // separately from trust transactions.
  let managementFee = 0;
  if (owner.feeBasis === FeeBasis.FLAT_FEE) {
    managementFee = Number(owner.feeValue);
  } else {
    managementFee = Math.round(grossRentCollected * (Number(owner.feeValue) / 100) * 100) / 100;
  }
  // Fee can never exceed what was actually collected — guards against a
  // flat fee disbursement going negative on a month with little/no rent.
  managementFee = Math.min(managementFee, grossRentCollected);

  // Withholding tax: resident vs. non-resident rate, per spec Module 8.3.
  // Applied to gross rent collected, not to the post-fee amount — the
  // company withholds on the owner's gross rental income, independent of
  // its own management fee arrangement with that owner.
  const withholdingRateKey =
    owner.residency === OwnerResidency.NON_RESIDENT
      ? TAX_PARAM_KEYS.WITHHOLDING_RATE_NON_RESIDENT
      : TAX_PARAM_KEYS.WITHHOLDING_RATE_RESIDENT;
  const withholdingRate = await getTaxRate(withholdingRateKey);
  const withholdingTaxDeducted = Math.round(grossRentCollected * (withholdingRate / 100) * 100) / 100;

  // Deductions can never exceed what was actually collected — a
  // disbursement paying an owner a NEGATIVE amount makes no sense in
  // reality (the company can't claw back fees it hasn't been paid from
  // an owner with low/no rent collected this period). If the combined
  // fee + withholding + expenses would exceed gross, net payable clamps
  // to zero rather than going negative; the shortfall in fee/withholding
  // is effectively deferred rather than collected this cycle. This is a
  // deliberate simplification — a real accounting system would carry the
  // shortfall forward as a receivable from the owner, which isn't
  // modeled yet.
  const totalDeductions = managementFee + withholdingTaxDeducted + expensesDeducted;
  const netPayable =
    totalDeductions > grossRentCollected
      ? 0
      : Math.round((grossRentCollected - totalDeductions) * 100) / 100;

  return {
    grossRentCollected,
    managementFee,
    withholdingTaxDeducted,
    expensesDeducted,
    netPayable,
    trustTransactionIds,
  };
}

export async function previewDisbursement(
  companyId: string,
  ownerId: string,
  periodStart: string,
  periodEnd: string
) {
  return calculateDisbursement(companyId, ownerId, new Date(periodStart), new Date(periodEnd));
}

export async function createDisbursement(
  companyId: string,
  ownerId: string,
  periodStart: string,
  periodEnd: string
) {
  const start = new Date(periodStart);
  const end = new Date(periodEnd);

  const existing = await prisma.disbursement.findFirst({
    where: { ownerId, periodStart: start, periodEnd: end },
  });
  if (existing) {
    throw new AppError(
      "A disbursement for this owner and period already exists.",
      409,
      "DUPLICATE_DISBURSEMENT"
    );
  }

  const calc = await calculateDisbursement(companyId, ownerId, start, end);

  if (calc.grossRentCollected <= 0) {
    throw new AppError(
      "No rent was collected for this owner in the selected period — nothing to disburse.",
      422,
      "NOTHING_TO_DISBURSE"
    );
  }

  return prisma.disbursement.create({
    data: {
      ownerId,
      periodStart: start,
      periodEnd: end,
      grossRentCollected: calc.grossRentCollected,
      managementFee: calc.managementFee,
      withholdingTaxDeducted: calc.withholdingTaxDeducted,
      expensesDeducted: calc.expensesDeducted,
      netPayable: calc.netPayable,
      status: DisbursementStatus.PENDING_APPROVAL,
    },
  });
}

// Approval posts the actual trust outflow — this is the point where money
// "leaves" the trust ledger on paper. Kept as a separate, explicit step
// from creation per spec Module 7.2's "disbursement approval workflow,"
// so a finance manager reviews the calculated numbers before committing.
export async function approveDisbursement(
  companyId: string,
  disbursementId: string,
  approvedByUserId: string,
  payoutReference?: string
) {
  const disbursement = await prisma.disbursement.findFirst({
    where: { id: disbursementId, owner: { companyId } },
  });
  if (!disbursement) throw AppError.notFound("Disbursement");
  if (disbursement.status !== DisbursementStatus.PENDING_APPROVAL) {
    throw new AppError(
      `This disbursement is already ${disbursement.status.toLowerCase()} and cannot be approved again.`,
      409,
      "DISBURSEMENT_NOT_PENDING"
    );
  }

  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const updated = await tx.disbursement.update({
      where: { id: disbursementId },
      data: {
        status: DisbursementStatus.PAID_OUT,
        approvedByUserId,
        paidOutAt: new Date(),
        payoutReference,
      },
    });

    const periodStartStr = disbursement.periodStart.toISOString().slice(0, 10);
    const periodEndStr = disbursement.periodEnd.toISOString().slice(0, 10);

    // Negative amount = outflow from trust, per the sign convention
    // documented on TrustTransaction.amount. This is the disbursement's
    // own append-only ledger entry — it never edits the RENT_RECEIVED
    // entries that funded it, it just records that the money left.
    await tx.trustTransaction.create({
      data: {
        type: TrustTransactionType.OWNER_DISBURSEMENT,
        amount: Number(disbursement.netPayable) * -1,
        ownerId: disbursement.ownerId,
        relatedDisbursementId: disbursement.id,
        description: `Disbursement payout for period ${periodStartStr} to ${periodEndStr}`,
        postedByUserId: approvedByUserId,
        isReversal: false,
      },
    });

    // Withholding tax deducted is also a real trust outflow — it leaves
    // the company's hands en route to KRA, on the owner's behalf, even
    // though it's not paid to the owner directly.
    if (Number(disbursement.withholdingTaxDeducted) > 0) {
      await tx.trustTransaction.create({
        data: {
          type: TrustTransactionType.WITHHOLDING_TAX_REMITTED,
          amount: Number(disbursement.withholdingTaxDeducted) * -1,
          ownerId: disbursement.ownerId,
          relatedDisbursementId: disbursement.id,
          description: `Withholding tax on disbursement for period ${periodStartStr} to ${periodEndStr}`,
          postedByUserId: approvedByUserId,
          isReversal: false,
        },
      });
    }

    // The management fee is the company's own earned revenue leaving
    // the trust ledger (it was never the owner's money to begin with,
    // but it was sitting in the same pooled trust account until now) —
    // spec Module 6.1's "strict fund-movement rules": funds can only
    // move from Trust to Operating via a defined transaction type.
    if (Number(disbursement.managementFee) > 0) {
      await tx.trustTransaction.create({
        data: {
          type: TrustTransactionType.MANAGEMENT_FEE_EARNED,
          amount: Number(disbursement.managementFee) * -1,
          ownerId: disbursement.ownerId,
          relatedDisbursementId: disbursement.id,
          description: `Management fee earned on disbursement for period ${periodStartStr} to ${periodEndStr}`,
          postedByUserId: approvedByUserId,
          isReversal: false,
        },
      });
    }

    return updated;
  });
}

export async function holdDisbursement(companyId: string, disbursementId: string) {
  const disbursement = await prisma.disbursement.findFirst({
    where: { id: disbursementId, owner: { companyId } },
  });
  if (!disbursement) throw AppError.notFound("Disbursement");
  if (disbursement.status !== DisbursementStatus.PENDING_APPROVAL) {
    throw new AppError(
      "Only a disbursement pending approval can be held.",
      409,
      "DISBURSEMENT_NOT_PENDING"
    );
  }
  return prisma.disbursement.update({
    where: { id: disbursementId },
    data: { status: DisbursementStatus.HELD },
  });
}

export async function listDisbursements(companyId: string, ownerId?: string) {
  return prisma.disbursement.findMany({
    where: { owner: { companyId }, ...(ownerId ? { ownerId } : {}) },
    include: { owner: { select: { id: true, fullName: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function getDisbursementById(companyId: string, disbursementId: string) {
  const disbursement = await prisma.disbursement.findFirst({
    where: { id: disbursementId, owner: { companyId } },
    include: { owner: true, trustTxns: true },
  });
  if (!disbursement) throw AppError.notFound("Disbursement");
  return disbursement;
}
