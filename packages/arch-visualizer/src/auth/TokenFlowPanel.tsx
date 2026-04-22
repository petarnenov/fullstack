import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

/**
 * Token lifecycle viewer — scripted scenarios played on demand so the
 * audience can follow a clean story for each flow without depending on
 * whatever happens to be happening in the live topology at that moment.
 *
 * Not federated with the live event stream on purpose: the point of this
 * panel is to narrate auth as an isolated pedagogical sequence.
 */

type ScenarioId = "login" | "authed-call" | "refresh" | "logout";

interface Lane {
  id: string;
  label: string;
  sub?: string;
  x: number;
}

interface Step {
  at: number;       // ms from scenario start
  from: string;     // lane id OR special "window"
  to: string;       // lane id OR special "window"
  label: string;
  detail?: string;
  color?: string;
  kind?: "http" | "sdk" | "storage" | "event";
  withToken?: boolean; // draw golden "T" marker on the particle
}

interface Scenario {
  id: ScenarioId;
  title: string;
  blurb: string;
  steps: Step[];
  totalMs: number;
}

const LANE_W = 88;
const LANE_GAP = 8;
const LANE_X0 = 32;
const PANEL_W = 440;
const PANEL_H = 1100;
const HEADER_H = 180;
const LANE_Y_TOP = HEADER_H + 40;
const LANE_Y_BOTTOM = PANEL_H - 40;
const STEP_COLOR_HTTP = "#60a5fa";
const STEP_COLOR_SDK = "#a855f7";
const STEP_COLOR_TOKEN = "#eab308";
const STEP_COLOR_ERR = "#f87171";
const STEP_COLOR_OK = "#22c55e";

const LANES: Lane[] = [
  { id: "fe", label: "FE", sub: "shell + MFEs", x: LANE_X0 },
  { id: "win", label: "window", sub: "getToken()", x: LANE_X0 + (LANE_W + LANE_GAP) * 1 },
  { id: "bff", label: "BFF", sub: "bff-reporting", x: LANE_X0 + (LANE_W + LANE_GAP) * 2 },
  { id: "be", label: "BE", sub: "api-java:auth", x: LANE_X0 + (LANE_W + LANE_GAP) * 3 },
];

const LANE_BY_ID: Record<string, Lane> = Object.fromEntries(LANES.map((l) => [l.id, l]));

function laneCenterX(id: string): number {
  return (LANE_BY_ID[id]?.x ?? 0) + LANE_W / 2;
}

