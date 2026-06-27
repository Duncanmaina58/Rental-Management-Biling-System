import { Router } from "express";
import { UserRole } from "@rmbs/shared";
import { authenticate, requireRole } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { bulkGenerateInvoicesSchema, createSingleInvoiceSchema } from "./billing.schema";
import {
  listInvoicesHandler,
  getInvoiceHandler,
  createSingleInvoiceHandler,
  bulkGenerateInvoicesHandler,
} from "./billing.controller";

export const billingRouter = Router();

billingRouter.use(authenticate);

const viewRoles = [
  UserRole.ADMIN,
  UserRole.FINANCE,
  UserRole.PROPERTY_MANAGER,
  UserRole.OWNER,
  UserRole.TENANT,
];

billingRouter.get("/invoices", requireRole(...viewRoles), listInvoicesHandler);
billingRouter.get("/invoices/:id", requireRole(...viewRoles), getInvoiceHandler);
billingRouter.post(
  "/invoices",
  requireRole(UserRole.ADMIN, UserRole.FINANCE),
  validate(createSingleInvoiceSchema),
  createSingleInvoiceHandler
);
billingRouter.post(
  "/invoices/bulk-generate",
  requireRole(UserRole.ADMIN, UserRole.FINANCE),
  validate(bulkGenerateInvoicesSchema),
  bulkGenerateInvoicesHandler
);
