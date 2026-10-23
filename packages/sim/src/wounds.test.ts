import { describe, expect, it } from "vitest";
import { CREW_AP } from "./ap.ts";
import { applyCommand, createMissionState, type MissionSpec, type MissionState } from "./mission.ts";
import { CREW_HP, GUARD_HP } from "./resolve.ts";
import {
  BLEED_TICK,
  BODY_HP,
  derivedHp,
  freshParts,
  HURT_LEG_STEP_AP,
  PART_HEAL,
  rifleBlocked,
  stepAp,
  type PartState,
} from "./wounds.ts";

const corridor = build("wunden-korridor", "rifle");

describe("Körperteile und Blutung", () => {
  it("legt den Treffer auf genau ein Teil", () => {
    const aimed = apply(createMissionState(corridor, 5), { kind: "aim", unitId: "kite" });
    const hit = apply(aimed.state, { kind: "shoot", unitId: "kite", targetId: "nahe" });
    expect(hit.rejection).toBeNull();
    const shot = hit.events.find((event) => event.type === "ShotResolved");
    if (!shot || shot.type !== "ShotResolved") throw new Error("Schuss fehlt");
    expect(shot.status).toBe("hit");
    expect(shot.part).not.toBeNull();
    expect(shot.wound).not.toBeNull();
    const target = unit(hit.state, "nahe");
    const struck = target.parts.find((part) => part.id === shot.part);
    expect(struck?.wound).toBe(shot.wound);
    expect(struck?.hp).toBe((struck?.maxHp ?? 0) - shot.damage);
    expect(target.parts.filter((part) => part.id !== shot.part).every((part) => part.hp === part.maxHp && part.wound === null)).toBe(true);
    expect(target.hp).toBe(derivedHp(target.parts));
    expect(target.hp).toBeLessThan(GUARD_HP);
  });

  it("tickt eine Blutung einmal pro Runde und stoppt sie nach dem Medkit auf diesem Teil", () => {
    const opened = bleedingRound();
    const kite = unit(opened.state, "kite");
    const bleeding = kite.parts.find((part) => part.id === opened.part);
    expect(bleeding?.wound).toBe("bleed");
    expect(kite.hp).toBe(CREW_HP - opened.damage);

    const ticked = ready(silence(opened.state));
    const afterTick = unit(ticked, "kite");
    expect(afterTick.hp).toBe(kite.hp - BLEED_TICK);
    expect(afterTick.parts.find((part) => part.id === opened.part)?.wound).toBe("bleed");

    const healed = apply(opened.state, { kind: "heal", unitId: "kite", targetId: "kite", part: opened.part });
    expect(healed.rejection).toBeNull();
    const dressed = unit(healed.state, "kite");
    const part = dressed.parts.find((item) => item.id === opened.part);
    expect(part?.wound).not.toBe("bleed");
    expect(part?.hp).toBe(Math.min(bleeding?.maxHp ?? 0, (bleeding?.hp ?? 0) + PART_HEAL));
    expect(dressed.medkits).toBe(0);
    const quiet = ready(silence(healed.state));
    expect(unit(quiet, "kite").hp).toBe(dressed.hp);
    expect(unit(quiet, "kite").parts.find((item) => item.id === opened.part)?.wound).not.toBe("bleed");
  });

  it("erhöht die Bewegungskosten, wenn ein Bein gebrochen ist", () => {
    const broken = freshParts().map((part) =>
      part.id === "leg-l" ? { ...part, hp: 0, wound: "fracture" as const } : part,
    );
    expect(stepAp(broken)).toBe(HURT_LEG_STEP_AP);
    expect(derivedHp(freshParts())).toBe(BODY_HP);
    const hurt = withParts(createMissionState(corridor, 2), "kite", broken);
    const moved = apply(hurt, { kind: "move", unitId: "kite", x: 2, y: 1 });
    expect(moved.rejection).toBeNull();
    expect(unit(moved.state, "kite").ap).toBe(CREW_AP - HURT_LEG_STEP_AP);
    const healthy = apply(createMissionState(corridor, 2), { kind: "move", unitId: "kite", x: 2, y: 1 });
    expect(unit(healthy.state, "kite").ap).toBe(CREW_AP - 1);
  });

  it("blockiert das Gewehr, wenn beide Arme auf 0 sind, und verbraucht dabei nichts", () => {
    const arms = freshParts().map((part) =>
      part.id === "arm-l" || part.id === "arm-r" ? { ...part, hp: 0, wound: "fracture" as const } : part,
    );
    expect(rifleBlocked(arms)).toBe(true);
    const state = withParts(createMissionState(corridor, 4), "kite", arms);
    const shot = apply(state, { kind: "shoot", unitId: "kite", targetId: "nahe" });
    expect(shot.rejection).toBe("Beide Arme sind ausgefallen.");
    expect(shot.state).toBe(state);
    expect(unit(shot.state, "kite")).toMatchObject({ ap: CREW_AP, magazine: unit(state, "kite").magazine });

    const one = freshParts().map((part) => (part.id === "arm-l" ? { ...part, hp: 0, wound: "fracture" as const } : part));
    expect(rifleBlocked(one)).toBe(false);
    const single = apply(withParts(createMissionState(corridor, 4), "kite", one), {
      kind: "shoot",
      unitId: "kite",
      targetId: "nahe",
    });
    expect(single.rejection).toBeNull();

    const pistol = withParts(createMissionState(build("wunden-pistole", "sidearm"), 4), "kite", arms);
    const side = applyOn(build("wunden-pistole", "sidearm"), pistol, { kind: "shoot", unitId: "kite", targetId: "nahe" });
    expect(side.rejection).toBeNull();
  });

  it("lehnt ein Medkit auf ein gesundes Teil ab und verbraucht es nicht", () => {
    const state = createMissionState(corridor, 1);
    const before = unit(state, "kite");
    const denied = apply(state, { kind: "heal", unitId: "kite", targetId: "kite", part: "torso" });
    expect(denied.rejection).toBe("Dieses Teil braucht kein Medkit.");
    expect(denied.state).toBe(state);
    expect(unit(denied.state, "kite")).toMatchObject({ hp: before.hp, ap: before.ap, medkits: before.medkits });
    expect(unit(denied.state, "kite").parts).toEqual(before.parts);
  });
});

