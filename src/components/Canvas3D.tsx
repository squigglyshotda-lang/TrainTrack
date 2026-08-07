import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import spec from "../data/track-spec.json";
import { PIECE_DEFS_BY_TYPE } from "../data/pieceDefs";
import { STL_LIBRARY } from "../data/stlLibrary";
import { STL_ALIGNMENT } from "../data/stlAlignment";
import { LayoutGraph } from "../model/graph";
import type { SerializedLayout } from "../model/graph";
import { computePieceElevationsMm } from "../model/elevation3d";
import type { Port } from "../model/types";

interface Canvas3DProps {
  layout: SerializedLayout;
}

// Real sourced track thickness (see track-spec.json) — used for bridgeSlope's
// extruded schematic geometry, the one piece type still on that path (see
// stlAlignment.ts for why).
const TRACK_HEIGHT_MM = spec.trackProfile.heightMm.value;

// A piece with exactly two ports and non-zero riseMm on at least one of
// them tilts that much over its length. This mirrors elevation3d.ts's own
// port-to-port walk, just local to a single piece instead of accumulated
// across the graph.
function computeTiltRadians(ports: Port[]): number {
  if (ports.length !== 2) return 0;
  const [a, b] = ports;
  const riseA = a.riseMm ?? 0;
  const riseB = b.riseMm ?? 0;
  if (riseA === 0 && riseB === 0) return 0;
  return Math.atan2(riseB - riseA, b.x - a.x);
}

// Schematic fallback for any piece type not in STL_ALIGNMENT (currently
// just bridgeSlope): extruded from the same 2D outline the SVG canvas
// draws, then tilted by its real riseMm — see Port.riseMm and
// stlAlignment.ts's bridgeSlope comment for why it's still here.
function buildSchematicGeometries(type: string): THREE.BufferGeometry[] {
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
    geometry.rotateX(-Math.PI / 2);
    if (tilt !== 0) geometry.rotateZ(tilt);
    return geometry;
  });
}

// Loads the real printed STL for `type` and remaps its vertices from the
// mesh's own arbitrary local frame into this app's port-local frame (x =
// travel, y = lateral, z = thickness-up) using the measured calibration in
// stlAlignment.ts, then reorients so that frame ends up in the same local
// convention as world placement expects (x=travel, y=up, z=-lateral).
async function loadStlGeometry(type: string): Promise<THREE.BufferGeometry> {
  const entry = STL_LIBRARY[type];
  const alignment = STL_ALIGNMENT[type];
  const url = `${import.meta.env.BASE_URL}stl/${entry.fileName}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Could not load ${entry.fileName} (HTTP ${response.status}).`);
  const buffer = await response.arrayBuffer();
  const geometry = new STLLoader().parse(buffer);

  const offsetZ = alignment.offsetZ ?? 0;
  const m = new THREE.Matrix4();
  if (alignment.rotate === "cw90") {
    // (x, y) -> (y, -x): a real 90deg rotation about Z (proper, det +1),
    // not a bare axis swap — see stlAlignment.ts's file comment for why
    // that distinction matters. Z is otherwise untouched but for offsetZ.
    m.set(
      0, 1, 0, alignment.offsetX,
      -1, 0, 0, alignment.offsetY,
      0, 0, 1, offsetZ,
      0, 0, 0, 1
    );
  } else if (alignment.rotate === "ccw90") {
    // (x, y) -> (-y, x): the other direction.
    m.set(
      0, -1, 0, alignment.offsetX,
      1, 0, 0, alignment.offsetY,
      0, 0, 1, offsetZ,
      0, 0, 0, 1
    );
  } else {
    m.set(
      1, 0, 0, alignment.offsetX,
      0, 1, 0, alignment.offsetY,
      0, 0, 1, offsetZ,
      0, 0, 0, 1
    );
  }
  geometry.applyMatrix4(m);
  geometry.rotateX(-Math.PI / 2);
  return geometry;
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

// Real STL geometry is shared across every Canvas3D instance and every
// layout — the file's content never changes — so it's cached at module
// scope rather than refetched each time the layout changes or the 3D view
// is toggled off and back on.
const stlGeometryCache = new Map<string, Promise<THREE.BufferGeometry>>();
function getStlGeometry(type: string): Promise<THREE.BufferGeometry> {
  let cached = stlGeometryCache.get(type);
  if (!cached) {
    cached = loadStlGeometry(type);
    stlGeometryCache.set(type, cached);
  }
  return cached;
}

export default function Canvas3D({ layout }: Canvas3DProps) {
  const graph = useMemo(() => LayoutGraph.fromSerialized(layout), [layout]);
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let cancelled = false;

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
    const materials = {
      flat: new THREE.MeshStandardMaterial({ color: pieceColor, roughness: 0.8 }),
      elevated: new THREE.MeshStandardMaterial({ color: elevatedColor, roughness: 0.8 }),
      depressed: new THREE.MeshStandardMaterial({ color: depressedColor, roughness: 0.8 }),
    };

    const schematicGeometryCache = new Map<string, THREE.BufferGeometry[]>();
    const getSchematicGeometries = (type: string): THREE.BufferGeometry[] => {
      let geoms = schematicGeometryCache.get(type);
      if (!geoms) {
        geoms = buildSchematicGeometries(type);
        schematicGeometryCache.set(type, geoms);
      }
      return geoms;
    };

    const pieceGroup = new THREE.Group();
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

    setLoading(true);
    const elevationsMm = computePieceElevationsMm(graph);
    const types = new Set([...graph.pieces.values()].map((p) => p.type));
    const stlTypes = [...types].filter((t) => STL_ALIGNMENT[t]);
    Promise.all(
      stlTypes.map(async (t) => [t, await getStlGeometry(t).catch(() => null)] as const)
    ).then((resolved) => {
      if (cancelled) return;
      // Only pieces whose fetch actually resolved get a mesh — a failed
      // fetch just leaves that piece absent rather than crashing the
      // whole preview.
      const stlGeometries = new Map(resolved.filter(([, g]) => g !== null) as [string, THREE.BufferGeometry][]);
      for (const piece of graph.pieces.values()) {
        const zMm = elevationsMm.get(piece.id) ?? 0;
        const def = PIECE_DEFS_BY_TYPE[piece.type];
        const portLevels = def.ports.map((p) => piece.level + (p.level ?? 0));
        const maxLevel = Math.max(...portLevels);
        const minLevel = Math.min(...portLevels);
        const material = maxLevel > 0 ? materials.elevated : minLevel < 0 ? materials.depressed : materials.flat;
        const group = new THREE.Group();
        const stlGeometry = stlGeometries.get(piece.type);
        if (stlGeometry) {
          group.add(new THREE.Mesh(stlGeometry, material));
        } else if (!STL_ALIGNMENT[piece.type]) {
          for (const geometry of getSchematicGeometries(piece.type)) {
            group.add(new THREE.Mesh(geometry, material));
          }
        }
        group.position.set(piece.transform.x, zMm, -piece.transform.y);
        group.rotation.y = (piece.transform.rotationDeg * Math.PI) / 180;
        pieceGroup.add(group);
      }
      setLoading(false);
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(frameId);
      observer.disconnect();
      controls.dispose();
      for (const geoms of schematicGeometryCache.values()) {
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

  return (
    <div ref={containerRef} className="canvas3d-container">
      {loading && <div className="canvas3d-loading-overlay">Loading real piece meshes…</div>}
    </div>
  );
}
