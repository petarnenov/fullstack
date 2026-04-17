import type { TradingAccountView } from "../api";
import styles from "./AccountSelector.module.css";

const MONEY = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export default function AccountSelector({
  accounts,
  selectedAccountId,
  onChange,
  isLoading,
}: {
  accounts: TradingAccountView[];
  selectedAccountId: string | null;
  onChange: (accountId: string) => void;
  isLoading?: boolean;
}) {
  if (isLoading) {
    return <div className={styles.state}>Loading accounts…</div>;
  }
  if (accounts.length === 0) {
    return <div className={styles.state}>No trading accounts.</div>;
  }

  return (
    <label className={styles.wrap}>
      <span className={styles.label}>Account</span>
      <select
        className={styles.select}
        value={selectedAccountId ?? accounts[0].accountId}
        onChange={(e) => onChange(e.target.value)}
      >
        {accounts.map((a) => (
          <option key={a.accountId} value={a.accountId}>
            {a.accountId} — {MONEY.format(a.cashAvailable)} cash
          </option>
        ))}
      </select>
    </label>
  );
}
