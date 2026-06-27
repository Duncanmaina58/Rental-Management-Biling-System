# Rental Management & Billing System (RMBS)

PERN stack (Postgres, Express, React, Node) with TypeScript end-to-end.
Built against the functional spec for a Kenya-based property management
company managing mixed residential & commercial portfolios for multiple
owners.

## Stack

| Layer | Choice |
|---|---|
| Database | PostgreSQL |
| ORM | Prisma |
| Backend | Node.js + Express + TypeScript |
| Frontend | React + Vite + TypeScript |
| Styling | Tailwind CSS |
| State (server) | TanStack Query |
| State (client) | Zustand |
| Forms | React Hook Form + Zod |
| Auth | JWT (bearer token) |

## Repo structure

```
rmbs/
├── backend/        Express API, Prisma schema & migrations
├── frontend/       Vite + React app
├── shared/         TypeScript types/enums/constants used by both
└── package.json    npm workspaces root
```

`shared` is published nowhere — it's a local workspace package
(`@rmbs/shared`) that backend and frontend both depend on, so a `Lease`,
`Invoice`, `Owner`, etc. mean exactly the same shape on both sides of the
API boundary.

## Prerequisites

- Node.js 20+
- PostgreSQL 15+ running locally or accessible via connection string
- npm 10+ (workspaces support)

## First-time setup

```bash
# 1. Install all workspace dependencies from the repo root
npm install

# 2. Build the shared package (backend & frontend both import its compiled output)
npm run build:shared

# 3. Set up backend environment
cp backend/.env.example backend/.env
# edit backend/.env — at minimum set DATABASE_URL and JWT_SECRET

# 4. Set up frontend environment (optional — defaults work with the dev proxy)
cp frontend/.env.example frontend/.env

# 5. Create the database (example using psql)
createdb rmbs_dev

# 6. Generate the Prisma client and run the first migration
cd backend
npx prisma generate
npx prisma migrate dev --name init

# 7. Seed initial data (company, admin user, Kenya tax parameters)
npm run db:seed
cd ..
```

> **Note on the Prisma step:** `prisma generate` and `prisma migrate dev`
> download a query-engine binary from Prisma's CDN on first run. This was
> the one step I could not execute inside the sandboxed environment I built
> this in (its network allowlist doesn't include Prisma's binary host), so
> run steps 6–7 for real on your machine — everything else (schema
> correctness, TypeScript types across all three packages) has already
> been verified to compile cleanly.

## Running in development

From the repo root, in two terminals:

```bash
npm run dev:backend    # http://localhost:4000
npm run dev:frontend   # http://localhost:5173
```

The frontend dev server proxies `/api/*` to the backend (see
`frontend/vite.config.ts`), so there's no CORS friction locally.

Default seeded login:

```
email:    admin@dunstar.co.ke
password: ChangeMe123!
```

Change this password immediately in any real deployment.

## What's scaffolded vs. what's next

**Scaffolded and working:**
- Full Prisma schema covering Modules 1–9 and 12 from the spec (Company,
  Owner, Property, Unit, Lease, Tenant, Invoice, Payment, Trust
  Transaction, Disbursement, Tax Parameter, MRI Record, Maintenance
  Request, User, Audit Log)
- Express app with security middleware (helmet, cors), structured error
  handling, Zod request validation, JWT auth, and role-based access
  control matching the spec's roles matrix
- **Owners — fully closed out**: list, create, edit, delete (guarded
  against deleting an owner who still has properties linked to them)
- **Properties & Units — closed out for the core flow**: list, create
  (with co-ownership % split validation), edit (name/address/type),
  delete (guarded against properties with units), property detail page,
  unit create (with classification-driven unit-type filtering)
- **Tenants — fully closed out**: list, create, edit, delete (guarded
  against deleting a tenant with lease history); individual vs. business
  tenant types with different required fields
- **Leases — create & list, the core flow**: creating a lease validates
  the unit is vacant and the tenant isn't blacklisted, then atomically
  flips the unit to OCCUPIED in the same transaction; ending a lease
  (status → TERMINATED/EXPIRED) flips the unit back to VACANT, also
  transactionally — unit status can never silently drift from lease
  reality. Co-tenancy (multiple tenants per lease) is supported in the
  schema and the create-lease API but not yet exposed in the form UI.
- React app with routing, protected routes, a Zustand auth store, a
  TanStack Query–backed API layer, and a full light/dark design system
  (see below)
- Database seed script loading the Kenya tax parameters (MRI rate,
  withholding tax rates, VAT rate/threshold) as configurable values

