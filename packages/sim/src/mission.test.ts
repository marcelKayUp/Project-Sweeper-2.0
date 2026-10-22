import { describe, expect, it } from "vitest";
import { ghostFloorSpec } from "./ghostFloor.ts";
import { ghostCellOpen } from "./ghostFloorLayout.ts";
import {
  applyCommand,
  createMissionState,
  missionChecksum,
  projectTeam,
  type CrewCommand,
  type MissionSpec,
  type MissionState,
} from "./mission.ts";

const presets = { kite: "rifle", voss: "sidearm", nera: "rifle", sol: "sidearm" } as const;
const floor = ghostFloorSpec(presets);

describe("Ghost Floor", () => {
  it("kopiert mit zwei Runnern, lässt die Gegnerphase laufen und extrahiert in Runde 2", () => {
    const start = createMissionState(floor, 1);
    const before = missionChecksum(start);
    let state = apply(start, { kind: "interact", unitId: "kite", targetId: "terminal" }).state;
    expect(state.copies).toBe(1);
    state = apply(state, { kind: "move", unitId: "voss", x: 1, y: 8 }).state;
    state = apply(state, { kind: "move", unitId: "voss", x: 2, y: 8 }).state;
    state = apply(state, { kind: "interact", unitId: "voss", targetId: "terminal" }).state;
    expect(state.copies).toBe(2);
    expect(state.result).toBeNull();
    state = readyAll(state);
    expect(state.phase).toBe("crew");
    expect(state.round).toBe(2);
    expect(state.completedRounds).toBe(1);
    expect(state.result).toBeNull();
    expect(state.combatRng).toEqual(start.combatRng);
    expect(unit(state, "wache-haupt").magazine).toBe(6);
    expect(unit(state, "kite").ap).toBe(8);

    state = apply(state, { kind: "move", unitId: "kite", x: 0, y: 9 }).state;
    state = apply(state, { kind: "extract", unitId: "kite" }).state;
    expect(state.result).toBeNull();
    state = apply(state, { kind: "move", unitId: "voss", x: 1, y: 8 }).state;
    state = apply(state, { kind: "move", unitId: "voss", x: 0, y: 8 }).state;
    state = apply(state, { kind: "extract", unitId: "voss" }).state;
    state = apply(state, { kind: "move", unitId: "nera", x: 0, y: 10 }).state;
    state = apply(state, { kind: "extract", unitId: "nera" }).state;
    state = apply(state, { kind: "move", unitId: "sol", x: 0, y: 11 }).state;
    const finished = apply(state, { kind: "extract", unitId: "sol" });
    expect(finished.rejection).toBeNull();
    expect(finished.state.result?.outcome).toBe("sieg");
    expect(finished.state.result?.round).toBe(2);
    expect(finished.state.result?.extractedIds).toEqual(["kite", "nera", "sol", "voss"]);
    expect(finished.events.filter((event) => event.type === "MissionEnded")).toHaveLength(1);
    const again = apply(finished.state, { kind: "ready", unitId: "kite" });
    expect(again.rejection).toBe("Die Mission ist beendet.");
    expect(again.state).toBe(finished.state);
    expect(missionChecksum(start)).toBe(before);
    expect(projectTeam(start, floor).units.map((item) => item.id)).toEqual(["kite", "nera", "sol", "voss"]);
  });

  it("verliert, wenn alle extrahieren, bevor die Daten kopiert sind", () => {
    let state = createMissionState(floor, 1);
    state = apply(state, { kind: "move", unitId: "kite", x: 0, y: 9 }).state;
    state = apply(state, { kind: "extract", unitId: "kite" }).state;
    state = apply(state, { kind: "extract", unitId: "voss" }).state;
    state = apply(state, { kind: "move", unitId: "nera", x: 0, y: 10 }).state;
    state = apply(state, { kind: "extract", unitId: "nera" }).state;
    state = apply(state, { kind: "move", unitId: "sol", x: 0, y: 11 }).state;
    state = apply(state, { kind: "extract", unitId: "sol" }).state;
    expect(state.result?.outcome).toBe("niederlage");
    expect(state.result?.reason).toBe("keine-handlungsfaehigen");
    expect(state.copies).toBe(0);
  });

  it("verliert nach 24 beendeten Runden und nicht früher", () => {
    let state = createMissionState(floor, 1);
    for (let round = 0; round < 23; round += 1) state = readyAll(state);
    expect(state.result).toBeNull();
    expect(state.round).toBe(24);
    state = readyAll(state);
    expect(state.result?.outcome).toBe("niederlage");
    expect(state.result?.reason).toBe("rundenlimit");
    expect(state.result?.round).toBe(24);
  });

  it("lässt eine Wache mit denselben Schussregeln feuern, sobald ein Runner in Sicht ist", () => {
    let state = createMissionState(floor, 1);
    const hidden = projectTeam(state, floor).units.some((unit) => unit.team === "enemy");
    expect(hidden).toBe(false);
    const path = [
      { x: 1, y: 8 },
      { x: 2, y: 8 },
      { x: 3, y: 8 },
      { x: 3, y: 7 },
      { x: 4, y: 7 },
      { x: 5, y: 7 },
      { x: 6, y: 7 },
      { x: 7, y: 7 },
    ];
    for (const step of path) state = apply(state, { kind: "move", unitId: "kite", x: step.x, y: step.y }).state;
    expect(projectTeam(state, floor).units.some((unit) => unit.id === "wache-haupt")).toBe(true);
    state = readyAll(state);
    const guard = unit(state, "wache-haupt");
    expect(guard.magazine).toBe(4);
    expect(guard.ap).toBe(2);
    expect(guard.overwatch).not.toBeNull();
    expect(state.combatRng).not.toEqual(createMissionState(floor, 1).combatRng);
    expect(unit(state, "kite").hp).toBeLessThanOrEqual(6);
    expect(["kite", "nera", "sol", "voss"].every((id) => unit(state, id).status === "active")).toBe(true);
  });

  it("öffnet die Abkürzung für 4 AP und weist einen Schritt ohne AP zurück", () => {
    const spec = doorSpec();
    let state = createMissionState(spec, 3);
    const blocked = apply(state, { kind: "move", unitId: "kite", x: 2, y: 1 });
    expect(blocked.rejection).toBe("Feld ist blockiert.");
    expect(blocked.state).toBe(state);
    const opened = apply(state, { kind: "interact", unitId: "kite", targetId: "shortcut" });
    expect(opened.rejection).toBeNull();
    expect(opened.state.doorOpen).toBe(true);
    expect(unit(opened.state, "kite").ap).toBe(4);
    const entered = apply(opened.state, { kind: "move", unitId: "kite", x: 2, y: 1 });
    expect(entered.rejection).toBeNull();
    expect(unit(entered.state, "kite")).toMatchObject({ x: 2, y: 1, ap: 3 });

    let poor = createMissionState(spec, 3);
    for (const step of [
      { x: 1, y: 2 },
      { x: 1, y: 1 },
      { x: 1, y: 2 },
      { x: 1, y: 1 },
      { x: 1, y: 2 },
      { x: 1, y: 1 },
    ]) {
      poor = apply(poor, { kind: "move", unitId: "kite", x: step.x, y: step.y }).state;
    }
    const broke = apply(poor, { kind: "interact", unitId: "kite", targetId: "shortcut" });
    expect(broke.rejection).toBe("Zu wenig Aktionspunkte.");
    expect(broke.state).toBe(poor);
    expect(unit(poor, "kite").ap).toBe(2);
  });

  it("lässt einen ausgefallenen Runner den Sieg nicht blockieren", () => {
    const spec = rescueSpec();
    let state = createMissionState(spec, 1);
    state = apply(state, { kind: "interact", unitId: "kite", targetId: "terminal" }).state;
    state = apply(state, { kind: "interact", unitId: "kite", targetId: "terminal" }).state;
    expect(state.copies).toBe(2);
    state = readyAll(state);
    state = apply(state, { kind: "extract", unitId: "kite" }).state;
    expect(state.result).toBeNull();
    for (let round = 0; round < 12 && !state.result; round += 1) {
      state = apply(state, { kind: "ready", unitId: "voss" }).state;
    }
    expect(state.result?.outcome).toBe("sieg");
    expect(unit(state, "voss").status).toBe("down");
    expect(unit(state, "kite").status).toBe("extracted");
  });

  it("steht mit den Runnern auf freien Feldern", () => {
    for (const spawn of floor.spawns) expect(ghostCellOpen(spawn.x, spawn.y)).toBe(true);
    expect(ghostCellOpen(floor.terminal.x, floor.terminal.y)).toBe(true);
    expect(floor.walls.some((wall) => wall.x === floor.door.x && wall.y === floor.door.y)).toBe(false);
    expect(floor.width).toBe(20);
    expect(floor.height).toBe(20);
  });
});

