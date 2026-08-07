import { polygonToPath } from "../model/svgPath";
import type { PieceDef, Port } from "../model/types";

interface PiecePortDiagramProps {
  def: PieceDef;
  // Already filtered to whichever ports are actually choosable here (see
  // PiecePicker's compatiblePorts) — a port that couldn't be picked isn't
  // drawn, so there's nothing on the diagram that doesn't also appear in
  // the list below it.
  ports: Port[];
  hoveredPortId: string | null;
  onSelectPort: (portId: string) => void;
  onHoverPort: (portId: string | null) => void;
}

const PEG_COLOR = "var(--peg)";
const SOCKET_COLOR = "var(--socket)";

// A bigger sibling of PieceThumbnail that also draws each port as a
// labelled, clickable dot — for the one place in the UI where a bare
// letter ("a", "b", "left"...) isn't enough to know which physical spot on
// the piece it refers to. Reuses the same outline data and fit-to-viewBox
// approach as PieceThumbnail, just with generous padding for the labels.
export default function PiecePortDiagram({
  def,
  ports,
  hoveredPortId,
  onSelectPort,
  onHoverPort,
}: PiecePortDiagramProps) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const outline of def.outlines) {
    for (const p of outline) {
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x);
      maxY = Math.max(maxY, p.y);
    }
  }
  const w = Math.max(1, maxX - minX);
  const h = Math.max(1, maxY - minY);
  // Generous padding relative to PieceThumbnail's: labels sit outside the
  // outline itself and need room, not just the shape.
  const pad = Math.max(w, h) * 0.4;
  const viewBox = `${minX - pad} ${minY - pad} ${w + pad * 2} ${h + pad * 2}`;
  const dotR = Math.max(w, h) * 0.045;

  return (
    <svg
      className="piece-port-diagram"
      viewBox={viewBox}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={`${def.label} — ports ${ports.map((p) => p.id).join(", ")}`}
    >
      {def.outlines.map((outline, i) => (
        <path key={i} d={polygonToPath(outline)} className="piece-thumb-outline" />
      ))}
      {ports.map((port) => {
        const isHovered = port.id === hoveredPortId;
        // Label offset points outward from the piece's own local origin,
        // so it reads away from the shape instead of overlapping it.
        const dist = Math.hypot(port.x, port.y) || 1;
        const labelX = port.x + (port.x / dist) * dotR * 3.4;
        const labelY = port.y + (port.y / dist) * dotR * 3.4;
        return (
          <g
            key={port.id}
            className="piece-port-diagram-port"
            onPointerEnter={() => onHoverPort(port.id)}
            onPointerLeave={() => onHoverPort(null)}
            onClick={() => onSelectPort(port.id)}
          >
            <circle cx={port.x} cy={port.y} r={dotR * 2.6} className="piece-port-diagram-hit" />
            {isHovered && <circle cx={port.x} cy={port.y} r={dotR * 1.9} className="piece-port-diagram-ring" />}
            <circle cx={port.x} cy={port.y} r={dotR} fill={port.gender === "peg" ? PEG_COLOR : SOCKET_COLOR} />
            <text
              x={labelX}
              y={labelY}
              className={isHovered ? "piece-port-diagram-label piece-port-diagram-label-hovered" : "piece-port-diagram-label"}
              textAnchor="middle"
              dominantBaseline="central"
              style={{ fontSize: dotR * 2.6, strokeWidth: dotR * 0.5 }}
            >
              {port.id}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
