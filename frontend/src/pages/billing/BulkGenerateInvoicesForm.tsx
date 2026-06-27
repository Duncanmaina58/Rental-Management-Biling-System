import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { AlertCircle, CheckCircle2, Droplet, Zap } from "lucide-react";
import { LeaseStatus } from "@rmbs/shared";
import { fetchLeases } from "../../api/leases";
import { bulkGenerateInvoices, BulkGenerateResult } from "../../api/billing";
import { Button } from "../../components/ui/Button";
import { formatCurrency } from "../../utils/format";

interface FormValues {
  periodStart: string;
  periodEnd: string;
  dueDate: string;
  utilities: Record<string, { waterAmount?: number; electricityAmount?: number }>;
}

function defaultPeriod() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const due = new Date(now.getFullYear(), now.getMonth(), 5);
  const toISO = (d: Date) => d.toISOString().slice(0, 10);
  return { periodStart: toISO(start), periodEnd: toISO(end), dueDate: toISO(due) };
}

export function BulkGenerateInvoicesForm({ onSuccess }: { onSuccess: () => void }) {
  const queryClient = useQueryClient();
  const [formError, setFormError] = useState<string | null>(null);
  const [result, setResult] = useState<BulkGenerateResult | null>(null);

  const { data: leases, isLoading: leasesLoading } = useQuery({
    queryKey: ["leases"],
    queryFn: fetchLeases,
  });

  const activeLeases = leases?.filter((l) => l.status === LeaseStatus.ACTIVE) ?? [];

  const { register, handleSubmit } = useForm<FormValues>({
    defaultValues: { ...defaultPeriod(), utilities: {} },
  });

  const mutation = useMutation({
    mutationFn: (values: FormValues) => {
      const utilityCharges = Object.entries(values.utilities)
        .filter(([, v]) => v.waterAmount || v.electricityAmount)
        .map(([leaseId, v]) => ({
          leaseId,
          waterAmount: v.waterAmount ? Number(v.waterAmount) : undefined,
          electricityAmount: v.electricityAmount ? Number(v.electricityAmount) : undefined,
        }));
      return bulkGenerateInvoices({
        periodStart: values.periodStart,
        periodEnd: values.periodEnd,
        dueDate: values.dueDate,
        utilityCharges,
      });
    },
    onSuccess: (res) => {
      setResult(res);
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
    },
    onError: (err) => setFormError(err instanceof Error ? err.message : "Failed to generate invoices"),
  });

  if (leasesLoading) {
    return <p className="text-sm text-text-secondary">Loading active leases...</p>;
  }

  if (result) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 bg-positive-50 text-positive-700 rounded-lg px-4 py-3">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <p className="text-sm font-medium">
            Generated {result.created} invoice{result.created !== 1 ? "s" : ""}.
          </p>
        </div>
        {result.skipped.length > 0 && (
          <div className="bg-warning-50 text-warning-600 rounded-lg px-4 py-3">
            <p className="text-sm font-medium mb-1">
              {result.skipped.length} lease{result.skipped.length !== 1 ? "s" : ""} skipped:
            </p>
            <ul className="text-xs space-y-0.5 list-disc list-inside">
              {result.skipped.map((s, i) => (
                <li key={i}>{s.reason}</li>
              ))}
            </ul>
          </div>
        )}
        <div className="flex justify-end pt-2">
          <Button onClick={onSuccess}>Done</Button>
        </div>
      </div>
    );
  }

  if (activeLeases.length === 0) {
    return (
      <p className="text-sm text-text-secondary">
        There are no active leases to bill. Create a lease first.
      </p>
    );
  }

  return (
    <form
      onSubmit={handleSubmit((v) => {
        setFormError(null);
        mutation.mutate(v);
      })}
      className="space-y-5"
    >
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1.5">Period start</label>
          <input
            type="date"
            {...register("periodStart", { required: true })}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1.5">Period end</label>
          <input
            type="date"
            {...register("periodEnd", { required: true })}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1.5">Due date</label>
          <input
            type="date"
            {...register("dueDate", { required: true })}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
          />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium text-text-primary">
            Utility charges <span className="text-text-tertiary font-normal">(optional, per unit)</span>
          </p>
          <span className="text-xs text-text-tertiary">{activeLeases.length} active lease(s)</span>
        </div>
        <p className="text-xs text-text-tertiary mb-3">
          Rent is calculated automatically from each lease. CAM is added automatically where the
          property has a CAM rate set. Enter water/electricity readings below only for units that
          have a charge this cycle — leave blank to skip.
        </p>

        <div className="border border-border rounded-lg divide-y divide-border max-h-80 overflow-y-auto">
          {activeLeases.map((lease) => (
            <div key={lease.id} className="px-4 py-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary truncate">
                  {lease.unit.property.name} — {lease.unit.unitNumber}
                </p>
                <p className="text-xs text-text-tertiary truncate">
                  {lease.primaryTenant.fullName} · {formatCurrency(lease.rentAmount)}/mo
                  {lease.unit.property.camRatePerSqm && lease.unit.sizeSqm
                    ? ` · CAM ${formatCurrency(Number(lease.unit.property.camRatePerSqm) * Number(lease.unit.sizeSqm))}`
                    : ""}
                </p>
              </div>
              <div className="relative w-28 shrink-0">
                <Droplet className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-tertiary" />
                <input
                  type="number"
                  step="0.01"
                  placeholder="Water"
                  {...register(`utilities.${lease.id}.waterAmount` as const, { valueAsNumber: true })}
                  className="w-full rounded-md border border-border bg-surface pl-8 pr-2 py-1.5 text-xs tabular-nums focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
                />
              </div>
              <div className="relative w-28 shrink-0">
                <Zap className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-tertiary" />
                <input
                  type="number"
                  step="0.01"
                  placeholder="Power"
                  {...register(`utilities.${lease.id}.electricityAmount` as const, { valueAsNumber: true })}
                  className="w-full rounded-md border border-border bg-surface pl-8 pr-2 py-1.5 text-xs tabular-nums focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {formError && (
        <div className="flex items-center gap-2 bg-danger-50 text-danger-600 text-sm rounded-lg px-3.5 py-2.5">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {formError}
        </div>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? "Generating..." : `Generate ${activeLeases.length} invoice(s)`}
        </Button>
      </div>
    </form>
  );
}
