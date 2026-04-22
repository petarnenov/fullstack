import axios, { type InternalAxiosRequestConfig } from "axios";
import type { AccountReport } from "./generated/data-contracts";

export type { AccountReport } from "./generated/data-contracts";

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

// Reporting talks to its BFF (packages/bff-reporting :8090), never to the
// monolith directly. The shell's vite proxy routes /api/reporting/* to :8090;
// standalone mode proxies the same path from this package's vite config.
const http = axios.create({
  baseURL: "/api/reporting",
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

export interface BffHealth {
  status: string;
  service: string;
  timestamp: string;
}

export const reportingApi = {
  health: () => http.get<BffHealth>("/health").then((r) => r.data),
  summary: () => http.get<AccountReport[]>("/summary").then((r) => r.data),
};

export const reportingKeys = {
  all: ["reporting"] as const,
  health: () => [...reportingKeys.all, "health"] as const,
  summary: () => [...reportingKeys.all, "summary"] as const,
};
