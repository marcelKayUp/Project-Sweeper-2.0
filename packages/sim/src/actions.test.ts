import { describe, expect, it } from "vitest";
import { actionAp } from "./ap.ts";
import { inSector } from "./geometry.ts";
import {
  applyCommand,
  createMissionState,
  HEAL_HP,
  missionChecksum,
  type CrewCommand,
  type MissionSpec,
  type MissionState,
} from "./mission.ts";

describe("Zielen, Medkit und Overwatch", () => {
  it("gibt den Zielbonus nur dem nächsten Schuss und hebt ihn bei Bewegung auf", () => {
    const spec = lane();
    const aimed = apply(createMissionState(spec, 5), { kind: "aim", unitId: "kite" });
    expect(aimed.rejection).toBeNull();
    expect(unit(aimed.state, "kite")).toMatchObject({ ap: 7, aiming: true });
    const again = apply(aimed.state, { kind: "aim", unitId: "kite" });
    expect(again.rejection).toBe("Bereits gezielt.");
    expect(again.state).toBe(aimed.state);

    const hit = apply(aimed.state, { kind: "shoot", unitId: "kite", targetId: "nahe" });
    expect(hit.rejection).toBeNull();
    expect(hit.events).toContainEqual(expect.objectContaining({ type: "ShotResolved", status: "hit", reaction: false }));
    expect(unit(hit.state, "kite").aiming).toBe(false);
    expect(unit(hit.state, "nahe").hp).toBeLessThan(unit(hit.state, "nahe").maxHp);

    const plain = apply(createMissionState(spec, 5), { kind: "shoot", unitId: "kite", targetId: "nahe" });
    expect(plain.events).toContainEqual(expect.objectContaining({ type: "ShotResolved", status: "miss" }));
    expect(unit(plain.state, "nahe").hp).toBe(unit(plain.state, "nahe").maxHp);

    const moved = apply(aimed.state, { kind: "move", unitId: "kite", x: 2, y: 1 });
    expect(unit(moved.state, "kite").aiming).toBe(false);
  });

  it("heilt sich oder den Nachbarn einmal und bucht ungültige Heilung nicht", () => {
    const spec = lane();
    const missed = apply(createMissionState(spec, 5), { kind: "shoot", unitId: "kite", targetId: "nahe" });
    expect(unit(missed.state, "nahe").hp).toBe(unit(missed.state, "nahe").maxHp);
    const full = apply(missed.state, { kind: "heal", unitId: "kite", targetId: "kite", part: "head" });
    expect(full.rejection).toBe("Dieses Teil braucht kein Medkit.");
    expect(full.state).toBe(missed.state);

    const wounded = readyAll(missed.state);
    expect(unit(wounded, "kite").hp).toBeLessThan(unit(wounded, "kite").maxHp);
    const hurt = unit(wounded, "kite").parts.find((part) => part.hp < part.maxHp || part.wound === "bleed");
    if (!hurt) throw new Error("Kite ist unverletzt");
    const self = apply(wounded, { kind: "heal", unitId: "kite", targetId: "kite", part: hurt.id });
    expect(self.rejection).toBeNull();
    expect(unit(self.state, "kite")).toMatchObject({ hp: unit(wounded, "kite").hp + HEAL_HP, ap: 5, medkits: 0 });
    const spent = apply(self.state, { kind: "heal", unitId: "kite", targetId: "kite", part: hurt.id });
    expect(spent.rejection).toBe("Kein Medkit.");
    expect(spent.state).toBe(self.state);

    const ally = apply(wounded, { kind: "heal", unitId: "voss", targetId: "kite", part: hurt.id });
    expect(ally.rejection).toBeNull();
    expect(unit(ally.state, "kite").hp).toBe(unit(wounded, "kite").hp + HEAL_HP);
    expect(unit(ally.state, "voss")).toMatchObject({ ap: 5, medkits: 0, hp: unit(wounded, "voss").hp });
    const far = apply(wounded, { kind: "heal", unitId: "voss", targetId: "nahe", part: "head" });
    expect(far.rejection).toBe("Kein gültiges Ziel.");
    expect(far.state).toBe(wounded);
    const diagonal = apply(createMissionState(corner(), 1), { kind: "heal", unitId: "voss", targetId: "kite", part: "head" });
    expect(diagonal.rejection).toBe("Nicht in Reichweite.");
  });

  it("reserviert eine Patrone und löst genau einen Schuss aus, wenn der Gegner das Feld betritt", () => {
    const spec = pocket();
    let state = createMissionState(spec, 3);
    const before = missionChecksum(state);
    const held = apply(state, { kind: "overwatch", unitId: "kite", direction: "e" });
    expect(held.rejection).toBeNull();
    expect(unit(held.state, "kite")).toMatchObject({ ap: 5, magazine: 5, overwatch: "e", aiming: false });
    const doubled = apply(held.state, { kind: "overwatch", unitId: "kite", direction: "s" });
    expect(doubled.rejection).toBe("Haltung besteht bereits.");
    expect(doubled.state).toBe(held.state);
    expect(missionChecksum(state)).toBe(before);

    state = readyAll(held.state);
    expect(unit(state, "nahe")).toMatchObject({ x: 4, y: 1, hp: unit(state, "nahe").maxHp, status: "active" });
    expect(unit(state, "kite").hp).toBe(unit(state, "kite").maxHp - 1);
    expect(unit(state, "kite").parts.filter((part) => part.hp < part.maxHp)).toHaveLength(1);
    expect(unit(state, "kite")).toMatchObject({ overwatch: null, magazine: 6, ap: 8 });
  });

  it("bricht den restlichen Weg ab, wenn Overwatch den Läufer ausschaltet", () => {
    const spec = alley();
    let state = createMissionState(spec, 3);
    state = readyAll(state);
    expect(unit(state, "kite").hp).toBe(unit(state, "kite").maxHp - 1);
    expect(unit(state, "kite").parts.find((part) => part.id === "leg-l")).toMatchObject({ hp: 1, wound: "bleed" });
    expect(unit(state, "wache").overwatch).not.toBeNull();
    state = readyAll(state);
    expect(unit(state, "kite").hp).toBe(10);
    state = leaveOnly(state, "kite", "head", 2);
    const first = apply(state, { kind: "move", unitId: "kite", x: 2, y: 1 });
    expect(first.rejection).toBeNull();
    expect(first.events).toContainEqual(expect.objectContaining({ type: "ShotResolved", reaction: true, shooterId: "wache", status: "hit", part: "head", damage: 2 }));
    expect(unit(first.state, "kite")).toMatchObject({ x: 2, y: 1, status: "down", hp: 0 });
    expect(unit(first.state, "wache").overwatch).toBeNull();
    const second = apply(first.state, { kind: "move", unitId: "kite", x: 3, y: 1 });
    expect(second.rejection).toBe("Dieser Runner ist nicht handlungsfähig.");
    expect(second.state).toBe(first.state);
  });

  it("lässt den zweiten Beobachter stehen, wenn der erste das Ziel ausschaltet", () => {
    let state = createMissionState(pair(), 3);
    state = readyAll(state);
    expect(unit(state, "kite").hp).toBe(11);
    expect(unit(state, "a").overwatch).toBe("w");
    expect(unit(state, "b").overwatch).toBe("w");
    state = leaveOnly(state, "kite", "head", 2);
    const stepped = apply(state, { kind: "move", unitId: "kite", x: 2, y: 1 });
    expect(stepped.rejection).toBeNull();
    expect(unit(stepped.state, "kite")).toMatchObject({ status: "down", hp: 0, x: 2, y: 1 });
    expect(stepped.events.filter((event) => event.type === "ShotResolved" && event.reaction)).toHaveLength(1);
    const quiet = unit(stepped.state, "a").overwatch ? "a" : "b";
    expect(unit(stepped.state, quiet).overwatch).toBe("w");
  });

  it("zählt Diagonalen zum 90-Grad-Sektor und nicht die Seite dahinter", () => {
    const origin = { x: 2, y: 2 };
    expect(inSector(origin, { x: 2, y: 4 }, "s")).toBe(true);
    expect(inSector(origin, { x: 4, y: 4 }, "s")).toBe(true);
    expect(inSector(origin, { x: 5, y: 3 }, "s")).toBe(false);
    expect(inSector(origin, { x: 2, y: 1 }, "s")).toBe(false);
    expect(inSector(origin, origin, "s")).toBe(false);
  });
});

