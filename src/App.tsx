import { useRef, useState } from "react";
import Canvas from "./components/Canvas";
import PiecePicker from "./components/PiecePicker";
import BOMPanel from "./components/BOMPanel";
import InventoryPanel from "./components/InventoryPanel";
import Palette from "./components/Palette";
import TemplatesPanel from "./components/TemplatesPanel";
import Toolbar from "./components/Toolbar";
import { LayoutGraph } from "./model/graph";
import type { FreePortInfo, SerializedLayout } from "./model/graph";
import type { Gender } from "./model/types";
import type { Template } from "./data/templates";
import { exportBomAsZip } from "./model/exportStl";
import { exportLayoutAsPdf } from "./model/exportPdf";
import { buildShareUrl, readLayoutFromLocationHash } from "./model/shareLink";
import "./app.css";

interface PendingPick {
  screenPos: { x: number; y: number };
  target: { pieceId: string; portId: string; gender: Gender } | null;
}

interface HistoryState {
  entries: SerializedLayout[];
  index: number;
}

interface SavedFile {
  layout: SerializedLayout;
  inventory?: Record<string, number>;
}

function opposite(g: Gender): Gender {
  return g === "peg" ? "socket" : "peg";
}

// A page load can carry a shared layout in the URL's hash fragment. Reading
// it here (rather than in an effect after first paint) means a shared link
// renders its layout immediately, with no empty-then-populated flash.
function initialGraph(): LayoutGraph {
  const shared = readLayoutFromLocationHash();
  if (shared) {
    try {
      return LayoutGraph.fromSerialized(shared);
    } catch {
      // Malformed hash — fall through to a normal empty start.
    }
  }
  return new LayoutGraph();
}

