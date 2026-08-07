import { VISIBLE_PIECE_DEFS } from "../data/pieceDefs";
import PieceThumbnail from "./PieceThumbnail";

interface PaletteProps {
  isEmpty: boolean;
  onSelectRoot: (type: string) => void;
}

// A permanent, browsable catalog of every piece — separate from the popup
// that appears when you click a free port. That popup is how pieces get
// attached to something already on the canvas (per-port, so the choice of
// which piece fits depends on the target's gender); clicking a card here
// instead drops a new, independent piece — the first one to start a
// layout, or another unconnected one alongside whatever's already there
// (offset clear of it, so it never lands stacked on top of something
// existing). Clicking an empty spot on the canvas itself does the same
// thing, at the exact spot clicked instead of an offset guess.
export default function Palette({ isEmpty, onSelectRoot }: PaletteProps) {
  return (
    <div className="palette">
      <h2>Piece Library</h2>
      <p className="muted palette-hint">
        {isEmpty
          ? "Click a piece to start your layout."
          : "Click a piece to add a new, separate one — or attach more by clicking a free port on the canvas."}
      </p>
      <div className="palette-grid">
        {VISIBLE_PIECE_DEFS.map((def) => (
          <button
            key={def.type}
            className="palette-card"
            onClick={() => onSelectRoot(def.type)}
            title={isEmpty ? `Start with ${def.label}` : `Add a new ${def.label}`}
          >
            <PieceThumbnail def={def} />
            <span className="palette-card-label">{def.shortLabel}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
