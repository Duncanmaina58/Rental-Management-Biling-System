import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FileText, Plus, Building2, User } from "lucide-react";
import { fetchLeases, LeaseWithRelations } from "../../api/leases";
import { PageHeader } from "../../components/ui/PageHeader";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { EmptyState } from "../../components/ui/EmptyState";
import { TableSkeleton } from "../../components/ui/TableSkeleton";
import { Modal } from "../../components/ui/Modal";
import { StatusPill } from "../../components/ui/StatusPill";
import { ResponsiveTable, ResponsiveColumn } from "../../components/ui/ResponsiveTable";
import { CreateLeaseForm } from "./CreateLeaseForm";
import { formatCurrency, formatDate } from "../../utils/format";

const RENT_BASIS_LABELS: Record<string, string> = {
  FLAT_MONTHLY: "/mo",
  PER_SQM: "/sqm/mo",
  PER_SQFT: "/sqft/mo",
  PERCENT_OF_TURNOVER: "% turnover",
};

export function LeasesPage() {
  const [createOpen, setCreateOpen] = useState(false);

  const { data: leases, isLoading, error } = useQuery({
    queryKey: ["leases"],
    queryFn: fetchLeases,
  });

  const columns: ResponsiveColumn<LeaseWithRelations>[] = [
    {
      key: "unit",
      header: "Unit",
      isMobileTitle: true,
      cell: (lease) => (
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-surface-sunken flex items-center justify-center shrink-0">
            <Building2 className="h-4 w-4 text-text-tertiary" strokeWidth={2} />
          </div>
          <div>
            <p className="font-medium text-text-primary">{lease.unit.property.name}</p>
            <p className="text-xs text-text-tertiary">{lease.unit.unitNumber}</p>
          </div>
        </div>
      ),
    },
    {
      key: "tenant",
      header: "Tenant",
      cell: (lease) => (
        <span className="inline-flex items-center gap-1.5 text-text-secondary">
          <User className="h-3.5 w-3.5 text-text-tertiary" />
          {lease.primaryTenant.fullName}
        </span>
      ),
    },
    {
      key: "rent",
      header: "Rent",
      cell: (lease) => (
        <span className="tabular-nums font-medium text-text-primary">
          {formatCurrency(lease.rentAmount)}
          <span className="text-text-tertiary font-normal">
            {RENT_BASIS_LABELS[lease.rentBasis] ?? ""}
          </span>
        </span>
      ),
    },
    {
      key: "start",
      header: "Start date",
      cell: (lease) => <span className="text-text-secondary">{formatDate(lease.startDate)}</span>,
    },
    {
      key: "status",
      header: "Status",
      cell: (lease) => <StatusPill status={lease.status} />,
    },
  ];

  return (
    <div className="flex-1 overflow-y-auto">
      <PageHeader
        title="Leases"
        description="Active and past tenancy agreements across your portfolio."
        actions={
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            Create lease
          </Button>
        }
      />

      <div className="p-4 sm:p-8">
        <Card className="overflow-hidden">
          {isLoading && <TableSkeleton cols={5} />}

          {error && (
            <div className="px-5 py-4 text-sm text-danger-600">
              Failed to load leases: {error instanceof Error ? error.message : "Unknown error"}
            </div>
          )}

          {leases && leases.length === 0 && (
            <EmptyState
              icon={FileText}
              title="No leases yet"
              description="Create a lease to attach a tenant to a vacant unit and start billing rent. You'll need at least one tenant and one vacant unit first."
              actionLabel="Create lease"
              onAction={() => setCreateOpen(true)}
            />
          )}

          {leases && leases.length > 0 && (
            <ResponsiveTable columns={columns} rows={leases} rowKey={(l) => l.id} />
          )}
        </Card>
      </div>

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Create lease"
        description="Attach a tenant to a vacant unit and set the rent terms."
      >
        <CreateLeaseForm onSuccess={() => setCreateOpen(false)} />
      </Modal>
    </div>
  );
}
