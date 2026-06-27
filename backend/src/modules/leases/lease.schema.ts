import { z } from "zod";
import { LeaseStatus, RentBasis, BillingCycle } from "@rmbs/shared";

export const createLeaseSchema = z.object({
  unitId: z.string().uuid(),
  primaryTenantId: z.string().uuid(),
  startDate: z.string().datetime().or(z.string().date()),
  endDate: z.string().datetime().or(z.string().date()).optional(),
  rentBasis: z.nativeEnum(RentBasis).default(RentBasis.FLAT_MONTHLY),
  rentAmount: z.number().positive(),
  billingCycle: z.nativeEnum(BillingCycle).default(BillingCycle.MONTHLY),
  depositAmount: z.number().min(0).default(0),
  escalationPercent: z.number().min(0).max(100).optional(),
  escalationFrequencyMonths: z.number().int().positive().optional(),
  noticePeriodDays: z.number().int().min(0).default(30),
  // Additional tenants beyond the primary, for co-tenancy (Module 2.2) —
  // each gets a LeaseTenant row with an optional liability share.
  additionalTenants: z
    .array(
      z.object({
        tenantId: z.string().uuid(),
        liabilitySharePercent: z.number().min(0).max(100).optional(),
      })
    )
    .default([]),
});

export const updateLeaseSchema = z.object({
  status: z.nativeEnum(LeaseStatus).optional(),
  endDate: z.string().datetime().or(z.string().date()).optional(),
  rentBasis: z.nativeEnum(RentBasis).optional(),
  rentAmount: z.number().positive().optional(),
  billingCycle: z.nativeEnum(BillingCycle).optional(),
  escalationPercent: z.number().min(0).max(100).optional(),
  escalationFrequencyMonths: z.number().int().positive().optional(),
  noticePeriodDays: z.number().int().min(0).optional(),
});

export type CreateLeaseInput = z.infer<typeof createLeaseSchema>;
export type UpdateLeaseInput = z.infer<typeof updateLeaseSchema>;
