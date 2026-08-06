import { useEffect, useRef, useState } from "react";
import Canvas from "./components/Canvas";
import type { CanvasHandle } from "./components/Canvas";
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
import { findJoinPath, findReachablePortKeys, placeJoinPath } from "./model/autoJoin";
import { fitDrawnPath } from "./model/drawFit";
import type { Point } from "./model/geometry";
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
  filamentCostPerKg?: number;
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
  const [filamentCostPerKg, setFilamentCostPerKg] = useState(0);
  const [shareStatus, setShareStatus] = useState<"idle" | "copied">("idle");
  // Smart Join: joinMode is the toolbar toggle; joinSource is the free port
  // picked as the start once it's on; reachableKeys is recomputed fresh
  // every time a source is picked, so it's always accurate to the graph as
  // it stands right now.
  const [joinMode, setJoinMode] = useState(false);
  const [joinSource, setJoinSource] = useState<SelectedPort | null>(null);
  const [reachableKeys, setReachableKeys] = useState<Set<string>>(new Set());
  // Hovering a free port (outside Smart Join, which already has its own
  // stronger click-committed highlight) previews the same reachability
  // check without picking anything — lets you check "what could connect
  // here" without committing to the join flow first.
  const [hoverReachableKeys, setHoverReachableKeys] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<CanvasHandle>(null);
  const closures = graph.detectClosures();
  const canUndo = history.index > 0;
  const canRedo = history.index < history.entries.length - 1;
  const joinSourceKey = joinSource ? `${joinSource.pieceId}:${joinSource.portId}` : null;

  const clearJoinSelection = () => {
    setJoinSource(null);
    setReachableKeys(new Set());
  };

  const handlePortHoverStart = (info: FreePortInfo) => {
    if (joinMode) return;
    setHoverReachableKeys(findReachablePortKeys(graph, info));
  };

  const handlePortHoverEnd = () => {
    setHoverReachableKeys(new Set());
  };

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
    clearJoinSelection();
    if (graph.isEmpty()) {
      setPending({ screenPos, target: null });
    } else {
      setPending(null);
    }
  };

  // Picks `info` as the Smart Join source and searches every other free
  // port for whether a piece combination can actually reach it (see
  // autoJoin.ts) — the ports that come back positive are the only ones
  // Canvas will light up, so there's nothing left to click that could fail.
  const selectJoinSource = (info: FreePortInfo) => {
    const reachable = findReachablePortKeys(graph, info);
    setJoinSource({ pieceId: info.pieceId, portId: info.port.id });
    setReachableKeys(reachable);
    setBannerError(
      reachable.size === 0
        ? "No other free port can be reached from here with the current piece set. Try a different starting port."
        : null
    );
  };

  // Completes a join onto a port already confirmed reachable from the
  // current source — re-runs the same search (the graph can't have changed
  // in between) to get the exact piece sequence, then places it for real.
  const completeJoin = (source: SelectedPort, targetInfo: FreePortInfo) => {
    const free = graph.freePorts();
    const a = free.find((fp) => fp.pieceId === source.pieceId && fp.port.id === source.portId);
    if (!a) {
      setBannerError("The starting port isn't free anymore — pick a new one.");
      clearJoinSelection();
      return;
    }
    const result = findJoinPath(
      { pos: a.worldPos, headingDeg: a.worldHeadingDeg, gender: a.port.gender },
      { pos: targetInfo.worldPos, headingDeg: targetInfo.worldHeadingDeg, gender: targetInfo.port.gender }
    );
    if (!result) {
      setBannerError("That connection stopped working — something else in the layout changed. Pick a source again.");
      clearJoinSelection();
      return;
    }
    if (result.pieceTypes.length === 0) {
      setBannerError(`Those two ports already line up (gap ${result.gapMm.toFixed(1)}mm) — nothing to add.`);
    } else {
      placeJoinPath(graph, a.pieceId, a.port.id, result.pieceTypes);
      commit();
      setBannerError(null);
    }
    clearJoinSelection();
  };

  const handlePortClick = (info: FreePortInfo, screenPos: { x: number; y: number }) => {
    if (joinMode) {
      const key = `${info.pieceId}:${info.port.id}`;
      if (!joinSource) {
        selectJoinSource(info);
      } else if (key === joinSourceKey) {
        clearJoinSelection();
      } else if (reachableKeys.has(key)) {
        completeJoin(joinSource, info);
      } else {
        // Not reachable from the current source — treat it as picking a
        // new source instead of a dead click.
        selectJoinSource(info);
      }
      return;
    }
    setPending({
      screenPos,
      target: { pieceId: info.pieceId, portId: info.port.id, gender: info.port.gender },
    });
  };

  const handleToggleJoinMode = () => {
    setJoinMode((prev) => !prev);
    clearJoinSelection();
    setSelectedId(null);
    setPending(null);
  };

  const handlePieceClick = (pieceId: string) => {
    setSelectedId(pieceId);
    setJoinMode(false);
    clearJoinSelection();
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
    clearJoinSelection();
    setPending(null);
    setHistory({ entries: [newGraph.serialize()], index: 0 });
  };

  const handleDeleteLast = () => {
    graph.deleteLast();
    setSelectedId(null);
    clearJoinSelection();
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

  // Fits pieces to a freehand-drawn path (see drawFit.ts) starting from the
  // free port the drag began on. This is a curve-fit, not an exact search
  // like join — it won't always use every bit of the drawn line, and says
  // so plainly rather than forcing pieces past where the fit stopped
  // working.
  const handleDrawPathComplete = (info: FreePortInfo, worldPoints: Point[]) => {
    setSelectedId(null);
    clearJoinSelection();
    setPending(null);
    setBannerError(null);

    const result = fitDrawnPath(
      { pos: info.worldPos, headingDeg: info.worldHeadingDeg, gender: info.port.gender },
      worldPoints
    );

    if (result.pieceTypes.length === 0) {
      setBannerError("Couldn't fit any track pieces to that drawing — try a longer or gentler stroke.");
      return;
    }

    placeJoinPath(graph, info.pieceId, info.port.id, result.pieceTypes);
    commit();

    if (result.stoppedEarly) {
      setBannerError(
        `Placed ${result.pieceTypes.length} piece${result.pieceTypes.length === 1 ? "" : "s"} following your ` +
          `drawing, but the shape did something the pieces couldn't quite follow after that ` +
          `(used ${Math.round(result.pathUsedMm)}mm of the ${Math.round(result.totalPathMm)}mm you drew). ` +
          `Draw again from the new end to keep going.`
      );
    }
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
    clearJoinSelection();
    setHistory((prev) => ({ ...prev, index: newIndex }));
  };

  const handleRedo = () => {
    if (!canRedo) return;
    const newIndex = history.index + 1;
    graphRef.current = LayoutGraph.fromSerialized(history.entries[newIndex]);
    setSelectedId(null);
    clearJoinSelection();
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
    const data: SavedFile = { layout: graph.serialize(), inventory, filamentCostPerKg };
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
      clearJoinSelection();
      setInventory(data.inventory ?? {});
      setFilamentCostPerKg(data.filamentCostPerKg ?? 0);
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
        canJoin={graph.freePorts().length >= 2}
        joinMode={joinMode}
        onToggleJoinMode={handleToggleJoinMode}
        canFitView={!graph.isEmpty()}
        onFitView={() => canvasRef.current?.fitToView()}
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
          ref={canvasRef}
          graph={graph}
          onPortClick={handlePortClick}
          onDrawPathComplete={handleDrawPathComplete}
          onPieceClick={handlePieceClick}
          onEmptyCanvasClick={handleEmptyCanvasClick}
          selectedId={selectedId}
          joinMode={joinMode}
          joinSourceKey={joinSourceKey}
          reachableKeys={reachableKeys}
          onPortHoverStart={handlePortHoverStart}
          onPortHoverEnd={handlePortHoverEnd}
          hoverReachableKeys={hoverReachableKeys}
          closures={closures}
          onFlipSelected={handleFlipSelected}
          onReplaceSelected={handleReplaceSelected}
          onDeleteSelected={handleDeleteSelected}
        />
        <div className="sidebar">
          <BOMPanel
            graph={graph}
            closures={closures}
            inventory={inventory}
            filamentCostPerKg={filamentCostPerKg}
            onFilamentCostPerKgChange={setFilamentCostPerKg}
          />
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
