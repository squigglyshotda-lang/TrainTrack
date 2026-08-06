// Phase 2a export: for each piece type in the current layout, look up its
// pre-generated STL (see stlLibrary.ts), rename it with the quantity baked
// into the filename, zip them up, and download. No generation happens here
// — this is deliberately just a lookup-and-bundle step (see project brief's
// Phase 2a vs 2b split).
import JSZip from "jszip";
import { STL_LIBRARY } from "../data/stlLibrary";

export interface BomRow {
  type: string;
  label: string;
  count: number;
}

export class ExportError extends Error {}

export async function exportBomAsZip(bom: BomRow[]): Promise<void> {
  if (bom.length === 0) throw new ExportError("Nothing placed yet — there's nothing to export.");

  const zip = new JSZip();

  for (const row of bom) {
    const entry = STL_LIBRARY[row.type];
    if (!entry) {
      throw new ExportError(`No STL is registered for piece type "${row.type}" (${row.label}).`);
    }
    const url = `${import.meta.env.BASE_URL}stl/${entry.fileName}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new ExportError(`Could not load ${entry.fileName} (HTTP ${response.status}).`);
    }
    const bytes = await response.arrayBuffer();
    zip.file(`${entry.exportBaseName}-x${row.count}.stl`, bytes);
  }

  const blob = await zip.generateAsync({ type: "blob" });
  const downloadUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = downloadUrl;
  a.download = "traintrack-layout.zip";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(downloadUrl);
}
