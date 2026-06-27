import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Building2, Plus, MapPin, ChevronRight, Pencil, Trash2 } from "lucide-react";
import { fetchProperties, deleteProperty, PropertyWithRelations } from "../../api/properties";
import { PageHeader } from "../../components/ui/PageHeader";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { EmptyState } from "../../components/ui/EmptyState";
import { TableSkeleton } from "../../components/ui/TableSkeleton";
import { Modal } from "../../components/ui/Modal";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { RowActionsMenu } from "../../components/ui/RowActionsMenu";
import { CreatePropertyForm } from "./CreatePropertyForm";
import { EditPropertyForm } from "./EditPropertyForm";
import { PROPERTY_TYPE_META } from "./propertyTypeMeta";

export function PropertiesPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState<PropertyWithRelations | null>(null);
  const [deletingProperty, setDeletingProperty] = useState<PropertyWithRelations | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const { data: properties, isLoading, error } = useQuery({
    queryKey: ["properties"],
    queryFn: fetchProperties,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteProperty,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["properties"] });
      setDeletingProperty(null);
      setDeleteError(null);
    },
    onError: (err) =>
      setDeleteError(err instanceof Error ? err.message : "Failed to delete property"),
  });

  return (
    <div className="flex-1 overflow-y-auto">
      <PageHeader
        title="Properties & Units"
        description="Every building in your portfolio, grouped by owner and unit mix."
        actions={
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            Add property
          </Button>
        }
      />

      <div className="p-8">
        <Card className="overflow-hidden">
          {isLoading && <TableSkeleton cols={4} />}

          {error && (
            <div className="px-5 py-4 text-sm text-danger-600">
              Failed to load properties: {error instanceof Error ? error.message : "Unknown error"}
            </div>
          )}

          {properties && properties.length === 0 && (
            <EmptyState
              icon={Building2}
              title="No properties yet"
              description="Add your first property and link it to the owner(s) you manage it for. You can add units once the property exists."
              actionLabel="Add property"
              onAction={() => setCreateOpen(true)}
            />
          )}

          {properties && properties.length > 0 && (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="px-5 py-3 font-medium text-text-secondary text-xs uppercase tracking-wide">Property</th>
                  <th className="px-5 py-3 font-medium text-text-secondary text-xs uppercase tracking-wide">Type</th>
                  <th className="px-5 py-3 font-medium text-text-secondary text-xs uppercase tracking-wide">Owner(s)</th>
                  <th className="px-5 py-3 font-medium text-text-secondary text-xs uppercase tracking-wide">Units</th>
                  <th className="px-5 py-3 w-8" />
                  <th className="px-5 py-3 w-8" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {properties.map((property) => (
                  <tr
                    key={property.id}
                    onClick={() => navigate(`/properties/${property.id}`)}
                    className="hover:bg-surface-sunken transition-colors cursor-pointer"
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-lg bg-surface-sunken flex items-center justify-center shrink-0">
                          <Building2 className="h-4 w-4 text-text-tertiary" strokeWidth={2} />
                        </div>
                        <div>
                          <p className="font-medium text-text-primary">{property.name}</p>
                          <p className="text-xs text-text-tertiary flex items-center gap-1 mt-0.5">
                            <MapPin className="h-3 w-3" /> {property.address}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      {(() => {
                        const meta = PROPERTY_TYPE_META[property.propertyType];
                        return (
                          <span className={`status-pill ${meta.bg} ${meta.text}`}>
                            <meta.icon className="h-3 w-3" />
                            {meta.label}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="px-5 py-3.5 text-text-secondary">
                      {property.ownerLinks.map((link) => link.owner.fullName).join(", ")}
                    </td>
                    <td className="px-5 py-3.5 text-text-secondary tabular-nums">
                      {property._count?.units ?? 0}
                    </td>
                    <td className="px-5 py-3.5" onClick={(e) => e.stopPropagation()}>
                      <RowActionsMenu
                        items={[
                          {
                            label: "Edit",
                            icon: <Pencil className="h-3.5 w-3.5" />,
                            onClick: () => setEditingProperty(property),
                          },
                          {
                            label: "Delete",
                            icon: <Trash2 className="h-3.5 w-3.5" />,
                            danger: true,
                            onClick: () => {
                              setDeleteError(null);
                              setDeletingProperty(property);
                            },
                          },
                        ]}
                      />
                    </td>
                    <td className="px-5 py-3.5">
                      <ChevronRight className="h-4 w-4 text-text-tertiary" />
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
        title="Add property"
        description="Link it to one or more owners with their ownership split."
      >
        <CreatePropertyForm onSuccess={() => setCreateOpen(false)} />
      </Modal>

      <Modal
        open={!!editingProperty}
        onClose={() => setEditingProperty(null)}
        title="Edit property"
        description="Update this property's basic details."
      >
        {editingProperty && (
          <EditPropertyForm property={editingProperty} onSuccess={() => setEditingProperty(null)} />
        )}
      </Modal>

      <ConfirmDialog
        open={!!deletingProperty}
        onClose={() => {
          setDeletingProperty(null);
          setDeleteError(null);
        }}
        onConfirm={() => deletingProperty && deleteMutation.mutate(deletingProperty.id)}
        title="Delete property"
        description={`Are you sure you want to delete ${deletingProperty?.name}? This cannot be undone.`}
        isPending={deleteMutation.isPending}
        errorMessage={deleteError}
      />
    </div>
  );
}
