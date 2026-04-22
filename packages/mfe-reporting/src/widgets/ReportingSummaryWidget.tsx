import { useQuery } from "@tanstack/react-query";
import { reportingApi, reportingKeys } from "../api";
import styles from "./ReportingSummaryWidget.module.css";

const MONEY = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

/**
 * Dashboard tile owned by the Reporting team. The shell composes it alongside
 * widgets from the other three MFEs — proving that adding a new team + a new
 * BFF in front of the monolith doesn't change the shell's composition model.
 */
export default function ReportingSummaryWidget() {
  const summary = useQuery({
    queryKey: reportingKeys.summary(),
    queryFn: reportingApi.summary,
    retry: false,
  });

  if (summary.isLoading) {
    return <div className={styles.loading}>Loading…</div>;
  }
  if (summary.isError || !summary.data) {
    return <div className={styles.error}>BFF unreachable</div>;
  }

  const rows = summary.data;
  const totalOutstanding = rows.reduce(
    (acc, r) => acc + (r.outstandingAmount ?? 0),
    0,
  );
  const totalOverdue = rows.reduce(
    (acc, r) => acc + (r.overdueInvoiceCount ?? 0),
    0,
  );
  const withPositions = rows.filter(
    (r) => (r.positionsCount ?? 0) > 0,
  ).length;
  const totalEquity = rows.reduce(
    (acc, r) => acc + (r.totalEquity ?? 0),
    0,
  );
  const hasOutstanding = totalOutstanding > 0;

  return (
    <div className={styles.root}>
      <div className={styles.primary}>
        <span
          className={`${styles.value} ${hasOutstanding ? styles.valueDanger : ""}`}
        >
          {MONEY.format(totalOutstanding)}
        </span>
        <span className={styles.label}>total outstanding</span>
      </div>

      <div className={styles.breakdown}>
        <div className={styles.chip}>
          <span className={styles.chipValue}>{rows.length}</span>
          <span className={styles.chipLabel}>accounts</span>
        </div>
        <div className={styles.chip}>
          <span
            className={`${styles.chipValue} ${totalOverdue > 0 ? styles.chipValueDanger : ""}`}
          >
            {totalOverdue}
          </span>
          <span className={styles.chipLabel}>overdue</span>
        </div>
        <div className={styles.chip}>
          <span className={styles.chipValue}>{withPositions}</span>
          <span className={styles.chipLabel}>with positions</span>
        </div>
      </div>

      <div className={styles.footer}>
        {MONEY.format(totalEquity)} total equity · aggregated by BFF
      </div>
    </div>
  );
}
