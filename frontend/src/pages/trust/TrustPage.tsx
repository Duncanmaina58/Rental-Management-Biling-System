import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ShieldCheck, Undo2, Lock } from "lucide-react";
import { fetchTrustTransactions, fetchTrustBalances, reverseTrustTransaction, TrustTransactionWithRelations } from "../../api/trust";
import { PageHeader } from "../../components/ui/PageHeader";
import { Card, AccentCard, CardBody } from "../../components/ui/Card";
import { EmptyState } from "../../components/ui/EmptyState";
import { TableSkeleton } from "../../components/ui/TableSkeleton";
import { ResponsiveTable, ResponsiveColumn } from "../../components/ui/ResponsiveTable";
import { RowActionsMenu } from "../../components/ui/RowActionsMenu";
import { ReverseTrustTransactionDialog } from "./ReverseTrustTransactionDialog";
import { formatCurrency, formatDateTime } from "../../utils/format";

const TYPE_LABELS: Record<string, string> = {
  DEPOSIT_RECEIVED: "Deposit received",
  DEPOSIT_REFUNDED: "Deposit refunded",
  DEPOSIT_DEDUCTED: "Deposit deducted",
  RENT_RECEIVED: "Rent received",
  MANAGEMENT_FEE_EARNED: "Management fee earned",
  OWNER_DISBURSEMENT: "Owner disbursement",
  WITHHOLDING_TAX_REMITTED: "Withholding tax remitted",
  EXPENSE_PAID: "Expense paid",
  REVERSAL: "Reversal",
};

export function TrustPage() {
  const queryClient = useQueryClient();
  const [reversingTxn, setReversingTxn] = useState<TrustTransactionWithRelations | null>(null);
  const [reverseError, setReverseError] = useState<string | null>(null);

  const { data: balances, isLoading: balancesLoading } = useQuery({
    queryKey: ["trust-balances"],
    queryFn: fetchTrustBalances,
  });

  const { data: transactions, isLoading: txnsLoading, error } = useQuery({
    queryKey: ["trust-transactions"],
    queryFn: () => fetchTrustTransactions(),
  });

  const reverseMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => reverseTrustTransaction(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trust-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["trust-balances"] });
      setReversingTxn(null);
      setReverseError(null);
    },
    onError: (err) => setReverseError(err instanceof Error ? err.message : "Failed to post reversal"),
  });

  const totalHeld = balances?.reduce((sum, b) => sum + b.trustBalance, 0) ?? 0;

  const columns: ResponsiveColumn<TrustTransactionWithRelations>[] = [
    {
      key: "type",
      header: "Type",
      isMobileTitle: true,
      cell: (txn) => (
        <div>
          <p className="font-medium text-text-primary">{TYPE_LABELS[txn.type] ?? txn.type}</p>
          <p className="text-xs text-text-tertiary">{txn.description}</p>
        </div>
      ),
    },
    {
      key: "owner",
      header: "Owner",
      cell: (txn) => <span className="text-text-secondary">{txn.owner?.fullName ?? "—"}</span>,
    },
    {
      key: "lease",
      header: "Unit",
      cell: (txn) =>
        txn.lease ? (
          <span className="text-text-secondary text-xs">
            {txn.lease.unit.property.name} — {txn.lease.unit.unitNumber}
          </span>
        ) : (
          <span className="text-text-tertiary">—</span>
        ),
    },
    {
      key: "amount",
      header: "Amount",
      cell: (txn) => (
        <span className={`tabular-nums font-medium ${Number(txn.amount) < 0 ? "text-danger-600" : "text-positive-700"}`}>
          {Number(txn.amount) < 0 ? "−" : "+"}
          {formatCurrency(Math.abs(Number(txn.amount)))}
        </span>
      ),
    },
    {
      key: "date",
      header: "Posted",
      cell: (txn) => <span className="text-text-secondary text-xs">{formatDateTime(txn.createdAt)}</span>,
    },
  ];

  return (
    <div className="flex-1 overflow-y-auto">
      <PageHeader
        title="Trust & Tax"
        description="Owner and tenant funds held separately from company operating funds."
        actions={
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-text-tertiary">
            <Lock className="h-3.5 w-3.5" /> Finance & Admin only
          </span>
        }
      />

      <div className="p-4 sm:p-8 space-y-6">
        <AccentCard accent="brand">
          <CardBody className="pl-6">
            <p className="text-xs text-text-secondary mb-1">Total held in trust</p>
            <p className="text-3xl font-semibold text-text-primary tabular-nums tracking-tight font-display">
              {balancesLoading ? "—" : formatCurrency(totalHeld)}
            </p>
            <p className="text-xs text-text-tertiary mt-1">
              Across {balances?.length ?? 0} owner{balances?.length !== 1 ? "s" : ""} — this figure should
              match your trust bank account balance when reconciled.
            </p>
          </CardBody>
        </AccentCard>

        {balances && balances.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {balances.map((b) => (
              <Card key={b.ownerId} className="p-4">
                <p className="text-xs text-text-secondary mb-1">{b.ownerName}</p>
                <p className="text-xl font-semibold text-text-primary tabular-nums">
                  {formatCurrency(b.trustBalance)}
                </p>
                <p className="text-xs text-text-tertiary mt-0.5">held, pending disbursement</p>
              </Card>
            ))}
          </div>
        )}

        <Card className="overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-brand-500" />
            <h2 className="text-sm font-semibold text-text-primary">Trust ledger</h2>
          </div>

          {txnsLoading && <TableSkeleton cols={5} />}

          {error && (
            <div className="px-5 py-4 text-sm text-danger-600">
              Failed to load trust transactions: {error instanceof Error ? error.message : "Unknown error"}
            </div>
          )}

          {transactions && transactions.length === 0 && (
            <EmptyState
              icon={ShieldCheck}
              title="No trust activity yet"
              description="Trust transactions are posted automatically when a tenant payment is confirmed and allocated — rent and deposit money is tracked here separately from operating funds."
            />
          )}

          {transactions && transactions.length > 0 && (
            <ResponsiveTable
              columns={columns}
              rows={transactions}
              rowKey={(t) => t.id}
              rowActions={(txn) =>
                !txn.isReversal ? (
                  <RowActionsMenu
                    items={[
                      {
                        label: "Reverse",
                        icon: <Undo2 className="h-3.5 w-3.5" />,
                        danger: true,
                        onClick: () => {
                          setReverseError(null);
                          setReversingTxn(txn);
                        },
                      },
                    ]}
                  />
                ) : null
              }
            />
          )}
        </Card>
      </div>

      <ReverseTrustTransactionDialog
        open={!!reversingTxn}
        onClose={() => {
          setReversingTxn(null);
          setReverseError(null);
        }}
        onConfirm={(reason) => reversingTxn && reverseMutation.mutate({ id: reversingTxn.id, reason })}
        isPending={reverseMutation.isPending}
        errorMessage={reverseError}
      />
    </div>
  );
}
