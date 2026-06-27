import { z } from "zod";
import { MaintenanceStatus } from "@rmbs/shared";

export const createMaintenanceRequestSchema = z.object({
  unitId: z.string().uuid(),
  title: z.string().min(2),
  description: z.string().min(2),
  photoUrls: z.array(z.string().url()).default([]),
  raisedByTenantId: z.string().uuid().optional(),
});

export const updateMaintenanceRequestSchema = z.object({
  status: z.nativeEnum(MaintenanceStatus).optional(),
  assignedToUserId: z.string().uuid().optional(),
  assignedVendorName: z.string().optional(),
});

// Recording a cost is split out as its own explicit action rather than
// bundled into the general update — entering a cost is what triggers an
// EXPENSE_PAID trust posting against the unit's owner(s), so it deserves
// its own validated, intentional endpoint rather than slipping in via a
// generic PATCH that might not always carry that intent.
export const recordCostSchema = z.object({
  cost: z.number().positive(),
});

export type CreateMaintenanceRequestInput = z.infer<typeof createMaintenanceRequestSchema>;
export type UpdateMaintenanceRequestInput = z.infer<typeof updateMaintenanceRequestSchema>;
export type RecordCostInput = z.infer<typeof recordCostSchema>;
