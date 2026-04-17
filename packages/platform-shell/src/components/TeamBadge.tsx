import styles from "./TeamBadge.module.css";

export type TeamKey = "shell" | "billing" | "accounts" | "trading";

const labels: Record<TeamKey, string> = {
  shell: "Platform Core",
  billing: "Billing team",
  accounts: "Open Account team",
  trading: "Trading team",
};

export default function TeamBadge({ team }: { team: TeamKey }) {
  return (
    <span className={`${styles.badge} ${styles[team]}`}>
      <span className={styles.dot} aria-hidden />
      {labels[team]}
    </span>
  );
}
