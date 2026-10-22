import "@babylonjs/loaders/glTF/index.js";
import { GLTFLoaderAnimationStartMode } from "@babylonjs/loaders/glTF/glTFFileLoader.js";
import { DirectionalLight } from "@babylonjs/core/Lights/directionalLight.js";
import { Vector3 } from "@babylonjs/core/Maths/math.vector.js";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode.js";
import { LoadAssetContainerAsync } from "@babylonjs/core/Loading/sceneLoader.js";
import type { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh.js";
import type { AnimationGroup } from "@babylonjs/core/Animations/animationGroup.js";
import type { AssetContainer } from "@babylonjs/core/assetContainer.js";
import type { Scene } from "@babylonjs/core/scene.js";
import type { Skeleton } from "@babylonjs/core/Bones/skeleton.js";
import { MODULAR_SLOTS } from "@neon/characters";
import type { ModularCharacterSpec, ModularEquipment, ModularSourceId } from "@neon/characters";
import { maleStandIn, missionLook } from "./missionLooks.ts";

export interface FigureUnit {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly team: "crew" | "enemy";
  readonly down: boolean;
  readonly route?: readonly { readonly x: number; readonly y: number }[];
}

export interface FigurePick {
  readonly mesh: AbstractMesh;
  readonly x: number;
  readonly y: number;
}

export interface MissionFigures {
  readonly ready: boolean;
  sync(units: readonly FigureUnit[]): { picks: readonly FigurePick[]; shown: ReadonlySet<string> };
  visual(id: string): { readonly x: number; readonly z: number } | null;
  tick(now: number): void;
  clear(): void;
  dispose(): void;
}

interface Catalog {
  readonly slots: Readonly<Record<string, Readonly<Record<string, string | undefined>>>>;
  readonly equipment: Readonly<Record<string, string | null | undefined>>;
  readonly clips: readonly string[];
}

interface Template {
  readonly container: AssetContainer;
  readonly catalog: Catalog;
  readonly partNames: ReadonlySet<string>;
}

interface Hop {
  readonly x: number;
  readonly y: number;
  readonly yaw: number;
}

interface Travel {
  readonly steps: Hop[];
  index: number;
  from: Vector3;
  started: number;
}

interface Actor {
  readonly id: string;
  readonly prefix: string;
  readonly anchor: TransformNode;
  readonly groups: readonly AnimationGroup[];
  readonly skeletons: readonly Skeleton[];
  readonly rest: string;
  readonly baseY: number;
  meshes: AbstractMesh[];
  cellX: number;
  cellY: number;
  down: boolean;
  clip: string;
  loop: boolean;
  travel: Travel | null;
}

const TARGET_HEIGHT = 1.05;
const FLOOR_Y = 0.08;
const WALK_MS = 320;
const REQUIRED_CLIPS = ["Idle_Neutral", "Idle_Gun", "Walk", "Death"] as const;

const byteCache = new Map<string, Promise<{ bytes: Uint8Array; catalog: Catalog; sha: string }>>();

function fail(message: string): never {
  throw new Error(`Missionsfigur: ${message}`);
}

function hex(bytes: ArrayBuffer): string {
  return [...new Uint8Array(bytes)].map((value) => value.toString(16).padStart(2, "0")).join("");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function readCatalog(input: unknown, source: ModularSourceId, sha: string): Catalog {
  if (!isRecord(input) || input.schemaVersion !== 1 || input.sourceId !== source || input.assetFile !== "master.glb") {
    return fail("Der Figurenkatalog passt nicht zur erwarteten Bibliothek.");
  }
  if (input.assetSha256 !== sha || !isRecord(input.slots) || !isRecord(input.equipment) || !Array.isArray(input.clips)) {
    return fail("Der Figurenkatalog ist unvollständig oder der Dateihash weicht ab.");
  }
  const clips = input.clips.filter((name): name is string => typeof name === "string");
  if (REQUIRED_CLIPS.some((name) => !clips.includes(name))) return fail("Pflichtclips fehlen im Figurenkatalog.");
  const slots: Record<string, Record<string, string | undefined>> = {};
  for (const [slot, value] of Object.entries(input.slots)) {
    if (!isRecord(value)) return fail("Ein Katalog-Slot ist ungültig.");
    const entry: Record<string, string | undefined> = {};
    for (const [variant, name] of Object.entries(value)) if (typeof name === "string") entry[variant] = name;
    slots[slot] = entry;
  }
  const equipment: Record<string, string | null | undefined> = {};
  for (const [item, name] of Object.entries(input.equipment)) {
    if (typeof name === "string" || name === null) equipment[item] = name;
  }
  return { slots, equipment, clips };
}

function libraryRoot(source: ModularSourceId): string {
  if (source === "quaternius-modular-men-v1") return "/assets/characters/quaternius/";
  if (source === "modular-women-v1") return "/assets/characters/women/";
  return fail("Unbekannte Modellbibliothek.");
}

async function loadBytes(source: ModularSourceId): Promise<{ bytes: Uint8Array; catalog: Catalog; sha: string }> {
  const cached = byteCache.get(source);
  if (cached) return cached;
  const pending = (async () => {
    const root = libraryRoot(source);
    const [catalogResponse, assetResponse] = await Promise.all([fetch(`${root}catalog.json`), fetch(`${root}master.glb`)]);
    if (!catalogResponse.ok || !assetResponse.ok) return fail("Modellbibliothek konnte nicht geladen werden.");
    const payload = await assetResponse.arrayBuffer();
    const sha = hex(await crypto.subtle.digest("SHA-256", payload));
    const catalog = readCatalog(await catalogResponse.json() as unknown, source, sha);
    return { bytes: new Uint8Array(payload), catalog, sha };
  })().catch((error: unknown) => {
    byteCache.delete(source);
    throw error;
  });
  byteCache.set(source, pending);
  return pending;
}

function partNamesOf(catalog: Catalog): Set<string> {
  const names = new Set<string>();
  for (const slot of Object.values(catalog.slots)) for (const name of Object.values(slot)) if (name) names.add(name);
  for (const name of Object.values(catalog.equipment)) if (name) names.add(name);
  return names;
}

function selectedNames(catalog: Catalog, spec: ModularCharacterSpec): string[] {
  const names: string[] = [];
  for (const slot of MODULAR_SLOTS) {
    const name = catalog.slots[slot]?.[spec.parts[slot]];
    if (!name) return fail(`Modellteil ${spec.parts[slot]} fehlt im Katalog.`);
    names.push(name);
  }
  if (spec.equipment !== "none") {
    const gear = catalog.equipment[spec.equipment];
    if (gear) names.push(gear);
  }
  return names;
}

function restClip(equipment: ModularEquipment): string {
  if (equipment === "pistol") return "Idle_Gun";
  if (equipment === "sword") return "Idle_Sword";
  return "Idle_Neutral";
}

function facingYaw(dx: number, dy: number): number | null {
  if (dx === 0 && dy === 1) return 0;
  if (dx === 0 && dy === -1) return Math.PI;
  if (dx === 1 && dy === 0) return Math.PI / 2;
  if (dx === -1 && dy === 0) return -Math.PI / 2;
  return null;
}

function findGroup(actor: Actor, clip: string): AnimationGroup | undefined {
  return actor.groups.find((group) => group.name === `${actor.prefix}${clip}`);
}

function play(actor: Actor, clip: string, loop: boolean): void {
  if (actor.clip === clip && actor.loop === loop) return;
  for (const group of actor.groups) group.stop();
  actor.clip = clip;
  actor.loop = loop;
  findGroup(actor, clip)?.start(loop);
}

function place(actor: Actor, x: number, y: number): Vector3 {
  return new Vector3(x + 0.5, actor.baseY, y + 0.5);
}

function hopsFrom(x: number, y: number, route: readonly { readonly x: number; readonly y: number }[] | undefined, destX: number, destY: number): Hop[] | null {
  const cells = route && route.length > 0 ? route : [{ x: destX, y: destY }];
  const last = cells[cells.length - 1];
  if (!last || last.x !== destX || last.y !== destY) return null;
  const hops: Hop[] = [];
  for (const cell of cells) {
    const yaw = facingYaw(cell.x - x, cell.y - y);
    if (yaw === null) return null;
    hops.push({ x: cell.x, y: cell.y, yaw });
    x = cell.x;
    y = cell.y;
  }
  return hops;
}

function queueHops(actor: Actor, hops: readonly Hop[], now: number): void {
  const first = hops[0];
  if (!first) return;
  if (actor.travel) {
    actor.travel.steps.push(...hops);
    return;
  }
  actor.travel = { steps: [...hops], index: 0, from: actor.anchor.position.clone(), started: now };
  actor.anchor.rotation.y = first.yaw;
  play(actor, "Walk", true);
}

export function createMissionFigures(scene: Scene): MissionFigures {
  const actors = new Map<string, Actor>();
  const templates = new Map<ModularSourceId, Template>();
  let ready = false;
  let disposed = false;
  let loading: Promise<void> | null = null;
  const light = new DirectionalLight("figure-key", new Vector3(0.35, -1, 0.4), scene);
  light.intensity = 0.45;

  async function loadTemplate(source: ModularSourceId): Promise<Template> {
    const loaded = await loadBytes(source);
    const container = await LoadAssetContainerAsync(loaded.bytes, scene, {
      pluginExtension: ".glb",
      name: `${source}.glb`,
      pluginOptions: { gltf: { animationStartMode: GLTFLoaderAnimationStartMode.NONE } },
    });
    for (const mesh of container.meshes) {
      mesh.setEnabled(false);
      mesh.isVisible = false;
      mesh.isPickable = false;
    }
    return { container, catalog: loaded.catalog, partNames: partNamesOf(loaded.catalog) };
  }

  function ensure(): void {
    if (loading || ready || disposed) return;
    loading = (async () => {
      const male = await loadTemplate("quaternius-modular-men-v1");
      if (disposed) {
        male.container.dispose();
        return;
      }
      templates.set("quaternius-modular-men-v1", male);
      try {
        const female = await loadTemplate("modular-women-v1");
        if (disposed) {
          female.container.dispose();
          return;
        }
        templates.set("modular-women-v1", female);
      } catch (error) {
        console.error(error);
      }
      if (!disposed) ready = true;
    })().catch((error: unknown) => {
      console.error(error);
    });
  }

  function spawn(unit: FigureUnit): Actor | null {
    const preferred = missionLook(unit.id, unit.team);
    const choice = templates.has(preferred.source) ? preferred : preferred.source === "quaternius-modular-men-v1" ? null : maleStandIn(unit.id);
    const template = choice ? templates.get(choice.source) : undefined;
    if (!choice || !template) return null;
    const names = selectedNames(template.catalog, choice.spec);
    const unused = new Set([...template.partNames].filter((name) => !names.includes(name)));
    const prefix = `f:${unit.id}:`;
    const entries = template.container.instantiateModelsToScene((name) => `${prefix}${name}`, false, {
      predicate: (entity: { name?: string }) => !entity?.name || !unused.has(entity.name),
    });
    const anchor = new TransformNode(`figure-${unit.id}`, scene);
    for (const node of entries.rootNodes) node.parent = anchor;
    for (const node of entries.rootNodes) node.setEnabled(true);
    const meshes = anchor.getChildMeshes(false).filter((mesh) => mesh.getTotalVertices() > 0);
    if (meshes.length === 0) {
      for (const group of entries.animationGroups) group.dispose();
      for (const skeleton of entries.skeletons) skeleton.dispose();
      anchor.dispose(false, false);
      return null;
    }
    for (const mesh of meshes) {
      mesh.setEnabled(true);
      mesh.isVisible = true;
      mesh.isPickable = true;
    }
    anchor.position.set(0, 0, 0);
    anchor.scaling.setAll(1);
    anchor.computeWorldMatrix(true);
    const boundsY = () => {
      let low = Number.POSITIVE_INFINITY;
      let high = Number.NEGATIVE_INFINITY;
      for (const mesh of meshes) {
        mesh.computeWorldMatrix(true);
        const bounds = mesh.getBoundingInfo().boundingBox;
        low = Math.min(low, bounds.minimumWorld.y);
        high = Math.max(high, bounds.maximumWorld.y);
      }
      return { low, high };
    };
    const measured = boundsY();
    const span = measured.high - measured.low;
    anchor.scaling.setAll(Number.isFinite(span) && span > 0.2 ? TARGET_HEIGHT / span : TARGET_HEIGHT / 1.85);
    anchor.computeWorldMatrix(true);
    const fitted = boundsY();
    const actor: Actor = {
      id: unit.id,
      prefix,
      anchor,
      groups: entries.animationGroups,
      skeletons: entries.skeletons,
      rest: restClip(choice.spec.equipment),
      baseY: FLOOR_Y + (Number.isFinite(fitted.low) ? -fitted.low : 0),
      meshes,
      cellX: unit.x,
      cellY: unit.y,
      down: unit.down,
      clip: "",
      loop: false,
      travel: null,
    };
    anchor.position.copyFrom(place(actor, unit.x, unit.y));
    play(actor, unit.down ? "Death" : actor.rest, !unit.down);
    return actor;
  }

  function disposeActor(actor: Actor): void {
    for (const group of actor.groups) group.dispose();
    for (const skeleton of actor.skeletons) skeleton.dispose();
    actor.anchor.dispose(false, false);
  }

  function sync(units: readonly FigureUnit[]): { picks: FigurePick[]; shown: Set<string> } {
    ensure();
    const picks: FigurePick[] = [];
    const shown = new Set<string>();
    if (!ready) return { picks, shown };
    const live = new Set(units.map((unit) => unit.id));
    for (const [id, actor] of actors) {
      if (live.has(id)) continue;
      disposeActor(actor);
      actors.delete(id);
    }
    for (const unit of units) {
      let actor = actors.get(unit.id);
      if (!actor) {
        const created = spawn(unit);
        if (!created) continue;
        actor = created;
        actors.set(unit.id, actor);
      }
      if (actor.cellX !== unit.x || actor.cellY !== unit.y) {
        const hops = hopsFrom(actor.cellX, actor.cellY, unit.route, unit.x, unit.y);
        if (hops) queueHops(actor, hops, performance.now());
        else {
          actor.travel = null;
          const yaw = facingYaw(unit.x - actor.cellX, unit.y - actor.cellY);
          if (yaw !== null) actor.anchor.rotation.y = yaw;
          actor.anchor.position.copyFrom(place(actor, unit.x, unit.y));
        }
        actor.cellX = unit.x;
        actor.cellY = unit.y;
      }
      actor.down = unit.down;
      if (unit.down && !actor.travel) play(actor, "Death", false);
      else if (!unit.down && !actor.travel && actor.clip !== actor.rest) play(actor, actor.rest, true);
      shown.add(unit.id);
      for (const mesh of actor.meshes) picks.push({ mesh, x: unit.x, y: unit.y });
    }
    return { picks, shown };
  }

  function tick(now: number): void {
    if (!ready || disposed) return;
    for (const actor of actors.values()) {
      const travel = actor.travel;
      if (travel) {
        const hop = travel.steps[travel.index];
        if (!hop) {
          actor.travel = null;
        } else {
          const ratio = Math.min(1, (now - travel.started) / WALK_MS);
          Vector3.LerpToRef(travel.from, place(actor, hop.x, hop.y), ratio, actor.anchor.position);
          if (ratio >= 1) {
            travel.index += 1;
            const next = travel.steps[travel.index];
            if (!next) {
              actor.travel = null;
              if (actor.down) play(actor, "Death", false);
              else play(actor, actor.rest, true);
            } else {
              travel.from = actor.anchor.position.clone();
              travel.started = now;
              actor.anchor.rotation.y = next.yaw;
            }
          }
        }
      }
      if (!actor.down) continue;
      const death = findGroup(actor, "Death");
      if (death && !death.isPlaying) death.goToFrame(death.to);
    }
  }

  function visual(id: string): { x: number; z: number } | null {
    const actor = actors.get(id);
    if (!actor) return null;
    return { x: actor.anchor.position.x, z: actor.anchor.position.z };
  }

  function clear(): void {
    for (const actor of actors.values()) disposeActor(actor);
    actors.clear();
  }

  function dispose(): void {
    if (disposed) return;
    disposed = true;
    clear();
    for (const template of templates.values()) template.container.dispose();
    templates.clear();
    light.dispose();
  }

  return {
    get ready() {
      return ready;
    },
    sync,
    visual,
    tick,
    clear,
    dispose,
  };
}
