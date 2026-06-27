import { Router } from "express";
import { UserRole } from "@rmbs/shared";
import { authenticate, requireRole } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { createLeaseSchema, updateLeaseSchema } from "./lease.schema";
import {
  listLeasesHandler,
  getLeaseHandler,
  createLeaseHandler,
  updateLeaseHandler,
} from "./lease.controller";

export const leaseRouter = Router();

leaseRouter.use(authenticate);

const viewRoles = [
  UserRole.ADMIN,
  UserRole.FINANCE,
  UserRole.PROPERTY_MANAGER,
  UserRole.OWNER,
  UserRole.TENANT,
];

leaseRouter.get("/", requireRole(...viewRoles), listLeasesHandler);
leaseRouter.get("/:id", requireRole(...viewRoles), getLeaseHandler);
leaseRouter.post(
  "/",
  requireRole(UserRole.ADMIN, UserRole.PROPERTY_MANAGER),
  validate(createLeaseSchema),
  createLeaseHandler
);
leaseRouter.patch(
  "/:id",
  requireRole(UserRole.ADMIN, UserRole.PROPERTY_MANAGER),
  validate(updateLeaseSchema),
  updateLeaseHandler
);
