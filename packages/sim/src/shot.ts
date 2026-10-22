import { chanceParts, coverPenalty, manhattan, traceShot } from "./geometry.ts";
import { DIRECTIONS, type BattleMap, type Cell, type Direction, type ShotPreview } from "./types.ts";

export function previewShot(map: BattleMap, from: Cell, to: Cell, aimBonus: number): ShotPreview {
  assertMap(map);
  assertCell(from, map, "Schütze");
  assertCell(to, map, "Ziel");
  if (!Number.isInteger(aimBonus)) throw new Error("Zielbonus muss ganzzahlig sein");

  const distance = manhattan(from, to);
  const ray = traceShot(map, from, to);
  const penalty = ray.blocked ? 0 : coverPenalty(map, from, to);
  const parts = ray.blocked ? null : chanceParts(distance, aimBonus, penalty);

  return {
    from: { x: from.x, y: from.y },
    to: { x: to.x, y: to.y },
    distance,
    aimBonus,
    base: 70,
    distancePenalty: parts ? parts.distancePenalty : 5 * Math.max(0, distance - 3),
    coverPenalty: penalty,
    raw: parts ? parts.raw : null,
    chance: parts ? parts.chance : null,
    clamped: parts ? parts.clamped : false,
    blocked: ray.blocked,
    blocker: ray.blocker,
    impact: ray.impact,
    protectedEdgeCrossed: penalty === 25,
  };
}

function assertMap(map: BattleMap): void {
  if (!Number.isInteger(map.width) || map.width <= 0) throw new Error("Kartenbreite ist ungültig");
  if (!Number.isInteger(map.height) || map.height <= 0) throw new Error("Kartenhöhe ist ungültig");
  for (const wall of map.walls) assertCell(wall, map, "Wand");
  for (const cover of map.lowCover) {
    assertCell(cover, map, "Deckung");
    if (typeof cover.id !== "string" || cover.id.length === 0) throw new Error("Deckung braucht eine Id");
    if (!isDirection(cover.protects)) throw new Error("Deckungskante ist ungültig");
  }
}

function assertCell(cell: Cell, map: BattleMap, label: string): void {
  if (!Number.isInteger(cell.x) || !Number.isInteger(cell.y)) {
    throw new Error(`${label} liegt nicht auf einem ganzzahligen Feld`);
  }
  if (cell.x < 0 || cell.y < 0 || cell.x >= map.width || cell.y >= map.height) {
    throw new Error(`${label} liegt außerhalb der Karte`);
  }
}

function isDirection(value: unknown): value is Direction {
  return typeof value === "string" && DIRECTIONS.some((direction) => direction === value);
}
