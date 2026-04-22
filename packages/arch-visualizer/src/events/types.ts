export type EventKind =
  | "request"
  | "response"
  | "invalidate"
  | "lazy-load"
  | "auth-login"
  | "token-broadcast";

export type NodeId =
  | "user"
  | "shell"
  | "queryClient"
  | "mfe-billing"
  | "mfe-open-account"
  | "mfe-trading"
  | "mfe-reporting"
  | "bff-reporting"
  | "api-java:auth"
  | "api-java:billing"
  | "api-java:accounts"
  | "api-java:trading"
  | "h2";

export type Team =
  | "platform"
  | "billing"
  | "accounts"
  | "trading"
  | "reporting"
  | "infra";

export interface TelemetryEvent {
  id: string;
  correlationId?: string;
  parentId?: string;
  kind: EventKind;
  from: NodeId | string;
  to: NodeId | string;
  team?: Team | string;
  method?: string;
  path?: string;
  status?: number;
  durationMs?: number;
  meta?: Record<string, unknown>;
  timestamp: number;
}
