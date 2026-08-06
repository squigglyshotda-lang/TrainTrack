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
];