**Responsive infrastructure (new this round):** the app was originally
built desktop-only; this round added the real patterns rather than
one-off media queries:
- `components/AppLayout.tsx` — the sidebar is a fixed `lg:flex` panel on
  desktop and an off-canvas drawer (hamburger-triggered, backdrop-dismissed,
  slide-in animated) below `lg`. The topbar's search field collapses to
  icon-only below `sm`.
- `components/ui/ResponsiveTable.tsx` — a single column-config drives both
  a real `<table>` on desktop (`md` and up) and a stacked-card list on
  mobile (each row becomes a card with the title column up top and the
  rest as label/value pairs). Tenants and Leases use this; Owners and
  Properties still use the older raw-`<table>` pattern and were
  deliberately **not** retrofitted this round (your call) — migrate them
  to `ResponsiveTable` when convenient, it's a drop-in replacement for the
  `<table>` block in each page.
- Form grids (`grid-cols-2`/`grid-cols-3` for paired inputs) now collapse
  to a single column below `sm` where the content is real text input;
  short toggle-button selectors (residency, property type, classification)
  were deliberately left at fixed columns since short labels still fit
  comfortably narrow and stacking them would look worse, not better.

**Design system:** the UI runs on a real two-theme token system (light +
dark), not just default Tailwind. CSS variables in
`frontend/src/styles/theme.css` define every surface, border, text, and
status color for both themes; Tailwind's config (`tailwind.config.js`)
maps utility classes (`bg-surface`, `text-text-primary`, `bg-brand-500`,
etc.) onto those variables, so toggling `data-theme` on `<html>` repaints
the whole app instantly with no React re-render needed for color. The
toggle lives in `store/themeStore.ts` (Zustand, persisted) and a small
inline script in `index.html` applies the saved/system theme before React
even mounts, to avoid a flash of the wrong theme on load.

Two distinct accent colors carry different meaning rather than one accent
doing double duty: **violet** (`brand-*`) is the interactive/brand color —
primary buttons, active nav, links, focus rings. **Emerald**
(`positive-*`) is reserved exclusively for genuinely positive financial
states — paid, collected, active, approved. Amber and red carry the rest
of the financial status vocabulary (pending/attention, overdue/blocked).
Type pairs Inter (body/data, tabular figures for currency) with Lexend
(headings).

Reusable primitives live in `frontend/src/components/ui/` (Button, Card,
AccentCard, Modal, ConfirmDialog, RowActionsMenu, ResponsiveTable,
StatusPill, ThemeToggle, EmptyState, PageHeader, TableSkeleton).

**Honest limitation, still unresolved:** I still cannot get a real
screenshot of the rendered UI in this sandbox — Playwright/Chromium needs
system dependencies blocked by this environment's network policy, and
background dev/preview servers don't survive between separate tool
invocations here. Everything in this round was verified by code review,
a clean TypeScript compile across all three packages, and a real
`vite build` — but please look at the actual rendered mobile drawer and
ResponsiveTable behavior yourself, especially at a real phone width, since
I built it from reasoning about the CSS rather than seeing it render.

