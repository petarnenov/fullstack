import { useEffect } from "react";
import { useEventStore } from "../events/eventStore";

export function Controls() {
  const paused = useEventStore((s) => s.paused);
  const soundOn = useEventStore((s) => s.soundOn);
  const connected = useEventStore((s) => s.connected);
  const togglePaused = useEventStore((s) => s.togglePaused);
  const toggleSound = useEventStore((s) => s.toggleSound);
  const step = useEventStore((s) => s.step);
  const rewind = useEventStore((s) => s.rewind);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target && (e.target as HTMLElement).tagName === "INPUT") return;
      switch (e.key) {
        case " ":
          e.preventDefault();
          togglePaused();
          break;
        case "ArrowRight":
          step(1);
          break;
        case "ArrowLeft":
          step(-1);
          break;
        case "r":
        case "R":
          rewind();
          break;
        case "s":
        case "S":
          toggleSound();
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [togglePaused, toggleSound, step, rewind]);

  return (
    <div style={panelStyle}>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <Indicator on={connected} label={connected ? "LIVE" : "OFFLINE"} tone={connected ? "#22c55e" : "#f87171"} />
        <Indicator on={paused} label={paused ? "PAUSED" : "PLAY"} tone={paused ? "#fbbf24" : "#60a5fa"} />
        <Indicator on={soundOn} label="SOUND" tone="#a855f7" />
      </div>
      <div style={{ color: "#64748b", fontSize: 10, marginTop: 6, fontFamily: "ui-monospace, SFMono-Regular" }}>
        Space · pause/play · ← → step · R rewind · S sound
      </div>
    </div>
  );
}

function Indicator({ on, label, tone }: { on: boolean; label: string; tone: string }) {
  return (
    <div
      style={{
        padding: "2px 8px",
        borderRadius: 999,
        border: `1px solid ${on ? tone : "#334155"}`,
        color: on ? tone : "#64748b",
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: "0.08em",
      }}
    >
      {label}
    </div>
  );
}

const panelStyle: React.CSSProperties = {
  position: "absolute",
  top: 16,
  left: 16,
  background: "rgba(15, 23, 42, 0.92)",
  border: "1px solid #1e293b",
  borderRadius: 10,
  padding: "8px 12px",
  fontFamily: "ui-sans-serif, system-ui",
  backdropFilter: "blur(6px)",
};
