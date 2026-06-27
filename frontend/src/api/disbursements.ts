import { ApiResponse, Disbursement } from "@rmbs/shared";
import { apiClient } from "./client";

export interface DisbursementWithOwner extends Disbursement {
  owner: { id: string; fullName: string };
}

export async function fetchDisbursements(ownerId?: string): Promise<DisbursementWithOwner[]> {
  const { data } = await apiClient.get<ApiResponse<DisbursementWithOwner[]>>("/disbursements", {
    params: ownerId ? { ownerId } : undefined,
  });
  if (!data.success) throw new Error(data.error.message);
  return data.data;
}

export interface DisbursementPreview {
  grossRentCollected: number;
  managementFee: number;
  withholdingTaxDeducted: number;
  expensesDeducted: number;
  netPayable: number;
  trustTransactionIds: string[];
}

export interface DisbursementPeriodPayload {
  ownerId: string;
  periodStart: string;
  periodEnd: string;
}

export async function previewDisbursement(payload: DisbursementPeriodPayload): Promise<DisbursementPreview> {
  const { data } = await apiClient.post<ApiResponse<DisbursementPreview>>(
    "/disbursements/preview",
    payload
  );
  if (!data.success) throw new Error(data.error.message);
  return data.data;
}

export async function createDisbursement(payload: DisbursementPeriodPayload): Promise<Disbursement> {
  const { data } = await apiClient.post<ApiResponse<Disbursement>>("/disbursements", payload);
  if (!data.success) throw new Error(data.error.message);
  return data.data;
}

export async function approveDisbursement(id: string, payoutReference?: string): Promise<Disbursement> {
  const { data } = await apiClient.post<ApiResponse<Disbursement>>(`/disbursements/${id}/approve`, {
    payoutReference,
  });
  if (!data.success) throw new Error(data.error.message);
  return data.data;
}

export async function holdDisbursement(id: string): Promise<Disbursement> {
  const { data } = await apiClient.post<ApiResponse<Disbursement>>(`/disbursements/${id}/hold`);
  if (!data.success) throw new Error(data.error.message);
  return data.data;
}