**Database migrations needed for this round:**
1. `Tenant` gained a required `companyId` field (it had none before — a
   real gap, since every other core entity is scoped to a company and
   Tenant wasn't).
2. `Property` gained an optional `camRatePerSqm` field (KES per sqm,
   nullable — null means "this property doesn't charge CAM"), used by the
   new Billing module to auto-calculate each commercial unit's Common
   Area Maintenance charge.

Run both in one go:
```
npx prisma migrate dev --name add_tenant_company_id_and_property_cam_rate
```
Since there's no seeded tenant data yet, this is safe; if you'd already
created tenants manually before this update, you'd need to backfill
`companyId` before the migration can apply its NOT NULL constraint.

**Billing — the first module that produces something to actually pay
(new this round):**
- **Rent** is calculated automatically from the lease's `rentAmount`, with
  real day-based pro-ration if the lease started or ended partway through
  the billing period — verified against five hand-checked scenarios
  (full-period, starts mid-period, ends mid-period, no overlap at all,
  starts-and-ends-within-period) since this is the trickiest math in the
  module so far.
- **CAM** is calculated automatically wherever the property has a
  `camRatePerSqm` set: `camRatePerSqm × unit.sizeSqm`. Set this on a
  commercial/mixed-use property via the property create/edit form — a new
  field that only appears for those property types.
- **Utilities** (water/electricity) are manual-entry per unit per billing
  run — per spec Module 4.2, meters aren't digitized yet, so a human
  keys in the amount during the bulk-generate flow. Leaving a unit's
  utility fields blank simply means no utility charge that cycle.
- **Bulk generation**: one form bills every ACTIVE lease for a chosen
  period in a single action, skipping (not erroring on) leases with
  nothing to bill or a duplicate-period invoice already on file — each
  lease's invoice is its own database transaction, so one bad lease in
  a 50-lease batch can't roll back the other 49.
- **Single invoice generation** (one-off ad-hoc charges like damage fees)
  exists on the backend (`POST /billing/invoices`) but has no frontend
  form yet — bulk generation was the priority this round since it's the
  common case.
- VAT is intentionally left at 0 on every invoice for now — that's
  Module 8's job (the tax engine), not Billing's; wiring them together
  is future work.

**Known scope gap, called out deliberately rather than left silent:**
editing a property's ownership split (co-owner percentages) is NOT yet
wired to the frontend — the backend endpoint exists
(`PUT /properties/:id/owners`), but there's no "Manage owners" UI on the
property detail page yet.

**Payments — closes the loop on Billing (new this round):**
- Recording a payment targets a **lease**, not a specific invoice — the
  service automatically allocates the amount across that lease's
  outstanding invoices **oldest-issue-date-first** (spec Module 5.2's
  "payment allocation order"), so the person recording a payment doesn't
  need to know or pick which invoice(s) it covers.
- **Partial payments**, **multi-invoice spillover** (one payment covering
  more than one unpaid invoice), and **overpayments** (excess left as
  visible unallocated credit, not force-applied anywhere) are all
  handled — verified against five hand-checked scenarios outside the app
  before trusting the logic, the same discipline used for Billing's
  pro-ration math.
- **Cash and cheque payments start PENDING**, not confirmed — per spec
  Module 5.1's approval-workflow guard against unrecorded cash leakage.
  They only get allocated against invoices once explicitly confirmed
  (a "Confirm" button appears on pending rows in the Payments list).
  M-Pesa, bank transfer, and card payments are trusted immediately since
  their reference number is independently checkable against a statement.
- The Record Payment form shows the selected lease's **live outstanding
  balance** before you even enter an amount, so whoever's recording the
  payment can see what's actually owed.
- Not yet built: the M-Pesa Daraja API integration itself (spec Module
  5.1) — payments are recorded manually for every method right now,
  including M-Pesa; auto-ingesting M-Pesa callbacks is a distinct,
  larger integration left for later.

**Schema fix this round:** `TrustTransaction.relatedPaymentId` had an
incorrect `@unique` constraint (and `Payment.trustTxn` was modeled as a
singular optional relation to match). In reality, one payment's
allocations can span multiple invoices, each potentially containing rent
— so a single payment can legitimately produce more than one trust
transaction. Caught and fixed before any real data existed: the
constraint is dropped and the relation is now `Payment.trustTxns:
TrustTransaction[]`.

**Trust Accounting — the module you flagged as a legal requirement (new
this round):**
- **Append-only, enforced in code, not just convention**: there is no
  update or delete path anywhere in the trust service for an existing
  transaction. The only way to correct one is `reverseTrustTransaction`,
  which posts a brand-new entry with the inverse amount and a pointer
  back to what it reverses (`reversesTransactionId`) — both rows stay on
  the ledger forever. The frontend's "Reverse" action requires typing a
  reason before it'll submit.
- **Posting is automatic, triggered by Payments**: every time a payment
  allocation is created (in the same database transaction as the
  allocation itself — see Payments module), the trust service inspects
  that invoice's line items and posts a trust entry for whatever
  proportion of the allocated amount was rent or deposit money. Utility,
  CAM, and late-fee charges are deliberately NOT posted to trust — in
  standard Kenyan property management practice these are typically
  pass-through or company operating revenue, not owner funds requiring
  ring-fencing. A mixed invoice (e.g. rent + CAM) correctly posts only
  the rent's proportional share, even under a partial payment — verified
  against four hand-checked scenarios (rent-only, mixed-charge partial
  payment, co-owned property split, utility-only invoice posting
  nothing) before trusting the logic.
- **Co-owned properties split automatically** by ownership percentage —
  a 60/40-owned property's rent posts as two separate trust transactions,
  one per owner, so each owner's sub-ledger balance stays individually
  attributable (required for the reconciliation report to mean anything
  once a property has more than one owner).
- **Trust & Tax page is Finance/Admin-only**, matching the backend
  restriction exactly — Property Managers, Owners, and Tenants get
  redirected away from `/tax` even if they guess the URL, per spec
  Module 6.3's explicit role restriction on who can see or touch the
  trust ledger.
- The page is titled "Trust & Tax" (matching the existing sidebar nav
  item) but **only Trust content exists right now** — the Tax half
  (Module 8: MRI/withholding/VAT) hasn't been built yet, so don't expect
  tax figures here yet.
- Not yet built: the actual bank-account reconciliation step (comparing
  the sum of trust balances against a real bank statement) — the
  `/trust/balances` endpoint gives you the ledger's view of what should
  be in the trust account, but nothing cross-checks it against an actual
  bank feed yet.

**Disbursements — owner payouts, net of fee and withholding tax (new
this round):**
- **Preview before commit**: calculating a disbursement is a separate,
  read-only step from creating one — pick an owner and period, see the
  gross/fee/withholding/net numbers, and only then decide to actually
  create it. Both the preview and the real creation call the exact same
  calculation function internally, so what you previewed is guaranteed
  to match what gets created — there's no second code path that could
  silently compute something different.
- **Gross rent collected comes from the Trust ledger**, not from
  invoices — specifically, the sum of that owner's `RENT_RECEIVED` (and
  any `REVERSAL`) trust transactions in the period. This is deliberate:
  disbursement is about money actually confirmed and held in trust, not
  money merely billed.
