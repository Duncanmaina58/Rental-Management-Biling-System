import { z } from "zod";
import { PropertyType } from "@rmbs/shared";

// A property must be linked to at least one owner at creation time.
// ownershipPercent across all linked owners should sum to 100 — validated
// in the service layer (cross-field validation belongs there, not in Zod,
// since it requires checking the array's total).
const ownerLinkSchema = z.object({
  ownerId: z.string().uuid(),
  ownershipPercent: z.number().min(0.01).max(100),
});

export const createPropertySchema = z.object({
  name: z.string().min(2),
  address: z.string().min(5),
  propertyType: z.nativeEnum(PropertyType),
  camRatePerSqm: z.number().min(0).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  owners: z.array(ownerLinkSchema).min(1, "At least one owner must be linked"),
});

export const updatePropertySchema = z.object({
  name: z.string().min(2).optional(),
  address: z.string().min(5).optional(),
  propertyType: z.nativeEnum(PropertyType).optional(),
  camRatePerSqm: z.number().min(0).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
});

// Separate endpoint for changing ownership splits, since it's a distinct,
// more sensitive operation than editing a property's name/address.
export const setPropertyOwnersSchema = z.object({
  owners: z.array(ownerLinkSchema).min(1, "At least one owner must be linked"),
});

export type CreatePropertyInput = z.infer<typeof createPropertySchema>;
export type UpdatePropertyInput = z.infer<typeof updatePropertySchema>;
export type SetPropertyOwnersInput = z.infer<typeof setPropertyOwnersSchema>;
