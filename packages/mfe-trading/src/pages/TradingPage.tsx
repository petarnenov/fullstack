import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { tradingApi, tradingKeys } from "../api";
import AccountSelector from "../components/AccountSelector";
import DepositButton from "../components/DepositButton";
import OrderTicket from "../components/OrderTicket";
import PositionsTable from "../components/PositionsTable";
import OrdersTable from "../components/OrdersTable";
import SymbolList from "../components/SymbolList";
import styles from "./TradingPage.module.css";

const MONEY = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

export default function TradingPage() {
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(
    null,
  );

  const accounts = useQuery({
    queryKey: tradingKeys.accounts(),
    queryFn: tradingApi.listAccounts,
  });

  // Default to first account as soon as the list resolves.
  useEffect(() => {
    if (selectedAccountId || !accounts.data || accounts.data.length === 0)
      return;
    setSelectedAccountId(accounts.data[0].accountId);
  }, [accounts.data, selectedAccountId]);

  const accountId = selectedAccountId ?? accounts.data?.[0]?.accountId ?? null;

  const symbols = useQuery({
    queryKey: tradingKeys.symbols(),
    queryFn: tradingApi.listSymbols,
  });
  const positions = useQuery({
    queryKey: accountId
      ? tradingKeys.positions(accountId)
      : ["trading", "positions", "none"],
    queryFn: () => tradingApi.listPositions(accountId!),
    enabled: !!accountId,
  });
  const orders = useQuery({
    queryKey: accountId
      ? tradingKeys.orders(accountId)
      : ["trading", "orders", "none"],
    queryFn: () => tradingApi.listOrders(accountId!),
    enabled: !!accountId,
  });

  const currentAccount = accounts.data?.find(
    (a) => a.accountId === accountId,
  );

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Trading</h1>
          <p className={styles.subtitle}>
            Place orders, watch positions, review fills. Owned by the Trading
            team.
          </p>
        </div>
        <span className={styles.ownerTag}>mfe-trading · port 5176</span>
      </header>

      <section className={styles.accountStrip}>
        <AccountSelector
          accounts={accounts.data ?? []}
          selectedAccountId={accountId}
          onChange={setSelectedAccountId}
          isLoading={accounts.isLoading}
        />
        {currentAccount && (
          <>
            <div className={styles.cashPill}>
              <span className={styles.cashLabel}>Cash available</span>
              <span className={styles.cashValue}>
                {MONEY.format(currentAccount.cashAvailable)}
              </span>
            </div>
            <DepositButton accountId={currentAccount.accountId} />
          </>
        )}
      </section>

      <section className={styles.topGrid}>
        <div className={styles.column}>
          <h2 className={styles.columnTitle}>Market</h2>
          <SymbolList
            symbols={symbols.data ?? []}
            isLoading={symbols.isLoading}
            error={symbols.error}
          />
        </div>
        <div className={styles.column}>
          <h2 className={styles.columnTitle}>New order</h2>
          {accountId && currentAccount ? (
            <OrderTicket
              accountId={accountId}
              cashAvailable={currentAccount.cashAvailable}
              symbols={symbols.data ?? []}
            />
          ) : (
            <div className={styles.state}>Select an account to trade.</div>
          )}
        </div>
      </section>

      <section className={styles.column}>
        <h2 className={styles.columnTitle}>Positions</h2>
        <PositionsTable
          positions={positions.data ?? []}
          isLoading={positions.isLoading}
          error={positions.error}
        />
      </section>

      <section className={styles.column}>
        <h2 className={styles.columnTitle}>Recent orders</h2>
        <OrdersTable
          orders={orders.data ?? []}
          isLoading={orders.isLoading}
          error={orders.error}
        />
      </section>
    </div>
  );
}
