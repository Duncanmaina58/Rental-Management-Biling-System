import { TrendingUp, Wallet, AlertTriangle, Wrench } from "lucide-react";
import { useAuthStore } from "../../store/authStore";
import { PageHeader } from "../../components/ui/PageHeader";
import { AccentCard, CardBody } from "../../components/ui/Card";

interface Kpi {
  label: string;
  value: string;
  icon: typeof TrendingUp;
  accent: "brand" | "positive" | "warning" | "danger";
  iconBg: string;
  iconColor: string;
}

const kpis: Kpi[] = [
  {
    label: "Occupancy rate",
    value: "—",
    icon: TrendingUp,
    accent: "brand",
    iconBg: "bg-brand-50",
    iconColor: "text-brand-500",
  },
  {
    label: "Collection rate (MTD)",
    value: "—",
    icon: Wallet,
    accent: "positive",
    iconBg: "bg-positive-50",
    iconColor: "text-positive-600",
  },
  {
    label: "Total arrears",
    value: "—",
    icon: AlertTriangle,
    accent: "danger",
    iconBg: "bg-danger-50",
    iconColor: "text-danger-600",
  },
  {
    label: "Open maintenance",
    value: "—",
    icon: Wrench,
    accent: "warning",
    iconBg: "bg-warning-50",
    iconColor: "text-warning-600",
  },
];

export function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const firstName = user?.fullName?.split(" ")[0];

  return (
    <div className="flex-1 overflow-y-auto">
      <PageHeader
        title={`Welcome back, ${firstName ?? ""}`}
        description="Portfolio snapshot across every property and owner you manage."
      />

      <div className="p-8 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {kpis.map((kpi) => (
            <AccentCard key={kpi.label} accent={kpi.accent}>
              <CardBody className="pl-6">
                <div className={`h-9 w-9 rounded-lg ${kpi.iconBg} flex items-center justify-center mb-3`}>
                  <kpi.icon className={`h-4.5 w-4.5 ${kpi.iconColor}`} strokeWidth={2} />
                </div>
                <p className="text-2xl font-semibold text-text-primary tabular-nums tracking-tight font-display">
                  {kpi.value}
                </p>
                <p className="text-sm text-text-secondary mt-0.5">{kpi.label}</p>
              </CardBody>
            </AccentCard>
          ))}
        </div>

        <AccentCard accent="brand">
          <CardBody className="py-12 pl-6">
            <div className="text-center max-w-md mx-auto">
              <p className="text-sm font-medium text-text-primary mb-1">
                Live portfolio data is on the way
              </p>
              <p className="text-sm text-text-secondary">
                These cards populate automatically once billing, payments, and
                maintenance data start flowing through the system — no setup
                required on your end.
              </p>
            </div>
          </CardBody>
        </AccentCard>
      </div>
    </div>
  );
}
