import { describe, expect, it } from "vitest";
import { previewShot } from "./shot.ts";
import { battleMapOf, applyCommand, createMissionState, missionChecksum, projectTeam, SIGHT_RANGE, type MissionSpec } from "./mission.ts";
import { seesUnit, visibleCells } from "./sight.ts";
import type { BattleMap, Cell } from "./types.ts";

describe("Sicht und gerichtete Deckung", () => {
  it("ist symmetrisch, endet an der Sichtweite und blockiert berührte Ecken", () => {
    const open: BattleMap = { width: 12, height: 1, walls: [], lowCover: [] };
    const from = { x: 0, y: 0 };
    const near = { x: 10, y: 0 };
    const far = { x: 11, y: 0 };
    const before = JSON.stringify({ open, from, near, far });
    expect(seesUnit(open, from, near, SIGHT_RANGE)).toBe(true);
    expect(seesUnit(open, near, from, SIGHT_RANGE)).toBe(true);
    expect(seesUnit(open, from, far, SIGHT_RANGE)).toBe(false);
    expect(seesUnit(open, far, from, SIGHT_RANGE)).toBe(false);
    expect(seesUnit(open, from, from, SIGHT_RANGE)).toBe(false);

    const corner: BattleMap = { width: 3, height: 3, walls: [{ x: 1, y: 0 }], lowCover: [] };
    expect(seesUnit(corner, { x: 0, y: 0 }, { x: 1, y: 1 }, SIGHT_RANGE)).toBe(false);
    expect(seesUnit(corner, { x: 1, y: 1 }, { x: 0, y: 0 }, SIGHT_RANGE)).toBe(false);
    const seen = visibleCells(corner, { x: 0, y: 0 }, SIGHT_RANGE);
    expect(seen).toContainEqual({ x: 0, y: 0 });
    expect(seen).toContainEqual({ x: 1, y: 0 });
    expect(seen).not.toContainEqual({ x: 1, y: 1 });
    expect(JSON.stringify({ open, from, near, far })).toBe(before);
  });

  it("merkt sich Gelände und lässt einen Gegner verschwinden, der die Sicht verlässt", () => {
    const spec = laneSpec();
    let state = createMissionState(spec, 4);
    const start = projectTeam(state, spec);
    expect(start.units.map((unit) => unit.id)).toEqual(["kite"]);
    expect(start.lowCover.map((cover) => cover.id)).toEqual(["sichtbar"]);
    expect(start.terminal).toBeNull();
    expect(start.walls).toContainEqual({ x: 1, y: 0 });
    expect(start.walls).not.toContainEqual({ x: 14, y: 0 });
    expect(start.knownCells).not.toContainEqual({ x: 8, y: 3 });
    expect(start.visibleCells.every((cell) => start.knownCells.some((known) => known.x === cell.x && known.y === cell.y))).toBe(true);

    const blocked = applyCommand(state, spec, { kind: "move", unitId: "kite", x: 1, y: 0 });
    expect(blocked.rejection).toBe("Feld ist blockiert.");
    expect(blocked.state).toBe(state);

    state = applyCommand(state, spec, { kind: "move", unitId: "kite", x: 2, y: 1 }).state;
    const seen = projectTeam(state, spec);
    expect(seen.units.map((unit) => unit.id)).toEqual(["kite", "nahe"]);
    expect(seen.knownCells).toContainEqual({ x: 12, y: 1 });
    const full = battleMapOf(spec, false);
    const viewMap: BattleMap = {
      width: seen.width,
      height: seen.height,
      walls: seen.door && !seen.doorOpen ? [...seen.walls, seen.door] : seen.walls,
      lowCover: seen.lowCover,
    };
    const kite = seen.units[0]!;
    const enemy = seen.units[1]!;
    expect(previewShot(viewMap, kite, enemy, 0)).toEqual(previewShot(full, kite, enemy, 0));

    const remembered = state.knownCells.map((cell) => ({ x: cell.x, y: cell.y }));
    state = applyCommand(state, spec, { kind: "move", unitId: "kite", x: 1, y: 1 }).state;
    const hidden = projectTeam(state, spec);
    expect(hidden.units.map((unit) => unit.id)).toEqual(["kite"]);
    expect(hidden.knownCells).toEqual(remembered);
    expect(hidden.visibleCells).not.toContainEqual({ x: 12, y: 1 });
    expect(hidden.lowCover.map((cover) => cover.id)).toEqual(["sichtbar"]);
    expect(missionChecksum(state)).not.toBe(missionChecksum(createMissionState(spec, 4)));
  });

  it("gibt Deckung nur von der geschützten Seite und nur innerhalb der bekannten Zellen", () => {
    const spec = laneSpec();
    const map = battleMapOf(spec, false);
    const target = { x: 4, y: 1 };
    const protectedSide = previewShot(map, { x: 6, y: 1 }, target, 0);
    const openSide = previewShot(map, { x: 2, y: 1 }, target, 0);
    expect(protectedSide.blocked).toBe(false);
    expect(openSide.blocked).toBe(false);
    expect(protectedSide.coverPenalty).toBe(25);
    expect(openSide.coverPenalty).toBe(0);
    expect(protectedSide.chance).toBe(45);
    expect(openSide.chance).toBe(70);
    expect(seesUnit(map, { x: 6, y: 1 }, target, SIGHT_RANGE)).toBe(seesUnit(map, target, { x: 6, y: 1 }, SIGHT_RANGE));
  });

  it("vereinigt die Teamsicht und lässt ausgefallene Runner nicht mehr aufklären", () => {
    const spec = splitSpec();
    const state = createMissionState(spec, 5);
    const before = missionChecksum(state);
    const map = battleMapOf(spec, false);
    expect(seesUnit(map, { x: 1, y: 1 }, { x: 0, y: 1 }, SIGHT_RANGE)).toBe(true);
    expect(seesUnit(map, { x: 5, y: 1 }, { x: 0, y: 1 }, SIGHT_RANGE)).toBe(false);
    expect(projectTeam(state, spec).units.map((unit) => unit.id)).toEqual(["kite", "nahe", "voss"]);

    const blinded = {
      ...state,
      units: state.units.map((unit) => (unit.id === "kite" ? { ...unit, status: "down" as const } : unit)),
    };
    const view = projectTeam(blinded, spec);
    expect(view.units.map((unit) => unit.id)).toEqual(["kite", "voss"]);
    expect(view.knownCells).toContainEqual({ x: 0, y: 1 });
    expect(view.visibleCells).not.toContainEqual({ x: 0, y: 1 });
    expect(missionChecksum(state)).toBe(before);
  });

  it("öffnet die geschlossene Tür als Sichtblocker", () => {
    const spec = doorLane();
    const closed = battleMapOf(spec, false);
    const opened = battleMapOf(spec, true);
    expect(seesUnit(closed, { x: 1, y: 1 }, { x: 3, y: 1 }, SIGHT_RANGE)).toBe(false);
    expect(seesUnit(closed, { x: 3, y: 1 }, { x: 1, y: 1 }, SIGHT_RANGE)).toBe(false);
    expect(seesUnit(opened, { x: 1, y: 1 }, { x: 3, y: 1 }, SIGHT_RANGE)).toBe(true);
    expect(seesUnit(opened, { x: 3, y: 1 }, { x: 1, y: 1 }, SIGHT_RANGE)).toBe(true);

    const start = createMissionState(spec, 2);
    expect(projectTeam(start, spec).units.map((unit) => unit.id)).toEqual(["kite"]);
    const step = applyCommand(start, spec, { kind: "interact", unitId: "kite", targetId: "shortcut" });
    expect(step.rejection).toBeNull();
    expect(step.state.doorOpen).toBe(true);
    expect(projectTeam(step.state, spec).units.map((unit) => unit.id)).toEqual(["kite", "nahe"]);
    expect(projectTeam(step.state, spec).door).toEqual({ id: "shortcut", x: 2, y: 1 });
  });
});

