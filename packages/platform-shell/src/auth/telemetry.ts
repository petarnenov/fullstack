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
const ME = "shell";
const DEFAULT_TARGET = { to: "api-java:auth", team: "platform" };

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
    }).catch(() => {
      // swallow — telemetry must never break the demo
    });
  } catch {
    // swallow — telemetry must never break the demo
  }
}

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/**
 * Fires the login ceremony so the visualiser can animate the story beyond
 * what the HTTP interceptor alone captures: the Hibernate write of the
 * session into H2, and the csrf broadcast from shell to every MFE via
 * `window.__AMP_PLATFORM__.csrfToken`. Access + refresh tokens travel in
 * httpOnly cookies so they're never touched by JS; we emit a synthetic
 * event here purely for visualiser storytelling.
 */
export function emitLoginCeremony(correlationId?: string): void {
  const base = { team: "platform", timestamp: Date.now(), correlationId };
  // Session persist round-trip — api-java:auth writes access + refresh rows
  // to H2 then commits. Cookie emission itself is implicit in the
  // login response but we paint it as a story beat for the audience.
  setTimeout(() => {
    emit({ ...base, id: newId(), kind: "auth-login", from: "api-java:auth", to: "h2", path: "session + refresh persisted" });
  }, 220);
  setTimeout(() => {
    emit({ ...base, id: newId(), kind: "auth-login", from: "h2", to: "api-java:auth", path: "family committed" });
  }, 820);

  // CSRF broadcast: shell publishes the csrfToken via window.__AMP_PLATFORM__
  // so every MFE axios interceptor can echo it on state-changing writes.
  // Access + refresh live in httpOnly cookies — the browser, not JS, is what
  // carries them to the next request.
  const mfes = ["mfe-open-account", "mfe-billing", "mfe-trading", "mfe-reporting"];
  setTimeout(() => {
    for (const to of mfes) {
      emit({ ...base, id: newId(), kind: "token-broadcast", from: "shell", to, path: "csrfToken" });
    }
  }, 1400);
}

/**
 * Fires when the shell's silent /refresh cycle rotates a family. Mirrors
 * the login ceremony shape so the visualiser can reuse its animation:
 * the H2 rotate + the csrf re-broadcast after a fresh cookie set.
 */
export function emitRefreshCeremony(correlationId?: string): void {
  const base = { team: "platform", timestamp: Date.now(), correlationId };
  setTimeout(() => {
    emit({ ...base, id: newId(), kind: "auth-refresh", from: "api-java:auth", to: "h2", path: "rotate family" });
  }, 220);
  setTimeout(() => {
    emit({ ...base, id: newId(), kind: "auth-refresh", from: "h2", to: "api-java:auth", path: "old revoked, new committed" });
  }, 820);
  const mfes = ["mfe-open-account", "mfe-billing", "mfe-trading", "mfe-reporting"];
  setTimeout(() => {
    for (const to of mfes) {
      emit({ ...base, id: newId(), kind: "token-broadcast", from: "shell", to, path: "csrfToken (rotated)" });
    }
  }, 1400);
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
