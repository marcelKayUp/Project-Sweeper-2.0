import type { Cell, MissionSpec } from "@neon/sim";
import { cellKey, center, contains, neighbors } from "./graph.ts";
import type { Building, Room } from "./types.ts";

export const hallId = (cell: Cell): string => `hall-${cell.x}-${cell.y}`;
export const EXECUTIVE_SANITARY_LIMIT = 16;
export function architecturalNodes(building: Pick<Building, "rooms" | "circulation">): Map<string, Pick<Room, "id" | "x" | "y" | "width" | "height" | "type" | "zone" | "access">> {
  return new Map<string, Pick<Room, "id" | "x" | "y" | "width" | "height" | "type" | "zone" | "access">>([...building.rooms.map((room) => [room.id, room] as const), ...building.circulation.map((cell) => [hallId(cell), { ...cell, id: hallId(cell), width: 1, height: 1, type: "corridor" as const, zone: "staff" as const, access: "staff" as const }] as const)]);
}

// Actual walking cells: other workplaces and restricted rooms cannot be borrowed
// as circulation. A CEO may leave through their own assistant's office.
export function sanitaryPath(building: Pick<Building, "rooms" | "circulation" | "connections">, source: Room, mission?: Pick<MissionSpec, "walls" | "door" | "terminal">, destination?: Room): Cell[] {
  const targets = destination ? [destination] : building.rooms.filter((room) => room.type === "restroom");
  const allowedRooms = [source, ...targets, ...building.rooms.filter((room) => room.type === "corridor" || source.type === "executive" && room.type === "assistant")];
  const allowedIds = new Set(allowedRooms.map((room) => room.id));
  const allowed = new Set(building.circulation.map(cellKey));
  for (const room of allowedRooms) for (let y = room.y; y < room.y + room.height; y++) for (let x = room.x; x < room.x + room.width; x++) allowed.add(cellKey({ x, y }));
  const halls = new Set(building.circulation.map(hallId));
  for (const link of building.connections) if (link.kind !== "shortcut" && (allowedIds.has(link.from) || halls.has(link.from)) && (allowedIds.has(link.to) || halls.has(link.to))) allowed.add(cellKey(link.portal));
  if (mission) for (const cell of [...mission.walls, mission.door, mission.terminal]) allowed.delete(cellKey(cell));
  const start = center(source);
  if (!allowed.has(cellKey(start))) return [];
  const queue = [start]; const previous = new Map<string, Cell>(); const seen = new Set([cellKey(start)]);
  for (let i = 0; i < queue.length; i++) {
    const current = queue[i]!;
    if (targets.some((room) => contains(room, current))) {
      const path = [current];
      while (previous.has(cellKey(path[0]!))) path.unshift(previous.get(cellKey(path[0]!))!);
      return path;
    }
    for (const next of neighbors(current)) if (allowed.has(cellKey(next)) && !seen.has(cellKey(next))) { seen.add(cellKey(next)); previous.set(cellKey(next), current); queue.push(next); }
  }
  return [];
}
