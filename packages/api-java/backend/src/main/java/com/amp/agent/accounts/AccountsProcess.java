package com.amp.agent.accounts;

import com.amp.util.jsontransfer.AccountJTO;
import com.amp.util.jsontransfer.OnboardingProgressJTO;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.List;

/**
 * In-memory accounts state, serialized through the single AccountsManager
 * agent. Mirrors packages/api/src/domains/accounts/accounts.repository.ts.
 */
public class AccountsProcess {

    public static final List<String> ONBOARDING_STEPS = Arrays.asList(
            "personal_info",
            "identity_verification",
            "funding",
            "review"
    );

    private static final List<AccountJTO> ACCOUNTS = new ArrayList<>();
    private static int seq;

    static {
        seed();
        seq = ACCOUNTS.size() + 1;
    }

    private AccountsProcess() {}

    public static List<AccountJTO> list() {
        List<AccountJTO> out = new ArrayList<>(ACCOUNTS);
        out.sort(Comparator.comparing(AccountJTO::getCreatedAt).reversed());
        return out;
    }

    public static AccountJTO get(String id) {
        for (AccountJTO a : ACCOUNTS) {
            if (a.getId().equals(id)) return a;
        }
        return null;
    }

    public static AccountJTO create(String holderName, String email, String productType) {
        String now = Instant.now().toString();
        AccountJTO a = new AccountJTO();
        a.setId("acc_draft_" + (seq++));
        a.setHolderName(holderName);
        a.setEmail(email);
        a.setProductType(productType);
        a.setStatus("draft");
        a.setCompletedSteps(new ArrayList<>());
        a.setCreatedAt(now);
        a.setUpdatedAt(now);
        ACCOUNTS.add(0, a);
        return a;
    }

    public static AdvanceResult advanceStep(String id, String step) {
        AccountJTO account = get(id);
        if (account == null) return AdvanceResult.notFound();

        int expectedIndex = account.getCompletedSteps().size();
        int actualIndex = ONBOARDING_STEPS.indexOf(step);
        if (actualIndex != expectedIndex) {
            String expectedStep = expectedIndex < ONBOARDING_STEPS.size()
                    ? ONBOARDING_STEPS.get(expectedIndex)
                    : "none";
            return AdvanceResult.invalidStep(
                    "Expected step " + expectedStep + ", got " + step);
        }

        List<String> nextSteps = new ArrayList<>(account.getCompletedSteps());
        nextSteps.add(step);
        account.setCompletedSteps(nextSteps);
        account.setStatus(nextStatus(nextSteps.size()));
        account.setUpdatedAt(Instant.now().toString());
        return AdvanceResult.ok(account);
    }

    public static OnboardingProgressJTO getProgress() {
        OnboardingProgressJTO p = new OnboardingProgressJTO();
        p.setTotalAccounts(ACCOUNTS.size());

        double completionSum = 0;
        int stepsTotal = ONBOARDING_STEPS.size();
        for (AccountJTO a : ACCOUNTS) {
            switch (a.getStatus()) {
                case "draft":       p.setDraft(p.getDraft() + 1); break;
                case "kyc_pending": p.setKycPending(p.getKycPending() + 1); break;
                case "verified":   p.setVerified(p.getVerified() + 1); break;
                case "rejected":   p.setRejected(p.getRejected() + 1); break;
                default: break;
            }
            completionSum += (double) a.getCompletedSteps().size() / stepsTotal;
        }

        p.setAverageCompletion(ACCOUNTS.isEmpty()
                ? 0
                : (int) Math.round((completionSum / ACCOUNTS.size()) * 100));
        return p;
    }

    private static String nextStatus(int completedCount) {
        if (completedCount == 0) return "draft";
        if (completedCount < ONBOARDING_STEPS.size() - 1) return "draft";
        if (completedCount < ONBOARDING_STEPS.size()) return "kyc_pending";
        return "verified";
    }

    // ----- seed ---------------------------------------------------------------

    private static String iso(int daysAgo) {
        return Instant.now().minus(daysAgo, ChronoUnit.DAYS).toString();
    }

    private static void seed() {
        ACCOUNTS.add(account("acc_verified_1", "Ada Lovelace", "ada@example.com",
                "trading", "verified",
                new ArrayList<>(ONBOARDING_STEPS), iso(60), iso(45)));
        ACCOUNTS.add(account("acc_verified_2", "Linus Torvalds", "linus@example.com",
                "retirement", "verified",
                new ArrayList<>(ONBOARDING_STEPS), iso(30), iso(12)));
        ACCOUNTS.add(account("acc_kyc_1", "Grace Hopper", "grace@example.com",
                "savings", "kyc_pending",
                new ArrayList<>(Arrays.asList("personal_info", "identity_verification")),
                iso(6), iso(2)));
        ACCOUNTS.add(account("acc_draft_1", "Alan Turing", "alan@example.com",
                "trading", "draft",
                new ArrayList<>(Arrays.asList("personal_info")),
                iso(1), iso(1)));
    }

    private static AccountJTO account(String id, String holderName, String email,
                                      String productType, String status,
                                      List<String> completedSteps,
                                      String createdAt, String updatedAt) {
        AccountJTO a = new AccountJTO();
        a.setId(id);
        a.setHolderName(holderName);
        a.setEmail(email);
        a.setProductType(productType);
        a.setStatus(status);
        a.setCompletedSteps(completedSteps);
        a.setCreatedAt(createdAt);
        a.setUpdatedAt(updatedAt);
        return a;
    }

    public static final class AdvanceResult {
        public final AccountJTO account;
        public final boolean notFound;
        public final String invalidStepReason;

        private AdvanceResult(AccountJTO account, boolean notFound, String invalidStepReason) {
            this.account = account;
            this.notFound = notFound;
            this.invalidStepReason = invalidStepReason;
        }
        static AdvanceResult ok(AccountJTO a) { return new AdvanceResult(a, false, null); }
        static AdvanceResult notFound() { return new AdvanceResult(null, true, null); }
        static AdvanceResult invalidStep(String reason) { return new AdvanceResult(null, false, reason); }
    }
}
