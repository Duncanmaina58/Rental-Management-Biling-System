import { Request, Response } from "express";
import * as paymentService from "./payment.service";

export async function listPaymentsHandler(req: Request, res: Response) {
  const leaseId = req.query.leaseId as string | undefined;
  const payments = await paymentService.listPayments(req.user!.companyId, leaseId);
  res.json({ success: true, data: payments });
}

export async function getPaymentHandler(req: Request, res: Response) {
  const payment = await paymentService.getPaymentById(req.user!.companyId, req.params.id);
  res.json({ success: true, data: payment });
}

export async function createPaymentHandler(req: Request, res: Response) {
  const result = await paymentService.createPayment(
    req.user!.companyId,
    req.user!.id,
    req.body
  );
  res.status(201).json({ success: true, data: result });
}

export async function confirmPaymentHandler(req: Request, res: Response) {
  const result = await paymentService.confirmPayment(req.user!.companyId, req.params.id, req.user!.id);
  res.json({ success: true, data: result });
}

export async function getOutstandingBalanceHandler(req: Request, res: Response) {
  const result = await paymentService.getOutstandingBalanceForLease(
    req.user!.companyId,
    req.params.leaseId
  );
  res.json({ success: true, data: result });
}
