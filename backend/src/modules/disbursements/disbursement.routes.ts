import { Router } from "express";
import { UserRole } from "@rmbs/shared";
import { authenticate, requireRole } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import {
  calculateDisbursementSchema,
  createDisbursementSchema,
  approveDisbursementSchema,
} from "./disbursement.schema";
import {
  previewDisbursementHandler,
  createDisbursementHandler,
  approveDisbursementHandler,
  holdDisbursementHandler,
  listDisbursementsHandler,
  getDisbursementHandler,
} from "./disbursement.controller";

export const disbursementRouter = Router();

disbursementRouter.use(authenticate);

const viewRoles = [UserRole.ADMIN, UserRole.FINANCE, UserRole.OWNER];
const manageRoles = [UserRole.ADMIN, UserRole.FINANCE];

disbursementRouter.get("/disbursements", requireRole(...viewRoles), listDisbursementsHandler);
disbursementRouter.get("/disbursements/:id", requireRole(...viewRoles), getDisbursementHandler);
disbursementRouter.post(
  "/disbursements/preview",
  requireRole(...manageRoles),
  validate(calculateDisbursementSchema),
  previewDisbursementHandler
);
disbursementRouter.post(
  "/disbursements",
  requireRole(...manageRoles),
  validate(createDisbursementSchema),
  createDisbursementHandler
);
disbursementRouter.post(
  "/disbursements/:id/approve",
  requireRole(...manageRoles),
  validate(approveDisbursementSchema),
  approveDisbursementHandler
);
disbursementRouter.post(
  "/disbursements/:id/hold",
  requireRole(...manageRoles),
  holdDisbursementHandler
);
