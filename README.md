# Choo Builder

A browser-based planner for BRIO-compatible wooden train track. Build a
layout by attaching pieces port-to-port, then export the exact set of
pieces as 3D-printable STL files.

## Status

Phases 1, 2a, and 3 are complete. Phase 4 is partial: PDF export and
shareable links are done. Bridge ramp pieces exist and are placeable,
ports carry a discrete height level, closure detection respects it, and
elevated pieces are visually distinct on the canvas — deliberately a step
count rather than true physical height (see "Levels"). A 3D preview is
also available now (toggle it from the toolbar; 2D is still the default
view) — see "3D preview" below for what it does and doesn't show.
Phase 2b (live OpenSCAD-in-the-browser generation) hasn't been attempted;
Phase 2a already covers every piece type in the app.

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
- The layout doesn't have to be one connected structure. Clicking any
  empty spot on the canvas — not just when it's completely blank — opens
  the same picker to drop a new, independent piece right there, and every
  card in the Piece Library does the same (offset clear of whatever's
  already there, since it has no click position of its own to go on).
  This is the same "detach into an independent root" the graph already
  does when you delete a piece with things built on top of it — it was
  already a forest, not strictly one tree — just reachable directly
  instead of only as a side effect of deletion. Handy for building two
  separate layouts at once, or dropping a few Y-turnouts down to compare
  before deciding where either one actually goes.
- Click a placed piece to select it — a contextual menu appears with
  **Flip** (mirrors the piece in place, only shown for pieces that have a
  genuinely different mirror image), **Rotate** (a quarter turn, only shown
  for a root piece — nothing attached above it — since any other piece's
  orientation is derived from its parent attachment and freely spinning it
  would pull it off that connection), **Replace** (swaps it for a
  different piece, keeping the same attachment point), and **Delete**. The
  Delete and Backspace keys also delete whatever's selected. Deleting the
  root piece (or any piece with nothing attached above it) doesn't take
  the rest of the layout with it — whatever was built on top becomes its
  own independent root, at exactly the position it already had. Deleting a
  piece that's attached to something else still takes everything
  downstream of it, since those pieces' positions only make sense relative
  to it.
- **Clear Canvas** (toolbar) deletes the whole layout after confirming —
  the same reset a fresh page load would give you, without needing to
  reload.
- Free ports are colored circles (solid = peg, ring = socket); occupied
  ports fade to small gray dots. Hovering a free port lights up every other
  free port it could actually reach (the same reachability check Smart
  Join uses below), so you can check "what could connect here" without
  committing to anything — a lighter, undashed ring than Smart Join's own,
  so it reads as a preview rather than a selection.
- Hovering or selecting a piece shows its name in a small tag next to it
  (`45° Curve`, `Y-Turnout`, etc.) — several piece outlines look similar
  at a glance, especially at low zoom, so this is the fast way to check
  what something actually is without opening the picker. Hovering always
  wins over the current selection, and the tag for a selected piece stays
  up even after the pointer moves away (so it doesn't disappear right
  when the selection menu appears above it).