function apply(state: MissionState, command: CrewCommand) {
  return applyCommand(state, specOf(state), command);
}

const specs = new Map<string, MissionSpec>();

function specOf(state: MissionState): MissionSpec {
  const spec = specs.get(state.missionId);
  if (!spec) throw new Error("Spec fehlt");
  return spec;
}

function remember(spec: MissionSpec): MissionSpec {
  specs.set(spec.id, spec);
  return spec;
}

function unit(state: MissionState, id: string) {
  const found = state.units.find((item) => item.id === id);
  if (!found) throw new Error(id);
  return found;
}

function leaveOnly(state: MissionState, id: string, partId: string, hp: number): MissionState {
  return {
    ...state,
    units: state.units.map((item) => {
      if (item.id !== id) return item;
      const parts = item.parts.map((part) => (part.id === partId ? { ...part, hp } : { ...part, hp: 0 }));
      return { ...item, parts, hp: parts.reduce((sum, part) => sum + part.hp, 0) };
    }),
  };
}

function readyAll(state: MissionState): MissionState {
  let next = state;
  for (const id of next.units.filter((item) => item.team === "crew" && item.status === "active" && !item.ready).map((item) => item.id)) {
    const step = apply(next, { kind: "ready", unitId: id });
    expect(step.rejection).toBeNull();
    next = step.state;
  }
  return next;
}

