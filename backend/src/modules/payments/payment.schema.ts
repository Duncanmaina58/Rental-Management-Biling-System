import { z } from "zod";
import { PaymentMethod } from "@rmbs/shared";

// A payment is recorded against a lease, not a specific invoice — the
// allocation across that lease's outstanding invoices happens
// automatically in the service layer (oldest-invoice-first), matching
// spec Module 5.2's "payment allocation order" requirement. The person
// recording the payment doesn't need to know which invoice(s) it covers;
// they just know how much the tenant paid and when.
export const createPaymentSchema = z.object({
  leaseId: z.string().uuid(),
  method: z.nativeEnum(PaymentMethod),
  amount: z.number().positive(),
  reference: z.string().optional(),
  paidAt: z.string().date(),
});

// Cash/cheque payments start as PENDING and need an explicit confirmation
// step before they're allocated against invoices — spec Module 5.1's
// "manual payment entry with approval workflow," guarding against
// unrecorded cash leakage. M-Pesa/bank payments can be created directly
// as CONFIRMED since the reference number is independently verifiable.
export const confirmPaymentSchema = z.object({
  confirmed: z.literal(true),
});

export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;
