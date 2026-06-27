import { Request, Response } from "express";
import * as leaseService from "./lease.service";

export async function listLeasesHandler(req: Request, res: Response) {
  const leases = await leaseService.listLeases(req.user!.companyId);
  res.json({ success: true, data: leases });
}

export async function getLeaseHandler(req: Request, res: Response) {
  const lease = await leaseService.getLeaseById(req.user!.companyId, req.params.id);
  res.json({ success: true, data: lease });
}

export async function createLeaseHandler(req: Request, res: Response) {
  const lease = await leaseService.createLease(req.user!.companyId, req.body);
  res.status(201).json({ success: true, data: lease });
}

export async function updateLeaseHandler(req: Request, res: Response) {
  const lease = await leaseService.updateLease(req.user!.companyId, req.params.id, req.body);
  res.json({ success: true, data: lease });
}
