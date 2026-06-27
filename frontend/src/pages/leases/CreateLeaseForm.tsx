import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm, Controller } from "react-hook-form";
import { AlertCircle } from "lucide-react";
import { RentBasis, BillingCycle } from "@rmbs/shared";
import { fetchVacantUnits, createLease, CreateLeasePayload } from "../../api/leases";
import { fetchTenants } from "../../api/tenants";
import { Button } from "../../components/ui/Button";

interface FormValues {
  unitId: string;
  primaryTenantId: string;
  startDate: string;
  endDate?: string;
  rentBasis: RentBasis;
  rentAmount: number;
  billingCycle: BillingCycle;
  depositAmount: number;
  escalationPercent?: number;
  noticePeriodDays: number;
}

const RENT_BASIS_OPTIONS: { value: RentBasis; label: string }[] = [
  { value: RentBasis.FLAT_MONTHLY, label: "Flat monthly" },
  { value: RentBasis.PER_SQM, label: "Per sqm" },
  { value: RentBasis.PERCENT_OF_TURNOVER, label: "% of turnover" },
];

export function CreateLeaseForm({ onSuccess }: { onSuccess: () => void }) {
  const queryClient = useQueryClient();
  const [formError, setFormError] = useState<string | null>(null);

  const { data: vacantUnits, isLoading: unitsLoading } = useQuery({
    queryKey: ["units", "vacant"],
    queryFn: fetchVacantUnits,
  });
  const { data: tenants, isLoading: tenantsLoading } = useQuery({
    queryKey: ["tenants"],
    queryFn: fetchTenants,
  });

  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      rentBasis: RentBasis.FLAT_MONTHLY,
      billingCycle: BillingCycle.MONTHLY,
      depositAmount: 0,
      noticePeriodDays: 30,
      startDate: new Date().toISOString().slice(0, 10),
    },
  });

  const rentBasis = watch("rentBasis");
  const availableTenants = tenants?.filter((t) => !t.isBlacklisted) ?? [];
  const blacklistedCount = (tenants?.length ?? 0) - availableTenants.length;

  const mutation = useMutation({
    mutationFn: (values: FormValues) => {
      const payload: CreateLeasePayload = {
        ...values,
        rentAmount: Number(values.rentAmount),
        depositAmount: Number(values.depositAmount),
        escalationPercent: values.escalationPercent ? Number(values.escalationPercent) : undefined,
        endDate: values.endDate || undefined,
        additionalTenants: [],
      };
      return createLease(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leases"] });
      queryClient.invalidateQueries({ queryKey: ["units", "vacant"] });
      queryClient.invalidateQueries({ queryKey: ["properties"] });
      onSuccess();
    },
    onError: (err) => setFormError(err instanceof Error ? err.message : "Failed to create lease"),
  });

  if (unitsLoading || tenantsLoading) {
    return <p className="text-sm text-text-secondary">Loading available units and tenants...</p>;
  }

  if (!vacantUnits || vacantUnits.length === 0) {
    return (
      <div className="text-sm text-text-secondary">
        There are no vacant units right now. Free up a unit (end an existing lease) or add a new
        property/unit before creating a lease.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit((v) => { setFormError(null); mutation.mutate(v); })} className="space-y-5">
      <div>
        <label className="block text-sm font-medium text-text-primary mb-1.5">Vacant unit</label>
        <select
          {...register("unitId", { required: true })}
          className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
        >
          <option value="">Select a unit...</option>
          {vacantUnits.map((unit) => (
            <option key={unit.id} value={unit.id}>
              {unit.property.name} — {unit.unitNumber}
            </option>
          ))}
        </select>
        {errors.unitId && <p className="text-xs text-danger-600 mt-1.5">Required</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-text-primary mb-1.5">Tenant</label>
        <select
          {...register("primaryTenantId", { required: true })}
          className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
        >
          <option value="">Select a tenant...</option>
          {availableTenants.map((tenant) => (
            <option key={tenant.id} value={tenant.id}>
              {tenant.fullName}
            </option>
          ))}
        </select>
        {errors.primaryTenantId && <p className="text-xs text-danger-600 mt-1.5">Required</p>}
        {blacklistedCount > 0 && (
          <p className="text-xs text-text-tertiary mt-1.5">
            {blacklistedCount} blacklisted tenant{blacklistedCount > 1 ? "s" : ""} hidden from this list.
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1.5">Start date</label>
          <input
            type="date"
            {...register("startDate", { required: true })}
            className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1.5">
            End date <span className="text-text-tertiary font-normal">(optional)</span>
          </label>
          <input
            type="date"
            {...register("endDate")}
            className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-text-primary mb-1.5">Rent basis</label>
        <Controller
          control={control}
          name="rentBasis"
          render={({ field }) => (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {RENT_BASIS_OPTIONS.map((opt) => (
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
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1.5">
            Rent amount {rentBasis === RentBasis.PER_SQM ? "(per sqm)" : rentBasis === RentBasis.PERCENT_OF_TURNOVER ? "(%)" : "(KES)"}
          </label>
          <input
            type="number"
            step="0.01"
            {...register("rentAmount", { required: true, valueAsNumber: true, min: 0.01 })}
            className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
          />
          {errors.rentAmount && <p className="text-xs text-danger-600 mt-1.5">Required</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1.5">Deposit (KES)</label>
          <input
            type="number"
            step="0.01"
            {...register("depositAmount", { valueAsNumber: true, min: 0 })}
            className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1.5">
            Annual escalation % <span className="text-text-tertiary font-normal">(optional)</span>
          </label>
          <input
            type="number"
            step="0.01"
            {...register("escalationPercent", { valueAsNumber: true, min: 0, max: 100 })}
            className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
            placeholder="e.g. 5"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1.5">Notice period (days)</label>
          <input
            type="number"
            {...register("noticePeriodDays", { required: true, valueAsNumber: true, min: 0 })}
            className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
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
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? "Creating..." : "Create lease"}
        </Button>
      </div>
    </form>
  );
}
