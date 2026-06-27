import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { Plus, Trash2, AlertCircle } from "lucide-react";
import { PropertyType } from "@rmbs/shared";
import { fetchOwners } from "../../api/owners";
import { createProperty } from "../../api/properties";
import { Button } from "../../components/ui/Button";

interface FormValues {
  name: string;
  address: string;
  propertyType: PropertyType;
  camRatePerSqm?: number;
  owners: { ownerId: string; ownershipPercent: number }[];
}

const PROPERTY_TYPE_OPTIONS: { value: PropertyType; label: string }[] = [
  { value: PropertyType.RESIDENTIAL, label: "Residential" },
  { value: PropertyType.COMMERCIAL, label: "Commercial" },
  { value: PropertyType.MIXED_USE, label: "Mixed use" },
];

export function CreatePropertyForm({ onSuccess }: { onSuccess: () => void }) {
  const queryClient = useQueryClient();
  const [formError, setFormError] = useState<string | null>(null);

  const { data: owners } = useQuery({ queryKey: ["owners"], queryFn: fetchOwners });

  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      propertyType: PropertyType.RESIDENTIAL,
      owners: [{ ownerId: "", ownershipPercent: 100 }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "owners" });
  const watchedOwners = watch("owners");
  const propertyType = watch("propertyType");
  const ownershipTotal = watchedOwners?.reduce(
    (sum, o) => sum + (Number(o.ownershipPercent) || 0),
    0
  );

  const mutation = useMutation({
    mutationFn: createProperty,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["properties"] });
      onSuccess();
    },
    onError: (err) => setFormError(err instanceof Error ? err.message : "Failed to create property"),
  });

  function onSubmit(values: FormValues) {
    setFormError(null);
    if (Math.abs(ownershipTotal - 100) > 0.01) {
      setFormError(`Ownership percentages must sum to 100 — currently ${ownershipTotal}.`);
      return;
    }
    mutation.mutate({
      ...values,
      owners: values.owners.map((o) => ({
        ownerId: o.ownerId,
        ownershipPercent: Number(o.ownershipPercent),
      })),
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div>
        <label className="block text-sm font-medium text-text-primary mb-1.5">Property name</label>
        <input
          {...register("name", { required: true, minLength: 2 })}
          className="w-full rounded-lg border border-border px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
          placeholder="e.g. Riverside Apartments"
        />
        {errors.name && <p className="text-xs text-danger-600 mt-1.5">Property name is required</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-text-primary mb-1.5">Address</label>
        <input
          {...register("address", { required: true, minLength: 5 })}
          className="w-full rounded-lg border border-border px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
          placeholder="e.g. Ngong Road, Nairobi"
        />
        {errors.address && <p className="text-xs text-danger-600 mt-1.5">Address is required</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-text-primary mb-1.5">Property type</label>
        <Controller
          control={control}
          name="propertyType"
          render={({ field }) => (
            <div className="grid grid-cols-3 gap-2">
              {PROPERTY_TYPE_OPTIONS.map((opt) => (
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

      {(propertyType === PropertyType.COMMERCIAL || propertyType === PropertyType.MIXED_USE) && (
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1.5">
            CAM rate <span className="text-text-tertiary font-normal">(KES per sqm, optional)</span>
          </label>
          <input
            type="number"
            step="0.01"
            {...register("camRatePerSqm", { valueAsNumber: true, min: 0 })}
            className="w-full rounded-lg border border-border px-3.5 py-2.5 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
            placeholder="e.g. 25"
          />
          <p className="text-xs text-text-tertiary mt-1.5">
            Used to auto-calculate each commercial unit's Common Area Maintenance charge during
            billing. Leave blank if this property doesn't charge CAM.
          </p>
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="block text-sm font-medium text-text-primary">Owner(s)</label>
          <span
            className={`text-xs font-medium tabular-nums ${
              Math.abs(ownershipTotal - 100) > 0.01 ? "text-danger-600" : "text-positive-600"
            }`}
          >
            {ownershipTotal}% allocated
          </span>
        </div>

        <div className="space-y-2">
          {fields.map((field, index) => (
            <div key={field.id} className="flex gap-2">
              <select
                {...register(`owners.${index}.ownerId`, { required: true })}
                className="flex-1 rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
              >
                <option value="">Select owner...</option>
                {owners?.map((owner) => (
                  <option key={owner.id} value={owner.id}>
                    {owner.fullName}
                  </option>
                ))}
              </select>
              <div className="relative w-28">
                <input
                  type="number"
                  step="0.01"
                  {...register(`owners.${index}.ownershipPercent`, { required: true, valueAsNumber: true })}
                  className="w-full rounded-lg border border-border px-3 py-2 pr-7 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-text-tertiary">%</span>
              </div>
              {fields.length > 1 && (
                <button
                  type="button"
                  onClick={() => remove(index)}
                  className="text-text-tertiary hover:text-danger-600 p-2 rounded-lg hover:bg-danger-50 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={() => append({ ownerId: "", ownershipPercent: 0 })}
          className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-600"
        >
          <Plus className="h-3.5 w-3.5" /> Add co-owner
        </button>
      </div>

      {formError && (
        <div className="flex items-center gap-2 bg-danger-50 text-danger-600 text-sm rounded-lg px-3.5 py-2.5">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {formError}
        </div>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? "Creating..." : "Create property"}
        </Button>
      </div>
    </form>
  );
}
