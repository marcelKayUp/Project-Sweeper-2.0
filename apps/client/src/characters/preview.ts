import { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera.js";
import { Camera } from "@babylonjs/core/Cameras/camera.js";
import { Animation } from "@babylonjs/core/Animations/animation.js";
import { AnimationGroup } from "@babylonjs/core/Animations/animationGroup.js";
import { Engine } from "@babylonjs/core/Engines/engine.js";
import { NullEngine } from "@babylonjs/core/Engines/nullEngine.js";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight.js";
import { DirectionalLight } from "@babylonjs/core/Lights/directionalLight.js";
import { Material } from "@babylonjs/core/Materials/material.js";
import { PBRMetallicRoughnessMaterial } from "@babylonjs/core/Materials/PBR/pbrMetallicRoughnessMaterial.js";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial.js";
import { Color3, Color4 } from "@babylonjs/core/Maths/math.color.js";
import { Matrix, Quaternion, Vector3 } from "@babylonjs/core/Maths/math.vector.js";
import { VertexBuffer } from "@babylonjs/core/Meshes/buffer.js";
import { CreateCylinder } from "@babylonjs/core/Meshes/Builders/cylinderBuilder.js";
import { CreateGround } from "@babylonjs/core/Meshes/Builders/groundBuilder.js";
import { Mesh } from "@babylonjs/core/Meshes/mesh.js";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode.js";
import { Scene } from "@babylonjs/core/scene.js";
import { Skeleton } from "@babylonjs/core/Bones/skeleton.js";
import { Bone } from "@babylonjs/core/Bones/bone.js";
import { GLTF2Export } from "@babylonjs/serializers/glTF/2.0/glTFSerializer.js";
import { buildCharacter, CHARACTER_VERSION, CLIP_NAMES, validateCharacterSpec } from "@neon/characters";
import type { CharacterGeometry, CharacterSpec, CharacterStats, ClipName } from "@neon/characters";

export type CharacterView = "front" | "iso" | "back" | "side";

export interface CharacterPreview {
  setSpec(spec: CharacterSpec): void;
  setClip(clip: ClipName): void;
  setPlaying(playing: boolean): void;
  setView(view: CharacterView): void;
  exportGlb(): Promise<Blob>;
  getReport(): CharacterStats & { clips: readonly string[] };
  dispose(): void;
}

type JointPose = { readonly rotation?: readonly [number, number, number]; readonly y?: number };
type Pose = Readonly<Record<string, JointPose>>;

const pose = (entries: Readonly<Record<string, JointPose>>): Pose => entries;

const CLIP_FRAMES: Readonly<Record<ClipName, readonly number[]>> = {
  idle: [0, 15, 30], walk: [0, 8, 16, 24, 30], crouch: [0, 15, 30], shoot: [0, 6, 18], reload: [0, 9, 21], hit: [0, 5, 15], death: [0, 12, 30],
};

const POSES: Readonly<Record<ClipName, readonly Pose[]>> = {
  idle: [
    pose({ Hips: {}, Spine: { rotation: [0.015, 0, -0.015] }, Head: { rotation: [-0.015, 0, 0.02] }, LeftUpperArm: { rotation: [0.04, 0, -0.08] }, RightUpperArm: { rotation: [0.04, 0, 0.08] }, LeftLowerArm: { rotation: [-0.12, 0, 0] }, RightLowerArm: { rotation: [-0.18, 0, 0] }, RightHand: { rotation: [-0.04, 0, 0] } }),
    pose({ Hips: { y: 0.006 }, Spine: { rotation: [0.025, 0, 0] }, Head: { rotation: [-0.02, 0, -0.02] }, LeftUpperArm: { rotation: [0.025, 0, -0.065] }, RightUpperArm: { rotation: [0.025, 0, 0.065] }, LeftLowerArm: { rotation: [-0.10, 0, 0] }, RightLowerArm: { rotation: [-0.16, 0, 0] }, RightHand: { rotation: [-0.035, 0, 0] } }),
    pose({ Hips: {}, Spine: { rotation: [0.015, 0, -0.015] }, Head: { rotation: [-0.015, 0, 0.02] }, LeftUpperArm: { rotation: [0.04, 0, -0.08] }, RightUpperArm: { rotation: [0.04, 0, 0.08] }, LeftLowerArm: { rotation: [-0.12, 0, 0] }, RightLowerArm: { rotation: [-0.18, 0, 0] }, RightHand: { rotation: [-0.04, 0, 0] } }),
  ],
  walk: [
    pose({ Hips: {}, Spine: { rotation: [0.035, 0, -0.02] }, LeftUpperLeg: { rotation: [-0.48, 0, 0] }, LeftLowerLeg: { rotation: [0.58, 0, 0] }, LeftFoot: { rotation: [-0.1, 0, 0] }, RightUpperLeg: { rotation: [0.40, 0, 0] }, RightLowerLeg: { rotation: [0.18, 0, 0] }, RightFoot: { rotation: [-0.12, 0, 0] }, LeftUpperArm: { rotation: [0.12, 0, -0.24] }, LeftLowerArm: { rotation: [-0.14, 0, 0] }, RightUpperArm: { rotation: [-0.36, 0, 0.06] }, RightLowerArm: { rotation: [-0.52, 0, 0] }, RightHand: { rotation: [-0.02, 0, 0] } }),
    pose({ Hips: { y: 0.018 }, Spine: { rotation: [0.015, 0, 0.015] }, LeftUpperLeg: { rotation: [-0.08, 0, 0] }, LeftLowerLeg: { rotation: [0.14, 0, 0] }, LeftFoot: { rotation: [-0.06, 0, 0] }, RightUpperLeg: { rotation: [0.08, 0, 0] }, RightLowerLeg: { rotation: [0.12, 0, 0] }, RightFoot: { rotation: [-0.08, 0, 0] }, LeftUpperArm: { rotation: [-0.16, 0, -0.20] }, LeftLowerArm: { rotation: [-0.12, 0, 0] }, RightUpperArm: { rotation: [-0.28, 0, 0.06] }, RightLowerArm: { rotation: [-0.58, 0, 0] }, RightHand: { rotation: [-0.02, 0, 0] } }),
    pose({ Hips: {}, Spine: { rotation: [0.02, 0, 0.02] }, LeftUpperLeg: { rotation: [0.40, 0, 0] }, LeftLowerLeg: { rotation: [0.18, 0, 0] }, LeftFoot: { rotation: [-0.12, 0, 0] }, RightUpperLeg: { rotation: [-0.48, 0, 0] }, RightLowerLeg: { rotation: [0.58, 0, 0] }, RightFoot: { rotation: [-0.1, 0, 0] }, LeftUpperArm: { rotation: [-0.40, 0, -0.18] }, LeftLowerArm: { rotation: [-0.12, 0, 0] }, RightUpperArm: { rotation: [-0.34, 0, 0.06] }, RightLowerArm: { rotation: [-0.54, 0, 0] }, RightHand: { rotation: [-0.02, 0, 0] } }),
    pose({ Hips: { y: 0.018 }, Spine: { rotation: [0.015, 0, -0.015] }, LeftUpperLeg: { rotation: [0.08, 0, 0] }, LeftLowerLeg: { rotation: [0.12, 0, 0] }, LeftFoot: { rotation: [-0.08, 0, 0] }, RightUpperLeg: { rotation: [-0.08, 0, 0] }, RightLowerLeg: { rotation: [0.14, 0, 0] }, RightFoot: { rotation: [-0.06, 0, 0] }, LeftUpperArm: { rotation: [-0.16, 0, -0.20] }, LeftLowerArm: { rotation: [-0.12, 0, 0] }, RightUpperArm: { rotation: [-0.28, 0, 0.06] }, RightLowerArm: { rotation: [-0.58, 0, 0] }, RightHand: { rotation: [-0.02, 0, 0] } }),
    pose({ Hips: {}, Spine: { rotation: [0.035, 0, -0.02] }, LeftUpperLeg: { rotation: [-0.48, 0, 0] }, LeftLowerLeg: { rotation: [0.58, 0, 0] }, LeftFoot: { rotation: [-0.1, 0, 0] }, RightUpperLeg: { rotation: [0.40, 0, 0] }, RightLowerLeg: { rotation: [0.18, 0, 0] }, RightFoot: { rotation: [-0.12, 0, 0] }, LeftUpperArm: { rotation: [0.12, 0, -0.24] }, LeftLowerArm: { rotation: [-0.14, 0, 0] }, RightUpperArm: { rotation: [-0.36, 0, 0.06] }, RightLowerArm: { rotation: [-0.52, 0, 0] }, RightHand: { rotation: [-0.02, 0, 0] } }),
  ],
  crouch: [
    pose({ Hips: { y: -0.105 }, Spine: { rotation: [0.09, 0, 0] }, Chest: { rotation: [0.035, 0, 0] }, Head: { rotation: [-0.09, 0, 0] }, LeftUpperLeg: { rotation: [-0.62, 0, 0] }, RightUpperLeg: { rotation: [-0.62, 0, 0] }, LeftLowerLeg: { rotation: [1.12, 0, 0] }, RightLowerLeg: { rotation: [1.12, 0, 0] }, LeftFoot: { rotation: [-0.48, 0, 0] }, RightFoot: { rotation: [-0.48, 0, 0] }, LeftUpperArm: { rotation: [-0.58, 0, -0.44] }, LeftLowerArm: { rotation: [-0.22, 0, 0] }, RightUpperArm: { rotation: [-0.52, 0, 0.10] }, RightLowerArm: { rotation: [-0.66, 0, 0] }, RightHand: { rotation: [-0.02, 0, 0] } }),
    pose({ Hips: { y: -0.12 }, Spine: { rotation: [0.11, 0, 0] }, Chest: { rotation: [0.035, 0, 0] }, Head: { rotation: [-0.11, 0, 0] }, LeftUpperLeg: { rotation: [-0.66, 0, 0] }, RightUpperLeg: { rotation: [-0.66, 0, 0] }, LeftLowerLeg: { rotation: [1.18, 0, 0] }, RightLowerLeg: { rotation: [1.18, 0, 0] }, LeftFoot: { rotation: [-0.50, 0, 0] }, RightFoot: { rotation: [-0.50, 0, 0] }, LeftUpperArm: { rotation: [-0.61, 0, -0.42] }, LeftLowerArm: { rotation: [-0.20, 0, 0] }, RightUpperArm: { rotation: [-0.55, 0, 0.10] }, RightLowerArm: { rotation: [-0.68, 0, 0] }, RightHand: { rotation: [-0.02, 0, 0] } }),
    pose({ Hips: { y: -0.105 }, Spine: { rotation: [0.09, 0, 0] }, Chest: { rotation: [0.035, 0, 0] }, Head: { rotation: [-0.09, 0, 0] }, LeftUpperLeg: { rotation: [-0.62, 0, 0] }, RightUpperLeg: { rotation: [-0.62, 0, 0] }, LeftLowerLeg: { rotation: [1.12, 0, 0] }, RightLowerLeg: { rotation: [1.12, 0, 0] }, LeftFoot: { rotation: [-0.48, 0, 0] }, RightFoot: { rotation: [-0.48, 0, 0] }, LeftUpperArm: { rotation: [-0.58, 0, -0.44] }, LeftLowerArm: { rotation: [-0.22, 0, 0] }, RightUpperArm: { rotation: [-0.52, 0, 0.10] }, RightLowerArm: { rotation: [-0.66, 0, 0] }, RightHand: { rotation: [-0.02, 0, 0] } }),
  ],
  shoot: [
    pose({ Spine: { rotation: [0.04, 0, 0] }, Chest: { rotation: [0.06, 0, 0] }, Head: { rotation: [-0.1, 0, 0] }, LeftShoulder: { rotation: [0, 0, 0.08] }, LeftUpperArm: { rotation: [-0.58, 0, 1.15] }, LeftLowerArm: { rotation: [-0.32, 0, 0.48] }, LeftHand: { rotation: [0.04, 0, 0.08] }, RightUpperArm: { rotation: [-1.04, 0, -0.04] }, RightLowerArm: { rotation: [-0.64, 0, 0] }, RightHand: { rotation: [-0.015, 0, 0] } }),
    pose({ Hips: { y: -0.006 }, Spine: { rotation: [-0.02, 0, 0] }, Chest: { rotation: [-0.045, 0, 0] }, Head: { rotation: [-0.03, 0, 0] }, LeftShoulder: { rotation: [0, 0, 0.08] }, LeftUpperArm: { rotation: [-0.52, 0, 1.15] }, LeftLowerArm: { rotation: [-0.30, 0, 0.48] }, LeftHand: { rotation: [0.04, 0, 0.08] }, RightUpperArm: { rotation: [-0.96, 0, -0.04] }, RightLowerArm: { rotation: [-0.60, 0, 0] }, RightHand: { rotation: [0.05, 0, 0] } }),
    pose({ Spine: { rotation: [0.04, 0, 0] }, Chest: { rotation: [0.06, 0, 0] }, Head: { rotation: [-0.1, 0, 0] }, LeftShoulder: { rotation: [0, 0, 0.08] }, LeftUpperArm: { rotation: [-0.58, 0, 1.15] }, LeftLowerArm: { rotation: [-0.32, 0, 0.48] }, LeftHand: { rotation: [0.04, 0, 0.08] }, RightUpperArm: { rotation: [-1.04, 0, -0.04] }, RightLowerArm: { rotation: [-0.64, 0, 0] }, RightHand: { rotation: [-0.015, 0, 0] } }),
  ],
  reload: [
    pose({ Spine: { rotation: [0.06, 0, 0] }, Chest: { rotation: [0.08, 0, 0] }, Head: { rotation: [-0.12, 0, 0] }, RightUpperArm: { rotation: [-0.94, 0, -0.03] }, RightLowerArm: { rotation: [-0.62, 0, 0] }, RightHand: { rotation: [-0.015, 0, 0] }, LeftUpperArm: { rotation: [-0.52, 0, 0.9] }, LeftLowerArm: { rotation: [-0.32, 0, 0.36] }, LeftHand: { rotation: [0.12, 0, 0.04] } }),
    pose({ Spine: { rotation: [0.12, 0, 0] }, Chest: { rotation: [0.12, 0, 0] }, Head: { rotation: [-0.2, 0, 0] }, RightUpperArm: { rotation: [-0.72, 0, -0.02] }, RightLowerArm: { rotation: [-0.78, 0, 0] }, RightHand: { rotation: [0.12, 0, 0] }, LeftShoulder: { rotation: [0, 0, 0.08] }, LeftUpperArm: { rotation: [-0.42, 0, 1.18] }, LeftLowerArm: { rotation: [-0.4, 0, 0.55] }, LeftHand: { rotation: [-0.1, 0, 0.02] } }),
    pose({ Spine: { rotation: [0.06, 0, 0] }, Chest: { rotation: [0.08, 0, 0] }, Head: { rotation: [-0.12, 0, 0] }, RightUpperArm: { rotation: [-0.94, 0, -0.03] }, RightLowerArm: { rotation: [-0.62, 0, 0] }, RightHand: { rotation: [-0.015, 0, 0] }, LeftUpperArm: { rotation: [-0.52, 0, 0.9] }, LeftLowerArm: { rotation: [-0.32, 0, 0.36] }, LeftHand: { rotation: [0.12, 0, 0.04] } }),
  ],
  hit: [
    pose({ Hips: {}, Spine: { rotation: [0.03, 0, 0] }, Chest: { rotation: [0.035, 0, 0] }, Head: { rotation: [-0.06, 0, 0] }, LeftUpperArm: { rotation: [-0.70, 0, 0.35] }, LeftLowerArm: { rotation: [-0.45, 0, 0] }, RightUpperArm: { rotation: [-0.72, 0, -0.04] }, RightLowerArm: { rotation: [-0.52, 0, 0] }, RightHand: { rotation: [-0.015, 0, 0] } }),
    pose({ Hips: { y: -0.025, rotation: [0.02, 0, -0.13] }, Spine: { rotation: [0.12, 0, -0.22] }, Chest: { rotation: [0.10, 0, -0.08] }, Neck: { rotation: [-0.04, 0, 0.08] }, Head: { rotation: [-0.12, 0, 0.18] }, LeftUpperArm: { rotation: [-0.32, 0, -0.78] }, LeftLowerArm: { rotation: [-0.25, 0, 0] }, RightUpperArm: { rotation: [-0.48, 0, 0.52] }, RightLowerArm: { rotation: [-0.32, 0, 0] }, RightHand: { rotation: [0.12, 0, 0] }, LeftUpperLeg: { rotation: [-0.18, 0, -0.12] }, RightUpperLeg: { rotation: [0.22, 0, 0.15] }, LeftLowerLeg: { rotation: [0.22, 0, 0] } }),
    pose({ Hips: {}, Spine: { rotation: [-0.015, 0, 0.035] }, Chest: { rotation: [0.015, 0, 0] }, Head: { rotation: [-0.04, 0, -0.02] }, LeftUpperArm: { rotation: [-0.66, 0, 0.20] }, LeftLowerArm: { rotation: [-0.36, 0, 0] }, RightUpperArm: { rotation: [-0.68, 0, 0.02] }, RightLowerArm: { rotation: [-0.50, 0, 0] }, RightHand: { rotation: [0.02, 0, 0] } }),
  ],
  death: [
    pose({ Hips: {}, Spine: { rotation: [0.04, 0, -0.02] }, Chest: { rotation: [0.03, 0, 0] }, Head: { rotation: [-0.06, 0, 0] }, LeftUpperLeg: { rotation: [-0.18, 0, 0] }, RightUpperLeg: { rotation: [0.16, 0, 0] }, LeftUpperArm: { rotation: [-0.62, 0, 0.24] }, LeftLowerArm: { rotation: [-0.42, 0, 0] }, RightUpperArm: { rotation: [-0.68, 0, 0] }, RightLowerArm: { rotation: [-0.5, 0, 0] }, RightHand: { rotation: [0.06, 0, 0] } }),
    pose({ Hips: { y: -0.09, rotation: [0.12, 0, 0.42] }, Spine: { rotation: [0.16, 0, 0.12] }, Chest: { rotation: [0.08, 0, -0.05] }, Neck: { rotation: [0.04, 0, -0.08] }, Head: { rotation: [0.12, 0, -0.16] }, LeftUpperLeg: { rotation: [-0.42, 0, -0.18] }, RightUpperLeg: { rotation: [-0.12, 0, 0.28] }, LeftLowerLeg: { rotation: [0.68, 0, 0] }, RightLowerLeg: { rotation: [0.48, 0, 0] }, LeftFoot: { rotation: [-0.28, 0, 0] }, RightFoot: { rotation: [-0.18, 0, 0] }, LeftUpperArm: { rotation: [-0.48, 0, -0.72] }, LeftLowerArm: { rotation: [-0.42, 0, 0] }, RightUpperArm: { rotation: [-0.42, 0, 0.62] }, RightLowerArm: { rotation: [-0.38, 0, 0] }, RightHand: { rotation: [0.14, 0, 0] } }),
    pose({ Hips: { y: -0.28, rotation: [0.12, 0, 1.15] }, Spine: { rotation: [0.08, 0, 0.08] }, Chest: { rotation: [0.05, 0, 0] }, Neck: { rotation: [0.02, 0, -0.05] }, Head: { rotation: [0.08, 0, -0.1] }, LeftUpperLeg: { rotation: [-0.28, 0, -0.30] }, RightUpperLeg: { rotation: [-0.22, 0, 0.28] }, LeftLowerLeg: { rotation: [0.52, 0, 0] }, RightLowerLeg: { rotation: [0.62, 0, 0] }, LeftFoot: { rotation: [-0.30, 0, 0] }, RightFoot: { rotation: [-0.24, 0, 0] }, LeftUpperArm: { rotation: [-0.32, 0, -0.74] }, LeftLowerArm: { rotation: [-0.44, 0, 0] }, RightUpperArm: { rotation: [-0.24, 0, 0.72] }, RightLowerArm: { rotation: [-0.50, 0, 0] }, RightHand: { rotation: [0.16, 0, 0] } }),
  ],
};

const LOOPING_CLIPS = new Set<ClipName>(["idle", "walk", "crouch"]);
const AIM_FORWARD_CLIPS = new Set<ClipName>(["walk", "crouch", "shoot", "reload"]);
const RIGHT_ARM_PARENT_CHAIN = ["Hips", "Spine", "Chest", "RightShoulder", "RightUpperArm", "RightLowerArm"] as const;

function poseKeysForClip(clip: ClipName): readonly Pose[] {
  const keys = POSES[clip];
  if (!AIM_FORWARD_CLIPS.has(clip)) return keys;
  return keys.map((key) => {
    // The pistol is weighted to RightHand, so it inherits every parent bone's
    // orientation. Counter-rotate the wrist to keep the barrel along character
    // forward while the elbow bends; this makes the authored hand pose and the
    // visible weapon agree in both Babylon and glTF consumers.
    let parentOrientation = Quaternion.Identity();
    for (const jointId of RIGHT_ARM_PARENT_CHAIN) {
      const rotation = key[jointId]?.rotation ?? [0, 0, 0];
      parentOrientation = parentOrientation.multiply(Quaternion.FromEulerAngles(rotation[0], rotation[1], rotation[2]));
    }
    const wrist = parentOrientation.conjugate().toEulerAngles();
    return {
      ...key,
      RightHand: { ...key.RightHand, rotation: [wrist.x, wrist.y, wrist.z] as const },
    };
  });
}

function hexColor(hex: string): Color3 {
  return Color3.FromHexString(hex);
}

function makeMaterial(name: string, color: string, scene: Scene): StandardMaterial {
  const material = new StandardMaterial(name, scene);
  material.diffuseColor = hexColor(color);
  material.specularColor = new Color3(0.06, 0.07, 0.08);
  material.specularPower = 40;
  material.backFaceCulling = true;
  return material;
}

function makeProductionMaterial(name: string, color: string, scene: Scene): PBRMetallicRoughnessMaterial {
  const material = new PBRMetallicRoughnessMaterial(name, scene);
  material.baseColor = Color3.FromHexString(color).toLinearSpace();
  material.metallic = 0;
  material.roughness = 0.8;
  // The source part indices are outward-facing CCW triangles. Keep that winding
  // explicit so the RH glTF exporter does not reverse them for its default CW.
  material.sideOrientation = Material.CounterClockWiseSideOrientation;
  material.backFaceCulling = true;
  return material;
}

function lowestSkinnedY(geometry: CharacterGeometry, meshes: readonly Mesh[], skeleton: Skeleton): number {
  let lowest = Number.POSITIVE_INFINITY;
  for (const [partIndex, part] of geometry.parts.entries()) {
    const mesh = meshes[partIndex];
    if (!mesh) continue;
    const matrices = skeleton.getTransformMatrices(mesh);
    for (let vertex = 0; vertex < part.positions.length / 3; vertex += 1) {
      let y = 0;
      for (let channel = 0; channel < 4; channel += 1) {
        const weight = part.weights[vertex * 4 + channel] ?? 0;
        if (weight <= 0) continue;
        const joint = part.joints[vertex * 4 + channel] ?? 0;
        const offset = joint * 16;
        const x = part.positions[vertex * 3] ?? 0;
        const sourceY = part.positions[vertex * 3 + 1] ?? 0;
        const z = part.positions[vertex * 3 + 2] ?? 0;
        y += ((matrices[offset + 1] ?? 0) * x + (matrices[offset + 5] ?? 0) * sourceY + (matrices[offset + 9] ?? 0) * z + (matrices[offset + 13] ?? 0)) * weight;
      }
      lowest = Math.min(lowest, y);
    }
  }
  return lowest;
}

interface ProductionRig {
  readonly root: TransformNode;
  readonly skeleton: Skeleton;
  readonly bones: readonly Bone[];
  readonly nodes: readonly TransformNode[];
  readonly attachments: readonly TransformNode[];
  readonly meshes: readonly Mesh[];
  readonly groups: ReadonlyMap<ClipName, AnimationGroup>;
  readonly skeletonUpdateObserver: ReturnType<Scene["onBeforeRenderObservable"]["add"]>;
  dispose(): void;
}

function buildProduction(scene: Scene, geometry: CharacterGeometry): ProductionRig {
  const root = new TransformNode("character_root", scene);
  root.metadata = {
    source: "NEON CONTRACT Character Creator",
    version: CHARACTER_VERSION,
    spec: geometry.spec,
    gltf: { extras: { generator: "NEON CONTRACT Character Creator", generatorVersion: CHARACTER_VERSION, spec: geometry.spec } },
  };
  const skeleton = new Skeleton("character_skeleton", geometry.spec.id, scene);
  const nodes: TransformNode[] = [];
  const bones: Bone[] = [];
  geometry.joints.forEach((joint, index) => {
    const node = new TransformNode(`joint_${joint.id}`, scene);
    const parentNode = joint.parentIndex === null ? root : nodes[joint.parentIndex];
    if (parentNode) node.parent = parentNode;
    node.position.set(joint.position[0], joint.position[1], joint.position[2]);
    node.rotationQuaternion = Quaternion.Identity();
    const bind = Matrix.Compose(Vector3.One(), Quaternion.Identity(), new Vector3(...joint.position));
    const parentBone = joint.parentIndex === null ? null : bones[joint.parentIndex] ?? null;
    const bone = new Bone(joint.id, skeleton, parentBone, bind, bind, bind, index);
    bone.linkTransformNode(node);
    nodes.push(node);
    bones.push(bone);
  });

  const attachments: TransformNode[] = [];
  for (const [id, jointId, position] of [
    ["right_grip", "RightHand", [0, 0, 0.025]],
    ["chest_mount", "Chest", [0, -0.055 * geometry.stats.height, 0.095 * geometry.stats.height]],
  ] as const) {
    const parentIndex = geometry.joints.findIndex((joint) => joint.id === jointId);
    const parentNode = nodes[parentIndex];
    if (!parentNode) continue;
    const anchor = new TransformNode(id, scene);
    anchor.parent = parentNode;
    anchor.position.set(position[0], position[1], position[2]);
    anchor.rotationQuaternion = Quaternion.Identity();
    anchor.metadata = {
      attachmentId: id,
      jointId,
      gltf: { extras: { attachmentId: id, jointId } },
    };
    attachments.push(anchor);
  }
  skeleton.computeAbsoluteMatrices(true);
  skeleton.prepare(true);
  // Linked TransformNodes are animation targets, but their changes do not dirty
  // Babylon's cached bone palette on their own. Refresh it before each render.
  const skeletonUpdateObserver = scene.onBeforeRenderObservable.add(() => skeleton._markAsDirty());

  const materialCache = new Map<string, PBRMetallicRoughnessMaterial>();
  const meshes: Mesh[] = [];
  for (const part of geometry.parts) {
    let material = materialCache.get(part.material);
    if (!material) {
      material = makeProductionMaterial(`${geometry.spec.id}_${part.material}`, geometry.spec.palette[part.material], scene);
      materialCache.set(part.material, material);
    }
    const mesh = new Mesh(`character_${part.id}`, scene);
    mesh.parent = root;
    mesh.material = material;
    mesh.metadata = { characterId: geometry.spec.id, partId: part.id, paletteRole: part.material };
    mesh.setVerticesData(VertexBuffer.PositionKind, [...part.positions], true, 3);
    mesh.setVerticesData(VertexBuffer.NormalKind, [...part.normals], true, 3);
    mesh.setVerticesData(VertexBuffer.MatricesIndicesKind, [...part.joints], true, 4);
    mesh.setVerticesData(VertexBuffer.MatricesWeightsKind, [...part.weights], true, 4);
    mesh.setIndices([...part.indices]);
    mesh.skeleton = skeleton;
    mesh.refreshBoundingInfo();
    meshes.push(mesh);
  }

  const groups = new Map<ClipName, AnimationGroup>();
  const hipPositionAnimations = new Map<ClipName, Animation>();
  for (const clip of CLIP_NAMES) {
    const group = new AnimationGroup(clip, scene);
    const clipFrames = CLIP_FRAMES[clip];
    const clipPoses = poseKeysForClip(clip);
    const lastFrame = clipFrames[clipFrames.length - 1] ?? 30;
    nodes.forEach((node, index) => {
      const joint = geometry.joints[index];
      if (!joint) return;
      const positionKeys = clipFrames.map((frame, keyIndex) => {
        const pose = clipPoses[keyIndex]?.[joint.id];
        const hipLift = joint.id === "Hips" ? pose?.y ?? 0 : 0;
        return { frame, value: new Vector3(joint.position[0], joint.position[1] + hipLift, joint.position[2]) };
      });
      const rotationKeys = clipFrames.map((frame, keyIndex) => {
        const euler = clipPoses[keyIndex]?.[joint.id]?.rotation ?? [0, 0, 0];
        return { frame, value: Quaternion.FromEulerAngles(euler[0], euler[1], euler[2]) };
      });
      const positionAnimation = new Animation(`${clip}_${joint.id}_position`, "position", 30, Animation.ANIMATIONTYPE_VECTOR3, Animation.ANIMATIONLOOPMODE_CYCLE);
      positionAnimation.setKeys(positionKeys);
      if (joint.id === "Hips") hipPositionAnimations.set(clip, positionAnimation);
      const rotationAnimation = new Animation(`${clip}_${joint.id}_rotation`, "rotationQuaternion", 30, Animation.ANIMATIONTYPE_QUATERNION, Animation.ANIMATIONLOOPMODE_CYCLE);
      rotationAnimation.setKeys(rotationKeys);
      group.addTargetedAnimation(positionAnimation, node);
      group.addTargetedAnimation(rotationAnimation, node);
    });
    group.from = 0;
    group.to = lastFrame;
    groups.set(clip, group);

    const hipAnimation = hipPositionAnimations.get(clip);
    if (hipAnimation) {
      // Sample the actual weighted skin at 30 fps and compensate only the hip's
      // vertical offset, keeping every pose on the floor without changing motion.
      const floorKeys = [];
      group.start(false, 1, 0, lastFrame);
      for (let frame = 0; frame <= lastFrame; frame += 1) {
        group.goToFrame(frame);
        nodes.forEach((node) => node.computeWorldMatrix(true));
        skeleton.computeAbsoluteMatrices(true);
        skeleton._markAsDirty();
        skeleton.prepare(true);
        const floorOffset = -lowestSkinnedY(geometry, meshes, skeleton);
        const hips = nodes[0];
        if (hips) floorKeys.push({ frame, value: new Vector3(hips.position.x, hips.position.y + floorOffset, hips.position.z) });
      }
      group.stop();
      hipAnimation.setKeys(floorKeys);
      nodes.forEach((node, index) => {
        const joint = geometry.joints[index];
        if (!joint) return;
        node.position.set(joint.position[0], joint.position[1], joint.position[2]);
        node.rotationQuaternion = Quaternion.Identity();
      });
      skeleton._markAsDirty();
      skeleton.prepare(true);
    }
  }

  return {
    root, skeleton, bones, nodes, attachments, meshes, groups, skeletonUpdateObserver,
    dispose() {
      scene.onBeforeRenderObservable.remove(skeletonUpdateObserver);
      groups.forEach((group) => group.dispose());
      meshes.forEach((mesh) => mesh.dispose(false, false));
      materialCache.forEach((material) => material.dispose());
      skeleton.dispose();
      root.dispose(false, true);
    },
  };
}

function parseSpec(spec: CharacterSpec): CharacterSpec {
  const result = validateCharacterSpec(spec);
  if (!result.ok) throw new Error(result.errors.join(" "));
  return result.value;
}

async function serializeCharacter(scene: Scene, geometry: CharacterGeometry): Promise<Blob> {
  const exportRig = buildProduction(scene, geometry);
  try {
    // glTF validators expect skinned mesh nodes at the scene root. All mesh and
    // rig bind transforms are identity-relative, so this preserves the skin while
    // leaving character_root available for generator/spec extras.
    exportRig.meshes.forEach((mesh) => {
      mesh.parent = null;
      mesh.computeWorldMatrix(true);
    });
    const data = await GLTF2Export.GLBAsync(scene, "neon-character", {
      shouldExportNode: (node) => node === exportRig.root || exportRig.nodes.includes(node as TransformNode) || exportRig.attachments.includes(node as TransformNode) || exportRig.meshes.includes(node as Mesh),
      metadataSelector: (metadata) => metadata?.gltf?.extras,
      removeNoopRootNodes: false,
      exportWithoutWaitingForScene: true,
    });
    const glb = data.files["neon-character.glb"];
    if (!(glb instanceof Blob)) throw new Error("Der GLB-Exporter hat keine binäre glTF-Datei geliefert.");
    return glb;
  } finally {
    exportRig.dispose();
  }
}

/** Exportiert eine Figuren-Spezifikation ohne Browser, Renderer oder externe Assets als GLB. */
export async function exportCharacterGlb(spec: CharacterSpec): Promise<Blob> {
  const engine = new NullEngine({ renderWidth: 1, renderHeight: 1, textureSize: 1, deterministicLockstep: false, lockstepMaxSteps: 4 });
  const scene = new Scene(engine);
  scene.useRightHandedSystem = true;
  try {
    return await serializeCharacter(scene, buildCharacter(parseSpec(spec)));
  } finally {
    scene.dispose();
    engine.dispose();
  }
}

export function mountCharacterPreview(host: HTMLElement, initialSpec: CharacterSpec): CharacterPreview {
  const canvas = document.createElement("canvas");
  canvas.className = "character-preview-canvas";
  canvas.tabIndex = 0;
  canvas.setAttribute("aria-label", "3D-Charaktervorschau, ziehen zum Drehen, Mausrad zum Zoomen");
  host.replaceChildren(canvas);

  const engine = new Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true }, false);
  const scene = new Scene(engine);
  scene.clearColor = new Color4(0.36, 0.39, 0.41, 1);
  scene.ambientColor = new Color3(0.10, 0.11, 0.12);

  const camera = new ArcRotateCamera("character_camera", Math.PI / 4, 1.18, 2.85, new Vector3(0, 0.54, 0), scene);
  camera.mode = Camera.ORTHOGRAPHIC_CAMERA;
  camera.minZ = 0.05;
  camera.maxZ = 80;
  camera.lowerRadiusLimit = 1.45;
  camera.upperRadiusLimit = 5.5;
  camera.wheelPrecision = 45;
  camera.panningSensibility = 0;
  camera.attachControl(canvas, true);
  const key = new DirectionalLight("asset_key", new Vector3(-0.45, -0.86, 0.5), scene);
  key.intensity = 0.78;
  const fill = new HemisphericLight("asset_fill", new Vector3(0.2, 1, -0.2), scene);
  fill.intensity = 0.54;
  fill.groundColor = new Color3(0.22, 0.24, 0.25);

  const ground = CreateGround("preview_ground", { width: 8, height: 8 }, scene);
  ground.position.y = -0.015;
  ground.isPickable = false;
  const groundMaterial = makeMaterial("preview_ground_material", "#737c80", scene);
  ground.material = groundMaterial;
  const plinth = CreateCylinder("preview_plinth", { diameter: 0.96, height: 0.045, tessellation: 64 }, scene);
  plinth.position.y = 0.01;
  plinth.isPickable = false;
  const plinthMaterial = makeMaterial("preview_plinth_material", "#929da1", scene);
  plinth.material = plinthMaterial;

  function updateCameraProjection(): void {
    const aspect = Math.max(0.45, canvas.clientWidth / Math.max(canvas.clientHeight, 1));
    const vertical = 0.68 * camera.radius / 2.85;
    camera.orthoTop = vertical;
    camera.orthoBottom = -vertical;
    camera.orthoLeft = -vertical * aspect;
    camera.orthoRight = vertical * aspect;
  }
  function resizeViewport(): void {
    engine.resize();
    updateCameraProjection();
  }
  const resizeObserver = new ResizeObserver(resizeViewport);
  resizeObserver.observe(host);
  const cameraObserver = camera.onViewMatrixChangedObservable.add(updateCameraProjection);
  resizeViewport();

  let geometry = buildCharacter(parseSpec(initialSpec));
  let production = buildProduction(scene, geometry);
  production.root.position.y = 0.04;
  let selectedClip: ClipName = "idle";
  let playing = true;
  function playClip(): void {
    production.groups.forEach((group) => group.stop(true));
    const group = production.groups.get(selectedClip);
    if (group) {
      group.start(LOOPING_CLIPS.has(selectedClip), 1, 0, group.to, false);
      if (!playing) group.pause();
    }
  }
  playClip();
  engine.runRenderLoop(() => scene.render());

  const preview: CharacterPreview = {
    setSpec(spec) {
      const nextSpec = parseSpec(spec);
      const nextGeometry = buildCharacter(nextSpec);
      production.dispose();
      geometry = nextGeometry;
      production = buildProduction(scene, geometry);
      production.root.position.y = 0.04;
      playClip();
    },
    setClip(clip) {
      if (!(CLIP_NAMES as readonly string[]).includes(clip)) throw new Error(`Unbekannter Clip: ${clip}`);
      selectedClip = clip;
      playClip();
      if (!playing) production.groups.get(selectedClip)?.pause();
    },
    setPlaying(value) {
      playing = value;
      const group = production.groups.get(selectedClip);
      if (!group) return;
      if (playing) {
        if (group.isStarted && !group.isPlaying) group.restart();
        else playClip();
      } else group.pause();
    },
    setView(view) {
      const views: Readonly<Record<CharacterView, { alpha: number; beta: number }>> = {
        front: { alpha: Math.PI / 2, beta: Math.PI / 2 },
        iso: { alpha: Math.PI / 4, beta: 1.18 },
        back: { alpha: -Math.PI / 2, beta: Math.PI / 2 },
        side: { alpha: 0, beta: Math.PI / 2 },
      };
      const target = views[view];
      if (!target) throw new Error(`Unbekannte Ansicht: ${view}`);
      camera.alpha = target.alpha;
      camera.beta = target.beta;
    },
    exportGlb() {
      const exportScene = new Scene(engine);
      exportScene.useRightHandedSystem = true;
      const exportGeometry = buildCharacter(parseSpec(geometry.spec));
      return serializeCharacter(exportScene, exportGeometry).finally(() => exportScene.dispose());
    },
    getReport() {
      return { ...geometry.stats, clips: CLIP_NAMES };
    },
    dispose() {
      resizeObserver.disconnect();
      camera.onViewMatrixChangedObservable.remove(cameraObserver);
      engine.stopRenderLoop();
      production.dispose();
      ground.dispose(false, false);
      plinth.dispose(false, false);
      groundMaterial.dispose();
      plinthMaterial.dispose();
      scene.dispose();
      engine.dispose();
      host.replaceChildren();
    },
  };
  return preview;
}