function apply(state: MissionState, command: CrewCommand) {
  return applyCommand(state, command.kind === "interact" && command.targetId === "shortcut" ? doorOrFloor(state) : floorOf(state), command);
}

function floorOf(state: MissionState): MissionSpec {
  return state.missionId === "ghost-floor" ? floor : state.missionId === "door" ? doorSpec() : rescueSpec();
}

function doorOrFloor(state: MissionState): MissionSpec {
  return floorOf(state);
}

function readyAll(state: MissionState): MissionState {
  let next = state;
  for (const unitId of ["kite", "voss", "nera", "sol"]) {
    if (!next.units.some((unit) => unit.id === unitId && unit.status === "active")) continue;
    const step = apply(next, { kind: "ready", unitId });
    expect(step.rejection).toBeNull();
    next = step.state;
  }
  return next;
}

function unit(state: MissionState, id: string) {
  const found = state.units.find((item) => item.id === id);
  if (!found) throw new Error(`fehlt ${id}`);
  return found;
}

function doorSpec(): MissionSpec {
  return {
    id: "door",
    hash: "door",
    width: 5,
    height: 5,
    walls: [],
    lowCover: [],
    terminal: { id: "terminal", x: 4, y: 4 },
    door: { id: "shortcut", x: 2, y: 1 },
    extraction: [{ x: 0, y: 0 }],
    spawns: [{ id: "kite", name: "Kite", team: "crew", weapon: "rifle", x: 1, y: 1, patrol: [] }],
  };
}

function rescueSpec(): MissionSpec {
  return {
    id: "rescue",
    hash: "rescue",
    width: 6,
    height: 3,
    walls: [],
    lowCover: [],
    terminal: { id: "terminal", x: 1, y: 0 },
    door: { id: "shortcut", x: 0, y: 2 },
    extraction: [{ x: 0, y: 0 }],
    spawns: [
      { id: "kite", name: "Kite", team: "crew", weapon: "rifle", x: 0, y: 0, patrol: [] },
      { id: "voss", name: "Voss", team: "crew", weapon: "rifle", x: 4, y: 0, patrol: [] },
      {
        id: "wache-haupt",
        name: "Wache",
        team: "enemy",
        weapon: "rifle",
        x: 4,
        y: 2,
        patrol: [
          { x: 4, y: 2 },
          { x: 5, y: 2 },
        ],
      },
      {
        id: "wache-wartung",
        name: "Wache",
        team: "enemy",
        weapon: "rifle",
        x: 5,
        y: 2,
        patrol: [
          { x: 5, y: 2 },
          { x: 4, y: 2 },
        ],
      },
    ],
  };
}
