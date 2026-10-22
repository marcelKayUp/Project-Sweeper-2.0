import { random } from "../random.ts";
import { ROOM_RULES } from "../catalog.ts";
import type { RoomType } from "../types.ts";
import { MAX_PROGRAM_ROOMS } from "../demand.ts";
import { sharedPortals, type Rectangle } from "./bsp.ts";

export const EMBEDDING_NODE_LIMIT = 12000;
export interface RoomGraphTemplate {
  readonly id: string;
  readonly edges: readonly (readonly [number, number])[];
  readonly shortcut: readonly [number, number] | null;
}

export const LAB_TEMPLATE_ID = "laboratory-capacity/1";

export interface EmbeddingResult {
  readonly assignment: readonly number[] | null;
  readonly nodes: number;
  readonly backtracks: number;
  readonly exhausted: boolean;
}

// New TypeScript implementation of graph/door-template matching, inspired by
// Edgar's graph-first workflow. No Edgar code or .NET runtime is included.
export function embedRoomGraph(rectangles: readonly Rectangle[], types: readonly RoomType[], template: RoomGraphTemplate, width: number, height: number, seed: number, nodeLimit = EMBEDDING_NODE_LIMIT, constraints?: { readonly minAreas: readonly number[]; readonly exterior: readonly number[]; readonly accept: (assignment: readonly number[]) => boolean }): EmbeddingResult {
  if (types.length !== rectangles.length || types.length > MAX_PROGRAM_ROOMS || !Number.isInteger(nodeLimit) || nodeLimit < 1 || nodeLimit > EMBEDDING_NODE_LIMIT) throw new Error("Ungültiges Einbettungsbudget");
  const count = rectangles.length;
  const edges = [...template.edges, ...(template.shortcut ? [template.shortcut] : [])];
  if (edges.some(([a, b]) => !Number.isInteger(a) || !Number.isInteger(b) || a < 0 || b < 0 || a >= count || b >= count || a === b)) throw new Error("Raumgraph enthält ungültige Referenzen");
  const adjacency = rectangles.map((rect, index) => rectangles.map((other, j) => index !== j && sharedPortals(rect, other).length > 0));
  const degree = rectangles.map((_, i) => adjacency[i]!.filter(Boolean).length);
  const required = types.map((_, index) => edges.filter(([a, b]) => a === index || b === index).length);
  const rng = random(seed);
  const priorities = rng.shuffle(Array.from({ length: count }, (_, i) => i));
  const candidates = types.map((type, room) => rng.shuffle(rectangles.map((_, i) => i)).filter((index) => {
    const rect = rectangles[index]!;
    const exterior = rect.x === 1 || rect.y === 1 || rect.x + rect.width === width - 1 || rect.y + rect.height === height - 1;
    const needsExterior = constraints ? constraints.exterior.includes(room) : type === "reception" || type === "loading";
    return rect.width * rect.height >= (constraints?.minAreas[room] ?? ROOM_RULES[type].minArea) && degree[index]! >= required[room]! && (!needsExterior || exterior);
  }));
  const assignment = Array<number>(count).fill(-1);
  const used = new Set<number>();
  let nodes = 0;
  let backtracks = 0;
  let exhausted = false;
  function choices(room: number): number[] {
    return candidates[room]!.filter((slot) => !used.has(slot) && edges.every(([a, b]) => {
      const other = a === room ? b : b === room ? a : -1;
      return other < 0 || assignment[other] === -1 || adjacency[slot]![assignment[other]!] === true;
    }));
  }
  function search(placed: number): boolean {
    if (placed === count) return constraints?.accept(assignment) ?? true;
    let selected = -1;
    let best: number[] = [];
    for (const room of priorities) {
      if (assignment[room] !== -1) continue;
      const remaining = choices(room);
      if (!remaining.length) return false;
      if (selected === -1 || remaining.length < best.length || remaining.length === best.length && required[room]! > required[selected]!) { selected = room; best = remaining; }
    }
    for (const slot of best) {
      if (nodes >= nodeLimit) { exhausted = true; return false; }
      nodes += 1; assignment[selected] = slot; used.add(slot);
      if (search(placed + 1)) return true;
      assignment[selected] = -1; used.delete(slot); backtracks += 1;
      if (exhausted) return false;
    }
    return false;
  }
  return { assignment: search(0) ? [...assignment] : null, nodes, backtracks, exhausted };
}
