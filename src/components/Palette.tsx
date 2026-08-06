import { VISIBLE_PIECE_DEFS } from "../data/pieceDefs";
import PieceThumbnail from "./PieceThumbnail";

interface PaletteProps {
  isEmpty: boolean;
  onSelectRoot: (type: string) => void;
}

// A permanent, browsable catalog of every piece — separate from the popup
// that appears when you click a free port. That popup is how pieces
// actually get attached (per-port, so the choice of which piece fits
// depends on the target's gender); this panel exists purely so you can see
// what each piece looks like without having to place one first.
export default function Palette({ isEmpty, onSelectRoot }: PaletteProps) {
  return (
    <div className="palette">
      <h2>Piece Library</h2>
      <p className="muted palette-hint">
        {isEmpty
          ? "Click a piece to start your layout."
          : "Attach more by clicking a free port on the canvas."}
      </p>
      <div className="palette-grid">
        {VISIBLE_PIECE_DEFS.map((def) => (
          <button
            key={def.type}
            className="palette-card"
            disabled={!isEmpty}
            onClick={() => onSelectRoot(def.type)}
            title={isEmpty ? `Start with ${def.label}` : def.label}
          >
            <PieceThumbnail def={def} />
            <span className="palette-card-label">{def.shortLabel}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
