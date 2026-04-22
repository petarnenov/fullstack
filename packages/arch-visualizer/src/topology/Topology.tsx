import { memo } from "react";
import {
  CANVAS_H,
  CANVAS_W,
  EDGES,
  NODES,
  TEAM_COLORS,
  edgePath,
  type TopoEdge,
  type TopoNode,
} from "./topologyDef";

interface TopologyProps {
  children?: React.ReactNode;
  activeNodes?: Set<string>;
}

function EdgePath({ edge }: { edge: TopoEdge }) {
  const d = edgePath(edge);
  if (edge.kind === "shared") {
    return (
      <path
        d={d}
        fill="none"
        stroke="#a855f7"
        strokeOpacity={0.45}
        strokeWidth={1.8}
        strokeDasharray="4 6"
      />
    );
  }
  if (edge.kind === "storage") {
    return (
      <path
        d={d}
        fill="none"
        stroke="#475569"
        strokeOpacity={0.7}
        strokeWidth={2}
        strokeDasharray="6 4"
      />
    );
  }
  return (
    <path
      d={d}
      fill="none"
      stroke="#334155"
      strokeOpacity={0.85}
      strokeWidth={1.8}
      markerEnd="url(#arrow)"
    />
  );
}

function NodeBox({ node, active }: { node: TopoNode; active: boolean }) {
  const color = TEAM_COLORS[node.team];
  return (
    <g transform={`translate(${node.x}, ${node.y})`}>
      <rect
        width={node.w}
        height={node.h}
        rx={10}
        ry={10}
        fill="#0f172a"
        stroke={color}
        strokeWidth={active ? 3 : 1.6}
        style={{
          filter: active ? `drop-shadow(0 0 10px ${color})` : undefined,
          transition: "stroke-width 180ms, filter 180ms",
        }}
      />
      <rect
        x={0}
        y={0}
        width={4}
        height={node.h}
        rx={2}
        ry={2}
        fill={color}
      />
      <text
        x={node.w / 2}
        y={node.h / 2 - (node.sub ? 5 : 0)}
        textAnchor="middle"
        fill="#e2e8f0"
        fontSize={13}
        fontWeight={600}
        style={{ fontFamily: "ui-sans-serif, system-ui" }}
      >
        {node.glyph ? `${node.glyph}  ` : ""}
        {node.label}
      </text>
      {node.sub && (
        <text
          x={node.w / 2}
          y={node.h / 2 + 12}
          textAnchor="middle"
          fill="#94a3b8"
          fontSize={10}
          style={{ fontFamily: "ui-monospace, SFMono-Regular" }}
        >
          {node.sub}
        </text>
      )}
      {node.badge && (
        <g transform={`translate(${node.w - 36}, -10)`}>
          <rect width={32} height={16} rx={8} fill={color} />
          <text
            x={16}
            y={11}
            textAnchor="middle"
            fill="#0f172a"
            fontSize={9}
            fontWeight={700}
          >
            {node.badge}
          </text>
        </g>
      )}
    </g>
  );
}

export const Topology = memo(function Topology({ children, activeNodes }: TopologyProps) {
  return (
    <svg
      viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`}
      width="100%"
      height="100%"
      preserveAspectRatio="xMidYMid meet"
      style={{ background: "#020617" }}
    >
      <defs>
        <marker
          id="arrow"
          viewBox="0 0 10 10"
          refX={9}
          refY={5}
          markerWidth={6}
          markerHeight={6}
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#334155" />
        </marker>
        <radialGradient id="particle-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity={1} />
          <stop offset="60%" stopColor="#ffffff" stopOpacity={0.4} />
          <stop offset="100%" stopColor="#ffffff" stopOpacity={0} />
        </radialGradient>
      </defs>

      <g>
        {EDGES.map((edge) => (
          <EdgePath key={edge.id} edge={edge} />
        ))}
      </g>

      {children}

      <g>
        {NODES.map((node) => (
          <NodeBox
            key={node.id}
            node={node}
            active={activeNodes?.has(node.id) ?? false}
          />
        ))}
      </g>
    </svg>
  );
});
