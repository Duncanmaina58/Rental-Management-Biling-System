import { prisma } from "../../config/prisma";
import { AppError } from "../../middleware/errorHandler";
import { CreateTenantInput, UpdateTenantInput } from "./tenant.schema";

export async function listTenants(companyId: string) {
  return prisma.tenant.findMany({
    where: { companyId },
    orderBy: { fullName: "asc" },
  });
}

export async function getTenantById(companyId: string, tenantId: string) {
  const tenant = await prisma.tenant.findFirst({
    where: { id: tenantId, companyId },
    include: {
      primaryLeases: { include: { unit: { include: { property: true } } } },
    },
  });
  if (!tenant) throw AppError.notFound("Tenant");
  return tenant;
}

export async function createTenant(companyId: string, input: CreateTenantInput) {
  return prisma.tenant.create({ data: { ...input, companyId } });
}

export async function updateTenant(
  companyId: string,
  tenantId: string,
  input: UpdateTenantInput
) {
  await getTenantById(companyId, tenantId);
  return prisma.tenant.update({ where: { id: tenantId }, data: input });
}

export async function deleteTenant(companyId: string, tenantId: string) {
  const tenant = await getTenantById(companyId, tenantId);
  if (tenant.primaryLeases.length > 0) {
    throw new AppError(
      "Cannot delete a tenant with lease history. Consider blacklisting instead if they're a defaulter.",
      409,
      "TENANT_HAS_LEASES"
    );
  }
  return prisma.tenant.delete({ where: { id: tenantId } });
}
