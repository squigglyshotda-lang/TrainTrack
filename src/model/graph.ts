// The layout IS this graph. Screen positions are always derived from it,
// never stored independently — see applyTransform() calls below. Nothing
// here does collision detection or coordinate snapping; placement is pure
// algebra (solveChildTransform), and "closure" is just a proximity check
// over free ports, reported rather than enforced.
import spec from "../data/track-spec.json";
import { PIECE_DEFS_BY_TYPE, MIRROR_PARTNER } from "../data/pieceDefs";
import {
  applyTransform,
  distance,
  angleDiffDeg,
  normalizeDeg,
  solveChildTransform,
  worldHeading,
} from "./geometry";
import type { Point, Transform } from "./geometry";
import type { Port } from "./types";

export interface PlacedPiece {
  id: string;
  type: string;
  transform: Transform;
}

export interface Attachment {
  childPieceId: string;
  childPortId: string;
  parentPieceId: string;
  parentPortId: string;
}

export interface FreePortInfo {
  pieceId: string;
  port: Port;
  worldPos: Point;
  worldHeadingDeg: number;
}

export interface ClosurePair {
  a: FreePortInfo;
  b: FreePortInfo;
  gapMm: number;
}

// The graph's entire composition, boiled down to the sequence of placement
// decisions that built it — a root piece, then a chain of "attach childType
// via childPortId to parentPieceId's parentPortId" steps. Positions and
// rotations are (almost) never part of this: they're re-derived on load by
// replaying these steps through the same placement math used interactively.
// The one exception is rootTransform: a normal root is always placed at the
// origin, but deleting a root piece detaches its children into new roots of
// their own (see deletePiece) rather than discarding them, and those need
// to reload exactly where they already were, not snap back to the origin.
// This is what save/load, undo/redo, and delete-driven history all share.
export interface SerializedAction {
  id: string;
  type: string;
  parent?: { pieceId: string; portId: string };
  childPortId?: string;
  rootTransform?: Transform;
}

export interface SerializedLayout {
  version: 1;
  actions: SerializedAction[];
}

function occupiedKey(pieceId: string, portId: string): string {
  return `${pieceId}:${portId}`;
}

export class LayoutGraph {
  pieces = new Map<string, PlacedPiece>();
  order: string[] = [];
  attachmentsByChild = new Map<string, Attachment>();
  childrenOf = new Map<string, string[]>();
  private idCounter = 0;

  private nextId(): string {
    this.idCounter += 1;
    return `piece${this.idCounter}`;
  }

  // Keeps future auto-generated ids from colliding with ones loaded from a
  // saved file or an earlier point in the undo history.
  private noteExistingId(id: string): void {
    const match = /^piece(\d+)$/.exec(id);
    if (match) this.idCounter = Math.max(this.idCounter, Number(match[1]));
  }

  isEmpty(): boolean {
    return this.pieces.size === 0;
  }

  placeRoot(type: string, explicitId?: string, explicitTransform?: Transform): PlacedPiece {
    const id = explicitId ?? this.nextId();
    this.noteExistingId(id);
    const piece: PlacedPiece = { id, type, transform: explicitTransform ?? { x: 0, y: 0, rotationDeg: 0 } };
    this.pieces.set(id, piece);
    this.order.push(id);
    return piece;
  }

  // Attaches a new piece of `childType`, using its port `childPortId`, to
  // the free port `parentPortId` on the already-placed piece `parentPieceId`.
  // This is the one place a piece's position/rotation gets computed — and
  // it's computed, not chosen.
  attach(
    parentPieceId: string,
    parentPortId: string,
    childType: string,
    childPortId: string,
    explicitId?: string
  ): PlacedPiece {
    const parent = this.pieces.get(parentPieceId);
    if (!parent) throw new Error(`Unknown parent piece ${parentPieceId}`);
    const parentDef = PIECE_DEFS_BY_TYPE[parent.type];
    const parentPort = parentDef.ports.find((p) => p.id === parentPortId);
    if (!parentPort) throw new Error(`Unknown parent port ${parentPortId}`);

    const childDef = PIECE_DEFS_BY_TYPE[childType];
    const childPort = childDef.ports.find((p) => p.id === childPortId);
    if (!childPort) throw new Error(`Unknown child port ${childPortId}`);

    if (childPort.gender === parentPort.gender) {
      throw new Error("Cannot attach two ports of the same gender");
    }

    const parentWorldPos = applyTransform(parent.transform, parentPort);
    const parentWorldHeadingDeg = worldHeading(parent.transform, parentPort.headingDeg);
    const transform = solveChildTransform(
      parentWorldPos,
      parentWorldHeadingDeg,
      childPort,
      childPort.headingDeg
    );

    const id = explicitId ?? this.nextId();
    this.noteExistingId(id);
    const piece: PlacedPiece = { id, type: childType, transform };
    this.pieces.set(id, piece);
    this.order.push(id);

    this.attachmentsByChild.set(id, {
      childPieceId: id,
      childPortId: childPort.id,
      parentPieceId,
      parentPortId,
    });
    const kids = this.childrenOf.get(parentPieceId) ?? [];
    kids.push(id);
    this.childrenOf.set(parentPieceId, kids);

    return piece;
  }

