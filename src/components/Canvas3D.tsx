import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import spec from "../data/track-spec.json";
import { PIECE_DEFS_BY_TYPE } from "../data/pieceDefs";
import { LayoutGraph } from "../model/graph";
import type { SerializedLayout } from "../model/graph";
import { computePieceElevationsMm } from "../model/elevation3d";
import type { Port } from "../model/types";

interface Canvas3DProps {
  layout: SerializedLayout;
}

// Real sourced track thickness (see track-spec.json) — every piece is
// extruded to this depth regardless of type, matching the flat 12mm
// profile every piece in the library shares except for the two bridge
// ramps, whose actual physical rise this preview instead expresses as a
// tilt (see Port.riseMm) rather than a taller block.
const TRACK_HEIGHT_MM = spec.trackProfile.heightMm.value;

// A piece with exactly two ports and non-zero riseMm on at least one of
// them tilts that much over its length; everything else (flat pieces,
// and every piece with more than two ports, none of which carry riseMm)
// is untilted. This mirrors elevation3d.ts's own port-to-port walk, just
// local to a single piece instead of accumulated across the graph.
function computeTiltRadians(ports: Port[]): number {
  if (ports.length !== 2) return 0;
  const [a, b] = ports;
  const riseA = a.riseMm ?? 0;
  const riseB = b.riseMm ?? 0;
  if (riseA === 0 && riseB === 0) return 0;
  return Math.atan2(riseB - riseA, b.x - a.x);
}

// Builds one extruded, correctly-oriented-and-tilted geometry per outline
// polygon of a piece type. Shared across every placed instance of that
// type — position/rotation/level tint are all applied per-mesh instead.
function buildGeometriesForType(type: string): THREE.BufferGeometry[] {
  const def = PIECE_DEFS_BY_TYPE[type];
  const tilt = computeTiltRadians(def.ports);
  return def.outlines.map((outline) => {
    const shape = new THREE.Shape();
    outline.forEach((pt, i) => {
      if (i === 0) shape.moveTo(pt.x, pt.y);
      else shape.lineTo(pt.x, pt.y);
    });
    shape.closePath();
    const geometry = new THREE.ExtrudeGeometry(shape, { depth: TRACK_HEIGHT_MM, bevelEnabled: false });
    // Local (x, y) -> (X, Y=thickness, Z=-y): the extrusion's own Z axis
    // (piece thickness) becomes world-up, and the shape's local y becomes
    // world -Z, matching the position mapping used below.
    geometry.rotateX(-Math.PI / 2);
    // Applied in the now-reoriented frame (X = travel, Y = up, Z =
    // -lateral), so a positive tilt raises Y as X increases — i.e. rises
    // from port a (x=0) towards port b, matching riseB > riseA.
    if (tilt !== 0) geometry.rotateZ(tilt);
    return geometry;
  });
}

function readCssColor(varName: string, fallback: string): THREE.Color {
  if (typeof window === "undefined") return new THREE.Color(fallback);
  const raw = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
  try {
    return new THREE.Color(raw || fallback);
  } catch {
    return new THREE.Color(fallback);
  }
}

export default function Canvas3D({ layout }: Canvas3DProps) {
  const graph = useMemo(() => LayoutGraph.fromSerialized(layout), [layout]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    scene.background = readCssColor("--bg", "#fbf6ec");

    const camera = new THREE.PerspectiveCamera(45, 1, 1, 20000);
    // Classic isometric start (equal x/y/z gives a 45deg azimuth and
    // ~35.264deg elevation), free to orbit from there via OrbitControls.
    const ISO_DIST = 900;
    camera.position.set(ISO_DIST, ISO_DIST, ISO_DIST);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0, 0);
    controls.enableDamping = true;

    scene.add(new THREE.AmbientLight(0xffffff, 0.7));
    const sun = new THREE.DirectionalLight(0xffffff, 0.8);
    sun.position.set(400, 600, 300);
    scene.add(sun);

    const grid = new THREE.GridHelper(2000, 40, 0x888888, 0xcccccc);
    scene.add(grid);

    const pieceColor = readCssColor("--ink", "#332b22");
    const elevatedColor = readCssColor("--level-up", "#b8842a");
    const depressedColor = readCssColor("--level-down", "#2969a3");

    const geometryCache = new Map<string, THREE.BufferGeometry[]>();
    const getGeometries = (type: string): THREE.BufferGeometry[] => {
      let geoms = geometryCache.get(type);
      if (!geoms) {
        geoms = buildGeometriesForType(type);
        geometryCache.set(type, geoms);
      }
      return geoms;
    };

    const materials = {
      flat: new THREE.MeshStandardMaterial({ color: pieceColor, roughness: 0.8 }),
      elevated: new THREE.MeshStandardMaterial({ color: elevatedColor, roughness: 0.8 }),
      depressed: new THREE.MeshStandardMaterial({ color: depressedColor, roughness: 0.8 }),
    };

    const elevationsMm = computePieceElevationsMm(graph);
    const pieceGroup = new THREE.Group();
    for (const piece of graph.pieces.values()) {
      const zMm = elevationsMm.get(piece.id) ?? 0;
      // A piece's own level is its local origin's tier, but a ramp's far
      // port sits a tier away from that — tint by the piece's full level
      // span (matching Canvas.tsx's piece-elevated/piece-depressed classes)
      // rather than just its origin, so both ramp pieces read as elevated.
      const def = PIECE_DEFS_BY_TYPE[piece.type];
      const portLevels = def.ports.map((p) => piece.level + (p.level ?? 0));
      const maxLevel = Math.max(...portLevels);
      const minLevel = Math.min(...portLevels);
      const material = maxLevel > 0 ? materials.elevated : minLevel < 0 ? materials.depressed : materials.flat;
      const group = new THREE.Group();
      for (const geometry of getGeometries(piece.type)) {
        group.add(new THREE.Mesh(geometry, material));
      }
      group.position.set(piece.transform.x, zMm, -piece.transform.y);
      group.rotation.y = (piece.transform.rotationDeg * Math.PI) / 180;
      pieceGroup.add(group);
    }
    scene.add(pieceGroup);

    let frameId = 0;
    const animate = () => {
      controls.update();
      renderer.render(scene, camera);
      frameId = requestAnimationFrame(animate);
    };
    animate();

    const resize = () => {
      const { clientWidth, clientHeight } = container;
      if (clientWidth === 0 || clientHeight === 0) return;
      camera.aspect = clientWidth / clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(clientWidth, clientHeight);
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(container);

    return () => {
      cancelAnimationFrame(frameId);
      observer.disconnect();
      controls.dispose();
      for (const geoms of geometryCache.values()) {
        for (const g of geoms) g.dispose();
      }
      materials.flat.dispose();
      materials.elevated.dispose();
      materials.depressed.dispose();
      grid.geometry.dispose();
      (grid.material as THREE.Material).dispose();
      renderer.dispose();
      container.removeChild(renderer.domElement);
    };
  }, [graph]);

  return <div ref={containerRef} className="canvas3d-container" />;
}
