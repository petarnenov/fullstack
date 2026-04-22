import { useEffect, useMemo, useRef, useState, type ReactElement } from "react";
import { AnimatePresence, motion } from "framer-motion";

/**
 * Token lifecycle viewer — scripted scenarios played on demand so the
 * audience can follow a clean story for each flow without depending on
 * whatever happens to be happening in the live topology at that moment.
 *
 * Not federated with the live event stream on purpose: the point of this
 * panel is to narrate auth as an isolated pedagogical sequence. Cookie-era
 * edition (post Phase 1 prod-auth cut-over) — tokens live in httpOnly
 * cookies the browser ships automatically; JS only ever touches the CSRF
 * cookie + the published SDK.
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
  from: string;     // lane id
  to: string;       // lane id
  label: string;
  detail?: string;
  color?: string;
  kind?: "http" | "sdk" | "cookie" | "event";
  withCookie?: boolean; // draw amber 🍪 marker on the particle
  withCsrf?: boolean;   // draw lilac C marker on the particle
  windowPatch?: Partial<WindowSnapshot>;
}

/**
 * Snapshot of what the browser actually holds on behalf of auth — mirrors
 * the real production shape post Phase 1:
 *   window.__AMP_PLATFORM__ = { user: AuthenticatedUser, csrfToken, logout }
 *   cookie jar: amp_access_token (HttpOnly, Lax, /api, 15m)
 *                amp_refresh_token (HttpOnly, Strict, /api/auth, 7d)
 *                amp_csrf_token (JS-readable, Strict, /, 7d)
 */
interface WindowSnapshot {
  sdkUser: { name: string; role: string } | null; // window.__AMP_PLATFORM__.user
  sdkCsrfToken: string | null;                    // window.__AMP_PLATFORM__.csrfToken
  sdkHasLogout: boolean;                          // typeof __AMP_PLATFORM__.logout === "function"
  accessCookie: boolean;
  refreshCookie: boolean;
  csrfCookie: string | null;
  status: "anonymous" | "bootstrapping" | "authenticated";
}

interface Scenario {
  id: ScenarioId;
  title: string;
  blurb: string;
  steps: Step[];
  totalMs: number;
  initialWindow: WindowSnapshot;
}

const EMPTY_WINDOW: WindowSnapshot = {
  sdkUser: null,
  sdkCsrfToken: null,
  sdkHasLogout: false,
  accessCookie: false,
  refreshCookie: false,
  csrfCookie: null,
  status: "anonymous",
};

const USER_ADA_SDK = { name: "Ada Lovelace", role: "admin" };

const LANE_W = 88;
const LANE_GAP = 8;
const LANE_X0 = 32;
const PANEL_W = 440;
// The HTML header lives *outside* the SVG, so the viewBox height is only the
// remaining flex area. 720 leaves a little extra vertical breathing room
// for the LAST STEPS log; preserveAspectRatio=meet still keeps text at
// ~90% of declared size, which stays readable.
const PANEL_H = 720;
const LANE_Y_TOP = 28;
const LANE_Y_BOTTOM = PANEL_H - 24;
const STEP_COLOR_HTTP = "#60a5fa";
const STEP_COLOR_SDK = "#a855f7";
const STEP_COLOR_COOKIE = "#eab308";
const STEP_COLOR_CSRF = "#c4b5fd";
const STEP_COLOR_ERR = "#f87171";
const STEP_COLOR_OK = "#22c55e";

const LANES: Lane[] = [
  { id: "fe", label: "FE", sub: "shell + MFEs", x: LANE_X0 },
  { id: "win", label: "browser", sub: "cookies + SDK", x: LANE_X0 + (LANE_W + LANE_GAP) * 1 },
  { id: "bff", label: "BFF", sub: "bff-reporting", x: LANE_X0 + (LANE_W + LANE_GAP) * 2 },
  { id: "be", label: "BE", sub: "api-java:auth", x: LANE_X0 + (LANE_W + LANE_GAP) * 3 },
];

const LANE_BY_ID: Record<string, Lane> = Object.fromEntries(LANES.map((l) => [l.id, l]));

