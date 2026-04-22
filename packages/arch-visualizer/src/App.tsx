import { useEventStream } from "./events/useEventStream";
import { useAudioCues } from "./audio/cues";
import { Topology } from "./topology/Topology";
import { ParticleLayer } from "./particles/ParticleLayer";
import { Stats } from "./hud/Stats";
import { Storyline } from "./hud/Storyline";
import { Controls } from "./hud/Controls";
import { TEAM_COLORS } from "./topology/topologyDef";

export default function App() {
  useEventStream();
  useAudioCues();

  return (
    <div style={{ width: "100vw", height: "100vh", overflow: "hidden", background: "#020617", position: "relative" }}>
      <Topology>
        <ParticleLayer />
      </Topology>
      <Controls />
      <Stats />
      <Storyline />
      <Legend />
    </div>
  );
}

function Legend() {
  return (
    <div
      style={{
        position: "absolute",
        bottom: 16,
        right: 16,
        background: "rgba(15, 23, 42, 0.92)",
        border: "1px solid #1e293b",
        borderRadius: 10,
        padding: "8px 12px",
        fontFamily: "ui-sans-serif, system-ui",
        fontSize: 11,
      }}
    >
      <div style={{ color: "#64748b", fontSize: 10, letterSpacing: "0.12em", fontWeight: 700, marginBottom: 6 }}>
        TEAMS
      </div>
      {Object.entries(TEAM_COLORS).map(([team, color]) => (
        <div key={team} style={{ display: "flex", alignItems: "center", gap: 8, padding: "2px 0" }}>
          <span style={{ width: 10, height: 10, borderRadius: 5, background: color, display: "inline-block" }} />
          <span style={{ color: "#cbd5e1", textTransform: "capitalize" }}>{team}</span>
        </div>
      ))}
    </div>
  );
}
