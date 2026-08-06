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
import { curveArcPoint, curveArcEndpoint } from "../model/geometry";
import type { Point } from "../model/geometry";
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
  curveLike(
    "curve45Mirror",
    "45° Curve (opposite hand)",
    "Curve 45° (mirror)",
    spec.pieces.curve45.radiusMm.value,
    -spec.pieces.curve45.angleDeg.value
  ),
  switchY(),
  crossing4(),
];

export const PIECE_DEFS_BY_TYPE: Record<string, PieceDef> = Object.fromEntries(
  PIECE_DEFS.map((def) => [def.type, def])
);
