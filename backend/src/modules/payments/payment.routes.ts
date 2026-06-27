import { Router } from "express";
import { UserRole } from "@rmbs/shared";
import { authenticate, requireRole } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { createPaymentSchema } from "./payment.schema";
import {
  listPaymentsHandler,
  getPaymentHandler,
  createPaymentHandler,
  confirmPaymentHandler,
  getOutstandingBalanceHandler,
} from "./payment.controller";

export const paymentRouter = Router();

paymentRouter.use(authenticate);

const viewRoles = [
  UserRole.ADMIN,
  UserRole.FINANCE,
  UserRole.PROPERTY_MANAGER,
  UserRole.OWNER,
  UserRole.TENANT,
];

paymentRouter.get("/payments", requireRole(...viewRoles), listPaymentsHandler);
paymentRouter.get("/payments/:id", requireRole(...viewRoles), getPaymentHandler);
paymentRouter.get(
  "/leases/:leaseId/outstanding-balance",
  requireRole(...viewRoles),
  getOutstandingBalanceHandler
);
paymentRouter.post(
  "/payments",
  requireRole(UserRole.ADMIN, UserRole.FINANCE, UserRole.PROPERTY_MANAGER),
  validate(createPaymentSchema),
  createPaymentHandler
);
paymentRouter.post(
  "/payments/:id/confirm",
  requireRole(UserRole.ADMIN, UserRole.FINANCE),
  confirmPaymentHandler
);
