import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Users, Plus, ShieldCheck, Pencil, Trash2, Globe, MapPin } from "lucide-react";
import { Owner } from "@rmbs/shared";
import { fetchOwners, deleteOwner } from "../../api/owners";
import { PageHeader } from "../../components/ui/PageHeader";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { EmptyState } from "../../components/ui/EmptyState";
import { TableSkeleton } from "../../components/ui/TableSkeleton";
import { Modal } from "../../components/ui/Modal";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { RowActionsMenu } from "../../components/ui/RowActionsMenu";
import { OwnerForm } from "./OwnerForm";
import { initials } from "../../utils/format";

const FEE_BASIS_LABELS: Record<string, string> = {
  FLAT_FEE: "Flat fee",
  PERCENT_OF_BILLED: "% of billed rent",
  PERCENT_OF_COLLECTED: "% of collected rent",
};

// Deterministic per-owner avatar tint so the table doesn't read as a wall
// of identical gray circles — a small touch, but it's the difference
// between a list of records and a list of people.
const AVATAR_TINTS = [
  "bg-brand-500",
  "bg-positive-600",
  "bg-warning-500",
  "bg-danger-500",
];
function avatarTint(id: string) {
  const hash = id.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return AVATAR_TINTS[hash % AVATAR_TINTS.length];
}

export function OwnersPage() {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [editingOwner, setEditingOwner] = useState<Owner | null>(null);
  const [deletingOwner, setDeletingOwner] = useState<Owner | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const { data: owners, isLoading, error } = useQuery({
    queryKey: ["owners"],
    queryFn: fetchOwners,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteOwner,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["owners"] });
      setDeletingOwner(null);
      setDeleteError(null);
    },
    onError: (err) =>
      setDeleteError(err instanceof Error ? err.message : "Failed to delete owner"),
  });

  return (
    <div className="flex-1 overflow-y-auto">
      <PageHeader
        title="Owners"
        description="Landlords whose properties you manage on commission or fixed fee."
        actions={
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            Add owner
          </Button>
        }
      />

      <div className="p-8">
        <Card className="overflow-hidden">
          {isLoading && <TableSkeleton cols={5} />}

          {error && (
            <div className="px-5 py-4 text-sm text-danger-600">
              Failed to load owners: {error instanceof Error ? error.message : "Unknown error"}
            </div>
          )}

          {owners && owners.length === 0 && (
            <EmptyState
              icon={Users}
              title="No owners yet"
              description="Add the first landlord whose properties you'll manage. You'll link their properties and set their management fee in the next step."
              actionLabel="Add owner"
              onAction={() => setCreateOpen(true)}
            />
          )}

          {owners && owners.length > 0 && (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="px-5 py-3 font-medium text-text-secondary text-xs uppercase tracking-wide">Owner</th>
                  <th className="px-5 py-3 font-medium text-text-secondary text-xs uppercase tracking-wide">Phone</th>
                  <th className="px-5 py-3 font-medium text-text-secondary text-xs uppercase tracking-wide">Residency</th>
                  <th className="px-5 py-3 font-medium text-text-secondary text-xs uppercase tracking-wide">Management fee</th>
                  <th className="px-5 py-3 font-medium text-text-secondary text-xs uppercase tracking-wide">VAT</th>
                  <th className="px-5 py-3 w-8" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {owners.map((owner) => (
                  <tr key={owner.id} className="hover:bg-surface-sunken transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className={`h-9 w-9 rounded-full ${avatarTint(owner.id)} flex items-center justify-center text-xs font-semibold text-white shrink-0`}>
                          {initials(owner.fullName)}
                        </div>
                        <div>
                          <p className="font-medium text-text-primary">{owner.fullName}</p>
                          {owner.kraPin && (
                            <p className="text-xs text-text-tertiary">{owner.kraPin}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-text-secondary tabular-nums">{owner.phone}</td>
                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center gap-1.5 text-text-secondary">
                        {owner.residency === "RESIDENT" ? (
                          <MapPin className="h-3.5 w-3.5 text-text-tertiary" />
                        ) : (
                          <Globe className="h-3.5 w-3.5 text-text-tertiary" />
                        )}
                        {owner.residency === "RESIDENT" ? "Resident" : "Non-resident"}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-text-secondary">
                      {FEE_BASIS_LABELS[owner.feeBasis]}{" "}
                      <span className="tabular-nums font-semibold text-text-primary">
                        {owner.feeBasis === "FLAT_FEE"
                          ? `KES ${owner.feeValue}`
                          : `${owner.feeValue}%`}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      {owner.isVatRegistered ? (
                        <span className="status-pill bg-positive-50 text-positive-700">
                          <ShieldCheck className="h-3 w-3" /> Registered
                        </span>
                      ) : (
                        <span className="status-pill bg-neutral-chip-bg text-neutral-chip-text">
                          Not registered
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <RowActionsMenu
                        items={[
                          {
                            label: "Edit",
                            icon: <Pencil className="h-3.5 w-3.5" />,
                            onClick: () => setEditingOwner(owner),
                          },
                          {
                            label: "Delete",
                            icon: <Trash2 className="h-3.5 w-3.5" />,
                            danger: true,
                            onClick: () => {
                              setDeleteError(null);
                              setDeletingOwner(owner);
                            },
                          },
                        ]}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Add owner"
        description="Register a landlord and their management fee terms."
      >
        <OwnerForm onSuccess={() => setCreateOpen(false)} />
      </Modal>

      <Modal
        open={!!editingOwner}
        onClose={() => setEditingOwner(null)}
        title="Edit owner"
        description="Update this landlord's details and fee terms."
      >
        {editingOwner && (
          <OwnerForm owner={editingOwner} onSuccess={() => setEditingOwner(null)} />
        )}
      </Modal>

      <ConfirmDialog
        open={!!deletingOwner}
        onClose={() => {
          setDeletingOwner(null);
          setDeleteError(null);
        }}
        onConfirm={() => deletingOwner && deleteMutation.mutate(deletingOwner.id)}
        title="Delete owner"
        description={`Are you sure you want to delete ${deletingOwner?.fullName}? This cannot be undone.`}
        isPending={deleteMutation.isPending}
        errorMessage={deleteError}
      />
    </div>
  );
}
