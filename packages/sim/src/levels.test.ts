import { describe, expect, it } from "vitest";
import { FREIGHT_AP, PASSENGER_AP, STAIR_AP, floorsOf, linkAp } from "./levels.ts";
import { applyCommand, createMissionState, projectTeam, type MissionSpec } from "./mission.ts";
import { ghostFloorSpec } from "./ghostFloor.ts";

const presets = { kite: "rifle", voss: "sidearm", nera: "rifle", sol: "sidearm" } as const;

describe("taktische Ebenen", () => {
  it("liest eine fehlende Etagenliste als genau eine Ebene", () => {
    const floor = ghostFloorSpec(presets);
    expect(floor.levels).toBeUndefined();
    expect(floorsOf(floor)).toEqual([{ z: 0, walls: floor.walls, lowCover: floor.lowCover }]);
    const state = createMissionState(floor, 1);
    expect(state.units.every((unit) => unit.z === 0)).toBe(true);
    expect(projectTeam(state, floor).levelCount).toBe(1);
    expect(projectTeam(state, floor).floors.map((level) => level.z)).toEqual([0]);
  });

  it("blockiert Sicht zwischen zwei Etagen und lässt jede Etage ihre eigenen Wände", () => {
    const spec = tower();
    const state = createMissionState(spec, 3);
    const hidden = projectTeam(state, spec);
    expect(hidden.units.some((unit) => unit.id === "wache")).toBe(false);
    expect(hidden.floors.find((level) => level.z === 1)?.knownCells).toEqual([]);
    const shot = applyCommand(state, spec, { kind: "shoot", unitId: "kite", targetId: "wache" });
    expect(shot.rejection).toBe("Kein Sichtkontakt.");
    expect(shot.state).toBe(state);

    const upstairs = {
      ...state,
      units: state.units.map((item) => (item.id === "kite" ? { ...item, x: 0, y: 2, z: 1 } : item)),
    };
    const blocked = projectTeam(upstairs, spec);
    expect(blocked.units.some((unit) => unit.id === "wache")).toBe(false);
    const open = {
      ...spec,
      levels: [
        { z: 0, walls: [], lowCover: [] },
        { z: 1, walls: [], lowCover: [] },
      ],
    };
    expect(projectTeam(upstairs, open).units.some((unit) => unit.id === "wache")).toBe(true);
  });

  it("zieht für Treppe und Personenaufzug AP ab und lässt den Lastenaufzug teurer und typverschieden", () => {
    expect(Number.isInteger(STAIR_AP)).toBe(true);
    expect(Number.isInteger(PASSENGER_AP)).toBe(true);
    expect(Number.isInteger(FREIGHT_AP)).toBe(true);
    expect(FREIGHT_AP).toBeGreaterThan(PASSENGER_AP);
    expect(FREIGHT_AP).toBeGreaterThan(STAIR_AP);
    expect(linkAp("freight")).toBeGreaterThan(linkAp("passenger"));
    expect(linkAp("stair")).toBe(STAIR_AP);

    const spec = tower();
    const start = createMissionState(spec, 4);
    const stair = climb(start, spec, 1);
    expect(stair.rejection).toBeNull();
    expect(unit(stair.state, "kite")).toMatchObject({ x: 1, y: 0, z: 1, ap: 8 - 1 - STAIR_AP });
    expect(projectTeam(stair.state, spec).units.some((item) => item.id === "wache")).toBe(true);
    expect(projectTeam(stair.state, spec).floors.find((level) => level.z === 1)?.knownCells.length).toBeGreaterThan(0);

    const passenger = climb(start, spec, 2);
    expect(passenger.rejection).toBeNull();
    expect(unit(passenger.state, "kite")).toMatchObject({ x: 2, y: 0, z: 1, ap: 8 - 2 - PASSENGER_AP });

    const freight = climb(start, spec, 3);
    expect(freight.rejection).toBeNull();
    expect(unit(freight.state, "kite")).toMatchObject({ x: 3, y: 0, z: 1, ap: 8 - 3 - FREIGHT_AP });
    expect(spec.links?.find((link) => link.id === "freight")?.kind).toBe("freight");
    expect(spec.links?.find((link) => link.id === "passenger")?.kind).not.toBe("freight");
  });

  it("lehnt ein ungültiges Ziel und zu wenig AP ab", () => {
    const spec = tower();
    const start = createMissionState(spec, 5);
    const beside = applyCommand(start, spec, { kind: "move", unitId: "kite", x: 1, y: 0, z: 1 });
    expect(beside.rejection).toBe("Kein Übergang zu diesem Feld.");
    expect(beside.state).toBe(start);

    const stood = applyCommand(start, spec, { kind: "move", unitId: "kite", x: 1, y: 0 }).state;
    const wrong = applyCommand(stood, spec, { kind: "move", unitId: "kite", x: 2, y: 0, z: 1 });
    expect(wrong.rejection).toBe("Kein Übergang zu diesem Feld.");
    expect(unit(wrong.state, "kite")).toMatchObject({ x: 1, y: 0, z: 0, ap: 7 });

    const poor = { ...stood, units: stood.units.map((item) => (item.id === "kite" ? { ...item, ap: STAIR_AP - 1 } : item)) };
    const denied = applyCommand(poor, spec, { kind: "move", unitId: "kite", x: 1, y: 0, z: 1 });
    expect(denied.rejection).toBe("Zu wenig Aktionspunkte.");
    expect(denied.state).toBe(poor);

    const crowded = {
      ...stood,
      units: stood.units.map((item) => (item.id === "voss" ? { ...item, x: 1, y: 0, z: 1 } : item)),
    };
    const blocked = applyCommand(crowded, spec, { kind: "move", unitId: "kite", x: 1, y: 0, z: 1 });
    expect(blocked.rejection).toBe("Feld ist blockiert.");
    expect(unit(blocked.state, "kite").z).toBe(0);
  });
});

