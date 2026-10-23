import { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera.js";
import { Camera } from "@babylonjs/core/Cameras/camera.js";
import "@babylonjs/core/Culling/ray.js";
import { Engine } from "@babylonjs/core/Engines/engine.js";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight.js";
import { Material } from "@babylonjs/core/Materials/material.js";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial.js";
import { Color3, Color4 } from "@babylonjs/core/Maths/math.color.js";
import { Vector3 } from "@babylonjs/core/Maths/math.vector.js";
import { CreateBox } from "@babylonjs/core/Meshes/Builders/boxBuilder.js";
import type { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh.js";
import { Scene } from "@babylonjs/core/scene.js";
import type { Cell, Direction } from "@neon/sim";
import { createMissionFigures } from "./missionFigures.ts";
import { ISO_TILT, ISO_YAW } from "./mountIsoWalk.ts";
import { stagePointer } from "./stagePointer.ts";

export interface IsoFloor extends Cell {
  readonly lit: boolean;
}

export interface IsoWall extends Cell {
  readonly lit: boolean;
}

export interface IsoCover extends Cell {
  readonly protects: Direction;
}

export interface IsoUnit extends Cell {
  readonly id: string;
  readonly team: "crew" | "enemy";
  readonly selected: boolean;
  readonly target: boolean;
  readonly down: boolean;
  readonly route?: readonly Cell[];
}

export interface IsoLink extends Cell {
  readonly kind: "stair" | "passenger" | "freight";
}

export interface IsoBoard {
  readonly width: number;
  readonly height: number;
  readonly floors: readonly IsoFloor[];
  readonly walls: readonly IsoWall[];
  readonly door: Cell | null;
  readonly openDoor: Cell | null;
  readonly terminal: Cell | null;
  readonly extraction: readonly Cell[];
  readonly cover: readonly IsoCover[];
  readonly links?: readonly IsoLink[];
  readonly units: readonly IsoUnit[];
  readonly reachable: readonly Cell[];
  readonly watch: readonly Cell[];
}

export interface IsoBoardView {
  sync(board: IsoBoard): void;
  clear(): void;
  turn(direction: -1 | 1): void;
  zoomBy(factor: number): void;
  focus(cell: Cell): void;
  settle(): void;
  dispose(): void;
}

export function mountIsoBoard(host: HTMLElement, onCell: (cell: Cell) => void): IsoBoardView {
  const canvas = document.createElement("canvas");
  canvas.tabIndex = 0;
  host.replaceChildren(canvas);

  const engine = new Engine(canvas, true, undefined, false);
  const scene = new Scene(engine);
  scene.clearColor = new Color4(9 / 255, 12 / 255, 17 / 255, 1);

  const camera = new ArcRotateCamera("iso", ISO_YAW[1] ?? Math.PI / 2, ISO_TILT, 24, Vector3.Zero(), scene);
  camera.mode = Camera.ORTHOGRAPHIC_CAMERA;
  camera.lowerBetaLimit = ISO_TILT;
  camera.upperBetaLimit = ISO_TILT;
  camera.beta = ISO_TILT;
  camera.minZ = 0.1;
  camera.maxZ = 100;
  camera.inertia = 0;

  const light = new HemisphericLight("sky", new Vector3(0.15, 1, 0.25), scene);
  light.intensity = 0.95;
  light.groundColor = new Color3(0.07, 0.08, 0.11);

  const floorEven = material(scene, "floor-even", "#1c2430");
  const floorOdd = material(scene, "floor-odd", "#121820");
  const dimEven = material(scene, "dim-even", "#10151c");
  const dimOdd = material(scene, "dim-odd", "#0b0f14");
  const wallMat = material(scene, "wall", "#46566c");
  const wallDim = material(scene, "wall-dim", "#2c3644");
  const actorMat = material(scene, "runner", "#3ee0c5");
  actorMat.emissiveColor = Color3.FromHexString("#14685a");
  const enemyMat = material(scene, "enemy", "#d85a6a");
  enemyMat.emissiveColor = Color3.FromHexString("#6a2430");
  const downMat = material(scene, "down", "#5c6570");
  const visorMat = material(scene, "visor", "#f4f7fb");
  const enemyVisorMat = material(scene, "enemy-visor", "#2a1218");
  const northMat = material(scene, "north", "#ffb000");
  northMat.emissiveColor = Color3.FromHexString("#8a5a00");
  const reachMat = material(scene, "reach", "#2dff9a", 0.38);
  const watchMat = material(scene, "watch", "#e0a045", 0.42);
  const doorMat = material(scene, "door", "#8d6a45");
  const terminalMat = material(scene, "terminal", "#e0a045");
  terminalMat.emissiveColor = Color3.FromHexString("#6a4a12");
  const extractMat = material(scene, "extract", "#1c6b4a");
  const coverMat = material(scene, "cover", "#8fb4d8");
  const stairMat = material(scene, "stair", "#d7c4a1");
  const passengerMat = material(scene, "passenger", "#3ec6e0");
  passengerMat.emissiveColor = Color3.FromHexString("#145866");
  const freightMat = material(scene, "freight", "#e07a3a");
  freightMat.emissiveColor = Color3.FromHexString("#6a3010");
  const selectMat = material(scene, "select", "#f2c14e");
  selectMat.emissiveColor = Color3.FromHexString("#8a5a00");
  const targetMat = material(scene, "target", "#e07a7a");
  targetMat.emissiveColor = Color3.FromHexString("#6a2430");

  const cells = new Map<AbstractMesh, Cell>();
  const meshes = new Map<string, AbstractMesh>();
  let north: AbstractMesh | null = null;
  let disposed = false;
  let zoom = 6.5;
  let facing = 1;
  let framed = "";
  let lastBoard: IsoBoard | null = null;
  let modelsApplied = false;
  const figureMeshes: AbstractMesh[] = [];
  const figures = createMissionFigures(scene);

  const applyZoom = () => {
    const width = Math.max(canvas.clientWidth, 1);
    const height = Math.max(canvas.clientHeight, 1);
    camera.orthoTop = zoom;
    camera.orthoBottom = -zoom;
    camera.orthoLeft = -zoom * (width / height);
    camera.orthoRight = zoom * (width / height);
  };

  const onWheel = (event: WheelEvent) => {
    event.preventDefault();
    zoom = Math.min(16, Math.max(3.5, zoom * (event.deltaY > 0 ? 1.08 : 0.92)));
    applyZoom();
  };

  const onResize = () => {
    if (disposed) return;
    engine.resize();
    applyZoom();
  };

  scene.onPointerDown = (event) => {
    if (disposed || (event.button !== undefined && event.button !== 0)) return;
    const point = stagePointer(canvas, event);
    const pick = scene.pick(point.x, point.y, scene.pointerDownPredicate, scene.pointerDownFastCheck, scene.cameraToUseForPointers);
    const mesh = pick.pickedMesh;
    if (!mesh) return;
    const cell = cells.get(mesh);
    if (!cell) return;
    onCell({ x: cell.x, y: cell.y });
  };

  canvas.addEventListener("wheel", onWheel, { passive: false });
  window.addEventListener("resize", onResize);
  scene.attachControl();
  engine.resize();
  applyZoom();
  engine.runRenderLoop(() => {
    if (disposed) return;
    figures.tick(performance.now());
    if (!modelsApplied && figures.ready && lastBoard) {
      modelsApplied = true;
      sync(lastBoard);
    }
    const marked = lastBoard?.units.find((unit) => unit.selected);
    const at = marked ? figures.visual(marked.id) : null;
    const ring = at ? meshes.get("select-ring") : undefined;
    if (ring && at) ring.position.set(at.x, 0.13, at.z);
    scene.render();
  });

  function drop(mesh: AbstractMesh) {
    cells.delete(mesh);
    mesh.dispose(false, false);
  }

  function releaseFigurePicks() {
    for (const mesh of figureMeshes) cells.delete(mesh);
    figureMeshes.length = 0;
  }

  function clear() {
    if (disposed) return;
    lastBoard = null;
    releaseFigurePicks();
    figures.clear();
    for (const mesh of meshes.values()) drop(mesh);
    meshes.clear();
    if (north) {
      north.dispose(false, false);
      north = null;
    }
    framed = "";
  }

  function cluster(board: IsoBoard): { minX: number; minY: number; maxX: number; maxY: number } {
    const cells = board.floors.length > 0 ? board.floors : [{ x: 0, y: 0 }];
    let minX = cells[0]?.x ?? 0;
    let minY = cells[0]?.y ?? 0;
    let maxX = minX;
    let maxY = minY;
    for (const cell of cells) {
      minX = Math.min(minX, cell.x);
      minY = Math.min(minY, cell.y);
      maxX = Math.max(maxX, cell.x);
      maxY = Math.max(maxY, cell.y);
    }
    return { minX, minY, maxX, maxY };
  }

  function fit(board: IsoBoard) {
    const box = cluster(board);
    const key = `${box.minX},${box.minY},${box.maxX},${box.maxY}`;
    if (key !== framed || !north) {
      framed = key;
      const span = Math.max(box.maxX - box.minX + 1, box.maxY - box.minY + 1);
      zoom = Math.min(16, Math.max(3.5, span / 2 + 2.5));
      camera.setTarget(new Vector3((box.minX + box.maxX + 1) / 2, 0, (box.minY + box.maxY + 1) / 2), false, true, true);
      camera.beta = ISO_TILT;
      applyZoom();
    }
    if (!north) {
      north = CreateBox("north", { width: 0.7, height: 0.12, depth: 0.28 }, scene);
      north.material = northMat;
      north.isPickable = false;
    }
    north.position.set((box.minX + box.maxX + 1) / 2, 0.16, box.minY - 0.35);
  }

  function linkMesh(kind: IsoLink["kind"], meshKey: string): AbstractMesh {
    if (kind === "passenger") {
      const mesh = CreateBox(meshKey, { width: 0.28, height: 0.92, depth: 0.28 }, scene);
      mesh.material = passengerMat;
      return mesh;
    }
    if (kind === "freight") {
      const mesh = CreateBox(meshKey, { width: 0.78, height: 0.4, depth: 0.78 }, scene);
      mesh.material = freightMat;
      return mesh;
    }
    const mesh = CreateBox(meshKey, { width: 0.74, height: 0.12, depth: 0.74 }, scene);
    mesh.material = stairMat;
    const step = CreateBox(`${meshKey}-step`, { width: 0.36, height: 0.1, depth: 0.36 }, scene);
    step.material = stairMat;
    step.position.set(0.12, 0.12, -0.1);
    step.parent = mesh;
    step.isPickable = false;
    return mesh;
  }

  function sync(board: IsoBoard) {
      if (disposed) return;
      lastBoard = board;
      fit(board);
      const keep = new Set<string>();
      const put = (key: string, build: () => AbstractMesh): AbstractMesh => {
        keep.add(key);
        const existing = meshes.get(key);
        if (existing) return existing;
        const mesh = build();
        meshes.set(key, mesh);
        return mesh;
      };

      for (const floor of board.floors) {
        const key = `floor-${floor.x},${floor.y}`;
        const tile = put(key, () => {
          const mesh = CreateBox(key, { width: 0.96, height: 0.08, depth: 0.96 }, scene);
          mesh.position.set(floor.x + 0.5, 0.04, floor.y + 0.5);
          cells.set(mesh, { x: floor.x, y: floor.y });
          return mesh;
        });
        const even = (floor.x + floor.y) % 2 === 0;
        tile.material = floor.lit ? (even ? floorEven : floorOdd) : even ? dimEven : dimOdd;
      }

      for (const wall of board.walls) {
        const key = `wall-${wall.x},${wall.y}`;
        const block = put(key, () => {
          const mesh = CreateBox(key, { width: 0.96, height: 1, depth: 0.96 }, scene);
          mesh.position.set(wall.x + 0.5, 0.58, wall.y + 0.5);
          mesh.isPickable = false;
          return mesh;
        });
        block.material = wall.lit ? wallMat : wallDim;
      }

      if (board.door) {
        const door = put("door", () => {
          const mesh = CreateBox("door", { width: 0.9, height: 0.78, depth: 0.9 }, scene);
          mesh.material = doorMat;
          mesh.isPickable = false;
          return mesh;
        });
        door.position.set(board.door.x + 0.5, 0.45, board.door.y + 0.5);
      }

      if (board.openDoor) {
        const sill = put("sill", () => {
          const mesh = CreateBox("sill", { width: 0.7, height: 0.06, depth: 0.16 }, scene);
          mesh.material = doorMat;
          mesh.isPickable = false;
          return mesh;
        });
        sill.position.set(board.openDoor.x + 0.5, 0.12, board.openDoor.y + 0.5);
      }

      if (board.terminal) {
        const box = put("terminal", () => {
          const mesh = CreateBox("terminal", { width: 0.46, height: 0.55, depth: 0.46 }, scene);
          mesh.material = terminalMat;
          mesh.isPickable = false;
          return mesh;
        });
        box.position.set(board.terminal.x + 0.5, 0.36, board.terminal.y + 0.5);
      }

      for (const cell of board.extraction) {
        const key = `extract-${cell.x},${cell.y}`;
        const plate = put(key, () => {
          const mesh = CreateBox(key, { width: 0.72, height: 0.03, depth: 0.72 }, scene);
          mesh.material = extractMat;
          mesh.position.set(cell.x + 0.5, 0.09, cell.y + 0.5);
          cells.set(mesh, { x: cell.x, y: cell.y });
          return mesh;
        });
        plate.position.set(cell.x + 0.5, 0.09, cell.y + 0.5);
      }

      for (const item of board.cover) {
        const key = `cover-${item.x},${item.y},${item.protects}`;
        put(key, () => {
          const across = item.protects === "e" || item.protects === "w";
          const mesh = CreateBox(key, { width: across ? 0.1 : 0.72, height: 0.52, depth: across ? 0.72 : 0.1 }, scene);
          mesh.material = coverMat;
          mesh.isPickable = false;
          const x = item.protects === "e" ? item.x + 0.92 : item.protects === "w" ? item.x + 0.08 : item.x + 0.5;
          const z = item.protects === "s" ? item.y + 0.92 : item.protects === "n" ? item.y + 0.08 : item.y + 0.5;
          mesh.position.set(x, 0.34, z);
          return mesh;
        });
      }

      for (const link of board.links ?? []) {
        const linkKey = `link-${link.kind}-${link.x},${link.y}`;
        const mesh = put(linkKey, () => linkMesh(link.kind, linkKey));
        const lift = link.kind === "passenger" ? 0.54 : link.kind === "freight" ? 0.28 : 0.16;
        mesh.position.set(link.x + 0.5, lift, link.y + 0.5);
        cells.set(mesh, { x: link.x, y: link.y });
      }

      releaseFigurePicks();
      let shown = new Set<string>();
      try {
        const figuresOnBoard = figures.sync(board.units);
        shown = new Set(figuresOnBoard.shown);
        for (const pick of figuresOnBoard.picks) {
          cells.set(pick.mesh, { x: pick.x, y: pick.y });
          figureMeshes.push(pick.mesh);
        }
      } catch (error) {
        console.error(error);
        shown = new Set();
      }
      for (const unit of board.units) {
        if (shown.has(unit.id)) {
          if (unit.selected) placeRing(scene, put, "select-ring", selectMat, unit);
          if (unit.target) placeRing(scene, put, "target-ring", targetMat, unit);
          continue;
        }
        const key = `unit-${unit.id}`;
        const body = put(key, () => {
          const mesh = CreateBox(key, { width: 0.42, height: 1.05, depth: 0.42 }, scene);
          const visor = CreateBox(`visor-${unit.id}`, { width: 0.28, height: 0.1, depth: 0.06 }, scene);
          visor.material = unit.team === "crew" ? visorMat : enemyVisorMat;
          visor.position.set(0, 0.28, -0.24);
          visor.parent = mesh;
          visor.isPickable = false;
          return mesh;
        });
        body.position.set(unit.x + 0.5, 0.6, unit.y + 0.5);
        body.material = unit.down ? downMat : unit.team === "crew" ? actorMat : enemyMat;
        cells.set(body, { x: unit.x, y: unit.y });
        if (unit.selected) placeRing(scene, put, "select-ring", selectMat, unit);
        if (unit.target) placeRing(scene, put, "target-ring", targetMat, unit);
      }

      for (const tile of board.watch) {
        const key = `watch-${tile.x},${tile.y}`;
        put(key, () => {
          const mesh = CreateBox(key, { width: 0.72, height: 0.02, depth: 0.72 }, scene);
          mesh.position.set(tile.x + 0.5, 0.1, tile.y + 0.5);
          mesh.material = watchMat;
          mesh.isPickable = false;
          return mesh;
        });
      }

      for (const tile of board.reachable) {
        const key = `reach-${tile.x},${tile.y}`;
        put(key, () => {
          const mesh = CreateBox(key, { width: 0.72, height: 0.02, depth: 0.72 }, scene);
          mesh.position.set(tile.x + 0.5, 0.11, tile.y + 0.5);
          mesh.material = reachMat;
          cells.set(mesh, { x: tile.x, y: tile.y });
          return mesh;
        });
      }

      for (const [key, mesh] of [...meshes]) {
        if (keep.has(key)) continue;
        drop(mesh);
        meshes.delete(key);
      }
  }

  return {
    sync,
    clear,
    turn(direction) {
      if (disposed) return;
      facing = (facing + direction + ISO_YAW.length) % ISO_YAW.length;
      const alpha = ISO_YAW[facing];
      if (alpha === undefined) return;
      camera.alpha = alpha;
      camera.beta = ISO_TILT;
    },
    zoomBy(factor) {
      if (disposed || !Number.isFinite(factor) || factor <= 0) return;
      zoom = Math.min(16, Math.max(3.5, zoom * factor));
      applyZoom();
    },
    focus(cell) {
      if (disposed) return;
      camera.setTarget(new Vector3(cell.x + 0.5, 0, cell.y + 0.5), false, true, true);
      camera.beta = ISO_TILT;
    },
    settle() {
      if (disposed) return;
      figures.settle();
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      canvas.removeEventListener("wheel", onWheel);
      window.removeEventListener("resize", onResize);
      scene.onPointerDown = undefined;
      scene.detachControl();
      figures.dispose();
      engine.dispose();
      canvas.remove();
    },
  };
}

function placeRing(
  scene: Scene,
  put: (key: string, build: () => AbstractMesh) => AbstractMesh,
  key: string,
  paint: StandardMaterial,
  cell: Cell,
) {
  const ring = put(key, () => {
    const mesh = CreateBox(key, { width: 0.72, height: 0.04, depth: 0.72 }, scene);
    mesh.material = paint;
    mesh.isPickable = false;
    return mesh;
  });
  ring.position.set(cell.x + 0.5, 0.13, cell.y + 0.5);
}

function material(scene: Scene, name: string, color: string, alpha = 1): StandardMaterial {
  const paint = new StandardMaterial(name, scene);
  paint.diffuseColor = Color3.FromHexString(color);
  paint.specularColor = Color3.Black();
  if (alpha < 1) {
    paint.alpha = alpha;
    paint.transparencyMode = Material.MATERIAL_ALPHABLEND;
  }
  return paint;
}
