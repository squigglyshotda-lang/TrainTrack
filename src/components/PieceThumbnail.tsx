import { polygonToPath } from "../model/svgPath";
import type { PieceDef } from "../model/types";

interface PieceThumbnailProps {
  def: PieceDef;
  size?: number;
}

// A small, self-scaling preview of a piece's outline — the exact same
// outline data the canvas draws, just fit into a little square instead of
// placed in the world. Ports aren't shown; this is "what shape is this",
// not "how does this connect."
export default function PieceThumbnail({ def, size = 56 }: PieceThumbnailProps) {
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
  const pad = Math.max(w, h) * 0.12;
  const viewBox = `${minX - pad} ${minY - pad} ${w + pad * 2} ${h + pad * 2}`;

  return (
    <svg
      className="piece-thumb"
      width={size}
      height={size}
      viewBox={viewBox}
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
    >
      {def.outlines.map((outline, i) => (
        <path key={i} d={polygonToPath(outline)} className="piece-thumb-outline" />
      ))}
    </svg>
  );
}
