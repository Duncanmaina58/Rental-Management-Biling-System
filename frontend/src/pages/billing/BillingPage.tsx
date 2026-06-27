import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FileText, Plus, Building2 } from "lucide-react";
import { fetchInvoices, InvoiceWithRelations } from "../../api/billing";
import { PageHeader } from "../../components/ui/PageHeader";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { EmptyState } from "../../components/ui/EmptyState";
import { TableSkeleton } from "../../components/ui/TableSkeleton";
import { Modal } from "../../components/ui/Modal";
import { StatusPill } from "../../components/ui/StatusPill";
import { ResponsiveTable, ResponsiveColumn } from "../../components/ui/ResponsiveTable";
import { BulkGenerateInvoicesForm } from "./BulkGenerateInvoicesForm";
import { formatCurrency, formatDate } from "../../utils/format";

export function BillingPage() {
  const [generateOpen, setGenerateOpen] = useState(false);

  const { data: invoices, isLoading, error } = useQuery({
    queryKey: ["invoices"],
    queryFn: () => fetchInvoices(),
  });

  const columns: ResponsiveColumn<InvoiceWithRelations>[] = [
    {
      key: "invoice",
      header: "Invoice",
      isMobileTitle: true,
      cell: (inv) => (
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-surface-sunken flex items-center justify-center shrink-0">
            <FileText className="h-4 w-4 text-text-tertiary" strokeWidth={2} />
          </div>
          <div>
            <p className="font-medium text-text-primary">{inv.invoiceNumber}</p>
            <p className="text-xs text-text-tertiary flex items-center gap-1">
              <Building2 className="h-3 w-3" /> {inv.lease.unit.property.name} — {inv.lease.unit.unitNumber}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: "tenant",
      header: "Tenant",
      cell: (inv) => <span className="text-text-secondary">{inv.lease.primaryTenant.fullName}</span>,
    },
    {
      key: "period",
      header: "Period",
      cell: (inv) => (
        <span className="text-text-secondary text-xs">
          {formatDate(inv.periodStart)} – {formatDate(inv.periodEnd)}
        </span>
      ),
    },
    {
      key: "amount",
      header: "Amount",
      cell: (inv) => (
        <span className="tabular-nums font-medium text-text-primary">
          {formatCurrency(inv.totalAmount)}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (inv) => <StatusPill status={inv.status} />,
    },
  ];

  return (
    <div className="flex-1 overflow-y-auto">
      <PageHeader
        title="Billing"
        description="Rent, utility, and CAM invoices issued across your portfolio."
        actions={
          <Button size="sm" onClick={() => setGenerateOpen(true)}>
            <Plus className="h-4 w-4" />
            Generate invoices
          </Button>
        }
      />

      <div className="p-4 sm:p-8">
        <Card className="overflow-hidden">
          {isLoading && <TableSkeleton cols={5} />}

          {error && (
            <div className="px-5 py-4 text-sm text-danger-600">
              Failed to load invoices: {error instanceof Error ? error.message : "Unknown error"}
            </div>
          )}

          {invoices && invoices.length === 0 && (
            <EmptyState
              icon={FileText}
              title="No invoices yet"
              description="Generate invoices for a billing period across all active leases — rent is calculated automatically, with optional utility and CAM charges added per unit."
              actionLabel="Generate invoices"
              onAction={() => setGenerateOpen(true)}
            />
          )}

          {invoices && invoices.length > 0 && (
            <ResponsiveTable columns={columns} rows={invoices} rowKey={(i) => i.id} />
          )}
        </Card>
      </div>

      <Modal
        open={generateOpen}
        onClose={() => setGenerateOpen(false)}
        title="Generate invoices"
        description="Bill rent for a period across all active leases."
      >
        <BulkGenerateInvoicesForm onSuccess={() => setGenerateOpen(false)} />
      </Modal>
    </div>
  );
}
