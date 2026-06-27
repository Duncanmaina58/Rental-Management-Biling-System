import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm, Controller } from "react-hook-form";
import { AlertCircle, CheckCircle2, Info } from "lucide-react";
import { PaymentMethod, LeaseStatus } from "@rmbs/shared";
import { fetchLeases } from "../../api/leases";
import { fetchOutstandingBalance, createPayment, CreatePaymentPayload } from "../../api/payments";
import { Button } from "../../components/ui/Button";
import { formatCurrency } from "../../utils/format";

interface FormValues {
  leaseId: string;
  method: PaymentMethod;
  amount: number;
  reference?: string;
  paidAt: string;
}

const METHOD_OPTIONS: { value: PaymentMethod; label: string }[] = [
  { value: PaymentMethod.MPESA, label: "M-Pesa" },
  { value: PaymentMethod.BANK_TRANSFER, label: "Bank transfer" },
  { value: PaymentMethod.CASH, label: "Cash" },
  { value: PaymentMethod.CARD, label: "Card" },
  { value: PaymentMethod.CHEQUE, label: "Cheque" },
];

export function RecordPaymentForm({ onSuccess }: { onSuccess: () => void }) {
  const queryClient = useQueryClient();
  const [formError, setFormError] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<{ allocated: number; unallocated: number } | null>(null);

  const { data: leases, isLoading: leasesLoading } = useQuery({
    queryKey: ["leases"],
    queryFn: fetchLeases,
  });
  const activeLeases = leases?.filter((l) => l.status === LeaseStatus.ACTIVE) ?? [];

  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      method: PaymentMethod.MPESA,
      paidAt: new Date().toISOString().slice(0, 10),
    },
  });

  const selectedLeaseId = watch("leaseId");
  const selectedMethod = watch("method");

  const { data: balance, isLoading: balanceLoading } = useQuery({
    queryKey: ["outstanding-balance", selectedLeaseId],
    queryFn: () => fetchOutstandingBalance(selectedLeaseId),
    enabled: !!selectedLeaseId,
  });

  const requiresConfirmation = selectedMethod === PaymentMethod.CASH || selectedMethod === PaymentMethod.CHEQUE;

  const mutation = useMutation({
    mutationFn: (values: FormValues) => {
      const payload: CreatePaymentPayload = {
        ...values,
        amount: Number(values.amount),
        reference: values.reference || undefined,
      };
      return createPayment(payload);
    },
    onSuccess: (result) => {
      setSuccessInfo({ allocated: result.allocated, unallocated: result.unallocated });
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["outstanding-balance"] });
    },
    onError: (err) => setFormError(err instanceof Error ? err.message : "Failed to record payment"),
  });

  if (leasesLoading) {
    return <p className="text-sm text-text-secondary">Loading leases...</p>;
  }

  if (successInfo) {
    const wasConfirmedImmediately = !requiresConfirmation;
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 bg-positive-50 text-positive-700 rounded-lg px-4 py-3">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <div className="text-sm">
            <p className="font-medium">Payment recorded.</p>
            {wasConfirmedImmediately ? (
              <p className="text-xs mt-0.5">
                {formatCurrency(successInfo.allocated)} applied to outstanding invoices.
                {successInfo.unallocated > 0 &&
                  ` ${formatCurrency(successInfo.unallocated)} left as unallocated credit (overpayment).`}
              </p>
            ) : (
              <p className="text-xs mt-0.5">
                This {selectedMethod === PaymentMethod.CASH ? "cash" : "cheque"} payment is pending
                confirmation before it's applied to any invoice — confirm it from the Payments list.
              </p>
            )}
          </div>
        </div>
        <div className="flex justify-end pt-2">
          <Button onClick={onSuccess}>Done</Button>
        </div>
      </div>
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
      <div>
        <label className="block text-sm font-medium text-text-primary mb-1.5">Lease</label>
        <select
          {...register("leaseId", { required: true })}
          className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
        >
          <option value="">Select a lease...</option>
          {activeLeases.map((lease) => (
            <option key={lease.id} value={lease.id}>
              {lease.unit.property.name} — {lease.unit.unitNumber} ({lease.primaryTenant.fullName})
            </option>
          ))}
        </select>
        {errors.leaseId && <p className="text-xs text-danger-600 mt-1.5">Required</p>}
      </div>

      {selectedLeaseId && (
        <div className="flex items-center gap-2 bg-surface-sunken rounded-lg px-3.5 py-2.5 text-sm">
          <Info className="h-4 w-4 text-text-tertiary shrink-0" />
          {balanceLoading ? (
            <span className="text-text-secondary">Checking outstanding balance...</span>
          ) : balance ? (
            <span className="text-text-secondary">
              Outstanding balance:{" "}
              <span className="font-semibold text-text-primary tabular-nums">
                {formatCurrency(balance.totalOutstanding)}
              </span>{" "}
              across {balance.invoices.length} invoice{balance.invoices.length !== 1 ? "s" : ""}
            </span>
          ) : null}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-text-primary mb-1.5">Payment method</label>
        <Controller
          control={control}
          name="method"
          render={({ field }) => (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {METHOD_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => field.onChange(opt.value)}
                  className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                    field.value === opt.value
                      ? "border-brand-500 bg-brand-50 text-brand-600"
                      : "border-border text-text-secondary hover:bg-surface-sunken"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        />
        {requiresConfirmation && (
          <p className="text-xs text-warning-600 mt-1.5 flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            {selectedMethod === PaymentMethod.CASH ? "Cash" : "Cheque"} payments need confirmation
            before they're applied to invoices.
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1.5">Amount (KES)</label>
          <input
            type="number"
            step="0.01"
            {...register("amount", { required: true, valueAsNumber: true, min: 0.01 })}
            className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
          />
          {errors.amount && <p className="text-xs text-danger-600 mt-1.5">Required</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1.5">Date paid</label>
          <input
            type="date"
            {...register("paidAt", { required: true })}
            className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-text-primary mb-1.5">
          Reference <span className="text-text-tertiary font-normal">(M-Pesa code, cheque no., bank ref)</span>
        </label>
        <input
          {...register("reference")}
          className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
          placeholder="e.g. QFT5J2K9LM"
        />
      </div>

      {formError && (
        <div className="flex items-center gap-2 bg-danger-50 text-danger-600 text-sm rounded-lg px-3.5 py-2.5">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {formError}
        </div>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? "Recording..." : "Record payment"}
        </Button>
      </div>
    </form>
  );
}
