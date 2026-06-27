import { z } from "zod";

// Business tenants (companies renting commercial units) need a
// registration number and KRA PIN; individual tenants need an ID/passport.
// Both share the same model row (isBusinessTenant flag distinguishes them)
// per the spec's Module 3 design, so this schema keeps both sets of fields
// optional and trusts the isBusinessTenant flag to guide which the UI asks for.
export const createTenantSchema = z.object({
  fullName: z.string().min(2),
  isBusinessTenant: z.boolean().default(false),
  idOrPassport: z.string().optional(),
  kraPin: z.string().optional(),
  businessRegistrationNumber: z.string().optional(),
  phone: z.string().min(10),
  email: z.string().email().optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
});

export const updateTenantSchema = createTenantSchema.partial().extend({
  isBlacklisted: z.boolean().optional(),
});

export type CreateTenantInput = z.infer<typeof createTenantSchema>;
export type UpdateTenantInput = z.infer<typeof updateTenantSchema>;
