import { actionAp, CREW_AP } from "./ap.ts";
import { deckungFixture, type PlacedUnit } from "./deckungFixture.ts";
import { createRng, rollPercent, type RngState } from "./rng.ts";
import { previewShot } from "./shot.ts";
import type { BattleMap, Cell, ShotPreview } from "./types.ts";
import {
  appliedChance,
  applyStrike,
  BODY_HP,
  derivedHp,
  freshParts,
  VITAL_HIT,
  type BodyPartId,
  type PartState,
  type WoundKind,
} from "./wounds.ts";

export const CREW_HP = BODY_HP;
export const GUARD_HP = BODY_HP;
export const RIFLE_RANGE = 10;
export const RIFLE_MAGAZINE = 6;
/** Schwerer Treffer auf Kopf oder Torso bei Kratzer und Blutung. Der tatsächliche Abzug hängt von Ort und Art ab. */
export const HIT_DAMAGE = VITAL_HIT;
export const AIM_BONUS = 15;
export const SCHUSS_VIEW_SEED = 1;
export const SCHUSS_MISS_SEED = 5;

export interface Combatant {
  readonly hp: number;
  readonly ap: number;
  readonly magazine: number;
  readonly range: number;
}

export type ShotStatus = "hit" | "miss" | "blocked" | "no-ap" | "no-ammo" | "out-of-range";

export interface ShotResolution {
  readonly status: ShotStatus;
  readonly preview: ShotPreview;
  readonly roll: number | null;
  readonly damage: number;
  readonly part: BodyPartId | null;
  readonly wound: WoundKind | null;
  readonly parts: readonly PartState[];
  readonly penalty: number;
  readonly apSpent: number;
  readonly ammoSpent: number;
  readonly shooterHp: number;
  readonly shooterAp: number;
  readonly shooterMagazine: number;
  readonly targetHp: number;
  readonly rng: RngState;
}

export interface SchussView {
  readonly seed: number;
  readonly aimBonus: 0 | typeof AIM_BONUS;
  readonly weapon: "rifle";
  readonly map: BattleMap;
  readonly shooter: PlacedUnit;
  readonly target: PlacedUnit;
  readonly maxAp: number;
  readonly shooterMaxHp: number;
  readonly targetMaxHp: number;
  readonly magazineSize: number;
  readonly resolution: ShotResolution;
}

export function resolveShot(
  map: BattleMap,
  from: Cell,
  to: Cell,
  aimBonus: number,
  shooter: Combatant,
  parts: readonly PartState[],
  rng: RngState,
  billing: "action" | "reaction" = "action",
  penalty = 0,
): ShotResolution {
  if (rng.stream !== "combat") throw new Error("Schuss würfelt nur mit dem Kampf-RNG");
  if (billing !== "action" && billing !== "reaction") throw new Error("Schussabrechnung ist ungültig");
  if (aimBonus !== 0 && aimBonus !== AIM_BONUS) throw new Error("Zielbonus ist 0 oder 15");
  if (billing === "reaction" && aimBonus !== 0) throw new Error("Reaktionsfeuer hat keinen Zielbonus");
  if (!Number.isInteger(penalty) || penalty < 0 || penalty > 100) throw new Error("Armabzug ist ungültig");
  assertCount(shooter.hp, "HP");
  assertCount(shooter.ap, "AP");
  assertCount(shooter.magazine, "Magazin");
  assertCount(shooter.range, "Reichweite");
  assertParts(parts);

  const preview = previewShot(map, from, to, aimBonus);
  const shotAp = actionAp("shot");
  const idle = {
    preview,
    roll: null,
    damage: 0,
    part: null,
    wound: null,
    parts,
    penalty,
    apSpent: 0,
    ammoSpent: 0,
    shooterHp: shooter.hp,
    shooterAp: shooter.ap,
    shooterMagazine: shooter.magazine,
    targetHp: derivedHp(parts),
    rng,
  };

  if (preview.blocked || preview.chance === null) return { ...idle, status: "blocked" };
  if (preview.distance > shooter.range) return { ...idle, status: "out-of-range" };
  if (billing === "action" && shooter.ap < shotAp) return { ...idle, status: "no-ap" };
  if (billing === "action" && shooter.magazine < 1) return { ...idle, status: "no-ammo" };

  const rolled = rollPercent(rng);
  const hit = rolled.roll < appliedChance(preview.chance, penalty);
  const spendsAction = billing === "action";
  const spent = {
    preview,
    roll: rolled.roll,
    penalty,
    apSpent: spendsAction ? shotAp : 0,
    ammoSpent: 1,
    shooterHp: shooter.hp,
    shooterAp: spendsAction ? shooter.ap - shotAp : shooter.ap,
    shooterMagazine: spendsAction ? shooter.magazine - 1 : shooter.magazine,
  };
  if (!hit) {
    return {
      ...spent,
      status: "miss",
      damage: 0,
      part: null,
      wound: null,
      parts,
      targetHp: derivedHp(parts),
      rng: rolled.rng,
    };
  }
  const struck = applyStrike(parts, rolled.rng);
  return {
    ...spent,
    status: "hit",
    damage: struck.damage,
    part: struck.part,
    wound: struck.wound,
    parts: struck.parts,
    targetHp: derivedHp(struck.parts),
    rng: struck.rng,
  };
}

export function schussView(seed: number, aimBonus: 0 | typeof AIM_BONUS = 0): SchussView {
  const shooter = {
    hp: GUARD_HP,
    ap: CREW_AP,
    magazine: RIFLE_MAGAZINE,
    range: RIFLE_RANGE,
  };
  const resolution = resolveShot(
    deckungFixture.map,
    deckungFixture.enemy,
    deckungFixture.runner,
    aimBonus,
    shooter,
    freshParts(),
    createRng(seed, "combat"),
  );
  return {
    seed,
    aimBonus,
    weapon: "rifle",
    map: deckungFixture.map,
    shooter: deckungFixture.enemy,
    target: deckungFixture.runner,
    maxAp: CREW_AP,
    shooterMaxHp: GUARD_HP,
    targetMaxHp: CREW_HP,
    magazineSize: RIFLE_MAGAZINE,
    resolution,
  };
}

function assertCount(value: number, label: string): void {
  if (!Number.isInteger(value) || value < 0) throw new Error(`${label} muss eine ganze Zahl ab 0 sein`);
}

function assertParts(parts: readonly PartState[]): void {
  if (parts.length !== 6) throw new Error("Körperteile fehlen");
  for (let index = 0; index < parts.length; index += 1) {
    const part = parts[index];
    if (!part || !Number.isInteger(part.hp) || part.hp < 0 || part.hp > part.maxHp) {
      throw new Error("Teilpunkte sind ungültig");
    }
  }
}
