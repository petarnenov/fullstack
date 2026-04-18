import { lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import ProtectedRoute from "./components/ProtectedRoute";
import AppShell from "./components/AppShell";
import MfeBoundary from "./components/MfeBoundary";
import DashboardPage from "./pages/DashboardPage";
import SettingsPage from "./pages/SettingsPage";

const BillingPage = lazy(() => import("mfe_billing/BillingPage"));
const OpenAccountPage = lazy(
  () => import("mfe_open_account/OpenAccountPage"),
);
const OutstandingBalanceWidget = lazy(
  () => import("mfe_billing/OutstandingBalanceWidget"),
);
const TradingPage = lazy(() => import("mfe_trading/TradingPage"));

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <AppShell>
              <Routes>
                <Route path="/" element={<DashboardPage />} />
                <Route
                  path="/billing/*"
                  element={
                    <MfeBoundary label="Billing MFE" fallbackHeight={400}>
                      <BillingPage />
                    </MfeBoundary>
                  }
                />
                <Route
                  path="/accounts/*"
                  element={
                    <MfeBoundary label="Open Account MFE" fallbackHeight={400}>
                      <OpenAccountPage
                        billingSlot={
                          <MfeBoundary
                            label="Outstanding balance widget"
                            fallbackHeight={140}
                          >
                            <OutstandingBalanceWidget />
                          </MfeBoundary>
                        }
                      />
                    </MfeBoundary>
                  }
                />
                <Route
                  path="/trading/*"
                  element={
                    <MfeBoundary label="Trading MFE" fallbackHeight={400}>
                      <TradingPage />
                    </MfeBoundary>
                  }
                />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </AppShell>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
