import { PIECE_DEFS } from "../data/pieceDefs";

interface InventoryPanelProps {
  inventory: Record<string, number>;
  onChange: (next: Record<string, number>) => void;
}

export default function InventoryPanel({ inventory, onChange }: InventoryPanelProps) {
  const setCount = (type: string, raw: string) => {
    const n = Math.max(0, Math.floor(Number(raw) || 0));
    onChange({ ...inventory, [type]: n });
  };

  return (
    <section>
      <h2>My Inventory</h2>
      <p className="muted inventory-hint">Pieces you already own, so the BOM above only counts what's left to print.</p>
      <table className="inventory-table">
        <tbody>
          {PIECE_DEFS.map((def) => (
            <tr key={def.type}>
              <td>{def.label}</td>
              <td>
                <input
                  type="number"
                  min={0}
                  inputMode="numeric"
                  value={inventory[def.type] ?? 0}
                  onChange={(e) => setCount(def.type, e.target.value)}
                  aria-label={`Owned ${def.label}`}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
