import { useState, type ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import TeamBadge from "./TeamBadge";
import ThemeToggle from "./ThemeToggle";
import styles from "../App.module.css";

export default function AppShell({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);

  if (!user) return null;

  const onLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
    } finally {
      setLoggingOut(false);
    }
  };

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
            to="/trading"
            className={({ isActive }) =>
              `${styles.navItem} ${isActive ? styles.navItemActive : ""}`
            }
          >
            <span>Trading</span>
            <TeamBadge team="trading" />
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
            <div className={styles.userMain}>
              <div className={styles.userName}>{user.fullName}</div>
              <div className={styles.userMeta}>
                {user.role} · {user.tenantId}
              </div>
            </div>
            <button
              type="button"
              className={styles.logoutBtn}
              onClick={onLogout}
              disabled={loggingOut}
              aria-label="Sign out"
              title="Sign out"
            >
              {loggingOut ? "…" : "Exit"}
            </button>
          </div>
        </div>
      </aside>

      <main className={styles.main}>{children}</main>
    </div>
  );
}
