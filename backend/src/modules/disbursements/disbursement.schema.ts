import { z } from "zod";

// Calculating a disbursement is a read-only preview — it doesn't write
// anything until the separate "create" step. This lets a finance user
// see the numbers (gross, fee, withholding, net) before committing to
// posting a trust outflow against them.
export const calculateDisbursementSchema = z.object({
  ownerId: z.string().uuid(),
  periodStart: z.string().date(),
  periodEnd: z.string().date(),
});

export const createDisbursementSchema = calculateDisbursementSchema;

export const approveDisbursementSchema = z.object({
  payoutReference: z.string().optional(),
});

export type CalculateDisbursementInput = z.infer<typeof calculateDisbursementSchema>;
export type CreateDisbursementInput = z.infer<typeof createDisbursementSchema>;
export type ApproveDisbursementInput = z.infer<typeof approveDisbursementSchema>;
