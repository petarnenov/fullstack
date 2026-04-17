import type { Order } from "../api";
import styles from "./OrdersTable.module.css";

const MONEY = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

export default function OrdersTable({
  orders,
  isLoading,
  error,
}: {
  orders: Order[];
  isLoading: boolean;
  error: unknown;
}) {
  if (isLoading) return <div className={styles.state}>Loading orders…</div>;
  if (error) return <div className={styles.error}>Failed to load orders.</div>;
  if (orders.length === 0)
    return <div className={styles.state}>No orders yet.</div>;

  return (
    <div className={styles.card}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>When</th>
            <th>Ticker</th>
            <th>Side</th>
            <th className={styles.alignRight}>Qty</th>
            <th className={styles.alignRight}>Price</th>
            <th className={styles.alignRight}>Total</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((o) => (
            <tr key={o.id}>
              <td>
                <div>{formatDate(o.placedAt)}</div>
                <div className={styles.id}>{o.id}</div>
              </td>
              <td>
                <span className={styles.ticker}>{o.ticker}</span>
              </td>
              <td>
                <span
                  className={`${styles.side} ${o.side === "buy" ? styles.sideBuy : styles.sideSell}`}
                >
                  {o.side.toUpperCase()}
                </span>
              </td>
              <td className={styles.alignRight}>
                <span className={styles.mono}>{o.quantity}</span>
              </td>
              <td className={styles.alignRight}>
                <span className={styles.mono}>
                  {MONEY.format(o.fillPrice)}
                </span>
              </td>
              <td className={styles.alignRight}>
                <span className={styles.mono}>{MONEY.format(o.total)}</span>
              </td>
              <td>
                {o.status === "filled" ? (
                  <span className={styles.statusFilled}>Filled</span>
                ) : (
                  <span
                    className={styles.statusRejected}
                    title={o.rejectionReason ?? ""}
                  >
                    Rejected
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function formatDate(value: string): string {
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
