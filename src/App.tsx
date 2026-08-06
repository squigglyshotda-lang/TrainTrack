import { useEffect, useRef, useState } from "react";
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
import { PIECE_DEFS_BY_TYPE } from "./data/pieceDefs";
import { exportBomAsZip } from "./model/exportStl";
import { exportLayoutAsPdf } from "./model/exportPdf";
import { buildShareUrl, readLayoutFromLocationHash } from "./model/shareLink";
import { findJoinPath, placeJoinPath } from "./model/autoJoin";
import "./app.css";

interface SelectedPort {
  pieceId: string;
  portId: string;
}

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
  const [selectedPorts, setSelectedPorts] = useState<SelectedPort[]>([]);
  const [pending, setPending] = useState<PendingPick | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [bannerError, setBannerError] = useState<string | null>(null);
  const [inventory, setInventory] = useState<Record<string, number>>({});
  const [shareStatus, setShareStatus] = useState<"idle" | "copied">("idle");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const closures = graph.detectClosures();
  const canUndo = history.index > 0;
  const canRedo = history.index < history.entries.length - 1;
  const selectedPortKeys = new Set(selectedPorts.map((p) => `${p.pieceId}:${p.portId}`));

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
    setSelectedPorts([]);
    if (graph.isEmpty()) {
      setPending({ screenPos, target: null });
    } else {
      setPending(null);
    }
  };

  const handlePortClick = (info: FreePortInfo, screenPos: { x: number; y: number }) => {
    setSelectedPorts([]);
    setPending({
      screenPos,
      target: { pieceId: info.pieceId, portId: info.port.id, gender: info.port.gender },
    });
  };

  // Shift-click on a free port builds up to two selected ports for the
  // Join feature, instead of opening the attach picker. Clicking a third
  // port starts a fresh pair rather than growing past two.
  const handlePortShiftClick = (info: FreePortInfo) => {
    setSelectedId(null);
    setPending(null);
    const key: SelectedPort = { pieceId: info.pieceId, portId: info.port.id };
    setSelectedPorts((prev) => {
      const already = prev.findIndex((p) => p.pieceId === key.pieceId && p.portId === key.portId);
      if (already !== -1) return prev.filter((_, i) => i !== already);
      if (prev.length >= 2) return [key];
      return [...prev, key];
    });
  };

  const handlePieceClick = (pieceId: string) => {
    setSelectedId(pieceId);
    setSelectedPorts([]);
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
    setSelectedPorts([]);
    setPending(null);
    setHistory({ entries: [newGraph.serialize()], index: 0 });
  };

  const handleDeleteLast = () => {
    graph.deleteLast();
    setSelectedId(null);
    setSelectedPorts([]);
    commit();
  };

  const handleDeleteSelected = () => {
    if (!selectedId) return;
    graph.deletePiece(selectedId);
    setSelectedId(null);
    commit();
  };

  const handleFlipSelected = (pieceId: string) => {
    graph.flipPiece(pieceId);
    commit();
  };

  // Replacing = delete this piece (and anything built on it) and reopen
  // the picker at the same spot it was attached, so the user picks
  // whatever should go there instead. Reuses the exact same picker flow
  // as clicking a free port — this just clears the old piece first.
  const handleReplaceSelected = (pieceId: string, screenPos: { x: number; y: number }) => {
    const att = graph.attachmentsByChild.get(pieceId);
    setSelectedId(null);
    if (att) {
      const { parentPieceId, parentPortId } = att;
      const parent = graph.pieces.get(parentPieceId)!;
      const parentPort = PIECE_DEFS_BY_TYPE[parent.type].ports.find((p) => p.id === parentPortId)!;
      graph.deletePiece(pieceId);
      commit();
      setPending({ screenPos, target: { pieceId: parentPieceId, portId: parentPortId, gender: parentPort.gender } });
    } else {
      graph.deletePiece(pieceId);
      commit();
      setPending({ screenPos, target: null });
    }
  };

  // Searches for a sequence of pieces connecting the two selected ports
  // and places it if one's found. This is a real search (see autoJoin.ts),
  // not guaranteed to succeed — most arbitrary port pairs don't have an
  // exact match within the same tolerance the rest of the app uses for
  // loop closures, so failure is reported plainly rather than forced.
  const handleJoinSelectedPorts = () => {
    if (selectedPorts.length !== 2) return;
    const free = graph.freePorts();
    const [a, b] = selectedPorts.map(
      (sel) => free.find((fp) => fp.pieceId === sel.pieceId && fp.port.id === sel.portId)!
    );
    if (!a || !b) {
      setBannerError("One of the selected ports isn't free anymore.");
      setSelectedPorts([]);
      return;
    }

    setBannerError(null);
    const result = findJoinPath(
      { pos: a.worldPos, headingDeg: a.worldHeadingDeg, gender: a.port.gender },
      { pos: b.worldPos, headingDeg: b.worldHeadingDeg, gender: b.port.gender }
    );

    if (!result) {
      const bothPeg = a.port.gender === "peg" && b.port.gender === "peg";
      setBannerError(
        bothPeg
          ? "Can't join two peg ends — nothing in this piece library bridges two pegs (real BRIO connectors can't do this either)."
          : "Couldn't find a piece combination that connects those two ports within the usual closure tolerance. Try two ports that are more directly aligned."
      );
      return;
    }

    if (result.pieceTypes.length === 0) {
      setBannerError(`Those two ports already line up (gap ${result.gapMm.toFixed(1)}mm) — nothing to add.`);
      setSelectedPorts([]);
      return;
    }

    placeJoinPath(graph, a.pieceId, a.port.id, result.pieceTypes);
    setSelectedPorts([]);
    commit();
  };

  // Delete / Backspace remove the selected piece, unless the user is
  // typing in a field (the inventory counts, most likely).
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || target?.isContentEditable) return;
      if ((e.key === "Delete" || e.key === "Backspace") && selectedId) {
        e.preventDefault();
        handleDeleteSelected();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  const handleUndo = () => {
    if (!canUndo) return;
    const newIndex = history.index - 1;
    graphRef.current = LayoutGraph.fromSerialized(history.entries[newIndex]);
    setSelectedId(null);
    setSelectedPorts([]);
    setHistory((prev) => ({ ...prev, index: newIndex }));
  };

  const handleRedo = () => {
    if (!canRedo) return;
    const newIndex = history.index + 1;
    graphRef.current = LayoutGraph.fromSerialized(history.entries[newIndex]);
    setSelectedId(null);
    setSelectedPorts([]);
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
    a.download = "choo-builder-layout.json";
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
        throw new Error("That doesn't look like a Choo Builder layout file.");
      }
      const newGraph = LayoutGraph.fromSerialized(data.layout);
      graphRef.current = newGraph;
      setSelectedId(null);
      setSelectedPorts([]);
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
          onPortShiftClick={handlePortShiftClick}
          onPieceClick={handlePieceClick}
          onEmptyCanvasClick={handleEmptyCanvasClick}
          selectedId={selectedId}
          selectedPortKeys={selectedPortKeys}
          onJoinSelectedPorts={handleJoinSelectedPorts}
          closures={closures}
          onFlipSelected={handleFlipSelected}
          onReplaceSelected={handleReplaceSelected}
          onDeleteSelected={handleDeleteSelected}
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
