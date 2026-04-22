import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useEventStore } from "../events/eventStore";
import type { TelemetryEvent } from "../events/types";
import { EDGES, TEAM_COLORS, edgePath, nodeCenter } from "../topology/topologyDef";

interface ActiveParticle {
  key: string;
  path: string;
  reverse: boolean;
  color: string;
  size: number;
  durationMs: number;
  label?: string;
}

interface EdgeFlash {
  key: string;
  path: string;
  color: string;
  ttlMs: number;
}

interface LatencyGhost {
  key: string;
  x: number;
  y: number;
  text: string;
  color: string;
}

interface Ripple {
  key: string;
  cx: number;
  cy: number;
  color: string;
  label?: string;
}

const EDGE_LOOKUP = new Map(
  EDGES.flatMap((e) => [
    [`${e.from}→${e.to}`, { edge: e, reverse: false }],
    [`${e.to}→${e.from}`, { edge: e, reverse: true }],
  ]),
);

const PARTICLE_MS = 1750;
const FLASH_MS = 1600;
const GHOST_MS = 2200;
const RIPPLE_MS = 2400;
const AUTH_PARTICLE_MS = 2100;
const TOKEN_PARTICLE_MS = 1950;
const AUTH_COLOR = "#fbbf24"; // amber-400 — login ceremony
const TOKEN_COLOR = "#eab308"; // yellow-500 — token broadcast

function particleColor(ev: TelemetryEvent): string {
  if (ev.kind === "invalidate") return "#a855f7";
  if (ev.team && ev.team in TEAM_COLORS) return TEAM_COLORS[ev.team as keyof typeof TEAM_COLORS];
  switch (ev.method) {
    case "GET": return "#60a5fa";
    case "POST": return "#34d399";
    case "PUT": return "#fbbf24";
    case "DELETE": return "#f87171";
    default: return "#e2e8f0";
  }
}

function statusFlashColor(status?: number): string {
  if (!status) return "#94a3b8";
  if (status >= 500) return "#ef4444";
  if (status >= 400) return "#f59e0b";
  if (status >= 300) return "#eab308";
  return "#22c55e";
}

/**
 * Animates telemetry events onto the topology SVG. Renders inside the parent
 * <svg>, so it must be mounted as a child of <Topology>.
 */
