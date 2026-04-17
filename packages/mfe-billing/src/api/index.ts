import axios from "axios";
import type {
  BillingSummary,
  Invoice,
  PayInvoiceRequest,
  Transaction,
} from "./generated/data-contracts";

export type {
  BillingSummary,
  Currency,
  Invoice,
  InvoiceStatus,
  PayInvoiceRequest,
  Transaction,
  TransactionType,
} from "./generated/data-contracts";

const http = axios.create({
  baseURL: "/api",
  headers: { "Content-Type": "application/json" },
});

export const billingApi = {
  listInvoices: () =>
    http.get<Invoice[]>("/billing/invoices").then((r) => r.data),
  getInvoice: (id: string) =>
    http.get<Invoice>(`/billing/invoices/${id}`).then((r) => r.data),
  payInvoice: (id: string, body: PayInvoiceRequest) =>
    http
      .post<Invoice>(`/billing/invoices/${id}/pay`, body)
      .then((r) => r.data),
  listTransactions: () =>
    http.get<Transaction[]>("/billing/transactions").then((r) => r.data),
  summary: () =>
    http.get<BillingSummary>("/billing/summary").then((r) => r.data),
};

export const billingKeys = {
  all: ["billing"] as const,
  invoices: () => [...billingKeys.all, "invoices"] as const,
  invoice: (id: string) => [...billingKeys.all, "invoice", id] as const,
  transactions: () => [...billingKeys.all, "transactions"] as const,
  summary: () => [...billingKeys.all, "summary"] as const,
};
