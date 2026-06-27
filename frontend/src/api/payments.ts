import { ApiResponse, Payment } from "@rmbs/shared";
import { apiClient } from "./client";

export interface PaymentWithRelations extends Payment {
  tenant: { id: string; fullName: string };
  lease: { id: string; unit: { unitNumber: string; property: { name: string } } };
  allocations: { invoiceId: string; amountAllocated: string; invoice: { id: string; invoiceNumber: string } }[];
}

export async function fetchPayments(leaseId?: string): Promise<PaymentWithRelations[]> {
  const { data } = await apiClient.get<ApiResponse<PaymentWithRelations[]>>("/payments", {
    params: leaseId ? { leaseId } : undefined,
  });
  if (!data.success) throw new Error(data.error.message);
  return data.data;
}

export interface CreatePaymentPayload {
  leaseId: string;
  method: string;
  amount: number;
  reference?: string;
  paidAt: string;
}

export interface CreatePaymentResult {
  payment: Payment;
  allocated: number;
  unallocated: number;
}

export async function createPayment(payload: CreatePaymentPayload): Promise<CreatePaymentResult> {
  const { data } = await apiClient.post<ApiResponse<CreatePaymentResult>>("/payments", payload);
  if (!data.success) throw new Error(data.error.message);
  return data.data;
}

export async function confirmPayment(id: string): Promise<CreatePaymentResult> {
  const { data } = await apiClient.post<ApiResponse<CreatePaymentResult>>(`/payments/${id}/confirm`);
  if (!data.success) throw new Error(data.error.message);
  return data.data;
}

export interface OutstandingBalance {
  totalOutstanding: number;
  invoices: {
    id: string;
    invoiceNumber: string;
    totalAmount: string;
    amountPaid: string;
    dueDate: string;
  }[];
}

export async function fetchOutstandingBalance(leaseId: string): Promise<OutstandingBalance> {
  const { data } = await apiClient.get<ApiResponse<OutstandingBalance>>(
    `/leases/${leaseId}/outstanding-balance`
  );
  if (!data.success) throw new Error(data.error.message);
  return data.data;
}
