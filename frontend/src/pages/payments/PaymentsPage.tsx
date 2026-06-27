import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Wallet, Plus, Building2, CheckCircle2 } from "lucide-react";
import { fetchPayments, confirmPayment, PaymentWithRelations } from "../../api/payments";
import { PageHeader } from "../../components/ui/PageHeader";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { EmptyState } from "../../components/ui/EmptyState";
import { TableSkeleton } from "../../components/ui/TableSkeleton";
import { Modal } from "../../components/ui/Modal";
import { StatusPill } from "../../components/ui/StatusPill";
import { ResponsiveTable, ResponsiveColumn } from "../../components/ui/ResponsiveTable";
import { RecordPaymentForm } from "./RecordPaymentForm";
import { formatCurrency, formatDate } from "../../utils/format";

const METHOD_LABELS: Record<string, string> = {
  MPESA: "M-Pesa",
  BANK_TRANSFER: "Bank transfer",
  CASH: "Cash",
  CARD: "Card",
  CHEQUE: "Cheque",
};

export function PaymentsPage() {
  const queryClient = useQueryClient();
  const [recordOpen, setRecordOpen] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  const { data: payments, isLoading, error } = useQuery({
    queryKey: ["payments"],
    queryFn: () => fetchPayments(),
  });

  const confirmMutation = useMutation({
    mutationFn: confirmPayment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      setConfirmError(null);
    },
    onError: (err) => setConfirmError(err instanceof Error ? err.message : "Failed to confirm payment"),
  });

  const columns: ResponsiveColumn<PaymentWithRelations>[] = [
    {
      key: "tenant",
      header: "Tenant",
      isMobileTitle: true,
      cell: (p) => (
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-surface-sunken flex items-center justify-center shrink-0">
            <Wallet className="h-4 w-4 text-text-tertiary" strokeWidth={2} />
          </div>
          <div>
            <p className="font-medium text-text-primary">{p.tenant.fullName}</p>
            <p className="text-xs text-text-tertiary flex items-center gap-1">
              <Building2 className="h-3 w-3" /> {p.lease.unit.property.name} — {p.lease.unit.unitNumber}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: "method",
      header: "Method",
      cell: (p) => (
        <span className="text-text-secondary">
          {METHOD_LABELS[p.method]}
          {p.reference && <span className="text-text-tertiary"> · {p.reference}</span>}
        </span>
      ),
    },
    {
      key: "amount",
      header: "Amount",
      cell: (p) => <span className="tabular-nums font-medium text-text-primary">{formatCurrency(p.amount)}</span>,
    },
    {
      key: "date",
      header: "Date",
      cell: (p) => <span className="text-text-secondary">{formatDate(p.paidAt)}</span>,
    },
    {
      key: "status",
      header: "Status",
      cell: (p) => <StatusPill status={p.status} />,
    },
  ];

  return (
    <div className="flex-1 overflow-y-auto">
      <PageHeader
        title="Payments"
        description="Rent and charges collected from tenants, matched against their invoices."
        actions={
          <Button size="sm" onClick={() => setRecordOpen(true)}>
            <Plus className="h-4 w-4" />
            Record payment
          </Button>
        }
      />

      <div className="p-4 sm:p-8">
        {confirmError && (
          <div className="mb-4 bg-danger-50 text-danger-600 text-sm rounded-lg px-3.5 py-2.5">
            {confirmError}
          </div>
        )}

        <Card className="overflow-hidden">
          {isLoading && <TableSkeleton cols={5} />}

          {error && (
            <div className="px-5 py-4 text-sm text-danger-600">
              Failed to load payments: {error instanceof Error ? error.message : "Unknown error"}
            </div>
          )}

          {payments && payments.length === 0 && (
            <EmptyState
              icon={Wallet}
              title="No payments recorded yet"
              description="Record a payment against a lease — it's automatically matched against that tenant's oldest outstanding invoice first."
              actionLabel="Record payment"
              onAction={() => setRecordOpen(true)}
            />
          )}

          {payments && payments.length > 0 && (
            <ResponsiveTable
              columns={columns}
              rows={payments}
              rowKey={(p) => p.id}
              rowActions={(p) =>
                p.status === "PENDING" ? (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => confirmMutation.mutate(p.id)}
                    disabled={confirmMutation.isPending}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Confirm
                  </Button>
                ) : null
              }
            />
          )}
        </Card>
      </div>

      <Modal
        open={recordOpen}
        onClose={() => setRecordOpen(false)}
        title="Record payment"
        description="Log a payment received from a tenant."
      >
        <RecordPaymentForm onSuccess={() => setRecordOpen(false)} />
      </Modal>
    </div>
  );
}
