import {
  PropertyType, UnitType, UnitClassification, UnitStatus,
  LeaseStatus, RentBasis, BillingCycle, InvoiceStatus, ChargeType,
  PaymentMethod, PaymentStatus, OwnerResidency, FeeBasis,
  TrustTransactionType, DisbursementStatus, MaintenanceStatus, UserRole,
} from "./enums.js";

// Base fields every entity carries.
export interface BaseEntity {
  id: string; // UUID
  createdAt: string; // ISO date string over the wire
  updatedAt: string;
}

// ---------- Module 1: Company, Owner & Property ----------

export interface Company extends BaseEntity {
  name: string;
  kraPin: string;
  address: string;
  logoUrl?: string;
  defaultCurrency: string; // "KES"
}

export interface Owner extends BaseEntity {
  companyId: string;
  fullName: string;
  idOrPassport: string;
  kraPin?: string;
  phone: string;
  email?: string;
  residency: OwnerResidency;
  bankAccountName?: string;
  bankAccountNumber?: string;
  bankName?: string;
  feeBasis: FeeBasis;
  feeValue: number; // percentage (0-100) or flat KES amount depending on feeBasis
  isVatRegistered: boolean;
}

export interface Property extends BaseEntity {
  companyId: string;
  name: string;
  address: string;
  propertyType: PropertyType;
  camRatePerSqm?: number;
  latitude?: number;
  longitude?: number;
}

export interface PropertyOwner extends BaseEntity {
  propertyId: string;
  ownerId: string;
  ownershipPercent: number; // supports co-owned properties, sums to 100 per property
}

// ---------- Module 2: Unit & Lease ----------

export interface Unit extends BaseEntity {
  propertyId: string;
  unitNumber: string;
  floor?: string;
  sizeSqm?: number;
  unitType: UnitType;
  classification: UnitClassification;
  status: UnitStatus;
  bedrooms?: number;
  hasParking: boolean;
  meterNumberWater?: string;
  meterNumberElectricity?: string;
}

export interface Lease extends BaseEntity {
  unitId: string;
  primaryTenantId: string;
  status: LeaseStatus;
  startDate: string;
  endDate?: string; // null/undefined = month-to-month
  rentBasis: RentBasis;
  rentAmount: number; // flat amount, or rate per sqm/sqft depending on rentBasis
  billingCycle: BillingCycle;
  depositAmount: number;
  escalationPercent?: number; // e.g. 5 = +5% per annum
  escalationFrequencyMonths?: number; // typically 12
  noticePeriodDays: number;
}

export interface LeaseTenant extends BaseEntity {
  leaseId: string;
  tenantId: string;
  isPrimary: boolean;
  liabilitySharePercent?: number;
}

// ---------- Module 3: Tenant ----------

export interface Tenant extends BaseEntity {
  companyId: string;
  fullName: string; // or business name for commercial tenants
  isBusinessTenant: boolean;
  idOrPassport?: string;
  kraPin?: string;
  businessRegistrationNumber?: string;
  phone: string;
  email?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  isBlacklisted: boolean;
}

// ---------- Module 4: Billing ----------

export interface Invoice extends BaseEntity {
  leaseId: string;
  invoiceNumber: string;
  status: InvoiceStatus;
  issueDate: string;
  dueDate: string;
  periodStart: string;
  periodEnd: string;
  subtotal: number;
  vatAmount: number;
  totalAmount: number;
  amountPaid: number;
}

export interface InvoiceLineItem extends BaseEntity {
  invoiceId: string;
  chargeType: ChargeType;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

// ---------- Module 5: Payments ----------

export interface Payment extends BaseEntity {
  leaseId: string;
  tenantId: string;
  method: PaymentMethod;
  status: PaymentStatus;
  amount: number;
  reference?: string; // M-Pesa code, cheque number, bank ref
  paidAt: string;
  recordedByUserId: string;
}

export interface PaymentAllocation extends BaseEntity {
  paymentId: string;
  invoiceId: string;
  amountAllocated: number;
}

// ---------- Module 6: Trust Accounting ----------

export interface TrustTransaction extends BaseEntity {
  type: TrustTransactionType;
  amount: number; // positive = inflow to trust, negative = outflow
  ownerId?: string;
  tenantId?: string;
  leaseId?: string;
  relatedPaymentId?: string;
  relatedDisbursementId?: string;
  description: string;
  postedByUserId: string;
  isReversal: boolean;
  reversesTransactionId?: string;
}

// ---------- Module 7: Owner Disbursements ----------

export interface Disbursement extends BaseEntity {
  ownerId: string;
  periodStart: string;
  periodEnd: string;
  grossRentCollected: number;
  managementFee: number;
  expensesDeducted: number;
  withholdingTaxDeducted: number;
  netPayable: number;
  status: DisbursementStatus;
  approvedByUserId?: string;
  paidOutAt?: string;
  payoutReference?: string;
}

// ---------- Module 8: Tax Compliance ----------

export interface TaxParameter extends BaseEntity {
  key: string; // e.g. "MRI_RATE", "WITHHOLDING_RATE_RESIDENT", "VAT_RATE"
  value: number;
  effectiveFrom: string;
  effectiveTo?: string;
  description: string;
}

export interface MriRecord extends BaseEntity {
  ownerId: string;
  propertyId: string;
  periodMonth: string; // "2026-06"
  grossRentReceived: number;
  taxRateApplied: number;
  taxDue: number;
  isNilReturn: boolean;
  filedAt?: string;
}

// ---------- Module 9: Maintenance ----------

export interface MaintenanceRequest extends BaseEntity {
  unitId: string;
  raisedByTenantId?: string;
  raisedByUserId?: string;
  status: MaintenanceStatus;
  title: string;
  description: string;
  photoUrls: string[];
  assignedToUserId?: string;
  assignedVendorName?: string;
  cost?: number;
}

// ---------- Module 12: Users ----------

export interface User extends BaseEntity {
  companyId: string;
  email: string;
  fullName: string;
  role: UserRole;
  isActive: boolean;
  ownerId?: string; // set when role === OWNER
  tenantId?: string; // set when role === TENANT
}
