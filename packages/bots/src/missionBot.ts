import { actionAp, EXTRACT_AP, INTERACT_AP, pathTo, previewShot, rifleBlocked, SIGHT_RANGE, stepAp, treatmentTarget } from "@neon/sim";
import type { Cell, CrewCommand, PublicUnit, TeamView } from "@neon/sim";

const NEIGHBORS: readonly Cell[] = [
  { x: 0, y: -1 },
  { x: 1, y: 0 },
  { x: 0, y: 1 },
  { x: -1, y: 0 },
];

export function missionIntent(view: TeamView): CrewCommand | null {
  const runners = view.units
    .filter((unit) => unit.team === "crew" && unit.status === "active" && !unit.ready)
    .slice()
    .sort((left, right) => compare(left.id, right.id));
  for (const runner of runners) {
    const command = act(view, runner);
    if (command) return command;
  }
  const first = runners[0];
  if (!first) return null;
  return { kind: "ready", unitId: first.id };
}

function act(view: TeamView, runner: PublicUnit): CrewCommand | null {
  const part = treatmentTarget(runner.parts);
  const bleeding = runner.parts.some((item) => item.wound === "bleed");
  if (part && runner.medkits > 0 && runner.ap >= actionAp("heal") && (bleeding || runner.hp * 2 <= runner.maxHp)) {
    return { kind: "heal", unitId: runner.id, targetId: runner.id, part };
  }
  if (view.copies < 2 && view.terminal) {
    if (runner.ap >= INTERACT_AP && adjacent(runner, view.terminal)) {
      return { kind: "interact", unitId: runner.id, targetId: view.terminal.id };
    }
    const toward = stepToward(view, runner, approaches(view, view.terminal));
    if (toward) return toward;
  }
  if (view.copies >= 2) {
    if (runner.ap >= EXTRACT_AP && view.extraction.some((cell) => cell.x === runner.x && cell.y === runner.y)) {
      return { kind: "extract", unitId: runner.id };
    }
    const toward = stepToward(view, runner, view.extraction);
    if (toward) return toward;
  }
  if (runner.magazine < 1 && runner.reserveMagazines > 0 && runner.ap >= actionAp("reload")) {
    return { kind: "reload", unitId: runner.id };
  }
  return shotAt(view, runner);
}

function shotAt(view: TeamView, runner: PublicUnit): CrewCommand | null {
  if (runner.weapon === "rifle" && rifleBlocked(runner.parts)) return null;
  if (runner.ap < actionAp("shot") || runner.magazine < 1) return null;
  const map = observationMap(view);
  const targets = view.units
    .filter((unit) => unit.team === "enemy" && unit.status === "active")
    .slice()
    .sort((left, right) => manhattan(runner, left) - manhattan(runner, right) || compare(left.id, right.id));
  for (const target of targets) {
    const distance = manhattan(runner, target);
    if (distance > runner.range || distance > SIGHT_RANGE) continue;
    if (previewShot(map, runner, target, 0).blocked) continue;
    return { kind: "shoot", unitId: runner.id, targetId: target.id };
  }
  return null;
}

function stepToward(view: TeamView, runner: PublicUnit, goals: readonly Cell[]): CrewCommand | null {
  if (runner.ap < stepAp(runner.parts) || goals.length === 0) return null;
  const map = observationMap(view);
  const blockers = view.units
    .filter((unit) => unit.id !== runner.id && unit.status !== "extracted")
    .map((unit) => ({ x: unit.x, y: unit.y }));
  let best: readonly Cell[] | null = null;
  const ordered = goals
    .slice()
    .sort((left, right) => manhattan(runner, left) - manhattan(runner, right) || left.y - right.y || left.x - right.x);
  for (const goal of ordered) {
    if (goal.x === runner.x && goal.y === runner.y) continue;
    const path = pathTo(map, blockers, runner, goal, view.width * view.height);
    if (!path || path.length === 0) continue;
    if (!best || path.length < best.length) best = path;
  }
  const next = best?.[0];
  if (!next) return null;
  return { kind: "move", unitId: runner.id, x: next.x, y: next.y };
}

function approaches(view: TeamView, target: Cell): Cell[] {
  const known = new Set(view.knownCells.map(key));
  const walls = new Set(view.walls.map(key));
  const goals: Cell[] = [];
  for (const step of NEIGHBORS) {
    const cell = { x: target.x + step.x, y: target.y + step.y };
    const id = key(cell);
    if (!known.has(id) || walls.has(id)) continue;
    if (view.terminal && cell.x === view.terminal.x && cell.y === view.terminal.y) continue;
    goals.push(cell);
  }
  return goals;
}

function observationMap(view: TeamView): { width: number; height: number; walls: Cell[]; lowCover: TeamView["lowCover"] } {
  const known = new Set(view.knownCells.map(key));
  const seen = new Set<string>();
  const walls: Cell[] = [];
  const add = (cell: Cell) => {
    if (cell.x < 0 || cell.y < 0 || cell.x >= view.width || cell.y >= view.height) return;
    const id = key(cell);
    if (seen.has(id)) return;
    seen.add(id);
    walls.push({ x: cell.x, y: cell.y });
  };
  for (let y = 0; y < view.height; y += 1) {
    for (let x = 0; x < view.width; x += 1) {
      if (!known.has(key({ x, y }))) add({ x, y });
    }
  }
  for (const wall of view.walls) add(wall);
  if (view.terminal) add(view.terminal);
  if (!view.doorOpen && view.door) add(view.door);
  return {
    width: view.width,
    height: view.height,
    walls,
    lowCover: view.lowCover.map((cover) => ({ id: cover.id, x: cover.x, y: cover.y, protects: cover.protects })),
  };
}

function adjacent(from: Cell, to: Cell): boolean {
  return manhattan(from, to) === 1;
}

function manhattan(from: Cell, to: Cell): number {
  return Math.abs(from.x - to.x) + Math.abs(from.y - to.y);
}

function key(cell: Cell): string {
  return `${cell.x},${cell.y}`;
}

function compare(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}
