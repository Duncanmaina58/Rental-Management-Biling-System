import { Request, Response } from "express";
import * as tenantService from "./tenant.service";

export async function listTenantsHandler(req: Request, res: Response) {
  const tenants = await tenantService.listTenants(req.user!.companyId);
  res.json({ success: true, data: tenants });
}

export async function getTenantHandler(req: Request, res: Response) {
  const tenant = await tenantService.getTenantById(req.user!.companyId, req.params.id);
  res.json({ success: true, data: tenant });
}

export async function createTenantHandler(req: Request, res: Response) {
  const tenant = await tenantService.createTenant(req.user!.companyId, req.body);
  res.status(201).json({ success: true, data: tenant });
}

export async function updateTenantHandler(req: Request, res: Response) {
  const tenant = await tenantService.updateTenant(req.user!.companyId, req.params.id, req.body);
  res.json({ success: true, data: tenant });
}

export async function deleteTenantHandler(req: Request, res: Response) {
  await tenantService.deleteTenant(req.user!.companyId, req.params.id);
  res.status(204).send();
}
