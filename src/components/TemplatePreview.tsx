import { useMemo } from "react";
import { LayoutGraph } from "../model/graph";
import { PIECE_DEFS_BY_TYPE } from "../data/pieceDefs";
import { applyTransform } from "../model/geometry";
import { polygonToPath } from "../model/svgPath";
import type { Template } from "../data/templates";

interface TemplatePreviewProps {
  template: Template;
}

// A preview "image" for a template, built the same way PieceThumbnail
// builds one for a single piece: rebuild the real LayoutGraph from the
// template's own action list (the exact same replay path used to load a
// saved file) and draw every piece's real outline at its solved world
// transform. This is the actual layout, to scale, not a separately
// authored decorative image — it can't drift out of sync with what
// choosing the template actually places.
export default function TemplatePreview({ template }: TemplatePreviewProps) {
  const { paths, viewBox } = useMemo(() => {
    const graph = LayoutGraph.fromSerialized(template.layout);
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    const outlinePaths: string[] = [];
    for (const piece of graph.pieces.values()) {
      const def = PIECE_DEFS_BY_TYPE[piece.type];
      for (const outline of def.outlines) {
        const worldPts = outline.map((p) => applyTransform(piece.transform, p));
        for (const p of worldPts) {
          minX = Math.min(minX, p.x);
          minY = Math.min(minY, p.y);
          maxX = Math.max(maxX, p.x);
          maxY = Math.max(maxY, p.y);
        }
        outlinePaths.push(polygonToPath(worldPts));
      }
    }
    const w = Math.max(1, maxX - minX);
    const h = Math.max(1, maxY - minY);
    const pad = Math.max(w, h) * 0.08;
    return {
      paths: outlinePaths,
      viewBox: `${minX - pad} ${minY - pad} ${w + pad * 2} ${h + pad * 2}`,
    };
  }, [template]);

  return (
    <svg
      className="template-preview"
      viewBox={viewBox}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={`${template.name} preview`}
    >
      {paths.map((d, i) => (
        <path key={i} d={d} className="template-preview-outline" />
      ))}
    </svg>
  );
}
