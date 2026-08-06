import spec from "../data/track-spec.json";
import { STL_LIBRARY } from "../data/stlLibrary";
import type { LayoutGraph, ClosurePair } from "../model/graph";

interface BOMPanelProps {
  graph: LayoutGraph;
  closures: ClosurePair[];
  inventory: Record<string, number>;
}

const BED_W = spec.printBed.widthMm.value;
const BED_D = spec.printBed.depthMm.value;
const PLA_DENSITY = spec.material.plaDensityGPerCm3.value;

function fitsOnBed(type: string): boolean {
  const entry = STL_LIBRARY[type];
  if (!entry) return true;
  // A piece can be rotated on the bed, so only the smaller footprint
  // dimension needs to fit the smaller bed dimension.
  const [a, b] = [entry.footprintXMm, entry.footprintYMm].sort((x, y) => x - y);
  const [bedA, bedB] = [BED_W, BED_D].sort((x, y) => x - y);
  return a <= bedA && b <= bedB;
}

export default function BOMPanel({ graph, closures, inventory }: BOMPanelProps) {
  const bom = graph.bom();
  const total = bom.reduce((sum, row) => sum + row.count, 0);
  const totalToPrint = bom.reduce((sum, row) => sum + Math.max(0, row.count - (inventory[row.type] ?? 0)), 0);

  const oversized = bom.filter((row) => !fitsOnBed(row.type));

  const solidVolumeMm3 = bom.reduce((sum, row) => {
    const toPrint = Math.max(0, row.count - (inventory[row.type] ?? 0));
    const entry = STL_LIBRARY[row.type];
    return sum + toPrint * (entry?.solidVolumeMm3 ?? 0);
  }, 0);
  const solidMassG = (solidVolumeMm3 / 1000) * PLA_DENSITY;

  return (
    <>
      <section>
        <h2>Bill of Materials</h2>
        {bom.length === 0 ? (
          <p className="muted">No pieces placed yet.</p>
        ) : (
          <table className="bom-table">
            <thead>
              <tr className="bom-header-row">
                <td>Piece</td>
                <td className="bom-count">Have</td>
                <td className="bom-count">Print</td>
              </tr>
            </thead>
            <tbody>
              {bom.map((row) => {
                const have = inventory[row.type] ?? 0;
                const toPrint = Math.max(0, row.count - have);
                return (
                  <tr key={row.type}>
                    <td>
                      {row.label}
                      {!fitsOnBed(row.type) && (
                        <span className="bom-flag" title={`Footprint exceeds the ${BED_W}×${BED_D}mm print bed`}>
                          ⚠
                        </span>
                      )}
                      <span className="bom-need-total">of {row.count}</span>
                    </td>
                    <td className="bom-count">{have}</td>
                    <td className="bom-count">{toPrint}</td>
                  </tr>
                );
              })}
              <tr className="bom-total">
                <td>Total</td>
                <td className="bom-count">{total - totalToPrint}</td>
                <td className="bom-count">{totalToPrint}</td>
              </tr>
            </tbody>
          </table>
        )}
        {oversized.length > 0 && (
          <p className="bom-bed-warning">
            ⚠ {oversized.map((r) => r.label).join(", ")} won't fit a {BED_W}×{BED_D}mm bed in one piece.
          </p>
        )}
      </section>

      <section>
        <h2>Estimated Material</h2>
        {totalToPrint === 0 ? (
          <p className="muted">Nothing left to print.</p>
        ) : (
          <>
            <p className="material-figure">
              <span className="material-value">{solidMassG.toFixed(0)}g</span>
              <span className="muted"> PLA if printed 100% solid</span>
            </p>
            <p className="muted material-caveat">
              This is an upper bound computed from the actual mesh volume of the {totalToPrint} piece
              {totalToPrint === 1 ? "" : "s"} still needed — real usage depends on your slicer's infill and
              wall settings, typically 20–60% of this figure. Print time isn't estimated: it depends on
              your printer's speed, nozzle, and layer height, none of which this app knows.
            </p>
          </>
        )}
      </section>

      <section>
        <h2>Loop Closures</h2>
        {closures.length === 0 ? (
          <p className="muted">None detected.</p>
        ) : (
          <ul className="closure-list">
            {closures.map((c, i) => (
              <li key={i}>gap {c.gapMm.toFixed(1)}mm</li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
