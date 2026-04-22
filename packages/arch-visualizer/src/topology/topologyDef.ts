import type { NodeId, Team } from "../events/types";

export interface TopoNode {
  id: NodeId;
  label: string;
  sub?: string;
  team: Team;
  x: number;
  y: number;
  w: number;
  h: number;
  // Rendering hints
  glyph?: string;
  badge?: string;
}

export interface TopoEdge {
  id: string;
  from: NodeId;
  to: NodeId;
  kind: "http" | "shared" | "storage";
  // Curvature offset for Bezier rendering when multiple edges share endpoints.
  curve?: number;
}

export const CANVAS_W = 1200;
export const CANVAS_H = 820;

const NODE_W = 168;
const NODE_H = 62;
const SMALL_H = 52;

export const TEAM_COLORS: Record<Team, string> = {
  platform: "#8b5cf6",
  billing: "#f97316",
  accounts: "#10b981",
  trading: "#3b82f6",
  reporting: "#ec4899",
  infra: "#64748b",
};

export const NODES: TopoNode[] = [
  {
    id: "user",
    label: "User",
    sub: "browser",
    team: "platform",
    x: 520,
    y: 24,
    w: 160,
    h: SMALL_H,
    glyph: "👤",
  },
  {
    id: "shell",
    label: "platform-shell",
    sub: ":5173 — host",
    team: "platform",
    x: 520,
    y: 118,
    w: NODE_W,
    h: NODE_H,
    glyph: "🧩",
  },
  {
    id: "queryClient",
    label: "QueryClient",
    sub: "shared singleton",
    team: "platform",
    x: 880,
    y: 118,
    w: 190,
    h: NODE_H,
    glyph: "♾",
  },
  {
    id: "mfe-open-account",
    label: "mfe-open-account",
    sub: ":5174",
    team: "accounts",
    x: 90,
    y: 252,
    w: NODE_W,
    h: NODE_H,
    glyph: "📝",
  },
  {
    id: "mfe-billing",
    label: "mfe-billing",
    sub: ":5175",
    team: "billing",
    x: 290,
    y: 252,
    w: NODE_W,
    h: NODE_H,
    glyph: "💳",
  },
  {
    id: "mfe-trading",
    label: "mfe-trading",
    sub: ":5176",
    team: "trading",
    x: 490,
    y: 252,
    w: NODE_W,
    h: NODE_H,
    glyph: "📈",
  },
  {
    id: "mfe-reporting",
    label: "mfe-reporting",
    sub: ":5177",
    team: "reporting",
    x: 690,
    y: 252,
    w: NODE_W,
    h: NODE_H,
    glyph: "📊",
  },
  {
    id: "bff-reporting",
    label: "bff-reporting",
    sub: ":8090 — Spring Boot",
    team: "reporting",
    x: 690,
    y: 390,
    w: NODE_W,
    h: NODE_H,
    glyph: "🌀",
    badge: "BFF",
  },
  {
    id: "api-java:auth",
    label: "api-java",
    sub: "auth",
    team: "infra",
    x: 90,
    y: 540,
    w: NODE_W,
    h: NODE_H,
    glyph: "🔐",
  },
  {
    id: "api-java:accounts",
    label: "api-java",
    sub: "accounts",
    team: "accounts",
    x: 290,
    y: 540,
    w: NODE_W,
    h: NODE_H,
    glyph: "📇",
  },
  {
    id: "api-java:billing",
    label: "api-java",
    sub: "billing",
    team: "billing",
    x: 490,
    y: 540,
    w: NODE_W,
    h: NODE_H,
    glyph: "🧾",
  },
  {
    id: "api-java:trading",
    label: "api-java",
    sub: "trading",
    team: "trading",
    x: 690,
    y: 540,
    w: NODE_W,
    h: NODE_H,
    glyph: "📊",
  },
  {
    id: "h2",
    label: "H2",
    sub: "auth sessions",
    team: "infra",
    x: 90,
    y: 680,
    w: NODE_W,
    h: SMALL_H,
    glyph: "🗄️",
  },
];

