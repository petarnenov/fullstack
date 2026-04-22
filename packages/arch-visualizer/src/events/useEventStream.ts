import { useEffect } from "react";
import { useEventStore } from "./eventStore";
import type { TelemetryEvent } from "./types";

const STREAM_URL = "/api/telemetry/stream";
const BACKLOG_URL = "/api/telemetry/events/recent?limit=50";

/**
 * Subscribes to the arch-telemetry SSE feed. On mount, fetches the recent
 * backlog so the visualiser is not empty when opened mid-demo, then opens a
 * live EventSource that auto-reconnects on close.
 */
export function useEventStream(): void {
  const append = useEventStore((s) => s.append);
  const setConnected = useEventStore((s) => s.setConnected);

  useEffect(() => {
    let cancelled = false;

    const hydrate = async () => {
      try {
        const res = await fetch(BACKLOG_URL);
        if (!res.ok) return;
        const backlog = (await res.json()) as TelemetryEvent[];
        if (cancelled) return;
        for (const ev of backlog) append(ev);
      } catch {
        // telemetry service may be down; fail silently
      }
    };

    let source: EventSource | null = null;
    const connect = () => {
      source = new EventSource(STREAM_URL);
      source.addEventListener("event", (e) => {
        try {
          const ev = JSON.parse((e as MessageEvent).data) as TelemetryEvent;
          append(ev);
        } catch {
          // ignore malformed events
        }
      });
      source.addEventListener("open", () => setConnected(true));
      source.addEventListener("error", () => {
        setConnected(false);
        source?.close();
        if (!cancelled) setTimeout(connect, 1500);
      });
    };

    hydrate().then(connect);

    return () => {
      cancelled = true;
      source?.close();
    };
  }, [append, setConnected]);
}
