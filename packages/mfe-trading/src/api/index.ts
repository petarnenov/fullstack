import axios, { type InternalAxiosRequestConfig } from "axios";
import type {
  CashBalance,
  DepositRequest,
  Order,
  PlaceOrderRequest,
  PortfolioSummary,
  Position,
  TradingAccountView,
  TradingSymbol,
} from "./generated/data-contracts";

export type {
  CashBalance,
  DepositRequest,
  Order,
  OrderSide,
  OrderStatus,
  PlaceOrderRequest,
  PortfolioSummary,
  Position,
  TradingAccountView,
  TradingSymbol,
} from "./generated/data-contracts";

/**
 * Cross-MFE auth contract owned by the shell (see
 * platform-shell/src/auth/platformSdk.ts). The MFE does not import shell code;
 * it reads the SDK off window at runtime. The shape is duplicated here
 * intentionally — one-line contract, zero build-time coupling.
 *
 * Access tokens live in an httpOnly cookie (invisible to JS). All we read
 * from the SDK is the CSRF token we echo in the X-CSRF-Token header.
 */
interface PlatformSdk {
  csrfToken: string | null;
}

const AUTH_EXPIRED_EVENT = "amp:auth-expired";
const CSRF_HEADER = "X-CSRF-Token";
const SAFE_METHODS = new Set(["get", "head", "options"]);

const http = axios.create({
  baseURL: "/api",
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
});

http.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const method = (config.method ?? "get").toLowerCase();
  if (SAFE_METHODS.has(method)) return config;
  const sdk = (window as unknown as { __AMP_PLATFORM__?: PlatformSdk })
    .__AMP_PLATFORM__;
  const csrf = sdk?.csrfToken ?? null;
  if (csrf) config.headers.set(CSRF_HEADER, csrf);
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

export const tradingApi = {
  listSymbols: () =>
    http.get<TradingSymbol[]>("/trading/symbols").then((r) => r.data),
  listAccounts: () =>
    http.get<TradingAccountView[]>("/trading/accounts").then((r) => r.data),
  getCash: (accountId: string) =>
    http.get<CashBalance>(`/trading/cash/${accountId}`).then((r) => r.data),
  deposit: (body: DepositRequest) =>
    http.post<CashBalance>("/trading/cash/deposit", body).then((r) => r.data),
  listPositions: (accountId?: string) =>
    http
      .get<Position[]>("/trading/positions", {
        params: accountId ? { accountId } : undefined,
      })
      .then((r) => r.data),
  listOrders: (accountId?: string) =>
    http
      .get<Order[]>("/trading/orders", {
        params: accountId ? { accountId } : undefined,
      })
      .then((r) => r.data),
  placeOrder: (body: PlaceOrderRequest) =>
    http.post<Order>("/trading/orders", body).then((r) => r.data),
  portfolio: (accountId: string) =>
    http
      .get<PortfolioSummary>("/trading/portfolio", {
        params: { accountId },
      })
      .then((r) => r.data),
};

export const tradingKeys = {
  all: ["trading"] as const,
  symbols: () => [...tradingKeys.all, "symbols"] as const,
  accounts: () => [...tradingKeys.all, "accounts"] as const,
  cash: (accountId: string) =>
    [...tradingKeys.all, "cash", accountId] as const,
  positions: (accountId: string) =>
    [...tradingKeys.all, "positions", accountId] as const,
  orders: (accountId: string) =>
    [...tradingKeys.all, "orders", accountId] as const,
  portfolio: (accountId: string) =>
    [...tradingKeys.all, "portfolio", accountId] as const,
};
