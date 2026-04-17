import { describe, it, expect, beforeEach } from "@jest/globals";
import { InMemoryBillingRepository } from "../domains/billing/billing.repository";

describe("Billing repository", () => {
  let repo: InMemoryBillingRepository;

  beforeEach(() => {
    repo = new InMemoryBillingRepository();
  });

  it("lists invoices sorted newest first", () => {
    const invoices = repo.listInvoices();
    expect(invoices.length).toBeGreaterThan(0);
    for (let i = 1; i < invoices.length; i++) {
      expect(
        invoices[i - 1].issuedAt.localeCompare(invoices[i].issuedAt),
      ).toBeGreaterThanOrEqual(0);
    }
  });

  it("summary reflects outstanding balance from pending + overdue", () => {
    const summary = repo.getSummary();
    const invoices = repo.listInvoices();
    const expected = invoices
      .filter((i) => i.status !== "paid")
      .reduce((sum, i) => sum + i.amount, 0);
    expect(summary.outstandingBalance).toBeCloseTo(expected, 2);
    expect(summary.overdueCount).toBeGreaterThanOrEqual(1);
  });

  it("paying an invoice moves it to paid and reduces outstanding", () => {
    const overdue = repo.listInvoices().find((i) => i.status === "overdue")!;
    const before = repo.getSummary().outstandingBalance;

    const paid = repo.payInvoice(overdue.id, "pm_card_visa");
    expect(paid?.status).toBe("paid");
    expect(paid?.paidAt).toBeTruthy();

    const after = repo.getSummary().outstandingBalance;
    expect(after).toBeCloseTo(before - overdue.amount, 2);
  });

  it("paying an unknown invoice returns undefined", () => {
    expect(repo.payInvoice("nope", "pm_x")).toBeUndefined();
  });

  it("payment creates a charge transaction", () => {
    const pending = repo.listInvoices().find((i) => i.status === "pending")!;
    const countBefore = repo.listTransactions().length;
    repo.payInvoice(pending.id, "pm_card_visa");
    const txns = repo.listTransactions();
    expect(txns.length).toBe(countBefore + 1);
    expect(txns[0].invoiceId).toBe(pending.id);
    expect(txns[0].type).toBe("charge");
  });
});
