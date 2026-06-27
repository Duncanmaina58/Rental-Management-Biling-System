import { useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./api/queryClient";
import { ProtectedRoute } from "./routes/ProtectedRoute";
import { AppLayout } from "./components/AppLayout";
import { LoginPage } from "./pages/auth/LoginPage";
import { DashboardPage } from "./pages/dashboard/DashboardPage";
import { OwnersPage } from "./pages/owners/OwnersPage";
import { PropertiesPage } from "./pages/properties/PropertiesPage";
import { PropertyDetailPage } from "./pages/properties/PropertyDetailPage";
import { TenantsPage } from "./pages/tenants/TenantsPage";
import { LeasesPage } from "./pages/leases/LeasesPage";
import { BillingPage } from "./pages/billing/BillingPage";
import { PaymentsPage } from "./pages/payments/PaymentsPage";
import { TrustPage } from "./pages/trust/TrustPage";
import { DisbursementsPage } from "./pages/disbursements/DisbursementsPage";
import { MaintenancePage } from "./pages/maintenance/MaintenancePage";
import { useThemeStore, applyThemeToDocument } from "./store/themeStore";
import { UserRole } from "@rmbs/shared";

export default function App() {
  const theme = useThemeStore((s) => s.theme);

  // Applies on first mount and every subsequent toggle — the data-theme
  // attribute drives every CSS variable in styles/theme.css.
  useEffect(() => {
    applyThemeToDocument(theme);
  }, [theme]);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/owners" element={<OwnersPage />} />
              <Route path="/properties" element={<PropertiesPage />} />
              <Route path="/properties/:id" element={<PropertyDetailPage />} />
              <Route path="/tenants" element={<TenantsPage />} />
              <Route path="/leases" element={<LeasesPage />} />
              <Route path="/billing" element={<BillingPage />} />
              <Route path="/payments" element={<PaymentsPage />} />
              <Route path="/maintenance" element={<MaintenancePage />} />
              <Route element={<ProtectedRoute allowedRoles={[UserRole.ADMIN, UserRole.FINANCE, UserRole.OWNER]} />}>
                <Route path="/disbursements" element={<DisbursementsPage />} />
              </Route>
              <Route element={<ProtectedRoute allowedRoles={[UserRole.ADMIN, UserRole.FINANCE]} />}>
                <Route path="/tax" element={<TrustPage />} />
              </Route>
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
