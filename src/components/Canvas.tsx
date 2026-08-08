import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent, WheelEvent as ReactWheelEvent } from "react";
import { PIECE_DEFS_BY_TYPE, MIRROR_PARTNER } from "../data/pieceDefs";
import { polygonToPath } from "../model/svgPath";
import SelectionMenu from "./SelectionMenu";
import type { LayoutGraph, FreePortInfo, ClosurePair } from "../model/graph";
import type { Point } from "../model/geometry";

interface View {
  scale: number; // px per mm
  tx: number; // px offset of world (0,0)
  ty: number;
}

interface CanvasProps {
  graph: LayoutGraph;
  onPortClick: (info: FreePortInfo, screenPos: { x: number; y: number }) => void;
  onDrawPathComplete: (info: FreePortInfo, worldPoints: Point[]) => void;
  onPieceClick: (pieceId: string) => void;
  onEmptyCanvasClick: (screenPos: { x: number; y: number }, worldPos: Point) => void;
  selectedId: string | null;
  closures: ClosurePair[];
  onFlipSelected: (pieceId: string) => void;
  onRotateSelected: (pieceId: string) => void;
  onReplaceSelected: (pieceId: string, screenPos: { x: number; y: number }) => void;
  onDeleteSelected: () => void;
  // Smart Join: while active, a port click doesn't open the attach picker —
  // it either picks a join source (App.tsx then computes which other free
  // ports are actually reachable from it) or, if a source is already
  // picked, completes the join onto whichever reachable port was clicked.
  joinMode: boolean;
  joinSourceKey: string | null;
  reachableKeys: Set<string>;
  // Hover preview: lighter-weight than Smart Join, works without entering
  // that mode at all — just "what could this port reach right now".
  onPortHoverStart: (info: FreePortInfo) => void;
  onPortHoverEnd: () => void;
  hoverReachableKeys: Set<string>;
}

export interface CanvasHandle {
  fitToView: () => void;
}

const PEG_COLOR = "var(--peg)";
const SOCKET_COLOR = "var(--socket)";

// Real-world-scale background grid: a dot every GRID_MINOR_MM, a slightly
// bolder line every GRID_MAJOR_MM (one straight piece's length), so the
// canvas itself is a scale reference instead of decoration with no
// relationship to the millimeters everything else on screen is measured
// in. Drawn in world units inside the pan/zoom group, so it scales and
// pans with the layout rather than sitting fixed on screen.
const GRID_MINOR_MM = 25;
const GRID_MAJOR_MM = 100;
// Generous fixed extent (5m square) so the grid always covers the visible
// area at any reasonable pan/zoom without recomputing per render.
const GRID_EXTENT_MM = 5000;

// A handful of "nice" round millimeter lengths to choose the on-screen
// scale bar from, so it always reads a sensible number rather than
// whatever a fixed pixel width happens to convert to.
const SCALE_BAR_CANDIDATES_MM = [10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000, 5000];

function pickScaleBarMm(scale: number): number {
  let best = SCALE_BAR_CANDIDATES_MM[0];
  let bestDiff = Infinity;
  for (const mm of SCALE_BAR_CANDIDATES_MM) {
    const px = mm * scale;
    if (px < 40 || px > 220) continue;
    const diff = Math.abs(px - 110);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = mm;
    }
  }
  return best;
}

