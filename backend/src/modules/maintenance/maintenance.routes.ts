import { Router } from "express";
import { UserRole } from "@rmbs/shared";
import { authenticate, requireRole } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import {
  createMaintenanceRequestSchema,
  updateMaintenanceRequestSchema,
  recordCostSchema,
} from "./maintenance.schema";
import {
  listMaintenanceRequestsHandler,
  getMaintenanceRequestHandler,
  createMaintenanceRequestHandler,
  updateMaintenanceRequestHandler,
  recordMaintenanceCostHandler,
} from "./maintenance.controller";

export const maintenanceRouter = Router();

maintenanceRouter.use(authenticate);

const viewRoles = [
  UserRole.ADMIN,
  UserRole.FINANCE,
  UserRole.PROPERTY_MANAGER,
  UserRole.CARETAKER,
  UserRole.OWNER,
  UserRole.TENANT,
];
const raiseRoles = [
  UserRole.ADMIN,
  UserRole.PROPERTY_MANAGER,
  UserRole.CARETAKER,
  UserRole.TENANT,
];
const manageRoles = [UserRole.ADMIN, UserRole.PROPERTY_MANAGER, UserRole.CARETAKER];
const costRoles = [UserRole.ADMIN, UserRole.PROPERTY_MANAGER];

maintenanceRouter.get("/maintenance-requests", requireRole(...viewRoles), listMaintenanceRequestsHandler);
maintenanceRouter.get("/maintenance-requests/:id", requireRole(...viewRoles), getMaintenanceRequestHandler);
maintenanceRouter.post(
  "/maintenance-requests",
  requireRole(...raiseRoles),
  validate(createMaintenanceRequestSchema),
  createMaintenanceRequestHandler
);
maintenanceRouter.patch(
  "/maintenance-requests/:id",
  requireRole(...manageRoles),
  validate(updateMaintenanceRequestSchema),
  updateMaintenanceRequestHandler
);
maintenanceRouter.post(
  "/maintenance-requests/:id/cost",
  requireRole(...costRoles),
  validate(recordCostSchema),
  recordMaintenanceCostHandler
);
