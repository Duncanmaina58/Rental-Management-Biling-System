import { Request, Response } from "express";
import * as billingService from "./billing.service";

export async function listInvoicesHandler(req: Request, res: Response) {
  const leaseId = req.query.leaseId as string | undefined;
  const invoices = await billingService.listInvoices(req.user!.companyId, leaseId);
  res.json({ success: true, data: invoices });
}

export async function getInvoiceHandler(req: Request, res: Response) {
  const invoice = await billingService.getInvoiceById(req.user!.companyId, req.params.id);
  res.json({ success: true, data: invoice });
}

export async function createSingleInvoiceHandler(req: Request, res: Response) {
  const invoice = await billingService.generateSingleInvoice(req.user!.companyId, req.body);
  res.status(201).json({ success: true, data: invoice });
}

export async function bulkGenerateInvoicesHandler(req: Request, res: Response) {
  const result = await billingService.bulkGenerateInvoices(req.user!.companyId, req.body);
  res.status(201).json({ success: true, data: result });
}
