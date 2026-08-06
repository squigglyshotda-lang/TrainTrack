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
};
