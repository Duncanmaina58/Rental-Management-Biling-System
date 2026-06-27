import { Router } from "express";
import { UserRole } from "@rmbs/shared";
import { authenticate, requireRole } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { createOwnerSchema, updateOwnerSchema } from "./owner.schema";
import {
  listOwnersHandler,
  getOwnerHandler,
  createOwnerHandler,
  updateOwnerHandler,
  deleteOwnerHandler,
} from "./owner.controller";

export const ownerRouter = Router();

// Per the spec's roles matrix (Section 13): Admin full access, Finance view,
// Property Manager view, Owner can view only their own record (enforced in service
// layer via scopeToSelfIfApplicable in a later iteration — owners list endpoint
// below should be restricted further once owner-self-view is implemented).
ownerRouter.use(authenticate);

ownerRouter.get(
  "/",
  requireRole(UserRole.ADMIN, UserRole.FINANCE, UserRole.PROPERTY_MANAGER),
  listOwnersHandler
);
ownerRouter.get(
  "/:id",
  requireRole(UserRole.ADMIN, UserRole.FINANCE, UserRole.PROPERTY_MANAGER, UserRole.OWNER),
  getOwnerHandler
);
ownerRouter.post(
  "/",
  requireRole(UserRole.ADMIN),
  validate(createOwnerSchema),
  createOwnerHandler
);
ownerRouter.patch(
  "/:id",
  requireRole(UserRole.ADMIN),
  validate(updateOwnerSchema),
  updateOwnerHandler
);
ownerRouter.delete("/:id", requireRole(UserRole.ADMIN), deleteOwnerHandler);
