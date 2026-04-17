import { lazy } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import MfeBoundary from "../components/MfeBoundary";
import TeamBadge from "../components/TeamBadge";
import styles from "./DashboardPage.module.css";

const OutstandingBalanceWidget = lazy(
  () => import("mfe_billing/OutstandingBalanceWidget"),
);
const OnboardingProgressWidget = lazy(
  () => import("mfe_open_account/OnboardingProgressWidget"),
);

export default function DashboardPage() {
  const { user } = useAuth();

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Welcome back, {user.fullName.split(" ")[0]}</h1>
          <p className={styles.subtitle}>
            This dashboard is composed at runtime from widgets owned by
            different teams.
          </p>
        </div>
        <TeamBadge team="shell" />
      </header>

      <section className={styles.grid}>
        <article className={styles.widgetCell}>
          <div className={styles.widgetHeader}>
            <span className={styles.widgetLabel}>Outstanding balance</span>
            <TeamBadge team="billing" />
          </div>
          <MfeBoundary label="Outstanding balance widget" fallbackHeight={160}>
            <OutstandingBalanceWidget />
          </MfeBoundary>
          <Link to="/billing" className={styles.widgetLink}>
            Go to Billing →
          </Link>
        </article>

        <article className={styles.widgetCell}>
          <div className={styles.widgetHeader}>
            <span className={styles.widgetLabel}>Onboarding progress</span>
            <TeamBadge team="accounts" />
          </div>
          <MfeBoundary
            label="Onboarding progress widget"
            fallbackHeight={160}
          >
            <OnboardingProgressWidget />
          </MfeBoundary>
          <Link to="/accounts" className={styles.widgetLink}>
            Go to Open Account →
          </Link>
        </article>

        <article className={styles.widgetCell}>
          <div className={styles.widgetHeader}>
            <span className={styles.widgetLabel}>Platform health</span>
            <TeamBadge team="shell" />
          </div>
          <div className={styles.shellTiles}>
            <ShellStat label="Shell version" value="1.0.0" />
            <ShellStat label="Tenant" value={user.tenantId} />
            <ShellStat label="Remotes loaded" value="2" />
            <ShellStat label="Role" value={user.role} />
          </div>
        </article>
      </section>

      <section className={styles.ownership}>
        <h2 className={styles.sectionTitle}>How this page is composed</h2>
        <ul className={styles.ownershipList}>
          <li>
            <TeamBadge team="shell" /> owns the layout, navigation, auth, and
            the shell-owned <em>Platform health</em> tile.
          </li>
          <li>
            <TeamBadge team="billing" /> owns the{" "}
            <code>OutstandingBalanceWidget</code>, exposed via Module
            Federation from <code>mfe-billing</code>.
          </li>
          <li>
            <TeamBadge team="accounts" /> owns the{" "}
            <code>OnboardingProgressWidget</code>, exposed from{" "}
            <code>mfe-open-account</code>.
          </li>
        </ul>
      </section>
    </div>
  );
}

function ShellStat({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.shellStat}>
      <span className={styles.shellStatLabel}>{label}</span>
      <span className={styles.shellStatValue}>{value}</span>
    </div>
  );
}
