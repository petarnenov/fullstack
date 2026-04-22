import { useQuery } from "@tanstack/react-query";
import {
  reportingApi,
  reportingKeys,
  type AccountReport,
} from "../api";
import styles from "./ReportingPage.module.css";

const MONEY = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

function StatusBadge({ status }: { status: string | undefined }) {
  const cls =
    status === "verified"
      ? styles.badgeVerified
      : status === "kyc_pending"
        ? styles.badgeKyc
        : status === "rejected"
          ? styles.badgeRejected
          : styles.badgeDraft;
  const label = status ? status.replace(/_/g, " ") : "unknown";
  return <span className={`${styles.badge} ${cls}`}>{label}</span>;
}

function sum(values: Array<number | undefined>) {
  return values.reduce<number>((acc, v) => acc + (v ?? 0), 0);
}

export default function ReportingPage() {
  const health = useQuery({
    queryKey: reportingKeys.health(),
    queryFn: reportingApi.health,
    retry: false,
  });

  const summary = useQuery({
    queryKey: reportingKeys.summary(),
    queryFn: reportingApi.summary,
    retry: false,
  });

  const rows: AccountReport[] = summary.data ?? [];
  const totalOutstanding = sum(rows.map((r) => r.outstandingAmount));
  const totalOverdue = rows.reduce(
    (acc, r) => acc + (r.overdueInvoiceCount ?? 0),
    0,
  );
  const accountsWithPositions = rows.filter(
    (r) => (r.positionsCount ?? 0) > 0,
  ).length;
  const totalEquity = sum(rows.map((r) => r.totalEquity));

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Reporting</h1>
          <p className={styles.subtitle}>
            One request to the BFF, three domains joined. The BFF fans out to{" "}
            <code>/api/accounts</code>, <code>/api/billing/invoices</code>, and{" "}
            <code>/api/trading/portfolio</code> on the monolith, then reshapes
            into the view below. The monolith never learns about the Reporting
            team.
          </p>
        </div>
        <span className={styles.ownerTag}>mfe-reporting · port 5177</span>
      </header>

      <section className={styles.connectivity}>
        <span className={styles.muted}>
          BFF · <code>bff-reporting</code> on :8090
        </span>
        {health.isError ? (
          <span className={styles.statusError}>unreachable</span>
        ) : health.data ? (
          <span className={styles.statusOk}>{health.data.status}</span>
        ) : (
          <span className={styles.muted}>checking…</span>
        )}
      </section>

      <section className={styles.statsStrip}>
        <div className={styles.stat}>
          <div className={styles.statLabel}>Accounts</div>
          <div className={styles.statValue}>{rows.length}</div>
        </div>
        <div className={styles.stat}>
          <div className={styles.statLabel}>Outstanding</div>
          <div
            className={`${styles.statValue} ${totalOutstanding > 0 ? styles.statValueDanger : styles.statValueMuted}`}
          >
            {MONEY.format(totalOutstanding)}
          </div>
        </div>
        <div className={styles.stat}>
          <div className={styles.statLabel}>Overdue invoices</div>
          <div
            className={`${styles.statValue} ${totalOverdue > 0 ? styles.statValueDanger : styles.statValueMuted}`}
          >
            {totalOverdue}
          </div>
        </div>
        <div className={styles.stat}>
          <div className={styles.statLabel}>With positions</div>
          <div className={styles.statValue}>{accountsWithPositions}</div>
        </div>
        <div className={styles.stat}>
          <div className={styles.statLabel}>Total equity</div>
          <div className={styles.statValue}>{MONEY.format(totalEquity)}</div>
        </div>
      </section>

      <section className={styles.card}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>Accounts summary</h2>
          <span className={styles.cardMeta}>
            GET /api/reporting/summary · aggregated by BFF
          </span>
        </div>
        {summary.isLoading && <div className={styles.state}>Loading…</div>}
        {summary.isError && (
          <div className={styles.state}>
            <span className={styles.danger}>
              Failed to load:{" "}
              {(summary.error as Error)?.message ?? "unknown error"}
            </span>
          </div>
        )}
        {summary.data && summary.data.length === 0 && (
          <div className={styles.state}>No accounts to report on.</div>
        )}
        {summary.data && summary.data.length > 0 && (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Account holder</th>
                <th>Status</th>
                <th className={styles.numeric}>Outstanding</th>
                <th className={styles.numeric}>Overdue</th>
                <th className={styles.numeric}>Positions</th>
                <th>Top holding</th>
                <th className={styles.numeric}>Equity</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.accountId ?? r.holderName}>
                  <td>
                    <span className={styles.holder}>{r.holderName ?? "—"}</span>
                    <span className={styles.holderMeta}>
                      {r.productType ?? "—"} · {r.accountId ?? "—"}
                    </span>
                  </td>
                  <td>
                    <StatusBadge status={r.status} />
                  </td>
                  <td
                    className={`${styles.numeric} ${(r.outstandingAmount ?? 0) > 0 ? styles.danger : styles.muted}`}
                  >
                    {MONEY.format(r.outstandingAmount ?? 0)}
                    {(r.outstandingInvoiceCount ?? 0) > 0 && (
                      <span className={styles.holderMeta}>
                        {r.outstandingInvoiceCount} invoice
                        {r.outstandingInvoiceCount === 1 ? "" : "s"}
                      </span>
                    )}
                  </td>
                  <td
                    className={`${styles.numeric} ${(r.overdueInvoiceCount ?? 0) > 0 ? styles.danger : styles.muted}`}
                  >
                    {r.overdueInvoiceCount ?? 0}
                  </td>
                  <td className={styles.numeric}>{r.positionsCount ?? 0}</td>
                  <td className={r.topHoldingTicker ? "" : styles.muted}>
                    {r.topHoldingTicker ?? "—"}
                  </td>
                  <td className={styles.numeric}>
                    {MONEY.format(r.totalEquity ?? 0)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
