import { useRef, useState } from "react";
import Canvas from "./components/Canvas";
import PiecePicker from "./components/PiecePicker";
import BOMPanel from "./components/BOMPanel";
import Toolbar from "./components/Toolbar";
import { LayoutGraph } from "./model/graph";
import type { FreePortInfo } from "./model/graph";
import type { Gender } from "./model/types";
import "./app.css";

interface PendingPick {
  screenPos: { x: number; y: number };
  target: { pieceId: string; portId: string; gender: Gender } | null;
}

function opposite(g: Gender): Gender {
  return g === "peg" ? "socket" : "peg";
}

export default function App() {
  const graphRef = useRef(new LayoutGraph());
  const [, setRevision] = useState(0);
  const bump = () => setRevision((v) => v + 1);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingPick | null>(null);

  const graph = graphRef.current;
  const closures = graph.detectClosures();

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
    bump();
  };

  const handleDeleteLast = () => {
    graph.deleteLast();
    setSelectedId(null);
    bump();
  };

  const handleDeleteSelected = () => {
    if (!selectedId) return;
    graph.deletePiece(selectedId);
    setSelectedId(null);
    bump();
  };

  return (
    <div className="app">
      <Toolbar
        canDeleteLast={!graph.isEmpty()}
        canDeleteSelected={selectedId !== null}
        onDeleteLast={handleDeleteLast}
        onDeleteSelected={handleDeleteSelected}
      />
      <div className="app-body">
        <Canvas
          graph={graph}
          onPortClick={handlePortClick}
          onPieceClick={handlePieceClick}
          onEmptyCanvasClick={handleEmptyCanvasClick}
          selectedId={selectedId}
          closures={closures}
        />
        <BOMPanel graph={graph} closures={closures} />
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
