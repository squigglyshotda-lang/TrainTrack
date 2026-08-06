import { useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent, WheelEvent as ReactWheelEvent } from "react";
import { PIECE_DEFS_BY_TYPE, MIRROR_PARTNER } from "../data/pieceDefs";
import { polygonToPath } from "../model/svgPath";
import SelectionMenu from "./SelectionMenu";
import type { LayoutGraph, FreePortInfo, ClosurePair } from "../model/graph";

interface View {
  scale: number; // px per mm
  tx: number; // px offset of world (0,0)
  ty: number;
}

interface CanvasProps {
  graph: LayoutGraph;
  onPortClick: (info: FreePortInfo, screenPos: { x: number; y: number }) => void;
  onPortShiftClick: (info: FreePortInfo) => void;
  onPieceClick: (pieceId: string) => void;
  onEmptyCanvasClick: (screenPos: { x: number; y: number }) => void;
  selectedId: string | null;
  selectedPortKeys: Set<string>;
  onJoinSelectedPorts: () => void;
  closures: ClosurePair[];
  onFlipSelected: (pieceId: string) => void;
  onReplaceSelected: (pieceId: string, screenPos: { x: number; y: number }) => void;
  onDeleteSelected: () => void;
}

const PEG_COLOR = "var(--peg)";
const SOCKET_COLOR = "var(--socket)";

export default function Canvas({
  graph,
  onPortClick,
  onPortShiftClick,
  onPieceClick,
  onEmptyCanvasClick,
  selectedId,
  selectedPortKeys,
  onJoinSelectedPorts,
  closures,
  onFlipSelected,
  onReplaceSelected,
  onDeleteSelected,
}: CanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<View>({ scale: 1.6, tx: 400, ty: 300 });
  const dragState = useRef<{ startX: number; startY: number; origTx: number; origTy: number; moved: boolean } | null>(
    null
  );

  const toLocal = (clientX: number, clientY: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    return { x: clientX - (rect?.left ?? 0), y: clientY - (rect?.top ?? 0) };
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
            const isPortSelected = selectedPortKeys.has(`${fp.pieceId}:${fp.port.id}`);
            return (
              <g
                key={`${fp.pieceId}:${fp.port.id}`}
                transform={`translate(${fp.worldPos.x} ${fp.worldPos.y})`}
                onPointerDown={(e) => e.stopPropagation()}
                onPointerUp={(e) => {
                  e.stopPropagation();
                  if (e.shiftKey) {
                    onPortShiftClick(fp);
                  } else {
                    onPortClick(fp, toScreen(fp.worldPos.x, fp.worldPos.y));
                  }
                }}
                className="port-free"
              >
                {isPortSelected && <circle r={9} className="port-join-ring" />}
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

      {selectedPortKeys.size === 2 &&
        (() => {
          const selected = freePorts.filter((fp) => selectedPortKeys.has(`${fp.pieceId}:${fp.port.id}`));
          if (selected.length !== 2) return null;
          const midWorld = {
            x: (selected[0].worldPos.x + selected[1].worldPos.x) / 2,
            y: (selected[0].worldPos.y + selected[1].worldPos.y) / 2,
          };
          const anchor = toScreen(midWorld.x, midWorld.y);
          return (
            <button
              className="join-button"
              style={{ left: anchor.x, top: anchor.y }}
              onClick={onJoinSelectedPorts}
            >
              ⚡ Join
            </button>
          );
        })()}
    </div>
  );
}
