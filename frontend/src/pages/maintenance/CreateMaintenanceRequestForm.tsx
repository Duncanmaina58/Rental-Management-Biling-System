import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { AlertCircle } from "lucide-react";
import { fetchAllUnits } from "../../api/leases";
import { createMaintenanceRequest, CreateMaintenanceRequestPayload } from "../../api/maintenance";
import { Button } from "../../components/ui/Button";

type FormValues = Omit<CreateMaintenanceRequestPayload, "photoUrls">;

export function CreateMaintenanceRequestForm({ onSuccess }: { onSuccess: () => void }) {
  const queryClient = useQueryClient();
  const [formError, setFormError] = useState<string | null>(null);

  const { data: units, isLoading: unitsLoading } = useQuery({
    queryKey: ["units", "all"],
    queryFn: fetchAllUnits,
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>();

  const mutation = useMutation({
    mutationFn: (values: FormValues) =>
      createMaintenanceRequest({ ...values, photoUrls: [] }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["maintenance-requests"] });
      onSuccess();
    },
    onError: (err) => setFormError(err instanceof Error ? err.message : "Failed to raise request"),
  });

  if (unitsLoading) {
    return <p className="text-sm text-text-secondary">Loading units...</p>;
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
        <label className="block text-sm font-medium text-text-primary mb-1.5">Unit</label>
        <select
          {...register("unitId", { required: true })}
          className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
        >
          <option value="">Select a unit...</option>
          {units?.map((unit) => (
            <option key={unit.id} value={unit.id}>
              {unit.property.name} — {unit.unitNumber}
            </option>
          ))}
        </select>
        {errors.unitId && <p className="text-xs text-danger-600 mt-1.5">Required</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-text-primary mb-1.5">Title</label>
        <input
          {...register("title", { required: true, minLength: 2 })}
          className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
          placeholder="e.g. Leaking kitchen tap"
        />
        {errors.title && <p className="text-xs text-danger-600 mt-1.5">Required</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-text-primary mb-1.5">Description</label>
        <textarea
          {...register("description", { required: true, minLength: 2 })}
          rows={3}
          className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
          placeholder="Describe the issue..."
        />
        {errors.description && <p className="text-xs text-danger-600 mt-1.5">Required</p>}
      </div>

      {formError && (
        <div className="flex items-center gap-2 bg-danger-50 text-danger-600 text-sm rounded-lg px-3.5 py-2.5">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {formError}
        </div>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? "Raising..." : "Raise request"}
        </Button>
      </div>
    </form>
  );
}
