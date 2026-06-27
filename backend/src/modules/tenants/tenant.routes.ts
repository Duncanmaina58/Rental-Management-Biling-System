import { Router } from "express";
import { UserRole } from "@rmbs/shared";
import { authenticate, requireRole } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { createTenantSchema, updateTenantSchema } from "./tenant.schema";
import {
  listTenantsHandler,
  getTenantHandler,
  createTenantHandler,
  updateTenantHandler,
  deleteTenantHandler,
} from "./tenant.controller";

export const tenantRouter = Router();

tenantRouter.use(authenticate);

const viewRoles = [UserRole.ADMIN, UserRole.FINANCE, UserRole.PROPERTY_MANAGER];

tenantRouter.get("/", requireRole(...viewRoles), listTenantsHandler);
tenantRouter.get("/:id", requireRole(...viewRoles, UserRole.TENANT), getTenantHandler);
tenantRouter.post(
  "/",
  requireRole(UserRole.ADMIN, UserRole.PROPERTY_MANAGER),
  validate(createTenantSchema),
  createTenantHandler
);
tenantRouter.patch(
  "/:id",
  requireRole(UserRole.ADMIN, UserRole.PROPERTY_MANAGER),
  validate(updateTenantSchema),
  updateTenantHandler
);
tenantRouter.delete("/:id", requireRole(UserRole.ADMIN), deleteTenantHandler);
