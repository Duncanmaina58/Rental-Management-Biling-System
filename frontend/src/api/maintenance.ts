import { ApiResponse, MaintenanceRequest } from "@rmbs/shared";
import { apiClient } from "./client";

export interface MaintenanceRequestWithRelations extends MaintenanceRequest {
  unit: { id: string; unitNumber: string; property: { id: string; name: string } };
  raisedByTenant?: { id: string; fullName: string };
  assignedTo?: { id: string; fullName: string };
}

export async function fetchMaintenanceRequests(status?: string): Promise<MaintenanceRequestWithRelations[]> {
  const { data } = await apiClient.get<ApiResponse<MaintenanceRequestWithRelations[]>>(
    "/maintenance-requests",
    { params: status ? { status } : undefined }
  );
  if (!data.success) throw new Error(data.error.message);
  return data.data;
}

export interface CreateMaintenanceRequestPayload {
  unitId: string;
  title: string;
  description: string;
  photoUrls: string[];
  raisedByTenantId?: string;
}

export async function createMaintenanceRequest(
  payload: CreateMaintenanceRequestPayload
): Promise<MaintenanceRequest> {
  const { data } = await apiClient.post<ApiResponse<MaintenanceRequest>>(
    "/maintenance-requests",
    payload
  );
  if (!data.success) throw new Error(data.error.message);
  return data.data;
}

export async function updateMaintenanceRequest(
  id: string,
  payload: { status?: string; assignedVendorName?: string }
): Promise<MaintenanceRequest> {
  const { data } = await apiClient.patch<ApiResponse<MaintenanceRequest>>(
    `/maintenance-requests/${id}`,
    payload
  );
  if (!data.success) throw new Error(data.error.message);
  return data.data;
}

export async function recordMaintenanceCost(id: string, cost: number): Promise<MaintenanceRequest> {
  const { data } = await apiClient.post<ApiResponse<MaintenanceRequest>>(
    `/maintenance-requests/${id}/cost`,
    { cost }
  );
  if (!data.success) throw new Error(data.error.message);
  return data.data;
}
