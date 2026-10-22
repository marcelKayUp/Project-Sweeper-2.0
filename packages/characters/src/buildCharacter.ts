import type {
  CharacterGeometry,
  CharacterPart,
  CharacterSpec,
  PaletteRole,
  RigJoint,
  Vec3Tuple,
} from "./types.ts";
import { validateCharacterSpec } from "./spec.ts";

const JOINT_IDS = [
  "Hips", "Spine", "Chest", "Neck", "Head",
  "LeftShoulder", "LeftUpperArm", "LeftLowerArm", "LeftHand",
  "RightShoulder", "RightUpperArm", "RightLowerArm", "RightHand",
  "LeftUpperLeg", "LeftLowerLeg", "LeftFoot", "RightUpperLeg", "RightLowerLeg", "RightFoot",
] as const;

type JointId = (typeof JOINT_IDS)[number];
type Influence4 = readonly [number, number, number, number];
type Skin4 = { readonly joints: Influence4; readonly weights: Influence4 };
type Ring = { readonly center: Vec3Tuple; readonly rx: number; readonly rz: number; readonly weights: Skin4 };
type MutablePart = { id: string; material: PaletteRole; positions: number[]; normals: number[]; indices: number[]; joints: number[]; weights: number[] };
const jointIndex = Object.fromEntries(JOINT_IDS.map((id, index) => [id, index])) as Record<JointId, number>;

function jointWeight(a: JointId, b: JointId, amount = 0): Skin4 {
  const blend = Math.max(0, Math.min(1, amount));
  return {
    joints: [jointIndex[a], jointIndex[b], jointIndex.Hips, jointIndex.Hips],
    weights: [1 - blend, blend, 0, 0],
  };
}

function fixedWeight(id: JointId): Skin4 {
  return {
    joints: [jointIndex[id], jointIndex.Hips, jointIndex.Hips, jointIndex.Hips],
    weights: [1, 0, 0, 0],
  };
}

function normalize3(vector: Vec3Tuple): Vec3Tuple {
  const length = Math.hypot(...vector);
  return length > 1e-8 ? [vector[0] / length, vector[1] / length, vector[2] / length] : [0, 1, 0];
}

function cross(a: Vec3Tuple, b: Vec3Tuple): Vec3Tuple {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}

function newPart(id: string, material: PaletteRole): MutablePart {
  return { id, material, positions: [], normals: [], indices: [], joints: [], weights: [] };
}

function addVertex(part: MutablePart, point: Vec3Tuple, normal: Vec3Tuple, skin: Skin4): number {
  const index = part.positions.length / 3;
  part.positions.push(point[0], point[1], point[2]);
  part.normals.push(normal[0], normal[1], normal[2]);
  part.joints.push(...skin.joints);
  part.weights.push(...skin.weights);
  return index;
}

