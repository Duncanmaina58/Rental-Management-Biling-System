import { ApiResponse, Lease, Unit, Tenant, Property } from "@rmbs/shared";
import { apiClient } from "./client";

export interface LeaseWithRelations extends Lease {
  unit: Unit & { property: Pick<Property, "id" | "name" | "camRatePerSqm"> };
  primaryTenant: Pick<Tenant, "id" | "fullName" | "isBusinessTenant">;
}

export async function fetchLeases(): Promise<LeaseWithRelations[]> {
  const { data } = await apiClient.get<ApiResponse<LeaseWithRelations[]>>("/leases");
  if (!data.success) throw new Error(data.error.message);
  return data.data;
}

export async function fetchLease(id: string) {
  const { data } = await apiClient.get<ApiResponse<LeaseWithRelations>>(`/leases/${id}`);
  if (!data.success) throw new Error(data.error.message);
  return data.data;
}

export interface CreateLeasePayload {
  unitId: string;
  primaryTenantId: string;
  startDate: string;
  endDate?: string;
  rentBasis: string;
  rentAmount: number;
  billingCycle: string;
  depositAmount: number;
  escalationPercent?: number;
  escalationFrequencyMonths?: number;
  noticePeriodDays: number;
  additionalTenants: { tenantId: string; liabilitySharePercent?: number }[];
}

export async function createLease(payload: CreateLeasePayload): Promise<Lease> {
  const { data } = await apiClient.post<ApiResponse<Lease>>("/leases", payload);
  if (!data.success) throw new Error(data.error.message);
  return data.data;
}

export async function updateLeaseStatus(id: string, status: string): Promise<Lease> {
  const { data } = await apiClient.patch<ApiResponse<Lease>>(`/leases/${id}`, { status });
  if (!data.success) throw new Error(data.error.message);
  return data.data;
}

// Vacant units across the whole portfolio — used to populate the unit
// picker when creating a lease, since you can only lease a vacant unit.
export async function fetchVacantUnits(): Promise<(Unit & { property: Pick<Property, "id" | "name"> })[]> {
  const { data } = await apiClient.get<ApiResponse<(Unit & { property: Pick<Property, "id" | "name"> })[]>>(
    "/units",
    { params: { status: "VACANT" } }
  );
  if (!data.success) throw new Error(data.error.message);
  return data.data;
}

// Every unit across the portfolio, any status — used by Maintenance's
// "raise a request" picker, since a maintenance issue can be reported
// against an occupied unit just as easily as a vacant one.
export async function fetchAllUnits(): Promise<(Unit & { property: Pick<Property, "id" | "name"> })[]> {
  const { data } = await apiClient.get<ApiResponse<(Unit & { property: Pick<Property, "id" | "name"> })[]>>(
    "/units"
  );
  if (!data.success) throw new Error(data.error.message);
  return data.data;
}
