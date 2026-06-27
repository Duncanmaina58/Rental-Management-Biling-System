import { Router } from "express";
import { UserRole } from "@rmbs/shared";
import { authenticate, requireRole } from "../../middleware/auth";
import {
  listTrustTransactionsHandler,
  getTrustBalancesHandler,
  reverseTrustTransactionHandler,
} from "./trust.controller";

export const trustRouter = Router();

trustRouter.use(authenticate);

// Per spec Module 6.3: "Only specific authorized roles (e.g. senior
// accountant, finance manager) can post or approve trust ledger
// movements." Property managers and tenants never see the trust ledger —
// it's an internal financial control, not portfolio-operations data.
const trustRoles = [UserRole.ADMIN, UserRole.FINANCE];

trustRouter.get("/trust/transactions", requireRole(...trustRoles), listTrustTransactionsHandler);
trustRouter.get("/trust/balances", requireRole(...trustRoles), getTrustBalancesHandler);
trustRouter.post(
  "/trust/transactions/:id/reverse",
  requireRole(...trustRoles),
  reverseTrustTransactionHandler
);