/** Closed, tapered low-poly loft with an elliptical cross-section. */
function addLoft(part: MutablePart, rings: readonly Ring[], sides = 8, axisHint?: Vec3Tuple): void {
  const first = rings[0];
  const last = rings[rings.length - 1];
  if (!first || !last || rings.length < 2) return;
  const axis = normalize3(axisHint ?? [
    last.center[0] - first.center[0],
    last.center[1] - first.center[1],
    last.center[2] - first.center[2],
  ]);
  const u = normalize3(cross(axis, Math.abs(axis[2]) < 0.9 ? [0, 0, 1] : [0, 1, 0]));
  const v = normalize3(cross(axis, u));
  const pointAt = (ring: Ring, side: number): Vec3Tuple => {
    const angle = (side / sides) * Math.PI * 2;
    const ca = Math.cos(angle);
    const sa = Math.sin(angle);
    return [
      ring.center[0] + u[0] * ca * ring.rx + v[0] * sa * ring.rz,
      ring.center[1] + u[1] * ca * ring.rx + v[1] * sa * ring.rz,
      ring.center[2] + u[2] * ca * ring.rx + v[2] * sa * ring.rz,
    ];
  };
  for (let row = 0; row < rings.length - 1; row += 1) {
    const current = rings[row]!;
    const nextRing = rings[row + 1]!;
    for (let side = 0; side < sides; side += 1) {
      const a = pointAt(current, side);
      const b = pointAt(current, side + 1);
      const c = pointAt(nextRing, side + 1);
      const d = pointAt(nextRing, side);
      const addFlatTriangle = (points: readonly [Vec3Tuple, Vec3Tuple, Vec3Tuple], skin: readonly [Skin4, Skin4, Skin4]): void => {
        const ab: Vec3Tuple = [points[1][0] - points[0][0], points[1][1] - points[0][1], points[1][2] - points[0][2]];
        const ac: Vec3Tuple = [points[2][0] - points[0][0], points[2][1] - points[0][1], points[2][2] - points[0][2]];
        const normal = normalize3(cross(ab, ac));
        const first = addVertex(part, points[0], normal, skin[0]);
        const second = addVertex(part, points[1], normal, skin[1]);
        const third = addVertex(part, points[2], normal, skin[2]);
        part.indices.push(first, second, third);
      };
      // Keep coherent loft winding and use each triangle's geometric normal for flat facets.
      addFlatTriangle([a, b, d], [current.weights, current.weights, nextRing.weights]);
      addFlatTriangle([b, c, d], [current.weights, nextRing.weights, nextRing.weights]);
    }
  }
  for (let side = 0; side < sides; side += 1) {
    const a = pointAt(first, side);
    const b = pointAt(first, side + 1);
    const c = pointAt(last, side + 1);
    const d = pointAt(last, side);
    const startCap = addVertex(part, first.center, [-axis[0], -axis[1], -axis[2]], first.weights);
    const startNext = addVertex(part, b, [-axis[0], -axis[1], -axis[2]], first.weights);
    const startCurrent = addVertex(part, a, [-axis[0], -axis[1], -axis[2]], first.weights);
    part.indices.push(startCap, startNext, startCurrent);
    const endCap = addVertex(part, last.center, axis, last.weights);
    const endCurrent = addVertex(part, d, axis, last.weights);
    const endNext = addVertex(part, c, axis, last.weights);
    part.indices.push(endCap, endCurrent, endNext);
  }
}

/** A small beveled plate, useful for face, armor and outfit details. */
function addPlate(part: MutablePart, x: number, y: number, z: number, width: number, height: number, depth: number, skin: Skin4): void {
  const bevel = Math.min(width, height) * 0.18;
  const outline: readonly (readonly [number, number])[] = [
    [-width / 2 + bevel, -height / 2], [width / 2 - bevel, -height / 2],
    [width / 2, -height / 2 + bevel], [width / 2, height / 2 - bevel],
    [width / 2 - bevel, height / 2], [-width / 2 + bevel, height / 2],
    [-width / 2, height / 2 - bevel], [-width / 2, -height / 2 + bevel],
  ];
  const frontZ = z + depth / 2;
  const backZ = z - depth / 2;
  const frontCenter = addVertex(part, [x, y, frontZ], [0, 0, 1], skin);
  const backCenter = addVertex(part, [x, y, backZ], [0, 0, -1], skin);
  const front: number[] = [];
  const back: number[] = [];
  for (const [ox, oy] of outline) {
    front.push(addVertex(part, [x + ox, y + oy, frontZ], [0, 0, 1], skin));
    back.push(addVertex(part, [x + ox, y + oy, backZ], [0, 0, -1], skin));
  }
  for (let i = 0; i < outline.length; i += 1) {
    const j = (i + 1) % outline.length;
    part.indices.push(frontCenter, front[i]!, front[j]!);
    part.indices.push(backCenter, back[j]!, back[i]!);
    const [x1, y1] = outline[i]!;
    const [x2, y2] = outline[j]!;
    const normal = normalize3([y2 - y1, x1 - x2, 0]);
    const f1 = addVertex(part, [x + x1, y + y1, frontZ], normal, skin);
    const b1 = addVertex(part, [x + x1, y + y1, backZ], normal, skin);
    const f2 = addVertex(part, [x + x2, y + y2, frontZ], normal, skin);
    const b2 = addVertex(part, [x + x2, y + y2, backZ], normal, skin);
    part.indices.push(f1, b1, f2, f2, b1, b2);
  }
}

function seal(part: MutablePart): CharacterPart {
  return {
    id: part.id,
    material: part.material,
    positions: part.positions,
    normals: part.normals,
    indices: part.indices,
    joints: part.joints,
    weights: part.weights,
  };
}