const SCENARIOS: Scenario[] = [
  {
    id: "login",
    title: "1 · Login",
    blurb: "user signs in → BE mints token → FE caches it in window SDK",
    steps: [
      { at: 0, from: "fe", to: "be", label: "POST /api/auth/login", detail: "email + password", color: STEP_COLOR_HTTP, kind: "http" },
      { at: 1100, from: "be", to: "be", label: "write H2 session", detail: "Hibernate persist", color: STEP_COLOR_TOKEN, kind: "storage" },
      { at: 2000, from: "be", to: "fe", label: "200 { token, user }", detail: "opaque bearer", color: STEP_COLOR_OK, kind: "http", withToken: true },
      { at: 3100, from: "fe", to: "win", label: "window.__AMP_PLATFORM__", detail: "getToken() closure", color: STEP_COLOR_SDK, kind: "sdk", withToken: true },
    ],
    totalMs: 4400,
  },
  {
    id: "authed-call",
    title: "2 · Authed call through the BFF",
    blurb: "MFE pulls token from window → BFF forwards → BE validates",
    steps: [
      { at: 0, from: "fe", to: "win", label: "__AMP_PLATFORM__.getToken()", detail: "axios interceptor", color: STEP_COLOR_SDK, kind: "sdk" },
      { at: 900, from: "win", to: "fe", label: "bearer returned", detail: "in-memory", color: STEP_COLOR_TOKEN, kind: "sdk", withToken: true },
      { at: 1800, from: "fe", to: "bff", label: "GET /api/reporting/summary", detail: "Authorization: Bearer …", color: STEP_COLOR_HTTP, kind: "http", withToken: true },
      { at: 3000, from: "bff", to: "be", label: "GET /api/billing/invoices", detail: "BFF forwards Authorization", color: STEP_COLOR_HTTP, kind: "http", withToken: true },
      { at: 4200, from: "be", to: "bff", label: "200 invoices[]", color: STEP_COLOR_OK, kind: "http" },
      { at: 5300, from: "bff", to: "fe", label: "200 aggregated report", detail: "Mono.zip fan-in", color: STEP_COLOR_OK, kind: "http" },
    ],
    totalMs: 6400,
  },
  {
    id: "refresh",
    title: "3 · Refresh on 401",
    blurb: "expired token → BE 401 → FE dispatches amp:auth-expired → silent re-login",
    steps: [
      { at: 0, from: "fe", to: "be", label: "GET /api/billing/invoices", detail: "stale token", color: STEP_COLOR_HTTP, kind: "http", withToken: true },
      { at: 1100, from: "be", to: "fe", label: "401 session expired", color: STEP_COLOR_ERR, kind: "http" },
      { at: 2100, from: "fe", to: "fe", label: "CustomEvent('amp:auth-expired')", detail: "shell listens", color: STEP_COLOR_SDK, kind: "event" },
      { at: 3000, from: "fe", to: "be", label: "POST /api/auth/refresh", detail: "refresh_token cookie", color: STEP_COLOR_HTTP, kind: "http" },
      { at: 4100, from: "be", to: "be", label: "rotate H2 session", detail: "invalidate old, insert new", color: STEP_COLOR_TOKEN, kind: "storage" },
      { at: 5100, from: "be", to: "fe", label: "200 { token }", detail: "new bearer", color: STEP_COLOR_OK, kind: "http", withToken: true },
      { at: 6200, from: "fe", to: "win", label: "window.__AMP_PLATFORM__ updated", detail: "SDK swap, zero reloads", color: STEP_COLOR_SDK, kind: "sdk", withToken: true },
      { at: 7300, from: "fe", to: "be", label: "GET /api/billing/invoices (retry)", color: STEP_COLOR_HTTP, kind: "http", withToken: true },
      { at: 8400, from: "be", to: "fe", label: "200 invoices[]", color: STEP_COLOR_OK, kind: "http" },
    ],
    totalMs: 9500,
  },
  {
    id: "logout",
    title: "4 · Logout",
    blurb: "explicit sign-out clears session + window SDK across every MFE",
    steps: [
      { at: 0, from: "fe", to: "be", label: "POST /api/auth/logout", detail: "Authorization: Bearer …", color: STEP_COLOR_HTTP, kind: "http", withToken: true },
      { at: 1100, from: "be", to: "be", label: "delete H2 session", detail: "Hibernate remove", color: STEP_COLOR_ERR, kind: "storage" },
      { at: 2100, from: "be", to: "fe", label: "204 No Content", color: STEP_COLOR_OK, kind: "http" },
      { at: 3100, from: "fe", to: "win", label: "window.__AMP_PLATFORM__ = null", detail: "SDK cleared", color: STEP_COLOR_ERR, kind: "sdk" },
      { at: 4100, from: "fe", to: "fe", label: "redirect /login", color: STEP_COLOR_SDK, kind: "event" },
    ],
    totalMs: 5200,
  },
];

function findScenario(id: ScenarioId): Scenario {
  return SCENARIOS.find((s) => s.id === id) ?? SCENARIOS[0];
}

interface FlyingStep extends Step {
  key: string;
}

