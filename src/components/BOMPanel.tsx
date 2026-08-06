import type { LayoutGraph, ClosurePair } from "../model/graph";

interface BOMPanelProps {
  graph: LayoutGraph;
  closures: ClosurePair[];
}

export default function BOMPanel({ graph, closures }: BOMPanelProps) {
  const bom = graph.bom();
  const total = bom.reduce((sum, row) => sum + row.count, 0);

  return (
    <div className="sidebar">
      <section>
        <h2>Bill of Materials</h2>
        {bom.length === 0 ? (
          <p className="muted">No pieces placed yet.</p>
        ) : (
          <table className="bom-table">
            <tbody>
              {bom.map((row) => (
                <tr key={row.type}>
                  <td>{row.label}</td>
                  <td className="bom-count">×{row.count}</td>
                </tr>
              ))}
              <tr className="bom-total">
                <td>Total</td>
                <td className="bom-count">×{total}</td>
              </tr>
            </tbody>
          </table>
        )}
      </section>

      <section>
        <h2>Loop Closures</h2>
        {closures.length === 0 ? (
          <p className="muted">None detected.</p>
        ) : (
          <ul className="closure-list">
            {closures.map((c, i) => (
              <li key={i}>
                gap {c.gapMm.toFixed(1)}mm
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
