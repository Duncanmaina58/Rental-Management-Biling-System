import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, Controller } from "react-hook-form";
import { AlertCircle } from "lucide-react";
import { PropertyType } from "@rmbs/shared";
import { updateProperty, PropertyWithRelations } from "../../api/properties";
import { Button } from "../../components/ui/Button";

interface FormValues {
  name: string;
  address: string;
  propertyType: PropertyType;
  camRatePerSqm?: number;
}

const PROPERTY_TYPE_OPTIONS: { value: PropertyType; label: string }[] = [
  { value: PropertyType.RESIDENTIAL, label: "Residential" },
  { value: PropertyType.COMMERCIAL, label: "Commercial" },
  { value: PropertyType.MIXED_USE, label: "Mixed use" },
];

// Scoped deliberately to name/address/type — matches the backend's
// updatePropertySchema. Changing ownership splits is a separate, more
// sensitive operation (PUT /properties/:id/owners) with its own flow,
// not bundled into this form.
export function EditPropertyForm({
  property,
  onSuccess,
}: {
  property: PropertyWithRelations;
  onSuccess: () => void;
}) {
  const queryClient = useQueryClient();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      name: property.name,
      address: property.address,
      propertyType: property.propertyType as PropertyType,
      camRatePerSqm: property.camRatePerSqm ?? undefined,
    },
  });

  const propertyType = watch("propertyType");

  const mutation = useMutation({
    mutationFn: (values: FormValues) => updateProperty(property.id, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["properties"] });
      onSuccess();
    },
    onError: (err) => setFormError(err instanceof Error ? err.message : "Failed to update property"),
  });

  return (
    <form onSubmit={handleSubmit((values) => { setFormError(null); mutation.mutate(values); })} className="space-y-5">
      <div>
        <label className="block text-sm font-medium text-text-primary mb-1.5">Property name</label>
        <input
          {...register("name", { required: true, minLength: 2 })}
          className="w-full rounded-lg border border-border px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
        />
        {errors.name && <p className="text-xs text-danger-600 mt-1.5">Property name is required</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-text-primary mb-1.5">Address</label>
        <input
          {...register("address", { required: true, minLength: 5 })}
          className="w-full rounded-lg border border-border px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
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
        </div>
      )}

      <p className="text-xs text-text-tertiary">
        To change ownership split, use "Manage owners" from the property detail page instead.
      </p>

      {formError && (
        <div className="flex items-center gap-2 bg-danger-50 text-danger-600 text-sm rounded-lg px-3.5 py-2.5">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {formError}
        </div>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? "Saving..." : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
