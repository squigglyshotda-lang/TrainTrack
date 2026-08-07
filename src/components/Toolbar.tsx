interface ToolbarProps {
  canDeleteLast: boolean;
  canDeleteSelected: boolean;
  onDeleteLast: () => void;
  onDeleteSelected: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  canExport: boolean;
  isExporting: boolean;
  onExport: () => void;
  onExportPdf: () => void;
  canSave: boolean;
  onSave: () => void;
  onLoadClick: () => void;
  onCopyShareLink: () => void;
  shareStatus: "idle" | "copied";
  canJoin: boolean;
  joinMode: boolean;
  onToggleJoinMode: () => void;
  canFitView: boolean;
  onFitView: () => void;
  canClear: boolean;
  onClear: () => void;
}

export default function Toolbar({
  canDeleteLast,
  canDeleteSelected,
  onDeleteLast,
  onDeleteSelected,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  canExport,
  isExporting,
  onExport,
  onExportPdf,
  canSave,
  onSave,
  onLoadClick,
  onCopyShareLink,
  shareStatus,
  canJoin,
  joinMode,
  onToggleJoinMode,
  canFitView,
  onFitView,
  canClear,
  onClear,
}: ToolbarProps) {
  return (
    <div className="toolbar">
      <div className="toolbar-heading">
        <span className="toolbar-title">Choo Builder</span>
        <span className="toolbar-phase">Planner · export · inventory · sharing</span>
      </div>
      <div className="toolbar-actions">
        <button disabled={!canUndo} onClick={onUndo} title="Undo">
          Undo
        </button>
        <button disabled={!canRedo} onClick={onRedo} title="Redo">
          Redo
        </button>
        <span className="toolbar-divider" aria-hidden="true" />
        <button disabled={!canDeleteSelected} onClick={onDeleteSelected}>
          Delete Selected
        </button>
        <button disabled={!canDeleteLast} onClick={onDeleteLast}>
          Delete Last Piece
        </button>
        <button disabled={!canClear} onClick={onClear} title="Delete the whole layout and start over">
          Clear Canvas
        </button>
        <span className="toolbar-divider" aria-hidden="true" />
        <button disabled={!canFitView} onClick={onFitView} title="Frame the whole layout in view">
          ⊡ Fit View
        </button>
        <span className="toolbar-divider" aria-hidden="true" />
        <button
          disabled={!canJoin && !joinMode}
          onClick={onToggleJoinMode}
          className={joinMode ? "toolbar-join-active" : undefined}
          title="Pick a free port, and only the ports it can actually reach will light up"
        >
          {joinMode ? "⚡ Smart Join (on)" : "⚡ Smart Join"}
        </button>
        <span className="toolbar-divider" aria-hidden="true" />
        <button onClick={onLoadClick}>Load Layout…</button>
        <button disabled={!canSave} onClick={onSave}>
          Save Layout
        </button>
        <button disabled={!canSave} onClick={onCopyShareLink}>
          {shareStatus === "copied" ? "Link Copied ✓" : "Copy Share Link"}
        </button>
        <span className="toolbar-divider" aria-hidden="true" />
        <button disabled={!canExport} onClick={onExportPdf}>
          Export PDF
        </button>
        <button className="toolbar-export" disabled={!canExport || isExporting} onClick={onExport}>
          {isExporting ? "Exporting…" : "Export STL (.zip)"}
        </button>
      </div>
    </div>
  );
}
