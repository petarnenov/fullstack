import { useMutation, useQueryClient } from "@tanstack/react-query";
import { billingApi, billingKeys } from "../api";
import type { Invoice } from "../api";
import styles from "./InvoicesTable.module.css";

const STATUS_LABEL: Record<Invoice["status"], string> = {
  pending: "Pending",
  paid: "Paid",
  overdue: "Overdue",
};

export default function InvoicesTable({
  invoices,
  isLoading,
  error,
}: {
  invoices: Invoice[];
  isLoading: boolean;
  error: unknown;
}) {
  const queryClient = useQueryClient();

  const pay = useMutation({
    mutationFn: (id: string) =>
      billingApi.payInvoice(id, { paymentMethodId: "pm_card_demo" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: billingKeys.all });
    },
  });

  if (isLoading) {
    return <div className={styles.state}>Loading invoices…</div>;
  }
  if (error) {
    return <div className={styles.error}>Failed to load invoices.</div>;
  }
  if (invoices.length === 0) {
    return <div className={styles.state}>No invoices yet.</div>;
  }

  return (
    <div className={styles.card}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Description</th>
            <th>Account</th>
            <th>Issued</th>
            <th>Due</th>
            <th className={styles.alignRight}>Amount</th>
            <th>Status</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {invoices.map((invoice) => (
            <tr key={invoice.id}>
              <td>
                <div className={styles.primary}>{invoice.description}</div>
                <div className={styles.id}>{invoice.id}</div>
              </td>
              <td>
                <code className={styles.mono}>{invoice.accountId}</code>
              </td>
              <td>{formatDate(invoice.issuedAt)}</td>
              <td>{formatDate(invoice.dueAt)}</td>
              <td className={styles.alignRight}>
                <span className={styles.amount}>
                  {formatMoney(invoice.amount, invoice.currency)}
                </span>
              </td>
              <td>
                <span
                  className={`${styles.status} ${styles[`status_${invoice.status}`]}`}
                >
                  {STATUS_LABEL[invoice.status]}
                </span>
              </td>
              <td>
                {invoice.status !== "paid" && (
                  <button
                    type="button"
                    className={styles.payBtn}
                    disabled={pay.isPending}
                    onClick={() => pay.mutate(invoice.id)}
                  >
                    {pay.isPending && pay.variables === invoice.id
                      ? "Paying…"
                      : "Pay"}
                  </button>
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
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
}

function formatMoney(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(amount);
}
