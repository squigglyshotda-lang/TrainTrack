interface SelectionMenuProps {
  screenPos: { x: number; y: number };
  canFlip: boolean;
  onFlip: () => void;
  onReplace: () => void;
  onDelete: () => void;
}

// The contextual menu that floats above a selected piece. Flip only shows
// up for pieces that actually have a mirror-image counterpart (see
// MIRROR_PARTNER in pieceDefs.ts) — a straight or a Y-turnout looks
// identical either way, so there's nothing useful to flip.
export default function SelectionMenu({ screenPos, canFlip, onFlip, onReplace, onDelete }: SelectionMenuProps) {
  // CSS centers the menu on `left` (translateX(-50%)), so clamp around an
  // estimated half-width rather than treating left as the box's edge.
  const halfWidth = 100;
  const left = Math.min(Math.max(halfWidth + 8, screenPos.x), window.innerWidth - halfWidth - 8);
  const top = Math.min(Math.max(8, screenPos.y), window.innerHeight - 50);

  return (
    <div className="selection-menu" style={{ left, top }}>
      {canFlip && (
        <button onClick={onFlip} title="Mirror this piece in place">
          ⇋ Flip
        </button>
      )}
      <button onClick={onReplace} title="Swap this piece for a different one">
        Replace
      </button>
      <button className="selection-menu-delete" onClick={onDelete} title="Delete this piece">
        Delete
      </button>
    </div>
  );
}
