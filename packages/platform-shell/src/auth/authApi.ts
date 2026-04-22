import axios from "axios";
import type {
  AuthenticatedUser,
  DemoCredential,
  LoginRequest,
  LoginResponse,
} from "../api/generated/data-contracts";
import { installTelemetry } from "./telemetry";

export type { AuthenticatedUser, DemoCredential, LoginRequest, LoginResponse };

const http = axios.create({
  baseURL: "/api/auth",
  headers: { "Content-Type": "application/json" },
});

installTelemetry(http);

export const authApi = {
  login: (body: LoginRequest) =>
    http.post<LoginResponse>("/login", body).then((r) => r.data),

  logout: (token: string) =>
    http
      .post<void>("/logout", undefined, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then(() => undefined),

  me: (token: string) =>
    http
      .get<AuthenticatedUser>("/me", {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((r) => r.data),

  demoCredentials: () =>
    http.get<DemoCredential[]>("/demo-credentials").then((r) => r.data),
};
