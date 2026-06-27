import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, Controller } from "react-hook-form";
import { AlertCircle } from "lucide-react";
import { UnitClassification } from "@rmbs/shared";
import { UNIT_TYPE_METADATA, getUnitTypesForClassification } from "@rmbs/shared";
import { createUnit, CreateUnitPayload } from "../../api/properties";
import { Button } from "../../components/ui/Button";

interface FormValues {
  unitNumber: string;
  floor?: string;
  sizeSqm?: number;
  classification: UnitClassification;
  unitType: string;
  bedrooms?: number;
  hasParking: boolean;
  meterNumberWater?: string;
  meterNumberElectricity?: string;
}

const CLASSIFICATION_OPTIONS: { value: UnitClassification; label: string }[] = [
  { value: UnitClassification.RESIDENTIAL, label: "Residential" },
  { value: UnitClassification.COMMERCIAL, label: "Commercial" },
];

export function CreateUnitForm({
  propertyId,
  onSuccess,
}: {
  propertyId: string;
  onSuccess: () => void;
}) {
  const queryClient = useQueryClient();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      classification: UnitClassification.RESIDENTIAL,
      hasParking: false,
    },
  });

  const classification = watch("classification");
  const availableUnitTypes = getUnitTypesForClassification(classification);

  const mutation = useMutation({
    mutationFn: createUnit,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["units", propertyId] });
      queryClient.invalidateQueries({ queryKey: ["properties"] });
      onSuccess();
    },
    onError: (err) => setFormError(err instanceof Error ? err.message : "Failed to create unit"),
  });

  function onSubmit(values: FormValues) {
    setFormError(null);
    const payload: CreateUnitPayload = {
      propertyId,
      unitNumber: values.unitNumber,
      floor: values.floor || undefined,
      sizeSqm: values.sizeSqm ? Number(values.sizeSqm) : undefined,
      unitType: values.unitType,
      classification: values.classification,
      bedrooms: values.bedrooms ? Number(values.bedrooms) : undefined,
      hasParking: values.hasParking,
      meterNumberWater: values.meterNumberWater || undefined,
      meterNumberElectricity: values.meterNumberElectricity || undefined,
    };
    mutation.mutate(payload);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div>
        <label className="block text-sm font-medium text-text-primary mb-1.5">Classification</label>
        <Controller
          control={control}
          name="classification"
          render={({ field }) => (
            <div className="grid grid-cols-2 gap-2">
              {CLASSIFICATION_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    field.onChange(opt.value);
                    // Reset unitType when classification changes so a
                    // previously selected Shop doesn't survive a switch to
                    // Residential — that mismatch would feed the tax engine
                    // incorrect classification later.
                    setValue("unitType", "");
                  }}
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
          Drives which tax rules (MRI vs. VAT/withholding) apply to this unit's rent.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-text-primary mb-1.5">Unit type</label>
        <select
          {...register("unitType", { required: true })}
          className="w-full rounded-lg border border-border px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
        >
          <option value="">Select unit type...</option>
          {availableUnitTypes.map((type) => (
            <option key={type} value={type}>
              {UNIT_TYPE_METADATA[type].label}
            </option>
          ))}
        </select>
        {errors.unitType && <p className="text-xs text-danger-600 mt-1.5">Unit type is required</p>}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1.5">Unit number</label>
          <input
            {...register("unitNumber", { required: true })}
            className="w-full rounded-lg border border-border px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
            placeholder="e.g. A-12"
          />
          {errors.unitNumber && <p className="text-xs text-danger-600 mt-1.5">Required</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1.5">
            Floor <span className="text-text-tertiary font-normal">(optional)</span>
          </label>
          <input
            {...register("floor")}
            className="w-full rounded-lg border border-border px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
            placeholder="e.g. Ground"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1.5">
            Size (sqm) <span className="text-text-tertiary font-normal">(optional)</span>
          </label>
          <input
            type="number"
            step="0.01"
            {...register("sizeSqm", { valueAsNumber: true, min: 0.01 })}
            className="w-full rounded-lg border border-border px-3.5 py-2.5 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
            placeholder="e.g. 65"
          />
          <p className="text-xs text-text-tertiary mt-1">Used for CAM allocation & per-sqm rent.</p>
        </div>
        {classification === UnitClassification.RESIDENTIAL && (
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">
              Bedrooms <span className="text-text-tertiary font-normal">(optional)</span>
            </label>
            <input
              type="number"
              {...register("bedrooms", { valueAsNumber: true, min: 0 })}
              className="w-full rounded-lg border border-border px-3.5 py-2.5 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
              placeholder="e.g. 2"
            />
          </div>
        )}
      </div>

      <div className="border-t border-border pt-5">
        <p className="text-sm font-medium text-text-primary mb-3">
          Meter numbers <span className="text-text-tertiary font-normal">(optional)</span>
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input
            {...register("meterNumberWater")}
            placeholder="Water meter no."
            className="rounded-lg border border-border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
          />
          <input
            {...register("meterNumberElectricity")}
            placeholder="Electricity meter no."
            className="rounded-lg border border-border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
          />
        </div>
      </div>

      <label className="flex items-center gap-2.5 cursor-pointer">
        <input
          type="checkbox"
          {...register("hasParking")}
          className="h-4 w-4 rounded border-border-strong text-brand-600 focus:ring-brand-500/30"
        />
        <span className="text-sm text-text-primary">Has a dedicated parking bay</span>
      </label>

      {formError && (
        <div className="flex items-center gap-2 bg-danger-50 text-danger-600 text-sm rounded-lg px-3.5 py-2.5">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {formError}
        </div>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? "Creating..." : "Add unit"}
        </Button>
      </div>
    </form>
  );
}
