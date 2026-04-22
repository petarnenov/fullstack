import axios from "axios";
import type {
  AuthenticatedUser,
  DemoCredential,
  LoginRequest,
  LoginResponse,
} from "../api/generated/data-contracts";
import { emitLoginCeremony, installTelemetry } from "./telemetry";

export type { AuthenticatedUser, DemoCredential, LoginRequest, LoginResponse };

const CSRF_HEADER = "X-CSRF-Token";

// The access+refresh+csrf cookies are set by the API on 200s to /login and
// /refresh; axios doesn't need to touch them. withCredentials ensures cookies
// ride every subsequent request — both same-origin (via the vite proxy) and
// true cross-origin in LAN demo mode where the browser host != API host.
const http = axios.create({
  baseURL: "/api/auth",
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
});

installTelemetry(http);

export const authApi = {
  login: (body: LoginRequest) =>
    http.post<LoginResponse>("/login", body).then((r) => {
      emitLoginCeremony();
      return r.data;
    }),

  refresh: (csrfToken: string) =>
    http
      .post<LoginResponse>("/refresh", undefined, {
        headers: { [CSRF_HEADER]: csrfToken },
      })
      .then((r) => r.data),

  logout: (csrfToken: string) =>
    http
      .post<void>("/logout", undefined, {
        headers: { [CSRF_HEADER]: csrfToken },
      })
      .then(() => undefined),

  me: () => http.get<AuthenticatedUser>("/me").then((r) => r.data),

  demoCredentials: () =>
    http.get<DemoCredential[]>("/demo-credentials").then((r) => r.data),
};
