import { ApiResponse, Property, Owner, Unit } from "@rmbs/shared";
import { apiClient } from "./client";

export interface PropertyWithRelations extends Property {
  ownerLinks: { ownerId: string; ownershipPercent: string; owner: Pick<Owner, "id" | "fullName"> }[];
  _count?: { units: number };
  units?: Unit[];
}

export async function fetchProperties(): Promise<PropertyWithRelations[]> {
  const { data } = await apiClient.get<ApiResponse<PropertyWithRelations[]>>("/properties");
  if (!data.success) throw new Error(data.error.message);
  return data.data;
}

export async function fetchProperty(id: string): Promise<PropertyWithRelations> {
  const { data } = await apiClient.get<ApiResponse<PropertyWithRelations>>(`/properties/${id}`);
  if (!data.success) throw new Error(data.error.message);
  return data.data;
}

export interface CreatePropertyPayload {
  name: string;
  address: string;
  propertyType: string;
  camRatePerSqm?: number;
  owners: { ownerId: string; ownershipPercent: number }[];
}

export async function createProperty(payload: CreatePropertyPayload) {
  const { data } = await apiClient.post<ApiResponse<PropertyWithRelations>>("/properties", payload);
  if (!data.success) throw new Error(data.error.message);
  return data.data;
}

export interface UpdatePropertyPayload {
  name?: string;
  address?: string;
  propertyType?: string;
  camRatePerSqm?: number;
}

export async function updateProperty(
  id: string,
  payload: UpdatePropertyPayload
): Promise<PropertyWithRelations> {
  const { data } = await apiClient.patch<ApiResponse<PropertyWithRelations>>(
    `/properties/${id}`,
    payload
  );
  if (!data.success) throw new Error(data.error.message);
  return data.data;
}

export async function deleteProperty(id: string): Promise<void> {
  const { data } = await apiClient.delete<ApiResponse<null> | undefined>(`/properties/${id}`);
  if (data && "success" in data && data.success === false) {
    throw new Error(data.error.message);
  }
}

export async function fetchUnitsByProperty(propertyId: string): Promise<Unit[]> {
  const { data } = await apiClient.get<ApiResponse<Unit[]>>(`/properties/${propertyId}/units`);
  if (!data.success) throw new Error(data.error.message);
  return data.data;
}

export interface CreateUnitPayload {
  propertyId: string;
  unitNumber: string;
  floor?: string;
  sizeSqm?: number;
  unitType: string;
  classification: string;
  bedrooms?: number;
  hasParking: boolean;
  meterNumberWater?: string;
  meterNumberElectricity?: string;
}

export async function createUnit(payload: CreateUnitPayload): Promise<Unit> {
  const { data } = await apiClient.post<ApiResponse<Unit>>("/units", payload);
  if (!data.success) throw new Error(data.error.message);
  return data.data;
}
