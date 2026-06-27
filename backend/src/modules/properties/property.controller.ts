import { Request, Response } from "express";
import * as propertyService from "./property.service";

export async function listPropertiesHandler(req: Request, res: Response) {
  const properties = await propertyService.listProperties(req.user!.companyId);
  res.json({ success: true, data: properties });
}

export async function getPropertyHandler(req: Request, res: Response) {
  const property = await propertyService.getPropertyById(
    req.user!.companyId,
    req.params.id
  );
  res.json({ success: true, data: property });
}

export async function createPropertyHandler(req: Request, res: Response) {
  const property = await propertyService.createProperty(req.user!.companyId, req.body);
  res.status(201).json({ success: true, data: property });
}

export async function updatePropertyHandler(req: Request, res: Response) {
  const property = await propertyService.updateProperty(
    req.user!.companyId,
    req.params.id,
    req.body
  );
  res.json({ success: true, data: property });
}

export async function setPropertyOwnersHandler(req: Request, res: Response) {
  const property = await propertyService.setPropertyOwners(
    req.user!.companyId,
    req.params.id,
    req.body
  );
  res.json({ success: true, data: property });
}

export async function deletePropertyHandler(req: Request, res: Response) {
  await propertyService.deleteProperty(req.user!.companyId, req.params.id);
  res.status(204).send();
}
