import axios from "axios";
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

const http = axios.create({
  baseURL: "/api",
  headers: { "Content-Type": "application/json" },
});

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
