import { useQuery } from "@tanstack/react-query";
import { accountsApi, accountsKeys } from "../api";
import styles from "./OnboardingProgressWidget.module.css";

export default function OnboardingProgressWidget() {
  const { data, isLoading, error } = useQuery({
    queryKey: accountsKeys.progress(),
    queryFn: accountsApi.progress,
  });

  if (isLoading) return <div className={styles.loading}>Loading…</div>;
  if (error || !data)
    return <div className={styles.error}>Couldn't load progress</div>;

  return (
    <div className={styles.root}>
      <div className={styles.primary}>
        <span className={styles.percentValue}>{data.averageCompletion}%</span>
        <span className={styles.percentLabel}>avg completion</span>
      </div>
      <div className={styles.statusRow}>
        <StatusPill label="Drafts" value={data.draft} tone="neutral" />
        <StatusPill label="KYC pending" value={data.kycPending} tone="warn" />
        <StatusPill label="Verified" value={data.verified} tone="success" />
      </div>
      <div className={styles.footer}>
        {data.totalAccounts} accounts in pipeline
      </div>
    </div>
  );
}

function StatusPill({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "neutral" | "warn" | "success";
}) {
  return (
    <div className={`${styles.pill} ${styles[tone]}`}>
      <span className={styles.pillValue}>{value}</span>
      <span className={styles.pillLabel}>{label}</span>
    </div>
  );
}
