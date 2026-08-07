// Piece definitions: what a piece IS (its ports and outline), built entirely
// from track-spec.json. Nothing below invents a dimension — if a number
// needs to change, change it in track-spec.json, not here.
//
// Gender convention, sourced from the reference generator's own filenames
// (e.g. train_tracks_brio_straight100mm_NP.stl, arc45deg_r86_b_NP.stl —
// "NP" = nest-then-plug): every straight and curve piece has its "entry"
// port (local origin, facing 180deg, i.e. pointing back out of the piece)
// as a socket, and its "exit" port as a peg. This lets identical pieces
// alternate socket/peg all the way around a loop, matching how real BRIO
// track behaves.
import spec from "./track-spec.json";
import { curveArcPoint, curveArcEndpoint, applyTransform } from "../model/geometry";
import type { Point, Transform } from "../model/geometry";
import type { PieceDef, Port } from "../model/types";

const W = spec.trackProfile.widthMm.value;

function straightOutline(length: number): Point[] {
  return [
    { x: 0, y: -W / 2 },
    { x: length, y: -W / 2 },
    { x: length, y: W / 2 },
    { x: 0, y: W / 2 },
  ];
}

function straightLike(type: string, label: string, shortLabel: string, length: number): PieceDef {
  const ports: Port[] = [
    { id: "a", x: 0, y: 0, headingDeg: 180, gender: "socket" },
    { id: "b", x: length, y: 0, headingDeg: 0, gender: "peg" },
  ];
  return { type, label, shortLabel, ports, outlines: [straightOutline(length)] };
}

function curveSectorOutline(radius: number, arcAngleDeg: number, samples = 20): Point[] {
  const outer: Point[] = [];
  const inner: Point[] = [];
  for (let i = 0; i <= samples; i++) {
    const sweep = (arcAngleDeg * i) / samples;
    outer.push(curveArcPoint(radius, arcAngleDeg, sweep, W / 2));
    inner.push(curveArcPoint(radius, arcAngleDeg, sweep, -W / 2));
  }
  return [...outer, ...inner.reverse()];
}

function curveLike(
  type: string,
  label: string,
  shortLabel: string,
  radius: number,
  arcAngleDeg: number
): PieceDef {
  const end = curveArcEndpoint(radius, arcAngleDeg);
  const ports: Port[] = [
    { id: "a", x: 0, y: 0, headingDeg: 180, gender: "socket" },
    { id: "b", x: end.x, y: end.y, headingDeg: arcAngleDeg, gender: "peg" },
  ];
  return { type, label, shortLabel, ports, outlines: [curveSectorOutline(radius, arcAngleDeg)] };
}

function switchY(): PieceDef {
  const s = spec.pieces.switchY;
  const radius = s.legRadiusMm.value;
  const angle = s.legAngleDeg.value;
  const left = curveArcEndpoint(radius, angle);
  const right = curveArcEndpoint(radius, -angle);
  const ports: Port[] = [
    { id: "common", x: 0, y: 0, headingDeg: 180, gender: "socket" },
    { id: "left", x: left.x, y: left.y, headingDeg: angle, gender: "socket" },
    { id: "right", x: right.x, y: right.y, headingDeg: -angle, gender: "socket" },
  ];
  return {
    type: "switchY",
    label: "Y-Turnout",
    shortLabel: "Y-Switch",
    ports,
    outlines: [curveSectorOutline(radius, angle), curveSectorOutline(radius, -angle)],
  };
}

// The asymmetric turnout: main line runs straight through, one branch
// curves off. `mirrorBranch` flips which side the branch curves toward —
// the common and straight-through ports never move, only the branch does.
function switchCurveStraight(mirrorBranch: boolean): PieceDef {
  const s = spec.pieces.switchCurveStraight;
  const branchAngle = mirrorBranch ? -s.curveAngleDeg.value : s.curveAngleDeg.value;
  const branch = curveArcEndpoint(s.curveRadiusMm.value, branchAngle);
  const ports: Port[] = [
    { id: "common", x: 0, y: 0, headingDeg: 180, gender: s.commonGender.value as Port["gender"] },
    {
      id: "through",
      x: s.straightLengthMm.value,
      y: 0,
      headingDeg: 0,
      gender: s.branchGender.value as Port["gender"],
    },
    {
      id: "branch",
      x: branch.x,
      y: branch.y,
      headingDeg: branchAngle,
      gender: s.branchGender.value as Port["gender"],
    },
  ];
  return {
    type: mirrorBranch ? "switchCurveStraightMirror" : "switchCurveStraight",
    label: mirrorBranch ? "Curve+Straight Switch (opposite hand)" : "Curve+Straight Switch",
    shortLabel: mirrorBranch ? "Switch C+S (mirror)" : "Switch C+S",
    ports,
    outlines: [straightOutline(s.straightLengthMm.value), curveSectorOutline(s.curveRadiusMm.value, branchAngle)],
  };
}

