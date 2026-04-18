import axios from "axios";
import type {
  AuthenticatedUser,
  DemoCredential,
  LoginRequest,
  SessionResponse,
} from "../api/generated/data-contracts";

export type { AuthenticatedUser, DemoCredential, LoginRequest, SessionResponse };

const CSRF_HEADER = "X-CSRF-Token";

// The axios client talks same-origin via the vite proxy, so cookies attach
// automatically. withCredentials is still needed for any direct cross-origin
// call (e.g. LAN demo where the API host differs from the shell host).
const http = axios.create({
  baseURL: "/api/auth",
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
});

export const authApi = {
  login: (body: LoginRequest) =>
    http.post<SessionResponse>("/login", body).then((r) => r.data),

  refresh: (csrfToken: string) =>
    http
      .post<SessionResponse>("/refresh", undefined, {
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
