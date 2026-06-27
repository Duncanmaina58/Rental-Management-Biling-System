import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, Controller } from "react-hook-form";
import { AlertCircle } from "lucide-react";
import { OwnerResidency, FeeBasis, Owner } from "@rmbs/shared";
import { createOwner, updateOwner, CreateOwnerPayload } from "../../api/owners";
import { Button } from "../../components/ui/Button";

type FormValues = CreateOwnerPayload;

const RESIDENCY_OPTIONS: { value: OwnerResidency; label: string }[] = [
  { value: OwnerResidency.RESIDENT, label: "Resident" },
  { value: OwnerResidency.NON_RESIDENT, label: "Non-resident" },
];

const FEE_BASIS_OPTIONS: { value: FeeBasis; label: string }[] = [
  { value: FeeBasis.PERCENT_OF_COLLECTED, label: "% of collected rent" },
  { value: FeeBasis.PERCENT_OF_BILLED, label: "% of billed rent" },
  { value: FeeBasis.FLAT_FEE, label: "Flat fee" },
];

interface OwnerFormProps {
  owner?: Owner; // presence of this prop switches the form into edit mode
  onSuccess: () => void;
}

export function OwnerForm({ owner, onSuccess }: OwnerFormProps) {
  const isEditMode = Boolean(owner);
  const queryClient = useQueryClient();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: owner
      ? {
          fullName: owner.fullName,
          idOrPassport: owner.idOrPassport,
          kraPin: owner.kraPin ?? undefined,
          phone: owner.phone,
          email: owner.email ?? undefined,
          residency: owner.residency,
          bankAccountName: owner.bankAccountName ?? undefined,
          bankAccountNumber: owner.bankAccountNumber ?? undefined,
          bankName: owner.bankName ?? undefined,
          feeBasis: owner.feeBasis,
          feeValue: Number(owner.feeValue),
          isVatRegistered: owner.isVatRegistered,
        }
      : {
          residency: OwnerResidency.RESIDENT,
          feeBasis: FeeBasis.PERCENT_OF_COLLECTED,
          feeValue: 10,
          isVatRegistered: false,
        },
  });

  const feeBasis = watch("feeBasis");

  const mutation = useMutation({
    mutationFn: (values: FormValues) =>
      isEditMode ? updateOwner(owner!.id, values) : createOwner(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["owners"] });
      onSuccess();
    },
    onError: (err) =>
      setFormError(
        err instanceof Error ? err.message : `Failed to ${isEditMode ? "update" : "create"} owner`
      ),
  });

  function onSubmit(values: FormValues) {
    setFormError(null);
    mutation.mutate({
      ...values,
      feeValue: Number(values.feeValue),
      // Empty optional strings should be omitted rather than sent as "",
      // so they save as genuinely empty in the database rather than empty strings.
      kraPin: values.kraPin || undefined,
      email: values.email || undefined,
      bankAccountName: values.bankAccountName || undefined,
      bankAccountNumber: values.bankAccountNumber || undefined,
      bankName: values.bankName || undefined,
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="block text-sm font-medium text-text-primary mb-1.5">Full name</label>
          <input
            {...register("fullName", { required: true, minLength: 2 })}
            className="w-full rounded-lg border border-border px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
            placeholder="e.g. Jane Wanjiru"
          />
          {errors.fullName && <p className="text-xs text-danger-600 mt-1.5">Full name is required</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-text-primary mb-1.5">ID / Passport No.</label>
          <input
            {...register("idOrPassport", { required: true, minLength: 4 })}
            className="w-full rounded-lg border border-border px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
            placeholder="e.g. 23456789"
          />
          {errors.idOrPassport && <p className="text-xs text-danger-600 mt-1.5">Required</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-text-primary mb-1.5">
            KRA PIN <span className="text-text-tertiary font-normal">(optional)</span>
          </label>
          <input
            {...register("kraPin")}
            className="w-full rounded-lg border border-border px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
            placeholder="e.g. A001234567B"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-text-primary mb-1.5">Phone</label>
          <input
            {...register("phone", { required: true, minLength: 10 })}
            className="w-full rounded-lg border border-border px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
            placeholder="e.g. 0712345678"
          />
          {errors.phone && <p className="text-xs text-danger-600 mt-1.5">Phone is required</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-text-primary mb-1.5">
            Email <span className="text-text-tertiary font-normal">(optional)</span>
          </label>
          <input
            type="email"
            {...register("email")}
            className="w-full rounded-lg border border-border px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
            placeholder="e.g. jane@email.com"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-text-primary mb-1.5">Residency status</label>
        <Controller
          control={control}
          name="residency"
          render={({ field }) => (
            <div className="grid grid-cols-2 gap-2">
              {RESIDENCY_OPTIONS.map((opt) => (
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
        <p className="text-xs text-text-tertiary mt-1.5">
          Affects withholding tax treatment — non-resident landlords are withheld at a higher rate.
        </p>
      </div>

      <div className="border-t border-border pt-5">
        <p className="text-sm font-medium text-text-primary mb-3">Management fee</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">Fee basis</label>
            <select
              {...register("feeBasis")}
              className="w-full rounded-lg border border-border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
            >
              {FEE_BASIS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">
              {feeBasis === FeeBasis.FLAT_FEE ? "Amount (KES)" : "Percentage"}
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                {...register("feeValue", { required: true, valueAsNumber: true, min: 0 })}
                className="w-full rounded-lg border border-border px-3 py-2.5 pr-8 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-text-tertiary">
                {feeBasis === FeeBasis.FLAT_FEE ? "KES" : "%"}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-border pt-5">
        <p className="text-sm font-medium text-text-primary mb-3">
          Bank details <span className="text-text-tertiary font-normal">(optional, for disbursements)</span>
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input
            {...register("bankName")}
            placeholder="Bank name"
            className="rounded-lg border border-border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
          />
          <input
            {...register("bankAccountName")}
            placeholder="Account name"
            className="rounded-lg border border-border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
          />
          <input
            {...register("bankAccountNumber")}
            placeholder="Account number"
            className="col-span-2 rounded-lg border border-border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
          />
        </div>
      </div>

      <label className="flex items-center gap-2.5 cursor-pointer">
        <input
          type="checkbox"
          {...register("isVatRegistered")}
          className="h-4 w-4 rounded border-border-strong text-brand-600 focus:ring-brand-500/30"
        />
        <span className="text-sm text-text-primary">
          VAT registered <span className="text-text-tertiary">(commercial rent ≥ KES 5M/year)</span>
        </span>
      </label>

      {formError && (
        <div className="flex items-center gap-2 bg-danger-50 text-danger-600 text-sm rounded-lg px-3.5 py-2.5">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {formError}
        </div>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? (isEditMode ? "Saving..." : "Creating...") : isEditMode ? "Save changes" : "Add owner"}
        </Button>
      </div>
    </form>
  );
}
