import axios, { type InternalAxiosRequestConfig } from "axios";
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

/**
 * Cross-MFE auth contract owned by the shell (see
 * platform-shell/src/auth/platformSdk.ts). The MFE does not import shell code;
 * it reads the SDK off window at runtime. The shape is duplicated here
 * intentionally — one-line contract, zero build-time coupling.
 */
interface PlatformSdk {
  getToken(): string | null;
}

const AUTH_EXPIRED_EVENT = "amp:auth-expired";

const http = axios.create({
  baseURL: "/api",
  headers: { "Content-Type": "application/json" },
});

http.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const sdk = (window as unknown as { __AMP_PLATFORM__?: PlatformSdk })
    .__AMP_PLATFORM__;
  const token = sdk?.getToken?.() ?? null;
  if (token) {
    config.headers.set("Authorization", `Bearer ${token}`);
  }
  return config;
});

http.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401 && typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(AUTH_EXPIRED_EVENT));
    }
    return Promise.reject(error);
  },
);

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