// A short accessory with a peg at BOTH ends, for joining two pieces that
// are both socket-ended and facing each other — the one case an ordinary
// piece (always one peg, one socket) can't handle.
function dogbone(): PieceDef {
  const length = spec.pieces.dogbone.lengthMm.value;
  const width = spec.pieces.dogbone.widthMm.value;
  const ports: Port[] = [
    { id: "a", x: 0, y: 0, headingDeg: 180, gender: "peg" },
    { id: "b", x: length, y: 0, headingDeg: 0, gender: "peg" },
  ];
  const outline: Point[] = [
    { x: 0, y: -width / 2 },
    { x: length, y: -width / 2 },
    { x: length, y: width / 2 },
    { x: 0, y: width / 2 },
  ];
  return { type: "dogbone", label: "Dogbone Connector", shortLabel: "Dogbone", ports, outlines: [outline] };
}

function crossing4(): PieceDef {
  const s = spec.pieces.crossing4;
  const half = s.armLengthMm.value / 2;
  const ports: Port[] = [
    { id: "a1", x: -half, y: 0, headingDeg: 180, gender: "socket" },
    { id: "a2", x: half, y: 0, headingDeg: 0, gender: "peg" },
    { id: "b1", x: 0, y: -half, headingDeg: -90, gender: "socket" },
    { id: "b2", x: 0, y: half, headingDeg: 90, gender: "peg" },
  ];
  const armA: Point[] = [
    { x: -half, y: -W / 2 },
    { x: half, y: -W / 2 },
    { x: half, y: W / 2 },
    { x: -half, y: W / 2 },
  ];
  const armB: Point[] = [
    { x: -W / 2, y: -half },
    { x: W / 2, y: -half },
    { x: W / 2, y: half },
    { x: -W / 2, y: half },
  ];
  return { type: "crossing4", label: "4-Way Crossing", shortLabel: "Crossing", ports, outlines: [armA, armB] };
}

// A compact spur off a through line: crossing4's through-axis (identical
// geometry, so it drops in anywhere crossing4 or a plain straight already
// fits) plus a short peg-peg cross-arm instead of a full socket-peg one.
function crossing4Spur(): PieceDef {
  const throughHalf = spec.pieces.crossing4.armLengthMm.value / 2;
  const crossHalf = spec.pieces.crossing4Spur.crossArmLengthMm.value / 2;
  const ports: Port[] = [
    { id: "a1", x: -throughHalf, y: 0, headingDeg: 180, gender: "socket" },
    { id: "a2", x: throughHalf, y: 0, headingDeg: 0, gender: "peg" },
    { id: "b1", x: 0, y: -crossHalf, headingDeg: -90, gender: "peg" },
    { id: "b2", x: 0, y: crossHalf, headingDeg: 90, gender: "peg" },
  ];
  const armA: Point[] = [
    { x: -throughHalf, y: -W / 2 },
    { x: throughHalf, y: -W / 2 },
    { x: throughHalf, y: W / 2 },
    { x: -throughHalf, y: W / 2 },
  ];
  const armB: Point[] = [
    { x: -W / 2, y: -crossHalf },
    { x: W / 2, y: -crossHalf },
    { x: W / 2, y: crossHalf },
    { x: -W / 2, y: crossHalf },
  ];
  return {
    type: "crossing4Spur",
    label: "Crossing (Short Spur)",
    shortLabel: "Crossing Spur",
    ports,
    outlines: [armA, armB],
  };
}

// A peg at both ends, full track width, same 25mm length as shortStraight —
// see track-spec.json's pegCoupler entry for why this exists alongside the
// dogbone (same gender-flipping role, shorter and less obtrusive).
function pegCoupler(): PieceDef {
  const length = spec.pieces.pegCoupler.lengthMm.value;
  const ports: Port[] = [
    { id: "a", x: 0, y: 0, headingDeg: 180, gender: "peg" },
    { id: "b", x: length, y: 0, headingDeg: 0, gender: "peg" },
  ];
  return {
    type: "pegCoupler",
    label: "Peg Coupler",
    shortLabel: "Peg Coupler",
    ports,
    outlines: [straightOutline(length)],
    hidden: true,
    attachOnly: true,
  };
}