function laneCenterX(id: string): number {
  return (LANE_BY_ID[id]?.x ?? 0) + LANE_W / 2;
}

const CSRF_ALICE = "Rx7B…pQ9";
const CSRF_ROTATED = "w0kC…e8F";

const WIN_AUTHED_ALICE: WindowSnapshot = {
  sdkUser: USER_ADA_SDK,
  sdkCsrfToken: CSRF_ALICE,
  sdkHasLogout: true,
  accessCookie: true,
  refreshCookie: true,
  csrfCookie: CSRF_ALICE,
  status: "authenticated",
};
const WIN_STALE_ACCESS: WindowSnapshot = {
  sdkUser: USER_ADA_SDK,
  sdkCsrfToken: CSRF_ALICE,
  sdkHasLogout: true,
  accessCookie: false, // expired — browser dropped it after Max-Age
  refreshCookie: true,
  csrfCookie: CSRF_ALICE,
  status: "authenticated",
};

const SCENARIOS: Scenario[] = [
  {
    id: "login",
    title: "1 · Login",
    blurb:
      "user signs in → BE argon2-verifies → 3 Set-Cookie headers → browser stores → shell publishes SDK",
    initialWindow: EMPTY_WINDOW,
    steps: [
      { at: 0, from: "fe", to: "be", label: "POST /api/auth/login", detail: "email + password (rate-limited 10/min)", color: STEP_COLOR_HTTP, kind: "http", windowPatch: { status: "bootstrapping" } },
      { at: 1100, from: "be", to: "be", label: "argon2.verify + issue family", detail: "H2 rows: user_session + refresh_token", color: STEP_COLOR_COOKIE, kind: "cookie" },
      { at: 2100, from: "be", to: "win", label: "Set-Cookie ×3 → browser jar", detail: "access HttpOnly · refresh HttpOnly · csrf JS-readable", color: STEP_COLOR_COOKIE, kind: "cookie", withCookie: true, windowPatch: { accessCookie: true, refreshCookie: true, csrfCookie: CSRF_ALICE } },
      { at: 3200, from: "be", to: "fe", label: "200 { csrfToken, user }", detail: "no access token in JSON body", color: STEP_COLOR_OK, kind: "http", withCsrf: true },
      { at: 4300, from: "fe", to: "win", label: "window.__AMP_PLATFORM__ = { user, csrfToken, logout }", detail: "getter-backed — rotations don't re-install", color: STEP_COLOR_SDK, kind: "sdk", windowPatch: { sdkUser: USER_ADA_SDK, sdkCsrfToken: CSRF_ALICE, sdkHasLogout: true, status: "authenticated" } },
    ],
    totalMs: 5500,
  },
  {
    id: "authed-call",
    title: "2 · Authed call through the BFF",
    blurb:
      "MFE fires GET → browser attaches access cookie → BFF forwards Cookie header → BE validates",
    initialWindow: WIN_AUTHED_ALICE,
    steps: [
      { at: 0, from: "fe", to: "fe", label: "axios GET /api/reporting/summary", detail: "withCredentials:true", color: STEP_COLOR_HTTP, kind: "http" },
      { at: 900, from: "win", to: "bff", label: "browser attaches Cookie", detail: "amp_access_token + amp_csrf_token", color: STEP_COLOR_COOKIE, kind: "cookie", withCookie: true },
      { at: 2000, from: "bff", to: "be", label: "GET /api/billing/invoices", detail: "Cookie forwarded verbatim (no token validation in BFF)", color: STEP_COLOR_HTTP, kind: "http", withCookie: true },
      { at: 3100, from: "be", to: "be", label: "lookupSession(access) → user", detail: "cookie read in AuthenticatedJsonAction", color: STEP_COLOR_COOKIE, kind: "cookie" },
      { at: 4200, from: "be", to: "bff", label: "200 invoices[]", color: STEP_COLOR_OK, kind: "http" },
      { at: 5300, from: "bff", to: "fe", label: "200 aggregated report", detail: "Mono.zip fan-in", color: STEP_COLOR_OK, kind: "http" },
    ],
    totalMs: 6400,
  },
  {
    id: "refresh",
    title: "3 · Silent refresh on 401",
    blurb:
      "access cookie expired → 401 → shell tries /refresh with CSRF header → family rotated → retry",
    initialWindow: WIN_STALE_ACCESS,
    steps: [
      { at: 0, from: "fe", to: "be", label: "GET /api/billing/invoices", detail: "cookie jar has no access token", color: STEP_COLOR_HTTP, kind: "http" },
      { at: 1100, from: "be", to: "fe", label: "401 Not authenticated", color: STEP_COLOR_ERR, kind: "http" },
      { at: 2100, from: "fe", to: "fe", label: "dispatch amp:auth-expired", detail: "shell listener de-dupes", color: STEP_COLOR_SDK, kind: "event" },
      { at: 3100, from: "fe", to: "be", label: "POST /api/auth/refresh", detail: "X-CSRF-Token: Rx7B…pQ9 + refresh cookie", color: STEP_COLOR_HTTP, kind: "http", withCsrf: true },
      { at: 4200, from: "be", to: "be", label: "rotate family (reuse-detect)", detail: "mark old refresh revoked, mint new access+refresh+csrf", color: STEP_COLOR_COOKIE, kind: "cookie" },
      { at: 5300, from: "be", to: "win", label: "Set-Cookie ×3 → refreshed", detail: "same family_id, new values", color: STEP_COLOR_COOKIE, kind: "cookie", withCookie: true, windowPatch: { accessCookie: true, csrfCookie: CSRF_ROTATED } },
      { at: 6400, from: "be", to: "fe", label: "200 { csrfToken, user }", color: STEP_COLOR_OK, kind: "http", withCsrf: true, windowPatch: { sdkCsrfToken: CSRF_ROTATED } },
      { at: 7500, from: "fe", to: "be", label: "retry GET /api/billing/invoices", color: STEP_COLOR_HTTP, kind: "http", withCookie: true },
      { at: 8600, from: "be", to: "fe", label: "200 invoices[]", color: STEP_COLOR_OK, kind: "http" },
    ],
    totalMs: 9700,
  },
  {
    id: "logout",
    title: "4 · Logout",
    blurb:
      "explicit sign-out revokes family → 3 cookies cleared → SDK emptied → redirect /login",
    initialWindow: WIN_AUTHED_ALICE,
    steps: [
      { at: 0, from: "fe", to: "be", label: "POST /api/auth/logout", detail: "X-CSRF-Token required", color: STEP_COLOR_HTTP, kind: "http", withCsrf: true },
      { at: 1100, from: "be", to: "be", label: "revoke family", detail: "killFamily(familyId) — delete access + refresh rows", color: STEP_COLOR_ERR, kind: "cookie" },
      { at: 2200, from: "be", to: "win", label: "Set-Cookie Max-Age=0 ×3", detail: "browser evicts all three", color: STEP_COLOR_ERR, kind: "cookie", windowPatch: { accessCookie: false, refreshCookie: false, csrfCookie: null } },
      { at: 3300, from: "be", to: "fe", label: "204 No Content", color: STEP_COLOR_OK, kind: "http" },
      { at: 4400, from: "fe", to: "win", label: "delete window.__AMP_PLATFORM__", detail: "AuthContext.clearSession", color: STEP_COLOR_ERR, kind: "sdk", windowPatch: { sdkUser: null, sdkCsrfToken: null, sdkHasLogout: false, status: "anonymous" } },
      { at: 5400, from: "fe", to: "fe", label: "redirect /login", color: STEP_COLOR_SDK, kind: "event" },
    ],
    totalMs: 6500,
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
  const [windowContent, setWindowContent] = useState<WindowSnapshot>(scenario.initialWindow);
  const [windowPulse, setWindowPulse] = useState(0);
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
    setWindowContent(scenario.initialWindow);
    if (!playing) return;

    scenarioStartRef.current = performance.now();
    for (const step of scenario.steps) {
      const id = window.setTimeout(() => {
        const key = `${scenario.id}-${step.at}-${Math.random().toString(36).slice(2)}`;
        setFlying((f) => [...f, { ...step, key }]);
        setHistory((h) => [...h.slice(-5), step]);
        if (step.windowPatch) {
          setWindowContent((prev) => ({ ...prev, ...step.windowPatch }));
          setWindowPulse((p) => p + 1);
        }
        const removeId = window.setTimeout(() => {
          setFlying((f) => f.filter((x) => x.key !== key));
        }, 1400);
        timers.current.push(removeId);
      }, step.at);
      timers.current.push(id);
    }

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

        {LANES.map((lane) => (
          <LaneColumn key={lane.id} lane={lane} />
        ))}

        <WindowStateCard content={windowContent} pulse={windowPulse} />

        <AnimatePresence>
          {flying.map((step) => (
            <FlyingArrow key={step.key} step={step} />
          ))}
        </AnimatePresence>

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

function WindowStateCard({ content, pulse }: { content: WindowSnapshot; pulse: number }) {
  const lane = LANE_BY_ID.win;
  if (!lane) return null;
  const boxW = LANE_W + 140;
  const boxX = lane.x + LANE_W / 2 - boxW / 2;
  const boxY = LANE_Y_TOP + 64;
  const boxH = 268;
  const cx = lane.x + LANE_W / 2;
  const borderColor = content.sdkUser ? STEP_COLOR_SDK : "#334155";
  const statusColor =
    content.status === "authenticated" ? STEP_COLOR_OK
    : content.status === "bootstrapping" ? "#fbbf24"
    : "#64748b";

  const cookieColor = (present: boolean) => (present ? STEP_COLOR_COOKIE : "#475569");
  const muted = "#475569";
  // Values mirror the real Phase 1 Set-Cookie attributes defined in
  // com.amp.web.common.SessionCookies (access: HttpOnly Lax /api 15m;
  // refresh: HttpOnly Strict /api/auth 7d; csrf: JS-readable Strict / 7d).
  type Row =
    | { kind: "section"; label: string }
    | { kind: "kv"; label: string; value: string; color: string; detail?: string; detailColor?: string };

  const rows: Row[] = [
    { kind: "section", label: "window.__AMP_PLATFORM__" },
    { kind: "kv", label: "  .user",       value: content.sdkUser ? `${content.sdkUser.name} · ${content.sdkUser.role}` : "null",        color: content.sdkUser ? "#e2e8f0" : muted },
    { kind: "kv", label: "  .csrfToken",  value: content.sdkCsrfToken ?? "null",                                                        color: content.sdkCsrfToken ? STEP_COLOR_CSRF : muted },
    { kind: "kv", label: "  .logout()",   value: content.sdkHasLogout ? "async fn" : "—",                                                color: content.sdkHasLogout ? "#c4b5fd" : muted },
    { kind: "section", label: "cookie jar (browser)" },
    { kind: "kv", label: "amp_access_token",  value: content.accessCookie  ? "•••••• (HttpOnly)" : "—",  color: cookieColor(content.accessCookie),  detail: content.accessCookie  ? "SameSite=Lax · Path=/api · Max-Age=900"       : undefined },
    { kind: "kv", label: "amp_refresh_token", value: content.refreshCookie ? "•••••• (HttpOnly)" : "—",  color: cookieColor(content.refreshCookie), detail: content.refreshCookie ? "SameSite=Strict · Path=/api/auth · Max-Age=604800" : undefined },
    { kind: "kv", label: "amp_csrf_token",    value: content.csrfCookie ?? "—",                         color: content.csrfCookie ? STEP_COLOR_CSRF : muted,    detail: content.csrfCookie ? "SameSite=Strict · Path=/ · Max-Age=604800"      : undefined },
    { kind: "section", label: "shell state" },
    { kind: "kv", label: "AuthContext.status", value: content.status, color: statusColor },
  ];

  return (
    <g>
      <motion.rect
        key={`win-card-${pulse}`}
        x={boxX}
        y={boxY}
        width={boxW}
        height={boxH}
        rx={10}
        fill="#0f0b1f"
        stroke={borderColor}
        strokeWidth={1.6}
        strokeDasharray="5 4"
        initial={{ opacity: 0.6, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        style={{ transformOrigin: `${cx}px ${boxY + boxH / 2}px` }}
      />
      <text
        x={cx}
        y={boxY + 18}
        textAnchor="middle"
        fill="#94a3b8"
        fontSize={10}
        fontWeight={700}
        letterSpacing={1.8}
        style={{ fontFamily: "ui-sans-serif, system-ui" }}
      >
        BROWSER STATE
      </text>
      <line x1={boxX + 10} x2={boxX + boxW - 10} y1={boxY + 26} y2={boxY + 26} stroke="#1e293b" strokeWidth={1} />
      {(() => {
        let y = boxY + 38;
        const elements: ReactElement[] = [];
        rows.forEach((row, i) => {
          if (row.kind === "section") {
            // Section header — add a touch of top spacing except for the
            // first section, a subtle full-width divider above, and lilac
            // uppercase label.
            if (i > 0) y += 6;
            elements.push(
              <g key={`sec-${i}`}>
                <line
                  x1={boxX + 12}
                  x2={boxX + boxW - 12}
                  y1={y - 8}
                  y2={y - 8}
                  stroke="#1e1b4b"
                  strokeWidth={1}
                />
                <text
                  x={boxX + 12}
                  y={y + 2}
                  fill="#a855f7"
                  fontSize={9}
                  fontWeight={700}
                  letterSpacing={1.2}
                  style={{ fontFamily: "ui-sans-serif, system-ui" }}
                >
                  {row.label.toUpperCase()}
                </text>
              </g>,
            );
            y += 16;
            return;
          }
          elements.push(
            <g key={`${row.label}-${i}`}>
              <text
                x={boxX + 12}
                y={y}
                fill="#64748b"
                fontSize={9.5}
                style={{ fontFamily: "ui-monospace, SFMono-Regular" }}
              >
                {row.label}
              </text>
              <motion.text
                key={`${row.label}-${pulse}`}
                x={boxX + boxW - 12}
                y={y}
                textAnchor="end"
                fill={row.color}
                fontSize={10.5}
                fontWeight={600}
                initial={{ opacity: 0, x: boxX + boxW - 6 }}
                animate={{ opacity: 1, x: boxX + boxW - 12 }}
                transition={{ duration: 0.35, delay: i * 0.03 }}
                style={{ fontFamily: "ui-monospace, SFMono-Regular" }}
              >
                {row.value}
              </motion.text>
              {row.detail && (
                <text
                  x={boxX + boxW - 12}
                  y={y + 10}
                  textAnchor="end"
                  fill="#64748b"
                  fontSize={8}
                  style={{ fontFamily: "ui-monospace, SFMono-Regular" }}
                >
                  {row.detail}
                </text>
              )}
            </g>,
          );
          y += row.detail ? 23 : 16;
        });
        return elements;
      })()}
      <motion.rect
        key={`win-pulse-${pulse}`}
        x={boxX}
        y={boxY}
        width={boxW}
        height={boxH}
        rx={10}
        fill="none"
        stroke={borderColor}
        strokeWidth={2.5}
        initial={{ opacity: 0.9, scale: 1 }}
        animate={{ opacity: 0, scale: 1.18 }}
        transition={{ duration: 1.3, ease: "easeOut" }}
        style={{ transformOrigin: `${cx}px ${boxY + boxH / 2}px` }}
      />
    </g>
  );
}

const HISTORY_LINE_H = 30;
const HISTORY_PADDING_TOP = 42;
const HISTORY_PADDING_BOTTOM = 18;
const HISTORY_MAX_STEPS = 6;
const HISTORY_BOX_H =
  HISTORY_PADDING_TOP + HISTORY_LINE_H * HISTORY_MAX_STEPS + HISTORY_PADDING_BOTTOM;

const FLY_BAND_TOP = LANE_Y_TOP + 64 + 268 + 10;       // below the WindowStateCard
const FLY_BAND_BOTTOM = LANE_Y_BOTTOM - HISTORY_BOX_H - 12;

function FlyingArrow({ step }: { step: FlyingStep }) {
  const y0 = useMemo(() => FLY_BAND_TOP + Math.random() * Math.max(24, FLY_BAND_BOTTOM - FLY_BAND_TOP), []);
  const x0 = laneCenterX(step.from);
  const x1 = laneCenterX(step.to);
  const isSelf = step.from === step.to;
  const color = step.color ?? "#60a5fa";

  const labelText = step.label;
  const detail = step.detail;

  if (isSelf) {
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
        {step.withCookie && <CookieBadge x={cx + 48} y={y0 + 20} />}
        {step.withCsrf && <CsrfBadge x={cx + 48} y={y0 + 20} />}
      </g>
    );
  }

  const dx = x1 - x0;
  const arc = Math.abs(dx) * 0.15;
  const cx = (x0 + x1) / 2;
  const cy = y0 - (dx > 0 ? arc : arc);
  const d = `M ${x0} ${y0} Q ${cx} ${cy} ${x1} ${y0}`;
  const labelX = (x0 + x1) / 2;
  const labelY = y0 - Math.abs(dx) * 0.22 - 4;

  return (
    <g>
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
      <motion.circle
        r={6}
        fill={color}
        initial={{ offsetDistance: "0%", opacity: 1 }}
        animate={{ offsetDistance: "100%", opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 1.1, ease: "easeInOut" }}
        style={{ offsetPath: `path("${d}")`, filter: `drop-shadow(0 0 8px ${color})` }}
      />
      {step.withCookie && (
        <motion.circle
          r={9}
          fill="none"
          stroke={STEP_COLOR_COOKIE}
          strokeWidth={1.3}
          initial={{ offsetDistance: "0%", opacity: 0.9 }}
          animate={{ offsetDistance: "100%", opacity: 0.9 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.1, ease: "easeInOut" }}
          style={{ offsetPath: `path("${d}")`, filter: `drop-shadow(0 0 6px ${STEP_COLOR_COOKIE})` }}
        />
      )}
      {step.withCsrf && (
        <motion.circle
          r={9}
          fill="none"
          stroke={STEP_COLOR_CSRF}
          strokeWidth={1.3}
          strokeDasharray="2 2"
          initial={{ offsetDistance: "0%", opacity: 0.9 }}
          animate={{ offsetDistance: "100%", opacity: 0.9 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.1, ease: "easeInOut" }}
          style={{ offsetPath: `path("${d}")`, filter: `drop-shadow(0 0 6px ${STEP_COLOR_CSRF})` }}
        />
      )}
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

function CookieBadge({ x, y }: { x: number; y: number }) {
  return (
    <motion.g
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4, delay: 0.4 }}
    >
      <circle cx={x + 44} cy={y} r={8} fill="#422006" stroke={STEP_COLOR_COOKIE} strokeWidth={1.5} />
      <text x={x + 44} y={y + 3} textAnchor="middle" fill={STEP_COLOR_COOKIE} fontSize={9} fontWeight={900}>
        🍪
      </text>
    </motion.g>
  );
}

function CsrfBadge({ x, y }: { x: number; y: number }) {
  return (
    <motion.g
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4, delay: 0.4 }}
    >
      <circle cx={x + 44} cy={y} r={8} fill="#1e1b4b" stroke={STEP_COLOR_CSRF} strokeWidth={1.5} />
      <text x={x + 44} y={y + 3} textAnchor="middle" fill={STEP_COLOR_CSRF} fontSize={9} fontWeight={900}>
        C
      </text>
    </motion.g>
  );
}

function HistoryLog({ steps }: { steps: Step[] }) {
  const baseY = LANE_Y_BOTTOM - HISTORY_BOX_H;
  return (
    <g>
      <rect x={20} y={baseY} width={PANEL_W - 40} height={HISTORY_BOX_H} rx={8} fill="#0f172a" stroke="#1e293b" />
      <text x={32} y={baseY + 24} fill="#64748b" fontSize={13} fontWeight={700} letterSpacing={2}>
        LAST STEPS
      </text>
      {steps.slice(-HISTORY_MAX_STEPS).map((s, i) => (
        <text
          key={i}
          x={32}
          y={baseY + HISTORY_PADDING_TOP + HISTORY_LINE_H * (i + 1) - 10}
          fill={s.color ?? "#94a3b8"}
          fontSize={16}
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
