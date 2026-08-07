export type Gender = "peg" | "socket";

export interface Port {
  id: string;
  x: number;
  y: number;
  headingDeg: number;
  gender: Gender;
  // Which discrete height tier this port sits at, LOCAL to the piece (0 if
  // omitted). Every piece except the bridge ramps has both ports at the
  // same level — a real bridge's height mostly comes from tilting an
  // ordinary straight piece used as the deck, which this app can't track
  // (it has no notion of grade/slope, only flat pieces), so this counts
  // discrete "one ramp up/down" steps rather than claiming a physical mm
  // height this app doesn't actually know.
  level?: number;
  // Real physical rise in mm, LOCAL to the piece (0 if omitted) — used only
  // by the 3D preview, kept deliberately separate from `level` above. Only
  // the two bridge ramp ports have a non-zero value here, computed from
  // their own sourced horizontal length and the real 14deg bridge angle
  // (riseMm = lengthMm * tan(angleDeg)) — see track-spec.json. This is
  // real, derived geometry, not the same simplification `level` makes; the
  // 3D view uses it to actually tilt a ramp piece's mesh, while `level`
  // stays a step count for the 2D badges and closure detection.
  riseMm?: number;
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
  // saved/loaded, etc.) but aren't offered in the palette, the piece
  // library, or the root-placement picker — mirror-image pieces (reached
  // via the Flip action instead of being separate entries) and the dogbone
  // connector (see attachOnly below for why it still shows up elsewhere).
  hidden?: boolean;
  // True only for the dogbone. It's not something to browse or start a
  // layout with, so it stays out of the library/root picker like other
  // hidden pieces — but unlike the mirror pieces, it's the ONLY piece with
  // two peg ports, which makes it the sole way to recover once a chain of
  // all-socket pieces (e.g. anything downstream of a Y-turnout, whose three
  // ports are all sockets) leaves every free port needing a peg-offering
  // piece that doesn't exist. So it must still appear when attaching to an
  // existing port, even though it's hidden everywhere else.
  attachOnly?: boolean;
}
