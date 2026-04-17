import type { TradingSymbol } from "../api";
import styles from "./SymbolList.module.css";

const MONEY = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

export default function SymbolList({
  symbols,
  isLoading,
  error,
}: {
  symbols: TradingSymbol[];
  isLoading: boolean;
  error: unknown;
}) {
  if (isLoading) return <div className={styles.state}>Loading symbols…</div>;
  if (error) return <div className={styles.error}>Failed to load symbols.</div>;
  if (symbols.length === 0)
    return <div className={styles.state}>No symbols.</div>;

  return (
    <div className={styles.card}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Ticker</th>
            <th>Name</th>
            <th>Sector</th>
            <th className={styles.alignRight}>Last</th>
            <th className={styles.alignRight}>24h</th>
          </tr>
        </thead>
        <tbody>
          {symbols.map((s) => {
            const up = s.change24h >= 0;
            return (
              <tr key={s.ticker}>
                <td>
                  <span className={styles.ticker}>{s.ticker}</span>
                </td>
                <td>{s.name}</td>
                <td>
                  <span className={styles.sector}>{s.sector}</span>
                </td>
                <td className={styles.alignRight}>
                  <span className={styles.price}>
                    {MONEY.format(s.lastPrice)}
                  </span>
                </td>
                <td className={styles.alignRight}>
                  <span className={up ? styles.up : styles.down}>
                    {up ? "+" : ""}
                    {s.change24h.toFixed(2)}%
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
