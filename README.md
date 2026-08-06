# TrainTrack

A browser-based planner for BRIO-compatible wooden train track. Build a
layout by attaching pieces port-to-port, then (in a later phase) export the
exact set of pieces as 3D-printable STL files.

## Status: Phase 1 — planner only, no export

Top-down 2D layout only. No STL export yet.

## How the layout works

This is **not** free-form drag-and-drop with collision detection. The
layout is a graph: every piece has typed connection ports (a local
position, a heading, and a gender — peg or socket). Placing a piece means
solving one rigid transform that makes the chosen port coincide with the
target port, facing the opposite direction with the opposite gender.
On-screen position is always derived from that graph, never stored
separately.

- Click a free port, pick a piece from the popup, it attaches.
- Free ports are colored circles (solid blue = peg, orange ring = socket);
  occupied ports fade to small gray dots.
- The bill of materials in the sidebar updates live.
- A loop is "closed" when two free ports land within a few mm of each
  other, facing opposite directions with opposite genders — this is
  detected and reported (with the gap distance), never forced.

## Where the dimensions come from

Every physical measurement (track width, connector sizes, curve radius,
standard piece lengths) is in `src/data/track-spec.json`, with a comment
on each value naming exactly where it came from. Nothing is guessed — see
that file's `_meta` block for the source and a note on the one value that
had to be derived rather than measured (the half-straight length).

`src/data/pieceDefs.ts` turns those numbers into the six starter piece
types (ports + outline shapes); nothing in the UI hardcodes a dimension.

## Development

```bash
npm install
npm run dev      # starts the dev server
npm run build    # type-checks and produces a production build in dist/
```
