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

/**
 * Widget shows the first trading account's portfolio. In a real platform
 * this would be the user's "primary" account, but user→account mapping
 * isn't modelled in this POC — the selector on the full /trading page is
 * where multi-account UX lives.
 */
export default function PortfolioWidget() {
  const accounts = useQuery({
    queryKey: tradingKeys.accounts(),
    queryFn: tradingApi.listAccounts,
  });

  const primaryId = accounts.data?.[0]?.accountId ?? null;

  const portfolio = useQuery({
    queryKey: primaryId
      ? tradingKeys.portfolio(primaryId)
      : ["trading", "portfolio", "none"],
    queryFn: () => tradingApi.portfolio(primaryId!),
    enabled: !!primaryId,
  });

  if (accounts.isLoading || portfolio.isLoading) {
    return <div className={styles.loading}>Loading…</div>;
  }
  if (accounts.error || portfolio.error || !portfolio.data) {
    return <div className={styles.error}>Couldn't load portfolio</div>;
  }

  const p = portfolio.data;
  const pnlPositive = p.totalUnrealizedPnL >= 0;

  return (
    <div className={styles.root}>
      <div className={styles.primary}>
        <span className={styles.value}>{MONEY.format(p.totalEquity)}</span>
        <span className={styles.label}>total equity</span>
      </div>
      <div className={styles.breakdown}>
        <div className={styles.chip}>
          <span className={styles.chipValue}>
            {MONEY.format(p.cashAvailable)}
          </span>
          <span className={styles.chipLabel}>cash</span>
        </div>
        <div className={styles.chip}>
          <span className={styles.chipValue}>
            {MONEY.format(p.totalMarketValue)}
          </span>
          <span className={styles.chipLabel}>positions</span>
        </div>
      </div>
      <div
        className={`${styles.pnl} ${pnlPositive ? styles.pnlPositive : styles.pnlNegative}`}
      >
        <span className={styles.pnlValue}>
          {PNL.format(p.totalUnrealizedPnL)}
        </span>
        <span className={styles.pnlPercent}>
          ({pnlPositive ? "+" : ""}
          {p.totalUnrealizedPnLPercent.toFixed(2)}%)
        </span>
      </div>
      <div className={styles.footer}>
        {p.positionsCount} positions
        {p.topHoldingTicker && <> · top: {p.topHoldingTicker}</>}
        {primaryId && <> · {primaryId}</>}
      </div>
    </div>
  );
}
