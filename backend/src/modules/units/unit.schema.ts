import { z } from "zod";
import { UnitType, UnitClassification, UnitStatus } from "@rmbs/shared";

export const createUnitSchema = z.object({
  propertyId: z.string().uuid(),
  unitNumber: z.string().min(1),
  floor: z.string().optional(),
  sizeSqm: z.number().positive().optional(),
  unitType: z.nativeEnum(UnitType),
  classification: z.nativeEnum(UnitClassification),
  bedrooms: z.number().int().min(0).optional(),
  hasParking: z.boolean().default(false),
  meterNumberWater: z.string().optional(),
  meterNumberElectricity: z.string().optional(),
});

export const updateUnitSchema = z.object({
  unitNumber: z.string().min(1).optional(),
  floor: z.string().optional(),
  sizeSqm: z.number().positive().optional(),
  unitType: z.nativeEnum(UnitType).optional(),
  classification: z.nativeEnum(UnitClassification).optional(),
  status: z.nativeEnum(UnitStatus).optional(),
  bedrooms: z.number().int().min(0).optional(),
  hasParking: z.boolean().optional(),
  meterNumberWater: z.string().optional(),
  meterNumberElectricity: z.string().optional(),
});

export type CreateUnitInput = z.infer<typeof createUnitSchema>;
export type UpdateUnitInput = z.infer<typeof updateUnitSchema>;
