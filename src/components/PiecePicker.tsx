import { useState } from "react";
import { VISIBLE_PIECE_DEFS, ATTACHABLE_PIECE_DEFS, PIECE_DEFS_BY_TYPE } from "../data/pieceDefs";
import PieceThumbnail from "./PieceThumbnail";
import PiecePortDiagram from "./PiecePortDiagram";
import type { Gender, Port } from "../model/types";

interface PiecePickerProps {
  screenPos: { x: number; y: number };
  // The gender the piece being attached must offer at its connecting port.
  // Undefined when placing the very first piece, which has nothing to mate
  // against.
  requiredGender?: Gender;
  onChoose: (type: string, portId: string) => void;
  onCancel: () => void;
  // Jumps straight into Smart Join using the port this picker was opened
  // for as the source, instead of attaching one specific piece. Only
  // meaningful when there's an actual port involved (requiredGender set) —
  // undefined when placing the very first piece.
  onSmartJoin?: () => void;
}

function compatiblePorts(ports: Port[], requiredGender?: Gender): Port[] {
  return requiredGender ? ports.filter((p) => p.gender === requiredGender) : ports;
}

export default function PiecePicker({
  screenPos,
  requiredGender,
  onChoose,
  onCancel,
  onSmartJoin,
}: PiecePickerProps) {
  const [pendingType, setPendingType] = useState<string | null>(null);
  const [hoveredPortId, setHoveredPortId] = useState<string | null>(null);

  // Placing the very first piece (no target to match) only offers the
  // normal browsable set; attaching onto an existing port also offers the
  // dogbone when it's the only compatible piece (see ATTACHABLE_PIECE_DEFS).
  const pool = requiredGender ? ATTACHABLE_PIECE_DEFS : VISIBLE_PIECE_DEFS;
  const options = pool.filter((def) => compatiblePorts(def.ports, requiredGender).length > 0);

  const left = Math.min(screenPos.x, window.innerWidth - 300);
  const top = Math.min(screenPos.y, window.innerHeight - 340);
  const style = { left: Math.max(8, left), top: Math.max(8, top) };

  if (pendingType) {
    const def = PIECE_DEFS_BY_TYPE[pendingType];
    const ports = compatiblePorts(def.ports, requiredGender);
    return (
      <div className="piece-picker" style={style}>
        <div className="piece-picker-header">
          <button className="piece-picker-back" onClick={() => setPendingType(null)}>
            ← back
          </button>
          <span>{def.label}: which port?</span>
        </div>
        <PiecePortDiagram
          def={def}
          ports={ports}
          hoveredPortId={hoveredPortId}
          onSelectPort={(portId) => onChoose(pendingType, portId)}
          onHoverPort={setHoveredPortId}
        />
        <ul className="piece-picker-list">
          {ports.map((p) => (
            <li key={p.id}>
              <button
                onClick={() => onChoose(pendingType, p.id)}
                onPointerEnter={() => setHoveredPortId(p.id)}
                onPointerLeave={() => setHoveredPortId(null)}
                className={p.id === hoveredPortId ? "piece-picker-port-hovered" : undefined}
              >
                {p.id} <span className="piece-picker-port-gender">({p.gender})</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className="piece-picker piece-picker-grid-wrap" style={style}>
      <div className="piece-picker-header">
        <span>{requiredGender ? `Attach a piece (needs a ${requiredGender})` : "Place first piece"}</span>
        <button className="piece-picker-close" onClick={onCancel}>
          ×
        </button>
      </div>
      {onSmartJoin && (
        <button className="piece-picker-smart-join" onClick={onSmartJoin}>
          ⚡ Or Smart Join from here — light up every port this one can reach
        </button>
      )}
      <div className="piece-picker-grid">
        {options.map((def) => {
          const ports = compatiblePorts(def.ports, requiredGender);
          return (
            <button
              key={def.type}
              className="palette-card"
              title={def.label}
              onClick={() => {
                // Placing the very first piece: no target port to match, so
                // which local port we "used" is irrelevant. Skip straight
                // to placing it.
                if (!requiredGender || ports.length === 1) onChoose(def.type, ports[0].id);
                else setPendingType(def.type);
              }}
            >
              <PieceThumbnail def={def} size={44} />
              <span className="palette-card-label">{def.shortLabel}</span>
            </button>
          );
        })}
        {options.length === 0 && <p className="piece-picker-empty">No compatible pieces</p>}
      </div>
    </div>
  );
}
