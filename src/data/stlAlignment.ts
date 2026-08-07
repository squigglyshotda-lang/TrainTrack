// How to place each piece type's REAL printed STL mesh (see stlLibrary.ts)
// into this app's own port-local coordinate frame (x = travel axis, y =
// lateral axis, z = thickness, 0 at the bottom face) for the 3D preview.
//
// Every real STL file was authored independently (not by this project) and
// each one has its own arbitrary local origin/axis choice — some put the
// travel axis on X, some on Y (see stlLibrary.ts's snake note); none are
// guaranteed to share this app's own port-local origin. These entries were
// derived, not guessed: for each type, this project's own outline bounding
// box (built from the same sourced dimensions as the ports themselves) was
// compared against the real STL's measured bounding box (see
// scripts referenced in this file's git history — computed via three's
// STLLoader run against every file in public/stl/). Wherever the two boxes
// line up with zero gap at one edge (a real, physical connector face
// flush against this app's own port plane) or with the STL exactly
// containing this app's outline with no offset at all, that fixes the
// transform with no free parameter left to guess. A few offsets shown here
// carry a several-mm residual on the non-anchored edge — that residual is
// real connector-neck material the simplified 2D outline never modeled
// (peg/socket protrusions), not calibration slop.
//
// rotate: "none" for a file whose own X axis is already this app's travel
// axis; "cw90"/"ccw90" for a file whose travel axis is on its own Y
// instead (see stlLibrary.ts's snake note) — those need an actual 90°
// rotation about the vertical (Z) axis to bring the travel axis onto X,
// not a bare coordinate swap. (x,y) -> (y,-x) is "cw90", (x,y) -> (-y,x)
// is "ccw90"; both leave Z untouched, since Z (thickness/up) was never
// swapped with anything in the real files (every measured STL, including
// the rotated ones, already has Z running 0 to the piece's own real
// height). A bare (x,y)->(y,x) swap-with-no-rotation was tried first and
// shipped briefly, but it's a REFLECTION (its 2D linear part has
// determinant -1) rather than a rotation — it mirrors the mesh instead of
// turning it, which is invisible on one isolated piece but compounds
// visibly wrong across a closed loop of them. Fixed by rotating instead
// of swapping-then-flipping Z; verified by rendering the 8×curve45
// "Simple Circle" template in 3D and confirming it closes into a circle
// instead of spiraling.
// offsetZ shifts the mesh vertically after rotation — 0 (or omitted) for
// every flat 12mm piece, since their own Z already runs 0 at the bottom
// face, matching this app's own placement baseline with no adjustment.
export interface StlAlignment {
  rotate: "none" | "cw90" | "ccw90";
  offsetX: number;
  offsetY: number;
  offsetZ?: number;
}

export const STL_ALIGNMENT: Record<string, StlAlignment> = {
  straight: { rotate: "none", offsetX: 0, offsetY: -20 },
  halfStraight: { rotate: "none", offsetX: 0, offsetY: -20 },
  shortStraight: { rotate: "none", offsetX: 0, offsetY: -20 },
  pegCoupler: { rotate: "none", offsetX: 0, offsetY: -20 },
  dogbone: { rotate: "none", offsetX: 18.1, offsetY: 0 },
  crossing4: { rotate: "none", offsetX: 0, offsetY: 0 },
  crossing4Spur: { rotate: "none", offsetX: 0, offsetY: 0 },
  switchCurveStraight: { rotate: "none", offsetX: 0, offsetY: -1.75 },
  switchCurveStraightMirror: { rotate: "none", offsetX: 0, offsetY: 40 },
  curve45: { rotate: "cw90", offsetX: 2.054, offsetY: 17.071 },
  curve45Mirror: { rotate: "cw90", offsetX: 72.899, offsetY: -2.260 },
  curve90: { rotate: "cw90", offsetX: -0.875, offsetY: 10 },
  curve90Mirror: { rotate: "cw90", offsetX: 106.875, offsetY: -56 },
  switchY: { rotate: "cw90", offsetX: -7.071, offsetY: 20 },
  snake: { rotate: "cw90", offsetX: 1.907, offsetY: 60 },
  snakeMirror: { rotate: "cw90", offsetX: 1.907, offsetY: -60 },
  // bridgeGround: unlike every flat piece above, its real height genuinely
  // varies along the piece (an actual rising ramp, not a flat 12mm slab
  // tilted after the fact) — but its own profile is simple: Z rises
  // cleanly along the same travel axis every other "cw90" piece uses,
  // port a sitting right at Z=0 with no adjustment needed. Confirmed by
  // bucketing the mesh's own vertices by position and checking Z tracks
  // smoothly with it (see this file's git history for that script).
  bridgeGround: { rotate: "cw90", offsetX: 0, offsetY: 20, offsetZ: 0 },
  // bridgeSlope is deliberately NOT here, unlike bridgeGround. Its mesh
  // includes a full support structure reaching toward the ground well
  // below either port (bounding box Z up to 74.79, versus a ~10.9mm real
  // rise), and while the two connector faces WERE locatable (narrow,
  // near-flat vertex clusters at each Y extreme, 10.71mm apart — close
  // enough to this piece's own sourced riseMm, 10.87mm, to trust as the
  // real connection) and gave calibration numbers that looked internally
  // consistent, rendering it that way produced an unconvincing blocky
  // mass rather than a recognizable descending ramp — worse than the
  // schematic it would have replaced. See Canvas3D.tsx, which keeps this
  // one piece on the extruded schematic + computed-tilt path instead.
};