  canFlip(id: string): boolean {
    const piece = this.pieces.get(id);
    return !!piece && !!MIRROR_PARTNER[piece.type];
  }

  // Swaps a piece for its mirror-image type in place. The piece's own port
  // "a"/"b"/etc. ids don't change, only which local geometry they map to —
  // so if this piece is attached to a parent, its own transform has to be
  // re-solved (the port it attaches through may now sit somewhere else
  // locally), and the same cascades down through everything built on top
  // of it, since ITS ports may have moved too.
  flipPiece(id: string): void {
    const piece = this.pieces.get(id);
    if (!piece) throw new Error(`Unknown piece ${id}`);
    const mirrorType = MIRROR_PARTNER[piece.type];
    if (!mirrorType) return;

    piece.type = mirrorType;

    const att = this.attachmentsByChild.get(id);
    if (att) {
      const parent = this.pieces.get(att.parentPieceId)!;
      const parentPort = PIECE_DEFS_BY_TYPE[parent.type].ports.find((p) => p.id === att.parentPortId)!;
      const childPort = PIECE_DEFS_BY_TYPE[mirrorType].ports.find((p) => p.id === att.childPortId)!;
      const parentWorldPos = applyTransform(parent.transform, parentPort);
      const parentWorldHeadingDeg = worldHeading(parent.transform, parentPort.headingDeg);
      piece.transform = solveChildTransform(parentWorldPos, parentWorldHeadingDeg, childPort, childPort.headingDeg);
    }

    this.recomputeDescendantTransforms(id);
  }

  private recomputeDescendantTransforms(parentId: string): void {
    for (const childId of this.childrenOf.get(parentId) ?? []) {
      const att = this.attachmentsByChild.get(childId)!;
      const parent = this.pieces.get(parentId)!;
      const child = this.pieces.get(childId)!;
      const parentPort = PIECE_DEFS_BY_TYPE[parent.type].ports.find((p) => p.id === att.parentPortId)!;
      const childPort = PIECE_DEFS_BY_TYPE[child.type].ports.find((p) => p.id === att.childPortId)!;
      const parentWorldPos = applyTransform(parent.transform, parentPort);
      const parentWorldHeadingDeg = worldHeading(parent.transform, parentPort.headingDeg);
      child.transform = solveChildTransform(parentWorldPos, parentWorldHeadingDeg, childPort, childPort.headingDeg);
      this.recomputeDescendantTransforms(childId);
    }
  }

  private removeSubtree(id: string): void {
    const kids = this.childrenOf.get(id) ?? [];
    for (const k of [...kids]) this.removeSubtree(k);

    this.pieces.delete(id);
    this.order = this.order.filter((x) => x !== id);
    this.childrenOf.delete(id);

    const att = this.attachmentsByChild.get(id);
    if (att) {
      this.attachmentsByChild.delete(id);
      const parentKids = this.childrenOf.get(att.parentPieceId);
      if (parentKids) {
        this.childrenOf.set(
          att.parentPieceId,
          parentKids.filter((x) => x !== id)
        );
      }
    }
  }

  // Detaches a root piece's direct children into independent roots of
  // their own, at exactly the world position/heading they already had —
  // nothing about them is recomputed or moved. Used by deletePiece so that
  // removing a root doesn't take the rest of the layout with it.
  private detachChildrenAsRoots(id: string): void {
    for (const childId of this.childrenOf.get(id) ?? []) {
      this.attachmentsByChild.delete(childId);
    }
    this.childrenOf.set(id, []);
  }

