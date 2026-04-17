import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { tradingApi, tradingKeys } from "../api";
import type { OrderSide, TradingSymbol } from "../api";
import styles from "./OrderTicket.module.css";

const MONEY = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

export default function OrderTicket({ symbols }: { symbols: TradingSymbol[] }) {
  const queryClient = useQueryClient();
  const [ticker, setTicker] = useState<string>("");
  const [side, setSide] = useState<OrderSide>("buy");
  const [quantity, setQuantity] = useState("1");
  const [flash, setFlash] = useState<
    | { kind: "success"; text: string }
    | { kind: "error"; text: string }
    | null
  >(null);

  useEffect(() => {
    if (!ticker && symbols.length > 0) setTicker(symbols[0].ticker);
  }, [symbols, ticker]);

  const selected = useMemo(
    () => symbols.find((s) => s.ticker === ticker),
    [symbols, ticker],
  );

  const qtyNumber = Number.parseFloat(quantity) || 0;
  const estimatedTotal = selected ? selected.lastPrice * qtyNumber : 0;

  const place = useMutation({
    mutationFn: tradingApi.placeOrder,
    onSuccess: (order) => {
      queryClient.invalidateQueries({ queryKey: tradingKeys.all });
      if (order.status === "rejected") {
        setFlash({
          kind: "error",
          text: `Rejected: ${order.rejectionReason ?? "unknown reason"}`,
        });
      } else {
        setFlash({
          kind: "success",
          text: `Filled ${order.quantity} ${order.ticker} @ ${MONEY.format(order.fillPrice)}`,
        });
        setQuantity("1");
      }
    },
    onError: () => {
      setFlash({ kind: "error", text: "Order failed. Retry?" });
    },
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!ticker || qtyNumber <= 0) return;
    place.mutate({ ticker, side, quantity: qtyNumber });
  };

  return (
    <form className={styles.form} onSubmit={submit}>
      <div className={styles.sideToggle} role="radiogroup" aria-label="Side">
        <button
          type="button"
          role="radio"
          aria-checked={side === "buy"}
          className={`${styles.sideBtn} ${side === "buy" ? styles.sideBtnBuy : ""}`}
          onClick={() => setSide("buy")}
        >
          Buy
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={side === "sell"}
          className={`${styles.sideBtn} ${side === "sell" ? styles.sideBtnSell : ""}`}
          onClick={() => setSide("sell")}
        >
          Sell
        </button>
      </div>

      <label className={styles.field}>
        <span className={styles.label}>Symbol</span>
        <select
          className={styles.input}
          value={ticker}
          onChange={(e) => setTicker(e.target.value)}
        >
          {symbols.map((s) => (
            <option key={s.ticker} value={s.ticker}>
              {s.ticker} — {s.name}
            </option>
          ))}
        </select>
      </label>

      <label className={styles.field}>
        <span className={styles.label}>Quantity</span>
        <input
          className={styles.input}
          type="number"
          min="1"
          step="1"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
        />
      </label>

      <div className={styles.summary}>
        <div className={styles.summaryRow}>
          <span>Last price</span>
          <span>{selected ? MONEY.format(selected.lastPrice) : "—"}</span>
        </div>
        <div className={styles.summaryRow}>
          <span>Estimated total</span>
          <span className={styles.totalValue}>
            {selected ? MONEY.format(estimatedTotal) : "—"}
          </span>
        </div>
      </div>

      <button
        type="submit"
        className={`${styles.submit} ${side === "sell" ? styles.submitSell : ""}`}
        disabled={place.isPending || !ticker || qtyNumber <= 0}
      >
        {place.isPending
          ? "Placing…"
          : `${side === "buy" ? "Buy" : "Sell"} ${qtyNumber || ""} ${ticker}`.trim()}
      </button>

      {flash && (
        <div
          className={
            flash.kind === "success" ? styles.success : styles.error
          }
        >
          {flash.text}
        </div>
      )}
    </form>
  );
}
