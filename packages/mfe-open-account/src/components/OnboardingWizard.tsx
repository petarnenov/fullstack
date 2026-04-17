import { useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { accountsApi, accountsKeys } from "../api";
import type { ProductType } from "../api";
import styles from "./OnboardingWizard.module.css";

const PRODUCTS: { value: ProductType; label: string }[] = [
  { value: "trading", label: "Trading" },
  { value: "savings", label: "Savings" },
  { value: "retirement", label: "Retirement" },
];

export default function OnboardingWizard() {
  const queryClient = useQueryClient();
  const [holderName, setHolderName] = useState("");
  const [email, setEmail] = useState("");
  const [productType, setProductType] = useState<ProductType>("trading");
  const [lastCreatedId, setLastCreatedId] = useState<string | null>(null);

  const create = useMutation({
    mutationFn: accountsApi.create,
    onSuccess: (account) => {
      queryClient.invalidateQueries({ queryKey: accountsKeys.all });
      setLastCreatedId(account.id);
      setHolderName("");
      setEmail("");
    },
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!holderName || !email) return;
    create.mutate({ holderName, email, productType });
  };

  return (
    <form className={styles.form} onSubmit={submit}>
      <label className={styles.field}>
        <span className={styles.label}>Holder name</span>
        <input
          className={styles.input}
          value={holderName}
          onChange={(e) => setHolderName(e.target.value)}
          placeholder="Jane Doe"
          required
          minLength={2}
        />
      </label>

      <label className={styles.field}>
        <span className={styles.label}>Email</span>
        <input
          className={styles.input}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="jane@example.com"
          required
        />
      </label>

      <label className={styles.field}>
        <span className={styles.label}>Product</span>
        <select
          className={styles.input}
          value={productType}
          onChange={(e) => setProductType(e.target.value as ProductType)}
        >
          {PRODUCTS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
      </label>

      <button
        type="submit"
        className={styles.submit}
        disabled={create.isPending}
      >
        {create.isPending ? "Starting…" : "Start onboarding"}
      </button>

      {create.isError && (
        <div className={styles.error}>
          Couldn't create account. Check the inputs and retry.
        </div>
      )}

      {lastCreatedId && (
        <div className={styles.success}>
          Draft created: <code>{lastCreatedId}</code>. Advance it in the
          pipeline.
        </div>
      )}
    </form>
  );
}