- **Withholding tax uses the seeded Kenya tax parameters** (resident vs.
  non-resident rate) automatically based on the owner's residency flag —
  the same `TaxParameter` table seeded back when the project was first
  scaffolded.
- **A real bug caught by hand-verification before it shipped**: a flat-fee
  owner with low rent collected that period could produce a *negative*
  net payable once withholding tax was added on top of a fee already
  capped at the gross amount — nonsensical, since you can't disburse
  negative money to anyone. Fixed by clamping net payable to zero when
  combined deductions would exceed what was actually collected, rather
  than letting the number go negative. Caught this the same way as every
  other module's math this build: hand-checking concrete scenarios
  outside the app before trusting the logic, not just relying on it
  compiling.
- **Approval is a separate, explicit step from creation**, matching spec
  Module 7.2's approval workflow — a disbursement sits as
  `PENDING_APPROVAL` until a Finance/Admin user explicitly approves it
  (or holds it). Approval is the moment three trust outflows get posted
  in one transaction: the net payout to the owner, the withholding tax
  remitted (on the owner's behalf, to KRA), and the management fee
  earned (the company's own revenue leaving the pooled trust account) —
  all three append-only, all reversible only via the Trust module's
  reversal mechanism, never edited directly.
- **Known simplification, called out rather than hidden**: management
  fee basis `PERCENT_OF_BILLED` and `PERCENT_OF_COLLECTED` currently
  compute identically, since the only figure available at disbursement
  time is rent actually collected via trust transactions — there's no
  separate "billed but not yet collected" figure being tracked yet to
  make those two bases genuinely different. Worth revisiting once
  arrears tracking exists.
- Expenses (maintenance costs deducted from an owner's payout) **are now
  real** — see the Maintenance module below, built this round
  specifically to fill in what was an honest zero last round.

**Maintenance — closes the loop on Disbursements' expense field (new
this round):**
- A request moves through OPEN → ASSIGNED → IN_PROGRESS → COMPLETED →
  CLOSED. The only transition actively blocked is reopening a CLOSED
  request — that should be a new request instead, per spec Module 9.1.
- **Recording a cost is its own deliberate action**, separate from the
  general status-update endpoint, because it does something with real
  financial consequence: it posts an `EXPENSE_PAID` trust transaction
  against the unit's property owner(s) — split proportionally by
  ownership percentage for co-owned properties, the exact same pattern
  Trust Accounting already uses for rent. Restricted to Admin/Property
  Manager specifically (tighter than general status updates, which
  Caretakers can also do) since it touches the trust ledger.
- **This is what makes Disbursement's `expensesDeducted` field real.**
  Disbursement's calculation now sums `EXPENSE_PAID` trust transactions
  for the owner/period the same way it already summed `RENT_RECEIVED` —
  verified by hand (single-owner cost, 60/40 co-owned split, and
  confirming the disbursement correctly re-sums each owner's own
  share-only) before trusting it, same discipline as every other
  module's money math this build.
- **A real, latent bug in Disbursements caught and fixed while building
  this**: the original disbursement calculation summed every `REVERSAL`
  transaction into "gross rent collected" regardless of what that
  reversal actually corrected — meaning a reversal of an *expense* or
  any other transaction type would have been incorrectly added to rent
  income. Fixed by tracing each reversal back to its original
  transaction's type via `reversesTransactionId` and only counting
  reversals that actually reversed a `RENT_RECEIVED` entry. This is
  exactly the kind of bug that wouldn't show up until a reversal was
  posted against something other than rent — worth knowing it's fixed
  now, before any real reversal of an expense happens in practice.
- Tenants can raise their own requests (matching spec Module 9.1's
  tenant-facing intent), but can't assign, advance status, or record
  cost — that's staff territory.

**Not yet built (next modules, following the same pattern):**
- Single/ad-hoc invoice creation UI (backend route exists, no frontend form)
- M-Pesa Daraja API integration for automatic payment ingestion (payments
  are recorded manually today, including M-Pesa ones)
- Tax engine logic beyond what Disbursements already uses (MRI tax
  specifically — Monthly Rental Income — isn't calculated anywhere yet;
  only the withholding-tax piece of Module 8 is wired up so far, inside
  Disbursements)
- Vendor management, preventive maintenance scheduling, and work-order
  assignment beyond a single `assignedVendorName` text field (spec
  Module 9.2's fuller vendor directory isn't built)
- Reporting/dashboards beyond the placeholder KPI cards
- Tenant & Owner self-service portals
- Co-tenancy UI (the schema/API support multiple tenants per lease;
  the create-lease form only captures the primary tenant so far)
- Lease detail page / lease termination UI (status updates exist on the
  backend via PATCH but there's no frontend button to call it yet)
- Invoice detail view (the list shows totals; there's no drill-down to
  see an invoice's individual line items yet)

## Module build pattern

Every backend module follows the same four files, demonstrated in
`backend/src/modules/owners/` and `backend/src/modules/properties/`:

```
modules/<name>/
├── <name>.schema.ts      Zod input validation
├── <name>.service.ts     Business logic + Prisma queries
├── <name>.controller.ts  Express req/res handlers (thin — calls service)
└── <name>.routes.ts      Router wiring auth/role middleware + validation
```

Register the new router in `backend/src/routes/index.ts`.

## A note on the `shared` package's module format

`shared` compiles to native ES modules (`"module": "ES2022"` in its
`tsconfig.json`, `"type": "module"` in its `package.json`), not CommonJS.
This matters and was the source of one real bug worth knowing about:

TypeScript's CommonJS output for `export * from "./x"` compiles to a
runtime `__exportStar` helper that copies properties via a `for...in`
loop. That pattern is invisible to Rollup's static analysis — Vite's
production build (`vite build`) could not resolve named imports like
`PropertyType` from `@rmbs/shared` even though `tsc` type-checked fine
and the dev server worked. Dev mode uses esbuild's looser, more dynamic
resolution and didn't surface it; only the actual production bundle did.
Native ESM output (`export * from "./x"` staying as real `export *`
syntax) fixed it, because Rollup can statically trace real ES exports.

**Lesson for future modules:** `tsc --noEmit` passing is necessary but
not sufficient. Always run the real `vite build` (not just typecheck)
after adding new exports to `shared` before considering a frontend
change done — type-checking and bundling can disagree.

If you ever add a new workspace package that other packages import,
default it to ESM (`"type": "module"`, `"module": "ES2022"` or
`"NodeNext"`) rather than CommonJS, for the same reason.

## Important reminders from the spec

- **Tax parameters are configurable, not hard-coded.** They live in the
  `TaxParameter` table and are seeded from `shared/src/constants/tax.ts`.
  Have a tax professional verify them before production go-live — KRA
  rates change via Finance Acts.
- **Trust accounting is append-only.** Never write code that updates or
  deletes a `TrustTransaction` row — corrections must be posted as a new
  reversing entry (`isReversal: true`, `reversesTransactionId` set).
- **Multi-tenancy boundary is `companyId`.** Every query in every service
  must filter by the requesting user's `companyId` (see `owner.service.ts`
  for the pattern) to prevent cross-company data leakage.

## Known dev-only vulnerability (low risk)

`npm audit` reports a moderate advisory in `esbuild`/`vite` (GHSA-67mh-4wv8-2f99):
a malicious website could send requests to your local Vite dev server while
it's running and read the response. This only affects `npm run dev`, never
a production build, and only matters if you're browsing untrusted sites
while the dev server happens to be running. Fixing it requires Vite 8,
which is a breaking jump we're deliberately not taking yet. Re-evaluate
before production deployment (production builds aren't affected either
way, since this is purely a dev-server behavior).
