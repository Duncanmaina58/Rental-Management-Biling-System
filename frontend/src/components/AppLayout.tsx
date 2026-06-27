import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Building2,
  FileText,
  Wallet,
  Banknote,
  Wrench,
  ShieldCheck,
  LogOut,
  Search,
  Menu,
  X,
} from "lucide-react";
import { useAuthStore } from "../store/authStore";
import { initials } from "../utils/format";
import { ThemeToggle } from "./ui/ThemeToggle";

const navSections = [
  {
    label: "Overview",
    items: [{ to: "/", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    label: "Portfolio",
    items: [
      { to: "/owners", label: "Owners", icon: Users },
      { to: "/properties", label: "Properties & Units", icon: Building2 },
      { to: "/tenants", label: "Tenants", icon: Users },
      { to: "/leases", label: "Leases", icon: FileText },
    ],
  },
  {
    label: "Operations",
    items: [
      { to: "/billing", label: "Billing", icon: FileText },
      { to: "/payments", label: "Payments", icon: Wallet },
      { to: "/disbursements", label: "Disbursements", icon: Banknote },
      { to: "/maintenance", label: "Maintenance", icon: Wrench },
    ],
  },
  {
    label: "Compliance",
    items: [{ to: "/tax", label: "Tax & Trust", icon: ShieldCheck }],
  },
];

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { user, logout } = useAuthStore();

  return (
    <>
      <div className="px-5 py-5 flex items-center gap-2.5 border-b border-sidebar-border">
        <div className="h-8 w-8 rounded-lg bg-brand-500 flex items-center justify-center font-display font-bold text-sm text-white shadow-sm shadow-brand-500/30">
          R
        </div>
        <div>
          <p className="text-sm font-semibold leading-tight text-sidebar-text-active font-display">RMBS</p>
          <p className="text-[11px] text-sidebar-text leading-tight">Dun-Star Property Mgmt</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {navSections.map((section) => (
          <div key={section.label}>
            <p className="px-3 mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-sidebar-text/60">
              {section.label}
            </p>
            <div className="space-y-0.5">
              {section.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    `group flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors relative ${
                      isActive
                        ? "bg-sidebar-active-bg text-sidebar-text-active"
                        : "text-sidebar-text hover:bg-sidebar-hover hover:text-sidebar-text-active"
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && (
                        <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-full bg-brand-500" />
                      )}
                      <item.icon
                        className={`h-4 w-4 shrink-0 ${isActive ? "text-brand-400" : ""}`}
                        strokeWidth={2}
                      />
                      {item.label}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="px-3 py-4 border-t border-sidebar-border">
        <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg">
          <div className="h-8 w-8 rounded-full bg-brand-500 flex items-center justify-center text-xs font-semibold text-white shrink-0">
            {user ? initials(user.fullName) : ""}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate text-sidebar-text-active">{user?.fullName}</p>
            <p className="text-[11px] text-sidebar-text truncate">{user?.role.replace(/_/g, " ")}</p>
          </div>
          <button
            onClick={logout}
            title="Sign out"
            className="text-sidebar-text hover:text-sidebar-text-active p-1.5 rounded-md hover:bg-sidebar-hover transition-colors"
          >
            <LogOut className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>
      </div>
    </>
  );
}

export function AppLayout() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="flex h-screen bg-canvas">
      {/* Desktop sidebar — always visible at lg and above */}
      <aside className="hidden lg:flex w-64 bg-sidebar-bg flex-col shrink-0">
        <SidebarContent />
      </aside>

      {/* Mobile off-canvas drawer — slides in over content below lg */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-[var(--overlay)]"
            onClick={() => setMobileNavOpen(false)}
            aria-hidden="true"
          />
          <aside className="relative w-72 max-w-[85vw] h-full bg-sidebar-bg flex flex-col shadow-lg" style={{ animation: "slideInFromLeft 0.2s ease-out" }}>
            <button
              onClick={() => setMobileNavOpen(false)}
              className="absolute top-4 right-4 text-sidebar-text hover:text-sidebar-text-active p-1.5 rounded-md hover:bg-sidebar-hover"
            >
              <X className="h-4.5 w-4.5" />
            </button>
            <SidebarContent onNavigate={() => setMobileNavOpen(false)} />
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Topbar — hamburger on mobile, search collapses to icon-only on
            small screens, theme toggle always visible. */}
        <div className="h-14 border-b border-border bg-surface flex items-center justify-between gap-3 px-4 sm:px-6 shrink-0">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <button
              onClick={() => setMobileNavOpen(true)}
              className="lg:hidden text-text-secondary hover:text-text-primary p-1.5 rounded-md hover:bg-surface-sunken shrink-0"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="hidden sm:flex items-center gap-2 text-text-tertiary max-w-xs w-full bg-surface-sunken rounded-lg px-3 py-1.5">
              <Search className="h-3.5 w-3.5 shrink-0" />
              <input
                placeholder="Search..."
                className="bg-transparent text-sm outline-none placeholder:text-text-tertiary w-full text-text-primary"
              />
            </div>
          </div>
          <ThemeToggle />
        </div>

        <Outlet />
      </div>
    </div>
  );
}
