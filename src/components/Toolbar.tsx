interface ToolbarProps {
  canDeleteLast: boolean;
  canDeleteSelected: boolean;
  onDeleteLast: () => void;
  onDeleteSelected: () => void;
}

export default function Toolbar({
  canDeleteLast,
  canDeleteSelected,
  onDeleteLast,
  onDeleteSelected,
}: ToolbarProps) {
  return (
    <div className="toolbar">
      <div className="toolbar-heading">
        <span className="toolbar-title">TrainTrack Planner</span>
        <span className="toolbar-phase">Phase 1 · Planner, no export yet</span>
      </div>
      <div className="toolbar-actions">
        <button disabled={!canDeleteSelected} onClick={onDeleteSelected}>
          Delete Selected
        </button>
        <button disabled={!canDeleteLast} onClick={onDeleteLast}>
          Delete Last Piece
        </button>
      </div>
    </div>
  );
}
