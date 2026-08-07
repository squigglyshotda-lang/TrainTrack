// Real, continuous height in mm for the 3D preview only — deliberately
// separate from LayoutGraph's `level` (a discrete step count used for the
// 2D badges and closure detection). This walks the same graph structure
// and accumulates Port.riseMm the same way position accumulates through
// solveChildTransform, but it's pure 3D-rendering support: nothing else in
// the app reads it, so it isn't stored on PlacedPiece or serialized.
import { PIECE_DEFS_BY_TYPE } from "../data/pieceDefs";
import type { LayoutGraph } from "./graph";

export function computePieceElevationsMm(graph: LayoutGraph): Map<string, number> {
  const zByPieceId = new Map<string, number>();
  // graph.order is insertion order, so a piece's parent (if any) was always
  // placed earlier and its z is already known by the time we get here.
  for (const id of graph.order) {
    const att = graph.attachmentsByChild.get(id);
    if (!att) {
      zByPieceId.set(id, 0);
      continue;
    }
    const parentPiece = graph.pieces.get(att.parentPieceId)!;
    const parentPort = PIECE_DEFS_BY_TYPE[parentPiece.type].ports.find((p) => p.id === att.parentPortId)!;
    const childDef = PIECE_DEFS_BY_TYPE[graph.pieces.get(id)!.type];
    const childPort = childDef.ports.find((p) => p.id === att.childPortId)!;
    const parentZ = zByPieceId.get(att.parentPieceId) ?? 0;
    const parentPortZ = parentZ + (parentPort.riseMm ?? 0);
    zByPieceId.set(id, parentPortZ - (childPort.riseMm ?? 0));
  }
  return zByPieceId;
}
