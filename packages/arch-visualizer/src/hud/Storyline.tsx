import { useEventStore } from "../events/eventStore";
import type { TelemetryEvent } from "../events/types";

function humanise(ev: TelemetryEvent): string {
  switch (ev.kind) {
    case "request":
      return `→ ${ev.from} calls ${ev.to}  ${ev.method ?? ""} ${ev.path ?? ""}`.trim();
    case "response": {
      const ms = ev.durationMs != null ? ` (${Math.round(ev.durationMs)}ms)` : "";
      return `← ${ev.to} → ${ev.from}  ${ev.status ?? "?"}${ms}`;
    }
    case "invalidate":
      return `✦ ${ev.from} invalidated  ${ev.path ?? ""}`;
    case "lazy-load":
      return `⚙ shell lazy-loaded ${ev.to}`;
    case "auth-login":
      return `🔑 ${ev.from} → ${ev.to}  ${ev.path ?? "login"}`;
    case "auth-refresh":
      return `♻ silent refresh  ${ev.from} → ${ev.to}`;
    case "token-broadcast":
      return `🪙 csrf broadcast  shell → ${ev.to}`;
    default:
      return `${ev.kind} ${ev.from} → ${ev.to}`;
  }
}

export function Storyline() {
  const events = useEventStore((s) => s.events);
  const recent = events.slice(-8).reverse();

  return (
    <div style={panelStyle}>
      <div style={headerStyle}>NARRATION</div>
      {recent.length === 0 && (
        <div style={{ color: "#64748b", fontSize: 12 }}>
          Waiting for events. Open the app at <span style={{ color: "#e2e8f0" }}>http://localhost:5173</span> and click around.
        </div>
      )}
      {recent.map((ev, i) => (
        <div
          key={ev.id}
          style={{
            fontSize: 12,
            color: i === 0 ? "#e2e8f0" : "#64748b",
            padding: "2px 0",
            fontFamily: "ui-monospace, SFMono-Regular",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {humanise(ev)}
        </div>
      ))}
    </div>
  );
}

const panelStyle: React.CSSProperties = {
  position: "absolute",
  right: 216,
  bottom: 16,
  width: 520,
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
