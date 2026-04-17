import { useQuery } from "@tanstack/react-query";
import { tradingApi, tradingKeys } from "../api";
import OrderTicket from "../components/OrderTicket";
import PositionsTable from "../components/PositionsTable";
import OrdersTable from "../components/OrdersTable";
import SymbolList from "../components/SymbolList";
import styles from "./TradingPage.module.css";

export default function TradingPage() {
  const symbols = useQuery({
    queryKey: tradingKeys.symbols(),
    queryFn: tradingApi.listSymbols,
  });
  const positions = useQuery({
    queryKey: tradingKeys.positions(),
    queryFn: tradingApi.listPositions,
  });
  const orders = useQuery({
    queryKey: tradingKeys.orders(),
    queryFn: tradingApi.listOrders,
  });

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
          <OrderTicket symbols={symbols.data ?? []} />
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