export function TokenFlowPanel() {
  const [active, setActive] = useState<ScenarioId>("login");
  const [playing, setPlaying] = useState(true);
  const [loopAll, setLoopAll] = useState(true);
  const [tick, setTick] = useState(0); // bumps force-restart a replay
  const scenario = findScenario(active);
  const [flying, setFlying] = useState<FlyingStep[]>([]);
  const [history, setHistory] = useState<Step[]>([]);
  const timers = useRef<number[]>([]);
  const scenarioStartRef = useRef(0);
  const advanceTimer = useRef<number | null>(null);

  useEffect(() => {
    for (const id of timers.current) window.clearTimeout(id);
    timers.current = [];
    if (advanceTimer.current !== null) {
      window.clearTimeout(advanceTimer.current);
      advanceTimer.current = null;
    }
    setFlying([]);
    setHistory([]);
    if (!playing) return;

    scenarioStartRef.current = performance.now();
    for (const step of scenario.steps) {
      const id = window.setTimeout(() => {
        const key = `${scenario.id}-${step.at}-${Math.random().toString(36).slice(2)}`;
        setFlying((f) => [...f, { ...step, key }]);
        setHistory((h) => [...h.slice(-5), step]);
        const removeId = window.setTimeout(() => {
          setFlying((f) => f.filter((x) => x.key !== key));
        }, 1400);
        timers.current.push(removeId);
      }, step.at);
      timers.current.push(id);
    }

    // Auto-advance to the next scenario if looping is on.
    if (loopAll) {
      const id = window.setTimeout(() => {
        const idx = SCENARIOS.findIndex((s) => s.id === active);
        const next = SCENARIOS[(idx + 1) % SCENARIOS.length];
        setActive(next.id);
      }, scenario.totalMs + 1500);
      advanceTimer.current = id;
    }

    return () => {
      for (const id of timers.current) window.clearTimeout(id);
      timers.current = [];
      if (advanceTimer.current !== null) {
        window.clearTimeout(advanceTimer.current);
        advanceTimer.current = null;
      }
    };
  }, [active, scenario, playing, loopAll, tick]);

  return (
    <div style={panelStyle}>
      <div style={{ padding: "14px 16px 10px 16px" }}>
        <div style={{ color: "#64748b", fontSize: 10, letterSpacing: "0.12em", fontWeight: 700 }}>
          TOKEN LIFECYCLE
        </div>
        <div style={{ color: "#e2e8f0", fontSize: 16, fontWeight: 700, marginTop: 4 }}>{scenario.title}</div>
        <div style={{ color: "#94a3b8", fontSize: 12, marginTop: 4, lineHeight: 1.4 }}>{scenario.blurb}</div>
        <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
          {SCENARIOS.map((s) => (
            <button
              key={s.id}
              onClick={() => {
                setActive(s.id);
                setTick((t) => t + 1);
              }}
              style={{
                ...tabStyle,
                ...(active === s.id ? tabActiveStyle : null),
              }}
            >
              {s.title.split(" · ")[0]}
            </button>
          ))}
          <div style={{ flex: 1 }} />
          <button
            onClick={() => setPlaying((p) => !p)}
            style={{ ...tabStyle, color: playing ? "#22c55e" : "#94a3b8" }}
            title="pause/play"
          >
            {playing ? "❚❚" : "▶"}
          </button>
          <button
            onClick={() => setTick((t) => t + 1)}
            style={tabStyle}
            title="replay current scenario"
          >
            ↻
          </button>
          <button
            onClick={() => setLoopAll((l) => !l)}
            style={{ ...tabStyle, color: loopAll ? "#eab308" : "#94a3b8" }}
            title="auto-advance to next scenario"
          >
            loop
          </button>
        </div>
      </div>

      <svg viewBox={`0 0 ${PANEL_W} ${PANEL_H}`} width="100%" height="100%" preserveAspectRatio="xMidYMin meet">
        <defs>
          <linearGradient id="token-trail" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#eab308" stopOpacity={0} />
            <stop offset="100%" stopColor="#eab308" stopOpacity={0.8} />
          </linearGradient>
        </defs>

        {/* Lanes */}
        {LANES.map((lane) => (
          <LaneColumn key={lane.id} lane={lane} />
        ))}

        {/* Flying steps */}
        <AnimatePresence>
          {flying.map((step) => (
            <FlyingArrow key={step.key} step={step} />
          ))}
        </AnimatePresence>

        {/* History log at the bottom */}
        <HistoryLog steps={history} />
      </svg>
    </div>
  );
}

