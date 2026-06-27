import { ApiResponse, TrustTransaction } from "@rmbs/shared";
import { apiClient } from "./client";

export interface TrustTransactionWithRelations extends TrustTransaction {
  owner?: { id: string; fullName: string };
  tenant?: { id: string; fullName: string };
  lease?: { id: string; unit: { unitNumber: string; property: { name: string } } };
  postedBy: { id: string; fullName: string };
}

export async function fetchTrustTransactions(ownerId?: string): Promise<TrustTransactionWithRelations[]> {
  const { data } = await apiClient.get<ApiResponse<TrustTransactionWithRelations[]>>(
    "/trust/transactions",
    { params: ownerId ? { ownerId } : undefined }
  );
  if (!data.success) throw new Error(data.error.message);
  return data.data;
}

export interface TrustBalance {
  ownerId: string;
  ownerName: string;
  trustBalance: number;
}

export async function fetchTrustBalances(): Promise<TrustBalance[]> {
  const { data } = await apiClient.get<ApiResponse<TrustBalance[]>>("/trust/balances");
  if (!data.success) throw new Error(data.error.message);
  return data.data;
}

export async function reverseTrustTransaction(id: string, reason: string): Promise<TrustTransaction> {
  const { data } = await apiClient.post<ApiResponse<TrustTransaction>>(
    `/trust/transactions/${id}/reverse`,
    { reason }
  );
  if (!data.success) throw new Error(data.error.message);
  return data.data;
}
