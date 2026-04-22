import { useEffect, useState } from "react";
import { useEventStore } from "../events/eventStore";
import type { TelemetryEvent } from "../events/types";

interface Snapshot {
  rps: number;
  errors: number;
  p50: number;
  p95: number;
  perTeam: Record<string, number>;
}

function computeSnapshot(events: TelemetryEvent[]): Snapshot {
  const now = Date.now();
  const windowMs = 10_000;
  const recent = events.filter((e) => now - e.timestamp < windowMs);
  const requests = recent.filter((e) => e.kind === "request");
  const responses = recent.filter((e) => e.kind === "response");
  const durations = responses
    .map((e) => e.durationMs ?? 0)
    .filter((n) => n > 0)
    .sort((a, b) => a - b);
  const pIdx = (p: number) => Math.max(0, Math.min(durations.length - 1, Math.floor((p / 100) * durations.length)));
  const errors = responses.filter((e) => (e.status ?? 200) >= 400).length;
  const perTeam: Record<string, number> = {};
  for (const r of requests) {
    if (r.team) perTeam[r.team] = (perTeam[r.team] ?? 0) + 1;
  }
  return {
    rps: requests.length / (windowMs / 1000),
    errors,
    p50: durations[pIdx(50)] ?? 0,
    p95: durations[pIdx(95)] ?? 0,
    perTeam,
  };
}

export function Stats() {
  const events = useEventStore((s) => s.events);
  const [snap, setSnap] = useState<Snapshot>({ rps: 0, errors: 0, p50: 0, p95: 0, perTeam: {} });

  useEffect(() => {
    const id = setInterval(() => setSnap(computeSnapshot(events)), 500);
    return () => clearInterval(id);
  }, [events]);

  return (
    <div style={panelStyle}>
      <div style={headerStyle}>LIVE</div>
      <Row label="RPS (10s)" value={snap.rps.toFixed(1)} />
      <Row label="p50" value={`${Math.round(snap.p50)}ms`} />
      <Row label="p95" value={`${Math.round(snap.p95)}ms`} />
      <Row label="Errors" value={String(snap.errors)} color={snap.errors ? "#f87171" : undefined} />
      <div style={{ ...dividerStyle, marginTop: 10 }} />
      <div style={{ ...headerStyle, marginTop: 6 }}>BY TEAM</div>
      {Object.entries(snap.perTeam).map(([team, count]) => (
        <Row key={team} label={team} value={String(count)} />
      ))}
      {Object.keys(snap.perTeam).length === 0 && (
        <div style={{ color: "#64748b", fontSize: 11, marginTop: 4 }}>waiting…</div>
      )}
    </div>
  );
}

function Row({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "2px 0" }}>
      <span style={{ color: "#94a3b8", textTransform: "capitalize" }}>{label}</span>
      <span style={{ color: color ?? "#e2e8f0", fontFamily: "ui-monospace, SFMono-Regular", fontWeight: 600 }}>{value}</span>
    </div>
  );
}

const panelStyle: React.CSSProperties = {
  position: "absolute",
  top: 16,
  right: 16,
  width: 200,
  background: "rgba(15, 23, 42, 0.92)",
  border: "1px solid #1e293b",
  borderRadius: 10,
  padding: "10px 12px",
  fontFamily: "ui-sans-serif, system-ui",
  backdropFilter: "blur(6px)",
};

const headerStyle: React.CSSProperties = {
  color: "#64748b",
  fontSize: 10,
  letterSpacing: "0.12em",
  fontWeight: 700,
  marginBottom: 6,
};

const dividerStyle: React.CSSProperties = {
  height: 1,
  background: "#1e293b",
};
