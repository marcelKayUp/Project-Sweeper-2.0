import { describe, expect, it } from "vitest";
import {
  actionAp,
  AIM_BONUS,
  CREW_AP,
  CREW_HP,
  createRng,
  deckungFixture,
  GUARD_HP,
  nextUint32,
  resolveShot,
  RIFLE_MAGAZINE,
  RIFLE_RANGE,
  SCHUSS_MISS_SEED,
  SCHUSS_VIEW_SEED,
  schussView,
} from "./index.ts";
import type { BattleMap, Cell, Combatant } from "./index.ts";

const openMap: BattleMap = { width: 16, height: 16, walls: [], lowCover: [] };

function guard(patch: Partial<Combatant> = {}): Combatant {
  return {
    hp: GUARD_HP,
    ap: CREW_AP,
    magazine: RIFLE_MAGAZINE,
    range: RIFLE_RANGE,
    ...patch,
  };
}

function resolveOpen(seed: number, patch: Partial<Combatant> = {}, aimBonus: 0 | 15 = 0) {
  const from: Cell = { x: 1, y: 1 };
  const to: Cell = { x: 5, y: 1 };
  return resolveShot(openMap, from, to, aimBonus, guard(patch), CREW_HP, createRng(seed, "combat"));
}

describe("Schussauflösung", () => {
  it("trifft mit einem Seed und verfehlt mit einem anderen", () => {
    const hit = schussView(SCHUSS_VIEW_SEED);
    const miss = schussView(SCHUSS_MISS_SEED);

    expect(hit.resolution.status).toBe("hit");
    expect(miss.resolution.status).toBe("miss");
    expect(hit.resolution.preview.chance).toBe(40);
    expect(miss.resolution.preview.chance).toBe(40);
    expect(hit.resolution.roll).toBe(33);
    expect(miss.resolution.roll).toBe(78);
    expect(hit.resolution.roll).toBeLessThan(hit.resolution.preview.chance ?? 0);
    expect(miss.resolution.roll).toBeGreaterThanOrEqual(miss.resolution.preview.chance ?? 0);
    for (const roll of [hit.resolution.roll, miss.resolution.roll]) {
      expect(Number.isInteger(roll)).toBe(true);
    }
  });

  it("zieht bei einem blockierten Schuss keine Zufallszahl", () => {
    const rng = createRng(SCHUSS_VIEW_SEED, "combat");
    const shooter = guard();
    const blocked = resolveShot(
      deckungFixture.map,
      deckungFixture.nix,
      deckungFixture.blockedTarget,
      0,
      shooter,
      CREW_HP,
      rng,
    );
    const fresh = resolveOpen(SCHUSS_VIEW_SEED);
    const afterBlocked = resolveShot(
      openMap,
      { x: 1, y: 1 },
      { x: 5, y: 1 },
      0,
      shooter,
      CREW_HP,
      blocked.rng,
    );

    expect(blocked.status).toBe("blocked");
    expect(blocked.preview.blocked).toBe(true);
    expect(blocked.preview.chance).toBeNull();
    expect(blocked.roll).toBeNull();
    expect(blocked.damage).toBe(0);
    expect(blocked.apSpent).toBe(0);
    expect(blocked.ammoSpent).toBe(0);
    expect(blocked.shooterAp).toBe(shooter.ap);
    expect(blocked.shooterMagazine).toBe(shooter.magazine);
    expect(blocked.rng).toBe(rng);
    expect(afterBlocked.roll).toBe(fresh.roll);
    expect(afterBlocked.rng.state).toBe(fresh.rng.state);
  });

  it("verbraucht Patrone und 3 AP auch beim Fehlschuss und zieht bei einem Treffer 2 HP ab", () => {
    const miss = schussView(SCHUSS_MISS_SEED).resolution;
    const hit = schussView(SCHUSS_VIEW_SEED).resolution;

    expect(miss.status).toBe("miss");
    expect(miss.damage).toBe(0);
    expect(miss.targetHp).toBe(CREW_HP);
    expect(miss.apSpent).toBe(actionAp("shot"));
    expect(miss.apSpent).toBe(3);
    expect(miss.ammoSpent).toBe(1);
    expect(miss.shooterAp).toBe(CREW_AP - 3);
    expect(miss.shooterMagazine).toBe(RIFLE_MAGAZINE - 1);

    expect(hit.status).toBe("hit");
    expect(hit.damage).toBe(2);
    expect(Number.isInteger(hit.damage)).toBe(true);
    expect(hit.targetHp).toBe(CREW_HP - 2);
    expect(Number.isInteger(hit.targetHp)).toBe(true);
    expect(hit.apSpent).toBe(3);
    expect(hit.ammoSpent).toBe(1);
    expect(hit.shooterAp).toBe(5);
    expect(hit.shooterMagazine).toBe(5);
  });

  it("ergibt bei gleicher Seed und gleicher Vorschau denselben Ausgang", () => {
    const first = schussView(SCHUSS_VIEW_SEED);
    const second = schussView(SCHUSS_VIEW_SEED);
    expect(second.resolution.preview).toEqual(first.resolution.preview);
    expect(second.resolution.roll).toBe(first.resolution.roll);
    expect(second.resolution.status).toBe(first.resolution.status);
    expect(second.resolution.targetHp).toBe(first.resolution.targetHp);
    expect(second.resolution.rng).toEqual(first.resolution.rng);
  });

  it("lässt AP, Patrone und Zufall bei ungültigen Schüssen unberührt", () => {
    const rng = createRng(4, "combat");
    const shooter = guard();
    const from: Cell = { x: 0, y: 0 };
    const cases = [
      resolveShot(openMap, from, { x: 0, y: 11 }, 0, shooter, CREW_HP, rng),
      resolveShot(openMap, from, { x: 4, y: 0 }, 0, guard({ ap: 2 }), CREW_HP, rng),
      resolveShot(openMap, from, { x: 4, y: 0 }, 0, guard({ magazine: 0 }), CREW_HP, rng),
    ];
    expect(cases.map((item) => item.status)).toEqual(["out-of-range", "no-ap", "no-ammo"]);
    for (const item of cases) {
      expect(item.roll).toBeNull();
      expect(item.rng).toBe(rng);
      expect(item.apSpent).toBe(0);
      expect(item.ammoSpent).toBe(0);
      expect(item.damage).toBe(0);
    }
  });

  it("führt den gespeicherten Kampf-RNG in den nächsten Schuss fort", () => {
    const first = schussView(SCHUSS_MISS_SEED).resolution;
    const second = resolveShot(
      deckungFixture.map,
      deckungFixture.enemy,
      deckungFixture.runner,
      0,
      guard({ ap: first.shooterAp, magazine: first.shooterMagazine }),
      first.targetHp,
      first.rng,
    );
    expect(first.rng.state).not.toBe(createRng(SCHUSS_MISS_SEED, "combat").state);
    expect(second.rng.state).not.toBe(first.rng.state);
    expect(second.apSpent).toBe(3);
    expect(second.ammoSpent).toBe(1);
    expect(second.shooterAp).toBe(2);
    expect(second.shooterMagazine).toBe(4);
    expect(second.roll).not.toBeNull();
  });

  it("begrenzt Ziel-HP bei 0 und hebt einen Zielbonus um 15, ohne ihn zu stapeln", () => {
    const wounded = resolveOpen(SCHUSS_VIEW_SEED, {}, 0);
    const finished = resolveShot(
      openMap,
      { x: 1, y: 1 },
      { x: 5, y: 1 },
      0,
      guard(),
      1,
      createRng(SCHUSS_VIEW_SEED, "combat"),
    );
    expect(wounded.preview.chance).toBe(65);
    expect(finished.status).toBe("hit");
    expect(finished.targetHp).toBe(0);
    expect(finished.damage).toBe(2);

    const aimed = resolveOpen(SCHUSS_VIEW_SEED, {}, AIM_BONUS);
    expect(aimed.preview.aimBonus).toBe(15);
    expect(aimed.preview.chance).toBe(80);
    expect((aimed.preview.chance ?? 0) - (wounded.preview.chance ?? 0)).toBe(15);
    expect(aimed.apSpent).toBe(3);
    expect(() =>
      resolveShot(openMap, { x: 1, y: 1 }, { x: 5, y: 1 }, 30, guard(), CREW_HP, createRng(SCHUSS_VIEW_SEED, "combat")),
    ).toThrow(/Zielbonus/);
  });

  it("trennt den Kampf-Stream vom Bot-Stream", () => {
    const combat = nextUint32(createRng(7, "combat"));
    const bot = nextUint32(createRng(7, "bot"));
    expect(combat.rng.stream).toBe("combat");
    expect(bot.rng.stream).toBe("bot");
    expect(combat.value).not.toBe(bot.value);
    expect(() =>
      resolveShot(openMap, { x: 1, y: 1 }, { x: 2, y: 1 }, 0, guard(), CREW_HP, createRng(7, "bot")),
    ).toThrow(/Kampf-RNG/);
  });

  it("verändert die Eingaben nicht", () => {
    const map = deckungFixture.map;
    const from = deckungFixture.enemy;
    const to = deckungFixture.runner;
    const shooter = guard();
    const rng = createRng(SCHUSS_VIEW_SEED, "combat");
    const before = JSON.stringify({ map, from, to, shooter, rng });
    resolveShot(map, from, to, 0, shooter, CREW_HP, rng);
    expect(JSON.stringify({ map, from, to, shooter, rng })).toBe(before);
  });

  it("liefert die Zahlen der Gefechtsansicht", () => {
    const view = schussView(SCHUSS_VIEW_SEED);
    expect(view.seed).toBe(1);
    expect(view.aimBonus).toBe(0);
    expect(view.weapon).toBe("rifle");
    expect(view.shooter).toEqual({ id: "wache", x: 5, y: 3 });
    expect(view.target).toEqual({ id: "kite", x: 1, y: 3 });
    expect(view.resolution.preview.base).toBe(70);
    expect(view.resolution.preview.distance).toBe(4);
    expect(view.resolution.preview.distancePenalty).toBe(5);
    expect(view.resolution.preview.coverPenalty).toBe(25);
    expect(view.resolution.preview.protectedEdgeCrossed).toBe(true);
    expect(view.resolution.preview.blocked).toBe(false);
    expect(view.resolution.preview.chance).toBe(40);
    expect(view.resolution.status).toBe("hit");
    expect(view.targetMaxHp).toBe(6);
    expect(view.resolution.targetHp).toBe(4);
    expect(view.maxAp).toBe(8);
    expect(view.resolution.shooterAp).toBe(5);
    expect(view.magazineSize).toBe(6);
    expect(view.resolution.shooterMagazine).toBe(5);
  });
});
