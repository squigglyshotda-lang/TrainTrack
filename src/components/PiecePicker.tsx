import { useState } from "react";
import { PIECE_DEFS, PIECE_DEFS_BY_TYPE } from "../data/pieceDefs";
import type { Gender, Port } from "../model/types";

interface PiecePickerProps {
  screenPos: { x: number; y: number };
  // The gender the piece being attached must offer at its connecting port.
  // Undefined when placing the very first piece, which has nothing to mate
  // against.
  requiredGender?: Gender;
  onChoose: (type: string, portId: string) => void;
  onCancel: () => void;
}

function compatiblePorts(ports: Port[], requiredGender?: Gender): Port[] {
  return requiredGender ? ports.filter((p) => p.gender === requiredGender) : ports;
}

export default function PiecePicker({ screenPos, requiredGender, onChoose, onCancel }: PiecePickerProps) {
  const [pendingType, setPendingType] = useState<string | null>(null);

  const options = PIECE_DEFS.filter((def) => compatiblePorts(def.ports, requiredGender).length > 0);

  const left = Math.min(screenPos.x, window.innerWidth - 260);
  const top = Math.min(screenPos.y, window.innerHeight - 300);
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
        <ul className="piece-picker-list">
          {ports.map((p) => (
            <li key={p.id}>
              <button onClick={() => onChoose(pendingType, p.id)}>{p.id}</button>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className="piece-picker" style={style}>
      <div className="piece-picker-header">
        <span>{requiredGender ? `Attach a piece (needs a ${requiredGender})` : "Place first piece"}</span>
        <button className="piece-picker-close" onClick={onCancel}>
          ×
        </button>
      </div>
      <ul className="piece-picker-list">
        {options.map((def) => {
          const ports = compatiblePorts(def.ports, requiredGender);
          return (
            <li key={def.type}>
              <button
                onClick={() => {
                  // Placing the very first piece: no target port to match, so
                  // which local port we "used" is irrelevant. Skip straight
                  // to placing it.
                  if (!requiredGender || ports.length === 1) onChoose(def.type, ports[0].id);
                  else setPendingType(def.type);
                }}
              >
                {def.label}
              </button>
            </li>
          );
        })}
        {options.length === 0 && <li className="piece-picker-empty">No compatible pieces</li>}
      </ul>
    </div>
  );
}
