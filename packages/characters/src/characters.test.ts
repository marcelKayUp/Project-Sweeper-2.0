import { describe, expect, it } from "vitest";
import {
  ACCESSORY_TYPES,
  BODY_TYPES,
  CLIP_NAMES,
  CHARACTER_VERSION,
  HAIR_TYPES,
  OUTFIT_TYPES,
  buildCharacter,
  createCharacterSpec,
  randomizeCharacterSpec,
  validateCharacterSpec,
  type CharacterSpec,
} from "./index.ts";

function bounds(values: readonly number[], axis: number): readonly [number, number] {
  const coords = values.filter((_, index) => index % 3 === axis);
  return [Math.min(...coords), Math.max(...coords)];
}

function triangleNormalDot(part: { positions: readonly number[]; normals: readonly number[]; indices: readonly number[] }, triangle: number): number {
  const i0 = part.indices[triangle * 3]!;
  const i1 = part.indices[triangle * 3 + 1]!;
  const i2 = part.indices[triangle * 3 + 2]!;
  const p = (index: number): readonly [number, number, number] => [part.positions[index * 3]!, part.positions[index * 3 + 1]!, part.positions[index * 3 + 2]!];
  const a = p(i0);
  const b = p(i1);
  const c = p(i2);
  const ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const ac = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
  const cross = [ab[1]! * ac[2]! - ab[2]! * ac[1]!, ab[2]! * ac[0]! - ab[0]! * ac[2]!, ab[0]! * ac[1]! - ab[1]! * ac[0]!];
  const average = [0, 1, 2].map((axis) => (part.normals[i0 * 3 + axis]! + part.normals[i1 * 3 + axis]! + part.normals[i2 * 3 + axis]!) / 3);
  return cross[0]! * average[0]! + cross[1]! * average[1]! + cross[2]! * average[2]!;
}

function assertClosedOrientedSurface(part: { positions: readonly number[]; indices: readonly number[] }): void {
  const vertexKey = (index: number): string => [0, 1, 2]
    .map((axis) => Math.round(part.positions[index * 3 + axis]! * 100_000))
    .join(",");
  const edges = new Map<string, { count: number; direction: number; uses: string[] }>();
  for (let offset = 0; offset < part.indices.length; offset += 3) {
    const triangle = [part.indices[offset]!, part.indices[offset + 1]!, part.indices[offset + 2]!];
    for (let edge = 0; edge < 3; edge += 1) {
      const from = vertexKey(triangle[edge]!);
      const to = vertexKey(triangle[(edge + 1) % 3]!);
      const key = from < to ? `${from}|${to}` : `${to}|${from}`;
      const direction = from < to ? 1 : -1;
      const current = edges.get(key) ?? { count: 0, direction: 0, uses: [] };
      current.count += 1;
      current.direction += direction;
      current.uses.push(`${offset / 3}:${from}->${to}`);
      edges.set(key, current);
    }
  }
  for (const [edge, incidence] of edges) {
    expect(incidence.count, `${part.id} edge ${edge} ${incidence.uses.join(" ; ")}`).toBe(2);
    expect(incidence.direction, `${part.id} edge ${edge} ${incidence.uses.join(" ; ")}`).toBe(0);
  }
}

