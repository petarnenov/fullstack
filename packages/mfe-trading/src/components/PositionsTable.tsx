import type { Position } from "../api";
import styles from "./PositionsTable.module.css";

const MONEY = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

const PNL = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  signDisplay: "always",
});

export default function PositionsTable({
  positions,
  isLoading,
  error,
}: {
  positions: Position[];
  isLoading: boolean;
  error: unknown;
}) {
  if (isLoading) return <div className={styles.state}>Loading positions…</div>;
  if (error)
    return <div className={styles.error}>Failed to load positions.</div>;
  if (positions.length === 0)
    return <div className={styles.state}>No open positions.</div>;

  return (
    <div className={styles.card}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Ticker</th>
            <th className={styles.alignRight}>Qty</th>
            <th className={styles.alignRight}>Avg cost</th>
            <th className={styles.alignRight}>Market value</th>
            <th className={styles.alignRight}>Unrealized P/L</th>
          </tr>
        </thead>
        <tbody>
          {positions.map((p) => {
            const positive = p.unrealizedPnL >= 0;
            return (
              <tr key={p.ticker}>
                <td>
                  <div className={styles.ticker}>{p.ticker}</div>
                  <div className={styles.name}>{p.name}</div>
                </td>
                <td className={styles.alignRight}>
                  <span className={styles.mono}>{p.quantity}</span>
                </td>
                <td className={styles.alignRight}>
                  <span className={styles.mono}>
                    {MONEY.format(p.averageCost)}
                  </span>
                </td>
                <td className={styles.alignRight}>
                  <span className={styles.mono}>
                    {MONEY.format(p.marketValue)}
                  </span>
                </td>
                <td className={styles.alignRight}>
                  <span
                    className={positive ? styles.pnlUp : styles.pnlDown}
                  >
                    {PNL.format(p.unrealizedPnL)}
                    <span className={styles.pnlPct}>
                      {" ("}
                      {positive ? "+" : ""}
                      {p.unrealizedPnLPercent.toFixed(2)}%{")"}
                    </span>
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
