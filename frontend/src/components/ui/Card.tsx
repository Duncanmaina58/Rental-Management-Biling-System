import { HTMLAttributes } from "react";

export function Card({ className = "", children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`bg-surface border border-border rounded-xl shadow-sm ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className = "", children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`px-5 py-4 border-b border-border ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardBody({ className = "", children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`px-5 py-4 ${className}`} {...props}>
      {children}
    </div>
  );
}

// A card with a colored left accent bar, used for KPI cards and grouped
// summaries where the bar color should encode the dominant status of the
// data inside (e.g. red bar = this property has overdue tenants).
export function AccentCard({
  accent = "brand",
  className = "",
  children,
  ...props
}: HTMLAttributes<HTMLDivElement> & { accent?: "brand" | "positive" | "warning" | "danger" }) {
  const accentBar: Record<string, string> = {
    brand: "before:bg-brand-500",
    positive: "before:bg-positive-500",
    warning: "before:bg-warning-500",
    danger: "before:bg-danger-500",
  };
  return (
    <div
      className={`relative bg-surface border border-border rounded-xl shadow-sm overflow-hidden
        before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[3px] ${accentBar[accent]}
        ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