describe("@neon/characters spec contract", () => {
  it("exports the stable public enums and makes a valid default spec", () => {
    expect(CHARACTER_VERSION).toBe("1.2.0");
    expect(CLIP_NAMES).toEqual(["idle", "walk", "crouch", "shoot", "reload", "hit", "death"]);
    expect(BODY_TYPES).toEqual(["lean", "standard", "heavy"]);
    expect(HAIR_TYPES).toEqual(["none", "crop", "mohawk", "bob"]);
    expect(OUTFIT_TYPES).toEqual(["runner", "guard", "tech"]);
    expect(ACCESSORY_TYPES).toEqual(["none", "visor", "goggles", "headset"]);
    expect(validateCharacterSpec(createCharacterSpec()).ok).toBe(true);
    expect(createCharacterSpec().outfit).toBe("guard");
    expect(createCharacterSpec().accessory).toBe("visor");
  });

  it("is deterministic, seedable, and round-trips through JSON", () => {
    expect(createCharacterSpec(42)).toEqual(createCharacterSpec(42));
    expect(randomizeCharacterSpec(42)).toEqual(randomizeCharacterSpec(42));
    const randomA = randomizeCharacterSpec(42);
    const randomB = randomizeCharacterSpec(43);
    expect(randomA).not.toEqual(randomB);
    expect([randomA.body, randomA.stature, randomA.hair, randomA.outfit, randomA.accessory, randomA.palette])
      .not.toEqual([randomB.body, randomB.stature, randomB.hair, randomB.outfit, randomB.accessory, randomB.palette]);
    const roundTrip = JSON.parse(JSON.stringify(createCharacterSpec(19))) as unknown;
    expect(validateCharacterSpec(roundTrip)).toEqual({ ok: true, value: createCharacterSpec(19) });
  });

  it("returns a canonical clone and leaves the caller's data untouched", () => {
    const original = createCharacterSpec(7);
    const input = JSON.parse(JSON.stringify(original)) as CharacterSpec & { unused?: string };
    input.palette.skin = input.palette.skin.toLowerCase();
    const before = JSON.stringify(input);
    const result = validateCharacterSpec(input);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.palette.skin).toMatch(/^#[0-9A-F]{6}$/);
      expect(result.value).not.toBe(input);
    }
    expect(JSON.stringify(input)).toBe(before);
  });

  it("rejects malformed schema, enums, bounds, colors, IDs, and unknown fields", () => {
    const base = createCharacterSpec(5);
    const candidates: unknown[] = [
      null,
      { ...base, schemaVersion: 2 },
      { ...base, id: "UPPER CASE" },
      { ...base, seed: -1 },
      { ...base, seed: 4_294_967_296 },
      { ...base, body: "robot" },
      { ...base, hair: "long" },
      { ...base, outfit: "civilian" },
      { ...base, accessory: "cape" },
      { ...base, stature: 1.151 },
      { ...base, stature: Number.POSITIVE_INFINITY },
      { ...base, extra: true },
      { ...base, palette: { ...base.palette, skin: "red" } },
      { ...base, palette: { ...base.palette, extra: "#000000" } },
      { ...base, palette: { ...base.palette, accent: undefined } },
      "x".repeat(32 * 1024 + 1),
    ];
    for (const candidate of candidates) expect(validateCharacterSpec(candidate).ok).toBe(false);
    expect(validateCharacterSpec("x".repeat(32 * 1024 + 1)).errors.join(" ")).toContain("32768 UTF-8 bytes");
    expect(() => createCharacterSpec(-1)).toThrow(RangeError);
    expect(() => randomizeCharacterSpec(1.5)).toThrow(RangeError);
  });
});

