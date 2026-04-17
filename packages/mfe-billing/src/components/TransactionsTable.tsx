import type { Transaction } from "../api";
import styles from "./TransactionsTable.module.css";

const TYPE_LABEL: Record<Transaction["type"], string> = {
  charge: "Charge",
  refund: "Refund",
  fee: "Fee",
};

export default function TransactionsTable({
  transactions,
  isLoading,
  error,
}: {
  transactions: Transaction[];
  isLoading: boolean;
  error: unknown;
}) {
  if (isLoading) {
    return <div className={styles.state}>Loading transactions…</div>;
  }
  if (error) {
    return <div className={styles.error}>Failed to load transactions.</div>;
  }
  if (transactions.length === 0) {
    return <div className={styles.state}>No transactions yet.</div>;
  }

  return (
    <div className={styles.card}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Description</th>
            <th>Invoice</th>
            <th>Type</th>
            <th>When</th>
            <th className={styles.alignRight}>Amount</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((txn) => (
            <tr key={txn.id}>
              <td>
                <div className={styles.primary}>{txn.description}</div>
                <div className={styles.id}>{txn.id}</div>
              </td>
              <td>
                <code className={styles.mono}>{txn.invoiceId}</code>
              </td>
              <td>
                <span className={`${styles.pill} ${styles[`type_${txn.type}`]}`}>
                  {TYPE_LABEL[txn.type]}
                </span>
              </td>
              <td>{formatDate(txn.timestamp)}</td>
              <td className={styles.alignRight}>
                <span className={styles.amount}>
                  {formatMoney(txn.amount, txn.currency)}
                </span>
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
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatMoney(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(amount);
}
