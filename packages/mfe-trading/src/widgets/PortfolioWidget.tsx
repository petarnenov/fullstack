import { useQuery } from "@tanstack/react-query";
import { tradingApi, tradingKeys } from "../api";
import styles from "./PortfolioWidget.module.css";

const MONEY = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const PNL = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  signDisplay: "always",
});

export default function PortfolioWidget() {
  const { data, isLoading, error } = useQuery({
    queryKey: tradingKeys.portfolio(),
    queryFn: tradingApi.portfolio,
  });

  if (isLoading) return <div className={styles.loading}>Loading…</div>;
  if (error || !data)
    return <div className={styles.error}>Couldn't load portfolio</div>;

  const pnlPositive = data.totalUnrealizedPnL >= 0;

  return (
    <div className={styles.root}>
      <div className={styles.primary}>
        <span className={styles.value}>
          {MONEY.format(data.totalMarketValue)}
        </span>
        <span className={styles.label}>market value</span>
      </div>
      <div
        className={`${styles.pnl} ${pnlPositive ? styles.pnlPositive : styles.pnlNegative}`}
      >
        <span className={styles.pnlValue}>
          {PNL.format(data.totalUnrealizedPnL)}
        </span>
        <span className={styles.pnlPercent}>
          ({pnlPositive ? "+" : ""}
          {data.totalUnrealizedPnLPercent.toFixed(2)}%)
        </span>
      </div>
      <div className={styles.footer}>
        {data.positionsCount} positions
        {data.topHoldingTicker && <> · top: {data.topHoldingTicker}</>}
      </div>
    </div>
  );
}