function makeJoints(height: number, width: number): RigJoint[] {
  const h = height;
  const absolute: Readonly<Record<JointId, Vec3Tuple>> = {
    Hips: [0, 0.455 * h, 0],
    Spine: [0, 0.56 * h, 0],
    Chest: [0, 0.705 * h, 0],
    Neck: [0, 0.79 * h, 0],
    Head: [0, 0.855 * h, 0],
    LeftShoulder: [-1.83 * width, 0.715 * h, 0],
    LeftUpperArm: [-2.05 * width, 0.66 * h, 0],
    LeftLowerArm: [-1.98 * width, 0.515 * h, 0.008 * h],
    LeftHand: [-1.98 * width, 0.39 * h, 0.015 * h],
    RightShoulder: [1.83 * width, 0.715 * h, 0],
    RightUpperArm: [2.05 * width, 0.66 * h, 0],
    RightLowerArm: [1.98 * width, 0.515 * h, 0.008 * h],
    RightHand: [1.98 * width, 0.39 * h, 0.015 * h],
    LeftUpperLeg: [-0.94 * width, 0.43 * h, 0],
    LeftLowerLeg: [-0.94 * width, 0.205 * h, 0],
    LeftFoot: [-0.94 * width, 0, 0.005 * h],
    RightUpperLeg: [0.94 * width, 0.43 * h, 0],
    RightLowerLeg: [0.94 * width, 0.205 * h, 0],
    RightFoot: [0.94 * width, 0, 0.005 * h],
  };
  const parents: Readonly<Record<JointId, JointId | null>> = {
    Hips: null,
    Spine: "Hips", Chest: "Spine", Neck: "Chest", Head: "Neck",
    LeftShoulder: "Chest", LeftUpperArm: "LeftShoulder", LeftLowerArm: "LeftUpperArm", LeftHand: "LeftLowerArm",
    RightShoulder: "Chest", RightUpperArm: "RightShoulder", RightLowerArm: "RightUpperArm", RightHand: "RightLowerArm",
    LeftUpperLeg: "Hips", LeftLowerLeg: "LeftUpperLeg", LeftFoot: "LeftLowerLeg",
    RightUpperLeg: "Hips", RightLowerLeg: "RightUpperLeg", RightFoot: "RightLowerLeg",
  };
  const defs = JOINT_IDS.map((id) => {
    const parent = parents[id];
    const point = absolute[id];
    const parentPoint = parent === null ? [0, 0, 0] as const : absolute[parent];
    return { id, parent, p: [point[0] - parentPoint[0], point[1] - parentPoint[1], point[2] - parentPoint[2]] as Vec3Tuple };
  });
  return defs.map((joint) => ({
    id: joint.id,
    parentIndex: joint.parent === null ? null : jointIndex[joint.parent],
    position: [joint.p[0], joint.p[1], joint.p[2]],
  }));
}

