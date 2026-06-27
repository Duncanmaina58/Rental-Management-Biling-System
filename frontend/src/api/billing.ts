import { ApiResponse, Invoice, InvoiceLineItem } from "@rmbs/shared";
import { apiClient } from "./client";

export interface InvoiceWithRelations extends Invoice {
  lineItems: InvoiceLineItem[];
  lease: {
    id: string;
    primaryTenant: { id: string; fullName: string };
    unit: { id: string; unitNumber: string; property: { name: string } };
  };
}

export async function fetchInvoices(leaseId?: string): Promise<InvoiceWithRelations[]> {
  const { data } = await apiClient.get<ApiResponse<InvoiceWithRelations[]>>("/billing/invoices", {
    params: leaseId ? { leaseId } : undefined,
  });
  if (!data.success) throw new Error(data.error.message);
  return data.data;
}

export interface BulkGeneratePayload {
  periodStart: string;
  periodEnd: string;
  dueDate: string;
  utilityCharges: { leaseId: string; waterAmount?: number; electricityAmount?: number }[];
  leaseIds?: string[];
}

export interface BulkGenerateResult {
  created: number;
  skipped: { leaseId: string; reason: string }[];
}

export async function bulkGenerateInvoices(payload: BulkGeneratePayload): Promise<BulkGenerateResult> {
  const { data } = await apiClient.post<ApiResponse<BulkGenerateResult>>(
    "/billing/invoices/bulk-generate",
    payload
  );
  if (!data.success) throw new Error(data.error.message);
  return data.data;
}
