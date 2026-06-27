import { ApiResponse, Owner, OwnerResidency, FeeBasis } from "@rmbs/shared";
import { apiClient } from "./client";

export async function fetchOwners(): Promise<Owner[]> {
  const { data } = await apiClient.get<ApiResponse<Owner[]>>("/owners");
  if (!data.success) throw new Error(data.error.message);
  return data.data;
}

export interface CreateOwnerPayload {
  fullName: string;
  idOrPassport: string;
  kraPin?: string;
  phone: string;
  email?: string;
  residency: OwnerResidency;
  bankAccountName?: string;
  bankAccountNumber?: string;
  bankName?: string;
  feeBasis: FeeBasis;
  feeValue: number;
  isVatRegistered: boolean;
}

export async function createOwner(payload: CreateOwnerPayload): Promise<Owner> {
  const { data } = await apiClient.post<ApiResponse<Owner>>("/owners", payload);
  if (!data.success) throw new Error(data.error.message);
  return data.data;
}

export async function updateOwner(
  id: string,
  payload: Partial<CreateOwnerPayload>
): Promise<Owner> {
  const { data } = await apiClient.patch<ApiResponse<Owner>>(`/owners/${id}`, payload);
  if (!data.success) throw new Error(data.error.message);
  return data.data;
}

export async function deleteOwner(id: string): Promise<void> {
  const { data } = await apiClient.delete<ApiResponse<null> | undefined>(`/owners/${id}`);
  // 204 No Content responses have no body, so `data` may be undefined — only
  // treat it as an error if a body came back and it's explicitly success: false.
  if (data && "success" in data && data.success === false) {
    throw new Error(data.error.message);
  }
}
