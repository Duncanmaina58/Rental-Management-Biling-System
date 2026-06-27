import { Request, Response } from "express";
import * as disbursementService from "./disbursement.service";

export async function previewDisbursementHandler(req: Request, res: Response) {
  const { ownerId, periodStart, periodEnd } = req.body;
  const result = await disbursementService.previewDisbursement(
    req.user!.companyId,
    ownerId,
    periodStart,
    periodEnd
  );
  res.json({ success: true, data: result });
}

export async function createDisbursementHandler(req: Request, res: Response) {
  const { ownerId, periodStart, periodEnd } = req.body;
  const disbursement = await disbursementService.createDisbursement(
    req.user!.companyId,
    ownerId,
    periodStart,
    periodEnd
  );
  res.status(201).json({ success: true, data: disbursement });
}

export async function approveDisbursementHandler(req: Request, res: Response) {
  const { payoutReference } = req.body;
  const disbursement = await disbursementService.approveDisbursement(
    req.user!.companyId,
    req.params.id,
    req.user!.id,
    payoutReference
  );
  res.json({ success: true, data: disbursement });
}

export async function holdDisbursementHandler(req: Request, res: Response) {
  const disbursement = await disbursementService.holdDisbursement(req.user!.companyId, req.params.id);
  res.json({ success: true, data: disbursement });
}

export async function listDisbursementsHandler(req: Request, res: Response) {
  const ownerId = req.query.ownerId as string | undefined;
  const disbursements = await disbursementService.listDisbursements(req.user!.companyId, ownerId);
  res.json({ success: true, data: disbursements });
}

export async function getDisbursementHandler(req: Request, res: Response) {
  const disbursement = await disbursementService.getDisbursementById(
    req.user!.companyId,
    req.params.id
  );
  res.json({ success: true, data: disbursement });
}
