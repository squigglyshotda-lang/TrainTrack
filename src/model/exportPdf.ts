// Phase 4: a printable assembly diagram. Draws the exact same geometry the
// canvas draws (piece outlines from pieceDefs.ts, transformed through the
// graph's own applyTransform) onto a PDF page, plus a title block and BOM,
// so the drawing is never a re-interpretation of the layout — it's the same
// numbers, just rendered somewhere else.
// jsPDF pulls in optional plugins (html2canvas, DOMPurify) that this file
// never uses — they're only needed for its .html() method. Importing the
// type normally but the value via a dynamic import keeps that ~400KB out of
// the app's main bundle; it only loads the moment someone clicks Export PDF.
import type { jsPDF as JsPDF } from "jspdf";
import { PIECE_DEFS_BY_TYPE } from "../data/pieceDefs";
import { applyTransform } from "./geometry";
import type { LayoutGraph } from "./graph";

interface PagePoint {
  x: number;
  y: number;
}

function drawPolygon(doc: JsPDF, points: PagePoint[], style: string) {
  if (points.length < 2) return;
  const [start, ...rest] = points;
  const deltas: [number, number][] = rest.map((p, i) => {
    const prev = i === 0 ? start : rest[i - 1];
    return [p.x - prev.x, p.y - prev.y];
  });
  doc.lines(deltas, start.x, start.y, [1, 1], style, true);
}

export async function exportLayoutAsPdf(graph: LayoutGraph): Promise<void> {
  if (graph.isEmpty()) throw new Error("Nothing placed yet — there's nothing to export.");

  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "landscape" });
  const pageW = 297;
  const pageH = 210;
  const margin = 12;

  // Title block
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("Choo Builder Layout", margin, 16);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(new Date().toLocaleDateString(), margin, 22);

  // Reserve a right-hand column for the BOM, rest for the diagram.
  const bomColW = 55;
  const drawX0 = margin;
  const drawY0 = 28;
  const drawW = pageW - margin * 2 - bomColW - 8;
  const drawH = pageH - drawY0 - margin;

  // World-space bounding box across every piece's outline, so the drawing
  // is centered and scaled to fit regardless of layout size or position.
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const piece of graph.pieces.values()) {
    const def = PIECE_DEFS_BY_TYPE[piece.type];
    for (const outline of def.outlines) {
      for (const local of outline) {
        const world = applyTransform(piece.transform, local);
        minX = Math.min(minX, world.x);
        minY = Math.min(minY, world.y);
        maxX = Math.max(maxX, world.x);
        maxY = Math.max(maxY, world.y);
      }
    }
  }
  const layoutW = Math.max(1, maxX - minX);
  const layoutH = Math.max(1, maxY - minY);
  // Never scale up past true size — only down, if the layout won't fit.
  const scale = Math.min(drawW / layoutW, drawH / layoutH, 1);
  const offsetX = drawX0 + (drawW - layoutW * scale) / 2;
  const offsetY = drawY0 + (drawH - layoutH * scale) / 2;

  const toPage = (world: { x: number; y: number }): PagePoint => ({
    x: offsetX + (world.x - minX) * scale,
    y: offsetY + (world.y - minY) * scale,
  });

  doc.setDrawColor(120, 120, 120);
  doc.setFillColor(255, 255, 255);
  doc.setLineWidth(0.15);

  for (const piece of graph.pieces.values()) {
    const def = PIECE_DEFS_BY_TYPE[piece.type];
    for (const outline of def.outlines) {
      const pagePoints = outline.map((local) => toPage(applyTransform(piece.transform, local)));
      drawPolygon(doc, pagePoints, "FD");
    }
  }

  // Scale note — the only way a printed page tells the truth about size.
  doc.setFontSize(8);
  doc.setTextColor(110, 110, 110);
  if (scale >= 0.999) {
    doc.text("Printed true to size (1:1) if this page prints at 100% scale, no “fit to page.”", drawX0, pageH - 4);
  } else {
    doc.text(
      `Scaled down to fit the page (1:${(1 / scale).toFixed(2)}) — not true to size.`,
      drawX0,
      pageH - 4
    );
  }

  // BOM column
  const bomX = pageW - margin - bomColW;
  doc.setDrawColor(180, 180, 180);
  doc.line(bomX - 4, drawY0, bomX - 4, pageH - margin);
  doc.setTextColor(20, 20, 20);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Bill of Materials", bomX, drawY0);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  let y = drawY0 + 7;
  let total = 0;
  for (const row of graph.bom()) {
    doc.text(row.label, bomX, y);
    doc.text(`x${row.count}`, bomX + bomColW - 4, y, { align: "right" });
    total += row.count;
    y += 6;
  }
  doc.setDrawColor(150, 150, 150);
  doc.line(bomX, y, bomX + bomColW - 4, y);
  y += 5;
  doc.setFont("helvetica", "bold");
  doc.text("Total", bomX, y);
  doc.text(`x${total}`, bomX + bomColW - 4, y, { align: "right" });

  doc.save("choo-builder-assembly.pdf");
}