export default function App() {
  const graphRef = useRef<LayoutGraph | null>(null);
  if (graphRef.current === null) graphRef.current = initialGraph();
  const graph = graphRef.current;

  const [history, setHistory] = useState<HistoryState>(() => ({
    entries: [graph.serialize()],
    index: 0,
  }));

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingPick | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [bannerError, setBannerError] = useState<string | null>(null);
  const [inventory, setInventory] = useState<Record<string, number>>({});
  const [shareStatus, setShareStatus] = useState<"idle" | "copied">("idle");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const closures = graph.detectClosures();
  const canUndo = history.index > 0;
  const canRedo = history.index < history.entries.length - 1;

  // Every mutation (place, attach, delete) funnels through here: snapshot
  // the graph's action list, drop any redo tail, and push it as the new
  // "now". Undo/redo just moves a pointer through these snapshots and
  // rebuilds a fresh graph from whichever one it lands on — the same
  // replay path used by file load.
  const commit = () => {
    const snapshot = graph.serialize();
    setHistory((prev) => {
      const entries = [...prev.entries.slice(0, prev.index + 1), snapshot];
      return { entries, index: entries.length - 1 };
    });
  };

  const handleEmptyCanvasClick = (screenPos: { x: number; y: number }) => {
    setSelectedId(null);
    if (graph.isEmpty()) {
      setPending({ screenPos, target: null });
    } else {
      setPending(null);
    }
  };

  const handlePortClick = (info: FreePortInfo, screenPos: { x: number; y: number }) => {
    setPending({
      screenPos,
      target: { pieceId: info.pieceId, portId: info.port.id, gender: info.port.gender },
    });
  };

  const handlePieceClick = (pieceId: string) => {
    setSelectedId(pieceId);
    setPending(null);
  };

  const handleChoose = (type: string, portId: string) => {
    if (!pending) return;
    if (pending.target === null) {
      graph.placeRoot(type);
    } else {
      graph.attach(pending.target.pieceId, pending.target.portId, type, portId);
    }
    setPending(null);
    commit();
  };

  const handlePaletteSelectRoot = (type: string) => {
    if (!graph.isEmpty()) return;
    graph.placeRoot(type);
    commit();
  };

  const handleUseTemplate = (template: Template) => {
    if (!graph.isEmpty() && !window.confirm("This replaces your current layout. Continue?")) return;
    const newGraph = LayoutGraph.fromSerialized(template.layout);
    graphRef.current = newGraph;
    setSelectedId(null);
    setPending(null);
    setHistory({ entries: [newGraph.serialize()], index: 0 });
  };

  const handleDeleteLast = () => {
    graph.deleteLast();
    setSelectedId(null);
    commit();
  };

  const handleDeleteSelected = () => {
    if (!selectedId) return;
    graph.deletePiece(selectedId);
    setSelectedId(null);
    commit();
  };

  const handleUndo = () => {
    if (!canUndo) return;
    const newIndex = history.index - 1;
    graphRef.current = LayoutGraph.fromSerialized(history.entries[newIndex]);
    setSelectedId(null);
    setHistory((prev) => ({ ...prev, index: newIndex }));
  };

  const handleRedo = () => {
    if (!canRedo) return;
    const newIndex = history.index + 1;
    graphRef.current = LayoutGraph.fromSerialized(history.entries[newIndex]);
    setSelectedId(null);
    setHistory((prev) => ({ ...prev, index: newIndex }));
  };

  const handleExport = async () => {
    setBannerError(null);
    setIsExporting(true);
    try {
      await exportBomAsZip(graph.bom());
    } catch (err) {
      setBannerError(err instanceof Error ? err.message : "Export failed.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleSave = () => {
    const data: SavedFile = { layout: graph.serialize(), inventory };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "traintrack-layout.json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handleExportPdf = async () => {
    setBannerError(null);
    try {
      await exportLayoutAsPdf(graph);
    } catch (err) {
      setBannerError(err instanceof Error ? err.message : "PDF export failed.");
    }
  };

  const handleCopyShareLink = async () => {
    setBannerError(null);
    try {
      const url = buildShareUrl(graph.serialize());
      await navigator.clipboard.writeText(url);
      setShareStatus("copied");
      setTimeout(() => setShareStatus("idle"), 2000);
    } catch {
      setBannerError("Couldn't copy the link — your browser may be blocking clipboard access.");
    }
  };

  const handleLoadClick = () => fileInputRef.current?.click();

  const handleFileChosen = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-choosing the same file later
    if (!file) return;
    setBannerError(null);
    try {
      const text = await file.text();
      const data = JSON.parse(text) as Partial<SavedFile>;
      if (!data.layout || !Array.isArray(data.layout.actions)) {
        throw new Error("That doesn't look like a TrainTrack layout file.");
      }
      const newGraph = LayoutGraph.fromSerialized(data.layout);
      graphRef.current = newGraph;
      setSelectedId(null);
      setInventory(data.inventory ?? {});
      // Loading starts a fresh undo history at the loaded state, rather
      // than treating the load itself as one undoable step.
      setHistory({ entries: [newGraph.serialize()], index: 0 });
    } catch (err) {
      setBannerError(err instanceof Error ? err.message : "Could not load that file.");
    }
  };

  return (
    <div className="app">
      <Toolbar
        canDeleteLast={!graph.isEmpty()}
        canDeleteSelected={selectedId !== null}
        onDeleteLast={handleDeleteLast}
        onDeleteSelected={handleDeleteSelected}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={handleUndo}
        onRedo={handleRedo}
        canExport={!graph.isEmpty()}
        isExporting={isExporting}
        onExport={handleExport}
        onExportPdf={handleExportPdf}
        canSave={!graph.isEmpty()}
        onSave={handleSave}
        onLoadClick={handleLoadClick}
        onCopyShareLink={handleCopyShareLink}
        shareStatus={shareStatus}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json"
        style={{ display: "none" }}
        onChange={handleFileChosen}
      />
      {bannerError && (
        <div className="banner-error" role="alert">
          {bannerError}
          <button className="banner-error-dismiss" onClick={() => setBannerError(null)}>
            ×
          </button>
        </div>
      )}
      <div className="app-body">
        <div className="left-panel">
          <TemplatesPanel onUseTemplate={handleUseTemplate} />
          <Palette isEmpty={graph.isEmpty()} onSelectRoot={handlePaletteSelectRoot} />
        </div>
        <Canvas
          graph={graph}
          onPortClick={handlePortClick}
          onPieceClick={handlePieceClick}
          onEmptyCanvasClick={handleEmptyCanvasClick}
          selectedId={selectedId}
          closures={closures}
        />
        <div className="sidebar">
          <BOMPanel graph={graph} closures={closures} inventory={inventory} />
          <InventoryPanel inventory={inventory} onChange={setInventory} />
        </div>
      </div>
      {pending && (
        <PiecePicker
          screenPos={pending.screenPos}
          requiredGender={pending.target ? opposite(pending.target.gender) : undefined}
          onChoose={handleChoose}
          onCancel={() => setPending(null)}
        />
      )}
    </div>
  );
}
