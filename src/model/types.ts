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
}
