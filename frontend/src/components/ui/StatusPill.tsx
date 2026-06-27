import {
  UnitStatus,
  LeaseStatus,
  InvoiceStatus,
  PaymentStatus,
  DisbursementStatus,
  MaintenanceStatus,
} from "@rmbs/shared";

type AnyStatus =
  | UnitStatus
  | LeaseStatus
  | InvoiceStatus
  | PaymentStatus
  | DisbursementStatus
  | MaintenanceStatus
  | string;

// One mapping drives every status pill app-wide. Emerald is reserved for
// genuinely settled/positive states — it never doubles as the brand color
// elsewhere in the UI, so when a user sees green here, it specifically
// means "money has landed" or "this is active and healthy."
const STATUS_STYLES: Record<string, { bg: string; text: string; dot: string }> = {
  PAID: { bg: "bg-positive-50", text: "text-positive-700", dot: "bg-positive-500" },
  ACTIVE: { bg: "bg-positive-50", text: "text-positive-700", dot: "bg-positive-500" },
  CONFIRMED: { bg: "bg-positive-50", text: "text-positive-700", dot: "bg-positive-500" },
  COMPLETED: { bg: "bg-positive-50", text: "text-positive-700", dot: "bg-positive-500" },
  CLOSED: { bg: "bg-positive-50", text: "text-positive-700", dot: "bg-positive-500" },
  OCCUPIED: { bg: "bg-positive-50", text: "text-positive-700", dot: "bg-positive-500" },
  APPROVED: { bg: "bg-positive-50", text: "text-positive-700", dot: "bg-positive-500" },
  PAID_OUT: { bg: "bg-positive-50", text: "text-positive-700", dot: "bg-positive-500" },
  RENEWED: { bg: "bg-positive-50", text: "text-positive-700", dot: "bg-positive-500" },

  PARTIALLY_PAID: { bg: "bg-warning-50", text: "text-warning-600", dot: "bg-warning-500" },
  PENDING: { bg: "bg-warning-50", text: "text-warning-600", dot: "bg-warning-500" },
  PENDING_APPROVAL: { bg: "bg-warning-50", text: "text-warning-600", dot: "bg-warning-500" },
  EXPIRING_SOON: { bg: "bg-warning-50", text: "text-warning-600", dot: "bg-warning-500" },
  RESERVED: { bg: "bg-warning-50", text: "text-warning-600", dot: "bg-warning-500" },
  IN_PROGRESS: { bg: "bg-warning-50", text: "text-warning-600", dot: "bg-warning-500" },
  ASSIGNED: { bg: "bg-warning-50", text: "text-warning-600", dot: "bg-warning-500" },
  UNDER_MAINTENANCE: { bg: "bg-warning-50", text: "text-warning-600", dot: "bg-warning-500" },
  CALCULATED: { bg: "bg-warning-50", text: "text-warning-600", dot: "bg-warning-500" },

  OVERDUE: { bg: "bg-danger-50", text: "text-danger-600", dot: "bg-danger-500" },
  FAILED: { bg: "bg-danger-50", text: "text-danger-600", dot: "bg-danger-500" },
  REVERSED: { bg: "bg-danger-50", text: "text-danger-600", dot: "bg-danger-500" },
  TERMINATED: { bg: "bg-danger-50", text: "text-danger-600", dot: "bg-danger-500" },
  EXPIRED: { bg: "bg-danger-50", text: "text-danger-600", dot: "bg-danger-500" },
  HELD: { bg: "bg-danger-50", text: "text-danger-600", dot: "bg-danger-500" },
  CANCELLED: { bg: "bg-danger-50", text: "text-danger-600", dot: "bg-danger-500" },
  OPEN: { bg: "bg-danger-50", text: "text-danger-600", dot: "bg-danger-500" },

  DRAFT: { bg: "bg-neutral-chip-bg", text: "text-neutral-chip-text", dot: "bg-text-tertiary" },
  VACANT: { bg: "bg-neutral-chip-bg", text: "text-neutral-chip-text", dot: "bg-text-tertiary" },
  ISSUED: { bg: "bg-neutral-chip-bg", text: "text-neutral-chip-text", dot: "bg-text-tertiary" },
  CREDITED: { bg: "bg-neutral-chip-bg", text: "text-neutral-chip-text", dot: "bg-text-tertiary" },
};

function formatLabel(status: string) {
  return status
    .toLowerCase()
    .split("_")
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");
}

export function StatusPill({ status }: { status: AnyStatus }) {
  const style = STATUS_STYLES[status] ?? STATUS_STYLES.DRAFT;
  return (
    <span className={`status-pill ${style.bg} ${style.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
      {formatLabel(status)}
    </span>
  );
}
