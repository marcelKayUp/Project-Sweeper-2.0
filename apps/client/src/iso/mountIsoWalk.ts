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
import { flatReachable, type FlatWalk } from "@neon/sim";
import type { Cell } from "@neon/sim";
import { stagePointer } from "./stagePointer.ts";

export const ISO_TILT = Math.PI / 4;
export const ISO_YAW = [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2] as const;

export interface IsoWalkView {
  sync(state: FlatWalk): void;
  turn(direction: -1 | 1): void;
  dispose(): void;
}

export function mountIsoWalk(host: HTMLElement, onCell: (cell: Cell) => void): IsoWalkView {
  const canvas = document.createElement("canvas");
  canvas.tabIndex = 0;
  host.replaceChildren(canvas);

  const engine = new Engine(canvas, true, undefined, false);
  const scene = new Scene(engine);
  scene.clearColor = new Color4(9 / 255, 12 / 255, 17 / 255, 1);

  const camera = new ArcRotateCamera("iso", ISO_YAW[1], ISO_TILT, 24, Vector3.Zero(), scene);
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
  const wallMat = material(scene, "wall", "#46566c");
  const actorMat = material(scene, "runner", "#3ee0c5");
  actorMat.emissiveColor = Color3.FromHexString("#14685a");
  const visorMat = material(scene, "visor", "#f4f7fb");
  const northMat = material(scene, "north", "#ffb000");
  northMat.emissiveColor = Color3.FromHexString("#8a5a00");
  const reachMat = material(scene, "reach", "#2dff9a", 0.38);

  const cells = new Map<AbstractMesh, Cell>();
  let highlights: AbstractMesh[] = [];
  let actor: AbstractMesh | null = null;
  let built = false;
  let disposed = false;
  let zoom = 6.5;
  let facing = 1;

  const applyZoom = () => {
    const width = Math.max(canvas.clientWidth, 1);
    const height = Math.max(canvas.clientHeight, 1);
    const halfH = zoom;
    const halfW = zoom * (width / height);
    camera.orthoTop = halfH;
    camera.orthoBottom = -halfH;
    camera.orthoLeft = -halfW;
    camera.orthoRight = halfW;
  };

  const onWheel = (event: WheelEvent) => {
    event.preventDefault();
    zoom = Math.min(12, Math.max(3.5, zoom * (event.deltaY > 0 ? 1.08 : 0.92)));
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
    if (!disposed) scene.render();
  });

  return {
    sync(state) {
      if (disposed) return;
      if (!built) {
        buildStatic(state);
        built = true;
      }
      placeActor(state.actor.x, state.actor.y);
      paintReachable(state);
    },
    turn(direction) {
      if (disposed) return;
      facing = (facing + direction + ISO_YAW.length) % ISO_YAW.length;
      const alpha = ISO_YAW[facing];
      if (alpha === undefined) return;
      camera.alpha = alpha;
      camera.beta = ISO_TILT;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      canvas.removeEventListener("wheel", onWheel);
      window.removeEventListener("resize", onResize);
      scene.onPointerDown = undefined;
      scene.detachControl();
      engine.dispose();
      canvas.remove();
    },
  };

  function buildStatic(state: FlatWalk) {
    const center = new Vector3(state.map.width / 2, 0, state.map.height / 2);
    camera.setTarget(center, false, true, true);
    camera.alpha = ISO_YAW[facing] ?? Math.PI / 2;
    camera.beta = ISO_TILT;

    for (let y = 0; y < state.map.height; y += 1) {
      for (let x = 0; x < state.map.width; x += 1) {
        if (state.map.walls.some((wall) => wall.x === x && wall.y === y)) continue;
        const tile = CreateBox(`${x},${y}`, { width: 0.96, height: 0.08, depth: 0.96 }, scene);
        tile.position.set(x + 0.5, 0.04, y + 0.5);
        tile.material = (x + y) % 2 === 0 ? floorEven : floorOdd;
        cells.set(tile, { x, y });
      }
    }

    for (const wall of state.map.walls) {
      const block = CreateBox(`wall-${wall.x},${wall.y}`, { width: 0.96, height: 1, depth: 0.96 }, scene);
      block.position.set(wall.x + 0.5, 0.58, wall.y + 0.5);
      block.material = wallMat;
      block.isPickable = false;
    }

    const marker = CreateBox("north", { width: 0.7, height: 0.12, depth: 0.28 }, scene);
    marker.position.set(state.map.width / 2, 0.16, -0.35);
    marker.material = northMat;
    marker.isPickable = false;

    actor = CreateBox("runner", { width: 0.42, height: 1.05, depth: 0.42 }, scene);
    actor.material = actorMat;
    actor.isPickable = false;
    const visor = CreateBox("visor", { width: 0.28, height: 0.1, depth: 0.06 }, scene);
    visor.material = visorMat;
    visor.position.set(0, 0.28, -0.24);
    visor.parent = actor;
    visor.isPickable = false;
  }

  function placeActor(x: number, y: number) {
    actor?.position.set(x + 0.5, 0.6, y + 0.5);
  }

  function paintReachable(state: FlatWalk) {
    for (const mesh of highlights) {
      cells.delete(mesh);
      mesh.dispose(false, false);
    }
    highlights = [];
    for (const tile of flatReachable(state)) {
      const mark = CreateBox(`reach-${tile.x},${tile.y}`, { width: 0.72, height: 0.02, depth: 0.72 }, scene);
      mark.position.set(tile.x + 0.5, 0.1, tile.y + 0.5);
      mark.material = reachMat;
      cells.set(mark, { x: tile.x, y: tile.y });
      highlights.push(mark);
    }
  }
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
