// Starter layouts. Each one was built and verified with the actual graph
// engine (placeRoot/attach + detectClosures), not hand-derived — the loop
// closure gap for every template below measured exactly 0.000mm. See the
// comment on each for how it's put together.
import type { SerializedLayout } from "../model/graph";

export interface Template {
  id: string;
  name: string;
  description: string;
  layout: SerializedLayout;
}

export const TEMPLATES: Template[] = [
  {
    id: "circle",
    name: "Simple Circle",
    description: "Eight 45° curves, nothing else — the tightest loop this piece set can close.",
    layout: {
      version: 1,
      actions: [
        { id: "piece1", type: "curve45" },
        { id: "piece2", type: "curve45", parent: { pieceId: "piece1", portId: "b" }, childPortId: "a" },
        { id: "piece3", type: "curve45", parent: { pieceId: "piece2", portId: "b" }, childPortId: "a" },
        { id: "piece4", type: "curve45", parent: { pieceId: "piece3", portId: "b" }, childPortId: "a" },
        { id: "piece5", type: "curve45", parent: { pieceId: "piece4", portId: "b" }, childPortId: "a" },
        { id: "piece6", type: "curve45", parent: { pieceId: "piece5", portId: "b" }, childPortId: "a" },
        { id: "piece7", type: "curve45", parent: { pieceId: "piece6", portId: "b" }, childPortId: "a" },
        { id: "piece8", type: "curve45", parent: { pieceId: "piece7", portId: "b" }, childPortId: "a" },
      ],
    },
  },
  {
    id: "oval",
    name: "Oval Racetrack",
    description: "Two straights, a 180° turn, two more straights, another 180° turn — a classic stadium loop.",
    layout: {
      version: 1,
      actions: [
        { id: "piece1", type: "straight" },
        { id: "piece2", type: "straight", parent: { pieceId: "piece1", portId: "b" }, childPortId: "a" },
        { id: "piece3", type: "curve45", parent: { pieceId: "piece2", portId: "b" }, childPortId: "a" },
        { id: "piece4", type: "curve45", parent: { pieceId: "piece3", portId: "b" }, childPortId: "a" },
        { id: "piece5", type: "curve45", parent: { pieceId: "piece4", portId: "b" }, childPortId: "a" },
        { id: "piece6", type: "curve45", parent: { pieceId: "piece5", portId: "b" }, childPortId: "a" },
        { id: "piece7", type: "straight", parent: { pieceId: "piece6", portId: "b" }, childPortId: "a" },
        { id: "piece8", type: "straight", parent: { pieceId: "piece7", portId: "b" }, childPortId: "a" },
        { id: "piece9", type: "curve45", parent: { pieceId: "piece8", portId: "b" }, childPortId: "a" },
        { id: "piece10", type: "curve45", parent: { pieceId: "piece9", portId: "b" }, childPortId: "a" },
        { id: "piece11", type: "curve45", parent: { pieceId: "piece10", portId: "b" }, childPortId: "a" },
        { id: "piece12", type: "curve45", parent: { pieceId: "piece11", portId: "b" }, childPortId: "a" },
      ],
    },
  },
  {
    id: "oval-with-siding",
    name: "Oval with a Siding",
    description:
      "The oval above, but one straight is swapped for a 4-way crossing — its through-axis has the exact " +
      "same port geometry as a straight, so the loop still closes exactly, while its cross-axis gives a " +
      "dead-end siding to park a piece on.",
    layout: {
      version: 1,
      actions: [
        { id: "piece1", type: "straight" },
        { id: "piece2", type: "crossing4", parent: { pieceId: "piece1", portId: "b" }, childPortId: "a1" },
        { id: "piece3", type: "curve45", parent: { pieceId: "piece2", portId: "a2" }, childPortId: "a" },
        { id: "piece4", type: "curve45", parent: { pieceId: "piece3", portId: "b" }, childPortId: "a" },
        { id: "piece5", type: "curve45", parent: { pieceId: "piece4", portId: "b" }, childPortId: "a" },
        { id: "piece6", type: "curve45", parent: { pieceId: "piece5", portId: "b" }, childPortId: "a" },
        { id: "piece7", type: "straight", parent: { pieceId: "piece6", portId: "b" }, childPortId: "a" },
        { id: "piece8", type: "straight", parent: { pieceId: "piece7", portId: "b" }, childPortId: "a" },
        { id: "piece9", type: "curve45", parent: { pieceId: "piece8", portId: "b" }, childPortId: "a" },
        { id: "piece10", type: "curve45", parent: { pieceId: "piece9", portId: "b" }, childPortId: "a" },
        { id: "piece11", type: "curve45", parent: { pieceId: "piece10", portId: "b" }, childPortId: "a" },
        { id: "piece12", type: "curve45", parent: { pieceId: "piece11", portId: "b" }, childPortId: "a" },
        { id: "piece13", type: "halfStraight", parent: { pieceId: "piece2", portId: "b2" }, childPortId: "a" },
      ],
    },
  },
  {
    id: "switch-yard",
    name: "Switch Yard",
    description:
      "Same crossing-siding trick as above, but the siding ends in a Y-turnout instead of just stopping — " +
      "two little dead-end branches to park pieces on.",
    layout: {
      version: 1,
      actions: [
        { id: "piece1", type: "straight" },
        { id: "piece2", type: "crossing4", parent: { pieceId: "piece1", portId: "b" }, childPortId: "a1" },
        { id: "piece3", type: "curve45", parent: { pieceId: "piece2", portId: "a2" }, childPortId: "a" },
        { id: "piece4", type: "curve45", parent: { pieceId: "piece3", portId: "b" }, childPortId: "a" },
        { id: "piece5", type: "curve45", parent: { pieceId: "piece4", portId: "b" }, childPortId: "a" },
        { id: "piece6", type: "curve45", parent: { pieceId: "piece5", portId: "b" }, childPortId: "a" },
        { id: "piece7", type: "straight", parent: { pieceId: "piece6", portId: "b" }, childPortId: "a" },
        { id: "piece8", type: "straight", parent: { pieceId: "piece7", portId: "b" }, childPortId: "a" },
        { id: "piece9", type: "curve45", parent: { pieceId: "piece8", portId: "b" }, childPortId: "a" },
        { id: "piece10", type: "curve45", parent: { pieceId: "piece9", portId: "b" }, childPortId: "a" },
        { id: "piece11", type: "curve45", parent: { pieceId: "piece10", portId: "b" }, childPortId: "a" },
        { id: "piece12", type: "curve45", parent: { pieceId: "piece11", portId: "b" }, childPortId: "a" },
        { id: "piece13", type: "halfStraight", parent: { pieceId: "piece2", portId: "b2" }, childPortId: "a" },
        { id: "piece14", type: "switchY", parent: { pieceId: "piece13", portId: "b" }, childPortId: "common" },
      ],
    },
  },
  {
    id: "figure-8",
    name: "Figure-8",
    description:
      "Two loops sharing one 4-way crossing. Each axis of the crossing needed its own 'upstream' straight " +
      "to match the geometry the loop closure depends on — without it only one of the two loops closes. " +
      "Both close at an exact 0.000mm gap.",
    layout: {
      version: 1,
      actions: [
        { id: "piece1", type: "straight" },
        { id: "piece2", type: "crossing4", parent: { pieceId: "piece1", portId: "b" }, childPortId: "a1" },
        { id: "piece3", type: "curve45", parent: { pieceId: "piece2", portId: "a2" }, childPortId: "a" },
        { id: "piece4", type: "curve45", parent: { pieceId: "piece3", portId: "b" }, childPortId: "a" },
        { id: "piece5", type: "curve45", parent: { pieceId: "piece4", portId: "b" }, childPortId: "a" },
        { id: "piece6", type: "curve45", parent: { pieceId: "piece5", portId: "b" }, childPortId: "a" },
        { id: "piece7", type: "straight", parent: { pieceId: "piece6", portId: "b" }, childPortId: "a" },
        { id: "piece8", type: "straight", parent: { pieceId: "piece7", portId: "b" }, childPortId: "a" },
        { id: "piece9", type: "curve45", parent: { pieceId: "piece8", portId: "b" }, childPortId: "a" },
        { id: "piece10", type: "curve45", parent: { pieceId: "piece9", portId: "b" }, childPortId: "a" },
        { id: "piece11", type: "curve45", parent: { pieceId: "piece10", portId: "b" }, childPortId: "a" },
        { id: "piece12", type: "curve45", parent: { pieceId: "piece11", portId: "b" }, childPortId: "a" },
        { id: "piece13", type: "straight", parent: { pieceId: "piece2", portId: "b1" }, childPortId: "b" },
        { id: "piece14", type: "curve45", parent: { pieceId: "piece2", portId: "b2" }, childPortId: "a" },
        { id: "piece15", type: "curve45", parent: { pieceId: "piece14", portId: "b" }, childPortId: "a" },
        { id: "piece16", type: "curve45", parent: { pieceId: "piece15", portId: "b" }, childPortId: "a" },
        { id: "piece17", type: "curve45", parent: { pieceId: "piece16", portId: "b" }, childPortId: "a" },
        { id: "piece18", type: "straight", parent: { pieceId: "piece17", portId: "b" }, childPortId: "a" },
        { id: "piece19", type: "straight", parent: { pieceId: "piece18", portId: "b" }, childPortId: "a" },
        { id: "piece20", type: "curve45", parent: { pieceId: "piece19", portId: "b" }, childPortId: "a" },
        { id: "piece21", type: "curve45", parent: { pieceId: "piece20", portId: "b" }, childPortId: "a" },
        { id: "piece22", type: "curve45", parent: { pieceId: "piece21", portId: "b" }, childPortId: "a" },
        { id: "piece23", type: "curve45", parent: { pieceId: "piece22", portId: "b" }, childPortId: "a" },
      ],
    },
  },
  {
    id: "quad-loop",
    name: "Tight Quad Loop",
    description: "Just four 90° curves — the smallest loop this piece set can close, and the fewest pieces of any template here.",
    layout: {
      version: 1,
      actions: [
        { id: "piece1", type: "curve90" },
        { id: "piece2", type: "curve90", parent: { pieceId: "piece1", portId: "b" }, childPortId: "a" },
        { id: "piece3", type: "curve90", parent: { pieceId: "piece2", portId: "b" }, childPortId: "a" },
        { id: "piece4", type: "curve90", parent: { pieceId: "piece3", portId: "b" }, childPortId: "a" },
      ],
    },
  },
  {
    id: "crossing-spur-halt",
    name: "Crossing Spur Halt",
    description:
      "The oval racetrack again, but its lead straight is a 4-Way Crossing (Short Spur) instead — same " +
      "through-axis geometry as a straight, so the loop still closes exactly, and its own short cross-arm " +
      "is a ready-made dead-end halt with no extra piece needed.",
    layout: {
      version: 1,
      actions: [
        { id: "piece1", type: "straight" },
        { id: "piece2", type: "crossing4Spur", parent: { pieceId: "piece1", portId: "b" }, childPortId: "a1" },
        { id: "piece3", type: "curve45", parent: { pieceId: "piece2", portId: "a2" }, childPortId: "a" },
        { id: "piece4", type: "curve45", parent: { pieceId: "piece3", portId: "b" }, childPortId: "a" },
        { id: "piece5", type: "curve45", parent: { pieceId: "piece4", portId: "b" }, childPortId: "a" },
        { id: "piece6", type: "curve45", parent: { pieceId: "piece5", portId: "b" }, childPortId: "a" },
        { id: "piece7", type: "straight", parent: { pieceId: "piece6", portId: "b" }, childPortId: "a" },
        { id: "piece8", type: "straight", parent: { pieceId: "piece7", portId: "b" }, childPortId: "a" },
        { id: "piece9", type: "curve45", parent: { pieceId: "piece8", portId: "b" }, childPortId: "a" },
        { id: "piece10", type: "curve45", parent: { pieceId: "piece9", portId: "b" }, childPortId: "a" },
        { id: "piece11", type: "curve45", parent: { pieceId: "piece10", portId: "b" }, childPortId: "a" },
        { id: "piece12", type: "curve45", parent: { pieceId: "piece11", portId: "b" }, childPortId: "a" },
      ],
    },
  },
  {
    id: "snake-siding",
    name: "Snake Siding",
    description:
      "The oval with a siding again, but the siding ends in a Snake Curve instead of a dead straight — " +
      "the same S-shaped sidestep piece, parked where you can see its lateral jog without it having to " +
      "fit back into a closed loop.",
    layout: {
      version: 1,
      actions: [
        { id: "piece1", type: "straight" },
        { id: "piece2", type: "crossing4", parent: { pieceId: "piece1", portId: "b" }, childPortId: "a1" },
        { id: "piece3", type: "curve45", parent: { pieceId: "piece2", portId: "a2" }, childPortId: "a" },
        { id: "piece4", type: "curve45", parent: { pieceId: "piece3", portId: "b" }, childPortId: "a" },
        { id: "piece5", type: "curve45", parent: { pieceId: "piece4", portId: "b" }, childPortId: "a" },
        { id: "piece6", type: "curve45", parent: { pieceId: "piece5", portId: "b" }, childPortId: "a" },
        { id: "piece7", type: "straight", parent: { pieceId: "piece6", portId: "b" }, childPortId: "a" },
        { id: "piece8", type: "straight", parent: { pieceId: "piece7", portId: "b" }, childPortId: "a" },
        { id: "piece9", type: "curve45", parent: { pieceId: "piece8", portId: "b" }, childPortId: "a" },
        { id: "piece10", type: "curve45", parent: { pieceId: "piece9", portId: "b" }, childPortId: "a" },
        { id: "piece11", type: "curve45", parent: { pieceId: "piece10", portId: "b" }, childPortId: "a" },
        { id: "piece12", type: "curve45", parent: { pieceId: "piece11", portId: "b" }, childPortId: "a" },
        { id: "piece13", type: "snake", parent: { pieceId: "piece2", portId: "b2" }, childPortId: "a" },
      ],
    },
  },
  {
    id: "curve-straight-spur-yard",
    name: "Curve+Straight Spur Yard",
    description:
      "The oval with a siding again, but the siding ends in a Curve+Straight Switch instead of stopping — " +
      "attached through its own straight-through port (its common end is a peg, the one port on this piece " +
      "that can't take the usual attach direction), forking the end of the siding into two more dead ends.",
    layout: {
      version: 1,
      actions: [
        { id: "piece1", type: "straight" },
        { id: "piece2", type: "crossing4", parent: { pieceId: "piece1", portId: "b" }, childPortId: "a1" },
        { id: "piece3", type: "curve45", parent: { pieceId: "piece2", portId: "a2" }, childPortId: "a" },
        { id: "piece4", type: "curve45", parent: { pieceId: "piece3", portId: "b" }, childPortId: "a" },
        { id: "piece5", type: "curve45", parent: { pieceId: "piece4", portId: "b" }, childPortId: "a" },
        { id: "piece6", type: "curve45", parent: { pieceId: "piece5", portId: "b" }, childPortId: "a" },
        { id: "piece7", type: "straight", parent: { pieceId: "piece6", portId: "b" }, childPortId: "a" },
        { id: "piece8", type: "straight", parent: { pieceId: "piece7", portId: "b" }, childPortId: "a" },
        { id: "piece9", type: "curve45", parent: { pieceId: "piece8", portId: "b" }, childPortId: "a" },
        { id: "piece10", type: "curve45", parent: { pieceId: "piece9", portId: "b" }, childPortId: "a" },
        { id: "piece11", type: "curve45", parent: { pieceId: "piece10", portId: "b" }, childPortId: "a" },
        { id: "piece12", type: "curve45", parent: { pieceId: "piece11", portId: "b" }, childPortId: "a" },
        { id: "piece13", type: "halfStraight", parent: { pieceId: "piece2", portId: "b2" }, childPortId: "a" },
        { id: "piece14", type: "switchCurveStraight", parent: { pieceId: "piece13", portId: "b" }, childPortId: "through" },
      ],
    },
  },
  {
    id: "overpass-spur",
    name: "Overpass Spur",
    description:
      "The oval with a siding again, but the siding climbs a bridge — Ramp Up then Ramp Down back to back, " +
      "cresting at level 1 before coming back down to a dead end at ground level. A good layout for trying " +
      "the 3D preview: the whole hump is real, sourced geometry, not a flat spur pretending to rise.",
    layout: {
      version: 1,
      actions: [
        { id: "piece1", type: "straight" },
        { id: "piece2", type: "crossing4", parent: { pieceId: "piece1", portId: "b" }, childPortId: "a1" },
        { id: "piece3", type: "curve45", parent: { pieceId: "piece2", portId: "a2" }, childPortId: "a" },
        { id: "piece4", type: "curve45", parent: { pieceId: "piece3", portId: "b" }, childPortId: "a" },
        { id: "piece5", type: "curve45", parent: { pieceId: "piece4", portId: "b" }, childPortId: "a" },
        { id: "piece6", type: "curve45", parent: { pieceId: "piece5", portId: "b" }, childPortId: "a" },
        { id: "piece7", type: "straight", parent: { pieceId: "piece6", portId: "b" }, childPortId: "a" },
        { id: "piece8", type: "straight", parent: { pieceId: "piece7", portId: "b" }, childPortId: "a" },
        { id: "piece9", type: "curve45", parent: { pieceId: "piece8", portId: "b" }, childPortId: "a" },
        { id: "piece10", type: "curve45", parent: { pieceId: "piece9", portId: "b" }, childPortId: "a" },
        { id: "piece11", type: "curve45", parent: { pieceId: "piece10", portId: "b" }, childPortId: "a" },
        { id: "piece12", type: "curve45", parent: { pieceId: "piece11", portId: "b" }, childPortId: "a" },
        { id: "piece13", type: "halfStraight", parent: { pieceId: "piece2", portId: "b2" }, childPortId: "a" },
        { id: "piece14", type: "bridgeGround", parent: { pieceId: "piece13", portId: "b" }, childPortId: "a" },
        { id: "piece15", type: "bridgeSlope", parent: { pieceId: "piece14", portId: "b" }, childPortId: "a" },
      ],
    },
  },
];