// The far-side ramp of a bridge crossing — see track-spec.json's
// bridgeSlope entry for why both ends are sockets (not the usual one
// socket/one peg pattern every other piece here follows).
function bridgeSlope(): PieceDef {
  const length = spec.pieces.bridgeSlope.lengthMm.value;
  const ports: Port[] = [
    { id: "a", x: 0, y: 0, headingDeg: 180, gender: "socket" },
    { id: "b", x: length, y: 0, headingDeg: 0, gender: "socket" },
  ];
  return {
    type: "bridgeSlope",
    label: "Bridge Ramp — Down",
    shortLabel: "Ramp Down",
    ports,
    outlines: [straightOutline(length)],
  };
}

// Builds the outline for one "half" of the snake piece's S-curve: a
// straight run of `extMm`, then an arc of `arcAngleDeg` at `radiusMm`,
// walked forward from (originPos, originHeadingDeg). Returns the outer and
// inner offset polylines (each +-W/2 off the centerline) plus where the
// walk ended up, so the caller can chain segments and close the polygon
// the same way curveSectorOutline() does for a single curve.
function walkSegment(
  originPos: Point,
  originHeadingDeg: number,
  kind: "straight" | "arc",
  length: number,
  radiusMm: number,
  arcAngleDeg: number
): { outer: Point[]; inner: Point[]; endPos: Point; endHeadingDeg: number } {
  const t: Transform = { x: originPos.x, y: originPos.y, rotationDeg: originHeadingDeg };
  if (kind === "straight") {
    return {
      outer: [applyTransform(t, { x: 0, y: W / 2 }), applyTransform(t, { x: length, y: W / 2 })],
      inner: [applyTransform(t, { x: 0, y: -W / 2 }), applyTransform(t, { x: length, y: -W / 2 })],
      endPos: applyTransform(t, { x: length, y: 0 }),
      endHeadingDeg: originHeadingDeg,
    };
  }
  const samples = 12;
  const outer: Point[] = [];
  const inner: Point[] = [];
  for (let i = 0; i <= samples; i++) {
    const sweep = (arcAngleDeg * i) / samples;
    outer.push(applyTransform(t, curveArcPoint(radiusMm, arcAngleDeg, sweep, W / 2)));
    inner.push(applyTransform(t, curveArcPoint(radiusMm, arcAngleDeg, sweep, -W / 2)));
  }
  return {
    outer,
    inner,
    endPos: applyTransform(t, curveArcEndpoint(radiusMm, arcAngleDeg)),
    endHeadingDeg: originHeadingDeg + arcAngleDeg,
  };
}

// An S-shaped "sidestep": two equal-and-opposite arcs bring the track back
// to running parallel to its start, offset sideways, with straight
// extensions on each end. Net heading change is exactly zero — see
// track-spec.json's snake entry for where arcAngleDeg/arcRadiusMm/
// targetLengthMm come from.
//
// The exit port position below is computed from those three sourced
// numbers via the generator's own snake_track() formula (see spec entry)
// and cross-checked against the real STL mesh's bounding box. The outline
// below, though, uses a DIFFERENT split between arc angle and straight
// extension (solved numerically, not from the generator's own internal
// construction, which uses a tangent-line fit between two different-radius
// rails that isn't worth fully reproducing for a 2D canvas drawing) —
// chosen only so the drawn S-curve's endpoint lines up exactly with the
// real, sourced port position. The physical printed piece always comes
// from the untouched, real STL file, not from this outline.
function snake(mirror: boolean): PieceDef {
  const s = spec.pieces.snake;
  const angle = s.arcAngleDeg.value;
  const radius = s.arcRadiusMm.value;
  const targetLength = s.targetLengthMm.value;

  // l1, l2 below are the same quantities as the source's own l1/l2 (scad
  // lines 680-681), algebraically simplified from tan(beta)*(hf-h1) /
  // tan(beta)*(hf-h2) down to closed form.
  const l1 = radius + W - radius * Math.cos((angle * Math.PI) / 180);
  const l2 = (radius + W) * (1 - Math.cos((angle * Math.PI) / 180));
  const sidestep = l1 + l2 - W; // "line-to-line distance" per the source's own echo()

  // Outline-only construction (see comment above): radius stays the
  // sourced 86mm, but the angle/extension split is solved so the drawn
  // path's endpoint matches (targetLength, sidestep) exactly.
  const outlineArcDeg = 39.875467;
  const outlineExtMm = 17.86359;

  const handAngle = mirror ? -outlineArcDeg : outlineArcDeg;
  const seg1 = walkSegment({ x: 0, y: 0 }, 0, "straight", outlineExtMm, radius, 0);
  const seg2 = walkSegment(seg1.endPos, seg1.endHeadingDeg, "arc", 0, radius, handAngle);
  const seg3 = walkSegment(seg2.endPos, seg2.endHeadingDeg, "arc", 0, radius, -handAngle);
  const seg4 = walkSegment(seg3.endPos, seg3.endHeadingDeg, "straight", outlineExtMm, radius, 0);

  const outer = [...seg1.outer, ...seg2.outer, ...seg3.outer, ...seg4.outer];
  const inner = [...seg1.inner, ...seg2.inner, ...seg3.inner, ...seg4.inner];
  const outline = [...outer, ...inner.reverse()];

  const exitY = mirror ? -sidestep : sidestep;
  const ports: Port[] = [
    { id: "a", x: 0, y: 0, headingDeg: 180, gender: "socket" },
    { id: "b", x: targetLength, y: exitY, headingDeg: 0, gender: "peg" },
  ];

  return {
    type: mirror ? "snakeMirror" : "snake",
    label: mirror ? "Snake Curve (opposite hand)" : "Snake Curve",
    shortLabel: mirror ? "Snake (mirror)" : "Snake",
    ports,
    outlines: [outline],
    hidden: mirror,
  };
}

