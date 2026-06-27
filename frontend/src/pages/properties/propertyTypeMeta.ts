import { Home, Briefcase, Layers, LucideIcon } from "lucide-react";

export const PROPERTY_TYPE_META: Record<
  string,
  { label: string; icon: LucideIcon; bg: string; text: string }
> = {
  RESIDENTIAL: { label: "Residential", icon: Home, bg: "bg-brand-50", text: "text-brand-600" },
  COMMERCIAL: { label: "Commercial", icon: Briefcase, bg: "bg-warning-50", text: "text-warning-600" },
  MIXED_USE: { label: "Mixed use", icon: Layers, bg: "bg-positive-50", text: "text-positive-700" },
};
