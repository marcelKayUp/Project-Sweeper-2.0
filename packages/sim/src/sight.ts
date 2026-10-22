import { manhattan, traceShot } from "./geometry.ts";
import type { BattleMap, Cell } from "./types.ts";

export function seesUnit(map: BattleMap, from: Cell, to: Cell, range: number): boolean {
  if (!inside(map, from) || !inside(map, to)) return false;
  if (!Number.isInteger(range) || range < 0) return false;
  if (from.x === to.x && from.y === to.y) return false;
  if (manhattan(from, to) > range) return false;
  return !traceShot(map, from, to).blocked;
}

export function visibleCells(map: BattleMap, from: Cell, range: number): Cell[] {
  return teamVisibleCells(map, [from], range);
}

export function teamVisibleCells(map: BattleMap, origins: readonly Cell[], range: number): Cell[] {
  const found: Cell[] = [];
  if (!Number.isInteger(range) || range < 0 || !Number.isInteger(map.width) || !Number.isInteger(map.height)) return found;
  const watchers = origins.filter((origin) => inside(map, origin));
  if (watchers.length === 0) return found;
  for (let y = 0; y < map.height; y += 1) {
    for (let x = 0; x < map.width; x += 1) {
      const to = { x, y };
      if (watchers.some((from) => seesCell(map, from, to, range))) found.push(to);
    }
  }
  return found;
}

export function unionCells(base: readonly Cell[], extra: readonly Cell[]): readonly Cell[] {
  const seen = new Set<string>();
  const cells: Cell[] = [];
  for (const cell of base) remember(seen, cells, cell);
  let grew = false;
  for (const cell of extra) {
    if (remember(seen, cells, cell)) grew = true;
  }
  if (!grew && cells.length === base.length) return base;
  cells.sort((left, right) => left.y - right.y || left.x - right.x);
  return cells;
}

function seesCell(map: BattleMap, from: Cell, to: Cell, range: number): boolean {
  if (!inside(map, from) || !inside(map, to)) return false;
  const distance = manhattan(from, to);
  if (distance > range) return false;
  if (distance === 0) return true;
  const trace = traceShot(map, from, to);
  if (!trace.blocked) return true;
  return trace.blocker !== null && trace.blocker.x === to.x && trace.blocker.y === to.y;
}

function remember(seen: Set<string>, cells: Cell[], cell: Cell): boolean {
  const key = `${cell.x},${cell.y}`;
  if (seen.has(key)) return false;
  seen.add(key);
  cells.push({ x: cell.x, y: cell.y });
  return true;
}

function inside(map: BattleMap, cell: Cell): boolean {
  return Number.isInteger(cell.x) && Number.isInteger(cell.y) && cell.x >= 0 && cell.y >= 0 && cell.x < map.width && cell.y < map.height;
}
