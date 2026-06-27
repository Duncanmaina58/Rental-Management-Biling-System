import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { AlertCircle, ArrowRight, CheckCircle2 } from "lucide-react";
import { fetchOwners } from "../../api/owners";
import {
  previewDisbursement,
  createDisbursement,
  DisbursementPreview,
  DisbursementPeriodPayload,
} from "../../api/disbursements";
import { Button } from "../../components/ui/Button";
import { formatCurrency } from "../../utils/format";

function defaultPeriod() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const toISO = (d: Date) => d.toISOString().slice(0, 10);
  return { periodStart: toISO(start), periodEnd: toISO(end) };
}

export function CreateDisbursementForm({ onSuccess }: { onSuccess: () => void }) {
  const queryClient = useQueryClient();
  const [formError, setFormError] = useState<string | null>(null);
  const [preview, setPreview] = useState<DisbursementPreview | null>(null);
  const [previewPayload, setPreviewPayload] = useState<DisbursementPeriodPayload | null>(null);
  const [created, setCreated] = useState(false);

  const { data: owners, isLoading: ownersLoading } = useQuery({
    queryKey: ["owners"],
    queryFn: fetchOwners,
  });

  const { register, handleSubmit, watch } = useForm<DisbursementPeriodPayload>({
    defaultValues: defaultPeriod(),
  });

  const selectedOwnerId = watch("ownerId");
  const selectedOwner = owners?.find((o) => o.id === selectedOwnerId);

  const previewMutation = useMutation({
    mutationFn: previewDisbursement,
    onSuccess: (result, variables) => {
      setPreview(result);
      setPreviewPayload(variables);
    },
    onError: (err) => setFormError(err instanceof Error ? err.message : "Failed to calculate preview"),
  });

  const createMutation = useMutation({
    mutationFn: createDisbursement,
    onSuccess: () => {
      setCreated(true);
      queryClient.invalidateQueries({ queryKey: ["disbursements"] });
      queryClient.invalidateQueries({ queryKey: ["trust-balances"] });
    },
    onError: (err) => setFormError(err instanceof Error ? err.message : "Failed to create disbursement"),
  });

  if (ownersLoading) {
    return <p className="text-sm text-text-secondary">Loading owners...</p>;
  }

  if (created) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 bg-positive-50 text-positive-700 rounded-lg px-4 py-3">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <p className="text-sm font-medium">
            Disbursement created and pending approval. Approve it from the list to post the trust
            outflow and mark it paid.
          </p>
        </div>
        <div className="flex justify-end pt-2">
          <Button onClick={onSuccess}>Done</Button>
        </div>
      </div>
    );
  }

  if (preview && previewPayload) {
    const isNothingToDisburse = preview.grossRentCollected <= 0;
    return (
      <div className="space-y-4">
        <div className="bg-surface-sunken rounded-lg p-4">
          <p className="text-sm font-medium text-text-primary mb-3">
            {selectedOwner?.fullName} — {previewPayload.periodStart} to {previewPayload.periodEnd}
          </p>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-text-secondary">Gross rent collected</dt>
              <dd className="tabular-nums font-medium text-text-primary">
                {formatCurrency(preview.grossRentCollected)}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-text-secondary">Management fee</dt>
              <dd className="tabular-nums text-danger-600">−{formatCurrency(preview.managementFee)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-text-secondary">Withholding tax</dt>
              <dd className="tabular-nums text-danger-600">
                −{formatCurrency(preview.withholdingTaxDeducted)}
              </dd>
            </div>
            {preview.expensesDeducted > 0 && (
              <div className="flex justify-between">
                <dt className="text-text-secondary">Expenses</dt>
                <dd className="tabular-nums text-danger-600">−{formatCurrency(preview.expensesDeducted)}</dd>
              </div>
            )}
            <div className="flex justify-between pt-2 border-t border-border">
              <dt className="font-semibold text-text-primary">Net payable</dt>
              <dd className="tabular-nums font-semibold text-positive-700 text-base">
                {formatCurrency(preview.netPayable)}
              </dd>
            </div>
          </dl>
        </div>

        {isNothingToDisburse && (
          <div className="flex items-center gap-2 bg-warning-50 text-warning-600 text-sm rounded-lg px-3.5 py-2.5">
            <AlertCircle className="h-4 w-4 shrink-0" />
            No rent was collected for this owner in this period — there's nothing to disburse.
          </div>
        )}

        {formError && (
          <div className="flex items-center gap-2 bg-danger-50 text-danger-600 text-sm rounded-lg px-3.5 py-2.5">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {formError}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={() => setPreview(null)}>
            Back
          </Button>
          <Button
            onClick={() => {
              setFormError(null);
              createMutation.mutate(previewPayload);
            }}
            disabled={createMutation.isPending || isNothingToDisburse}
          >
            {createMutation.isPending ? "Creating..." : "Create disbursement"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit((v) => {
        setFormError(null);
        previewMutation.mutate(v);
      })}
      className="space-y-5"
    >
      <div>
        <label className="block text-sm font-medium text-text-primary mb-1.5">Owner</label>
        <select
          {...register("ownerId", { required: true })}
          className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
        >
          <option value="">Select an owner...</option>
          {owners?.map((owner) => (
            <option key={owner.id} value={owner.id}>
              {owner.fullName}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1.5">Period start</label>
          <input
            type="date"
            {...register("periodStart", { required: true })}
            className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1.5">Period end</label>
          <input
            type="date"
            {...register("periodEnd", { required: true })}
            className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
          />
        </div>
      </div>

      {formError && (
        <div className="flex items-center gap-2 bg-danger-50 text-danger-600 text-sm rounded-lg px-3.5 py-2.5">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {formError}
        </div>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" disabled={previewMutation.isPending}>
          {previewMutation.isPending ? "Calculating..." : "Calculate"}
          <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </form>
  );
}
