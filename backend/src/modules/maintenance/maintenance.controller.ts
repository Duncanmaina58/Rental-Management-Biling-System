import { Request, Response } from "express";
import { MaintenanceStatus } from "@rmbs/shared";
import * as maintenanceService from "./maintenance.service";

export async function listMaintenanceRequestsHandler(req: Request, res: Response) {
  const status = req.query.status as MaintenanceStatus | undefined;
  const requests = await maintenanceService.listMaintenanceRequests(req.user!.companyId, status);
  res.json({ success: true, data: requests });
}

export async function getMaintenanceRequestHandler(req: Request, res: Response) {
  const request = await maintenanceService.getMaintenanceRequestById(
    req.user!.companyId,
    req.params.id
  );
  res.json({ success: true, data: request });
}

export async function createMaintenanceRequestHandler(req: Request, res: Response) {
  const request = await maintenanceService.createMaintenanceRequest(
    req.user!.companyId,
    req.user!.id,
    req.body
  );
  res.status(201).json({ success: true, data: request });
}

export async function updateMaintenanceRequestHandler(req: Request, res: Response) {
  const request = await maintenanceService.updateMaintenanceRequest(
    req.user!.companyId,
    req.params.id,
    req.body
  );
  res.json({ success: true, data: request });
}

export async function recordMaintenanceCostHandler(req: Request, res: Response) {
  const request = await maintenanceService.recordMaintenanceCost(
    req.user!.companyId,
    req.params.id,
    req.body.cost,
    req.user!.id
  );
  res.json({ success: true, data: request });
}