export const EDGES: TopoEdge[] = [
  { id: "e:user-shell", from: "user", to: "shell", kind: "http" },

  // Shell → MFEs (lazy-load + auth). Single edge per pair; fan-in at shell.
  { id: "e:shell-acc", from: "shell", to: "mfe-open-account", kind: "http" },
  { id: "e:shell-bil", from: "shell", to: "mfe-billing", kind: "http" },
  { id: "e:shell-tra", from: "shell", to: "mfe-trading", kind: "http" },
  { id: "e:shell-rep", from: "shell", to: "mfe-reporting", kind: "http" },

  // Shell → auth (the only MFE→monolith call owned by Platform Core).
  { id: "e:shell-auth", from: "shell", to: "api-java:auth", kind: "http", curve: -0.25 },

  // Each domain MFE → its domain in the monolith (vertical, direct).
  { id: "e:bil-apibil", from: "mfe-billing", to: "api-java:billing", kind: "http" },
  { id: "e:acc-apiacc", from: "mfe-open-account", to: "api-java:accounts", kind: "http" },
  { id: "e:tra-apitra", from: "mfe-trading", to: "api-java:trading", kind: "http" },

  // Reporting MFE → BFF → three monolith domains (the fan-out hero).
  { id: "e:rep-bff", from: "mfe-reporting", to: "bff-reporting", kind: "http" },
  { id: "e:bff-apiacc", from: "bff-reporting", to: "api-java:accounts", kind: "http", curve: 0.2 },
  { id: "e:bff-apibil", from: "bff-reporting", to: "api-java:billing", kind: "http", curve: 0.1 },
  { id: "e:bff-apitra", from: "bff-reporting", to: "api-java:trading", kind: "http", curve: -0.05 },

  // Auth persistence.
  { id: "e:apiauth-h2", from: "api-java:auth", to: "h2", kind: "storage" },

  // Shared singleton cables.
  { id: "e:qc-shell", from: "queryClient", to: "shell", kind: "shared" },
  { id: "e:qc-bil", from: "queryClient", to: "mfe-billing", kind: "shared", curve: 0.3 },
  { id: "e:qc-acc", from: "queryClient", to: "mfe-open-account", kind: "shared", curve: 0.5 },
  { id: "e:qc-tra", from: "queryClient", to: "mfe-trading", kind: "shared", curve: 0.25 },
  { id: "e:qc-rep", from: "queryClient", to: "mfe-reporting", kind: "shared", curve: 0.15 },
];

export const NODES_BY_ID: Record<string, TopoNode> = Object.fromEntries(
  NODES.map((n) => [n.id, n]),
);

export function nodeCenter(id: string): { x: number; y: number } | null {
  const n = NODES_BY_ID[id];
  if (!n) return null;
  return { x: n.x + n.w / 2, y: n.y + n.h / 2 };
}

export function nodeAnchor(fromId: string, toId: string, side: "from" | "to"): { x: number; y: number } | null {
  const from = NODES_BY_ID[fromId];
  const to = NODES_BY_ID[toId];
  if (!from || !to) return null;
  const fromC = { x: from.x + from.w / 2, y: from.y + from.h / 2 };
  const toC = { x: to.x + to.w / 2, y: to.y + to.h / 2 };
  const n = side === "from" ? from : to;
  const c = side === "from" ? fromC : toC;
  const other = side === "from" ? toC : fromC;
  const dx = other.x - c.x;
  const dy = other.y - c.y;
  const absX = Math.abs(dx);
  const absY = Math.abs(dy);
  // Anchor on the edge of the node box nearest to the other endpoint.
  if (absY * n.w > absX * n.h) {
    // Exit top or bottom.
    const y = c.y + Math.sign(dy) * (n.h / 2);
    return { x: c.x, y };
  }
  const x = c.x + Math.sign(dx) * (n.w / 2);
  return { x, y: c.y };
}

export function edgePath(edge: TopoEdge): string {
  const a = nodeAnchor(edge.from, edge.to, "from");
  const b = nodeAnchor(edge.from, edge.to, "to");
  if (!a || !b) return "";
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const curve = edge.curve ?? 0;
  // Perpendicular offset for the Bezier control point.
  const nx = -dy / (dist || 1);
  const ny = dx / (dist || 1);
  const cx = a.x + dx / 2 + nx * curve * dist;
  const cy = a.y + dy / 2 + ny * curve * dist;
  return `M ${a.x} ${a.y} Q ${cx} ${cy} ${b.x} ${b.y}`;
}

export const EDGES_BY_PAIR: Map<string, TopoEdge> = new Map();
for (const e of EDGES) {
  EDGES_BY_PAIR.set(`${e.from}→${e.to}`, e);
  EDGES_BY_PAIR.set(`${e.to}→${e.from}`, e);
}
