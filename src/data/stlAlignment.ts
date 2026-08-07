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
// swapXY: true means the STL's own X axis is this app's lateral axis and
// its Y axis is the travel axis (rather than the more common X-is-travel)
// — applying that swap alone would mirror the mesh (a coordinate swap has
// negative determinant), so the swap entries also negate Z and re-offset
// it by the piece's own real thickness to keep the transform a proper
// rotation instead of a reflection. offsetX/offsetY are added AFTER the
// swap (if any).
//
// bridgeGround and bridgeSlope are deliberately NOT here: their real STL
// height varies continuously along the piece (the actual ramp profile,
// not a flat 12mm slab), and getting the swap+Z-flip fix right for a
// non-uniform height field needs more verification than this pass covered
// with confidence — see Canvas3D.tsx, which keeps them on the extruded
// schematic + computed-tilt path instead.
export interface StlAlignment {
  swapXY: boolean;
  offsetX: number;
  offsetY: number;
}

export const STL_ALIGNMENT: Record<string, StlAlignment> = {
  straight: { swapXY: false, offsetX: 0, offsetY: -20 },
  halfStraight: { swapXY: false, offsetX: 0, offsetY: -20 },
  shortStraight: { swapXY: false, offsetX: 0, offsetY: -20 },
  pegCoupler: { swapXY: false, offsetX: 0, offsetY: -20 },
  dogbone: { swapXY: false, offsetX: 18.1, offsetY: 0 },
  crossing4: { swapXY: false, offsetX: 0, offsetY: 0 },
  crossing4Spur: { swapXY: false, offsetX: 0, offsetY: 0 },
  switchCurveStraight: { swapXY: false, offsetX: 0, offsetY: -1.75 },
  switchCurveStraightMirror: { swapXY: false, offsetX: 0, offsetY: 40 },
  curve45: { swapXY: true, offsetX: 0, offsetY: 0 },
  curve45Mirror: { swapXY: true, offsetX: 89.095, offsetY: -14.142 },
  curve90: { swapXY: true, offsetX: 0, offsetY: 66 },
  curve90Mirror: { swapXY: true, offsetX: 126, offsetY: 0 },
  switchY: { swapXY: true, offsetX: 0, offsetY: -14.142 },
  snake: { swapXY: true, offsetX: 0, offsetY: -20 },
  snakeMirror: { swapXY: true, offsetX: 0, offsetY: 20 },
};
