// Auto-join: given two free ports, search for a sequence of pieces that
// connects one to the other. This is a real search problem, not a
// shortcut — most pairs of ports don't have an exact solution (the piece
// "alphabet" only offers a handful of discrete lengths and turn angles),
// so this looks for the shortest sequence that lands within the same
// closure tolerance the rest of the app already uses, and says plainly
// when nothing was found rather than forcing a bad match.
import { PIECE_DEFS_BY_TYPE } from "../data/pieceDefs";
import spec from "../data/track-spec.json";
import { applyTransform, angleDiffDeg, distance, normalizeDeg, solveChildTransform, worldHeading } from "./geometry";
import type { Point } from "./geometry";
import type { Gender } from "./types";
import type { LayoutGraph } from "./graph";

// Deliberately just the simple 2-port pieces, plus the hidden dogbone
// (which only ever gets chosen when it's the sole way to bridge two
// sockets — see the gender note below). Multi-port pieces don't make
// sense for a single point-to-point connector.
const ROUTE_PIECE_TYPES = [
  "straight",
  "halfStraight",
  "shortStraight",
  "curve45",
  "curve45Mirror",
  "curve90",
  "curve90Mirror",
  "dogbone",
];

export interface RoutePort {
  pos: Point;
  headingDeg: number;
  gender: Gender;
}

export interface JoinResult {
  pieceTypes: string[]; // empty = the two ports already close directly
  gapMm: number;
}

const POS_TOL = spec.loopClosure.positionToleranceMm.value;
const HEAD_TOL = spec.loopClosure.headingToleranceDeg.value;

// Quantization for the visited-state set. Coarser than the closure
// tolerance would allow duplicate/near-duplicate states to collapse
// together and miss valid solutions; this is deliberately tighter than
// POS_TOL/HEAD_TOL so it never masks a real path.
const QUANT_POS_MM = 1.5;
const QUANT_HEAD_DEG = 1.5;

function isCloseEnough(state: RoutePort, target: RoutePort): boolean {
  if (state.gender === target.gender) return false;
  if (distance(state.pos, target.pos) > POS_TOL) return false;
  const oppositeOfTarget = normalizeDeg(target.headingDeg + 180);
  return angleDiffDeg(state.headingDeg, oppositeOfTarget) <= HEAD_TOL;
}

function stateKey(state: RoutePort): string {
  const qx = Math.round(state.pos.x / QUANT_POS_MM);
  const qy = Math.round(state.pos.y / QUANT_POS_MM);
  const qh = Math.round(normalizeDeg(state.headingDeg) / QUANT_HEAD_DEG);
  return `${qx}:${qy}:${qh}:${state.gender}`;
}

// Advances the frontier by one piece: finds whichever of the piece's ports
// offers the opposite gender (attaches there), and returns the piece's
// other port as the new frontier. Returns null if the piece has no
// compatible port at all (only happens for the dogbone against a peg
// frontier — it has no socket to offer).
function applyMove(state: RoutePort, pieceType: string): RoutePort | null {
  const def = PIECE_DEFS_BY_TYPE[pieceType];
  const attachPort = def.ports.find((p) => p.gender !== state.gender);
  if (!attachPort) return null;
  const otherPort = def.ports.find((p) => p.id !== attachPort.id)!;
  const transform = solveChildTransform(state.pos, state.headingDeg, attachPort, attachPort.headingDeg);
  return {
    pos: applyTransform(transform, otherPort),
    headingDeg: worldHeading(transform, otherPort.headingDeg),
    gender: otherPort.gender,
  };
}

interface SearchNode {
  state: RoutePort;
  path: string[];
}

// Breadth-first over piece sequences, so the first solution found is also
// the shortest one. State is deduplicated (quantized) so equivalent
// positions reached by different piece combinations aren't re-explored.
export function findJoinPath(start: RoutePort, target: RoutePort, maxDepth = 12, maxNodes = 150_000): JoinResult | null {
  if (isCloseEnough(start, target)) {
    return { pieceTypes: [], gapMm: distance(start.pos, target.pos) };
  }

  // A peg can only ever mate with a socket, and nothing in this piece set
  // flips a peg-facing frontier into anything else (the dogbone bridges
  // two sockets by offering peg-peg, but has no socket of its own to
  // accept a peg frontier). Two peg ends genuinely cannot be joined with
  // this piece library — that's physically true of real BRIO connectors
  // too, not just a search limitation, so this is worth detecting
  // up front rather than burning the search budget on it.
  if (start.gender === "peg" && target.gender === "peg") return null;

  let frontier: SearchNode[] = [{ state: start, path: [] }];
  const visited = new Set<string>([stateKey(start)]);
  let nodesExplored = 0;

  for (let depth = 0; depth < maxDepth; depth++) {
    const next: SearchNode[] = [];
    for (const node of frontier) {
      for (const pieceType of ROUTE_PIECE_TYPES) {
        nodesExplored++;
        if (nodesExplored > maxNodes) return null;

        const newState = applyMove(node.state, pieceType);
        if (!newState) continue;

        const newPath = [...node.path, pieceType];
        if (isCloseEnough(newState, target)) {
          return { pieceTypes: newPath, gapMm: distance(newState.pos, target.pos) };
        }

        const key = stateKey(newState);
        if (visited.has(key)) continue;
        visited.add(key);
        next.push({ state: newState, path: newPath });
      }
    }
    frontier = next;
    if (frontier.length === 0) break;
  }
  return null;
}

// Actually places a path findJoinPath found, piece by piece, through the
// graph's real attach() — same "find whichever port is opposite the
// current frontier's gender" logic applyMove used, so this reproduces the
// exact path the search verified, not a re-derivation of it.
export function placeJoinPath(
  graph: LayoutGraph,
  fromPieceId: string,
  fromPortId: string,
  pieceTypes: string[]
): void {
  let curPieceId = fromPieceId;
  let curPortId = fromPortId;
  for (const pieceType of pieceTypes) {
    const def = PIECE_DEFS_BY_TYPE[pieceType];
    const parentPiece = graph.pieces.get(curPieceId)!;
    const parentPort = PIECE_DEFS_BY_TYPE[parentPiece.type].ports.find((p) => p.id === curPortId)!;
    const attachPort = def.ports.find((p) => p.gender !== parentPort.gender)!;
    const otherPort = def.ports.find((p) => p.id !== attachPort.id)!;
    const placed = graph.attach(curPieceId, curPortId, pieceType, attachPort.id);
    curPieceId = placed.id;
    curPortId = otherPort.id;
  }
}
