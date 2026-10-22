import type { BattleMap, Cell } from "./types.ts";

export interface PlacedUnit extends Cell {
  readonly id: string;
}

function span(x0: number, y0: number, x1: number, y1: number): Cell[] {
  const cells: Cell[] = [];
  for (let y = y0; y <= y1; y += 1) {
    for (let x = x0; x <= x1; x += 1) cells.push({ x, y });
  }
  return cells;
}

const walls: Cell[] = span(7, 0, 9, 2);

export const deckungFixture: {
  readonly map: BattleMap;
  readonly runner: PlacedUnit;
  readonly enemy: PlacedUnit;
  readonly nix: PlacedUnit;
  readonly blockedTarget: Cell;
} = {
  map: {
    width: 20,
    height: 20,
    walls,
    lowCover: [{ id: "sperre-kite", x: 1, y: 3, protects: "e" }],
  },
  runner: { id: "kite", x: 1, y: 3 },
  enemy: { id: "wache", x: 5, y: 3 },
  nix: { id: "nix", x: 3, y: 1 },
  blockedTarget: { x: 15, y: 1 },
};
