import type { Cell } from "@neon/sim";
import type { Connection } from "./types.ts";

export const cellKey = (cell: Cell): string => `${cell.x},${cell.y}`;
export const sameCell = (a: Cell, b: Cell): boolean => a.x === b.x && a.y === b.y;
export const contains = (room: Cell & { width: number; height: number }, cell: Cell): boolean => cell.x >= room.x && cell.x < room.x + room.width && cell.y >= room.y && cell.y < room.y + room.height;
export const center = (room: Cell & { width: number; height: number }): Cell => ({ x: room.x + Math.floor(room.width / 2), y: room.y + Math.floor(room.height / 2) });
export const neighbors = (cell: Cell): Cell[] => [
  { x: cell.x, y: cell.y - 1 }, { x: cell.x + 1, y: cell.y },
  { x: cell.x, y: cell.y + 1 }, { x: cell.x - 1, y: cell.y },
];

export function roomPath(connections: readonly Connection[], from: string, to: string, forbidden = new Set<string>()): string[] {
  const queue = [[from]];
  const seen = new Set([from]);
  for (let i = 0; i < queue.length; i += 1) {
    const path = queue[i]!;
    const current = path[path.length - 1]!;
    if (current === to) return path;
    for (const link of connections) {
      if (link.kind === "shortcut" || forbidden.has(link.id)) continue;
      const next = link.from === current ? link.to : link.to === current ? link.from : null;
      if (next && !seen.has(next)) { seen.add(next); queue.push([...path, next]); }
    }
  }
  return [];
}

// Unit-capacity undirected max flow. Cancelling flow allows rerouting the first path.
export function independentRoomRoutes(connections: readonly Connection[], from: string, to: string): number {
  return independentRoomPaths(connections, from, to).length;
}

export function independentRoomPaths(connections: readonly Connection[], from: string, to: string): string[][] {
  if (from === to) return [];
  const links = connections.filter((link) => link.kind !== "shortcut");
  const flow = new Map<string, number>();
  let total = 0;
  for (; total < 2; total += 1) {
    const queue = [from];
    const previous = new Map<string, { node: string; edge: Connection; direction: number }>();
    const seen = new Set([from]);
    for (let i = 0; i < queue.length && !seen.has(to); i += 1) {
      const current = queue[i]!;
      for (const edge of links) {
        const direction = edge.from === current ? 1 : edge.to === current ? -1 : 0;
        const next = direction === 1 ? edge.to : edge.from;
        if (!direction || seen.has(next) || (flow.get(edge.id) ?? 0) * direction >= 1) continue;
        seen.add(next); previous.set(next, { node: current, edge, direction }); queue.push(next);
      }
    }
    if (!seen.has(to)) break;
    for (let node = to; node !== from;) {
      const step = previous.get(node)!;
      flow.set(step.edge.id, (flow.get(step.edge.id) ?? 0) + step.direction);
      node = step.node;
    }
  }
  const remaining = links.filter((link) => flow.get(link.id)).map((link) => (flow.get(link.id) ?? 0) > 0
    ? { id: link.id, from: link.from, to: link.to } : { id: link.id, from: link.to, to: link.from });
  const paths: string[][] = [];
  for (let i = 0; i < total; i += 1) {
    const queue = [[from]];
    const seen = new Set([from]);
    let found: string[] | undefined;
    for (let j = 0; j < queue.length; j += 1) {
      const path = queue[j]!;
      const node = path[path.length - 1]!;
      if (node === to) { found = path; break; }
      for (const link of remaining) if (link.from === node && !seen.has(link.to)) {
        seen.add(link.to); queue.push([...path, link.to]);
      }
    }
    if (!found) break;
    paths.push(found);
    for (let j = 1; j < found.length; j += 1) {
      const index = remaining.findIndex((link) => link.from === found[j - 1] && link.to === found[j]);
      remaining.splice(index, 1);
    }
  }
  return paths;
}

export function flood(width: number, height: number, blocked: ReadonlySet<string>, from: Cell): Map<string, number> {
  const distances = new Map<string, number>();
  if (blocked.has(cellKey(from))) return distances;
  const queue: Cell[] = [from];
  distances.set(cellKey(from), 0);
  for (let i = 0; i < queue.length; i += 1) {
    const current = queue[i]!;
    for (const next of neighbors(current)) {
      const key = cellKey(next);
      if (next.x < 0 || next.x >= width || next.y < 0 || next.y >= height || blocked.has(key) || distances.has(key)) continue;
      distances.set(key, distances.get(cellKey(current))! + 1); queue.push(next);
    }
  }
  return distances;
}
