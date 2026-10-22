import { describe, expect, it } from "vitest";
import { ghostFloorSpec } from "./ghostFloor.ts";
import { ghostCellOpen } from "./ghostFloorLayout.ts";
import {
  applyCommand,
  battleMapOf,
  closeTeamPhase,
  createMissionState,
  missionChecksum,
  projectEvents,
  projectTeam,
  SIGHT_RANGE,
  type CrewCommand,
  type MissionSpec,
  type MissionState,
} from "./mission.ts";
import { seesUnit } from "./sight.ts";

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
    const hidden = projectEvents(
      [
        { type: "UnitMoved", unitId: "kite", x: 1, y: 8 },
        { type: "UnitMoved", unitId: "wache-haupt", x: 8, y: 8 },
        { type: "ShotResolved", shooterId: "wache-haupt", targetId: "kite", status: "hit", damage: 2, reaction: true },
        { type: "PhaseChanged", phase: "crew", round: 2 },
      ],
      projectTeam(start, floor),
    );
    expect(hidden).toEqual([
      { type: "UnitMoved", unitId: "kite", x: 1, y: 8 },
      { type: "PhaseChanged", phase: "crew", round: 2 },
    ]);
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

  it("schließt die Crewphase als protokollierte Eingabe, ohne die vorherige Lage zu verändern", () => {
    const start = createMissionState(floor, 1);
    const before = missionChecksum(start);
    const spent = apply(start, { kind: "move", unitId: "kite", x: 1, y: 8 }).state;
    const spentHash = missionChecksum(spent);
    const closed = closeTeamPhase(spent, floor);
    expect(closed.rejection).toBeNull();
    expect(closed.state.round).toBe(2);
    expect(closed.state.phase).toBe("crew");
    expect(closed.events[0]).toMatchObject({ type: "PhaseChanged", phase: "enemy", round: 1 });
    expect(unit(closed.state, "kite")).toMatchObject({ x: 1, y: 8, ap: 8, ready: false });
    expect(missionChecksum(spent)).toBe(spentHash);
    expect(missionChecksum(start)).toBe(before);
    expect(missionChecksum(closeTeamPhase(spent, floor).state)).toBe(missionChecksum(closed.state));

    let state = closed.state;
    for (let index = 0; index < 23; index += 1) {
      const step = closeTeamPhase(state, floor);
      expect(step.rejection).toBeNull();
      state = step.state;
    }
    expect(state.result?.outcome).toBe("niederlage");
    expect(state.result?.reason).toBe("rundenlimit");
    const afterEnd = closeTeamPhase(state, floor);
    expect(afterEnd.rejection).toBe("Die Mission ist beendet.");
    expect(afterEnd.state).toBe(state);
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
    const enemies = floor.spawns.filter((spawn) => spawn.team === "enemy");
    expect(enemies.filter((spawn) => spawn.id.startsWith("wache"))).toHaveLength(4);
    expect(enemies.filter((spawn) => spawn.id.startsWith("flanker"))).toHaveLength(2);
    const map = battleMapOf(floor, false);
    const crew = floor.spawns.filter((spawn) => spawn.team === "crew");
    const patrols = new Set<string>();
    for (const enemy of enemies) {
      expect(enemy.patrol[0]).toEqual({ x: enemy.x, y: enemy.y });
      const own = new Set<string>();
      for (let index = 0; index < enemy.patrol.length; index += 1) {
        const cell = enemy.patrol[index];
        const next = enemy.patrol[(index + 1) % enemy.patrol.length];
        if (!cell || !next) throw new Error(enemy.id);
        expect(ghostCellOpen(cell.x, cell.y)).toBe(true);
        expect(Math.abs(cell.x - next.x) + Math.abs(cell.y - next.y)).toBe(1);
        const key = `${cell.x},${cell.y}`;
        if (own.has(key)) continue;
        expect(patrols.has(key)).toBe(false);
        patrols.add(key);
        own.add(key);
      }
      for (const runner of crew) {
        expect(`${enemy.id}->${runner.id}:${seesUnit(map, enemy, runner, SIGHT_RANGE)}`).toBe(
          `${enemy.id}->${runner.id}:false`,
        );
      }
      const deep = seesUnit(map, enemy, { x: 7, y: 7 }, SIGHT_RANGE);
      expect(`${enemy.id}@7,7:${deep}`).toBe(`${enemy.id}@7,7:${enemy.id === "wache-haupt"}`);
    }
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

describe("Gegnerrollen und M2-Fälle", () => {
  it("schießt nicht um eine Ecke und lässt AP und Zufall stehen", () => {
    const spec = cornerSpec();
    const start = createMissionState(spec, 1);
    const before = missionChecksum(start);
    const denied = applyCommand(start, spec, { kind: "shoot", unitId: "kite", targetId: "nahe" });
    expect(denied.rejection).toBe("Kein Sichtkontakt.");
    expect(denied.state).toBe(start);
    expect(missionChecksum(start)).toBe(before);
    expect(start.combatRng).toEqual(createMissionState(spec, 1).combatRng);
  });

  it("lehnt den Schuss aus einem leeren Magazin ab", () => {
    const spec = laneSpec();
    const start = createMissionState(spec, 1);
    const emptied = {
      ...start,
      units: start.units.map((unit) => (unit.id === "kite" ? { ...unit, magazine: 1 } : unit)),
    };
    const once = applyCommand(emptied, spec, { kind: "shoot", unitId: "kite", targetId: "nahe" });
    expect(once.rejection).toBeNull();
    expect(once.state.units.find((unit) => unit.id === "kite")?.magazine).toBe(0);
    const twice = applyCommand(once.state, spec, { kind: "shoot", unitId: "kite", targetId: "nahe" });
    expect(twice.rejection).toBe("Magazin ist leer.");
    expect(twice.state).toBe(once.state);
  });

  it("löst zwei Zieleingaben der Reihe nach auf und belegt ein Feld nur einmal", () => {
    const spec = laneSpec();
    const start = createMissionState(spec, 1);
    const first = applyCommand(start, spec, { kind: "move", unitId: "kite", x: 2, y: 1 });
    const second = applyCommand(first.state, spec, { kind: "move", unitId: "voss", x: 2, y: 1 });
    expect(first.rejection).toBeNull();
    expect(second.rejection).toBe("Feld ist blockiert.");
    expect(second.state).toBe(first.state);
    const aimed = applyCommand(start, spec, { kind: "aim", unitId: "kite" });
    const both = applyCommand(aimed.state, spec, { kind: "aim", unitId: "voss" });
    expect(both.rejection).toBeNull();
    expect(both.state.units.filter((unit) => unit.aiming).map((unit) => unit.id).sort()).toEqual(["kite", "voss"]);
  });

  it("stellt eine Wache auf die schützende Kante und hält dort", () => {
    const spec = coverSpec();
    const done = ready(createMissionState(spec, 2), spec);
    const guard = done.units.find((unit) => unit.id === "enemy-0");
    expect(guard).toMatchObject({ x: 2, y: 1, overwatch: expect.any(String) });
    expect(done.contacts).toEqual([{ id: "kite", x: 5, y: 1 }]);
  });

  it("geht mit einem Flanker auf die weniger gedeckte Seite", () => {
    const spec = angleSpec();
    const done = ready(createMissionState(spec, 2), spec);
    const flanker = done.units.find((unit) => unit.id === "enemy-4");
    expect(flanker).toMatchObject({ x: 4, y: 0, name: "Flanker 1" });
    expect(flanker?.overwatch).not.toBeNull();
  });

  it("verfolgt die geteilte letzte Sichtung statt der eigenen Patrouille", () => {
    const spec = pursuitSpec();
    const start = createMissionState(spec, 4);
    const map = battleMapOf(spec, false);
    expect(seesUnit(map, { x: 6, y: 1 }, { x: 1, y: 1 }, SIGHT_RANGE)).toBe(false);
    expect(seesUnit(map, { x: 2, y: 1 }, { x: 1, y: 1 }, SIGHT_RANGE)).toBe(true);
    const done = ready(start, spec);
    expect(done.units.find((unit) => unit.id === "wache-b")).toMatchObject({ x: 5, y: 1 });
    expect(done.contacts.some((contact) => contact.id === "kite")).toBe(true);
  });
});

function ready(state: MissionState, spec: MissionSpec): MissionState {
  let next = state;
  for (const unit of next.units) {
    if (unit.team !== "crew" || unit.status !== "active") continue;
    const step = applyCommand(next, spec, { kind: "ready", unitId: unit.id });
    if (step.rejection !== null) throw new Error(step.rejection);
    next = step.state;
  }
  return next;
}

function cornerSpec(): MissionSpec {
  return room("corner-shot", 3, 3, ["0,0", "1,1"], [], { id: "terminal", x: 2, y: 2 }, [
    crewAt("kite", 0, 0),
    enemyAt("nahe", "Nahe", 1, 1, [
      { x: 1, y: 1 },
      { x: 1, y: 1 },
    ]),
  ]);
}

function laneSpec(): MissionSpec {
  return room("lane-shot", 8, 3, ["1,1", "2,1", "3,1", "4,1", "5,1"], [], { id: "terminal", x: 0, y: 0 }, [
    crewAt("kite", 1, 1),
    crewAt("voss", 3, 1),
    enemyAt("nahe", "Nahe", 5, 1, [
      { x: 5, y: 1 },
      { x: 5, y: 1 },
    ]),
  ]);
}

function coverSpec(): MissionSpec {
  return room(
    "cover-guard",
    6,
    3,
    ["2,1", "3,1", "4,1", "5,1"],
    [{ id: "kante", x: 2, y: 1, protects: "e" }],
    { id: "terminal", x: 0, y: 0 },
    [
      crewAt("kite", 5, 1),
      enemyAt("enemy-0", "Wache 1", 3, 1, [
        { x: 3, y: 1 },
        { x: 4, y: 1 },
      ]),
    ],
  );
}

function angleSpec(): MissionSpec {
  return room(
    "angle-flank",
    6,
    3,
    ["2,0", "3,0", "4,0", "2,1", "3,1", "4,1"],
    [{ id: "kante", x: 4, y: 1, protects: "w" }],
    { id: "terminal", x: 0, y: 0 },
    [
      crewAt("kite", 4, 1),
      enemyAt("enemy-4", "Flanker 1", 3, 0, [
        { x: 3, y: 0 },
        { x: 2, y: 0 },
      ]),
    ],
  );
}

function pursuitSpec(): MissionSpec {
  return room("pursuit", 8, 3, ["1,1", "2,1", "1,0", "2,0", "3,0", "4,0", "5,0", "5,1", "6,1", "7,1"], [], { id: "terminal", x: 0, y: 2 }, [
    crewAt("kite", 1, 1),
    enemyAt("wache-a", "Wache A", 2, 1, [
      { x: 2, y: 1 },
      { x: 2, y: 1 },
    ]),
    enemyAt("wache-b", "Wache B", 6, 1, [
      { x: 6, y: 1 },
      { x: 7, y: 1 },
    ]),
  ]);
}

function crewAt(id: string, x: number, y: number): MissionSpec["spawns"][number] {
  return { id, name: id, team: "crew", weapon: "rifle", x, y, patrol: [] };
}

function enemyAt(
  id: string,
  name: string,
  x: number,
  y: number,
  patrol: readonly { x: number; y: number }[],
): MissionSpec["spawns"][number] {
  return { id, name, team: "enemy", weapon: "rifle", x, y, patrol };
}

function room(
  id: string,
  width: number,
  height: number,
  open: readonly string[],
  lowCover: MissionSpec["lowCover"],
  terminal: MissionSpec["terminal"],
  spawns: MissionSpec["spawns"],
): MissionSpec {
  const passable = new Set(open);
  const door = { id: "shortcut" as const, x: width - 1, y: 0 };
  const walls: { x: number; y: number }[] = [];
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (x === door.x && y === door.y) continue;
      if (passable.has(`${x},${y}`)) continue;
      walls.push({ x, y });
    }
  }
  return {
    id,
    hash: id,
    width,
    height,
    walls,
    lowCover,
    terminal,
    door,
    extraction: [{ x: spawns[0]?.x ?? 0, y: spawns[0]?.y ?? 1 }],
    spawns,
  };
}
