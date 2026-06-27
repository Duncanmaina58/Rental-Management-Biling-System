import { Request, Response } from "express";
import * as ownerService from "./owner.service";

export async function listOwnersHandler(req: Request, res: Response) {
  const owners = await ownerService.listOwners(req.user!.companyId);
  res.json({ success: true, data: owners });
}

export async function getOwnerHandler(req: Request, res: Response) {
  const owner = await ownerService.getOwnerById(req.user!.companyId, req.params.id);
  res.json({ success: true, data: owner });
}

export async function createOwnerHandler(req: Request, res: Response) {
  const owner = await ownerService.createOwner(req.user!.companyId, req.body);
  res.status(201).json({ success: true, data: owner });
}

export async function updateOwnerHandler(req: Request, res: Response) {
  const owner = await ownerService.updateOwner(
    req.user!.companyId,
    req.params.id,
    req.body
  );
  res.json({ success: true, data: owner });
}

export async function deleteOwnerHandler(req: Request, res: Response) {
  await ownerService.deleteOwner(req.user!.companyId, req.params.id);
  res.status(204).send();
}
