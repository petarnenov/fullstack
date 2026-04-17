import { useMutation, useQueryClient } from "@tanstack/react-query";
import { accountsApi, accountsKeys } from "../api";
import type { Account, OnboardingStep } from "../api";
import styles from "./AccountList.module.css";

const STEPS: OnboardingStep[] = [
  "personal_info",
  "identity_verification",
  "funding",
  "review",
];

const STATUS_LABEL: Record<Account["status"], string> = {
  draft: "Draft",
  kyc_pending: "KYC pending",
  verified: "Verified",
  rejected: "Rejected",
};

export default function AccountList({ accounts }: { accounts: Account[] }) {
  const queryClient = useQueryClient();

  const advance = useMutation({
    mutationFn: ({ id, step }: { id: string; step: OnboardingStep }) =>
      accountsApi.advance(id, { step }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: accountsKeys.all });
    },
  });

  if (accounts.length === 0) {
    return <div className={styles.empty}>No accounts yet.</div>;
  }

  return (
    <ul className={styles.list}>
      {accounts.map((account) => {
        const nextStep = STEPS[account.completedSteps.length];
        const canAdvance = !!nextStep && account.status !== "verified";

        return (
          <li key={account.id} className={styles.item}>
            <div className={styles.rowTop}>
              <div>
                <div className={styles.name}>{account.holderName}</div>
                <div className={styles.email}>{account.email}</div>
              </div>
              <span
                className={`${styles.status} ${styles[`status_${account.status}`]}`}
              >
                {STATUS_LABEL[account.status]}
              </span>
            </div>

            <div className={styles.meta}>
              <span className={styles.metaChip}>{account.productType}</span>
              <span className={styles.metaChip}>
                {account.completedSteps.length}/{STEPS.length} steps
              </span>
              <span className={styles.metaId}>{account.id}</span>
            </div>

            <div className={styles.stepsRow}>
              {STEPS.map((step, i) => {
                const done = account.completedSteps.includes(step);
                const current = i === account.completedSteps.length;
                return (
                  <span
                    key={step}
                    className={`${styles.step} ${done ? styles.stepDone : ""} ${current ? styles.stepCurrent : ""}`}
                    title={step}
                  />
                );
              })}
            </div>

            {canAdvance && (
              <button
                type="button"
                className={styles.advance}
                disabled={advance.isPending}
                onClick={() =>
                  advance.mutate({ id: account.id, step: nextStep })
                }
              >
                {advance.isPending
                  ? "Advancing…"
                  : `Advance → ${humanize(nextStep)}`}
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function humanize(step: string): string {
  return step.replace(/_/g, " ");
}
