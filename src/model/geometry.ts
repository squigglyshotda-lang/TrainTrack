// Pure 2D math for the port-graph. Nothing here touches React or SVG directly.

export interface Point {
  x: number;
  y: number;
}

export interface Transform {
  x: number;
  y: number;
  rotationDeg: number;
}

const degToRad = (deg: number) => (deg * Math.PI) / 180;

export function normalizeDeg(deg: number): number {
  let d = deg % 360;
  if (d < 0) d += 360;
  return d;
}

// Smallest absolute difference between two headings, 0-180.
export function angleDiffDeg(a: number, b: number): number {
  const d = Math.abs(normalizeDeg(a) - normalizeDeg(b)) % 360;
  return d > 180 ? 360 - d : d;
}

export function rotatePoint(p: Point, deg: number): Point {
  const r = degToRad(deg);
  const cos = Math.cos(r);
  const sin = Math.sin(r);
  return { x: p.x * cos - p.y * sin, y: p.x * sin + p.y * cos };
}

export function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function applyTransform(t: Transform, p: Point): Point {
  const rotated = rotatePoint(p, t.rotationDeg);
  return { x: rotated.x + t.x, y: rotated.y + t.y };
}

export function worldHeading(t: Transform, localHeadingDeg: number): number {
  return normalizeDeg(t.rotationDeg + localHeadingDeg);
}

// The core placement rule: given a parent's port in world space (position +
// heading) and the local port on the piece we're attaching, solve for the
// rigid transform (rotation + translation) that makes the child's port land
// exactly on the parent's port, facing the opposite direction.
export function solveChildTransform(
  parentWorldPos: Point,
  parentWorldHeadingDeg: number,
  childLocalPort: Point,
  childLocalHeadingDeg: number
): Transform {
  const rotationDeg = normalizeDeg(parentWorldHeadingDeg + 180 - childLocalHeadingDeg);
  const rotatedChildPort = rotatePoint(childLocalPort, rotationDeg);
  return {
    x: parentWorldPos.x - rotatedChildPort.x,
    y: parentWorldPos.y - rotatedChildPort.y,
    rotationDeg,
  };
}

// Point on a piece's curved centerline. Every curved piece is modeled as
// starting at local origin (0,0) with its "entry" connector facing 180deg
// (pointing back out of the piece, same convention as a straight's start
// port). `arcAngleDeg` is the piece's total turn (positive = one hand,
// negative = the other). `sweepDeg` walks from 0 (the start) to arcAngleDeg
// (the end). `radialOffset` moves perpendicular to the centerline, used to
// build the piece's outline (+-half the track width).
export function curveArcPoint(
  radius: number,
  arcAngleDeg: number,
  sweepDeg: number,
  radialOffset: number
): Point {
  const centerY = arcAngleDeg >= 0 ? radius : -radius;
  const startParamDeg = arcAngleDeg >= 0 ? -90 : 90;
  const paramDeg = startParamDeg + sweepDeg;
  const r = radius + radialOffset;
  const rad = degToRad(paramDeg);
  return { x: r * Math.cos(rad), y: centerY + r * Math.sin(rad) };
}

export function curveArcEndpoint(radius: number, arcAngleDeg: number): Point {
  return curveArcPoint(radius, arcAngleDeg, arcAngleDeg, 0);
}
