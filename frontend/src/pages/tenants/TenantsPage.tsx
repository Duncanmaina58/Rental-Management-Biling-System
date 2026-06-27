import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Users, Plus, Building2, User, Pencil, Trash2, ShieldAlert } from "lucide-react";
import { Tenant } from "@rmbs/shared";
import { fetchTenants, deleteTenant } from "../../api/tenants";
import { PageHeader } from "../../components/ui/PageHeader";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { EmptyState } from "../../components/ui/EmptyState";
import { TableSkeleton } from "../../components/ui/TableSkeleton";
import { Modal } from "../../components/ui/Modal";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { RowActionsMenu } from "../../components/ui/RowActionsMenu";
import { ResponsiveTable, ResponsiveColumn } from "../../components/ui/ResponsiveTable";
import { TenantForm } from "./TenantForm";
import { initials } from "../../utils/format";

export function TenantsPage() {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [deletingTenant, setDeletingTenant] = useState<Tenant | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const { data: tenants, isLoading, error } = useQuery({
    queryKey: ["tenants"],
    queryFn: fetchTenants,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteTenant,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenants"] });
      setDeletingTenant(null);
      setDeleteError(null);
    },
    onError: (err) => setDeleteError(err instanceof Error ? err.message : "Failed to delete tenant"),
  });

  const columns: ResponsiveColumn<Tenant>[] = [
    {
      key: "name",
      header: "Tenant",
      isMobileTitle: true,
      cell: (tenant) => (
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-brand-500 flex items-center justify-center text-xs font-semibold text-white shrink-0">
            {initials(tenant.fullName)}
          </div>
          <div>
            <p className="font-medium text-text-primary">{tenant.fullName}</p>
            {tenant.isBlacklisted && (
              <span className="status-pill bg-danger-50 text-danger-600 mt-0.5">
                <ShieldAlert className="h-3 w-3" /> Blacklisted
              </span>
            )}
          </div>
        </div>
      ),
    },
    {
      key: "type",
      header: "Type",
      cell: (tenant) => (
        <span className="inline-flex items-center gap-1.5 text-text-secondary">
          {tenant.isBusinessTenant ? (
            <Building2 className="h-3.5 w-3.5 text-text-tertiary" />
          ) : (
            <User className="h-3.5 w-3.5 text-text-tertiary" />
          )}
          {tenant.isBusinessTenant ? "Business" : "Individual"}
        </span>
      ),
    },
    {
      key: "phone",
      header: "Phone",
      cell: (tenant) => <span className="tabular-nums text-text-secondary">{tenant.phone}</span>,
    },
    {
      key: "email",
      header: "Email",
      cell: (tenant) => <span className="text-text-secondary">{tenant.email || "—"}</span>,
    },
  ];

  return (
    <div className="flex-1 overflow-y-auto">
      <PageHeader
        title="Tenants"
        description="Everyone currently or previously renting a unit in your portfolio."
        actions={
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            Add tenant
          </Button>
        }
      />

      <div className="p-4 sm:p-8">
        <Card className="overflow-hidden">
          {isLoading && <TableSkeleton cols={4} />}

          {error && (
            <div className="px-5 py-4 text-sm text-danger-600">
              Failed to load tenants: {error instanceof Error ? error.message : "Unknown error"}
            </div>
          )}

          {tenants && tenants.length === 0 && (
            <EmptyState
              icon={Users}
              title="No tenants yet"
              description="Add a tenant before creating their lease. Individuals need an ID/passport; businesses need a registration number."
              actionLabel="Add tenant"
              onAction={() => setCreateOpen(true)}
            />
          )}

          {tenants && tenants.length > 0 && (
            <ResponsiveTable
              columns={columns}
              rows={tenants}
              rowKey={(t) => t.id}
              rowActions={(tenant) => (
                <RowActionsMenu
                  items={[
                    {
                      label: "Edit",
                      icon: <Pencil className="h-3.5 w-3.5" />,
                      onClick: () => setEditingTenant(tenant),
                    },
                    {
                      label: "Delete",
                      icon: <Trash2 className="h-3.5 w-3.5" />,
                      danger: true,
                      onClick: () => {
                        setDeleteError(null);
                        setDeletingTenant(tenant);
                      },
                    },
                  ]}
                />
              )}
            />
          )}
        </Card>
      </div>

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Add tenant"
        description="Register a new tenant before attaching them to a lease."
      >
        <TenantForm onSuccess={() => setCreateOpen(false)} />
      </Modal>

      <Modal
        open={!!editingTenant}
        onClose={() => setEditingTenant(null)}
        title="Edit tenant"
        description="Update this tenant's details."
      >
        {editingTenant && (
          <TenantForm tenant={editingTenant} onSuccess={() => setEditingTenant(null)} />
        )}
      </Modal>

      <ConfirmDialog
        open={!!deletingTenant}
        onClose={() => {
          setDeletingTenant(null);
          setDeleteError(null);
        }}
        onConfirm={() => deletingTenant && deleteMutation.mutate(deletingTenant.id)}
        title="Delete tenant"
        description={`Are you sure you want to delete ${deletingTenant?.fullName}? This cannot be undone.`}
        isPending={deleteMutation.isPending}
        errorMessage={deleteError}
      />
    </div>
  );
}
