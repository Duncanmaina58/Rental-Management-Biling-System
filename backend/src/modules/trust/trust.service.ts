import { Prisma } from "@prisma/client";
import { TrustTransactionType, ChargeType } from "@rmbs/shared";
import { prisma } from "../../config/prisma";
import { AppError } from "../../middleware/errorHandler";

// Charge types whose money belongs to the owner (or, for deposits, to the
// tenant pending refund) and therefore must be held in trust rather than
// treated as the company's own operating revenue. Utilities are typically
// pass-through to the utility provider (not modeled as trust here since
// there's no utility-provider-disbursement concept yet), CAM and late fees
// are commonly treated as company operating revenue in Kenyan property
// management practice. Only RENT and DEPOSIT are posted to trust.
const TRUST_BEARING_CHARGE_TYPES: ChargeType[] = [ChargeType.RENT, ChargeType.DEPOSIT];

interface PostTrustForAllocationParams {
  tx: Prisma.TransactionClient;
  paymentId: string;
  invoiceId: string;
  amountAllocated: number;
  postedByUserId: string;
}

// Called once per PaymentAllocation row, immediately after it's created
// (see payment.service.ts's allocatePaymentToInvoices). Splits the
// allocated amount across the invoice's line items proportionally by
// charge type, and posts a trust transaction only for the rent/deposit
// portion. If an invoice has both rent and a utility line item, and a
// payment only partially covers it, the trust-bearing portion is the
// allocated amount's pro-rata share of rent within that invoice — not
// the full allocated amount — so utility/CAM money never gets misposted
// as owner funds held in trust.
export async function postTrustForAllocation({
  tx,
  paymentId,
  invoiceId,
  amountAllocated,
  postedByUserId,
}: PostTrustForAllocationParams) {
  const invoice = await tx.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      lineItems: true,
      lease: { select: { id: true, primaryTenantId: true, unit: { select: { property: { select: { ownerLinks: { select: { ownerId: true, ownershipPercent: true } } } } } } } },
    },
  });
  if (!invoice) return; // defensive — shouldn't happen, caller already has a valid invoice

  let trustBearingTotal = 0;
  for (const li of invoice.lineItems) {
    if (TRUST_BEARING_CHARGE_TYPES.includes(li.chargeType as ChargeType)) {
      trustBearingTotal += Number(li.amount);
    }
  }

  if (trustBearingTotal <= 0) return; // nothing on this invoice is trust-bearing money

  const invoiceTotal = Number(invoice.totalAmount);
  // Pro-rata share of this specific payment allocation that corresponds
  // to the trust-bearing line items, proportional to their share of the
  // invoice total. E.g. invoice = 30,000 rent + 2,000 CAM = 32,000 total;
  // a 16,000 partial payment allocation is 50% of the invoice, so 50% of
  // the 30,000 rent (15,000) is the trust-bearing portion of this payment.
  const trustBearingShare = invoiceTotal > 0 ? trustBearingTotal / invoiceTotal : 0;
  const trustAmount = Math.round(amountAllocated * trustBearingShare * 100) / 100;

  if (trustAmount <= 0) return;

  // A single owner-owned property's rent is straightforward; co-owned
  // properties split proportionally by ownership %, recorded as separate
  // trust transactions per owner so each owner's sub-ledger balance stays
  // individually attributable — required for the trust reconciliation
  // report (spec Module 6.1) to work property co-ownership doesn't break.
  const ownerLinks = invoice.lease.unit.property.ownerLinks;
  let totalOwnershipPercent = 0;
  for (const link of ownerLinks) {
    totalOwnershipPercent += Number(link.ownershipPercent);
  }
  if (totalOwnershipPercent <= 0) totalOwnershipPercent = 100;

  for (const link of ownerLinks) {
    const ownerShare = Number(link.ownershipPercent) / totalOwnershipPercent;
    const ownerAmount = Math.round(trustAmount * ownerShare * 100) / 100;
    if (ownerAmount <= 0) continue;

    await tx.trustTransaction.create({
      data: {
        type: TrustTransactionType.RENT_RECEIVED,
        amount: ownerAmount,
        ownerId: link.ownerId,
        tenantId: invoice.lease.primaryTenantId,
        leaseId: invoice.leaseId,
        relatedPaymentId: paymentId,
        description: `Rent received via payment allocation to invoice ${invoice.invoiceNumber}`,
        postedByUserId,
        isReversal: false,
      },
    });
  }
}

