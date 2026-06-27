import { z } from "zod";
import { OwnerResidency, FeeBasis } from "@rmbs/shared";

export const createOwnerSchema = z.object({
  fullName: z.string().min(2),
  idOrPassport: z.string().min(4),
  kraPin: z.string().optional(),
  phone: z.string().min(10),
  email: z.string().email().optional(),
  residency: z.nativeEnum(OwnerResidency).default(OwnerResidency.RESIDENT),
  bankAccountName: z.string().optional(),
  bankAccountNumber: z.string().optional(),
  bankName: z.string().optional(),
  feeBasis: z.nativeEnum(FeeBasis).default(FeeBasis.PERCENT_OF_COLLECTED),
  feeValue: z.number().min(0),
  isVatRegistered: z.boolean().default(false),
});

export const updateOwnerSchema = createOwnerSchema.partial();

export type CreateOwnerInput = z.infer<typeof createOwnerSchema>;
export type UpdateOwnerInput = z.infer<typeof updateOwnerSchema>;
