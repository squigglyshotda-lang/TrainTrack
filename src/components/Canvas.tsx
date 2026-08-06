import { useRef, useState } from "react";
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
  onEmptyCanvasClick: (screenPos: { x: number; y: number }) => void;
  selectedId: string | null;
  closures: ClosurePair[];
  onFlipSelected: (pieceId: string) => void;
  onReplaceSelected: (pieceId: string, screenPos: { x: number; y: number }) => void;
  onDeleteSelected: () => void;
  // Smart Join: while active, a port click doesn't open the attach picker —
  // it either picks a join source (App.tsx then computes which other free
  // ports are actually reachable from it) or, if a source is already
  // picked, completes the join onto whichever reachable port was clicked.
  joinMode: boolean;
  joinSourceKey: string | null;
  reachableKeys: Set<string>;
}

const PEG_COLOR = "var(--peg)";
const SOCKET_COLOR = "var(--socket)";

export default function Canvas({
  graph,
  onPortClick,
  onDrawPathComplete,
  onPieceClick,
  onEmptyCanvasClick,
  selectedId,
  closures,
  onFlipSelected,
  onReplaceSelected,
  onDeleteSelected,
  joinMode,
  joinSourceKey,
  reachableKeys,
}: CanvasProps) {
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
      onEmptyCanvasClick(toLocal(e.clientX, e.clientY));
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

  const occupied = graph.occupiedPortKeys();
  const freePorts = graph.freePorts();

  return (
    <div ref={containerRef} className="canvas-container">
      <svg
        className="canvas-svg"
        onPointerDown={handleBackgroundPointerDown}
        onPointerMove={handleBackgroundPointerMove}
        onPointerUp={handleBackgroundPointerUp}
        onWheel={handleWheel}
      >
        <g transform={`translate(${view.tx} ${view.ty}) scale(${view.scale})`}>
          {[...graph.pieces.values()].map((piece) => {
            const def = PIECE_DEFS_BY_TYPE[piece.type];
            const isSelected = piece.id === selectedId;
            return (
              <g
                key={piece.id}
                transform={`translate(${piece.transform.x} ${piece.transform.y}) rotate(${piece.transform.rotationDeg})`}
                onPointerDown={(e) => e.stopPropagation()}
                onPointerUp={(e) => {
                  e.stopPropagation();
                  onPieceClick(piece.id);
                }}
                style={{ cursor: "pointer" }}
              >
                {def.outlines.map((outline, i) => (
                  <path
                    key={i}
                    d={polygonToPath(outline)}
                    className={isSelected ? "piece-outline piece-outline-selected" : "piece-outline"}
                  />
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
                className="port-free"
                style={isDimmed ? { opacity: 0.28 } : undefined}
              >
                {isJoinSource && <circle r={9} className="port-join-ring" />}
                {isReachable && !isJoinSource && <circle r={8} className="port-reachable-ring" />}
                {fp.port.gender === "peg" ? (
                  <circle r={4} fill={PEG_COLOR} />
                ) : (
                  <>
                    <circle r={5} fill={SOCKET_COLOR} />
                    <circle r={2.4} fill="var(--bg)" />
                  </>
                )}
              </g>
            );
          })}
        </g>
      </svg>

      {graph.isEmpty() && (
        <div className="canvas-empty-hint">
          Click anywhere to place your first piece
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
              onReplace={() => onReplaceSelected(selectedId, anchor)}
              onDelete={onDeleteSelected}
            />
          );
        })()}
    </div>
  );
}
