import { useQuery } from "@tanstack/react-query";
import { accountsApi, accountsKeys } from "../api";
import AccountList from "../components/AccountList";
import OnboardingWizard from "../components/OnboardingWizard";
import styles from "./OpenAccountPage.module.css";

export default function OpenAccountPage() {
  const {
    data: accounts = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: accountsKeys.list(),
    queryFn: accountsApi.list,
  });

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Open Account</h1>
          <p className={styles.subtitle}>
            Start and track customer onboarding. Owned by the Open Account
            team.
          </p>
        </div>
        <span className={styles.ownerTag}>mfe-open-account · port 5174</span>
      </header>

      <section className={styles.grid}>
        <div className={styles.column}>
          <h2 className={styles.columnTitle}>Start new onboarding</h2>
          <OnboardingWizard />
        </div>

        <div className={styles.column}>
          <h2 className={styles.columnTitle}>Pipeline</h2>
          {isLoading && <div className={styles.state}>Loading accounts…</div>}
          {error && (
            <div className={styles.error}>Failed to load accounts.</div>
          )}
          {!isLoading && !error && <AccountList accounts={accounts} />}
        </div>
      </section>
    </div>
  );
}
