import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { billingApi, billingKeys } from "../api";
import type { Invoice } from "../api";
import InvoicesTable from "../components/InvoicesTable";
import TransactionsTable from "../components/TransactionsTable";
import styles from "./BillingPage.module.css";

type Tab = "invoices" | "transactions";

export default function BillingPage() {
  const [tab, setTab] = useState<Tab>("invoices");

  const invoicesQuery = useQuery({
    queryKey: billingKeys.invoices(),
    queryFn: billingApi.listInvoices,
  });

  const transactionsQuery = useQuery({
    queryKey: billingKeys.transactions(),
    queryFn: billingApi.listTransactions,
    enabled: tab === "transactions",
  });

  const summary = useMemo(
    () => summariseInvoices(invoicesQuery.data ?? []),
    [invoicesQuery.data],
  );

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Billing</h1>
          <p className={styles.subtitle}>
            Invoices and transactions. Owned by the Billing team.
          </p>
        </div>
        <span className={styles.ownerTag}>mfe-billing · port 5175</span>
      </header>

      <section className={styles.summaryStrip}>
        <Stat label="Invoices" value={summary.count} />
        <Stat label="Overdue" value={summary.overdue} tone="danger" />
        <Stat label="Pending" value={summary.pending} tone="warn" />
        <Stat label="Paid" value={summary.paid} tone="success" />
      </section>

      <div className={styles.tabs} role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "invoices"}
          className={`${styles.tab} ${tab === "invoices" ? styles.tabActive : ""}`}
          onClick={() => setTab("invoices")}
        >
          Invoices
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "transactions"}
          className={`${styles.tab} ${tab === "transactions" ? styles.tabActive : ""}`}
          onClick={() => setTab("transactions")}
        >
          Transactions
        </button>
      </div>

      {tab === "invoices" && (
        <InvoicesTable
          invoices={invoicesQuery.data ?? []}
          isLoading={invoicesQuery.isLoading}
          error={invoicesQuery.error}
        />
      )}
      {tab === "transactions" && (
        <TransactionsTable
          transactions={transactionsQuery.data ?? []}
          isLoading={transactionsQuery.isLoading}
          error={transactionsQuery.error}
        />
      )}
    </div>
  );
}

function summariseInvoices(invoices: Invoice[]) {
  let overdue = 0;
  let pending = 0;
  let paid = 0;
  for (const invoice of invoices) {
    if (invoice.status === "overdue") overdue++;
    else if (invoice.status === "pending") pending++;
    else if (invoice.status === "paid") paid++;
  }
  return { count: invoices.length, overdue, pending, paid };
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "danger" | "warn" | "success";
}) {
  return (
    <div className={`${styles.stat} ${tone ? styles[`stat_${tone}`] : ""}`}>
      <span className={styles.statValue}>{value}</span>
      <span className={styles.statLabel}>{label}</span>
    </div>
  );
}
