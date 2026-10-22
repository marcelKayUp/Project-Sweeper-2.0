import type { Cell, Direction } from "@neon/sim";

export const CELL = 192;

export function cellCenter(cell: Cell): { readonly x: number; readonly y: number } {
  return { x: cell.x * CELL + CELL / 2, y: cell.y * CELL + CELL / 2 };
}

export function milliToPixel(milli: number): number {
  return (milli / 1000) * CELL;
}

export interface CoverSprite {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
  readonly protects: Direction;
}

export function coverSprite(cell: Cell, protects: Direction): CoverSprite {
  const ox = cell.x * CELL;
  const oy = cell.y * CELL;
  const along = Math.round(CELL * 0.9);
  const thick = Math.round(CELL * 0.78);
  const inset = Math.round((CELL - along) / 2);
  if (protects === "e" || protects === "w") {
    const x = protects === "e" ? ox + CELL - Math.round(thick * 0.62) : ox - Math.round(thick * 0.38);
    return { x, y: oy + inset, w: thick, h: along, protects };
  }
  const y = protects === "s" ? oy + CELL - Math.round(thick * 0.62) : oy - Math.round(thick * 0.38);
  return { x: ox + inset, y, w: along, h: thick, protects };
}
