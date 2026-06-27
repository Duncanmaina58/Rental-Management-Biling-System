import { Prisma } from "@prisma/client";
import { PaymentMethod, PaymentStatus, InvoiceStatus } from "@rmbs/shared";
import { prisma } from "../../config/prisma";
import { AppError } from "../../middleware/errorHandler";
import { CreatePaymentInput } from "./payment.schema";
import { postTrustForAllocation } from "../trust/trust.service";

async function assertLeaseBelongsToCompany(companyId: string, leaseId: string) {
  const lease = await prisma.lease.findFirst({
    where: { id: leaseId, unit: { property: { companyId } } },
    include: { primaryTenant: true },
  });
  if (!lease) throw AppError.notFound("Lease");
  return lease;
}

// Methods that are independently verifiable at the moment of entry
// (a reference number that can be checked against the bank/M-Pesa
// statement) get recorded as CONFIRMED immediately. Cash and cheque
// can't be verified that way, so they start PENDING and need an
// explicit confirm step — spec Module 5.1's approval workflow guard
// against unrecorded cash leakage.
function initialStatusFor(method: PaymentMethod): PaymentStatus {
  return method === PaymentMethod.CASH || method === PaymentMethod.CHEQUE
    ? PaymentStatus.PENDING
    : PaymentStatus.CONFIRMED;
}

// Walks a lease's unpaid/partially-paid invoices oldest-issue-date-first
// and allocates the payment amount across them until either the payment
// runs out or every outstanding invoice is fully covered. Any leftover
// (an overpayment) is simply not allocated — it sits as unallocated
// credit on the payment record, visible but not forced onto an invoice
// that doesn't need it. This is spec Module 5.2's "payment allocation
// order" requirement, made concrete: oldest invoice first.
//
// Each allocation immediately triggers a trust-accounting post (Module 6)
// for whatever portion of that allocation was rent/deposit money — kept
// in the SAME transaction as the allocation itself, so a payment can
// never be "allocated" without its trust-bearing portion being recorded,
// or vice versa.
async function allocatePaymentToInvoices(
  tx: Prisma.TransactionClient,
  paymentId: string,
  leaseId: string,
  amount: number,
  postedByUserId: string
): Promise<{ allocated: number; unallocated: number }> {
  const outstandingInvoices = await tx.invoice.findMany({
    where: {
      leaseId,
      status: { in: [InvoiceStatus.ISSUED, InvoiceStatus.PARTIALLY_PAID, InvoiceStatus.OVERDUE] },
    },
    orderBy: { issueDate: "asc" },
  });

  let remaining = amount;
  let allocated = 0;

  for (const invoice of outstandingInvoices) {
    if (remaining <= 0) break;

    const outstandingOnInvoice = Number(invoice.totalAmount) - Number(invoice.amountPaid);
    if (outstandingOnInvoice <= 0) continue;

    const amountToApply = Math.min(remaining, outstandingOnInvoice);

    await tx.paymentAllocation.create({
      data: { paymentId, invoiceId: invoice.id, amountAllocated: amountToApply },
    });

    await postTrustForAllocation({
      tx,
      paymentId,
      invoiceId: invoice.id,
      amountAllocated: amountToApply,
      postedByUserId,
    });

    const newAmountPaid = Number(invoice.amountPaid) + amountToApply;
    const newStatus =
      newAmountPaid >= Number(invoice.totalAmount) ? InvoiceStatus.PAID : InvoiceStatus.PARTIALLY_PAID;

    await tx.invoice.update({
      where: { id: invoice.id },
      data: { amountPaid: newAmountPaid, status: newStatus },
    });

    remaining -= amountToApply;
    allocated += amountToApply;
  }

  return { allocated, unallocated: remaining };
}

export async function createPayment(
  companyId: string,
  userId: string,
  input: CreatePaymentInput
) {
  const lease = await assertLeaseBelongsToCompany(companyId, input.leaseId);
  const status = initialStatusFor(input.method);

  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const payment = await tx.payment.create({
      data: {
        leaseId: input.leaseId,
        tenantId: lease.primaryTenantId,
        method: input.method,
        status,
        amount: input.amount,
        reference: input.reference,
        paidAt: new Date(input.paidAt),
        recordedByUserId: userId,
      },
    });

    // Only allocate against invoices once the payment is actually
    // confirmed — a PENDING cash payment shouldn't mark anything as paid
    // until someone has explicitly confirmed the cash was received.
    let allocationResult = { allocated: 0, unallocated: input.amount };
    if (status === PaymentStatus.CONFIRMED) {
      allocationResult = await allocatePaymentToInvoices(tx, payment.id, input.leaseId, input.amount, userId);
    }

    return { payment, ...allocationResult };
  });
}

// Confirms a PENDING cash/cheque payment, triggering allocation at the
// point of confirmation rather than at creation time.
export async function confirmPayment(companyId: string, paymentId: string, userId: string) {
  const payment = await prisma.payment.findFirst({
    where: { id: paymentId, lease: { unit: { property: { companyId } } } },
  });
  if (!payment) throw AppError.notFound("Payment");
  if (payment.status !== PaymentStatus.PENDING) {
    throw new AppError(
      `This payment is already ${payment.status.toLowerCase()} and cannot be re-confirmed.`,
      409,
      "PAYMENT_NOT_PENDING"
    );
  }

  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    await tx.payment.update({
      where: { id: paymentId },
      data: { status: PaymentStatus.CONFIRMED },
    });
    const allocationResult = await allocatePaymentToInvoices(
      tx,
      paymentId,
      payment.leaseId,
      Number(payment.amount),
      userId
    );
    return { payment, ...allocationResult };
  });
}

export async function listPayments(companyId: string, leaseId?: string) {
  return prisma.payment.findMany({
    where: {
      lease: { unit: { property: { companyId } }, ...(leaseId ? { id: leaseId } : {}) },
    },
    include: {
      tenant: { select: { id: true, fullName: true } },
      lease: {
        select: { id: true, unit: { select: { unitNumber: true, property: { select: { name: true } } } } },
      },
      allocations: { include: { invoice: { select: { id: true, invoiceNumber: true } } } },
    },
    orderBy: { paidAt: "desc" },
  });
}

export async function getPaymentById(companyId: string, paymentId: string) {
  const payment = await prisma.payment.findFirst({
    where: { id: paymentId, lease: { unit: { property: { companyId } } } },
    include: {
      tenant: true,
      lease: { include: { unit: { include: { property: true } } } },
      allocations: { include: { invoice: true } },
    },
  });
  if (!payment) throw AppError.notFound("Payment");
  return payment;
}

// A lease's outstanding balance — the sum of (totalAmount - amountPaid)
// across every unpaid/partially-paid/overdue invoice. Used by the
// payment-recording UI to show "this tenant owes KES X" before the
// payment is even entered.
export async function getOutstandingBalanceForLease(companyId: string, leaseId: string) {
  await assertLeaseBelongsToCompany(companyId, leaseId);
  const invoices = await prisma.invoice.findMany({
    where: {
      leaseId,
      status: { in: [InvoiceStatus.ISSUED, InvoiceStatus.PARTIALLY_PAID, InvoiceStatus.OVERDUE] },
    },
    select: { id: true, invoiceNumber: true, totalAmount: true, amountPaid: true, dueDate: true },
  });

  let totalOutstanding = 0;
  for (const inv of invoices) {
    totalOutstanding += Number(inv.totalAmount) - Number(inv.amountPaid);
  }

  return { totalOutstanding, invoices };
}
