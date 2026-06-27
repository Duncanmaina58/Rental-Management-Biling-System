import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Wrench, Plus, Building2, ArrowRight, DollarSign } from "lucide-react";
import { MaintenanceStatus } from "@rmbs/shared";
import {
  fetchMaintenanceRequests,
  updateMaintenanceRequest,
  recordMaintenanceCost,
  MaintenanceRequestWithRelations,
} from "../../api/maintenance";
import { PageHeader } from "../../components/ui/PageHeader";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { EmptyState } from "../../components/ui/EmptyState";
import { TableSkeleton } from "../../components/ui/TableSkeleton";
import { Modal } from "../../components/ui/Modal";
import { StatusPill } from "../../components/ui/StatusPill";
import { RowActionsMenu } from "../../components/ui/RowActionsMenu";
import { ResponsiveTable, ResponsiveColumn } from "../../components/ui/ResponsiveTable";
import { CreateMaintenanceRequestForm } from "./CreateMaintenanceRequestForm";
import { RecordCostDialog } from "./RecordCostDialog";
import { formatCurrency, formatDate } from "../../utils/format";

const NEXT_STATUS: Record<string, MaintenanceStatus> = {
  OPEN: MaintenanceStatus.ASSIGNED,
  ASSIGNED: MaintenanceStatus.IN_PROGRESS,
  IN_PROGRESS: MaintenanceStatus.COMPLETED,
  COMPLETED: MaintenanceStatus.CLOSED,
};

const NEXT_STATUS_LABEL: Record<string, string> = {
  OPEN: "Mark assigned",
  ASSIGNED: "Mark in progress",
  IN_PROGRESS: "Mark completed",
  COMPLETED: "Close request",
};

export function MaintenancePage() {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [costingRequest, setCostingRequest] = useState<MaintenanceRequestWithRelations | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const { data: requests, isLoading, error } = useQuery({
    queryKey: ["maintenance-requests"],
    queryFn: () => fetchMaintenanceRequests(),
  });

  const advanceMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: MaintenanceStatus }) =>
      updateMaintenanceRequest(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["maintenance-requests"] });
      setActionError(null);
    },
    onError: (err) => setActionError(err instanceof Error ? err.message : "Failed to update request"),
  });

  const costMutation = useMutation({
    mutationFn: ({ id, cost }: { id: string; cost: number }) => recordMaintenanceCost(id, cost),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["maintenance-requests"] });
      queryClient.invalidateQueries({ queryKey: ["trust-balances"] });
      queryClient.invalidateQueries({ queryKey: ["trust-transactions"] });
      setCostingRequest(null);
      setActionError(null);
    },
    onError: (err) => setActionError(err instanceof Error ? err.message : "Failed to record cost"),
  });

  const columns: ResponsiveColumn<MaintenanceRequestWithRelations>[] = [
    {
      key: "request",
      header: "Request",
      isMobileTitle: true,
      cell: (req) => (
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-surface-sunken flex items-center justify-center shrink-0">
            <Wrench className="h-4 w-4 text-text-tertiary" strokeWidth={2} />
          </div>
          <div>
            <p className="font-medium text-text-primary">{req.title}</p>
            <p className="text-xs text-text-tertiary flex items-center gap-1">
              <Building2 className="h-3 w-3" /> {req.unit.property.name} — {req.unit.unitNumber}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: "raisedBy",
      header: "Raised by",
      cell: (req) => (
        <span className="text-text-secondary">{req.raisedByTenant?.fullName ?? "Staff"}</span>
      ),
    },
    {
      key: "cost",
      header: "Cost",
      cell: (req) =>
        req.cost != null ? (
          <span className="tabular-nums font-medium text-text-primary">{formatCurrency(req.cost)}</span>
        ) : (
          <span className="text-text-tertiary">—</span>
        ),
    },
    {
      key: "date",
      header: "Raised",
      cell: (req) => <span className="text-text-secondary text-xs">{formatDate(req.createdAt)}</span>,
    },
    {
      key: "status",
      header: "Status",
      cell: (req) => <StatusPill status={req.status} />,
    },
  ];

  return (
    <div className="flex-1 overflow-y-auto">
      <PageHeader
        title="Maintenance"
        description="Repair and upkeep requests across your portfolio, with costs fed into owner disbursements."
        actions={
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            Raise request
          </Button>
        }
      />

      <div className="p-4 sm:p-8">
        {actionError && (
          <div className="mb-4 bg-danger-50 text-danger-600 text-sm rounded-lg px-3.5 py-2.5">
            {actionError}
          </div>
        )}

        <Card className="overflow-hidden">
          {isLoading && <TableSkeleton cols={5} />}

          {error && (
            <div className="px-5 py-4 text-sm text-danger-600">
              Failed to load requests: {error instanceof Error ? error.message : "Unknown error"}
            </div>
          )}

          {requests && requests.length === 0 && (
            <EmptyState
              icon={Wrench}
              title="No maintenance requests yet"
              description="Raise a request against a unit to track repairs through to completion — recording a cost automatically charges it to that unit's owner."
              actionLabel="Raise request"
              onAction={() => setCreateOpen(true)}
            />
          )}

          {requests && requests.length > 0 && (
            <ResponsiveTable
              columns={columns}
              rows={requests}
              rowKey={(r) => r.id}
              rowActions={(req) => {
                const nextStatus = NEXT_STATUS[req.status];
                const items = [];
                if (nextStatus) {
                  items.push({
                    label: NEXT_STATUS_LABEL[req.status],
                    icon: <ArrowRight className="h-3.5 w-3.5" />,
                    onClick: () => advanceMutation.mutate({ id: req.id, status: nextStatus }),
                  });
                }
                if (req.cost == null) {
                  items.push({
                    label: "Record cost",
                    icon: <DollarSign className="h-3.5 w-3.5" />,
                    onClick: () => {
                      setActionError(null);
                      setCostingRequest(req);
                    },
                  });
                }
                return items.length > 0 ? <RowActionsMenu items={items} /> : null;
              }}
            />
          )}
        </Card>
      </div>

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Raise maintenance request"
        description="Report an issue against a unit."
      >
        <CreateMaintenanceRequestForm onSuccess={() => setCreateOpen(false)} />
      </Modal>

      <RecordCostDialog
        open={!!costingRequest}
        onClose={() => {
          setCostingRequest(null);
          setActionError(null);
        }}
        onConfirm={(cost) => costingRequest && costMutation.mutate({ id: costingRequest.id, cost })}
        isPending={costMutation.isPending}
        errorMessage={actionError}
      />
    </div>
  );
}