function bleedingRound(): { readonly state: MissionState; readonly part: PartState["id"]; readonly damage: number } {
  for (let seed = 1; seed <= 80; seed += 1) {
    const step = apply(createMissionState(corridor, seed), { kind: "ready", unitId: "kite" });
    if (step.rejection !== null) continue;
    const shot = step.events.find((event) => event.type === "ShotResolved" && event.targetId === "kite");
    if (!shot || shot.type !== "ShotResolved" || shot.status !== "hit" || shot.wound !== "bleed" || shot.part === null) continue;
    return { state: step.state, part: shot.part, damage: shot.damage };
  }
  throw new Error("Kein Blutungs-Seed im Suchraum");
}

function ready(state: MissionState): MissionState {
  const step = apply(state, { kind: "ready", unitId: "kite" });
  expect(step.rejection).toBeNull();
  return step.state;
}

function silence(state: MissionState): MissionState {
  return {
    ...state,
    units: state.units.map((unit) =>
      unit.team === "enemy"
        ? { ...unit, status: "down", hp: 0, ap: 0, parts: unit.parts.map((part) => ({ ...part, hp: 0 })) }
        : unit,
    ),
  };
}

function withParts(state: MissionState, id: string, parts: readonly PartState[]): MissionState {
  return {
    ...state,
    units: state.units.map((unit) => (unit.id === id ? { ...unit, parts, hp: derivedHp(parts) } : unit)),
  };
}

function apply(state: MissionState, command: Parameters<typeof applyCommand>[2]) {
  return applyOn(corridor, state, command);
}

function applyOn(spec: MissionSpec, state: MissionState, command: Parameters<typeof applyCommand>[2]) {
  return applyCommand(state, spec, command);
}

function unit(state: MissionState, id: string) {
  const found = state.units.find((item) => item.id === id);
  if (!found) throw new Error(id);
  return found;
}

function build(id: string, weapon: "rifle" | "sidearm"): MissionSpec {
  const walls: { x: number; y: number }[] = [];
  for (let y = 0; y < 3; y += 1) {
    for (let x = 0; x < 8; x += 1) {
      if (x === 0 && y === 1) continue;
      if (y === 1 && x >= 1 && x <= 6) continue;
      walls.push({ x, y });
    }
  }
  return {
    id,
    hash: id,
    width: 8,
    height: 3,
    walls,
    lowCover: [],
    terminal: { id: "terminal", x: 0, y: 0 },
    door: { id: "shortcut", x: 0, y: 1 },
    extraction: [{ x: 1, y: 1 }],
    spawns: [
      { id: "kite", name: "Kite", team: "crew", weapon, x: 1, y: 1, patrol: [] },
      {
        id: "nahe",
        name: "Nahe",
        team: "enemy",
        weapon: "rifle",
        x: 5,
        y: 1,
        patrol: [
          { x: 5, y: 1 },
          { x: 5, y: 1 },
        ],
      },
    ],
  };
}
