import { DIRECTIONS, type BattleMap, type Cell, type Direction, type Impact, type LowCover } from "./types.ts";

const FACING: Readonly<Record<Direction, Cell>> = {
  n: { x: 0, y: -1 },
  e: { x: 1, y: 0 },
  s: { x: 0, y: 1 },
  w: { x: -1, y: 0 },
};

const BASE = 70;
const MIN_CHANCE = 10;
const MAX_CHANCE = 95;
const COVER_PENALTY = 25;
const DISTANCE_STEP = 5;
const DISTANCE_FREE = 3;

export function manhattan(from: Cell, to: Cell): number {
  return Math.abs(from.x - to.x) + Math.abs(from.y - to.y);
}

export function inSector(origin: Cell, cell: Cell, facing: Direction): boolean {
  const axis = FACING[facing];
  const dx = cell.x - origin.x;
  const dy = cell.y - origin.y;
  const ahead = dx * axis.x + dy * axis.y;
  const cross = dx * axis.y - dy * axis.x;
  return ahead > 0 && Math.abs(cross) <= ahead;
}

export function sectorFacing(origin: Cell, cell: Cell): Direction | null {
  for (const facing of DIRECTIONS) {
    if (inSector(origin, cell, facing)) return facing;
  }
  return null;
}

export function chanceParts(
  distance: number,
  aimBonus: number,
  coverPenalty: number,
): { readonly raw: number; readonly chance: number; readonly clamped: boolean; readonly distancePenalty: number } {
  const distancePenalty = DISTANCE_STEP * Math.max(0, distance - DISTANCE_FREE);
  const raw = BASE + aimBonus - distancePenalty - coverPenalty;
  if (raw < MIN_CHANCE) return { raw, chance: MIN_CHANCE, clamped: true, distancePenalty };
  if (raw > MAX_CHANCE) return { raw, chance: MAX_CHANCE, clamped: true, distancePenalty };
  return { raw, chance: raw, clamped: false, distancePenalty };
}

interface Trace {
  readonly blocked: boolean;
  readonly blocker: Cell | null;
  readonly impact: Impact;
}

export function traceShot(map: BattleMap, from: Cell, to: Cell): Trace {
  if (from.x === to.x && from.y === to.y) {
    if (wallAt(map, from.x, from.y)) {
      return {
        blocked: true,
        blocker: { x: from.x, y: from.y },
        impact: { kind: "target", xMilli: from.x * 1000 + 500, yMilli: from.y * 1000 + 500 },
      };
    }
    return { blocked: false, blocker: null, impact: targetImpact(to) };
  }

  const stepsX = Math.abs(to.x - from.x);
  const stepsY = Math.abs(to.y - from.y);
  const signX = to.x > from.x ? 1 : to.x < from.x ? -1 : 0;
  const signY = to.y > from.y ? 1 : to.y < from.y ? -1 : 0;
  let x = from.x;
  let y = from.y;
  let ix = 0;
  let iy = 0;

  while (ix < stepsX || iy < stepsY) {
    const lhs = (ix + 1) * stepsY;
    const rhs = (iy + 1) * stepsX;
    if (stepsX !== 0 && stepsY !== 0 && lhs === rhs) {
      const sideX = { x: x + signX, y };
      const sideY = { x, y: y + signY };
      const next = { x: x + signX, y: y + signY };
      const cornerX = signX > 0 ? x + 1 : x;
      const cornerY = signY > 0 ? y + 1 : y;
      const grazed = pickWall(map, [sideX, sideY]);
      if (grazed) return cornerBlock(grazed, cornerX, cornerY);
      if (wallAt(map, next.x, next.y)) return cornerBlock(next, cornerX, cornerY);
      x = next.x;
      y = next.y;
      ix += 1;
      iy += 1;
      if (x === to.x && y === to.y) return { blocked: false, blocker: null, impact: targetImpact(to) };
      continue;
    }

    if (stepsX !== 0 && (stepsY === 0 || lhs < rhs)) {
      x += signX;
      ix += 1;
      if (wallAt(map, x, y)) {
        const edge: Direction = signX > 0 ? "w" : "e";
        const boundary = edge === "w" ? x : x + 1;
        return {
          blocked: true,
          blocker: { x, y },
          impact: {
            kind: "edge",
            cell: { x, y },
            edge,
            xMilli: boundary * 1000,
            yMilli: crossY(from, to, boundary),
          },
        };
      }
      if (x === to.x && y === to.y) return { blocked: false, blocker: null, impact: targetImpact(to) };
      continue;
    }

    y += signY;
    iy += 1;
    if (wallAt(map, x, y)) {
      const edge: Direction = signY > 0 ? "n" : "s";
      const boundary = edge === "n" ? y : y + 1;
      return {
        blocked: true,
        blocker: { x, y },
        impact: {
          kind: "edge",
          cell: { x, y },
          edge,
          xMilli: crossX(from, to, boundary),
          yMilli: boundary * 1000,
        },
      };
    }
    if (x === to.x && y === to.y) return { blocked: false, blocker: null, impact: targetImpact(to) };
  }

  return { blocked: false, blocker: null, impact: targetImpact(to) };
}

