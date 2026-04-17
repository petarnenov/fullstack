import { lazy } from "react";
import { NavLink, Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./auth/AuthContext";
import MfeBoundary from "./components/MfeBoundary";
import TeamBadge from "./components/TeamBadge";
import ThemeToggle from "./components/ThemeToggle";
import DashboardPage from "./pages/DashboardPage";
import SettingsPage from "./pages/SettingsPage";
import styles from "./App.module.css";

const BillingPage = lazy(() => import("mfe_billing/BillingPage"));
const OpenAccountPage = lazy(
  () => import("mfe_open_account/OpenAccountPage"),
);

export default function App() {
  const { user } = useAuth();

  return (
    <div className={styles.layout}>
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <div className={styles.brandMark}>AM</div>
          <div>
            <div className={styles.brandTitle}>Asset Platform</div>
            <div className={styles.brandSub}>Micro-frontend POC</div>
          </div>
        </div>

        <nav className={styles.nav}>
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `${styles.navItem} ${isActive ? styles.navItemActive : ""}`
            }
          >
            <span>Dashboard</span>
            <TeamBadge team="shell" />
          </NavLink>
          <NavLink
            to="/billing"
            className={({ isActive }) =>
              `${styles.navItem} ${isActive ? styles.navItemActive : ""}`
            }
          >
            <span>Billing</span>
            <TeamBadge team="billing" />
          </NavLink>
          <NavLink
            to="/accounts"
            className={({ isActive }) =>
              `${styles.navItem} ${isActive ? styles.navItemActive : ""}`
            }
          >
            <span>Open Account</span>
            <TeamBadge team="accounts" />
          </NavLink>
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              `${styles.navItem} ${isActive ? styles.navItemActive : ""}`
            }
          >
            <span>Settings</span>
            <TeamBadge team="shell" />
          </NavLink>
        </nav>

        <div className={styles.sidebarFooter}>
          <ThemeToggle />
          <div className={styles.userCard}>
            <div className={styles.userAvatar}>
              {user.fullName
                .split(" ")
                .map((p) => p[0])
                .join("")}
            </div>
            <div>
              <div className={styles.userName}>{user.fullName}</div>
              <div className={styles.userMeta}>
                {user.role} · {user.tenantId}
              </div>
            </div>
          </div>
        </div>
      </aside>

      <main className={styles.main}>
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
                <OpenAccountPage />
              </MfeBoundary>
            }
          />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}
