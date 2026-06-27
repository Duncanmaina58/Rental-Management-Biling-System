import { Router } from "express";
import { UserRole } from "@rmbs/shared";
import { authenticate, requireRole } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { createUnitSchema, updateUnitSchema } from "./unit.schema";
import {
  listUnitsByPropertyHandler,
  listAllUnitsHandler,
  getUnitHandler,
  createUnitHandler,
  updateUnitHandler,
  deleteUnitHandler,
} from "./unit.controller";

export const unitRouter = Router();

unitRouter.use(authenticate);

const viewRoles = [
  UserRole.ADMIN,
  UserRole.FINANCE,
  UserRole.PROPERTY_MANAGER,
  UserRole.OWNER,
];

// Company-wide listing (optionally ?status=VACANT) — used by the lease
// creation flow's unit picker.
unitRouter.get("/units", requireRole(...viewRoles), listAllUnitsHandler);
// Nested under /properties/:propertyId/units for listing (clearer in context),
// flat /units/:id for direct single-unit operations.
unitRouter.get("/properties/:propertyId/units", requireRole(...viewRoles), listUnitsByPropertyHandler);
unitRouter.get("/units/:id", requireRole(...viewRoles), getUnitHandler);
unitRouter.post(
  "/units",
  requireRole(UserRole.ADMIN, UserRole.PROPERTY_MANAGER),
  validate(createUnitSchema),
  createUnitHandler
);
unitRouter.patch(
  "/units/:id",
  requireRole(UserRole.ADMIN, UserRole.PROPERTY_MANAGER),
  validate(updateUnitSchema),
  updateUnitHandler
);
unitRouter.delete("/units/:id", requireRole(UserRole.ADMIN), deleteUnitHandler);
