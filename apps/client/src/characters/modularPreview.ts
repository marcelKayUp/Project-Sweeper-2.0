import "@babylonjs/loaders/glTF/index.js";
import { GLTFLoaderAnimationStartMode } from "@babylonjs/loaders/glTF/glTFFileLoader.js";
import { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera.js";
import { Camera } from "@babylonjs/core/Cameras/camera.js";
import { Engine } from "@babylonjs/core/Engines/engine.js";
import { NullEngine } from "@babylonjs/core/Engines/nullEngine.js";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight.js";
import { DirectionalLight } from "@babylonjs/core/Lights/directionalLight.js";
import { Color3, Color4 } from "@babylonjs/core/Maths/math.color.js";
import { Vector3 } from "@babylonjs/core/Maths/math.vector.js";
import { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh.js";
import { Mesh } from "@babylonjs/core/Meshes/mesh.js";
import { Node } from "@babylonjs/core/node.js";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode.js";
import { AssetContainer } from "@babylonjs/core/assetContainer.js";
import { LoadAssetContainerAsync } from "@babylonjs/core/Loading/sceneLoader.js";
import { Scene } from "@babylonjs/core/scene.js";
import { Material } from "@babylonjs/core/Materials/material.js";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial.js";
import { PBRMaterial } from "@babylonjs/core/Materials/PBR/pbrMaterial.js";
import { PBRMetallicRoughnessMaterial } from "@babylonjs/core/Materials/PBR/pbrMetallicRoughnessMaterial.js";
import { GLTF2Export } from "@babylonjs/serializers/glTF/2.0/glTFSerializer.js";
import {
  MODULAR_EQUIPMENT, MODULAR_FEMALE_SOURCE_ID, MODULAR_PALETTE_ROLES, MODULAR_SLOTS, MODULAR_SOURCE_ID,
  MODULAR_SOURCE_IDS, getModularLibrary, modularPartName, validateModularCharacterSpec,
} from "@neon/characters";
import type { ModularCatalog, ModularCharacterSpec, ModularEquipment, ModularPaletteRole, ModularSlot, ModularSourceId, ModularVariant } from "@neon/characters";

export type ModularView = "front" | "iso" | "back" | "side";
export interface ModularPreviewReport { triangles: number; vertices: number; materials: number; bones: number; height: number; clips: readonly string[] }
export interface ModularCharacterPreview {
  setSpec(spec: ModularCharacterSpec): void;
  setClip(name: string): void;
  setPlaying(value: boolean): void;
  setView(view: ModularView): void;
  getReport(): ModularPreviewReport;
  exportGlb(): Promise<Blob>;
  dispose(): void;
}

const EXPECTED_CLIP_COUNT = 24;
const SOURCE_ASSETS: Readonly<Record<ModularSourceId, { root: string }>> = {
  [MODULAR_SOURCE_ID]: { root: "/assets/characters/quaternius/" },
  [MODULAR_FEMALE_SOURCE_ID]: { root: "/assets/characters/women/" },
};
const sourcePromises = new Map<ModularSourceId, Promise<{ bytes: Uint8Array; catalog: ModularCatalog }>>();
const pendingMounts = new WeakMap<HTMLElement, symbol>();

function fail(message: string): never { throw new Error(`Modulare Figurenpreview: ${message}`); }
function isRecord(value: unknown): value is Record<string, unknown> { return !!value && typeof value === "object" && !Array.isArray(value); }
function hashHex(bytes: ArrayBuffer): string { return [...new Uint8Array(bytes)].map((value) => value.toString(16).padStart(2, "0")).join(""); }

function validateCatalog(input: unknown, expectedSource?: ModularSourceId): ModularCatalog {
  if (!isRecord(input)) return fail("catalog.json enthält kein Objekt.");
  const catalog = input as unknown as ModularCatalog;
  if (catalog.schemaVersion !== 1 || !MODULAR_SOURCE_IDS.includes(catalog.sourceId) || (expectedSource && catalog.sourceId !== expectedSource)) return fail("Katalogversion oder Quellenkennung passt nicht zur gewählten Modellbibliothek.");
  const source = catalog.sourceId;
  const library = getModularLibrary(source);
  const catalogHeight = catalog.height;
  if (catalog.assetFile !== "master.glb" || !/^[a-f0-9]{64}$/i.test(catalog.assetSha256) || !/^[a-f0-9]{64}$/i.test(catalog.sourceBlendSha256)) return fail("Katalog enthält ungültige Dateihashes oder einen unerwarteten Assetpfad.");
  if (source === MODULAR_SOURCE_ID) {
    if (typeof catalog.author !== "string" || !catalog.author.trim() || typeof catalog.license !== "string" || !/CC0/i.test(catalog.license) || typeof catalog.sourceUrl !== "string" || !/^https:\/\//.test(catalog.sourceUrl)) return fail("Quellen- und Lizenzangaben der Quaternius-Bibliothek fehlen oder sind ungültig.");
  } else if (catalog.author !== "Unverified (user-provided)" || catalog.license !== "LicenseRef-UserProvided-Unverified" || catalog.sourceUrl !== "") return fail("Quellenangaben der weiblichen Bibliothek müssen als ungeprüft gekennzeichnet sein.");
  if (!Array.isArray(catalog.variants) || catalog.variants.length !== library.variants.length || library.variants.some((variant) => !catalog.variants.includes(variant))) return fail("Der Katalog listet nicht exakt die Outfitvarianten seiner Modellbibliothek.");
  if (!isRecord(catalog.slots) || !isRecord(catalog.equipment)) return fail("Katalog-Slots oder Ausrüstung fehlen.");
  for (const slot of MODULAR_SLOTS) {
    const slotMap = catalog.slots[slot];
    if (!isRecord(slotMap)) return fail(`Katalog-Slot ${slot} ist ungültig.`);
    for (const variant of library.variants) if (slotMap[variant] !== modularPartName(slot, variant, source)) return fail(`Katalogteil ${variant}/${slot} fehlt oder hat einen unerwarteten Namen.`);
    if (Object.keys(slotMap).some((variant) => !library.variants.includes(variant as ModularVariant))) return fail(`Katalog-Slot ${slot} enthält eine Variante aus einer anderen Modellbibliothek.`);
  }
  const expectedEquipment: Readonly<Record<ModularEquipment, string | null>> = source === MODULAR_SOURCE_ID
    ? { none: null, backpack: "Backpack", pistol: "Pistol", sword: "Sword" }
    : { none: null, backpack: null, pistol: "Pistol", sword: "Sword" };
  if (Object.keys(catalog.equipment).some((item) => !MODULAR_EQUIPMENT.includes(item as ModularEquipment)) || Object.values(catalog.equipment).some((item) => item !== null && typeof item !== "string") || MODULAR_EQUIPMENT.some((item) => catalog.equipment[item] !== expectedEquipment[item])) return fail("Katalog-Ausrüstung passt nicht zur gewählten Modellbibliothek.");
  if (!Array.isArray(catalog.clips) || catalog.clips.length !== EXPECTED_CLIP_COUNT || catalog.clips.some((name) => typeof name !== "string" || !name.trim()) || new Set(catalog.clips).size !== catalog.clips.length) return fail("Es werden 24 eindeutige, benannte Quellanimationen erwartet.");
  if (!isRecord(catalog.rig) || typeof catalog.rig.name !== "string" || !catalog.rig.name || catalog.rig.bones !== 62 || typeof catalogHeight !== "number" || !Number.isFinite(catalogHeight) || catalogHeight <= 0) return fail("Rig- oder Maßangaben im Katalog sind ungültig.");
  return catalog.height === catalogHeight ? catalog : { ...catalog, height: catalogHeight };
}

async function loadSource(source: ModularSourceId): Promise<{ bytes: Uint8Array; catalog: ModularCatalog }> {
  let sourcePromise = sourcePromises.get(source);
  if (!sourcePromise) sourcePromise = (async () => {
    const { root } = SOURCE_ASSETS[source];
    const [catalogResponse, assetResponse] = await Promise.all([fetch(`${root}catalog.json`), fetch(`${root}master.glb`)]);
    if (!catalogResponse.ok) return fail(`Katalog konnte nicht geladen werden (HTTP ${catalogResponse.status}).`);
    if (!assetResponse.ok) return fail(`Modellbibliothek konnte nicht geladen werden (HTTP ${assetResponse.status}).`);
    const catalog = validateCatalog(await catalogResponse.json() as unknown, source);
    const bytes = new Uint8Array(await assetResponse.arrayBuffer());
    if (bytes.byteLength < 20) return fail("master.glb ist leer oder abgeschnitten.");
    const digest = hashHex(await crypto.subtle.digest("SHA-256", bytes));
    if (digest.toLowerCase() !== catalog.assetSha256.toLowerCase()) return fail("SHA-256 von master.glb stimmt nicht mit catalog.json überein.");
    return { bytes, catalog };
  })().catch((error: unknown) => { sourcePromises.delete(source); throw error; });
  sourcePromises.set(source, sourcePromise);
  return sourcePromise;
}

function validateSpec(value: unknown): ModularCharacterSpec {
  const parsed = validateModularCharacterSpec(value);
  if (!parsed.ok) return fail(parsed.errors.join(" "));
  return parsed.value;
}
function assertSpecInCatalog(spec: ModularCharacterSpec, catalog: ModularCatalog): void {
  if (spec.source !== catalog.sourceId) fail("Figur und Assetkatalog stammen aus verschiedenen Modellbibliotheken.");
  const library = getModularLibrary(catalog.sourceId);
  for (const slot of MODULAR_SLOTS) if (!library.variants.includes(spec.parts[slot]) || !catalog.variants.includes(spec.parts[slot]) || !catalog.slots[slot][spec.parts[slot]]) fail(`Variante ${spec.parts[slot]} für ${slot} fehlt in der Assetbibliothek.`);
  if (!library.equipment.includes(spec.equipment) || !(spec.equipment in catalog.equipment) || catalog.equipment[spec.equipment] === null && spec.equipment !== "none") fail(`Ausrüstung ${spec.equipment} ist im Assetkatalog nicht verfügbar.`);
}

async function loadContainer(scene: Scene, bytes: Uint8Array): Promise<AssetContainer> {
  try {
    return await LoadAssetContainerAsync(bytes, scene, {
      pluginExtension: ".glb", name: "quaternius-master.glb",
      pluginOptions: { gltf: { animationStartMode: GLTFLoaderAnimationStartMode.NONE } },
    });
  }
  catch (error) { return fail(`master.glb ließ sich nicht lesen: ${error instanceof Error ? error.message : String(error)}`); }
}

type RigAsset = { container: AssetContainer; wrapper: TransformNode; roots: Map<string, TransformNode | AbstractMesh>; meshes: Mesh[]; nodes: TransformNode[]; skeletonCount: number };
function collectRig(container: AssetContainer, catalog: ModularCatalog): RigAsset {
  const allNodes = [...container.transformNodes, ...container.meshes];
  const byName = new Map<string, (TransformNode | AbstractMesh)[]>();
  for (const node of allNodes) byName.set(node.name, [...(byName.get(node.name) ?? []), node]);
  const roots = new Map<string, TransformNode | AbstractMesh>();
  const pickRoot = (name: string): TransformNode | AbstractMesh | undefined => {
    const candidates = byName.get(name) ?? [];
    // Some glTFs contain empty scene-level placeholders with the same name as
    // the actual skinned part. Prefer the branch that owns the mesh primitives.
    return candidates.find((node) => node instanceof AbstractMesh && node.getTotalVertices() > 0)
      ?? candidates.find((node) => node.getChildMeshes(false).some((mesh) => mesh.getTotalVertices() > 0))
      ?? candidates[0];
  };
  for (const slot of MODULAR_SLOTS) for (const variant of catalog.variants) {
    const name = catalog.slots[slot][variant];
    if (!name) fail(`Katalogteil ${variant}/${slot} fehlt.`);
    const root = pickRoot(name);
    if (!root) fail(`Das Modellteil „${name}“ aus dem Katalog fehlt in master.glb.`);
    roots.set(name, root);
  }
  for (const item of Object.values(catalog.equipment)) if (item) {
    const root = pickRoot(item);
    if (!root) fail(`Das Zubehör „${item}“ aus dem Katalog fehlt in master.glb.`);
    roots.set(item, root);
  }
  const meshes = container.meshes.filter((mesh): mesh is Mesh => mesh instanceof Mesh);
  const nodes = container.transformNodes;
  const skeletonCount = container.skeletons.reduce((count, skeleton) => count + skeleton.bones.length, 0);
  if (skeletonCount !== catalog.rig.bones) fail(`Rig hat ${skeletonCount} Knochen; Katalog erwartet ${catalog.rig.bones}.`);
  const loadedClips = new Set(container.animationGroups.map((group) => group.name));
  const missingClips = catalog.clips.filter((name) => !loadedClips.has(name));
  if (missingClips.length) fail(`Native Clips fehlen in master.glb: ${missingClips.join(", ")}.`);
  const wrapper = new TransformNode("modular_character_root", container.scene);
  wrapper.metadata = { source: catalog.sourceId };
  for (const node of container.rootNodes) node.parent = wrapper;
  return { container, wrapper, roots, meshes, nodes, skeletonCount };
}

function descendants(root: TransformNode | AbstractMesh): AbstractMesh[] {
  return [root as AbstractMesh, ...root.getChildMeshes(false)];
}
function selectedRoots(spec: ModularCharacterSpec, catalog: ModularCatalog, rig: RigAsset): (TransformNode | AbstractMesh)[] {
  const names = [
    ...MODULAR_SLOTS.map((slot) => {
      const name = catalog.slots[slot][spec.parts[slot]];
      if (!name) return fail(`Katalogteil ${spec.parts[slot]}/${slot} fehlt.`);
      return name;
    }),
    ...(spec.equipment === "none" ? [] : [catalog.equipment[spec.equipment]!]),
  ];
  return names.map((name) => {
    const root = rig.roots.get(name);
    if (!root) return fail(`Figurenteil ${name} fehlt.`);
    return root;
  });
}

function inferredRole(mesh: AbstractMesh, rootName: string): ModularPaletteRole | null {
  const materialName = (mesh.material?.name ?? "").toLowerCase();
  const partName = `${mesh.name} ${rootName}`.toLowerCase();
  if (/eyebrow|hair|beard|moustache|mustache/.test(materialName)) return "hair";
  if (/^eye$|eyeball|pupil|iris|teeth|mouth|lens/.test(materialName)) return null;
  if (/skin_darker|^skin$|flesh/.test(materialName)) return "skin";
  if (/visor|gold|earrings|^tie$|^red(?:_dark)?$|worker_yellow|sci.?fi_light_accent/.test(materialName)) return "accent";
  if (/armor|armour|helmet|vest|plate|metal|weapon|pistol|sword|backpack|boot|sci.?fi_(?:main|light)|worker_vest/.test(materialName)) return "armor";
  if (/hair|beard|brow|moustache|mustache/.test(partName)) return "hair";
  if (/eye|teeth|mouth|lens/.test(partName)) return null;
  if (/skin|face|hand|flesh/.test(materialName)) return "skin";
  if (/armor|armour|helmet|vest|plate|metal|weapon|pistol|sword|backpack|boot/.test(partName)) return "armor";
  if (/accent|trim|glow|neon|stripe|badge|emblem/.test(partName)) return "accent";
  if (/head/.test(rootName)) return null;
  if (/feet/.test(rootName)) return "armor";
  return "cloth";
}

function setMaterialColor(material: Material, hex: string): boolean {
  const color = Color3.FromHexString(hex);
  if (material instanceof PBRMetallicRoughnessMaterial) material.baseColor = color.toLinearSpace();
  else if (material instanceof PBRMaterial) material.albedoColor = color.toLinearSpace();
  else if (material instanceof StandardMaterial) material.diffuseColor = color;
  else return false;
  return true;
}

function hexKey(color: string): string { return color.toUpperCase(); }
function applyPalette(spec: ModularCharacterSpec, roots: readonly (TransformNode | AbstractMesh)[], meshes: readonly Mesh[], materialClones: Map<string, Material>): void {
  const rootForMesh = new Map<AbstractMesh, string>();
  for (const root of roots) for (const mesh of descendants(root)) rootForMesh.set(mesh, root.name);
  for (const mesh of meshes) {
    const source = mesh.metadata?.modularSourceMaterial as Material | null | undefined;
    if (!source) continue;
    mesh.material = source;
    const role = inferredRole(mesh, rootForMesh.get(mesh) ?? "");
    const color = role ? spec.palette[role] : null;
    if (!color) continue;
    const key = `${source.uniqueId}:${role}:${hexKey(color)}`;
    let clone: Material | null | undefined = materialClones.get(key);
    if (!clone) {
      clone = source.clone(`${source.name}_${role}_${hexKey(color).slice(1)}`);
      if (!clone || !setMaterialColor(clone, color)) { clone?.dispose(); continue; }
      clone.metadata = { ...(source.metadata ?? {}), paletteRole: role, originalMaterial: source.name };
      materialClones.set(key, clone);
    }
    mesh.material = clone;
  }
}

function configureVisibility(rig: RigAsset, roots: readonly (TransformNode | AbstractMesh)[], targetHeight: number): void {
  const enabled = new Set<AbstractMesh>();
  const enabledNodes = new Set<TransformNode | AbstractMesh>();
  for (const root of roots) {
    enabledNodes.add(root);
    for (const child of root.getDescendants(false)) enabledNodes.add(child as TransformNode | AbstractMesh);
    for (const mesh of descendants(root)) enabled.add(mesh);
  }
  for (const mesh of rig.meshes) {
    if (mesh.name === "__root__") continue;
    const show = enabled.has(mesh);
    mesh.setEnabled(show);
    mesh.isVisible = show;
  }
  for (const partRoot of rig.roots.values()) {
    if (partRoot instanceof TransformNode) partRoot.setEnabled(enabledNodes.has(partRoot));
  }
  const bodyMeshes = new Set<AbstractMesh>();
  for (const root of roots.slice(0, MODULAR_SLOTS.length)) for (const mesh of descendants(root)) bodyMeshes.add(mesh);
  rig.wrapper.scaling.setAll(1);
  rig.wrapper.position.y = 0;
  rig.wrapper.computeWorldMatrix(true);
  let bottom = Number.POSITIVE_INFINITY;
  let top = Number.NEGATIVE_INFINITY;
  for (const mesh of rig.meshes) if (bodyMeshes.has(mesh) && mesh.getTotalVertices() > 0) {
    mesh.computeWorldMatrix(true);
    const bounds = mesh.getBoundingInfo().boundingBox;
    bottom = Math.min(bottom, bounds.minimumWorld.y);
    top = Math.max(top, bounds.maximumWorld.y);
  }
  if (!Number.isFinite(bottom) || !Number.isFinite(top) || top <= bottom) fail("Die ausgewählten Figurenteile besitzen keine gültige Höhe.");
  rig.wrapper.scaling.setAll(targetHeight / (top - bottom));
  rig.wrapper.computeWorldMatrix(true);
  bottom = Number.POSITIVE_INFINITY;
  for (const mesh of rig.meshes) if (bodyMeshes.has(mesh) && mesh.getTotalVertices() > 0) {
    mesh.computeWorldMatrix(true);
    bottom = Math.min(bottom, mesh.getBoundingInfo().boundingBox.minimumWorld.y);
  }
  if (Number.isFinite(bottom)) rig.wrapper.position.y = -bottom;
  rig.wrapper.computeWorldMatrix(true);
}

function setMetadata(rig: RigAsset, spec: ModularCharacterSpec, catalog: ModularCatalog): void {
  const meta = {
    source: catalog.sourceId, sourceUrl: catalog.sourceUrl, author: catalog.author, license: catalog.license,
    assetFile: catalog.assetFile, assetSha256: catalog.assetSha256, sourceBlendSha256: catalog.sourceBlendSha256,
    spec, rig: catalog.rig, clips: catalog.clips,
  };
  rig.wrapper.metadata = { ...(rig.wrapper.metadata ?? {}), modularCharacter: meta, gltf: { extras: { modularCharacter: meta } } };
}

function reportFor(roots: readonly (TransformNode | AbstractMesh)[], meshes: readonly Mesh[], bones: number, height: number, clips: readonly string[]): ModularPreviewReport {
  const selected = new Set<AbstractMesh>();
  for (const root of roots) for (const mesh of descendants(root)) selected.add(mesh);
  const visibleMeshes = meshes.filter((mesh) => selected.has(mesh) && mesh.getTotalVertices() > 0);
  const materials = new Set(visibleMeshes.map((mesh) => mesh.material).filter((material): material is Material => !!material));
  return {
    triangles: visibleMeshes.reduce((total, mesh) => total + (mesh.getTotalIndices() ? mesh.getTotalIndices() / 3 : 0), 0),
    vertices: visibleMeshes.reduce((total, mesh) => total + mesh.getTotalVertices(), 0),
    materials: materials.size, bones, height, clips,
  };
}

async function prepareScene(scene: Scene, bytes: Uint8Array, spec: ModularCharacterSpec, catalog: ModularCatalog): Promise<{ rig: RigAsset; roots: (TransformNode | AbstractMesh)[]; clones: Map<string, Material> }> {
  assertSpecInCatalog(spec, catalog);
  const container = await loadContainer(scene, bytes);
  container.addAllToScene();
  const rig = collectRig(container, catalog);
  for (const mesh of rig.meshes) mesh.metadata = { ...(mesh.metadata ?? {}), modularSourceMaterial: mesh.material };
  const roots = selectedRoots(spec, catalog, rig);
  configureVisibility(rig, roots, 1.05 * spec.stature);
  const clones = new Map<string, Material>();
  applyPalette(spec, roots, rig.meshes, clones);
  setMetadata(rig, spec, catalog);
  return { rig, roots, clones };
}

function canonicalizeSkinnedMeshRoots(glb: Blob, catalog: ModularCatalog): Promise<Blob> {
  return glb.arrayBuffer().then((buffer) => {
    const input = new Uint8Array(buffer);
    const inputView = new DataView(buffer);
    if (input.byteLength < 20 || inputView.getUint32(0, true) !== 0x46546c67 || inputView.getUint32(4, true) !== 2) return fail("Babylon lieferte keinen gültigen glTF-2.0-GLB-Container.");
    const chunks: { type: number; data: Uint8Array }[] = [];
    let offset = 12;
    while (offset + 8 <= input.byteLength) {
      const length = inputView.getUint32(offset, true);
      const type = inputView.getUint32(offset + 4, true);
      const start = offset + 8;
      if (length % 4 !== 0 || start + length > input.byteLength) return fail("GLB enthält einen abgeschnittenen oder falsch ausgerichteten Chunk.");
      chunks.push({ type, data: input.subarray(start, start + length) });
      offset = start + length;
    }
    if (offset !== input.byteLength) return fail("GLB-Chunkgrenzen sind ungültig.");
    const jsonChunk = chunks.find((chunk) => chunk.type === 0x4e4f534a);
    if (!jsonChunk) return fail("GLB enthält keinen JSON-Chunk.");
    let document: { nodes?: Record<string, unknown>[]; scenes?: { nodes?: number[] }[]; scene?: number };
    try { document = JSON.parse(new TextDecoder().decode(jsonChunk.data).replace(/[\u0000\u0020]+$/g, "")) as typeof document; }
    catch { return fail("GLB-JSON ist ungültig."); }
    if (!Array.isArray(document.nodes) || !Array.isArray(document.scenes) || !document.scenes.length) return fail("GLB besitzt keine gültigen Nodes oder Szenen.");
    const parents = new Map<number, number>();
    document.nodes.forEach((node, parentIndex) => {
      if (Array.isArray(node.children)) for (const child of node.children) {
        if (typeof child !== "number" || child < 0 || child >= document.nodes!.length || parents.has(child)) return fail(`GLB enthält eine ungültige Node-Elternschaft bei Node ${child}.`);
        parents.set(child, parentIndex);
      }
    });
    const expectedPartNames = new Set([
      ...MODULAR_SLOTS.flatMap((slot) => catalog.variants.map((variant) => modularPartName(slot, variant, catalog.sourceId))),
      ...Object.values(catalog.equipment).filter((item): item is string => typeof item === "string"),
    ]);
    const skinned = document.nodes.flatMap((node, index) => node.skin === undefined ? [] : [index]);
    const roots = new Set(document.scenes[document.scene ?? 0]?.nodes ?? []);
    const removed = new Set<number>();
    const redirects = new Map<number, number>();
    const claimedPartNames = new Set<string>();
    for (const index of skinned) {
      const parent = parents.get(index);
      if (parent !== undefined) {
        const parentNode = document.nodes[parent]!;
        const children = (parentNode.children as number[] | undefined) ?? [];
        parentNode.children = children.filter((child) => child !== index);
        if (typeof parentNode.name === "string" && expectedPartNames.has(parentNode.name) && !claimedPartNames.has(parentNode.name)) {
          // Move the source's named slot object onto its first real skinned
          // primitive before compacting away the empty transform anchor.
          document.nodes[index]!.name = parentNode.name;
          document.nodes[index]!.extras = { ...(parentNode.extras as Record<string, unknown> | undefined), ...(document.nodes[index]!.extras as Record<string, unknown> | undefined) };
          removed.add(parent);
          redirects.set(parent, index);
          claimedPartNames.add(parentNode.name);
        }
      }
      // glTF defines a skinned mesh in joint space and requires its node to be a
      // scene root. The former part anchor is compacted away below.
      delete document.nodes[index]!.translation;
      delete document.nodes[index]!.rotation;
      delete document.nodes[index]!.scale;
      delete document.nodes[index]!.matrix;
      roots.add(index);
    }
    // Empty mesh-part anchors cannot remain in a canonical glTF scene. Remove
    // them while remapping all node-index references; their names/extras now sit
    // on the first skinned primitive of each part.
    const oldToNew = new Map<number, number>();
    let nextIndex = 0;
    document.nodes.forEach((_node, oldIndex) => { if (!removed.has(oldIndex)) oldToNew.set(oldIndex, nextIndex++); });
    for (const [oldIndex, target] of redirects) {
      const targetIndex = oldToNew.get(target);
      if (targetIndex !== undefined) oldToNew.set(oldIndex, targetIndex);
    }
    const remapNode = (index: number): number => {
      const mapped = oldToNew.get(index);
      if (mapped === undefined) return fail(`GLB-Nodeindex ${index} konnte nicht kanonisiert werden.`);
      return mapped;
    };
    const compactedNodes = document.nodes.filter((_node, index) => !removed.has(index));
    for (const node of compactedNodes) {
      if (Array.isArray(node.children)) node.children = node.children.filter((child) => !removed.has(child as number)).map((child) => remapNode(child as number));
    }
    for (const scene of document.scenes) if (Array.isArray(scene.nodes)) scene.nodes = scene.nodes.filter((index) => !removed.has(index)).map(remapNode);
    for (const skin of (document as typeof document & { skins?: { joints: number[]; skeleton?: number }[] }).skins ?? []) {
      skin.joints = skin.joints.map(remapNode);
      if (skin.skeleton !== undefined) skin.skeleton = remapNode(skin.skeleton);
    }
    for (const animation of (document as typeof document & { animations?: { channels?: { target?: { node?: number } }[] }[] }).animations ?? []) {
      for (const channel of animation.channels ?? []) if (channel.target?.node !== undefined) channel.target.node = remapNode(channel.target.node);
    }
    document.nodes = compactedNodes;
    const activeScene = document.scenes[document.scene ?? 0]!;
    activeScene.nodes = [...new Set([...(activeScene.nodes ?? []), ...[...roots].map(remapNode)])].sort((a, b) => a - b);
    const jsonBytes = new TextEncoder().encode(JSON.stringify(document));
    const paddedJson = new Uint8Array((jsonBytes.byteLength + 3) & ~3);
    paddedJson.fill(0x20);
    paddedJson.set(jsonBytes);
    const outputChunks = chunks.map((chunk) => chunk.type === 0x4e4f534a ? { type: chunk.type, data: paddedJson } : chunk);
    const totalLength = 12 + outputChunks.reduce((total, chunk) => total + 8 + chunk.data.byteLength, 0);
    const output = new Uint8Array(totalLength);
    const view = new DataView(output.buffer);
    view.setUint32(0, 0x46546c67, true);
    view.setUint32(4, 2, true);
    view.setUint32(8, totalLength, true);
    offset = 12;
    for (const chunk of outputChunks) {
      view.setUint32(offset, chunk.data.byteLength, true);
      view.setUint32(offset + 4, chunk.type, true);
      output.set(chunk.data, offset + 8);
      offset += 8 + chunk.data.byteLength;
    }
    return new Blob([output], { type: "model/gltf-binary" });
  });
}

async function serializeSource(bytes: Uint8Array, spec: ModularCharacterSpec, catalog: ModularCatalog): Promise<{ blob: Blob; report: ModularPreviewReport }> {
  const engine = new NullEngine({ renderWidth: 1, renderHeight: 1, textureSize: 1, deterministicLockstep: false, lockstepMaxSteps: 4 });
  const scene = new Scene(engine);
  scene.useRightHandedSystem = true;
  let prepared: Awaited<ReturnType<typeof prepareScene>> | undefined;
  try {
    prepared = await prepareScene(scene, bytes, spec, catalog);
    const { rig, roots } = prepared;
    const report = reportFor(roots, rig.meshes, rig.skeletonCount, 1.05 * spec.stature, catalog.clips);
    const keep = new Set<unknown>();
    const addWithAncestors = (node: Node): void => {
      let current: Node | null = node;
      while (current && !keep.has(current)) { keep.add(current); current = current.parent as typeof current | null; }
    };
    addWithAncestors(rig.wrapper);
    for (const root of roots) {
      addWithAncestors(root);
      root.getDescendants(false).forEach((node) => addWithAncestors(node));
    }
    rig.container.skeletons.forEach((skeleton) => {
      keep.add(skeleton);
      skeleton.bones.forEach((bone) => { const node = bone.getTransformNode(); if (node) addWithAncestors(node); });
    });
    rig.container.animationGroups.forEach((group) => group.targetedAnimations.forEach((animation) => addWithAncestors(animation.target)));
    // Filter away helper cameras/lights and all unused outfit roots. Export from
    // this fresh scene so the user's selected preview frame can never be baked.
    const data = await GLTF2Export.GLBAsync(scene, `${spec.id}-modular`, {
      shouldExportNode: (node) => keep.has(node) && !(node instanceof Camera),
      metadataSelector: (metadata) => metadata?.gltf?.extras,
      removeNoopRootNodes: false,
      exportWithoutWaitingForScene: true,
    });
    const blob = data.files[`${spec.id}-modular.glb`];
    if (!(blob instanceof Blob)) return fail("Babylon lieferte keinen binären Figuren-GLB.");
    return { blob: await canonicalizeSkinnedMeshRoots(blob, catalog), report };
  } finally {
    prepared?.rig.container.dispose();
    prepared?.clones.forEach((material) => material.dispose());
    scene.dispose();
    engine.dispose();
  }
}

/** Browserfreie GLB-Produktion: Aufrufer übergibt die lokalen Quelldateien als Bytes und Katalog. */
export async function exportModularCharacterGlb(specInput: ModularCharacterSpec, sourceBytes?: Uint8Array, catalogInput?: ModularCatalog): Promise<{ blob: Blob; report: ModularPreviewReport }> {
  const spec = validateSpec(specInput);
  let bytes = sourceBytes;
  let catalog = catalogInput;
  if (!bytes || !catalog) {
    if (typeof window !== "undefined") {
      const loaded = await loadSource(spec.source);
      bytes ??= loaded.bytes;
      catalog ??= loaded.catalog;
    } else return fail("Node-Export benötigt sourceBytes und catalog; HTTP und DOM sind dort deaktiviert.");
  }
  catalog = validateCatalog(catalog);
  if (bytes.byteLength < 20) return fail("Die übergebenen GLB-Bytes sind leer oder abgeschnitten.");
  const digest = hashHex(await crypto.subtle.digest("SHA-256", Uint8Array.from(bytes).buffer));
  if (digest.toLowerCase() !== catalog.assetSha256.toLowerCase()) return fail("SHA-256 der übergebenen master.glb-Bytes stimmt nicht mit catalog.json überein.");
  assertSpecInCatalog(spec, catalog);
  return serializeSource(bytes, spec, catalog);
}

/** Lädt die feste Modellbibliothek einmal aus den Projekt-Assets. */
export async function mountModularCharacterPreview(host: HTMLElement, initialSpec: ModularCharacterSpec): Promise<ModularCharacterPreview> {
  const mountToken = Symbol("modular preview mount");
  pendingMounts.set(host, mountToken);
  const spec0 = validateSpec(initialSpec);
  const { bytes, catalog } = await loadSource(spec0.source);
  if (pendingMounts.get(host) !== mountToken || !host.isConnected) return fail("Preview wurde geschlossen, bevor die Modellbibliothek geladen war.");
  assertSpecInCatalog(spec0, catalog);
  const canvas = document.createElement("canvas");
  canvas.className = "character-preview-canvas";
  canvas.tabIndex = 0;
  canvas.setAttribute("aria-label", "Modulare 3D-Figur, ziehen zum Drehen, Mausrad zum Zoomen");
  host.replaceChildren(canvas);
  let disposed = false;
  const engine = new Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true }, false);
  const scene = new Scene(engine);
  scene.useRightHandedSystem = true;
  scene.clearColor = new Color4(0.22, 0.25, 0.28, 1);
  scene.ambientColor = new Color3(0.14, 0.15, 0.16);
  const camera = new ArcRotateCamera("modular_character_camera", Math.PI / 2, Math.PI / 2, 2.9, new Vector3(0, 0.525 * spec0.stature, 0), scene);
  camera.mode = Camera.ORTHOGRAPHIC_CAMERA;
  camera.minZ = 0.02;
  camera.maxZ = 100;
  camera.lowerRadiusLimit = 1.2;
  camera.upperRadiusLimit = 7;
  camera.wheelPrecision = 40;
  camera.panningSensibility = 0;
  camera.attachControl(canvas, true);
  const key = new DirectionalLight("modular_preview_key", new Vector3(-0.45, -0.85, 0.55), scene);
  key.intensity = 1.15;
  const fill = new HemisphericLight("modular_preview_fill", new Vector3(0.15, 1, -0.25), scene);
  fill.intensity = 0.78;
  fill.groundColor = new Color3(0.2, 0.22, 0.24);
  let container: AssetContainer;
  try { container = await loadContainer(scene, bytes); }
  catch (error) { scene.dispose(); engine.dispose(); throw error; }
  if (disposed || pendingMounts.get(host) !== mountToken || !host.isConnected) { container.dispose(); scene.dispose(); engine.dispose(); return fail("Preview wurde während des Modellladens geschlossen."); }
  container.addAllToScene();
  let rig: RigAsset;
  try { rig = collectRig(container, catalog); }
  catch (error) { container.dispose(); scene.dispose(); engine.dispose(); throw error; }
  for (const mesh of rig.meshes) mesh.metadata = { ...(mesh.metadata ?? {}), modularSourceMaterial: mesh.material };
  let currentSpec = spec0;
  let currentRoots = selectedRoots(currentSpec, catalog, rig);
  let materialClones = new Map<string, Material>();
  let selectedClip = catalog.clips.includes("Idle_Neutral") ? "Idle_Neutral" : catalog.clips.includes("Idle") ? "Idle" : catalog.clips[0]!;
  let playing = true;
  function setSpec(specInput: ModularCharacterSpec): void {
    if (disposed) throw new Error("Die Figurenpreview ist bereits geschlossen.");
    const next = validateSpec(specInput);
    if (next.source !== catalog.sourceId) throw new Error("Für einen Wechsel der Modellbibliothek muss die Preview neu geladen werden.");
    assertSpecInCatalog(next, catalog);
    currentSpec = next;
    camera.target.y = 0.525 * currentSpec.stature;
    currentRoots = selectedRoots(currentSpec, catalog, rig);
    configureVisibility(rig, currentRoots, 1.05 * currentSpec.stature);
    materialClones.forEach((material) => material.dispose());
    materialClones = new Map();
    applyPalette(currentSpec, currentRoots, rig.meshes, materialClones);
    setMetadata(rig, currentSpec, catalog);
  }
  configureVisibility(rig, currentRoots, 1.05 * currentSpec.stature);
  applyPalette(currentSpec, currentRoots, rig.meshes, materialClones);
  setMetadata(rig, currentSpec, catalog);
  function activateClip(name: string): void {
    if (!catalog.clips.includes(name)) throw new Error(`Unbekannter Clip „${name}“.`);
    const group = rig.container.animationGroups.find((item) => item.name === name);
    if (!group) throw new Error(`Der Katalogclip „${name}“ fehlt in master.glb.`);
    rig.container.animationGroups.forEach((item) => item.stop(true));
    selectedClip = name;
    group.start(true);
    group.goToFrame(group.from);
    if (!playing) group.pause();
  }
  activateClip(selectedClip);
  function updateProjection(): void {
    if (disposed) return;
    const aspect = Math.max(0.45, canvas.clientWidth / Math.max(canvas.clientHeight, 1));
    // At the default radius, frame the normalized figure at about 68% of the
    // stage height. Keep the model centered while wheel zoom adjusts the view.
    const half = 1.05 * currentSpec.stature * (camera.radius / 2.9) / 1.36;
    camera.orthoTop = half;
    camera.orthoBottom = -half;
    camera.orthoLeft = -half * aspect;
    camera.orthoRight = half * aspect;
  }
  function resize(): void {
    if (disposed) return;
    engine.resize();
    updateProjection();
  }
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(host);
  const cameraObserver = camera.onViewMatrixChangedObservable.add(updateProjection);
  resize();
  engine.runRenderLoop(() => { if (!disposed) scene.render(); });

  return {
    setSpec,
    setClip(name) { activateClip(name); },
    setPlaying(value) {
      playing = value;
      const group = rig.container.animationGroups.find((item) => item.name === selectedClip);
      if (!group) return;
      if (value) { if (group.isStarted && !group.isPlaying) group.restart(); else if (!group.isStarted) group.start(true); }
      else group.pause();
    },
    setView(view) {
      const views: Readonly<Record<ModularView, { alpha: number; beta: number }>> = {
        front: { alpha: Math.PI / 2, beta: Math.PI / 2 }, iso: { alpha: Math.PI / 4, beta: 1.2 },
        back: { alpha: -Math.PI / 2, beta: Math.PI / 2 }, side: { alpha: 0, beta: Math.PI / 2 },
      };
      const target = views[view];
      if (!target) throw new Error(`Unbekannte Figurenansicht: ${String(view)}`);
      camera.alpha = target.alpha;
      camera.beta = target.beta;
    },
    getReport() { return reportFor(currentRoots, rig.meshes, rig.skeletonCount, 1.05 * currentSpec.stature, catalog.clips); },
    async exportGlb() { return (await serializeSource(bytes, currentSpec, catalog)).blob; },
    dispose() {
      if (disposed) return;
      disposed = true;
      if (pendingMounts.get(host) === mountToken) pendingMounts.delete(host);
      resizeObserver.disconnect();
      camera.onViewMatrixChangedObservable.remove(cameraObserver);
      engine.stopRenderLoop();
      materialClones.forEach((material) => material.dispose());
      rig.container.dispose();
      scene.dispose();
      engine.dispose();
      if (host.contains(canvas)) host.replaceChildren();
    },
  };
}
