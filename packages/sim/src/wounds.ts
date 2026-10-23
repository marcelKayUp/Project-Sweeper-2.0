import { nextUint32, type RngState } from "./rng.ts";

export const BODY_PARTS = ["head", "torso", "arm-l", "arm-r", "leg-l", "leg-r"] as const;
export const WOUND_KINDS = ["graze", "bleed", "fracture"] as const;

export type BodyPartId = (typeof BODY_PARTS)[number];
export type WoundKind = (typeof WOUND_KINDS)[number];

export interface PartState {
  readonly id: BodyPartId;
  readonly hp: number;
  readonly maxHp: number;
  readonly wound: WoundKind | null;
}

/** Kopf und Torso halten mehr aus und nehmen den schwereren Treffer. Gliedmaßen bleiben bei 2, damit ein Kratzer sie nicht sofort ausfallen lässt. */
const PART_MAX: Readonly<Record<BodyPartId, number>> = {
  head: 3,
  torso: 3,
  "arm-l": 2,
  "arm-r": 2,
  "leg-l": 2,
  "leg-r": 2,
};

const WOUND_RANK: Readonly<Record<WoundKind, number>> = {
  graze: 1,
  bleed: 2,
  fracture: 3,
};

export const PART_HEAL = 1;
export const BLEED_TICK = 1;
export const OPEN_STEP_AP = 1;
export const HURT_LEG_STEP_AP = 2;
export const ARM_SHOT_PENALTY = 15;
export const VITAL_HIT = 2;
export const LIMB_HIT = 1;
export const VITAL_FRACTURE = 3;
export const LIMB_FRACTURE = 2;

function sumPartMax(): number {
  let sum = 0;
  for (const id of BODY_PARTS) sum += PART_MAX[id];
  return sum;
}

/** Abgeleitete HP sind die Summe der Teilpunkte. 0 ist kampfunfähig; Sieg, Niederlage und Bewegung lesen weiter diesen einen Wert. */
export const BODY_HP = sumPartMax();

export function freshParts(): readonly PartState[] {
  return BODY_PARTS.map((id) => ({
    id,
    hp: PART_MAX[id],
    maxHp: PART_MAX[id],
    wound: null,
  }));
}

export function derivedHp(parts: readonly PartState[]): number {
  let sum = 0;
  for (const part of parts) sum += part.hp;
  return sum;
}

export function isBodyPart(value: string): value is BodyPartId {
  return (BODY_PARTS as readonly string[]).includes(value);
}

export function isWoundKind(value: string): value is WoundKind {
  return (WOUND_KINDS as readonly string[]).includes(value);
}

export function strikeDamage(part: BodyPartId, wound: WoundKind): number {
  const vital = part === "head" || part === "torso";
  if (wound === "fracture") return vital ? VITAL_FRACTURE : LIMB_FRACTURE;
  return vital ? VITAL_HIT : LIMB_HIT;
}

export function appliedChance(chance: number, penalty: number): number {
  return Math.max(0, chance - penalty);
}

/**
 * Nach dem Trefferwurf: zuerst der Ort in BODY_PARTS, danach die Art in WOUND_KINDS.
 * Der Schaden sitzt nur auf diesem Teil und endet bei 0.
 */
export function applyStrike(
  parts: readonly PartState[],
  rng: RngState,
): {
  readonly parts: readonly PartState[];
  readonly rng: RngState;
  readonly part: BodyPartId;
  readonly wound: WoundKind;
  readonly damage: number;
} {
  if (rng.stream !== "combat") throw new Error("Verletzung würfelt nur mit dem Kampf-RNG");
  const partRoll = rollFair(rng, BODY_PARTS.length);
  const woundRoll = rollFair(partRoll.rng, WOUND_KINDS.length);
  const partId = BODY_PARTS[partRoll.index];
  const wound = WOUND_KINDS[woundRoll.index];
  if (partId === undefined || wound === undefined) throw new Error("Trefferort ist ungültig");
  const current = requirePart(parts, partId);
  const damage = Math.min(strikeDamage(partId, wound), current.hp);
  const next = parts.map((part) =>
    part.id === partId
      ? { ...part, hp: part.hp - damage, wound: stronger(part.wound, wound) }
      : part,
  );
  return { parts: next, rng: woundRoll.rng, part: partId, wound, damage };
}