describe("buildCharacter", () => {
  it("builds a deterministic, readable, skinned character with exact stats", () => {
    const spec = { ...createCharacterSpec(42), body: "standard" as const, hair: "crop" as const, outfit: "runner" as const, accessory: "visor" as const };
    const model = buildCharacter(spec);
    expect(buildCharacter(spec)).toEqual(model);
    expect(model.joints.map((joint) => joint.id)).toEqual([
      "Hips", "Spine", "Chest", "Neck", "Head", "LeftShoulder", "LeftUpperArm", "LeftLowerArm", "LeftHand",
      "RightShoulder", "RightUpperArm", "RightLowerArm", "RightHand", "LeftUpperLeg", "LeftLowerLeg", "LeftFoot",
      "RightUpperLeg", "RightLowerLeg", "RightFoot",
    ]);
    expect(model.parts.map((part) => part.id)).toContain("face-eyes");
    expect(model.parts.map((part) => part.id)).toContain("body-head");
    expect(model.parts.map((part) => part.id)).toContain("body-neck");
    expect(model.parts.map((part) => part.id)).toContain("body-left-hand");
    expect(model.parts.map((part) => part.id)).toContain("body-right-shoe");
    expect(model.parts.map((part) => part.id)).toContain("equipment-sidearm-barrel");
    expect(model.stats.triangles).toBe(model.parts.reduce((sum, part) => sum + part.indices.length / 3, 0));
    expect(model.stats.vertices).toBe(model.parts.reduce((sum, part) => sum + part.positions.length / 3, 0));
    expect(model.stats.materials).toBe(new Set(model.parts.map((part) => part.material)).size);
    expect(model.stats.bones).toBe(model.joints.length);
    expect(model.stats.triangles).toBeLessThanOrEqual(5_000);
    expect(model.stats.materials).toBe(5);
    expect(bounds(model.parts.flatMap((part) => part.positions), 1)[0]).toBeCloseTo(0, 7);
    expect(model.stats.height).toBeCloseTo(1.05 * spec.stature, 2);
    expect(model.parts.flatMap((part) => part.positions).every(Number.isFinite)).toBe(true);
    expect(bounds(model.parts.flatMap((part) => part.positions), 2)[1]).toBeGreaterThan(0);
    const face = model.parts.find((part) => part.id === "face-eyes")!;
    expect(bounds(face.positions, 2)[0]).toBeGreaterThan(0);
    expect(face.normals.some((_, index) => index % 3 === 2 && face.normals[index] === 1)).toBe(true);
    for (const part of model.parts) {
      for (let triangle = 0; triangle < part.indices.length / 3; triangle += 1) {
        expect(triangleNormalDot(part, triangle), `${part.id} triangle ${triangle}`).toBeGreaterThan(0);
      }
    }
  });

  it("keeps skin weights normalized and joint indices in range", () => {
    const geometry = buildCharacter(createCharacterSpec(123));
    let blendedVertex: { part: (typeof geometry.parts)[number]; vertex: number } | undefined;
    for (const part of geometry.parts) {
      const vertices = part.positions.length / 3;
      expect(part.normals).toHaveLength(vertices * 3);
      expect(part.joints).toHaveLength(vertices * 4);
      expect(part.weights).toHaveLength(vertices * 4);
      expect(part.indices.length % 3).toBe(0);
      expect(part.indices.every((index) => index >= 0 && index < vertices)).toBe(true);
      expect(part.joints.every((index) => index >= 0 && index < geometry.joints.length)).toBe(true);
      expect([...part.positions, ...part.normals, ...part.weights].every(Number.isFinite)).toBe(true);
      for (let vertex = 0; vertex < vertices; vertex += 1) {
        const offset = vertex * 4;
        const weights = part.weights.slice(offset, offset + 4);
        expect(weights.reduce((sum, weight) => sum + weight, 0)).toBeCloseTo(1, 7);
        if (!blendedVertex && weights.filter((weight) => weight > 0).length >= 2) blendedVertex = { part, vertex };
      }
    }
    for (let index = 0; index < geometry.joints.length; index += 1) {
      const parent = geometry.joints[index]!.parentIndex;
      expect(parent === null || parent < index).toBe(true);
    }
    expect(blendedVertex).toBeDefined();
    const { part, vertex } = blendedVertex!;
    const offset = vertex * 4;
    const original = part.weights.slice(offset, offset + 4);
    const delta = Math.min(original[0]! / 2, original[1]! / 2);
    expect(delta).toBeGreaterThan(0);
    const movingJoint = part.joints[offset + 1]!;
    const sourceY = part.positions[vertex * 3 + 1]!;
    const evaluateY = (weights: readonly number[]): number => weights.reduce((sum, weight, slot) => {
      const translationY = part.joints[offset + slot] === movingJoint ? 2 : 0;
      return sum + (sourceY + translationY) * weight;
    }, 0);
    const changed = [...original];
    changed[0] = changed[0]! + delta;
    changed[1] = changed[1]! - delta;
    expect(evaluateY(changed) - evaluateY(original)).toBeCloseTo(-2 * delta, 7);
  });

  it("keeps human proportions, aligned limbs, modeled hands, and grounded feet", () => {
    const model = buildCharacter({ ...createCharacterSpec(8), outfit: "runner", hair: "none", accessory: "none" });
    const h = 1.05 * model.spec.stature;
    const torso = model.parts.find((part) => part.id === "body-torso")!;
    const widestChest = torso.positions.reduce((max, _, index) => {
      if (index % 3 !== 0) return max;
      const vertex = Math.floor(index / 3);
      const y = torso.positions[vertex * 3 + 1]!;
      return y > h * 0.69 && y < h * 0.75 ? Math.max(max, Math.abs(torso.positions[index]!)) : max;
    }, 0);
    const narrowWaist = torso.positions.reduce((max, _, index) => {
      if (index % 3 !== 0) return max;
      const vertex = Math.floor(index / 3);
      const y = torso.positions[vertex * 3 + 1]!;
      return y > h * 0.53 && y < h * 0.58 ? Math.max(max, Math.abs(torso.positions[index]!)) : max;
    }, 0);
    expect(widestChest).toBeGreaterThan(narrowWaist * 1.25);

    const head = model.parts.find((part) => part.id === "body-head")!;
    expect(bounds(head.positions, 1)[1] - bounds(head.positions, 1)[0]).toBeGreaterThan(h * 0.18);
    expect(model.parts.map((part) => part.id)).toEqual(expect.arrayContaining([
      "face-nose-mouth", "face-mouth", "body-ears", "body-left-thumb", "body-right-thumb", "body-left-fingers", "body-right-fingers",
    ]));
    expect(bounds(model.parts.find((part) => part.id === "body-left-shoe")!.positions, 1)[0]).toBeCloseTo(0, 7);
    expect(bounds(model.parts.find((part) => part.id === "body-right-shoe")!.positions, 1)[0]).toBeCloseTo(0, 7);

    const worldJoint = (jointIndex: number): readonly [number, number, number] => {
      const joint = model.joints[jointIndex]!;
      if (joint.parentIndex === null) return joint.position;
      const parent = worldJoint(joint.parentIndex);
      return [parent[0] + joint.position[0], parent[1] + joint.position[1], parent[2] + joint.position[2]];
    };
    const joint = (id: string): readonly [number, number, number] => worldJoint(model.joints.findIndex((entry) => entry.id === id));
    expect(joint("Hips")[1]).toBeCloseTo(h * 0.455, 7);
    expect(joint("LeftUpperLeg")[0]).toBeCloseTo(-joint("RightUpperLeg")[0], 7);
    expect(joint("LeftLowerLeg")[1]).toBeCloseTo(h * 0.205, 7);
    expect(joint("LeftFoot")[1]).toBeCloseTo(0, 7);
    expect(joint("LeftShoulder")[0]).toBeCloseTo(-joint("RightShoulder")[0], 7);
    expect(joint("RightHand")[1]).toBeCloseTo(h * 0.39, 7);
    expect(joint("RightHand")[1]).toBeGreaterThan(joint("LeftLowerLeg")[1]);

    const expectedWidth = 0.112 * h * (model.spec.body === "lean" ? 0.88 : model.spec.body === "heavy" ? 1.16 : 1);
    expect(joint("LeftShoulder")[0]).toBeCloseTo(-1.83 * expectedWidth, 7);
    expect(joint("RightShoulder")[0]).toBeCloseTo(1.83 * expectedWidth, 7);
    expect(joint("LeftUpperArm")[0]).toBeCloseTo(-2.05 * expectedWidth, 7);
    expect(joint("RightUpperArm")[0]).toBeCloseTo(2.05 * expectedWidth, 7);
    expect(joint("LeftLowerArm")[0]).toBeCloseTo(-1.98 * expectedWidth, 7);
    expect(joint("RightHand")[0]).toBeCloseTo(1.98 * expectedWidth, 7);
    expect(joint("LeftUpperLeg")[0]).toBeCloseTo(-0.94 * expectedWidth, 7);
    expect(joint("RightFoot")[2]).toBeCloseTo(0.005 * h, 7);

    const fingers = model.parts.find((part) => part.id === "body-right-fingers")!;
    expect(bounds(fingers.positions, 1)[1] - bounds(fingers.positions, 1)[0]).toBeLessThan(h * 0.052);
    expect(bounds(fingers.positions, 1)[1] - bounds(fingers.positions, 1)[0]).toBeGreaterThan(h * 0.025);
    const arm = model.parts.find((part) => part.id === "body-right-upper-arm")!;
    const torsoX = bounds(torso.positions, 0);
    const armX = bounds(arm.positions, 0);
    expect(armX[0]).toBeLessThan(torsoX[1]);
  });

  it("closes and consistently orients every generated body surface across body types", () => {
    const base = createCharacterSpec(31);
    for (const body of BODY_TYPES) {
      const geometry = buildCharacter({ ...base, body, hair: "crop", outfit: "runner", accessory: "none" });
      for (const part of geometry.parts) assertClosedOrientedSurface(part);
    }
  });

  it("supports every body, hair, outfit, and accessory combination within budgets", () => {
    const base = createCharacterSpec(77);
    for (const body of BODY_TYPES) {
      for (const hair of HAIR_TYPES) {
        for (const outfit of OUTFIT_TYPES) {
          for (const accessory of ACCESSORY_TYPES) {
            const geometry = buildCharacter({ ...base, body, hair, outfit, accessory });
            expect(geometry.stats.triangles).toBeLessThanOrEqual(5_000);
            expect(geometry.stats.materials).toBe(5);
            expect(geometry.stats.bones).toBe(19);
            expect(geometry.parts.flatMap((part) => part.positions).every(Number.isFinite)).toBe(true);
            const equipmentIds = geometry.parts.map((part) => part.id).filter((id) => id.startsWith("equipment-"));
            expect(equipmentIds.some((id) => id.includes("tech-scanner"))).toBe(outfit === "tech");
            expect(equipmentIds.some((id) => id.includes("sidearm"))).toBe(outfit !== "tech");
            expect(geometry.parts.map((part) => part.id)).toContain("body-left-fingers");
            for (const equipment of geometry.parts.filter((part) => part.id.startsWith("equipment-"))) {
              for (let vertex = 0; vertex < equipment.positions.length / 3; vertex += 1) {
                const offset = vertex * 4;
                expect(equipment.joints[offset]).toBe(12);
                expect(equipment.weights.slice(offset, offset + 4)).toEqual([1, 0, 0, 0]);
              }
            }
          }
        }
      }
    }
  });

  it("rejects invalid input rather than building from an unvalidated object", () => {
    expect(() => buildCharacter({} as CharacterSpec)).toThrow(/Invalid character specification/);
  });
});
