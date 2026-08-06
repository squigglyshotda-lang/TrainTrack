import type { Point } from "./geometry";

export function polygonToPath(points: Point[]): string {
  if (points.length === 0) return "";
  const [first, ...rest] = points;
  return `M ${first.x},${first.y} ` + rest.map((p) => `L ${p.x},${p.y}`).join(" ") + " Z";
}
