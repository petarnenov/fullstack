import { z } from "zod";

export const InvoiceStatusEnum = z.enum(["pending", "paid", "overdue"]);
export const CurrencyEnum = z.enum(["USD", "EUR", "GBP"]);
export const TransactionTypeEnum = z.enum(["charge", "refund", "fee"]);

export const InvoiceSchema = z.object({
  id: z.string(),
  accountId: z.string(),
  amount: z.number(),
  currency: CurrencyEnum,
  status: InvoiceStatusEnum,
  description: z.string(),
  issuedAt: z.string(),
  dueAt: z.string(),
  paidAt: z.string().nullable(),
});

export const TransactionSchema = z.object({
  id: z.string(),
  invoiceId: z.string(),
  accountId: z.string(),
  amount: z.number(),
  currency: CurrencyEnum,
  type: TransactionTypeEnum,
  description: z.string(),
  timestamp: z.string(),
});

export const BillingSummarySchema = z.object({
  outstandingBalance: z.number(),
  currency: CurrencyEnum,
  overdueCount: z.number(),
  pendingCount: z.number(),
  paidThisMonth: z.number(),
});

export const PayInvoiceRequestSchema = z.object({
  paymentMethodId: z.string().min(1),
});

export type Invoice = z.infer<typeof InvoiceSchema>;
export type Transaction = z.infer<typeof TransactionSchema>;
export type BillingSummary = z.infer<typeof BillingSummarySchema>;
export type InvoiceStatus = z.infer<typeof InvoiceStatusEnum>;
export type Currency = z.infer<typeof CurrencyEnum>;
export type PayInvoiceRequest = z.infer<typeof PayInvoiceRequestSchema>;
