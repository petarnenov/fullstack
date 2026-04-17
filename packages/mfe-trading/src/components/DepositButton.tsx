import { useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { tradingApi, tradingKeys } from "../api";
import styles from "./DepositButton.module.css";

const MONEY = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

export default function DepositButton({ accountId }: { accountId: string }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("10000");
  const [flash, setFlash] = useState<string | null>(null);

  const deposit = useMutation({
    mutationFn: tradingApi.deposit,
    onSuccess: (balance) => {
      queryClient.invalidateQueries({ queryKey: tradingKeys.all });
      setFlash(`+${MONEY.format(balance.cashAvailable)} now available`);
      setTimeout(() => {
        setFlash(null);
        setOpen(false);
      }, 1500);
    },
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const value = Number.parseFloat(amount);
    if (!Number.isFinite(value) || value <= 0) return;
    deposit.mutate({ accountId, amount: value });
  };

  return (
    <div className={styles.wrap}>
      {!open ? (
        <button
          type="button"
          className={styles.trigger}
          onClick={() => setOpen(true)}
        >
          + Deposit
        </button>
      ) : (
        <form className={styles.form} onSubmit={submit}>
          <input
            className={styles.input}
            type="number"
            min="0.01"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            autoFocus
          />
          <button
            type="submit"
            className={styles.submit}
            disabled={deposit.isPending}
          >
            {deposit.isPending ? "…" : "Fund"}
          </button>
          <button
            type="button"
            className={styles.cancel}
            onClick={() => setOpen(false)}
          >
            Cancel
          </button>
          {flash && <span className={styles.flash}>{flash}</span>}
        </form>
      )}
    </div>
  );
}