function laneSpec(): MissionSpec {
  const open = cells(16, 5, (x, y) => (y === 1 && x >= 1 && x <= 14) || (x === 8 && y === 3));
  return mission("lane", open, [
    { id: "sichtbar", x: 4, y: 1, protects: "e" },
    { id: "verborgen", x: 8, y: 3, protects: "n" },
  ], { id: "terminal", x: 14, y: 1 }, { id: "shortcut", x: 13, y: 1 }, [
    crew("kite", 1, 1),
    enemy("nahe", 12, 1),
  ]);
}

function splitSpec(): MissionSpec {
  const open = cells(8, 3, (x, y) => y === 1 && x !== 3);
  return mission("split", open, [], { id: "terminal", x: 6, y: 1 }, { id: "shortcut", x: 7, y: 1 }, [
    crew("kite", 1, 1),
    crew("voss", 5, 1),
    enemy("nahe", 0, 1),
  ]);
}

function doorLane(): MissionSpec {
  const open = cells(5, 3, (_x, y) => y === 1);
  return mission("door-lane", open, [], { id: "terminal", x: 4, y: 1 }, { id: "shortcut", x: 2, y: 1 }, [
    crew("kite", 1, 1),
    enemy("nahe", 3, 1),
  ]);
}

function mission(
  id: string,
  open: readonly Cell[],
  lowCover: MissionSpec["lowCover"],
  terminal: MissionSpec["terminal"],
  door: MissionSpec["door"],
  spawns: MissionSpec["spawns"],
): MissionSpec {
  const openKeys = new Set(open.map((cell) => `${cell.x},${cell.y}`));
  const walls: Cell[] = [];
  for (let y = 0; y < 5; y += 1) {
    for (let x = 0; x < 16; x += 1) {
      if (!openKeys.has(`${x},${y}`)) walls.push({ x, y });
    }
  }
  const width = Math.max(...open.map((cell) => cell.x), ...walls.map((cell) => cell.x)) + 1;
  const height = Math.max(...open.map((cell) => cell.y), ...walls.map((cell) => cell.y)) + 1;
  return {
    id,
    hash: id,
    width,
    height,
    walls: walls.filter((cell) => cell.x < width && cell.y < height),
    lowCover,
    terminal,
    door,
    extraction: [{ x: spawns[0]?.x ?? 0, y: spawns[0]?.y ?? 0 }],
    spawns,
  };
}

function cells(width: number, height: number, accept: (x: number, y: number) => boolean): Cell[] {
  const open: Cell[] = [];
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) if (accept(x, y)) open.push({ x, y });
  }
  return open;
}

function crew(id: string, x: number, y: number): MissionSpec["spawns"][number] {
  return { id, name: id, team: "crew", weapon: "rifle", x, y, patrol: [] };
}

function enemy(id: string, x: number, y: number): MissionSpec["spawns"][number] {
  return { id, name: id, team: "enemy", weapon: "rifle", x, y, patrol: [{ x, y }, { x, y }] };
}