  // Deletes a piece. If it's a root (nothing attached above it), whatever
  // was built on top of it survives as newly-independent roots instead of
  // being deleted too — see detachChildrenAsRoots. A non-root piece still
  // takes everything downstream of it with it: those pieces' positions
  // were solved relative to it specifically and have no other parent to
  // hang from.
  deletePiece(id: string): void {
    if (!this.attachmentsByChild.has(id)) this.detachChildrenAsRoots(id);
    this.removeSubtree(id);
  }

  // Deletes the most recently placed piece. Always a leaf (nothing can have
  // been attached to a piece that didn't exist yet), so this never cascades.
  deleteLast(): void {
    const last = this.order[this.order.length - 1];
    if (last) this.removeSubtree(last);
  }

  hasChildren(id: string): boolean {
    return (this.childrenOf.get(id)?.length ?? 0) > 0;
  }

  occupiedPortKeys(): Set<string> {
    const set = new Set<string>();
    for (const att of this.attachmentsByChild.values()) {
      set.add(occupiedKey(att.childPieceId, att.childPortId));
      set.add(occupiedKey(att.parentPieceId, att.parentPortId));
    }
    return set;
  }

  freePorts(): FreePortInfo[] {
    const occupied = this.occupiedPortKeys();
    const result: FreePortInfo[] = [];
    for (const piece of this.pieces.values()) {
      const def = PIECE_DEFS_BY_TYPE[piece.type];
      for (const port of def.ports) {
        if (occupied.has(occupiedKey(piece.id, port.id))) continue;
        result.push({
          pieceId: piece.id,
          port,
          worldPos: applyTransform(piece.transform, port),
          worldHeadingDeg: worldHeading(piece.transform, port.headingDeg),
        });
      }
    }
    return result;
  }

  bom(): { type: string; label: string; count: number }[] {
    const counts = new Map<string, number>();
    for (const piece of this.pieces.values()) {
      counts.set(piece.type, (counts.get(piece.type) ?? 0) + 1);
    }
    return [...counts.entries()].map(([type, count]) => ({
      type,
      label: PIECE_DEFS_BY_TYPE[type].label,
      count,
    }));
  }

  // A loop is "closed" when two free ports of opposite gender land near
  // each other facing opposite directions. Real BRIO track flexes a couple
  // of mm at its Vario joins, so this is deliberately generous and reports
  // the gap rather than rejecting anything.
  detectClosures(): ClosurePair[] {
    const posTol = spec.loopClosure.positionToleranceMm.value;
    const headTol = spec.loopClosure.headingToleranceDeg.value;
    const free = this.freePorts();
    const pairs: ClosurePair[] = [];
    for (let i = 0; i < free.length; i++) {
      for (let j = i + 1; j < free.length; j++) {
        const a = free[i];
        const b = free[j];
        if (a.pieceId === b.pieceId) continue;
        if (a.port.gender === b.port.gender) continue;
        const gap = distance(a.worldPos, b.worldPos);
        if (gap > posTol) continue;
        const oppositeOfB = normalizeDeg(b.worldHeadingDeg + 180);
        if (angleDiffDeg(a.worldHeadingDeg, oppositeOfB) > headTol) continue;
        pairs.push({ a, b, gapMm: gap });
      }
    }
    return pairs;
  }

  serialize(): SerializedLayout {
    const actions: SerializedAction[] = this.order.map((id) => {
      const piece = this.pieces.get(id)!;
      const att = this.attachmentsByChild.get(id);
      if (!att) return { id, type: piece.type, rootTransform: piece.transform };
      return {
        id,
        type: piece.type,
        parent: { pieceId: att.parentPieceId, portId: att.parentPortId },
        childPortId: att.childPortId,
      };
    });
    return { version: 1, actions };
  }

  static fromSerialized(data: SerializedLayout): LayoutGraph {
    const graph = new LayoutGraph();
    for (const action of data.actions) {
      if (!action.parent) {
        graph.placeRoot(action.type, action.id, action.rootTransform);
      } else {
        graph.attach(action.parent.pieceId, action.parent.portId, action.type, action.childPortId!, action.id);
      }
    }
    return graph;
  }
}
