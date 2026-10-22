import type { Cell, LowCover } from "./types.ts";

export const GHOST_WIDTH = 20;
export const GHOST_HEIGHT = 20;

export interface RunnerSpawn {
  readonly id: string;
  readonly name: string;
  readonly x: number;
  readonly y: number;
}

export const GHOST_RUNNERS: readonly RunnerSpawn[] = [
  { id: "kite", name: "Kite", x: 1, y: 9 },
  { id: "voss", name: "Voss", x: 0, y: 8 },
  { id: "nera", name: "Nera", x: 1, y: 10 },
  { id: "sol", name: "Sol", x: 1, y: 11 },
];

export const GHOST_TERMINAL: Cell & { readonly id: "terminal" } = { id: "terminal", x: 2, y: 9 };

export const GHOST_DOOR: Cell & { readonly id: "shortcut" } = { id: "shortcut", x: 4, y: 14 };

export const GHOST_EXTRACTION: readonly Cell[] = [
  { x: 0, y: 8 },
  { x: 0, y: 9 },
  { x: 0, y: 10 },
  { x: 0, y: 11 },
];

export const GHOST_LOW_COVER: readonly LowCover[] = [{ id: "halle-west", x: 10, y: 8, protects: "w" }];

const OPEN = openCells();

export const GHOST_WALLS: readonly Cell[] = wallsFromOpen();

export function ghostCellOpen(x: number, y: number): boolean {
  return OPEN.has(key(x, y));
}

function openCells(): Set<string> {
  const open = new Set<string>();
  addRect(open, 0, 8, 3, 12);
  addRect(open, 0, 13, 3, 14);
  open.add(key(3, 7));
  open.add(key(4, 7));
  addRect(open, 5, 5, 18, 9);
  addRect(open, 5, 14, 18, 14);
  return open;
}

function wallsFromOpen(): Cell[] {
  const walls: Cell[] = [];
  for (let y = 0; y < GHOST_HEIGHT; y += 1) {
    for (let x = 0; x < GHOST_WIDTH; x += 1) {
      if (x === GHOST_DOOR.x && y === GHOST_DOOR.y) continue;
      if (OPEN.has(key(x, y))) continue;
      walls.push({ x, y });
    }
  }
  return walls;
}

function addRect(open: Set<string>, x0: number, y0: number, x1: number, y1: number): void {
  for (let y = y0; y <= y1; y += 1) {
    for (let x = x0; x <= x1; x += 1) open.add(key(x, y));
  }
}

function key(x: number, y: number): string {
  return `${x},${y}`;
}
