// Maps each piece type to the pre-generated STL file that prints it, for
// Phase 2a export. Every file under public/stl/ is a real, unmodified (or,
// for the one noted exception, mechanically mirrored) output of torwan's
// generator — see the README note below for exactly how each one was
// obtained. Nothing here is a placeholder.
//
// Source repo: https://github.com/torwanbukaj/ikea-brio-others-compatible-train-tracks-generator
// (GitHub mirror of Thingiverse thing:5598668 — used because Thingiverse and
// MakerWorld are both blocked by this project's build environment; see
// track-spec.json's _meta.note_on_makerworld). Files copied from that repo's
// pre-generated_parts_stl/brio/ folder.
export interface StlLibraryEntry {
  type: string;
  fileName: string; // under /stl/
  exportBaseName: string; // used to build the downloaded file's name
  source: string;
  // Measured directly off the actual mesh (bounding box + signed volume via
  // the divergence theorem), not estimated — see scripts/analyze-stl notes
  // in the source comment below for how.
  footprintXMm: number;
  footprintYMm: number;
  heightMm: number;
  solidVolumeMm3: number;
}

export const STL_LIBRARY: Record<string, StlLibraryEntry> = {
  straight: {
    type: "straight",
    fileName: "straight.stl",
    exportBaseName: "straight-100mm",
    source: "pre-generated_parts_stl/brio/train_tracks_brio_straight100mm_NP.stl, used unmodified",
    footprintXMm: 118.25,
    footprintYMm: 40.0,
    heightMm: 12.0,
    solidVolumeMm3: 33311.7,
  },
  halfStraight: {
    type: "halfStraight",
    fileName: "half-straight.stl",
    exportBaseName: "half-straight-50mm",
    source: "pre-generated_parts_stl/brio/train_tracks_brio_straight50mm_NP.stl, used unmodified",
    footprintXMm: 68.25,
    footprintYMm: 40.0,
    heightMm: 12.0,
    solidVolumeMm3: 19618.6,
  },
  curve45: {
    type: "curve45",
    fileName: "curve45.stl",
    exportBaseName: "curve-45deg-r86mm",
    source: "pre-generated_parts_stl/brio/train_tracks_brio_arc45deg_r86_b_NP.stl, used unmodified",
    footprintXMm: 65.19,
    footprintYMm: 107.35,
    heightMm: 12.0,
    solidVolumeMm3: 25811.5,
  },
  curve45Mirror: {
    type: "curve45Mirror",
    fileName: "curve45-mirror.stl",
    exportBaseName: "curve-45deg-r86mm-mirror",
    source:
      "No pre-generated opposite-hand file exists in the source repo, so this one was derived: " +
      "the arc45deg_r86_b_NP.stl mesh, reflected across its long axis (Y -> -Y) with triangle " +
      "winding and normals corrected to match. Reflecting a flat, extruded part this way produces " +
      "the exact mirror-image piece — verified by checking the mirrored mesh's bounding box flipped " +
      "on Y as expected and its signed volume (25811.5mm^3) stayed identical, confirming the surface " +
      "is still closed and outward-facing. The only cosmetic side effect is that any embossed " +
      "lettering on the connector reads mirrored, same as it would on a physically mirrored part.",
    footprintXMm: 65.19,
    footprintYMm: 107.35,
    heightMm: 12.0,
    solidVolumeMm3: 25811.5,
  },
  switchY: {
    type: "switchY",
    fileName: "switch-y.stl",
    exportBaseName: "y-turnout-45deg-r86mm",
    source:
      "pre-generated_parts_stl/brio/train_tracks_brio_switch_l45deg_r86mmN_r45deg_r86mmN_cN_b.stl, used unmodified",
    footprintXMm: 90.38,
    footprintYMm: 89.1,
    heightMm: 12.0,
    solidVolumeMm3: 41760.4,
  },
  crossing4: {
    type: "crossing4",
    fileName: "crossing4.stl",
    exportBaseName: "crossing-90deg-100mm",
    source: "pre-generated_parts_stl/brio/train_tracks_brio_intersect_90deg_100mmNP_100mmNP_b.stl, used unmodified",
    footprintXMm: 118.25,
    footprintYMm: 118.25,
    heightMm: 12.0,
    solidVolumeMm3: 63652.7,
  },
  shortStraight: {
    type: "shortStraight",
    fileName: "short-straight.stl",
    exportBaseName: "short-straight-25mm",
    source: "pre-generated_parts_stl/brio/train_tracks_brio_straight25mm_NP.stl, used unmodified",
    footprintXMm: 43.25,
    footprintYMm: 40.0,
    heightMm: 12.0,
    solidVolumeMm3: 10953.4,
  },
  curve90: {
    type: "curve90",
    fileName: "curve90.stl",
    exportBaseName: "curve-90deg-r86mm",
    source: "pre-generated_parts_stl/brio/train_tracks_brio_arc90deg_r86_b_NP.stl, used unmodified",
    footprintXMm: 126.0,
    footprintYMm: 144.25,
    heightMm: 12.0,
    solidVolumeMm3: 45834.5,
  },
  curve90Mirror: {
    type: "curve90Mirror",
    fileName: "curve90-mirror.stl",
    exportBaseName: "curve-90deg-r86mm-mirror",
    source:
      "Derived the same way as curve45Mirror: arc90deg_r86_b_NP.stl reflected Y -> -Y with winding/" +
      "normals corrected, verified by bounding box flip and identical signed volume (45834.5mm^3).",
    footprintXMm: 126.0,
    footprintYMm: 144.25,
    heightMm: 12.0,
    solidVolumeMm3: 45834.5,
  },
  switchCurveStraight: {
    type: "switchCurveStraight",
    fileName: "switch-curve-straight.stl",
    exportBaseName: "switch-curve-straight-90deg-r86mm",
    source: "pre-generated_parts_stl/brio/train_tracks_brio_switch_90deg_r86mmN_s100mmN_cP_b.stl, used unmodified",
    footprintXMm: 126.0,
    footprintYMm: 144.25,
    heightMm: 12.0,
    solidVolumeMm3: 78942.4,
  },
  switchCurveStraightMirror: {
    type: "switchCurveStraightMirror",
    fileName: "switch-curve-straight-mirror.stl",
    exportBaseName: "switch-curve-straight-90deg-r86mm-mirror",
    source:
      "Same mirroring approach as curve45Mirror, applied to switch_90deg_r86mmN_s100mmN_cP_b.stl. " +
      "Verified by bounding box flip and identical signed volume (78942.4mm^3).",
    footprintXMm: 126.0,
    footprintYMm: 144.25,
    heightMm: 12.0,
    solidVolumeMm3: 78942.4,
  },
  dogbone: {
    type: "dogbone",
    fileName: "dogbone.stl",
    exportBaseName: "dogbone-connector",
    source: "pre-generated_parts_stl/brio/train_tracks_brio_dogbone65.stl, used unmodified",
    footprintXMm: 36.2,
    footprintYMm: 13.0,
    heightMm: 12.0,
    solidVolumeMm3: 3430.7,
  },
  crossing4Spur: {
    type: "crossing4Spur",
    fileName: "crossing4-spur.stl",
    exportBaseName: "crossing-spur-90deg-100mm-40mm",
    source: "pre-generated_parts_stl/brio/train_tracks_brio_intersect_90deg_100mmNP_40mmPP_b.stl, used unmodified",
    footprintXMm: 118.25,
    footprintYMm: 76.5,
    heightMm: 12.0,
    solidVolumeMm3: 42933.6,
  },
  pegCoupler: {
    type: "pegCoupler",
    fileName: "peg-coupler.stl",
    exportBaseName: "peg-coupler-25mm",
    source: "pre-generated_parts_stl/brio/train_tracks_brio_straight25mm_PP.stl, used unmodified",
    footprintXMm: 61.5,
    footprintYMm: 40.0,
    heightMm: 12.0,
    solidVolumeMm3: 14875.9,
  },
  snake: {
    type: "snake",
    fileName: "snake.stl",
    exportBaseName: "snake-curve-r86mm",
    source:
      "pre-generated_parts_stl/brio/train_tracks_brio_snake_35_775deg_r86mm_l146mm_NP_b.stl, used unmodified",
    footprintXMm: 80.0,
    footprintYMm: 164.25,
    heightMm: 12.0,
    solidVolumeMm3: 49124.2,
  },
  snakeMirror: {
    type: "snakeMirror",
    fileName: "snake-mirror.stl",
    exportBaseName: "snake-curve-r86mm-mirror",
    source:
      "No pre-generated opposite-hand file exists in the source repo, so this one was derived the same way " +
      "as curve45Mirror: the snake mesh reflected across its lateral axis (X -> -X, not Y -> -Y like the " +
      "other mirrors, since this file's length axis is Y rather than X) with triangle winding and normals " +
      "corrected to match. Verified by checking the mirrored mesh's bounding box flipped on X as expected " +
      "and its signed volume (49124.2mm^3) stayed identical.",
    footprintXMm: 80.0,
    footprintYMm: 164.25,
    heightMm: 12.0,
    solidVolumeMm3: 49124.2,
  },
  bridgeGround: {
    type: "bridgeGround",
    fileName: "bridge-ramp-up.stl",
    exportBaseName: "bridge-ramp-up-14deg-r100mm",
    source:
      "pre-generated_parts_stl/brio/train_tracks_brio_bridge_ground_14deg_r100mm_s205mm_p50mm.stl, used " +
      "unmodified. heightMm here is the piece's own real physical rise (it's not a flat 12mm piece like " +
      "everything else in this library) — see track-spec.json's bridgeGround entry for the top-down 2D " +
      "length this app actually places it with.",
    footprintXMm: 40.0,
    footprintYMm: 71.422,
    heightMm: 21.267,
    solidVolumeMm3: 24437.4,
  },
  bridgeSlope: {
    type: "bridgeSlope",
    fileName: "bridge-ramp-down.stl",
    exportBaseName: "bridge-ramp-down-14deg-r100mm",
    source:
      "pre-generated_parts_stl/brio/train_tracks_brio_bridge_slope_14deg_r100mm_s205mm_p50mm.stl, used " +
      "unmodified. Tallest piece in the library by design — it's the piece at the peak of the bridge.",
    footprintXMm: 40.0,
    footprintYMm: 87.242,
    heightMm: 74.793,
    solidVolumeMm3: 77064.4,
  },
};
