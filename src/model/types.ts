export type Gender = "peg" | "socket";

export interface Port {
  id: string;
  x: number;
  y: number;
  headingDeg: number;
  gender: Gender;
}

export interface PieceDef {
  type: string;
  label: string;
  shortLabel: string;
  ports: Port[];
  // One or more closed polygons in local (piece) coordinates, mm. Multiple
  // polygons are used for pieces whose body isn't a single simple shape
  // (a Y-turnout's two branches, a crossing's two arms).
  outlines: { x: number; y: number }[][];
  // True for pieces that exist in the data model (so they can be exported,
  // saved/loaded, etc.) but aren't offered directly in the palette or the
  // port-click picker — mirror-image pieces (reached via the Flip action
  // instead of being separate palette entries) and the dogbone connector
  // (a specialist accessory, not a piece most users need to see).
  hidden?: boolean;
}
