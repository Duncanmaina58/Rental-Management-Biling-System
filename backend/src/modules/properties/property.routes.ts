import { Router } from "express";
import { UserRole } from "@rmbs/shared";
import { authenticate, requireRole } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import {
  createPropertySchema,
  updatePropertySchema,
  setPropertyOwnersSchema,
} from "./property.schema";
import {
  listPropertiesHandler,
  getPropertyHandler,
  createPropertyHandler,
  updatePropertyHandler,
  setPropertyOwnersHandler,
  deletePropertyHandler,
} from "./property.controller";

export const propertyRouter = Router();

propertyRouter.use(authenticate);

propertyRouter.get(
  "/",
  requireRole(UserRole.ADMIN, UserRole.FINANCE, UserRole.PROPERTY_MANAGER, UserRole.OWNER),
  listPropertiesHandler
);
propertyRouter.get(
  "/:id",
  requireRole(UserRole.ADMIN, UserRole.FINANCE, UserRole.PROPERTY_MANAGER, UserRole.OWNER),
  getPropertyHandler
);
propertyRouter.post(
  "/",
  requireRole(UserRole.ADMIN),
  validate(createPropertySchema),
  createPropertyHandler
);
propertyRouter.patch(
  "/:id",
  requireRole(UserRole.ADMIN, UserRole.PROPERTY_MANAGER),
  validate(updatePropertySchema),
  updatePropertyHandler
);
propertyRouter.put(
  "/:id/owners",
  requireRole(UserRole.ADMIN),
  validate(setPropertyOwnersSchema),
  setPropertyOwnersHandler
);
propertyRouter.delete("/:id", requireRole(UserRole.ADMIN), deletePropertyHandler);
