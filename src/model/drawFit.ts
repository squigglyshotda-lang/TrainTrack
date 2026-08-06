// Draw-a-shape: given a starting free port and a freehand-drawn path (raw
// pointer points in world mm), greedily march the same piece alphabet
// auto-join uses along the path, picking at each step whichever piece
// lands closest (position + heading) to where the drawn path actually
// goes. This is a curve-fit, not a search for an exact match — a freehand
// line never lands on an exact combination of discrete piece lengths and
// angles, so the goal is the best reasonable approximation, with an honest
// stopping point (not a forced bad fit) when the path does something no
// piece here can follow.
import { ROUTE_PIECE_TYPES, applyMove } from "./autoJoin";
import type { RoutePort } from "./autoJoin";
import { angleDiffDeg, distance, normalizeDeg } from "./geometry";
import type { Point } from "./geometry";

// The peg-peg connectors (dogbone, pegCoupler) only make sense as
// gender-flip tools for closing onto a fixed target port (see autoJoin) —
// there's no target here, just an open-ended path to follow, so they're
// excluded from the alphabet.
const SIMPLE_PIECE_TYPES = ROUTE_PIECE_TYPES.filter((t) => t !== "dogbone" && t !== "pegCoupler");

const SAMPLE_SPACING_MM = 4;
const TANGENT_WINDOW_MM = 10;
const MAX_PIECES = 40;
const POS_COST_WEIGHT = 1;
const HEADING_COST_WEIGHT_PER_DEG = 0.4;
// Beyond this combined cost, no piece in the alphabet is a good enough
// match for what the path does next — stop rather than force a bad fit.
const REJECT_THRESHOLD_MM = 20;
// Once less than this much drawn path remains, further pieces would be
// forcing fit onto a sliver too short to mean anything.
const MIN_REMAINING_MM = 15;

interface ResampledPath {
  points: Point[];
  arcLengths: number[]; // same length as points, monotonically increasing, mm
  totalLengthMm: number;
}

function resamplePath(raw: Point[], spacingMm: number): ResampledPath {
  if (raw.length === 0) return { points: [], arcLengths: [], totalLengthMm: 0 };
  if (raw.length === 1) return { points: [raw[0]], arcLengths: [0], totalLengthMm: 0 };

  const cum: number[] = [0];
  for (let i = 1; i < raw.length; i++) cum.push(cum[i - 1] + distance(raw[i - 1], raw[i]));
  const total = cum[cum.length - 1];
  if (total < 1e-6) return { points: [raw[0]], arcLengths: [0], totalLengthMm: 0 };

  const points: Point[] = [];
  const arcLengths: number[] = [];
  let segIdx = 0;
  for (let s = 0; s < total; s += spacingMm) {
    while (segIdx < cum.length - 2 && cum[segIdx + 1] < s) segIdx++;
    const segStart = cum[segIdx];
    const segEnd = cum[segIdx + 1];
    const t = segEnd > segStart ? (s - segStart) / (segEnd - segStart) : 0;
    const a = raw[segIdx];
    const b = raw[segIdx + 1];
    points.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
    arcLengths.push(s);
  }
  points.push(raw[raw.length - 1]);
  arcLengths.push(total);

  return { points, arcLengths, totalLengthMm: total };
}

function pointAtArcLength(path: ResampledPath, s: number): Point {
  const { points, arcLengths, totalLengthMm } = path;
  if (points.length === 1) return points[0];
  const clamped = Math.max(0, Math.min(totalLengthMm, s));
  for (let i = 1; i < arcLengths.length; i++) {
    if (arcLengths[i] >= clamped) {
      const s0 = arcLengths[i - 1];
      const s1 = arcLengths[i];
      const t = s1 > s0 ? (clamped - s0) / (s1 - s0) : 0;
      const a = points[i - 1];
      const b = points[i];
      return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
    }
  }
  return points[points.length - 1];
}

function tangentHeadingAtArcLength(path: ResampledPath, s: number, windowMm: number): number {
  const half = windowMm / 2;
  const p0 = pointAtArcLength(path, s - half);
  const p1 = pointAtArcLength(path, s + half);
  const dx = p1.x - p0.x;
  const dy = p1.y - p0.y;
  if (Math.abs(dx) < 1e-9 && Math.abs(dy) < 1e-9) return 0;
  return normalizeDeg((Math.atan2(dy, dx) * 180) / Math.PI);
}

// Snaps the march cursor to whichever point on the path a just-placed
// piece's end actually landed nearest to, rather than assuming it advanced
// by exactly its own chord length — keeps tracking honest when a piece
// over- or under-shoots the drawn line. A small amount of backward slack is
// allowed (the piece can land slightly "behind" where it aimed) but the
// cursor is not allowed to leap far backward, which would otherwise happen
// if the drawn path loops back near an earlier point.
function nearestArcLength(path: ResampledPath, pos: Point, fromS: number, backSlackMm = 10): number {
  let bestS = fromS;
  let bestDist = Infinity;
  for (let i = 0; i < path.points.length; i++) {
    const s = path.arcLengths[i];
    if (s < fromS - backSlackMm) continue;
    const d = distance(path.points[i], pos);
    if (d < bestDist) {
      bestDist = d;
      bestS = s;
    }
  }
  return bestS;
}

export interface DrawFitResult {
  pieceTypes: string[];
  pathUsedMm: number;
  totalPathMm: number;
  // true if the drawn path had more to it than the pieces could follow
  // (either a shape no piece approximates well, or the MAX_PIECES cap).
  stoppedEarly: boolean;
}

// Greedily marches from `start` (an exact port position/heading/gender)
// along the drawn path, choosing at each step whichever simple piece's
// resulting position + heading best matches where the path goes next.
export function fitDrawnPath(start: RoutePort, rawPoints: Point[]): DrawFitResult {
  const path = resamplePath(rawPoints, SAMPLE_SPACING_MM);
  const total = path.totalLengthMm;
  if (total < MIN_REMAINING_MM) {
    return { pieceTypes: [], pathUsedMm: 0, totalPathMm: total, stoppedEarly: true };
  }

  let state = start;
  let s = 0;
  const pieceTypes: string[] = [];
  let stoppedEarly = false;

  while (pieceTypes.length < MAX_PIECES) {
    if (total - s < MIN_REMAINING_MM) break;

    let best: { pieceType: string; newState: RoutePort; cost: number } | null = null;
    for (const pieceType of SIMPLE_PIECE_TYPES) {
      const newState = applyMove(state, pieceType);
      if (!newState) continue;
      const reach = distance(state.pos, newState.pos);
      const lookaheadS = Math.min(total, s + reach);
      const lookaheadPoint = pointAtArcLength(path, lookaheadS);
      const tangentHeading = tangentHeadingAtArcLength(path, lookaheadS, TANGENT_WINDOW_MM);
      const posCost = distance(newState.pos, lookaheadPoint);
      const headCost = angleDiffDeg(newState.headingDeg, tangentHeading);
      const cost = POS_COST_WEIGHT * posCost + HEADING_COST_WEIGHT_PER_DEG * headCost;
      if (!best || cost < best.cost) {
        best = { pieceType, newState, cost };
      }
    }

    if (!best || best.cost > REJECT_THRESHOLD_MM) {
      stoppedEarly = true;
      break;
    }

    pieceTypes.push(best.pieceType);
    state = best.newState;
    const newS = nearestArcLength(path, state.pos, s);
    s = Math.max(s, newS);
  }

  if (pieceTypes.length >= MAX_PIECES) stoppedEarly = true;

  return { pieceTypes, pathUsedMm: s, totalPathMm: total, stoppedEarly };
}