function LaneColumn({ lane }: { lane: Lane }) {
  const cx = lane.x + LANE_W / 2;
  const isWindow = lane.id === "win";
  const stroke = isWindow ? "#a855f7" : "#334155";
  const labelColor = isWindow ? "#c4b5fd" : "#e2e8f0";
  const subColor = isWindow ? "#a855f7" : "#94a3b8";
  return (
    <g>
      <rect
        x={lane.x}
        y={LANE_Y_TOP}
        width={LANE_W}
        height={LANE_Y_BOTTOM - LANE_Y_TOP}
        rx={12}
        fill="#0b1220"
        stroke="#1e293b"
        strokeWidth={1}
      />
      {/* top cap — the role label */}
      <rect
        x={lane.x}
        y={LANE_Y_TOP}
        width={LANE_W}
        height={52}
        rx={12}
        fill={isWindow ? "#1e1b4b" : "#0f172a"}
        stroke={stroke}
        strokeWidth={1}
        strokeDasharray={isWindow ? "3 3" : undefined}
      />
      <text x={cx} y={LANE_Y_TOP + 22} textAnchor="middle" fill={labelColor} fontSize={13} fontWeight={700}>
        {lane.label}
      </text>
      {lane.sub && (
        <text x={cx} y={LANE_Y_TOP + 38} textAnchor="middle" fill={subColor} fontSize={9} style={{ fontFamily: "ui-monospace, SFMono-Regular" }}>
          {lane.sub}
        </text>
      )}
      {/* vertical guide */}
      <line
        x1={cx}
        y1={LANE_Y_TOP + 60}
        x2={cx}
        y2={LANE_Y_BOTTOM - 80}
        stroke="#1e293b"
        strokeDasharray="3 5"
        strokeWidth={1}
      />
    </g>
  );
}

function FlyingArrow({ step }: { step: FlyingStep }) {
  const y0 = useMemo(() => LANE_Y_TOP + 100 + Math.random() * (LANE_Y_BOTTOM - LANE_Y_TOP - 260), []);
  const x0 = laneCenterX(step.from);
  const x1 = laneCenterX(step.to);
  const isSelf = step.from === step.to;
  const color = step.color ?? "#60a5fa";

  const labelText = step.label;
  const detail = step.detail;

  if (isSelf) {
    // Loop arrow on a single lane — render a small arc and a pulse.
    const cx = x0;
    const y1 = y0 + 40;
    const d = `M ${cx} ${y0} C ${cx + 40} ${y0}, ${cx + 40} ${y1}, ${cx} ${y1}`;
    return (
      <g>
        <motion.path
          d={d}
          fill="none"
          stroke={color}
          strokeWidth={2}
          initial={{ pathLength: 0, opacity: 0.9 }}
          animate={{ pathLength: 1, opacity: 0.2 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.0, ease: "easeOut" }}
        />
        <motion.circle
          r={5}
          fill={color}
          initial={{ offsetDistance: "0%", opacity: 1 }}
          animate={{ offsetDistance: "100%", opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.0, ease: "easeInOut" }}
          style={{ offsetPath: `path("${d}")`, filter: `drop-shadow(0 0 6px ${color})` }}
        />
        <StepLabel x={cx + 48} y={y0 + 20} color={color} label={labelText} detail={detail} />
        {step.withToken && <TokenBadge x={cx + 48} y={y0 + 20} />}
      </g>
    );
  }

  // Horizontal arc between lanes
  const dx = x1 - x0;
  const arc = Math.abs(dx) * 0.15;
  const cx = (x0 + x1) / 2;
  const cy = y0 - (dx > 0 ? arc : arc);
  const d = `M ${x0} ${y0} Q ${cx} ${cy} ${x1} ${y0}`;
  const labelX = (x0 + x1) / 2;
  const labelY = y0 - Math.abs(dx) * 0.22 - 4;

  return (
    <g>
      {/* the path itself fades in and fades out */}
      <motion.path
        d={d}
        fill="none"
        stroke={color}
        strokeOpacity={0.6}
        strokeWidth={1.6}
        strokeDasharray="4 4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.9 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
      />
      {/* particle travelling along */}
      <motion.circle
        r={6}
        fill={color}
        initial={{ offsetDistance: "0%", opacity: 1 }}
        animate={{ offsetDistance: "100%", opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 1.1, ease: "easeInOut" }}
        style={{ offsetPath: `path("${d}")`, filter: `drop-shadow(0 0 8px ${color})` }}
      />
      {step.withToken && (
        <motion.g
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.circle
            r={9}
            fill="none"
            stroke={STEP_COLOR_TOKEN}
            strokeWidth={1.3}
            initial={{ offsetDistance: "0%", opacity: 0.9 }}
            animate={{ offsetDistance: "100%", opacity: 0.9 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.1, ease: "easeInOut" }}
            style={{ offsetPath: `path("${d}")`, filter: `drop-shadow(0 0 6px ${STEP_COLOR_TOKEN})` }}
          />
        </motion.g>
      )}
      {/* arrow head */}
      <motion.path
        d={arrowHead(x1, y0, dx > 0 ? 1 : -1)}
        fill={color}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.4, delay: 0.9 }}
      />
      <StepLabel x={labelX} y={labelY} color={color} label={labelText} detail={detail} />
    </g>
  );
}

