import { describe, it, expect, beforeEach } from "@jest/globals";
import {
  AccountNotFoundError,
  InMemoryAccountsRepository,
  InvalidStepError,
} from "../domains/accounts/accounts.repository";
import { ONBOARDING_STEPS } from "../domains/accounts/accounts.schemas";

describe("Accounts repository", () => {
  let repo: InMemoryAccountsRepository;

  beforeEach(() => {
    repo = new InMemoryAccountsRepository();
  });

  it("creates draft accounts and includes them in list", () => {
    const before = repo.list().length;
    const acc = repo.create({
      holderName: "Test User",
      email: "test@example.com",
      productType: "trading",
    });
    expect(acc.status).toBe("draft");
    expect(acc.completedSteps).toEqual([]);
    expect(repo.list().length).toBe(before + 1);
  });

  it("advances through steps in order and transitions status", () => {
    const acc = repo.create({
      holderName: "Flow Tester",
      email: "flow@example.com",
      productType: "savings",
    });
    for (const step of ONBOARDING_STEPS) {
      const updated = repo.advanceStep(acc.id, step);
      expect(updated.completedSteps).toContain(step);
    }
    const final = repo.get(acc.id)!;
    expect(final.status).toBe("verified");
    expect(final.completedSteps).toEqual([...ONBOARDING_STEPS]);
  });

  it("rejects steps out of order", () => {
    const acc = repo.create({
      holderName: "Jumpy",
      email: "jumpy@example.com",
      productType: "trading",
    });
    expect(() => repo.advanceStep(acc.id, "funding")).toThrow(InvalidStepError);
  });

  it("throws for unknown account", () => {
    expect(() => repo.advanceStep("nope", "personal_info")).toThrow(
      AccountNotFoundError,
    );
  });

  it("progress widget data sums to total", () => {
    const p = repo.getProgress();
    expect(p.draft + p.kycPending + p.verified + p.rejected).toBe(
      p.totalAccounts,
    );
    expect(p.averageCompletion).toBeGreaterThanOrEqual(0);
    expect(p.averageCompletion).toBeLessThanOrEqual(100);
  });
});
