import type {
  Invoice,
  Transaction,
  BillingSummary,
  Currency,
} from "./billing.schemas";

function iso(daysFromNow: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + daysFromNow);
  d.setUTCHours(12, 0, 0, 0);
  return d.toISOString();
}

export interface IBillingRepository {
  listInvoices(): Invoice[];
  getInvoice(id: string): Invoice | undefined;
  payInvoice(id: string, paymentMethodId: string): Invoice | undefined;
  listTransactions(): Transaction[];
  getSummary(): BillingSummary;
}

export class InMemoryBillingRepository implements IBillingRepository {
  private readonly currency: Currency = "USD";

  private invoices: Invoice[] = [
    {
      id: "inv_1001",
      accountId: "acc_verified_1",
      amount: 1250.0,
      currency: "USD",
      status: "overdue",
      description: "Custody fee – March 2026",
      issuedAt: iso(-45),
      dueAt: iso(-15),
      paidAt: null,
    },
    {
      id: "inv_1002",
      accountId: "acc_verified_1",
      amount: 420.5,
      currency: "USD",
      status: "pending",
      description: "Trading commissions – April 2026",
      issuedAt: iso(-10),
      dueAt: iso(5),
      paidAt: null,
    },
    {
      id: "inv_1003",
      accountId: "acc_verified_2",
      amount: 89.99,
      currency: "USD",
      status: "pending",
      description: "Market data subscription – April 2026",
      issuedAt: iso(-7),
      dueAt: iso(14),
      paidAt: null,
    },
    {
      id: "inv_1004",
      accountId: "acc_verified_1",
      amount: 750.0,
      currency: "USD",
      status: "paid",
      description: "Advisory services – Q1 2026",
      issuedAt: iso(-40),
      dueAt: iso(-10),
      paidAt: iso(-12),
    },
  ];

  private transactions: Transaction[] = [
    {
      id: "txn_2001",
      invoiceId: "inv_1004",
      accountId: "acc_verified_1",
      amount: 750.0,
      currency: "USD",
      type: "charge",
      description: "Payment for invoice inv_1004",
      timestamp: iso(-12),
    },
    {
      id: "txn_2002",
      invoiceId: "inv_1004",
      accountId: "acc_verified_1",
      amount: 5.0,
      currency: "USD",
      type: "fee",
      description: "Processing fee",
      timestamp: iso(-12),
    },
  ];

  private nextInvoiceTxn = 2003;

  listInvoices(): Invoice[] {
    return [...this.invoices].sort((a, b) =>
      b.issuedAt.localeCompare(a.issuedAt),
    );
  }

  getInvoice(id: string): Invoice | undefined {
    return this.invoices.find((i) => i.id === id);
  }

  payInvoice(id: string, paymentMethodId: string): Invoice | undefined {
    const invoice = this.invoices.find((i) => i.id === id);
    if (!invoice) return undefined;
    if (invoice.status === "paid") return invoice;

    invoice.status = "paid";
    invoice.paidAt = new Date().toISOString();

    this.transactions.unshift({
      id: `txn_${this.nextInvoiceTxn++}`,
      invoiceId: invoice.id,
      accountId: invoice.accountId,
      amount: invoice.amount,
      currency: invoice.currency,
      type: "charge",
      description: `Payment for invoice ${invoice.id} via ${paymentMethodId}`,
      timestamp: invoice.paidAt,
    });

    return invoice;
  }

  listTransactions(): Transaction[] {
    return [...this.transactions].sort((a, b) =>
      b.timestamp.localeCompare(a.timestamp),
    );
  }

  getSummary(): BillingSummary {
    const now = new Date();
    const thisMonth = now.toISOString().slice(0, 7);

    let outstanding = 0;
    let overdue = 0;
    let pending = 0;
    let paidThisMonth = 0;

    for (const inv of this.invoices) {
      if (inv.status === "overdue") {
        overdue += 1;
        outstanding += inv.amount;
      } else if (inv.status === "pending") {
        pending += 1;
        outstanding += inv.amount;
      } else if (inv.status === "paid" && inv.paidAt?.startsWith(thisMonth)) {
        paidThisMonth += inv.amount;
      }
    }

    return {
      outstandingBalance: Math.round(outstanding * 100) / 100,
      currency: this.currency,
      overdueCount: overdue,
      pendingCount: pending,
      paidThisMonth: Math.round(paidThisMonth * 100) / 100,
    };
  }
}

export const billingRepository: IBillingRepository =
  new InMemoryBillingRepository();
