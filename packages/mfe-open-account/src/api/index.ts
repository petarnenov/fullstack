import axios, { type InternalAxiosRequestConfig } from "axios";
import type {
  Account,
  AdvanceStepRequest,
  CreateAccountRequest,
  OnboardingProgress,
} from "./generated/data-contracts";

export type {
  Account,
  AccountStatus,
  AdvanceStepRequest,
  CreateAccountRequest,
  OnboardingProgress,
  OnboardingStep,
  ProductType,
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

export const accountsApi = {
  list: () => http.get<Account[]>("/accounts").then((r) => r.data),
  progress: () =>
    http.get<OnboardingProgress>("/accounts/progress").then((r) => r.data),
  get: (id: string) =>
    http.get<Account>(`/accounts/${id}`).then((r) => r.data),
  create: (body: CreateAccountRequest) =>
    http.post<Account>("/accounts", body).then((r) => r.data),
  advance: (id: string, body: AdvanceStepRequest) =>
    http.post<Account>(`/accounts/${id}/advance`, body).then((r) => r.data),
};

export const accountsKeys = {
  all: ["accounts"] as const,
  list: () => [...accountsKeys.all, "list"] as const,
  progress: () => [...accountsKeys.all, "progress"] as const,
  detail: (id: string) => [...accountsKeys.all, "detail", id] as const,
};
