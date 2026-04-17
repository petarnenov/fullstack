import { useQuery } from "@tanstack/react-query";
import { billingApi, billingKeys } from "../api";
import styles from "./OutstandingBalanceWidget.module.css";

const MONEY = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

export default function OutstandingBalanceWidget() {
  const { data, isLoading, error } = useQuery({
    queryKey: billingKeys.summary(),
    queryFn: billingApi.summary,
  });

  if (isLoading) return <div className={styles.loading}>Loading…</div>;
  if (error || !data)
    return <div className={styles.error}>Couldn't load balance</div>;

  const formatter =
    data.currency === "USD"
      ? MONEY
      : new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: data.currency,
        });

  return (
    <div className={styles.root}>
      <div className={styles.primary}>
        <span className={styles.amount}>
          {formatter.format(data.outstandingBalance)}
        </span>
        <span className={styles.label}>outstanding</span>
      </div>

      <div className={styles.breakdown}>
        <div className={`${styles.chip} ${styles.overdue}`}>
          <span className={styles.chipValue}>{data.overdueCount}</span>
          <span className={styles.chipLabel}>overdue</span>
        </div>
        <div className={styles.chip}>
          <span className={styles.chipValue}>{data.pendingCount}</span>
          <span className={styles.chipLabel}>pending</span>
        </div>
      </div>

      <div className={styles.footer}>
        {formatter.format(data.paidThisMonth)} paid this month
      </div>
    </div>
  );
}