- Every piece's outline carries two more pieces of real, sourced detail
  that used to sit unused in track-spec.json: each sharp corner is cut
  back by the real chamfer (1.5mm — printed edges aren't knife-sharp),
  and the twin "well" grooves a real wheel's flange runs in are drawn
  down the centre of the piece, positioned by the real well spacing
  (25.7mm) and following the piece's actual centerline — straight down a
  straight, along the arc of a curve, forking at a Y-turnout, through the
  S-curve of a snake. Both apply to the piece's outline data, so PDF
  export and the piece-library thumbnails pick them up automatically; the
  grooves themselves are drawn only on the main canvas, not the small
  thumbnails, since well width would appear all-out-of-proportion at that
  scale.
- The canvas background is a real grid, not decoration: dots every 25mm, a
  bolder line every 100mm (one straight piece's length), drawn in world
  units so it pans and zooms with the layout instead of sitting fixed on
  screen. A scale bar in the bottom-left corner shows what a round
  millimeter length looks like at the current zoom. **⊡ Fit View**
  (toolbar) reframes the whole layout — handy after panning away, or after
  a root delete leaves pieces sitting far from wherever the view happens
  to be centered.
- "Start from a Template" opens a modal with all 10 starter layouts, each
  built and closure-checked with the actual graph engine (not
  hand-derived) and shown with a real preview — not a separately authored
  image, but the template's own `LayoutGraph` replayed and its actual
  piece outlines drawn to scale, so the preview can't drift out of sync
  with what choosing the card actually places. Covers two plain loops (a
  tight curve45 circle and an even tighter 4-piece curve90 loop), a
  stadium oval, a figure-8, and six variants of that same oval with a
  different dead-end hanging off it — a 4-way crossing siding, a
  Y-turnout switch yard, a bare crossing-spur halt, a snake-curve siding,
  a curve+straight switch fork, and a bridge ramp overpass that climbs to
  level 1 and back down.
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
  coupler automatically when needed. You can also jump straight into it
  from the ordinary attach picker (the popup a free port normally opens) —
  a "⚡ Or Smart Join from here" option uses that same port as the source,
  instead of cancelling out to the toolbar and re-clicking the port.
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
  Entering a filament cost per kg (no currency assumed — whatever you
  actually pay, in whatever currency) turns the existing "grams if printed
  100% solid" figure into a matching cost estimate, with the same honest
  upper-bound caveat: real usage is typically 20–60% of this once your
  slicer's infill and walls are accounted for, so treat the cost the same
  way. It's saved with the layout file, but not carried over when you
  start a template (same treatment as "My Inventory" — your own numbers
  shouldn't reset just because you tried a template, but a shared file's
  numbers are that file's own).
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

`src/data/pieceDefs.ts` turns those numbers into all eighteen piece types
(ports + outline shapes): straight, half straight, short straight, 45°
and 90° curves (each with an opposite-hand version), a Y-turnout, a
curve+straight turnout (with an opposite-hand version), a 4-way crossing,
a snake curve (each with an opposite-hand version — see below), a crossing
with a short spur instead of a second full crossing arm, two bridge ramp
pieces (see below), and two peg-at-both-ends connectors, the dogbone and
the shorter peg coupler (join two socket-ended pieces facing each other —
the one case no ordinary piece can handle, since every ordinary piece has
exactly one peg and one socket). The connectors and mirror-image pieces are hidden from the
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

**Bridge Ramp — Up / Down.** These are real, sourced pieces (torwan's
`generate_bridge()`, 14° angle, 100mm radius) that physically climb from
ground level to an elevated height and back down. This app is 2D
top-down only (see "what's not here yet" below), so on the canvas
they're placed as plain straight-line pieces using their real
*horizontal* span, at the same (x, y) they'd occupy if they were flat —
nothing here pictures the physical "up and over" arc, or checks whether
an elevated piece actually clears whatever it's meant to cross. What the
canvas *does* track and show is which discrete height **level** every
piece is at (see "Levels" below) — so even though nothing visually rises,
it's still obvious at a glance which pieces are elevated versus which
are back at ground. To build a full crossing: Ramp Up (ground → peak,
socket → peg) → an ordinary straight piece as the tilted deck (any
length; 100mm lands the crossing at roughly 63mm of real clearance, per
`track-spec.json`'s `bridgeHeightMm` — though the app itself only tracks
the *step*, not this mm figure, see below) → Ramp Down (peak → ground).
Ramp Down is unusual among this app's pieces: *both* its ports are
sockets (matching the real part), not the usual one-socket-one-peg
pattern — so both connecting it to the deck and continuing past its far
end need a peg-offering piece, same as anywhere else two sockets meet.

**Levels.** Every piece sits at a whole-number height tier — 0 is
wherever your layout started, +1 is one ramp-up away, -1 one ramp-down,
and so on (a Ramp piece itself straddles two: its low end is one tier,
its high end the next). Every ordinary piece keeps both its ports at the
same tier as whatever it's attached to; only the two Ramp pieces change
it. A piece that isn't at tier 0 gets a dashed, tinted outline, a small
drop shadow, and a "L1"-style label at its center; a free port off the
starting tier gets the same small label next to it. This is deliberately
a step count, not a physical height in mm: real bridge height mostly
comes from *tilting* the ordinary straight piece used as the deck, and
this app has no notion of grade or slope for a piece to tilt — a straight
is always flat, whichever role it's playing. Levels also feed loop
closure: two free ports at different tiers are never reported as closed
even if their (x, y) and heading happen to line up, since physically they
aren't the same connection point. Because there's no collision detection
anywhere in this app (never has been — see "How the layout works" above),
nothing stops a piece at one level from occupying the same (x, y) as a
piece at another — that's exactly the "track running under an elevated
one" case, and the dashed styling plus the level label is what keeps it
legible when it happens, rather than looking like an accidental overlap.
Pieces also draw in level order (lowest first), so where two do overlap,
the higher one visually sits on top, matching which one would really be
on top.

**3D preview.** The toolbar's 3D View toggle switches from the flat plan
to an orbitable 3D scene (2D stays the default on load; the 3D view — and
the `three` library it needs — only loads once you switch to it). 16 of
the app's 18 piece types render their real printed STL mesh (the exact
same file Export STL bundles), not a schematic approximation: each STL's
own local coordinate frame was measured (via three's `STLLoader` run
against every file in `public/stl/`) and compared against this app's own
outline/port bounding box to find the transform (an offset, and for the
handful of files whose travel axis runs along their own Y instead of X,
a real 90° rotation about the vertical axis) that lines the mesh up with
this app's port-local frame — see `src/data/stlAlignment.ts` for the
reasoning and `src/components/Canvas3D.tsx` for where it's applied. That
transform was derived from measurement, not guessed, but measurement
alone wasn't enough to catch every mistake: an early version used a bare
coordinate swap for those rotated files instead of an actual rotation —
mathematically a reflection, not a rotation, which mirrors a piece's fine
detail but doesn't show up as a visible gap between two connected pieces
(the check used at the time). It only became obvious once a *closed loop*
of the affected pieces was rendered and didn't close — see that file's
comment for the fix. Any future changes here should re-check against a
closed loop (Simple Circle, Tight Quad Loop, or Switch Yard all work),
not just an isolated connected pair.
**bridgeGround uses its real STL too** — its height rises cleanly along
the same travel axis every other rotated piece uses, port a sitting
right at Z=0, so once the rotation-vs-reflection bug above was fixed
there was nothing left uniquely risky about it. **bridgeSlope is the one
remaining exception.** Its mesh isn't just a thin sloped deck: it
includes a full support structure reaching most of the way to the
ground well below either port, so the piece's own bounding box (74.79mm
tall) has nothing to do with the ~10.9mm real rise between its two
connectors. Those two connectors WERE locatable — narrow, near-flat
vertex clusters near each end of the mesh, 10.71mm apart, matching this
piece's own sourced `riseMm` (10.87mm) closely enough to trust — and
calibrating against them produced numbers that looked internally
consistent. But the rendered result was an unconvincing blocky mass, not
a recognizable ramp — worse than the schematic it would have replaced.
So it still uses that schematic approach: extruded from the same 2D
outline the canvas draws, then tilted by a real, sourced amount
(`riseMm = lengthMm * tan(angleDeg)`, using the source's 14° bridge
angle — kept on `Port.riseMm`, a continuous-mm field separate from the
discrete `level` used everywhere else). Numeric agreement with a sourced
value turned out not to be sufficient confidence on its own here — this
is the one piece in the app where the render was the tiebreaker over the
math.

**Port diagrams.** The "which port?" step of the attach picker — the one
that used to just list bare port ids like `left`/`right`/`common` — now
shows the piece's own outline with every candidate port drawn as a
labelled, clickable dot at its real position (`PiecePortDiagram.tsx`,
reusing the same outline data `PieceThumbnail` already draws elsewhere).
Hovering a port in the list below highlights its dot on the diagram, and
the dot itself is clickable — so picking a specific branch of a
Y-turnout or a specific arm of a crossing no longer means guessing what
a one-letter id refers to.

The source repo also has a real bridge pillar STL
(`bridge_pillar_14deg_r100mm_s205mm_p50mm.stl`) that this app deliberately
does *not* add as a placeable piece: it's a perpendicular support prop, not
something a train travels through, so it has no inline connector ports —
there's nothing for the port-graph model to attach it by. Print pillars
separately, sized to the bridge height above, wherever an elevated section
needs support. There is no tunnel piece in torwan's generator at all — one
isn't included here either, since inventing dimensions for it would break
every other piece's "nothing here is guessed" guarantee.

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

**Continuous height on the 2D plan.** Ports carry a discrete level (see
"Levels" above), which is enough to make elevation visible on the flat
canvas and to keep closure detection honest — that was the actual gap
being asked for there. The 2D canvas itself still has no notion of
physical mm height or grade; it reads level numbers and dashed styling,
not a rising line. The 3D preview (see "3D preview" above) covers the
"can I actually picture this in 3D" need instead, and renders real STL
geometry for every piece type except bridgeSlope, which still falls back
to a schematic extruded-and-tilted shape rather than its own real,
continuously-rising mesh (see "3D preview" for why). **Tunnels:** there's
no tunnel module or
pre-generated tunnel STL anywhere in torwan's generator repo, so none is
offered here either — adding one would mean inventing dimensions, which
breaks the one rule
every other piece in this app follows.

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