/** Eine blutende Stelle verliert einmal BLEED_TICK, solange sie noch Punkte hat. */
export function tickBleed(parts: readonly PartState[]): { readonly parts: readonly PartState[]; readonly damage: number } {
  let damage = 0;
  const next = parts.map((part) => {
    if (part.wound !== "bleed" || part.hp <= 0) return part;
    const loss = Math.min(BLEED_TICK, part.hp);
    damage += loss;
    return { ...part, hp: part.hp - loss };
  });
  return { parts: next, damage };
}

export function canTreat(part: PartState): boolean {
  return part.wound === "bleed" || part.hp < part.maxHp;
}

/** Blutung zuerst, dann die wenigsten Punkte, dann die feste Teilreihenfolge. Kein Würfel. */
export function treatmentTarget(parts: readonly PartState[]): BodyPartId | null {
  let best: PartState | null = null;
  for (const part of parts) {
    if (!canTreat(part)) continue;
    if (!best || prefersTreatment(part, best)) best = part;
  }
  return best?.id ?? null;
}

/**
 * Stillt die Blutung dieses Teils, entfernt einen Kratzer und stellt PART_HEAL Punkte her.
 * Ein Bruch bleibt. Ein volles Teil ohne Blutung bleibt unverändert.
 */
export function treatPart(
  parts: readonly PartState[],
  id: BodyPartId,
): { readonly parts: readonly PartState[]; readonly restored: number } | null {
  const current = requirePart(parts, id);
  if (!canTreat(current)) return null;
  const restored = Math.min(PART_HEAL, current.maxHp - current.hp);
  const hp = current.hp + restored;
  const wound = current.wound === "fracture" ? "fracture" : null;
  if (restored === 0 && wound === current.wound) return null;
  return {
    restored,
    parts: parts.map((part) => (part.id === id ? { ...part, hp, wound } : part)),
  };
}

export function stepAp(parts: readonly PartState[]): number {
  for (const part of parts) {
    if (part.id !== "leg-l" && part.id !== "leg-r") continue;
    if (part.wound === "fracture" || part.hp <= 0) return HURT_LEG_STEP_AP;
  }
  return OPEN_STEP_AP;
}

export function shotPenalty(parts: readonly PartState[]): number {
  for (const part of parts) {
    if (part.id !== "arm-l" && part.id !== "arm-r") continue;
    if (part.wound === "fracture" || part.hp <= 0) return ARM_SHOT_PENALTY;
  }
  return 0;
}

/** Beide Arme auf 0: das Gewehr ist nicht nutzbar. Die Pistole bleibt es. */
export function rifleBlocked(parts: readonly PartState[]): boolean {
  let left = false;
  let right = false;
  for (const part of parts) {
    if (part.id === "arm-l" && part.hp <= 0) left = true;
    if (part.id === "arm-r" && part.hp <= 0) right = true;
  }
  return left && right;
}

function prefersTreatment(left: PartState, right: PartState): boolean {
  const leftBleed = left.wound === "bleed" ? 1 : 0;
  const rightBleed = right.wound === "bleed" ? 1 : 0;
  if (leftBleed !== rightBleed) return leftBleed > rightBleed;
  if (left.hp !== right.hp) return left.hp < right.hp;
  return partIndex(left.id) < partIndex(right.id);
}

function stronger(current: WoundKind | null, rolled: WoundKind): WoundKind {
  if (current === null) return rolled;
  return WOUND_RANK[rolled] >= WOUND_RANK[current] ? rolled : current;
}

function requirePart(parts: readonly PartState[], id: BodyPartId): PartState {
  const found = parts.find((part) => part.id === id);
  if (!found) throw new Error("Körperteil fehlt");
  return found;
}

function partIndex(id: BodyPartId): number {
  return BODY_PARTS.indexOf(id);
}

function rollFair(rng: RngState, count: number): { readonly index: number; readonly rng: RngState } {
  if (!Number.isInteger(count) || count < 2 || count > 256) throw new Error("Würfelspanne ist ungültig");
  const limit = Math.floor(4294967296 / count) * count;
  let current = rng;
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const next = nextUint32(current);
    current = next.rng;
    if (next.value < limit) return { index: next.value % count, rng: current };
  }
  throw new Error("Kampf-RNG liefert keinen Trefferort");
}
