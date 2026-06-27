import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Banknote, Plus, CheckCircle2, PauseCircle } from "lucide-react";
import {
  fetchDisbursements,
  approveDisbursement,
  holdDisbursement,
  DisbursementWithOwner,
} from "../../api/disbursements";
import { PageHeader } from "../../components/ui/PageHeader";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { EmptyState } from "../../components/ui/EmptyState";
import { TableSkeleton } from "../../components/ui/TableSkeleton";
import { Modal } from "../../components/ui/Modal";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { StatusPill } from "../../components/ui/StatusPill";
import { RowActionsMenu } from "../../components/ui/RowActionsMenu";
import { ResponsiveTable, ResponsiveColumn } from "../../components/ui/ResponsiveTable";
import { CreateDisbursementForm } from "./CreateDisbursementForm";
import { formatCurrency, formatDate } from "../../utils/format";

export function DisbursementsPage() {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [approvingDisbursement, setApprovingDisbursement] = useState<DisbursementWithOwner | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const { data: disbursements, isLoading, error } = useQuery({
    queryKey: ["disbursements"],
    queryFn: () => fetchDisbursements(),
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => approveDisbursement(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["disbursements"] });
      queryClient.invalidateQueries({ queryKey: ["trust-balances"] });
      queryClient.invalidateQueries({ queryKey: ["trust-transactions"] });
      setApprovingDisbursement(null);
      setActionError(null);
    },
    onError: (err) => setActionError(err instanceof Error ? err.message : "Failed to approve disbursement"),
  });

  const holdMutation = useMutation({
    mutationFn: holdDisbursement,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["disbursements"] });
      setActionError(null);
    },
    onError: (err) => setActionError(err instanceof Error ? err.message : "Failed to hold disbursement"),
  });

  const columns: ResponsiveColumn<DisbursementWithOwner>[] = [
    {
      key: "owner",
      header: "Owner",
      isMobileTitle: true,
      cell: (d) => (
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-surface-sunken flex items-center justify-center shrink-0">
            <Banknote className="h-4 w-4 text-text-tertiary" strokeWidth={2} />
          </div>
          <div>
            <p className="font-medium text-text-primary">{d.owner.fullName}</p>
            <p className="text-xs text-text-tertiary">
              {formatDate(d.periodStart)} – {formatDate(d.periodEnd)}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: "gross",
      header: "Gross collected",
      cell: (d) => <span className="tabular-nums text-text-secondary">{formatCurrency(d.grossRentCollected)}</span>,
    },
    {
      key: "deductions",
      header: "Deductions",
      cell: (d) => (
        <span className="tabular-nums text-danger-600">
          −{formatCurrency(Number(d.managementFee) + Number(d.withholdingTaxDeducted) + Number(d.expensesDeducted))}
        </span>
      ),
    },
    {
      key: "net",
      header: "Net payable",
      cell: (d) => <span className="tabular-nums font-semibold text-text-primary">{formatCurrency(d.netPayable)}</span>,
    },
    {
      key: "status",
      header: "Status",
      cell: (d) => <StatusPill status={d.status} />,
    },
  ];

  return (
    <div className="flex-1 overflow-y-auto">
      <PageHeader
        title="Disbursements"
        description="Owner payouts, net of management fee and withholding tax."
        actions={
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            Create disbursement
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
              Failed to load disbursements: {error instanceof Error ? error.message : "Unknown error"}
            </div>
          )}

          {disbursements && disbursements.length === 0 && (
            <EmptyState
              icon={Banknote}
              title="No disbursements yet"
              description="Calculate a disbursement for an owner and period — gross rent collected, less management fee and withholding tax, gives the net amount payable."
              actionLabel="Create disbursement"
              onAction={() => setCreateOpen(true)}
            />
          )}

          {disbursements && disbursements.length > 0 && (
            <ResponsiveTable
              columns={columns}
              rows={disbursements}
              rowKey={(d) => d.id}
              rowActions={(d) =>
                d.status === "PENDING_APPROVAL" ? (
                  <RowActionsMenu
                    items={[
                      {
                        label: "Approve & pay out",
                        icon: <CheckCircle2 className="h-3.5 w-3.5" />,
                        onClick: () => {
                          setActionError(null);
                          setApprovingDisbursement(d);
                        },
                      },
                      {
                        label: "Hold",
                        icon: <PauseCircle className="h-3.5 w-3.5" />,
                        danger: true,
                        onClick: () => holdMutation.mutate(d.id),
                      },
                    ]}
                  />
                ) : null
              }
            />
          )}
        </Card>
      </div>

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Create disbursement"
        description="Calculate an owner's net payout for a period before committing."
      >
        <CreateDisbursementForm onSuccess={() => setCreateOpen(false)} />
      </Modal>

      <ConfirmDialog
        open={!!approvingDisbursement}
        onClose={() => {
          setApprovingDisbursement(null);
          setActionError(null);
        }}
        onConfirm={() => approvingDisbursement && approveMutation.mutate(approvingDisbursement.id)}
        title="Approve disbursement"
        description={`Approve and pay out ${formatCurrency(approvingDisbursement?.netPayable ?? 0)} to ${approvingDisbursement?.owner.fullName}? This posts the trust outflow immediately and cannot be undone — only reversed via a new trust entry.`}
        confirmLabel="Approve & pay out"
        isPending={approveMutation.isPending}
        errorMessage={actionError}
      />
    </div>
  );
}
