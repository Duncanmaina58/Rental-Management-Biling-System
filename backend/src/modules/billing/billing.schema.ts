import { z } from "zod";

// Per-lease variable charges entered during a billing run — utilities are
// metered (variable per period) and CAM is auto-calculated from the
// property's camRatePerSqm, but utility AMOUNTS still need a human to key
// them in since meter readings aren't digitized yet (spec Module 4.2 notes
// this as a manual-entry-first feature, smart-meter API integration later).
const utilityChargeSchema = z.object({
  leaseId: z.string().uuid(),
  waterAmount: z.number().min(0).optional(),
  electricityAmount: z.number().min(0).optional(),
});

// Generate invoices for every ACTIVE lease in one run, for a given period.
// Rent is always included and pro-rated automatically; CAM is included
// automatically wherever the property has a camRatePerSqm set; utilities
// are included only for leases where an amount was actually provided —
// omitting a lease from utilityCharges simply means "no utility charge
// this cycle for that unit," not an error.
export const bulkGenerateInvoicesSchema = z.object({
  periodStart: z.string().date(),
  periodEnd: z.string().date(),
  dueDate: z.string().date(),
  utilityCharges: z.array(utilityChargeSchema).default([]),
  // Restrict the run to specific leases rather than every active lease —
  // used for re-running a subset after fixing a mistake, without
  // re-billing everyone else.
  leaseIds: z.array(z.string().uuid()).optional(),
});

// Single-lease, one-off invoice — used for ad-hoc charges (Module 4.2's
// "one-off charges": damage fees, legal notice fees) or generating just
// one lease's invoice outside the normal bulk cycle.
export const createSingleInvoiceSchema = z.object({
  leaseId: z.string().uuid(),
  periodStart: z.string().date(),
  periodEnd: z.string().date(),
  dueDate: z.string().date(),
  waterAmount: z.number().min(0).optional(),
  electricityAmount: z.number().min(0).optional(),
  oneOffCharges: z
    .array(
      z.object({
        description: z.string().min(1),
        amount: z.number(),
      })
    )
    .default([]),
});

export type BulkGenerateInvoicesInput = z.infer<typeof bulkGenerateInvoicesSchema>;
export type CreateSingleInvoiceInput = z.infer<typeof createSingleInvoiceSchema>;