function StepLabel({ x, y, color, label, detail }: { x: number; y: number; color: string; label: string; detail?: string }) {
  return (
    <g>
      <motion.text
        x={x}
        y={y}
        textAnchor="middle"
        fill={color}
        fontSize={11}
        fontWeight={700}
        initial={{ opacity: 0, y: y + 6 }}
        animate={{ opacity: 1, y }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.4 }}
        style={{ fontFamily: "ui-monospace, SFMono-Regular" }}
      >
        {label}
      </motion.text>
      {detail && (
        <motion.text
          x={x}
          y={y + 12}
          textAnchor="middle"
          fill="#94a3b8"
          fontSize={9}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          style={{ fontFamily: "ui-monospace, SFMono-Regular" }}
        >
          {detail}
        </motion.text>
      )}
    </g>
  );
}

function TokenBadge({ x, y }: { x: number; y: number }) {
  return (
    <motion.g
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4, delay: 0.4 }}
    >
      <circle cx={x + 44} cy={y} r={8} fill="#422006" stroke={STEP_COLOR_TOKEN} strokeWidth={1.5} />
      <text x={x + 44} y={y + 3} textAnchor="middle" fill={STEP_COLOR_TOKEN} fontSize={9} fontWeight={900}>
        T
      </text>
    </motion.g>
  );
}

function HistoryLog({ steps }: { steps: Step[] }) {
  const baseY = LANE_Y_BOTTOM - 60;
  return (
    <g>
      <rect x={20} y={baseY} width={PANEL_W - 40} height={56} rx={8} fill="#0f172a" stroke="#1e293b" />
      <text x={32} y={baseY + 14} fill="#64748b" fontSize={9} fontWeight={700} letterSpacing={2}>
        LAST STEPS
      </text>
      {steps.slice(-5).map((s, i) => (
        <text
          key={i}
          x={32}
          y={baseY + 26 + i * 8}
          fill={s.color ?? "#94a3b8"}
          fontSize={8.5}
          style={{ fontFamily: "ui-monospace, SFMono-Regular" }}
        >
          {s.from} → {s.to}  {s.label}
        </text>
      ))}
    </g>
  );
}

function arrowHead(x: number, y: number, dir: 1 | -1): string {
  const size = 5;
  return `M ${x} ${y} l ${-dir * size} ${-size} l 0 ${2 * size} z`;
}

const panelStyle: React.CSSProperties = {
  position: "absolute",
  top: 16,
  right: 16,
  bottom: 16,
  width: PANEL_W,
  background: "linear-gradient(180deg, rgba(15, 23, 42, 0.96) 0%, rgba(2, 6, 23, 0.98) 100%)",
  border: "1px solid #1e293b",
  borderRadius: 14,
  boxShadow: "-12px 0 40px rgba(0,0,0,0.45)",
  overflow: "hidden",
  fontFamily: "ui-sans-serif, system-ui",
  display: "flex",
  flexDirection: "column",
};

const tabStyle: React.CSSProperties = {
  background: "#0f172a",
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "#1e293b",
  color: "#cbd5e1",
  fontSize: 11,
  fontWeight: 600,
  padding: "4px 8px",
  borderRadius: 6,
  cursor: "pointer",
  fontFamily: "ui-sans-serif, system-ui",
};

const tabActiveStyle: React.CSSProperties = {
  background: "#1e293b",
  borderColor: "#334155",
  color: "#fbbf24",
};
