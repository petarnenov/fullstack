import type { QueryClient } from "@tanstack/react-query";

/**
 * QueryClient is a shared federation singleton (see CLAUDE.md constraint #1),
 * so subscribing once in the shell captures invalidations triggered from any
 * MFE. The visualiser renders these as lilac ripples fanning out from the
 * QueryClient node.
 *
 * The queryKey's first segment maps 1:1 to an MFE via convention (see each
 * MFE's *Keys factory), which gives us the originating team without
 * cross-package imports.
 */
const TELEMETRY_HOST = typeof window !== "undefined" ? window.location.hostname : "localhost";
const TELEMETRY_URL = `http://${TELEMETRY_HOST}:8091/api/telemetry/events`;

const KEY_TO_MFE: Record<string, { from: string; team: string }> = {
  billing: { from: "mfe-billing", team: "billing" },
  accounts: { from: "mfe-open-account", team: "accounts" },
  trading: { from: "mfe-trading", team: "trading" },
  reporting: { from: "mfe-reporting", team: "reporting" },
};

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
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

export function installCacheTelemetry(queryClient: QueryClient): void {
  const cache = queryClient.getQueryCache();
  cache.subscribe((event) => {
    if (event.type !== "updated") return;
    const action = (event as unknown as { action?: { type?: string } }).action;
    if (!action || action.type !== "invalidate") return;

    const keys = event.query.queryKey as readonly unknown[];
    const head = typeof keys[0] === "string" ? keys[0] : "";
    const mapped = KEY_TO_MFE[head] ?? { from: "shell", team: "platform" };
    const observers = event.query.getObserversCount();

    emit({
      id: newId(),
      kind: "invalidate",
      from: mapped.from,
      to: "queryClient",
      team: mapped.team,
      path: keys.filter((k) => typeof k === "string").join("."),
      meta: { observers, keys },
      timestamp: Date.now(),
    });
  });
}
