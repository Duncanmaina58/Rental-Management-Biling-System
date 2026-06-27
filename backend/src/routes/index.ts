import { Router } from "express";
import { healthRouter } from "../modules/health/health.routes";
import { authRouter } from "../modules/auth/auth.routes";
import { ownerRouter } from "../modules/owners/owner.routes";
import { propertyRouter } from "../modules/properties/property.routes";
import { unitRouter } from "../modules/units/unit.routes";
import { tenantRouter } from "../modules/tenants/tenant.routes";
import { leaseRouter } from "../modules/leases/lease.routes";
import { billingRouter } from "../modules/billing/billing.routes";
import { paymentRouter } from "../modules/payments/payment.routes";
import { trustRouter } from "../modules/trust/trust.routes";
import { disbursementRouter } from "../modules/disbursements/disbursement.routes";
import { maintenanceRouter } from "../modules/maintenance/maintenance.routes";

// As each remaining module (Tax, Reports) is built, register its router
// here following the same pattern:
//   import { xRouter } from "../modules/x/x.routes";
//   apiRouter.use("/x", xRouter);

export const apiRouter = Router();

apiRouter.use("/health", healthRouter);
apiRouter.use("/auth", authRouter);
apiRouter.use("/owners", ownerRouter);
apiRouter.use("/properties", propertyRouter);
// unitRouter defines its own nested paths (/properties/:id/units, /units/:id)
// so it's mounted at the API root rather than under a fixed prefix.
apiRouter.use("/", unitRouter);
apiRouter.use("/tenants", tenantRouter);
apiRouter.use("/leases", leaseRouter);
// billingRouter defines /invoices and /invoices/bulk-generate internally.
apiRouter.use("/billing", billingRouter);
// paymentRouter defines /payments and /leases/:leaseId/outstanding-balance
// internally, so it's mounted at the API root rather than under a fixed prefix.
apiRouter.use("/", paymentRouter);
// trustRouter defines /trust/transactions and /trust/balances internally.
apiRouter.use("/", trustRouter);
// disbursementRouter defines /disbursements internally.
apiRouter.use("/", disbursementRouter);
// maintenanceRouter defines /maintenance-requests internally.
apiRouter.use("/", maintenanceRouter);
