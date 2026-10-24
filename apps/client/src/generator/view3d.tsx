import { useEffect, useRef, useState } from "react";
import { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera.js";
import { Camera } from "@babylonjs/core/Cameras/camera.js";
import "@babylonjs/core/Culling/ray.js";
import { Engine } from "@babylonjs/core/Engines/engine.js";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight.js";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial.js";
import { Color3, Color4 } from "@babylonjs/core/Maths/math.color.js";
import { Vector3 } from "@babylonjs/core/Maths/math.vector.js";
import { CreateBox } from "@babylonjs/core/Meshes/Builders/boxBuilder.js";
import { Scene } from "@babylonjs/core/scene.js";
import type { BuildingPackage } from "@neon/generator";
import { ZONES } from "./screen.tsx";

export default function Building3D({ item, selected, onSelect, finishes, level }: { item: BuildingPackage; selected: string; onSelect: (id: string) => void; finishes: boolean; level: number }) {
  const host = useRef<HTMLDivElement>(null);
  const turn = useRef<(direction: number) => void>(() => {});
  const select = useRef(onSelect);
  const highlight = useRef<(id: string) => void>(() => {});
  const [error, setError] = useState("");
  select.current = onSelect;
  useEffect(() => { highlight.current(selected); }, [selected]);

  useEffect(() => {
    const element = host.current;
    if (!element) return;
    let engine: Engine | undefined;
    let dispose = () => {};
    try {
      const canvas = document.createElement("canvas");
      canvas.tabIndex = 0;
      canvas.setAttribute("aria-label", "3D-Gebäudevorschau, Mausrad zum Zoomen");
      element.replaceChildren(canvas);
      engine = new Engine(canvas, true, undefined, false);
      const activeEngine = engine;
      const scene = new Scene(activeEngine);
      scene.clearColor = new Color4(0.045, 0.07, 0.1, 1);
      const { width, height } = item.mission;
      const camera = new ArcRotateCamera("building", Math.PI / 2, Math.PI / 4, 60, new Vector3(width / 2, 0, height / 2), scene);
      camera.mode = Camera.ORTHOGRAPHIC_CAMERA;
      camera.minZ = 0.1; camera.maxZ = 200;
      const light = new HemisphericLight("light", new Vector3(0.3, 1, 0.5), scene);
      light.intensity = 0.95;
      const materials = new Map<string, StandardMaterial>();
      function material(color: string, alpha = 1) {
        const key = `${color}/${alpha}`;
        let found = materials.get(key);
        if (!found) {
          found = new StandardMaterial(key, scene);
          found.diffuseColor = Color3.FromHexString(color);
          found.specularColor = Color3.Black();
          found.alpha = alpha;
          materials.set(key, found);
        }
        return found;
      }
      const floors = new Map<string, ReturnType<typeof CreateBox>>();
      function box(id: string, x: number, y: number, elevation: number, w: number, h: number, d: number, color: string, alpha = 1) {
        const mesh = CreateBox(id, { width: w, height: h, depth: d }, scene);
        mesh.position.set(x, elevation, y);
        mesh.material = material(color, alpha);
        mesh.isPickable = false;
        return mesh;
      }
      for (const room of item.building.rooms) {
        const floor = box(room.id, room.x + room.width / 2, room.y + room.height / 2, 0, room.width - 0.04, 0.1, room.height - 0.04, finishes ? room.appearance.color : ZONES[room.zone].color);
        floor.isPickable = true; floors.set(room.id, floor);
        if (finishes) {
          // Flat surface marks carry no collision, cover or sight behavior.
          const spacing = room.appearance.surface === "timber" ? 0.5 : 1;
          for (let dx = spacing; dx < room.width; dx += spacing) box(`finish-${room.id}-${dx}`, room.x + dx, room.y + room.height / 2, 0.056, 0.025, 0.008, room.height - 0.1, room.appearance.accent, 0.23);
          if (room.appearance.pattern === "grid" || room.appearance.pattern === "circuits") for (let dy = 1; dy < room.height; dy += 1) box(`cross-${room.id}-${dy}`, room.x + room.width / 2, room.y + dy, 0.057, room.width - 0.1, 0.008, 0.025, room.appearance.accent, 0.2);
          if (room.appearance.wear !== "pristine") box(`wear-${room.id}`, room.x + 0.7, room.y + 0.7, 0.061, 0.7, 0.008, 0.11, "#b5b5a3", 0.4);
          if (room.appearance.wear === "patched") box(`patch-${room.id}`, room.x + room.width - 0.6, room.y + room.height - 0.6, 0.062, 0.8, 0.008, 0.7, "#525c62", 0.7);
        }
      }
      for (const cell of item.building.circulation) box(`hall-${cell.x}-${cell.y}`, cell.x + 0.5, cell.y + 0.5, 0, 1, 0.1, 1, "#457d83");
      const plate = item.mission.levels?.find((entry) => entry.z === level);
      const walls = plate?.walls ?? item.mission.walls;
      for (const wall of walls) box(`wall-${wall.x}-${wall.y}`, wall.x + 0.5, wall.y + 0.5, 0.48, 0.97, 0.9, 0.97, finishes ? item.building.identity.wall : "#435367");
      for (const link of item.building.connections.filter((link) => link.kind !== "passage")) box(link.id, link.portal.x + 0.5, link.portal.y + 0.5, 0.03, 0.9, 0.1, 0.9, link.kind === "shortcut" ? "#dca875" : "#88c3b4");
      for (const vertical of item.building.links) {
        if (vertical.fromZ !== level && vertical.toZ !== level) continue;
        const x = vertical.fromZ === level ? vertical.fromX : vertical.toX;
        const y = vertical.fromZ === level ? vertical.fromY : vertical.toY;
        box(vertical.id, x + 0.5, y + 0.5, 0.22, 0.62, 0.4, 0.62, vertical.kind === "stair" ? "#f2d48a" : "#9fd0ff");
      }
      if (level === 0) {
        for (const cover of plate?.lowCover ?? item.mission.lowCover) box(cover.id, cover.x + (cover.protects === "w" ? 0.1 : 0.9), cover.y + 0.5, 0.28, 0.16, 0.5, 0.82, "#a2adc1");
        for (const spawn of item.mission.spawns) box(spawn.id, spawn.x + 0.5, spawn.y + 0.5, 0.56, 0.36, 1, 0.36, spawn.team === "crew" ? "#84edc7" : "#fa9c7c");
        const terminal = item.mission.terminal;
        box("terminal", terminal.x + 0.5, terminal.y + 0.5, 0.44, 0.5, 0.8, 0.5, "#f6bb78");
      }
      for (const decoration of item.building.dressing) {
        const room = item.building.rooms.find((entry) => entry.id === decoration.roomId)!;
        const color = decoration.module === "planter" ? "#7ca96f" : finishes ? room.appearance.accent : "#bed0df";
        box(decoration.id, decoration.x + 0.5, decoration.y + 0.5, 0.17, decoration.module === "table" ? 0.8 : 0.55, 0.25, decoration.module === "desk" ? 0.35 : 0.55, color, 0.65);
        if (decoration.module === "desk") box(`${decoration.id}-screen`, decoration.x + 0.5, decoration.y + 0.4, 0.39, 0.27, 0.18, 0.045, "#a5d0cf");
      }
      if (level === 0) for (const cell of item.mission.extraction) box(`extraction-${cell.x}-${cell.y}`, cell.x + 0.5, cell.y + 0.5, 0.09, 0.92, 0.035, 0.92, "#83e8c3");
      function mark(id: string) {
        for (const [roomId, floor] of floors) {
          const sourceRoom = item.building.rooms.find((room) => room.id === roomId)!;
          floor.material = material(finishes ? sourceRoom.appearance.color : ZONES[sourceRoom.zone].color, roomId === id ? 1 : 0.8);
        }
      }
      highlight.current = mark; mark(selected);
      scene.onPointerDown = (_event, pick) => { if (pick.pickedMesh && floors.has(pick.pickedMesh.name)) select.current(pick.pickedMesh.name); };
      scene.attachControl();
      let zoom = Math.max(width, height) * 0.58;
      const resize = () => {
        activeEngine.resize();
        const aspect = Math.max(canvas.clientWidth, 1) / Math.max(canvas.clientHeight, 1);
        camera.orthoLeft = -zoom * aspect; camera.orthoRight = zoom * aspect;
        camera.orthoTop = zoom; camera.orthoBottom = -zoom;
      };
      const wheel = (event: WheelEvent) => { event.preventDefault(); zoom = Math.max(5, Math.min(40, zoom * (event.deltaY > 0 ? 1.08 : 0.92))); resize(); };
      canvas.addEventListener("wheel", wheel, { passive: false });
      const observer = new ResizeObserver(resize); observer.observe(element);
      turn.current = (direction) => { camera.alpha += direction * Math.PI / 2; };
      resize();
      activeEngine.runRenderLoop(() => scene.render());
      dispose = () => { observer.disconnect(); canvas.removeEventListener("wheel", wheel); scene.detachControl(); activeEngine.dispose(); canvas.remove(); highlight.current = () => {}; turn.current = () => {}; };
      setError("");
    } catch (failure) {
      engine?.dispose();
      setError(failure instanceof Error ? failure.message : "WebGL ist nicht verfügbar");
    }
    return dispose;
    // Selection updates materials through highlight; rebuilding follows a new package or floor.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item, finishes, level]);

  return <div className="view3d"><div className="view3d-host" ref={host} />{error ? <p role="alert" className="view3d-note">3D nicht verfügbar: {error}. Grundriss und Raumgraph bleiben nutzbar.</p> : <><p className="view3d-note">Etage {level + 1} · 45° · orthografisch · Mausrad zum Zoomen · primitive Platzhalter</p><div className="rotate-tools"><button onClick={() => turn.current(-1)} aria-label="Kamera nach links drehen">↶ 90°</button><button onClick={() => turn.current(1)} aria-label="Kamera nach rechts drehen">90° ↷</button></div></>}</div>;
}