export function buildCharacter(input: CharacterSpec): CharacterGeometry {
  const validation = validateCharacterSpec(input);
  if (!validation.ok) throw new TypeError(`Invalid character specification: ${validation.errors.join("; ")}`);
  const spec = validation.value;
  const height = 1.05 * spec.stature;
  const bodyFactor = spec.body === "lean" ? 0.88 : spec.body === "heavy" ? 1.16 : 1;
  const width = 0.112 * height * bodyFactor;
  const depth = 0.078 * height * (spec.body === "heavy" ? 1.1 : 1);
  const y = (fraction: number): number => fraction * height;
  const parts: CharacterPart[] = [];

  const add = (part: MutablePart): void => { parts.push(seal(part)); };
  const body = newPart("body-torso", "cloth");
  addLoft(body, [
    { center: [0, y(0.405), 0], rx: width * 0.90, rz: depth * 0.91, weights: fixedWeight("Hips") },
    { center: [0, y(0.445), 0], rx: width * 0.72, rz: depth * 0.82, weights: jointWeight("Hips", "Spine", 0.1) },
    { center: [0, y(0.49), 0], rx: width * 0.78, rz: depth * 0.88, weights: jointWeight("Hips", "Spine", 0.42) },
    { center: [0, y(0.555), -depth * 0.025], rx: width * 0.73, rz: depth * 0.86, weights: jointWeight("Hips", "Spine", 0.9) },
    { center: [0, y(0.625), 0], rx: width * 1.02, rz: depth * 0.98, weights: jointWeight("Spine", "Chest", 0.55) },
    { center: [0, y(0.715), 0], rx: width * 1.38, rz: depth * 1.10, weights: jointWeight("Spine", "Chest", 0.9) },
    { center: [0, y(0.755), -depth * 0.01], rx: width * 1.25, rz: depth * 0.98, weights: fixedWeight("Chest") },
  ], 10);
  add(body);

  if (spec.outfit === "guard") {
    const pelvis = newPart("body-pelvis", "armor");
    addLoft(pelvis, [
      { center: [0, y(0.405), 0], rx: width * 0.88, rz: depth * 0.91, weights: fixedWeight("Hips") },
      { center: [0, y(0.445), 0], rx: width * 1.04, rz: depth * 1.06, weights: fixedWeight("Hips") },
      { center: [0, y(0.49), 0], rx: width * 0.91, rz: depth * 0.98, weights: jointWeight("Hips", "Spine", 0.25) },
    ], 10);
    add(pelvis);
  }

  const neck = newPart("body-neck", "skin");
  addLoft(neck, [
    { center: [0, y(0.735), 0], rx: width * 0.38, rz: depth * 0.44, weights: jointWeight("Chest", "Neck", 0.55) },
    { center: [0, y(0.815), 0], rx: width * 0.34, rz: depth * 0.40, weights: jointWeight("Neck", "Head", 0.3) },
  ], 8, [0, -1, 0]);
  add(neck);

  const head = newPart("body-head", "skin");
  addLoft(head, [
    { center: [0, y(0.815), 0], rx: width * 0.34, rz: depth * 0.40, weights: jointWeight("Neck", "Head", 0.3) },
    { center: [0, y(0.84), depth * 0.01], rx: width * 0.53, rz: depth * 0.63, weights: jointWeight("Neck", "Head", 0.7) },
    { center: [0, y(0.875), depth * 0.01], rx: width * 0.61, rz: depth * 0.74, weights: fixedWeight("Head") },
    { center: [0, y(0.92), 0], rx: width * 0.61, rz: depth * 0.72, weights: fixedWeight("Head") },
    { center: [0, y(0.97), -depth * 0.015], rx: width * 0.48, rz: depth * 0.58, weights: fixedWeight("Head") },
    { center: [0, y(1.0), -depth * 0.02], rx: width * 0.24, rz: depth * 0.28, weights: fixedWeight("Head") },
  ], 10);
  add(head);

  // Simple inset eye plates make the head readable from its +Z-facing front.
  const face = newPart("face-eyes", "armor");
  addPlate(face, -width * 0.22, y(0.908), depth * 0.70, width * 0.17, y(0.017), depth * 0.055, fixedWeight("Head"));
  addPlate(face, width * 0.22, y(0.908), depth * 0.70, width * 0.17, y(0.017), depth * 0.055, fixedWeight("Head"));
  add(face);

  const brows = newPart("face-brows", "hair");
  addPlate(brows, 0, y(0.931), depth * 0.70, width * 0.46, y(0.009), depth * 0.035, fixedWeight("Head"));
  add(brows);

  const facialFeatures = newPart("face-nose-mouth", "skin");
  addLoft(facialFeatures, [
    { center: [0, y(0.902), depth * 0.60], rx: width * 0.095, rz: depth * 0.13, weights: fixedWeight("Head") },
    { center: [0, y(0.883), depth * 0.88], rx: width * 0.065, rz: depth * 0.08, weights: fixedWeight("Head") },
  ], 6);
  add(facialFeatures);

  const mouth = newPart("face-mouth", "hair");
  addPlate(mouth, 0, y(0.848), depth * 0.70, width * 0.23, y(0.008), depth * 0.025, fixedWeight("Head"));
  add(mouth);

  const ears = newPart("body-ears", "skin");
  for (const side of [-1, 1] as const) {
    addLoft(ears, [
      { center: [side * width * 0.59, y(0.884), 0], rx: depth * 0.15, rz: depth * 0.17, weights: fixedWeight("Head") },
      { center: [side * width * 0.69, y(0.884), 0], rx: depth * 0.105, rz: depth * 0.12, weights: fixedWeight("Head") },
    ], 6);
  }
  add(ears);

  const chestDetail = newPart("outfit-chest-detail", spec.outfit === "guard" ? "armor" : "accent");
  const chestWidth = spec.outfit === "guard" ? width * 1.12 : spec.outfit === "tech" ? width * 0.86 : width * 0.10;
  const chestHeight = spec.outfit === "guard" ? y(0.115) : spec.outfit === "tech" ? y(0.095) : y(0.15);
  addPlate(chestDetail, 0, y(spec.outfit === "tech" ? 0.675 : 0.665), depth * 0.93, chestWidth, chestHeight, depth * 0.12, jointWeight("Spine", "Chest", 0.8));
  add(chestDetail);

  if (spec.outfit !== "guard") {
    const pockets = newPart("outfit-chest-pockets", "armor");
    for (const side of [-1, 1] as const) {
      addPlate(pockets, side * width * 0.62, y(0.655), depth * 1.02, width * 0.40, y(0.055), depth * 0.07,
        jointWeight("Spine", "Chest", 0.8));
    }
    add(pockets);
  }

  const belt = newPart("outfit-belt", "armor");
  addPlate(belt, 0, y(0.475), depth * 1.01, width * 1.48, y(0.018), depth * 0.06, jointWeight("Hips", "Spine", 0.35));
  add(belt);

  // Hair silhouette: a close cap, a raised crest, or two longer side locks.
  if (spec.hair !== "none") {
    const hair = newPart("hair-main", "hair");
    if (spec.hair === "mohawk") {
      addLoft(hair, [
        { center: [0, y(0.965), 0], rx: width * 0.13, rz: depth * 0.22, weights: fixedWeight("Head") },
        { center: [0, y(1.0), 0], rx: width * 0.12, rz: depth * 0.18, weights: fixedWeight("Head") },
      ], 6);
    } else {
      addLoft(hair, [
        { center: [0, y(0.91), -depth * 0.01], rx: width * 0.48, rz: depth * 0.60, weights: fixedWeight("Head") },
        { center: [0, y(0.95), -depth * 0.015], rx: width * 0.61, rz: depth * 0.74, weights: fixedWeight("Head") },
        { center: [0, y(0.985), -depth * 0.01], rx: width * 0.54, rz: depth * 0.66, weights: fixedWeight("Head") },
        { center: [0, y(1.0), -depth * 0.01], rx: width * 0.24, rz: depth * 0.32, weights: fixedWeight("Head") },
      ], 8);
      if (spec.hair === "bob") {
        for (const side of [-1, 1] as const) {
          addLoft(hair, [
            { center: [side * width * 0.48, y(0.91), -depth * 0.02], rx: width * 0.14, rz: depth * 0.24, weights: fixedWeight("Head") },
            { center: [side * width * 0.47, y(0.82), -depth * 0.02], rx: width * 0.14, rz: depth * 0.22, weights: fixedWeight("Head") },
          ], 6);
        }
      }
    }
    add(hair);
  }

  if (spec.accessory === "visor") {
    const accessory = newPart("accessory-visor", "accent");
    addPlate(accessory, 0, y(0.91), depth * 0.72, width * 1.00, y(0.04), depth * 0.10, fixedWeight("Head"));
    addPlate(accessory, -width * 0.53, y(0.91), depth * 0.51, width * 0.18, y(0.025), depth * 0.18, fixedWeight("Head"));
    addPlate(accessory, width * 0.53, y(0.91), depth * 0.51, width * 0.18, y(0.025), depth * 0.18, fixedWeight("Head"));
    add(accessory);
  } else if (spec.accessory === "goggles") {
    const accessory = newPart("accessory-goggles", "accent");
    addPlate(accessory, 0, y(0.914), depth * 0.73, width * 0.77, y(0.035), depth * 0.12, fixedWeight("Head"));
    add(accessory);
  } else if (spec.accessory === "headset") {
    for (const side of [-1, 1] as const) {
      const accessory = newPart(`accessory-headset-${side < 0 ? "left" : "right"}`, "accent");
      addPlate(accessory, side * width * 0.58, y(0.90), 0, width * 0.17, y(0.07), depth * 0.28, fixedWeight("Head"));
      add(accessory);
    }
  }

  for (const side of [-1, 1] as const) {
    const label = side < 0 ? "left" : "right";
    const upperId = side < 0 ? "LeftUpperArm" : "RightUpperArm";
    const lowerId = side < 0 ? "LeftLowerArm" : "RightLowerArm";
    const handId = side < 0 ? "LeftHand" : "RightHand";
    const shoulderId = side < 0 ? "LeftShoulder" : "RightShoulder";
    const upper = newPart(`body-${label}-upper-arm`, "cloth");
    addLoft(upper, [
      // One continuous surface carries the deltoid out of the torso and into the arm.
      { center: [side * width * 0.98, y(0.685), 0], rx: width * 0.30, rz: depth * 0.60, weights: fixedWeight("Chest") },
      { center: [side * width * 1.43, y(0.735), 0], rx: width * 0.37, rz: depth * 0.72, weights: fixedWeight(shoulderId) },
      { center: [side * width * 1.83, y(0.715), 0], rx: width * 0.30, rz: depth * 0.68, weights: fixedWeight(shoulderId) },
      { center: [side * width * 2.05, y(0.66), 0], rx: width * 0.31, rz: depth * 0.55, weights: jointWeight(shoulderId, upperId, 0.45) },
      { center: [side * width * 2.08, y(0.59), 0.006 * height], rx: width * 0.27, rz: depth * 0.44, weights: fixedWeight(upperId) },
      { center: [side * width * 1.98, y(0.515), 0.008 * height], rx: width * 0.23, rz: depth * 0.38, weights: jointWeight(upperId, lowerId, 0.72) },
    ], 8, [0, -1, 0]);
    add(upper);

    const forearm = newPart(`body-${label}-forearm`, spec.outfit === "guard" ? "armor" : "cloth");
    addLoft(forearm, [
      { center: [side * width * 1.98, y(0.515), 0.008 * height], rx: width * 0.23, rz: depth * 0.38, weights: jointWeight(upperId, lowerId, 0.72) },
      { center: [side * width * 1.98, y(0.445), 0.012 * height], rx: width * 0.20, rz: depth * 0.35, weights: fixedWeight(lowerId) },
      { center: [side * width * 1.98, y(0.39), 0.015 * height], rx: width * 0.18, rz: depth * 0.32, weights: jointWeight(lowerId, handId, 0.72) },
    ], 8);
    add(forearm);

    const hand = newPart(`body-${label}-hand`, "skin");
    addLoft(hand, [
      { center: [side * width * 1.98, y(0.39), 0.015 * height], rx: width * 0.18, rz: depth * 0.32, weights: jointWeight(lowerId, handId, 0.72) },
      { center: [side * width * 1.98, y(0.325), 0.03 * height], rx: width * 0.34, rz: depth * 0.46, weights: fixedWeight(handId) },
    ], 6, [0, -1, 0]);
    add(hand);

    const fingers = newPart(`body-${label}-fingers`, "skin");
    const fingerOffsets = [-1.5, -0.5, 0.5, 1.5] as const;
    const fingerLengths = [0.029, 0.035, 0.033, 0.027] as const;
    for (let finger = 0; finger < fingerOffsets.length; finger += 1) {
      const offset = fingerOffsets[finger]!;
      const length = fingerLengths[finger]!;
      const fingerX = side * (width * 1.98 + offset * width * 0.14);
      addLoft(fingers, [
        { center: [fingerX, y(0.33), 0.052 * height], rx: width * 0.078, rz: depth * 0.17, weights: fixedWeight(handId) },
        { center: [fingerX + side * offset * width * 0.03, y(0.33 - length), 0.057 * height], rx: width * 0.065, rz: depth * 0.14, weights: fixedWeight(handId) },
      ], 6);
    }
    add(fingers);

    const thumb = newPart(`body-${label}-thumb`, "skin");
    addLoft(thumb, [
      { center: [side * width * 1.84, y(0.375), 0.025 * height], rx: width * 0.075, rz: depth * 0.11, weights: jointWeight(lowerId, handId, 0.45) },
      { center: [side * width * 1.72, y(0.345), 0.04 * height], rx: width * 0.06, rz: depth * 0.08, weights: fixedWeight(handId) },
    ], 6);
    add(thumb);

    const upperLegId = side < 0 ? "LeftUpperLeg" : "RightUpperLeg";
    const lowerLegId = side < 0 ? "LeftLowerLeg" : "RightLowerLeg";
    const footId = side < 0 ? "LeftFoot" : "RightFoot";
    const legX = side * width * 0.94;
    const thigh = newPart(`body-${label}-thigh`, "cloth");
    addLoft(thigh, [
      { center: [legX, y(0.455), 0], rx: width * 0.56, rz: depth * 0.62, weights: jointWeight("Hips", upperLegId, 0.75) },
      { center: [legX, y(0.35), 0], rx: width * 0.43, rz: depth * 0.49, weights: fixedWeight(upperLegId) },
      { center: [legX, y(0.205), 0], rx: width * 0.32, rz: depth * 0.37, weights: jointWeight(upperLegId, lowerLegId, 0.82) },
    ], 10, [0, -1, 0]);
    add(thigh);

    const shin = newPart(`body-${label}-shin`, spec.outfit === "guard" ? "armor" : "cloth");
    addLoft(shin, [
      { center: [legX, y(0.205), 0], rx: width * 0.32, rz: depth * 0.37, weights: jointWeight(upperLegId, lowerLegId, 0.82) },
      { center: [legX, y(0.125), 0.004 * height], rx: width * 0.25, rz: depth * 0.32, weights: fixedWeight(lowerLegId) },
      { center: [legX, y(0.045), 0.006 * height], rx: width * 0.21, rz: depth * 0.30, weights: jointWeight(lowerLegId, footId, 0.78) },
    ], 10, [0, -1, 0]);
    add(shin);

    const kneePad = newPart(`armor-${label}-knee`, spec.outfit === "tech" ? "accent" : "armor");
    addPlate(kneePad, legX, y(0.205), depth * 0.40, width * 0.50, y(0.052), depth * 0.20,
      jointWeight(upperLegId, lowerLegId, 0.5));
    add(kneePad);

    const shoe = newPart(`body-${label}-shoe`, "armor");
    addLoft(shoe, [
      { center: [legX, y(0.038), -0.018 * height], rx: width * 0.31, rz: y(0.032), weights: fixedWeight(footId) },
      { center: [legX, y(0.045), 0.035 * height], rx: width * 0.45, rz: y(0.043), weights: fixedWeight(footId) },
      { center: [legX, y(0.04), 0.095 * height], rx: width * 0.36, rz: y(0.035), weights: fixedWeight(footId) },
    ], 8);
    addPlate(shoe, legX, y(0.01), 0.038 * height, width * 0.82, y(0.02), depth * 1.72, fixedWeight(footId));
    add(shoe);
  }

  const equipmentX = width * 2.12;
  const equipmentY = y(0.375);
  if (spec.outfit === "tech") {
    const scanner = newPart("equipment-tech-scanner", "armor");
    addPlate(scanner, equipmentX, equipmentY, 0.042 * height, width * 0.66, y(0.07), depth * 0.36, fixedWeight("RightHand"));
    add(scanner);
    const screen = newPart("equipment-tech-scanner-screen", "accent");
    addPlate(screen, equipmentX, equipmentY + y(0.006), 0.062 * height, width * 0.39, y(0.032), depth * 0.035, fixedWeight("RightHand"));
    add(screen);
  } else {
    const barrel = newPart("equipment-sidearm-barrel", "armor");
    addLoft(barrel, [
      { center: [equipmentX, equipmentY + y(0.018), 0.048 * height], rx: width * 0.14, rz: width * 0.14, weights: fixedWeight("RightHand") },
      { center: [equipmentX, equipmentY + y(0.018), 0.145 * height], rx: width * 0.11, rz: width * 0.11, weights: fixedWeight("RightHand") },
    ], 6);
    add(barrel);
    const grip = newPart("equipment-sidearm-grip", "cloth");
    addLoft(grip, [
      { center: [equipmentX, equipmentY + y(0.002), 0.045 * height], rx: width * 0.12, rz: width * 0.14, weights: fixedWeight("RightHand") },
      { center: [equipmentX, equipmentY - y(0.052), 0.052 * height], rx: width * 0.10, rz: width * 0.12, weights: fixedWeight("RightHand") },
    ], 6);
    add(grip);
    const sight = newPart("equipment-sidearm-sight", "accent");
    addPlate(sight, equipmentX, equipmentY + y(0.035), 0.082 * height, width * 0.26, y(0.012), depth * 0.12, fixedWeight("RightHand"));
    add(sight);
  }

  const joints = makeJoints(height, width);
  const allY = parts.flatMap((part) => part.positions.filter((_, index) => index % 3 === 1));
  const minY = Math.min(...allY);
  const maxY = Math.max(...allY);
  const triangleCount = parts.reduce((sum, part) => sum + part.indices.length / 3, 0);
  const vertexCount = parts.reduce((sum, part) => sum + part.positions.length / 3, 0);
  const materials = new Set(parts.map((part) => part.material));
  return {
    spec,
    joints,
    parts,
    stats: {
      triangles: triangleCount,
      vertices: vertexCount,
      materials: materials.size,
      bones: joints.length,
      height: maxY - minY,
    },
  };
}
