import { ApiResponse, Tenant } from "@rmbs/shared";
import { apiClient } from "./client";

export async function fetchTenants(): Promise<Tenant[]> {
  const { data } = await apiClient.get<ApiResponse<Tenant[]>>("/tenants");
  if (!data.success) throw new Error(data.error.message);
  return data.data;
}

export async function fetchTenant(id: string): Promise<Tenant> {
  const { data } = await apiClient.get<ApiResponse<Tenant>>(`/tenants/${id}`);
  if (!data.success) throw new Error(data.error.message);
  return data.data;
}

export interface CreateTenantPayload {
  fullName: string;
  isBusinessTenant: boolean;
  idOrPassport?: string;
  kraPin?: string;
  businessRegistrationNumber?: string;
  phone: string;
  email?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
}

export async function createTenant(payload: CreateTenantPayload): Promise<Tenant> {
  const { data } = await apiClient.post<ApiResponse<Tenant>>("/tenants", payload);
  if (!data.success) throw new Error(data.error.message);
  return data.data;
}

export async function updateTenant(
  id: string,
  payload: Partial<CreateTenantPayload> & { isBlacklisted?: boolean }
): Promise<Tenant> {
  const { data } = await apiClient.patch<ApiResponse<Tenant>>(`/tenants/${id}`, payload);
  if (!data.success) throw new Error(data.error.message);
  return data.data;
}

export async function deleteTenant(id: string): Promise<void> {
  const { data } = await apiClient.delete<ApiResponse<null> | undefined>(`/tenants/${id}`);
  if (data && "success" in data && data.success === false) {
    throw new Error(data.error.message);
  }
}