export function coverPenalty(map: BattleMap, from: Cell, to: Cell): 0 | 25 {
  if (from.x === to.x && from.y === to.y) return 0;
  let crossed = false;
  for (const cover of map.lowCover) {
    if (cover.x === to.x && cover.y === to.y && crossesEdge(from, to, cover)) crossed = true;
  }
  return crossed ? COVER_PENALTY : 0;
}

function targetImpact(cell: Cell): Impact {
  return { kind: "target", xMilli: cell.x * 1000 + 500, yMilli: cell.y * 1000 + 500 };
}

function cornerBlock(cell: Cell, cornerX: number, cornerY: number): Trace {
  return {
    blocked: true,
    blocker: { x: cell.x, y: cell.y },
    impact: { kind: "corner", cell: { x: cell.x, y: cell.y }, xMilli: cornerX * 1000, yMilli: cornerY * 1000 },
  };
}

function pickWall(map: BattleMap, cells: readonly Cell[]): Cell | null {
  let best: Cell | null = null;
  for (const cell of cells) {
    if (!wallAt(map, cell.x, cell.y)) continue;
    if (!best || cell.y < best.y || (cell.y === best.y && cell.x < best.x)) best = cell;
  }
  return best ? { x: best.x, y: best.y } : null;
}

function wallAt(map: BattleMap, x: number, y: number): boolean {
  for (const wall of map.walls) {
    if (wall.x === x && wall.y === y) return true;
  }
  return false;
}

function crossY(from: Cell, to: Cell, boundaryX: number): number {
  const sy = from.y * 1000 + 500;
  const ty = to.y * 1000 + 500;
  const sx = from.x * 1000 + 500;
  const tx = to.x * 1000 + 500;
  const dx = tx - sx;
  if (dx === 0) return sy;
  return sy + Math.trunc(((ty - sy) * (boundaryX * 1000 - sx)) / dx);
}

function crossX(from: Cell, to: Cell, boundaryY: number): number {
  const sx = from.x * 1000 + 500;
  const tx = to.x * 1000 + 500;
  const sy = from.y * 1000 + 500;
  const ty = to.y * 1000 + 500;
  const dy = ty - sy;
  if (dy === 0) return sx;
  return sx + Math.trunc(((tx - sx) * (boundaryY * 1000 - sy)) / dy);
}

function crossesEdge(from: Cell, to: Cell, cover: LowCover): boolean {
  const left = cover.x * 2;
  const top = cover.y * 2;
  const right = left + 2;
  const bottom = top + 2;
  const edge = edgeLine(cover.protects, left, top, right, bottom);
  return segmentsIntersect(from.x * 2 + 1, from.y * 2 + 1, to.x * 2 + 1, to.y * 2 + 1, edge[0], edge[1], edge[2], edge[3]);
}

function edgeLine(
  edge: Direction,
  left: number,
  top: number,
  right: number,
  bottom: number,
): readonly [number, number, number, number] {
  if (edge === "n") return [left, top, right, top];
  if (edge === "e") return [right, top, right, bottom];
  if (edge === "s") return [left, bottom, right, bottom];
  return [left, top, left, bottom];
}

function segmentsIntersect(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  cx: number,
  cy: number,
  dx: number,
  dy: number,
): boolean {
  const o1 = orient(ax, ay, bx, by, cx, cy);
  const o2 = orient(ax, ay, bx, by, dx, dy);
  const o3 = orient(cx, cy, dx, dy, ax, ay);
  const o4 = orient(cx, cy, dx, dy, bx, by);
  if (o1 === 0 && within(ax, ay, bx, by, cx, cy)) return true;
  if (o2 === 0 && within(ax, ay, bx, by, dx, dy)) return true;
  if (o3 === 0 && within(cx, cy, dx, dy, ax, ay)) return true;
  if (o4 === 0 && within(cx, cy, dx, dy, bx, by)) return true;
  return opposite(o1, o2) && opposite(o3, o4);
}

function orient(ax: number, ay: number, bx: number, by: number, cx: number, cy: number): number {
  return (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
}

function opposite(left: number, right: number): boolean {
  return (left > 0 && right < 0) || (left < 0 && right > 0);
}

function within(ax: number, ay: number, bx: number, by: number, px: number, py: number): boolean {
  return px >= Math.min(ax, bx) && px <= Math.max(ax, bx) && py >= Math.min(ay, by) && py <= Math.max(ay, by);
}
