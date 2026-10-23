import type { Cell, LowCover } from "./types.ts";

/** Treppe, fester Übergang, unabhängig vom verletzten Schritt. */
export const STAIR_AP = 2;
/** Personenaufzug, derselbe feste Preis wie die Treppe. */
export const PASSENGER_AP = 2;
/** Lastenaufzug, teurer und ein eigener Typ. Kein Frachtinventar. */
export const FREIGHT_AP = 4;
export const LEVEL_MAX = 8;

export type VerticalKind = "stair" | "passenger" | "freight";

export interface FloorPlate {
  readonly z: number;
  readonly walls: readonly Cell[];
  readonly lowCover: readonly LowCover[];
}

export interface VerticalLink {
  readonly id: string;
  readonly kind: VerticalKind;
  readonly fromZ: number;
  readonly fromX: number;
  readonly fromY: number;
  readonly toZ: number;
  readonly toX: number;
  readonly toY: number;
}

export interface LevelPoint {
  readonly z: number;
  readonly x: number;
  readonly y: number;
}

export interface LevelSource {
  readonly width: number;
  readonly height: number;
  readonly walls: readonly Cell[];
  readonly lowCover: readonly LowCover[];
  readonly levels?: readonly FloorPlate[];
  readonly links?: readonly VerticalLink[];
}

export function linkAp(kind: VerticalKind): number {
  if (kind === "freight") return FREIGHT_AP;
  if (kind === "passenger") return PASSENGER_AP;
  return STAIR_AP;
}

/** Fehlende oder leere Etagenliste ist genau die bestehende Geschossplatte auf z = 0. */
export function floorsOf(spec: LevelSource): readonly FloorPlate[] {
  if (!spec.levels || spec.levels.length === 0) {
    return [{ z: 0, walls: spec.walls, lowCover: spec.lowCover }];
  }
  return [...spec.levels].sort((left, right) => left.z - right.z);
}

export function linksOf(spec: LevelSource): readonly VerticalLink[] {
  return spec.links ?? [];
}

export function resolveLink(spec: LevelSource, from: LevelPoint, to: LevelPoint): VerticalLink | null {
  if (from.z === to.z) return null;
  let found: VerticalLink | null = null;
  for (const link of linksOf(spec)) {
    const forward =
      link.fromZ === from.z &&
      link.fromX === from.x &&
      link.fromY === from.y &&
      link.toZ === to.z &&
      link.toX === to.x &&
      link.toY === to.y;
    const backward =
      link.toZ === from.z &&
      link.toX === from.x &&
      link.toY === from.y &&
      link.fromZ === to.z &&
      link.fromX === to.x &&
      link.fromY === to.y;
    if (!forward && !backward) continue;
    if (!found || link.id < found.id) found = link;
  }
  return found;
}

export function assertMissionLevels(spec: LevelSource): void {
  if (!spec.levels || spec.levels.length === 0) {
    if (spec.links && spec.links.length > 0) throw new Error("Übergänge brauchen Ebenen");
    return;
  }
  const floors = floorsOf(spec);
  const seen = new Set<number>();
  for (const floor of floors) {
    if (!Number.isInteger(floor.z) || floor.z < 0 || floor.z >= LEVEL_MAX) throw new Error("Etage ist ungültig");
    if (seen.has(floor.z)) throw new Error("Etage ist doppelt");
    seen.add(floor.z);
  }
  if (!seen.has(0)) throw new Error("Ebene 0 fehlt");
  const ground = floors.find((floor) => floor.z === 0);
  if (!ground || cellSet(ground.walls) !== cellSet(spec.walls) || coverSet(ground.lowCover) !== coverSet(spec.lowCover)) {
    throw new Error("Ebene 0 weicht von der Geschossplatte ab");
  }
  const ids = new Set<string>();
  const occupied = new Set<string>();
  for (const link of linksOf(spec)) {
    if (!/^[a-z0-9-]{1,24}$/.test(link.id) || ids.has(link.id)) throw new Error("Übergang ist ungültig");
    ids.add(link.id);
    if (link.kind !== "stair" && link.kind !== "passenger" && link.kind !== "freight") throw new Error("Übergang ist ungültig");
    if (!Number.isInteger(link.fromZ) || !Number.isInteger(link.toZ) || link.fromZ === link.toZ) throw new Error("Übergang ist ungültig");
    if (!seen.has(link.fromZ) || !seen.has(link.toZ)) throw new Error("Übergang ist ungültig");
    for (const end of ends(link)) {
      if (!Number.isInteger(end.x) || !Number.isInteger(end.y) || end.x < 0 || end.y < 0 || end.x >= spec.width || end.y >= spec.height) {
        throw new Error("Übergang ist ungültig");
      }
      const key = `${end.z}:${end.x},${end.y}`;
      if (occupied.has(key)) throw new Error("Übergang ist doppelt");
      occupied.add(key);
      const floor = floors.find((item) => item.z === end.z);
      if (floor?.walls.some((wall) => wall.x === end.x && wall.y === end.y)) throw new Error("Übergang liegt in einer Wand");
    }
  }
}

function ends(link: VerticalLink): readonly LevelPoint[] {
  return [
    { z: link.fromZ, x: link.fromX, y: link.fromY },
    { z: link.toZ, x: link.toX, y: link.toY },
  ];
}

function cellSet(cells: readonly Cell[]): string {
  return cells.map((cell) => `${cell.x},${cell.y}`).sort().join("|");
}

function coverSet(covers: readonly LowCover[]): string {
  return covers.map((cover) => `${cover.id}:${cover.x},${cover.y}:${cover.protects}`).sort().join("|");
}
