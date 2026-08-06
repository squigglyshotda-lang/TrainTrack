# Choo Builder

A browser-based planner for BRIO-compatible wooden train track. Build a
layout by attaching pieces port-to-port, then export the exact set of
pieces as 3D-printable STL files.

## Status

Phases 1, 2a, and 3 are complete. Phase 4 is partial: PDF export and
shareable links are done; elevation (ramps/bridges/piers) is not — see
below for why. Phase 2b (live OpenSCAD-in-the-browser generation) hasn't
been attempted; Phase 2a already covers every piece type in the app.

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
  thumbnail of each piece's shape — not just its name. The dogbone
  connector (see below) and mirror-image pieces are left out of both —
  mirrors are reached via Flip instead of being separate entries.
- Click a placed piece to select it — a contextual menu appears with
  **Flip** (mirrors the piece in place, only shown for pieces that have a
  genuinely different mirror image), **Replace** (swaps it for a different
  piece, keeping the same attachment point), and **Delete**. The Delete
  and Backspace keys also delete whatever's selected. Deleting the root
  piece (or any piece with nothing attached above it) doesn't take the
  rest of the layout with it — whatever was built on top becomes its own
  independent root, at exactly the position it already had. Deleting a
  piece that's attached to something else still takes everything
  downstream of it, since those pieces' positions only make sense relative
  to it.
- Free ports are colored circles (solid = peg, ring = socket); occupied
  ports fade to small gray dots.
- "Start from a Template" loads a pre-built, pre-verified loop (built and
  closure-checked with the actual graph engine, not hand-derived): a tight
  circle, a stadium oval, an oval with a siding, a switch yard, or a
  figure-8.
- **⚡ Smart Join** (toolbar button) — click it, then click a free port:
  the app searches every other free port for whether a piece combination
  can actually reach it (same search as below) and only those light up
  with a dashed ring, everything else fades. Click a lit-up port to
  complete the join; nothing you can click will ever fail. If nothing's
  reachable from wherever you started, it says so and lets you try a
  different starting port. It's a real search (breadth-first over piece
  combinations, shortest solution first), not a shortcut — most arbitrary
  port pairs don't have an exact match against this piece alphabet's
  discrete lengths and angles, which is exactly why the ports that can't
  work are filtered out before you can click them rather than after. Two
  peg ends are never reachable — no piece here bridges two pegs (same as
  real BRIO connectors); two socket ends are bridged with a dogbone or peg
  coupler automatically when needed.
- **Draw a shape** — drag from a free port instead of clicking it (a dashed
  preview line follows your cursor), and on release the app fits a
  sequence of pieces to the path you drew, greedily matching whichever
  piece's resulting position and heading land closest to where you drew
  next. It's a curve-fit, not a search for an exact match — a freehand
  line never lands on an exact combination of piece lengths and angles, so
  it says plainly when the shape did something no piece here can follow,
  rather than forcing a bad fit past that point. A quick click (no drag)
  still opens the normal attach picker, same as always.
- The bill of materials in the sidebar updates live, split into pieces you
  already own (set in "My Inventory") versus pieces still to print.
- A loop is "closed" when two free ports land within a few mm of each
  other, facing opposite directions with opposite genders — this is
  detected and reported (with the gap distance), never forced.
- The whole graph reduces to an ordered list of placement actions — a root
  piece, then a chain of "attach this piece's port to that port" steps.
  That's what save/load, undo/redo, and shareable links all replay under
  the hood; none of them store baked-in coordinates. Flip works the same
  way in reverse: it re-solves the flipped piece's own transform (and
  cascades through everything attached beyond it), it doesn't move
  anything by hand. The one exception to "no baked-in coordinates" is a
  root created by deleting a piece above it — that one root keeps an
  explicit position (exactly where it already was) instead of defaulting
  to the origin, so it reloads in the same place rather than jumping.

## Where the dimensions come from

Every physical measurement (track width, connector sizes, curve radius,
standard piece lengths, print-bed size, PLA density) is in
`src/data/track-spec.json`, with a comment on each value naming exactly
where it came from. Nothing is guessed — see that file's `_meta` block for
sourcing notes, including which values are real measurements versus the
handful that are project-chosen constants (tolerances, bed size).

`src/data/pieceDefs.ts` turns those numbers into all sixteen piece types
(ports + outline shapes): straight, half straight, short straight, 45°
and 90° curves (each with an opposite-hand version), a Y-turnout, a
curve+straight turnout (with an opposite-hand version), a 4-way crossing,
a snake curve (each with an opposite-hand version — see below), a crossing
with a short spur instead of a second full crossing arm, and two
peg-at-both-ends connectors, the dogbone and the shorter peg coupler
(join two socket-ended pieces facing each other — the one case no ordinary
piece can handle, since every ordinary piece has exactly one peg and one
socket). The connectors and mirror-image pieces are hidden from the
palette and the root-placement picker — mirrors are reached via Flip
instead of being separate entries, and the connectors are specialist
accessories most layouts don't need up front — but the connectors still
appear when attaching to an existing port if they're the only piece that
can actually go there (see the Y-turnout note below for why that matters).
`src/data/stlLibrary.ts` maps each piece type to the real STL file that
prints it (from torwan's generator repo — see its comments for exactly
which file, and how the opposite-hand pieces without a matching
pre-generated file were derived by mirroring). Nothing in the UI hardcodes
a dimension or a file path.

The snake curve is worth calling out: it's two equal-and-opposite arcs
that bring the track back to running parallel to where it started, just
offset sideways — a lateral jog with zero net heading change, unlike every
other curve in the set. Useful for nudging a line sideways without
actually turning it.

**Why the peg coupler exists alongside the dogbone:** every ordinary piece
has one peg and one socket, and that pairing is gender-invariant through
any chain of them — start from a socket free port and every free port
downstream of it stays a socket, no matter how many ordinary pieces you
add, forever. The Y-turnout's three ports are all sockets, so the moment
you build anything off of one, every free port anywhere in that branch is
permanently a socket too — and a piece offering only sockets (like a
second Y-turnout) can never attach to another socket. The dogbone and peg
coupler are the only two pieces with a peg at *both* ends, which makes
them the only way to flip a stuck-all-sockets branch back into something
a socket-only piece can attach to. That's also why they still show up in
the attach picker even though they're hidden from the general library and
the root picker: hiding them everywhere would have made a second
Y-turnout — or Y-turnout-adjacent branch — impossible to build through the
UI at all.

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
