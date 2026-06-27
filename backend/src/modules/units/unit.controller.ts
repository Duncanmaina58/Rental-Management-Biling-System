import { Request, Response } from "express";
import { UnitStatus } from "@rmbs/shared";
import * as unitService from "./unit.service";

export async function listUnitsByPropertyHandler(req: Request, res: Response) {
  const units = await unitService.listUnitsByProperty(
    req.user!.companyId,
    req.params.propertyId
  );
  res.json({ success: true, data: units });
}

export async function listAllUnitsHandler(req: Request, res: Response) {
  const status = req.query.status as UnitStatus | undefined;
  const units = await unitService.listAllUnits(req.user!.companyId, status);
  res.json({ success: true, data: units });
}

export async function getUnitHandler(req: Request, res: Response) {
  const unit = await unitService.getUnitById(req.user!.companyId, req.params.id);
  res.json({ success: true, data: unit });
}

export async function createUnitHandler(req: Request, res: Response) {
  const unit = await unitService.createUnit(req.user!.companyId, req.body);
  res.status(201).json({ success: true, data: unit });
}

export async function updateUnitHandler(req: Request, res: Response) {
  const unit = await unitService.updateUnit(req.user!.companyId, req.params.id, req.body);
  res.json({ success: true, data: unit });
}

export async function deleteUnitHandler(req: Request, res: Response) {
  await unitService.deleteUnit(req.user!.companyId, req.params.id);
  res.status(204).send();
}
