import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, MapPin, Plus, LayoutGrid, Droplet, Zap, Car, Users } from "lucide-react";
import { fetchProperty, fetchUnitsByProperty } from "../../api/properties";
import { PageHeader } from "../../components/ui/PageHeader";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { EmptyState } from "../../components/ui/EmptyState";
import { TableSkeleton } from "../../components/ui/TableSkeleton";
import { Modal } from "../../components/ui/Modal";
import { StatusPill } from "../../components/ui/StatusPill";
import { CreateUnitForm } from "./CreateUnitForm";
import { PROPERTY_TYPE_META } from "./propertyTypeMeta";
import { UNIT_TYPE_METADATA, UnitType } from "@rmbs/shared";

export function PropertyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [createUnitOpen, setCreateUnitOpen] = useState(false);

  const propertyId = id!;

  const { data: property, isLoading: propertyLoading } = useQuery({
    queryKey: ["properties", propertyId],
    queryFn: () => fetchProperty(propertyId),
  });

  const { data: units, isLoading: unitsLoading, error: unitsError } = useQuery({
    queryKey: ["units", propertyId],
    queryFn: () => fetchUnitsByProperty(propertyId),
  });

  return (
    <div className="flex-1 overflow-y-auto">
      <PageHeader
        title={propertyLoading ? "Loading..." : property?.name ?? "Property"}
        description={property?.address}
        actions={
          <Button size="sm" onClick={() => setCreateUnitOpen(true)}>
            <Plus className="h-4 w-4" />
            Add unit
          </Button>
        }
      />

      <div className="p-8 space-y-6">
        <Link
          to="/properties"
          className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to properties
        </Link>

        {property && (
          <div className="grid grid-cols-3 gap-4">
            <Card className="p-4">
              <p className="text-xs text-text-secondary mb-1">Type</p>
              {(() => {
                const meta = PROPERTY_TYPE_META[property.propertyType];
                return (
                  <span className={`status-pill ${meta.bg} ${meta.text}`}>
                    <meta.icon className="h-3 w-3" />
                    {meta.label}
                  </span>
                );
              })()}
            </Card>
            <Card className="p-4">
              <p className="text-xs text-text-secondary mb-1">Owner(s)</p>
              <p className="text-sm font-medium text-text-primary flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-text-tertiary" />
                {property.ownerLinks
                  .map((link) => `${link.owner.fullName} (${link.ownershipPercent}%)`)
                  .join(", ")}
              </p>
            </Card>
            <Card className="p-4">
              <p className="text-xs text-text-secondary mb-1">Address</p>
              <p className="text-sm font-medium text-text-primary flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 text-text-tertiary" /> {property.address}
              </p>
            </Card>
          </div>
        )}

        <Card className="overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="text-sm font-semibold text-text-primary">Units</h2>
          </div>

          {unitsLoading && <TableSkeleton cols={5} />}

          {unitsError && (
            <div className="px-5 py-4 text-sm text-danger-600">
              Failed to load units: {unitsError instanceof Error ? unitsError.message : "Unknown error"}
            </div>
          )}

          {units && units.length === 0 && (
            <EmptyState
              icon={LayoutGrid}
              title="No units yet"
              description="Add the units in this property — apartments, shops, offices — so you can attach leases and start billing once tenants move in."
              actionLabel="Add unit"
              onAction={() => setCreateUnitOpen(true)}
            />
          )}

          {units && units.length > 0 && (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="px-5 py-3 font-medium text-text-secondary text-xs uppercase tracking-wide">Unit</th>
                  <th className="px-5 py-3 font-medium text-text-secondary text-xs uppercase tracking-wide">Type</th>
                  <th className="px-5 py-3 font-medium text-text-secondary text-xs uppercase tracking-wide">Size</th>
                  <th className="px-5 py-3 font-medium text-text-secondary text-xs uppercase tracking-wide">Features</th>
                  <th className="px-5 py-3 font-medium text-text-secondary text-xs uppercase tracking-wide">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {units.map((unit) => (
                  <tr key={unit.id} className="hover:bg-surface-sunken transition-colors">
                    <td className="px-5 py-3.5">
                      <p className="font-medium text-text-primary">{unit.unitNumber}</p>
                      {unit.floor && <p className="text-xs text-text-secondary">{unit.floor} floor</p>}
                    </td>
                    <td className="px-5 py-3.5 text-text-secondary">
                      {UNIT_TYPE_METADATA[unit.unitType as UnitType]?.label ?? unit.unitType}
                      {unit.bedrooms != null && (
                        <span className="text-text-tertiary"> · {unit.bedrooms} bed</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-text-secondary tabular-nums">
                      {unit.sizeSqm ? `${unit.sizeSqm} sqm` : "—"}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5 text-text-tertiary">
                        {unit.meterNumberWater && (
                          <span title="Has water meter"><Droplet className="h-3.5 w-3.5" /></span>
                        )}
                        {unit.meterNumberElectricity && (
                          <span title="Has electricity meter"><Zap className="h-3.5 w-3.5" /></span>
                        )}
                        {unit.hasParking && (
                          <span title="Has parking"><Car className="h-3.5 w-3.5" /></span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusPill status={unit.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>

      <Modal
        open={createUnitOpen}
        onClose={() => setCreateUnitOpen(false)}
        title="Add unit"
        description={`Add a new unit to ${property?.name ?? "this property"}.`}
      >
        <CreateUnitForm propertyId={propertyId} onSuccess={() => setCreateUnitOpen(false)} />
      </Modal>
    </div>
  );
}
