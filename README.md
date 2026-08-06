# TrainTrack

A browser-based planner for BRIO-compatible wooden train track. Build a
layout by attaching pieces port-to-port, then export the exact set of
pieces as 3D-printable STL files.

## Status

Phases 1, 2a, and 3 are complete. Phase 4 is partial: PDF export and
shareable links are done; elevation (ramps/bridges/piers) is not — see
below for why. Phase 2b (live OpenSCAD-in-the-browser generation) hasn't
been attempted; Phase 2a already covers every piece Phase 1 offers.

## How the layout works

This is **not** free-form drag-and-drop with collision detection. The
layout is a graph: every piece has typed connection ports (a local
position, a heading, and a gender — peg or socket). Placing a piece means
solving one rigid transform that makes the chosen port coincide with the
target port, facing the opposite direction with the opposite gender.
On-screen position is always derived from that graph, never stored
separately.

- Click a free port, pick a piece from the popup, it attaches. The popup
  and the permanent "Piece Library" panel on the left both show a real
  thumbnail of each piece's shape — not just its name.
- Free ports are colored circles (solid = peg, ring = socket); occupied
  ports fade to small gray dots.
- "Start from a Template" loads a pre-built, pre-verified loop (built and
  closure-checked with the actual graph engine, not hand-derived) — a
  tight circle, a stadium oval, or an oval with a siding branching off a
  4-way crossing.
- The bill of materials in the sidebar updates live, split into pieces you
  already own (set in "My Inventory") versus pieces still to print.
- A loop is "closed" when two free ports land within a few mm of each
  other, facing opposite directions with opposite genders — this is
  detected and reported (with the gap distance), never forced.
- The whole graph reduces to an ordered list of placement actions — a root
  piece, then a chain of "attach this piece's port to that port" steps.
  That's what save/load, undo/redo, and shareable links all replay under
  the hood; none of them store baked-in coordinates.

## Where the dimensions come from

Every physical measurement (track width, connector sizes, curve radius,
standard piece lengths, print-bed size, PLA density) is in
`src/data/track-spec.json`, with a comment on each value naming exactly
where it came from. Nothing is guessed — see that file's `_meta` block for
sourcing notes, including which values are real measurements versus the
handful that are project-chosen constants (tolerances, bed size).

`src/data/pieceDefs.ts` turns those numbers into all twelve piece types
(ports + outline shapes): straight, half straight, short straight, 45°
and 90° curves (each with an opposite-hand version), a Y-turnout, a
curve+straight turnout (with an opposite-hand version), a 4-way crossing,
and a dogbone connector (joins two socket-ended pieces facing each other —
the one case no ordinary piece can handle, since every ordinary piece has
exactly one peg and one socket). `src/data/stlLibrary.ts` maps each piece
type to the real STL file that prints it (from torwan's generator repo —
see its comments for exactly which file, and how the opposite-hand pieces
without a matching pre-generated file were derived by mirroring). Nothing
in the UI hardcodes a dimension or a file path.

## Exporting

- **Export STL (.zip)** — bundles the real STL file for each piece type in
  the current bill of materials, renamed with its quantity, into a zip.
- **Export PDF** — a printable assembly diagram: the same piece outlines
  the canvas draws, plus a bill of materials and a scale note (prints true
  to size at 100% scale if the layout fits the page).
- **Copy Share Link** — the layout's action list, base64'd into the URL's
  hash fragment. No backend involved; anyone who opens the link gets the
  same layout rebuilt in their browser.

## What's not here yet, and why

**Elevation (ramps, bridges, piers).** The source repo has real dimensions
and STL files for bridge pieces, so the data isn't the blocker. The
blocker is that every port right now is purely 2D (x, y, heading) — a
bridge piece needs its ports to also carry a height and a grade, which
touches the port model, the closure-detection math, and how (or whether)
a top-down 2D view shows height at all. That's a real design decision, not
a piece-type addition, so it's being left for a focused follow-up instead
of a rushed bolt-on.

**Phase 2b (live OpenSCAD-in-the-browser generation).** Not attempted.
Phase 2a's static library already covers every piece type in the app, so
there's been no concrete need yet for custom-parameter generation
(arbitrary radius, custom length, name engraving).

## Development

```bash
npm install
npm run dev      # starts the dev server
npm run build    # type-checks and produces a production build in dist/
```
