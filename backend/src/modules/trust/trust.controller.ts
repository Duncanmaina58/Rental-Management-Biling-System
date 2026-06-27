import { Request, Response } from "express";
import * as trustService from "./trust.service";
import { AppError } from "../../middleware/errorHandler";

export async function listTrustTransactionsHandler(req: Request, res: Response) {
  const ownerId = req.query.ownerId as string | undefined;
  const transactions = await trustService.listTrustTransactions(req.user!.companyId, ownerId);
  res.json({ success: true, data: transactions });
}

export async function getTrustBalancesHandler(req: Request, res: Response) {
  const balances = await trustService.getTrustBalancesByOwner(req.user!.companyId);
  res.json({ success: true, data: balances });
}

export async function reverseTrustTransactionHandler(req: Request, res: Response) {
  const { reason } = req.body;
  if (!reason || typeof reason !== "string" || reason.trim().length === 0) {
    throw new AppError("A reason is required to reverse a trust transaction.", 422, "REASON_REQUIRED");
  }
  const reversal = await trustService.reverseTrustTransaction(
    req.user!.companyId,
    req.params.id,
    req.user!.id,
    reason
  );
  res.status(201).json({ success: true, data: reversal });
}