function climb(start: ReturnType<typeof createMissionState>, spec: MissionSpec, x: number) {
  let state = start;
  for (let step = 0; step < x; step += 1) {
    const moved = applyCommand(state, spec, { kind: "move", unitId: "kite", x: step + 1, y: 0 });
    expect(moved.rejection).toBeNull();
    state = moved.state;
  }
  return applyCommand(state, spec, { kind: "move", unitId: "kite", x, y: 0, z: 1 });
}

function unit(state: ReturnType<typeof createMissionState>, id: string) {
  const found = state.units.find((item) => item.id === id);
  if (!found) throw new Error(id);
  return found;
}

function tower(): MissionSpec {
  const upperWalls = [{ x: 2, y: 2 }];
  return {
    id: "tower",
    hash: "tower",
    width: 5,
    height: 3,
    walls: [],
    lowCover: [],
    terminal: { id: "terminal", x: 4, y: 2 },
    door: { id: "shortcut", x: 4, y: 1 },
    extraction: [{ x: 0, y: 2 }],
    spawns: [
      { id: "kite", name: "Kite", team: "crew", weapon: "rifle", x: 0, y: 0, patrol: [] },
      { id: "voss", name: "Voss", team: "crew", weapon: "sidearm", x: 0, y: 1, patrol: [] },
      { id: "wache", name: "Wache", team: "enemy", weapon: "rifle", x: 4, y: 2, z: 1, patrol: [{ x: 4, y: 2 }] },
    ],
    levels: [
      { z: 0, walls: [], lowCover: [] },
      { z: 1, walls: upperWalls, lowCover: [] },
    ],
    links: [
      { id: "stair", kind: "stair", fromZ: 0, fromX: 1, fromY: 0, toZ: 1, toX: 1, toY: 0 },
      { id: "passenger", kind: "passenger", fromZ: 0, fromX: 2, fromY: 0, toZ: 1, toX: 2, toY: 0 },
      { id: "freight", kind: "freight", fromZ: 0, fromX: 3, fromY: 0, toZ: 1, toX: 3, toY: 0 },
    ],
  };
}