export function ParticleLayer() {
  const events = useEventStore((s) => s.events);
  const [particles, setParticles] = useState<ActiveParticle[]>([]);
  const [flashes, setFlashes] = useState<EdgeFlash[]>([]);
  const [ghosts, setGhosts] = useState<LatencyGhost[]>([]);
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const processed = useRef(new Set<string>());

  useEffect(() => {
    for (const ev of events) {
      if (processed.current.has(ev.id)) continue;
      processed.current.add(ev.id);

      if (ev.kind === "invalidate") {
        const qc = nodeCenter("queryClient");
        if (qc) {
          const rKey = `r-${ev.id}`;
          setRipples((list) => [
            ...list,
            {
              key: rKey,
              cx: qc.x,
              cy: qc.y,
              color: "#a855f7",
              label: ev.path,
            },
          ]);
          setTimeout(() => {
            setRipples((list) => list.filter((r) => r.key !== rKey));
          }, RIPPLE_MS + 40);
        }
        const key = `${ev.from}→queryClient`;
        const hit = EDGE_LOOKUP.get(key);
        if (hit) {
          const path = edgePath(hit.edge);
          const pKey = `p-${ev.id}`;
          setParticles((list) => [
            ...list,
            { key: pKey, path, reverse: hit.reverse, color: "#a855f7", size: 5, durationMs: PARTICLE_MS, label: "invalidate" },
          ]);
          setTimeout(() => {
            setParticles((list) => list.filter((p) => p.key !== pKey));
          }, PARTICLE_MS + 40);
        }
        continue;
      }

      if (ev.kind === "auth-login" || ev.kind === "token-broadcast") {
        const key = `${ev.from}→${ev.to}`;
        const hit = EDGE_LOOKUP.get(key);
        if (!hit) continue;
        const path = edgePath(hit.edge);
        const color = ev.kind === "auth-login" ? AUTH_COLOR : TOKEN_COLOR;
        const duration = ev.kind === "auth-login" ? AUTH_PARTICLE_MS : TOKEN_PARTICLE_MS;
        const label = ev.kind === "auth-login" ? "auth" : "token";
        const pKey = `p-${ev.id}`;
        setParticles((list) => [
          ...list,
          { key: pKey, path, reverse: hit.reverse, color, size: 7, durationMs: duration, label },
        ]);
        setTimeout(() => {
          setParticles((list) => list.filter((p) => p.key !== pKey));
        }, duration + 40);

        // Flash the edge so the path itself glows during the ceremony.
        const fKey = `f-${ev.id}`;
        setFlashes((list) => [...list, { key: fKey, path, color, ttlMs: duration }]);
        setTimeout(() => {
          setFlashes((list) => list.filter((f) => f.key !== fKey));
        }, duration + 40);

        // Destination ripple — a small pulse at the node the particle lands on.
        const toCenter = nodeCenter(ev.to as string);
        if (toCenter) {
          const rKey = `r-${ev.id}`;
          setRipples((list) => [
            ...list,
            { key: rKey, cx: toCenter.x, cy: toCenter.y, color },
          ]);
          setTimeout(() => {
            setRipples((list) => list.filter((r) => r.key !== rKey));
          }, RIPPLE_MS + 40);
        }
        continue;
      }

      if (ev.kind === "request" || ev.kind === "response" || ev.kind === "lazy-load") {
        const key = `${ev.from}→${ev.to}`;
        const hit = EDGE_LOOKUP.get(key);
        if (!hit) continue;
        const path = edgePath(hit.edge);
        const color = particleColor(ev);
        const reverse = hit.reverse || ev.kind === "response";
        const size = Math.min(10, 4 + (ev.meta && typeof ev.meta.bytes === "number" ? Math.log10(ev.meta.bytes as number) : 0));
        const pKey = `p-${ev.id}`;
        setParticles((list) => [
          ...list,
          { key: pKey, path, reverse, color, size, durationMs: PARTICLE_MS, label: ev.method },
        ]);
        setTimeout(() => {
          setParticles((list) => list.filter((p) => p.key !== pKey));
        }, PARTICLE_MS + 40);

        if (ev.kind === "response") {
          const flashColor = statusFlashColor(ev.status);
          const fKey = `f-${ev.id}`;
          setFlashes((list) => [...list, { key: fKey, path, color: flashColor, ttlMs: FLASH_MS }]);
          setTimeout(() => {
            setFlashes((list) => list.filter((f) => f.key !== fKey));
          }, FLASH_MS + 40);

          if (typeof ev.durationMs === "number") {
            const gKey = `g-${ev.id}`;
            // Midpoint of path — approximate by parsing "Q cx cy bx by" control point.
            const match = path.match(/Q\s+([\d.-]+)\s+([\d.-]+)/);
            const [, mx, my] = match ?? [null, "0", "0"];
            setGhosts((list) => [
              ...list,
              {
                key: gKey,
                x: Number(mx),
                y: Number(my),
                text: `${Math.round(ev.durationMs as number)}ms`,
                color: flashColor,
              },
            ]);
            setTimeout(() => {
              setGhosts((list) => list.filter((g) => g.key !== gKey));
            }, GHOST_MS + 40);
          }
        }
      }
    }
  }, [events]);

  return (
    <g pointerEvents="none">
      <AnimatePresence>
        {flashes.map((f) => (
          <motion.path
            key={f.key}
            d={f.path}
            fill="none"
            stroke={f.color}
            strokeWidth={3}
            initial={{ opacity: 0.9 }}
            animate={{ opacity: 0 }}
            transition={{ duration: f.ttlMs / 1000, ease: "easeOut" }}
          />
        ))}
      </AnimatePresence>

      {particles.map((p) => (
        <ParticleOnPath key={p.key} particle={p} />
      ))}

      <AnimatePresence>
        {ripples.map((r) => (
          <RippleCircle key={r.key} ripple={r} />
        ))}
      </AnimatePresence>

      <AnimatePresence>
        {ghosts.map((g) => (
          <motion.text
            key={g.key}
            x={g.x}
            y={g.y}
            textAnchor="middle"
            fill={g.color}
            fontSize={11}
            fontWeight={700}
            initial={{ opacity: 1, y: g.y }}
            animate={{ opacity: 0, y: g.y - 18 }}
            transition={{ duration: GHOST_MS / 1000, ease: "easeOut" }}
            style={{ fontFamily: "ui-monospace, SFMono-Regular" }}
          >
            {g.text}
          </motion.text>
        ))}
      </AnimatePresence>
    </g>
  );
}

function RippleCircle({ ripple }: { ripple: Ripple }) {
  return (
    <>
      <motion.circle
        cx={ripple.cx}
        cy={ripple.cy}
        fill="none"
        stroke={ripple.color}
        strokeWidth={2}
        initial={{ r: 8, opacity: 0.9 }}
        animate={{ r: 160, opacity: 0 }}
        transition={{ duration: RIPPLE_MS / 1000, ease: "easeOut" }}
      />
      <motion.circle
        cx={ripple.cx}
        cy={ripple.cy}
        fill="none"
        stroke={ripple.color}
        strokeOpacity={0.6}
        strokeWidth={1.5}
        initial={{ r: 8, opacity: 0.6 }}
        animate={{ r: 110, opacity: 0 }}
        transition={{ duration: (RIPPLE_MS * 0.75) / 1000, ease: "easeOut", delay: 0.12 }}
      />
      {ripple.label && (
        <motion.text
          x={ripple.cx}
          y={ripple.cy - 40}
          textAnchor="middle"
          fill={ripple.color}
          fontSize={11}
          fontWeight={700}
          initial={{ opacity: 1, y: ripple.cy - 40 }}
          animate={{ opacity: 0, y: ripple.cy - 60 }}
          transition={{ duration: RIPPLE_MS / 1000, ease: "easeOut" }}
          style={{ fontFamily: "ui-monospace, SFMono-Regular" }}
        >
          invalidate {ripple.label}
        </motion.text>
      )}
    </>
  );
}

function ParticleOnPath({ particle }: { particle: ActiveParticle }) {
  // offsetPath works on SVG elements via CSS; we animate offsetDistance.
  const start = particle.reverse ? "100%" : "0%";
  const end = particle.reverse ? "0%" : "100%";
  return (
    <motion.circle
      r={particle.size}
      fill={particle.color}
      initial={{ offsetDistance: start, opacity: 1 }}
      animate={{ offsetDistance: end, opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: particle.durationMs / 1000, ease: "easeInOut" }}
      style={{
        offsetPath: `path("${particle.path}")`,
        filter: `drop-shadow(0 0 6px ${particle.color})`,
      }}
    />
  );
}