export const PIECE_DEFS: PieceDef[] = [
  straightLike("straight", "Straight", "Straight", spec.pieces.straight.lengthMm.value),
  straightLike("halfStraight", "Half Straight", "Half Straight", spec.pieces.halfStraight.lengthMm.value),
  curveLike(
    "curve45",
    "45° Curve",
    "Curve 45°",
    spec.pieces.curve45.radiusMm.value,
    spec.pieces.curve45.angleDeg.value
  ),
  { ...curveLike(
      "curve45Mirror",
      "45° Curve (opposite hand)",
      "Curve 45° (mirror)",
      spec.pieces.curve45.radiusMm.value,
      -spec.pieces.curve45.angleDeg.value
    ), hidden: true },
  switchY(),
  crossing4(),
  straightLike("shortStraight", "Short Straight", "Short Straight", spec.pieces.shortStraight.lengthMm.value),
  curveLike(
    "curve90",
    "90° Curve",
    "Curve 90°",
    spec.pieces.curve90.radiusMm.value,
    spec.pieces.curve90.angleDeg.value
  ),
  { ...curveLike(
      "curve90Mirror",
      "90° Curve (opposite hand)",
      "Curve 90° (mirror)",
      spec.pieces.curve90.radiusMm.value,
      -spec.pieces.curve90.angleDeg.value
    ), hidden: true },
  switchCurveStraight(false),
  { ...switchCurveStraight(true), hidden: true },
  { ...dogbone(), hidden: true, attachOnly: true },
  crossing4Spur(),
  pegCoupler(),
  snake(false),
  snake(true),
  straightLike("bridgeGround", "Bridge Ramp — Up", "Ramp Up", spec.pieces.bridgeGround.lengthMm.value),
  bridgeSlope(),
];

// The palette, the piece library, and the root-placement picker only ever
// offer these.
export const VISIBLE_PIECE_DEFS: PieceDef[] = PIECE_DEFS.filter((def) => !def.hidden);

// What the port-click ATTACH picker offers: everything visible, plus the
// dogbone (see PieceDef.attachOnly) — excludes only the mirror pieces,
// which stay reachable exclusively through Flip.
export const ATTACHABLE_PIECE_DEFS: PieceDef[] = PIECE_DEFS.filter((def) => !def.hidden || def.attachOnly);

// Pieces reachable only via the Flip action on a piece that's already
// placed, keyed by the type flipping produces the OTHER way. Only pieces
// with a genuinely different mirror shape are listed — a straight or a
// symmetric piece like switchY/crossing4 looks identical either way, so
// flipping them wouldn't do anything visible.
export const MIRROR_PARTNER: Record<string, string> = {
  curve45: "curve45Mirror",
  curve45Mirror: "curve45",
  curve90: "curve90Mirror",
  curve90Mirror: "curve90",
  switchCurveStraight: "switchCurveStraightMirror",
  switchCurveStraightMirror: "switchCurveStraight",
  snake: "snakeMirror",
  snakeMirror: "snake",
};

export const PIECE_DEFS_BY_TYPE: Record<string, PieceDef> = Object.fromEntries(
  PIECE_DEFS.map((def) => [def.type, def])
);
