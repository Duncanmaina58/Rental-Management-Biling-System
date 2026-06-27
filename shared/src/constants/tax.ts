// Default Kenya tax parameter keys & seed values.
// These are stored in the DB (TaxParameter table) as CONFIGURABLE values —
// this file only provides the keys (so backend/frontend agree on naming)
// and sensible defaults for initial seeding. Do not hard-code these in
// business logic; always read from the TaxParameter table at runtime.
// See spec Module 8 — rates are revised periodically via Finance Acts and
// must be verified with a tax professional before go-live.

export const TAX_PARAM_KEYS = {
  MRI_RATE: "MRI_RATE",
  MRI_MIN_ANNUAL_INCOME: "MRI_MIN_ANNUAL_INCOME",
  MRI_MAX_ANNUAL_INCOME: "MRI_MAX_ANNUAL_INCOME",
  WITHHOLDING_RATE_RESIDENT: "WITHHOLDING_RATE_RESIDENT",
  WITHHOLDING_RATE_NON_RESIDENT: "WITHHOLDING_RATE_NON_RESIDENT",
  VAT_RATE: "VAT_RATE",
  VAT_REGISTRATION_THRESHOLD_ANNUAL: "VAT_REGISTRATION_THRESHOLD_ANNUAL",
} as const;

export const TAX_PARAM_DEFAULTS: Record<string, number> = {
  [TAX_PARAM_KEYS.MRI_RATE]: 7.5, // percent
  [TAX_PARAM_KEYS.MRI_MIN_ANNUAL_INCOME]: 288000, // KES
  [TAX_PARAM_KEYS.MRI_MAX_ANNUAL_INCOME]: 15000000, // KES
  [TAX_PARAM_KEYS.WITHHOLDING_RATE_RESIDENT]: 10, // percent
  [TAX_PARAM_KEYS.WITHHOLDING_RATE_NON_RESIDENT]: 30, // percent
  [TAX_PARAM_KEYS.VAT_RATE]: 16, // percent
  [TAX_PARAM_KEYS.VAT_REGISTRATION_THRESHOLD_ANNUAL]: 5000000, // KES
};

export const DEFAULT_CURRENCY = "KES";

export const PAGINATION_DEFAULTS = {
  PAGE: 1,
  PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
};
