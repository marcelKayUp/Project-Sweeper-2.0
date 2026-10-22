import { random } from "../random.ts";
import { MAX_PROGRAM_ROOMS } from "../demand.ts";

export interface Rectangle {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface Partition {
  readonly id: string;
  readonly bounds: Rectangle;
  readonly axis: "x" | "y";
  readonly offset: number;
}

/**
 * Adapted rectangle arithmetic from halftheopposite/bsp-dungeon-generator.
 * Copyright (c) 2021 Aymeric Chauvin, MIT.
 * See ../../THIRD_PARTY_NOTICES.md and ../../licenses/halftheopposite-MIT.txt.
 * The one-cell separator, immutable values and constraints are local changes.
 */
export function splitRectangle(rect: Rectangle, axis: "x" | "y", offset: number): readonly [Rectangle, Rectangle] {
  if (!Number.isInteger(offset) || offset < 1 || offset >= (axis === "x" ? rect.width : rect.height) - 1) {
    throw new Error("BSP-Schnitt liegt außerhalb des Rechtecks");
  }
  return axis === "x"
    ? [{ ...rect, width: offset }, { ...rect, x: rect.x + offset + 1, width: rect.width - offset - 1 }]
    : [{ ...rect, height: offset }, { ...rect, y: rect.y + offset + 1, height: rect.height - offset - 1 }];
}

export function bspRooms(bounds: Rectangle, count: number, seed: number): { rectangles: readonly Rectangle[]; partitions: readonly Partition[] } {
  if (!Number.isInteger(count) || count < 1 || count > MAX_PROGRAM_ROOMS || ![bounds.x, bounds.y, bounds.width, bounds.height].every(Number.isInteger) || bounds.width > 30 || bounds.height > 30) {
    throw new Error("Ungültiges BSP-Budget");
  }
  const rng = random(seed);
  const memo = new Map<string, boolean>();
  const optionsMemo = new Map<string, readonly { axis: "x" | "y"; offset: number; firstCount: number }[]>();
  // Larger programs may need unequal wings to fit the same bounded floorplate.
  // Room counts below 24 retain the balanced split policy.
  function options(width: number, height: number, rooms: number) {
    const key = `${width}/${height}/${rooms}`;
    const found = optionsMemo.get(key);
    if (found) return found;
    const result: { axis: "x" | "y"; offset: number; firstCount: number }[] = [];
    if (rooms > 1) for (const axis of ["x", "y"] as const) {
      const length = axis === "x" ? width : height;
      for (let offset = 3; offset <= length - 4; offset += 1) {
        const counts = rooms < 24 ? [...new Set([Math.floor(rooms / 2), Math.ceil(rooms / 2)])] : Array.from({ length: Math.ceil(rooms * 3 / 4) - Math.floor(rooms / 4) + 1 }, (_, i) => Math.floor(rooms / 4) + i);
        for (const firstCount of counts) {
          const a = axis === "x" ? [offset, height] : [width, offset];
          const b = axis === "x" ? [width - offset - 1, height] : [width, height - offset - 1];
          if (canTile(a[0]!, a[1]!, firstCount) && canTile(b[0]!, b[1]!, rooms - firstCount)) result.push({ axis, offset, firstCount });
        }
      }
    }
    optionsMemo.set(key, result);
    return result;
  }
  function canTile(width: number, height: number, rooms: number): boolean {
    const key = `${width}/${height}/${rooms}`;
    const cached = memo.get(key);
    if (cached !== undefined) return cached;
    let result = false;
    if (width >= 3 && height >= 3 && width * height >= rooms * 12) {
      result = rooms === 1 ? width * height >= 12 && Math.max(width, height) <= 3 * Math.min(width, height) : options(width, height, rooms).length > 0;
    }
    memo.set(key, result);
    return result;
  }
  if (!canTile(bounds.width, bounds.height, count)) throw new Error("Fläche lässt sich nicht in das benötigte Raumprogramm teilen");
  const rectangles: Rectangle[] = [];
  const partitions: Partition[] = [];
  function divide(rect: Rectangle, rooms: number, id: string): void {
    if (rooms === 1) { rectangles.push(rect); return; }
    const choices = options(rect.width, rect.height, rooms);
    const selected = choices[rng.int(choices.length)]!;
    const [first, second] = splitRectangle(rect, selected.axis, selected.offset);
    partitions.push({ id, bounds: rect, axis: selected.axis, offset: selected.offset });
    divide(first, selected.firstCount, `${id}0`);
    divide(second, rooms - selected.firstCount, `${id}1`);
  }
  divide(bounds, count, "bsp-");
  return { rectangles, partitions };
}

export function sharedPortals(a: Rectangle, b: Rectangle): readonly { x: number; y: number }[] {
  const portals: { x: number; y: number }[] = [];
  if (a.x + a.width + 1 === b.x || b.x + b.width + 1 === a.x) {
    const x = Math.min(a.x + a.width, b.x + b.width);
    for (let y = Math.max(a.y, b.y); y < Math.min(a.y + a.height, b.y + b.height); y += 1) portals.push({ x, y });
  }
  if (a.y + a.height + 1 === b.y || b.y + b.height + 1 === a.y) {
    const y = Math.min(a.y + a.height, b.y + b.height);
    for (let x = Math.max(a.x, b.x); x < Math.min(a.x + a.width, b.x + b.width); x += 1) portals.push({ x, y });
  }
  return portals;
}