const Canvas = forwardRef<CanvasHandle, CanvasProps>(function Canvas(
  {
    graph,
    onPortClick,
    onDrawPathComplete,
    onPieceClick,
    onEmptyCanvasClick,
    selectedId,
    closures,
    onFlipSelected,
    onRotateSelected,
    onReplaceSelected,
    onDeleteSelected,
    joinMode,
    joinSourceKey,
    reachableKeys,
    onPortHoverStart,
    onPortHoverEnd,
    hoverReachableKeys,
  },
  ref
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<View>({ scale: 1.6, tx: 400, ty: 300 });
  const dragState = useRef<{ startX: number; startY: number; origTx: number; origTy: number; moved: boolean } | null>(
    null
  );
  // A drag that starts on a free port draws a rough path instead of panning
  // (ports already stop the background pan from starting at all). Below a
  // small movement threshold it's still treated as an ordinary click, so
  // the existing attach-picker / shift-select behavior is untouched.
  const drawState = useRef<{
    fp: FreePortInfo;
    startClientX: number;
    startClientY: number;
    points: Point[];
    moved: boolean;
  } | null>(null);
  const [drawPreview, setDrawPreview] = useState<Point[] | null>(null);
  const DRAW_THRESHOLD_PX = 10;
  // Which piece to show a name tag for — the hovered one takes priority,
  // falling back to the selected one so the name stays visible after a
  // click even once the pointer moves off (matching what the selection
  // menu itself already does).
  const [hoveredPieceId, setHoveredPieceId] = useState<string | null>(null);

  const toLocal = (clientX: number, clientY: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    return { x: clientX - (rect?.left ?? 0), y: clientY - (rect?.top ?? 0) };
  };

  const toWorld = (clientX: number, clientY: number) => {
    const local = toLocal(clientX, clientY);
    return { x: (local.x - view.tx) / view.scale, y: (local.y - view.ty) / view.scale };
  };

  // World mm coordinates -> viewport screen pixels, inverse of toLocal plus
  // the pan/zoom transform. Used to position the free-port picker and the
  // selection menu at the right spot regardless of current pan/zoom.
  const toScreen = (worldX: number, worldY: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    return {
      x: (rect?.left ?? 0) + view.tx + worldX * view.scale,
      y: (rect?.top ?? 0) + view.ty + worldY * view.scale,
    };
  };

  const handleBackgroundPointerDown = (e: ReactPointerEvent<SVGSVGElement>) => {
    const local = toLocal(e.clientX, e.clientY);
    dragState.current = { startX: local.x, startY: local.y, origTx: view.tx, origTy: view.ty, moved: false };
    (e.target as Element).setPointerCapture(e.pointerId);
  };

  const handleBackgroundPointerMove = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (!dragState.current) return;
    // Safety net: if a pointerup was ever missed (e.g. released over an
    // element that stopped propagation before the background handler saw
    // it), don't keep panning on every future mouse move with no button
    // held.
    if (e.buttons === 0) {
      dragState.current = null;
      return;
    }
    const local = toLocal(e.clientX, e.clientY);
    const dx = local.x - dragState.current.startX;
    const dy = local.y - dragState.current.startY;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) dragState.current.moved = true;
    setView((v) => ({ ...v, tx: dragState.current!.origTx + dx, ty: dragState.current!.origTy + dy }));
  };

  const handleBackgroundPointerUp = (e: ReactPointerEvent<SVGSVGElement>) => {
    const moved = dragState.current?.moved ?? false;
    dragState.current = null;
    if (!moved) {
      onEmptyCanvasClick(toLocal(e.clientX, e.clientY), toWorld(e.clientX, e.clientY));
    }
  };

  const handleWheel = (e: ReactWheelEvent<SVGSVGElement>) => {
    e.preventDefault();
    const local = toLocal(e.clientX, e.clientY);
    const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
    setView((v) => {
      const newScale = Math.min(8, Math.max(0.2, v.scale * factor));
      // Keep the point under the cursor fixed while zooming.
      const worldX = (local.x - v.tx) / v.scale;
      const worldY = (local.y - v.ty) / v.scale;
      return { scale: newScale, tx: local.x - worldX * newScale, ty: local.y - worldY * newScale };
    });
  };

  // Frames the whole layout's real outline (not just port positions) in
  // the current viewport, with padding. Exposed imperatively rather than
  // through the view state directly, since view is Canvas's own local
  // concern — App.tsx just needs to trigger it from the toolbar.
  useImperativeHandle(
    ref,
    () => ({
      fitToView: () => {
        const bbox = graph.boundingBox();
        const rect = containerRef.current?.getBoundingClientRect();
        if (!bbox || !rect || rect.width === 0 || rect.height === 0) return;
        const PADDING_PX = 60;
        const bboxWidth = Math.max(1, bbox.maxX - bbox.minX);
        const bboxHeight = Math.max(1, bbox.maxY - bbox.minY);
        const availWidth = Math.max(1, rect.width - PADDING_PX * 2);
        const availHeight = Math.max(1, rect.height - PADDING_PX * 2);
        const scale = Math.min(8, Math.max(0.2, Math.min(availWidth / bboxWidth, availHeight / bboxHeight)));
        const centerX = (bbox.minX + bbox.maxX) / 2;
        const centerY = (bbox.minY + bbox.maxY) / 2;
        setView({
          scale,
          tx: rect.width / 2 - centerX * scale,
          ty: rect.height / 2 - centerY * scale,
        });
      },
    }),
    [graph]
  );

  const occupied = graph.occupiedPortKeys();
  const freePorts = graph.freePorts();
  const scaleBarMm = pickScaleBarMm(view.scale);

  // Every piece's own height range (a plain piece touches one level; a
  // bridge ramp spans two), sorted so higher pieces draw last — i.e. on
  // top of whatever they'd physically be floating above, matching how an
  // elevated track actually occludes what's underneath it.
  const piecesByRenderOrder = [...graph.pieces.values()]
    .map((piece) => {
      const def = PIECE_DEFS_BY_TYPE[piece.type];
      const levels = def.ports.map((p) => piece.level + (p.level ?? 0));
      return { piece, minLevel: Math.min(...levels), maxLevel: Math.max(...levels) };
    })
    .sort((a, b) => a.maxLevel - b.maxLevel);

  return (
    <div ref={containerRef} className="canvas-container">
      <svg
        className="canvas-svg"
        onPointerDown={handleBackgroundPointerDown}
        onPointerMove={handleBackgroundPointerMove}
        onPointerUp={handleBackgroundPointerUp}
        onWheel={handleWheel}
      >
        <defs>
          <pattern id="grid-minor" width={GRID_MINOR_MM} height={GRID_MINOR_MM} patternUnits="userSpaceOnUse">
            <circle cx={0} cy={0} r={1} className="grid-dot" />
          </pattern>
          <pattern id="grid-major" width={GRID_MAJOR_MM} height={GRID_MAJOR_MM} patternUnits="userSpaceOnUse">
            <rect width={GRID_MAJOR_MM} height={GRID_MAJOR_MM} fill="url(#grid-minor)" />
            <path d={`M ${GRID_MAJOR_MM} 0 L 0 0 0 ${GRID_MAJOR_MM}`} className="grid-major-line" fill="none" />
          </pattern>
        </defs>
        <g transform={`translate(${view.tx} ${view.ty}) scale(${view.scale})`}>
          <rect
            x={-GRID_EXTENT_MM}
            y={-GRID_EXTENT_MM}
            width={GRID_EXTENT_MM * 2}
            height={GRID_EXTENT_MM * 2}
            fill="url(#grid-major)"
          />
          {piecesByRenderOrder.map(({ piece, minLevel, maxLevel }) => {
            const def = PIECE_DEFS_BY_TYPE[piece.type];
            const isSelected = piece.id === selectedId;
            const isLevelPiece = minLevel !== 0 || maxLevel !== 0;
            const levelClass = maxLevel > 0 ? "piece-elevated" : minLevel < 0 ? "piece-depressed" : undefined;
            return (
              <g
                key={piece.id}
                transform={`translate(${piece.transform.x} ${piece.transform.y}) rotate(${piece.transform.rotationDeg})`}
                onPointerDown={(e) => e.stopPropagation()}
                onPointerUp={(e) => {
                  e.stopPropagation();
                  onPieceClick(piece.id);
                }}
                onPointerEnter={() => setHoveredPieceId(piece.id)}
                onPointerLeave={() => setHoveredPieceId(null)}
                className={levelClass}
                style={{ cursor: "pointer" }}
              >
                {def.outlines.map((outline, i) => (
                  <path
                    key={i}
                    d={polygonToPath(outline)}
                    className={isSelected ? "piece-outline piece-outline-selected" : "piece-outline"}
                  />
                ))}
                {def.grooves?.map((groove, i) => (
                  <polyline key={i} points={groove.map((p) => `${p.x},${p.y}`).join(" ")} className="piece-groove" />
                ))}
                {def.ports.map((port) => {
                  const isOccupied = occupied.has(`${piece.id}:${port.id}`);
                  if (!isOccupied) return null;
                  return (
                    <circle
                      key={port.id}
                      cx={port.x}
                      cy={port.y}
                      r={2}
                      className="port-occupied"
                    />
                  );
                })}
                {isLevelPiece &&
                  (() => {
                    const cx = def.outlines[0].reduce((s, p) => s + p.x, 0) / def.outlines[0].length;
                    const cy = def.outlines[0].reduce((s, p) => s + p.y, 0) / def.outlines[0].length;
                    const label = minLevel === maxLevel ? `L${maxLevel}` : `L${minLevel}↔L${maxLevel}`;
                    return (
                      <g transform={`translate(${cx} ${cy}) rotate(${-piece.transform.rotationDeg})`}>
                        <text className="level-badge-text" textAnchor="middle" dominantBaseline="central">
                          {label}
                        </text>
                      </g>
                    );
                  })()}
              </g>
            );
          })}

          {drawPreview && drawPreview.length > 1 && (
            <polyline
              points={drawPreview.map((p) => `${p.x},${p.y}`).join(" ")}
              className="draw-path-preview"
            />
          )}

          {closures.map((pair, i) => (
            <line
              key={i}
              x1={pair.a.worldPos.x}
              y1={pair.a.worldPos.y}
              x2={pair.b.worldPos.x}
              y2={pair.b.worldPos.y}
              className="closure-line"
            />
          ))}

          {freePorts.map((fp) => {
            const key = `${fp.pieceId}:${fp.port.id}`;
            const isJoinSource = key === joinSourceKey;
            const isReachable = reachableKeys.has(key);
            const isHoverReachable = hoverReachableKeys.has(key);
            // Once a join source is picked, ports that Smart Join can't
            // actually connect to fade out instead of just sitting there
            // waiting to produce an error if clicked.
            const isDimmed = joinMode && !!joinSourceKey && !isJoinSource && !isReachable;
            return (
              <g
                key={key}
                transform={`translate(${fp.worldPos.x} ${fp.worldPos.y})`}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  if (joinMode) return;
                  (e.currentTarget as Element).setPointerCapture(e.pointerId);
                  drawState.current = {
                    fp,
                    startClientX: e.clientX,
                    startClientY: e.clientY,
                    points: [fp.worldPos],
                    moved: false,
                  };
                }}
                onPointerMove={(e) => {
                  const d = drawState.current;
                  if (!d) return;
                  if (e.buttons === 0) {
                    drawState.current = null;
                    setDrawPreview(null);
                    return;
                  }
                  const dx = e.clientX - d.startClientX;
                  const dy = e.clientY - d.startClientY;
                  if (!d.moved && Math.hypot(dx, dy) > DRAW_THRESHOLD_PX) d.moved = true;
                  if (d.moved) {
                    d.points.push(toWorld(e.clientX, e.clientY));
                    setDrawPreview([...d.points]);
                  }
                }}
                onPointerUp={(e) => {
                  e.stopPropagation();
                  const d = drawState.current;
                  drawState.current = null;
                  setDrawPreview(null);
                  if (d && d.moved) {
                    onDrawPathComplete(d.fp, d.points);
                    return;
                  }
                  onPortClick(fp, toScreen(fp.worldPos.x, fp.worldPos.y));
                }}
                onPointerEnter={() => onPortHoverStart(fp)}
                onPointerLeave={onPortHoverEnd}
                className="port-free"
                style={isDimmed ? { opacity: 0.28 } : undefined}
              >
                {isJoinSource && <circle r={9} className="port-join-ring" />}
                {isReachable && !isJoinSource && <circle r={8} className="port-reachable-ring" />}
                {!joinMode && isHoverReachable && <circle r={8} className="port-hover-reachable-ring" />}
                {fp.port.gender === "peg" ? (
                  <circle r={4} fill={PEG_COLOR} />
                ) : (
                  <>
                    <circle r={5} fill={SOCKET_COLOR} />
                    <circle r={2.4} fill="var(--bg)" />
                  </>
                )}
                {fp.worldLevel !== 0 && (
                  <text
                    className="level-badge-text port-level-text"
                    x={7}
                    y={-7}
                    textAnchor="middle"
                    dominantBaseline="central"
                  >
                    L{fp.worldLevel}
                  </text>
                )}
              </g>
            );
          })}
        </g>
      </svg>

      <div className="scale-bar">
        <div className="scale-bar-line" style={{ width: scaleBarMm * view.scale }} />
        <span>{scaleBarMm}mm</span>
      </div>

      {graph.isEmpty() && (
        <div className="canvas-empty-hint">
          Nothing on the board yet. Click anywhere to drop your first piece.
        </div>
      )}

      {selectedId &&
        graph.pieces.has(selectedId) &&
        (() => {
          const piece = graph.pieces.get(selectedId)!;
          const anchor = toScreen(piece.transform.x, piece.transform.y);
          return (
            <SelectionMenu
              screenPos={{ x: anchor.x, y: anchor.y - 44 }}
              canFlip={!!MIRROR_PARTNER[piece.type]}
              onFlip={() => onFlipSelected(selectedId)}
              canRotate={graph.canRotate(selectedId)}
              onRotate={() => onRotateSelected(selectedId)}
              onReplace={() => onReplaceSelected(selectedId, anchor)}
              onDelete={onDeleteSelected}
            />
          );
        })()}

      {(() => {
        // Hovering a piece names it; once you click one, its name stays
        // up (via selectedId) even after the pointer moves away, so the
        // selection menu's target is never a mystery either.
        const labelPieceId = hoveredPieceId ?? selectedId;
        if (!labelPieceId) return null;
        const piece = graph.pieces.get(labelPieceId);
        if (!piece) return null;
        const def = PIECE_DEFS_BY_TYPE[piece.type];
        const anchor = toScreen(piece.transform.x, piece.transform.y);
        return (
          <div className="piece-name-tag" style={{ left: anchor.x, top: anchor.y + 22 }}>
            {def.label}
          </div>
        );
      })()}
    </div>
  );
});

export default Canvas;
