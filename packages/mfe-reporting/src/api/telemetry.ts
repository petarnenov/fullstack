/**
 * Visualiser telemetry — duplicated inline in every MFE (see CLAUDE.md: no
 * shared-code packages across team boundaries). The emitter is demo-only
 * observability: fire-and-forget, cross-origin POST to :8091. If the
 * telemetry service is down it silently degrades — the real demo keeps
 * working.
 */
import type { AxiosInstance, InternalAxiosRequestConfig } from "axios";

const TELEMETRY_HOST = typeof window !== "undefined" ? window.location.hostname : "localhost";
const TELEMETRY_URL = `http://${TELEMETRY_HOST}:8091/api/telemetry/events`;
const ME = "mfe-reporting";
const DEFAULT_TARGET = { to: "bff-reporting", team: "reporting" };

interface TelemetryMeta {
  cid: string;
  started: number;
}

function emit(event: Record<string, unknown>): void {
  try {
    const body = JSON.stringify(event);
    if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
      const blob = new Blob([body], { type: "application/json" });
      navigator.sendBeacon(TELEMETRY_URL, blob);
      return;
    }
    fetch(TELEMETRY_URL, {
      method: "POST",
      body,
      headers: { "Content-Type": "application/json" },
      keepalive: true,
      mode: "cors",
    }).catch(() => {});
  } catch {
    // swallow
  }
}

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function installTelemetry(http: AxiosInstance): void {
  http.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    const cid = newId();
    const started =
      typeof performance !== "undefined" ? performance.now() : Date.now();
    config.headers.set("X-Correlation-Id", cid);
    (config as unknown as { telemetry: TelemetryMeta }).telemetry = { cid, started };
    emit({
      id: newId(),
      correlationId: cid,
      kind: "request",
      from: ME,
      to: DEFAULT_TARGET.to,
      team: DEFAULT_TARGET.team,
      method: (config.method ?? "GET").toUpperCase(),
      path: config.url,
      timestamp: Date.now(),
    });
    return config;
  });

  http.interceptors.response.use(
    (response) => {
      const meta = (response.config as unknown as { telemetry?: TelemetryMeta }).telemetry;
      if (meta) {
        const now =
          typeof performance !== "undefined" ? performance.now() : Date.now();
        emit({
          id: newId(),
          correlationId: meta.cid,
          kind: "response",
          from: DEFAULT_TARGET.to,
          to: ME,
          team: DEFAULT_TARGET.team,
          method: (response.config.method ?? "GET").toUpperCase(),
          path: response.config.url,
          status: response.status,
          durationMs: now - meta.started,
          timestamp: Date.now(),
        });
      }
      return response;
    },
    (error) => {
      const cfg = error?.config;
      const meta = cfg ? (cfg as { telemetry?: TelemetryMeta }).telemetry : undefined;
      if (meta) {
        const now =
          typeof performance !== "undefined" ? performance.now() : Date.now();
        emit({
          id: newId(),
          correlationId: meta.cid,
          kind: "response",
          from: DEFAULT_TARGET.to,
          to: ME,
          team: DEFAULT_TARGET.team,
          method: (cfg.method ?? "GET").toUpperCase(),
          path: cfg.url,
          status: error?.response?.status ?? 0,
          durationMs: now - meta.started,
          timestamp: Date.now(),
        });
      }
      return Promise.reject(error);
    },
  );
}