function lane(): MissionSpec {
  return remember(build("lane", 8, 3, (x, y) => y === 1 && x >= 1 && x <= 6, [
    crew("kite", 1, 1),
    crew("voss", 1, 0),
    enemy("nahe", 5, 1, [{ x: 5, y: 1 }, { x: 5, y: 1 }]),
  ]));
}

function corner(): MissionSpec {
  return remember(build("corner", 4, 4, (x, y) => (x === 1 && y === 1) || (x === 2 && y === 2), [
    crew("kite", 1, 1),
    crew("voss", 2, 2),
    enemy("nahe", 0, 0, [{ x: 0, y: 0 }, { x: 0, y: 0 }]),
  ]));
}

function pocket(): MissionSpec {
  return remember(build("pocket", 8, 3, (x, y) => y === 1 && x >= 1 && x <= 6, [
    crew("kite", 1, 1),
    crew("mira", 1, 0),
    enemy("nahe", 4, 1, [
      { x: 4, y: 1 },
      { x: 5, y: 1 },
    ]),
  ]));
}

function alley(): MissionSpec {
  return remember(build("alley", 8, 3, (x, y) => y === 1 && x >= 1 && x <= 6, [
    crew("kite", 1, 1),
    crew("voss", 1, 0),
    enemy("wache", 5, 1, [
      { x: 5, y: 1 },
      { x: 5, y: 1 },
    ]),
  ]));
}

function pair(): MissionSpec {
  return remember(build("pair", 8, 3, (x, y) => y === 1 && x >= 1 && x <= 6, [
    crew("kite", 1, 1),
    crew("voss", 1, 0),
    enemy("a", 5, 1, [
      { x: 5, y: 1 },
      { x: 5, y: 1 },
    ]),
    enemy("b", 6, 1, [
      { x: 6, y: 1 },
      { x: 6, y: 1 },
    ]),
  ]));
}

function crew(id: string, x: number, y: number): MissionSpec["spawns"][number] {
  return { id, name: id, team: "crew", weapon: "rifle", x, y, patrol: [] };
}

function enemy(id: string, x: number, y: number, patrol: readonly { x: number; y: number }[]): MissionSpec["spawns"][number] {
  return { id, name: id, team: "enemy", weapon: "rifle", x, y, patrol };
}

function build(
  id: string,
  width: number,
  height: number,
  open: (x: number, y: number) => boolean,
  spawns: MissionSpec["spawns"],
): MissionSpec {
  const walls: { x: number; y: number }[] = [];
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (x === 0 && y === 1) continue;
      if (open(x, y)) continue;
      walls.push({ x, y });
    }
  }
  return {
    id,
    hash: id,
    width,
    height,
    walls,
    lowCover: [],
    terminal: { id: "terminal", x: 0, y: 0 },
    door: { id: "shortcut", x: 0, y: 1 },
    extraction: [{ x: 1, y: 1 }],
    spawns,
  };
}
