import { actionAp, CREW_AP } from "./ap.ts";
import { deckungFixture, type PlacedUnit } from "./deckungFixture.ts";
import { createRng, rollPercent, type RngState } from "./rng.ts";
import { previewShot } from "./shot.ts";
import type { BattleMap, Cell, ShotPreview } from "./types.ts";

export const CREW_HP = 6;
export const GUARD_HP = 4;
export const RIFLE_RANGE = 10;
export const RIFLE_MAGAZINE = 6;
export const HIT_DAMAGE = 2;
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
  targetHp: number,
  rng: RngState,
  billing: "action" | "reaction" = "action",
): ShotResolution {
  if (rng.stream !== "combat") throw new Error("Schuss würfelt nur mit dem Kampf-RNG");
  if (billing !== "action" && billing !== "reaction") throw new Error("Schussabrechnung ist ungültig");
  if (aimBonus !== 0 && aimBonus !== AIM_BONUS) throw new Error("Zielbonus ist 0 oder 15");
  if (billing === "reaction" && aimBonus !== 0) throw new Error("Reaktionsfeuer hat keinen Zielbonus");
  assertCount(shooter.hp, "HP");
  assertCount(shooter.ap, "AP");
  assertCount(shooter.magazine, "Magazin");
  assertCount(shooter.range, "Reichweite");
  assertCount(targetHp, "Ziel-HP");

  const preview = previewShot(map, from, to, aimBonus);
  const shotAp = actionAp("shot");
  const idle = {
    preview,
    roll: null,
    damage: 0,
    apSpent: 0,
    ammoSpent: 0,
    shooterHp: shooter.hp,
    shooterAp: shooter.ap,
    shooterMagazine: shooter.magazine,
    targetHp,
    rng,
  };

  if (preview.blocked || preview.chance === null) return { ...idle, status: "blocked" };
  if (preview.distance > shooter.range) return { ...idle, status: "out-of-range" };
  if (billing === "action" && shooter.ap < shotAp) return { ...idle, status: "no-ap" };
  if (billing === "action" && shooter.magazine < 1) return { ...idle, status: "no-ammo" };

  const rolled = rollPercent(rng);
  const hit = rolled.roll < preview.chance;
  const damage = hit ? HIT_DAMAGE : 0;
  const spendsAction = billing === "action";
  return {
    status: hit ? "hit" : "miss",
    preview,
    roll: rolled.roll,
    damage,
    apSpent: spendsAction ? shotAp : 0,
    ammoSpent: 1,
    shooterHp: shooter.hp,
    shooterAp: spendsAction ? shooter.ap - shotAp : shooter.ap,
    shooterMagazine: spendsAction ? shooter.magazine - 1 : shooter.magazine,
    targetHp: Math.max(0, targetHp - damage),
    rng: rolled.rng,
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
    CREW_HP,
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
