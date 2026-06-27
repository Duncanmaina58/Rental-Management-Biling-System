import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";
import { AlertCircle } from "lucide-react";
import { Tenant } from "@rmbs/shared";
import { createTenant, updateTenant, CreateTenantPayload } from "../../api/tenants";
import { Button } from "../../components/ui/Button";

type FormValues = CreateTenantPayload;

interface TenantFormProps {
  tenant?: Tenant;
  onSuccess: () => void;
}

export function TenantForm({ tenant, onSuccess }: TenantFormProps) {
  const isEditMode = Boolean(tenant);
  const queryClient = useQueryClient();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: tenant
      ? {
          fullName: tenant.fullName,
          isBusinessTenant: tenant.isBusinessTenant,
          idOrPassport: tenant.idOrPassport ?? undefined,
          kraPin: tenant.kraPin ?? undefined,
          businessRegistrationNumber: tenant.businessRegistrationNumber ?? undefined,
          phone: tenant.phone,
          email: tenant.email ?? undefined,
          emergencyContactName: tenant.emergencyContactName ?? undefined,
          emergencyContactPhone: tenant.emergencyContactPhone ?? undefined,
        }
      : { isBusinessTenant: false },
  });

  const isBusinessTenant = watch("isBusinessTenant");

  const mutation = useMutation({
    mutationFn: (values: FormValues) =>
      isEditMode ? updateTenant(tenant!.id, values) : createTenant(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenants"] });
      onSuccess();
    },
    onError: (err) =>
      setFormError(
        err instanceof Error ? err.message : `Failed to ${isEditMode ? "update" : "create"} tenant`
      ),
  });

  function onSubmit(values: FormValues) {
    setFormError(null);
    mutation.mutate({
      ...values,
      idOrPassport: values.idOrPassport || undefined,
      kraPin: values.kraPin || undefined,
      businessRegistrationNumber: values.businessRegistrationNumber || undefined,
      email: values.email || undefined,
      emergencyContactName: values.emergencyContactName || undefined,
      emergencyContactPhone: values.emergencyContactPhone || undefined,
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div>
        <label className="block text-sm font-medium text-text-primary mb-1.5">Tenant type</label>
        <Controller
          control={control}
          name="isBusinessTenant"
          render={({ field }) => (
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => field.onChange(false)}
                className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                  !field.value
                    ? "border-brand-500 bg-brand-50 text-brand-600"
                    : "border-border text-text-secondary hover:bg-surface-sunken"
                }`}
              >
                Individual
              </button>
              <button
                type="button"
                onClick={() => field.onChange(true)}
                className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                  field.value
                    ? "border-brand-500 bg-brand-50 text-brand-600"
                    : "border-border text-text-secondary hover:bg-surface-sunken"
                }`}
              >
                Business
              </button>
            </div>
          )}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-text-primary mb-1.5">
          {isBusinessTenant ? "Business name" : "Full name"}
        </label>
        <input
          {...register("fullName", { required: true, minLength: 2 })}
          className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
          placeholder={isBusinessTenant ? "e.g. Acme Traders Ltd" : "e.g. John Mwangi"}
        />
        {errors.fullName && <p className="text-xs text-danger-600 mt-1.5">Required</p>}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1.5">Phone</label>
          <input
            {...register("phone", { required: true, minLength: 10 })}
            className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
            placeholder="e.g. 0712345678"
          />
          {errors.phone && <p className="text-xs text-danger-600 mt-1.5">Required</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1.5">
            Email <span className="text-text-tertiary font-normal">(optional)</span>
          </label>
          <input
            type="email"
            {...register("email")}
            className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
          />
        </div>
      </div>

      {isBusinessTenant ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">
              Registration No. <span className="text-text-tertiary font-normal">(optional)</span>
            </label>
            <input
              {...register("businessRegistrationNumber")}
              className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">
              KRA PIN <span className="text-text-tertiary font-normal">(optional)</span>
            </label>
            <input
              {...register("kraPin")}
              className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
            />
          </div>
        </div>
      ) : (
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1.5">
            ID / Passport No. <span className="text-text-tertiary font-normal">(optional)</span>
          </label>
          <input
            {...register("idOrPassport")}
            className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
          />
        </div>
      )}

      <div className="border-t border-border pt-5">
        <p className="text-sm font-medium text-text-primary mb-3">
          Emergency contact <span className="text-text-tertiary font-normal">(optional)</span>
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input
            {...register("emergencyContactName")}
            placeholder="Contact name"
            className="rounded-lg border border-border bg-surface px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
          />
          <input
            {...register("emergencyContactPhone")}
            placeholder="Contact phone"
            className="rounded-lg border border-border bg-surface px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
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
          {mutation.isPending ? (isEditMode ? "Saving..." : "Creating...") : isEditMode ? "Save changes" : "Add tenant"}
        </Button>
      </div>
    </form>
  );
}