export async function listTrustTransactions(companyId: string, ownerId?: string) {
  return prisma.trustTransaction.findMany({
    where: {
      OR: [
        { owner: { companyId } },
        { tenant: { companyId } },
        { lease: { unit: { property: { companyId } } } },
      ],
      ...(ownerId ? { ownerId } : {}),
    },
    include: {
      owner: { select: { id: true, fullName: true } },
      tenant: { select: { id: true, fullName: true } },
      lease: { select: { id: true, unit: { select: { unitNumber: true, property: { select: { name: true } } } } } },
      postedBy: { select: { id: true, fullName: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

// The trust reconciliation summary (spec Module 6.1): for each owner,
// sum every trust transaction posted in their name to derive their
// current trust balance — money collected on their behalf but not yet
// disbursed. This is the number that should, in a real deployment,
// match the company's actual trust bank account balance when summed
// across all owners.
export async function getTrustBalancesByOwner(companyId: string) {
  const transactions = await prisma.trustTransaction.findMany({
    where: { owner: { companyId } },
    select: { ownerId: true, amount: true, type: true },
  });

  const balances = new Map<string, number>();
  for (const txn of transactions) {
    if (!txn.ownerId) continue;
    const current = balances.get(txn.ownerId) ?? 0;
    balances.set(txn.ownerId, current + Number(txn.amount));
  }

  const owners = await prisma.owner.findMany({
    where: { companyId, id: { in: Array.from(balances.keys()) } },
    select: { id: true, fullName: true },
  });

  const result: { ownerId: string; ownerName: string; trustBalance: number }[] = [];
  for (const owner of owners) {
    result.push({
      ownerId: owner.id,
      ownerName: owner.fullName,
      trustBalance: Math.round((balances.get(owner.id) ?? 0) * 100) / 100,
    });
  }
  return result;
}

// Reversal is the ONLY way to correct a posted trust transaction — the
// append-only rule from spec Module 6.3. This creates a new transaction
// with the inverse amount and a pointer back to what it reverses; it
// never updates or deletes the original row.
export async function reverseTrustTransaction(
  companyId: string,
  transactionId: string,
  postedByUserId: string,
  reason: string
) {
  const original = await prisma.trustTransaction.findFirst({
    where: {
      id: transactionId,
      OR: [
        { owner: { companyId } },
        { tenant: { companyId } },
        { lease: { unit: { property: { companyId } } } },
      ],
    },
  });
  if (!original) throw AppError.notFound("Trust transaction");
  if (original.isReversal) {
    throw new AppError("Cannot reverse a reversal entry.", 409, "CANNOT_REVERSE_REVERSAL");
  }

  const alreadyReversed = await prisma.trustTransaction.findFirst({
    where: { reversesTransactionId: transactionId },
  });
  if (alreadyReversed) {
    throw new AppError("This transaction has already been reversed.", 409, "ALREADY_REVERSED");
  }

  return prisma.trustTransaction.create({
    data: {
      type: TrustTransactionType.REVERSAL,
      amount: Number(original.amount) * -1,
      ownerId: original.ownerId,
      tenantId: original.tenantId,
      leaseId: original.leaseId,
      relatedPaymentId: original.relatedPaymentId,
      relatedDisbursementId: original.relatedDisbursementId,
      description: `Reversal of transaction ${original.id}: ${reason}`,
      postedByUserId,
      isReversal: true,
      reversesTransactionId: original.id,
    },
  });
}
