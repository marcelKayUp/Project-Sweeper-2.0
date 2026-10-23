import type { CityNode } from "./city.ts";

// Manhattan-Voronoi im Kartenmaß, vor der Schrägprojektion.
// Gleiche Distanz fällt an die lexikografisch kleinere Knoten-ID.
// Jeder ganzzahlige Punkt im umschließenden Rechteck trägt eine Zelle;
// der feste Rand entspricht dem Boden der holografischen Karte.

export const CITY_CELL_MARGIN = 48;

export interface CityCellPoint {
  readonly x: number;
  readonly y: number;
}

export interface CityCell {
  readonly id: string;
  readonly rings: readonly (readonly CityCellPoint[])[];
}

interface IndexedSite {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly order: number;
}

interface Corner {
  readonly x: number;
  readonly y: number;
}

interface TracedRing {
  readonly corners: readonly Corner[];
  readonly area: number;
}

function l1(x1: number, y1: number, x2: number, y2: number): number {
  return Math.abs(x1 - x2) + Math.abs(y1 - y2);
}

function compareId(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

export function cityCellOwner(nodes: readonly CityNode[], x: number, y: number): string {
  let best: CityNode | undefined;
  let bestDist = 0;
  for (const node of nodes) {
    const dist = l1(x, y, node.x, node.y);
    if (!best || dist < bestDist || (dist === bestDist && node.id < best.id)) {
      best = node;
      bestDist = dist;
    }
  }
  if (!best) throw new Error("Stadtgraph ohne Orte");
  return best.id;
}

function indexedSites(nodes: readonly CityNode[]): IndexedSite[] {
  const sites = nodes.map((node, order) => {
    if (!Number.isInteger(node.x) || !Number.isInteger(node.y)) {
      throw new Error("Voronoi-Zellen erwarten ganzzahlige Kartenkoordinaten");
    }
    return { id: node.id, x: node.x, y: node.y, order };
  });
  sites.sort((left, right) => compareId(left.id, right.id) || left.order - right.order);
  return sites;
}

function packCorner(x: number, y: number, stride: number): number {
  return x * stride + y;
}

function ringFromLoop(loop: readonly number[], stride: number): TracedRing | null {
  const raw = loop.map((packed) => ({ x: Math.floor(packed / stride), y: packed % stride }));
  const count = raw.length;
  const kept: Corner[] = [];
  for (let index = 0; index < count; index += 1) {
    const prev = raw[(index - 1 + count) % count];
    const curr = raw[index];
    const next = raw[(index + 1) % count];
    if (!prev || !curr || !next) continue;
    const cross = (curr.x - prev.x) * (next.y - curr.y) - (curr.y - prev.y) * (next.x - curr.x);
    if (cross !== 0) kept.push(curr);
  }
  if (kept.length < 3) return null;
  let area = 0;
  for (let index = 0; index < kept.length; index += 1) {
    const current = kept[index];
    const next = kept[(index + 1) % kept.length];
    if (!current || !next) continue;
    area += current.x * next.y - next.x * current.y;
  }
  if (area === 0) return null;
  let start = 0;
  for (let index = 1; index < kept.length; index += 1) {
    const point = kept[index];
    const best = kept[start];
    if (!point || !best) continue;
    if (point.y < best.y || (point.y === best.y && point.x < best.x)) start = index;
  }
  const corners = kept.slice(start).concat(kept.slice(0, start));
  return { corners, area };
}

function turnRank(incomingX: number, incomingY: number, outX: number, outY: number): number {
  if (outX === -incomingY && outY === incomingX) return 0;
  if (outX === incomingX && outY === incomingY) return 1;
  if (outX === incomingY && outY === -incomingX) return 2;
  return 3;
}

function takeEdge(
  outgoing: Map<number, number[]>,
  current: number,
  incomingX: number,
  incomingY: number,
  hasIncoming: boolean,
  stride: number,
): number | null {
  const options = outgoing.get(current);
  if (!options || options.length === 0) return null;
  let bestIndex = 0;
  if (hasIncoming && options.length > 1) {
    let bestRank = 4;
    let bestEnd = Number.POSITIVE_INFINITY;
    for (let index = 0; index < options.length; index += 1) {
      const end = options[index];
      if (end === undefined) continue;
      const outX = Math.floor(end / stride) - Math.floor(current / stride);
      const outY = (end % stride) - (current % stride);
      const rank = turnRank(incomingX, incomingY, outX, outY);
      if (rank < bestRank || (rank === bestRank && end < bestEnd)) {
        bestRank = rank;
        bestEnd = end;
        bestIndex = index;
      }
    }
  }
  const next = options[bestIndex];
  if (next === undefined) return null;
  options.splice(bestIndex, 1);
  return next;
}

function traceSite(outgoing: Map<number, number[]>, stride: number, edgeBudget: number): TracedRing[] {
  const rings: TracedRing[] = [];
  const starts = [...outgoing.keys()].sort((left, right) => left - right);
  for (const start of starts) {
    while ((outgoing.get(start)?.length ?? 0) > 0) {
      const first = takeEdge(outgoing, start, 0, 0, false, stride);
      if (first === null) break;
      const loop = [start];
      let previous = start;
      let current = first;
      let steps = 0;
      while (current !== start) {
        steps += 1;
        if (steps > edgeBudget) throw new Error("Voronoi-Rand schließt nicht");
        loop.push(current);
        const incomingX = Math.floor(current / stride) - Math.floor(previous / stride);
        const incomingY = (current % stride) - (previous % stride);
        const next = takeEdge(outgoing, current, incomingX, incomingY, true, stride);
        if (next === null) throw new Error("Voronoi-Rand bricht ab");
        previous = current;
        current = next;
      }
      const ring = ringFromLoop(loop, stride);
      if (ring) rings.push(ring);
    }
  }
  return rings;
}

function traceCells(
  owners: Uint16Array,
  sites: readonly IndexedSite[],
  width: number,
  height: number,
  minX: number,
  minY: number,
): CityCell[] {
  const stride = height + 1;
  const adjacency = sites.map(() => new Map<number, number[]>());
  const at = (col: number, row: number): number => {
    if (col < 0 || row < 0 || col >= width || row >= height) return -1;
    return owners[row * width + col] ?? -1;
  };
  const addEdge = (site: number, sx: number, sy: number, ex: number, ey: number) => {
    const edges = adjacency[site];
    if (!edges) throw new Error("Voronoi-Ort fehlt");
    const start = packCorner(sx, sy, stride);
    const end = packCorner(ex, ey, stride);
    const list = edges.get(start);
    if (list) list.push(end);
    else edges.set(start, [end]);
  };

  for (let row = 0; row < height; row += 1) {
    for (let col = 0; col < width; col += 1) {
      const site = at(col, row);
      if (site < 0) continue;
      if (at(col, row - 1) !== site) addEdge(site, col, row, col + 1, row);
      if (at(col + 1, row) !== site) addEdge(site, col + 1, row, col + 1, row + 1);
      if (at(col, row + 1) !== site) addEdge(site, col + 1, row + 1, col, row + 1);
      if (at(col - 1, row) !== site) addEdge(site, col, row + 1, col, row);
    }
  }

  for (const edges of adjacency) {
    for (const list of edges.values()) list.sort((left, right) => left - right);
  }

  const grouped = new Map<string, TracedRing[]>();
  const edgeBudget = width * height * 4 + 4;
  for (let index = 0; index < sites.length; index += 1) {
    const site = sites[index];
    const edges = adjacency[index];
    if (!site || !edges) continue;
    const rings = traceSite(edges, stride, edgeBudget);
    if (rings.length === 0) continue;
    const existing = grouped.get(site.id);
    if (existing) existing.push(...rings);
    else grouped.set(site.id, rings);
  }

  const cells: CityCell[] = [];
  for (const id of [...grouped.keys()].sort(compareId)) {
    const rings = grouped.get(id);
    if (!rings) continue;
    rings.sort((left, right) => Math.abs(right.area) - Math.abs(left.area) || left.corners[0]!.y - right.corners[0]!.y || left.corners[0]!.x - right.corners[0]!.x);
    cells.push({
      id,
      rings: rings.map((ring) => ring.corners.map((corner) => ({ x: minX + corner.x - 0.5, y: minY + corner.y - 0.5 }))),
    });
  }
  return cells;
}

export function cityCells(nodes: readonly CityNode[]): readonly CityCell[] {
  if (nodes.length === 0) return [];
  const sites = indexedSites(nodes);
  const first = sites[0];
  if (!first) return [];
  let minX = first.x;
  let maxX = first.x;
  let minY = first.y;
  let maxY = first.y;
  const xs = new Int32Array(sites.length);
  const ys = new Int32Array(sites.length);
  for (let index = 0; index < sites.length; index += 1) {
    const site = sites[index];
    if (!site) continue;
    xs[index] = site.x;
    ys[index] = site.y;
    if (site.x < minX) minX = site.x;
    if (site.x > maxX) maxX = site.x;
    if (site.y < minY) minY = site.y;
    if (site.y > maxY) maxY = site.y;
  }
  minX -= CITY_CELL_MARGIN;
  maxX += CITY_CELL_MARGIN;
  minY -= CITY_CELL_MARGIN;
  maxY += CITY_CELL_MARGIN;
  const width = maxX - minX + 1;
  const height = maxY - minY + 1;
  if (width > 4096 || height > 4096) throw new Error("Voronoi-Raster ist zu groß");
  const owners = new Uint16Array(width * height);
  if (sites.length > 65535) throw new Error("Zu viele Orte für das Voronoi-Raster");

  for (let row = 0; row < height; row += 1) {
    const y = minY + row;
    const offset = row * width;
    for (let col = 0; col < width; col += 1) {
      const x = minX + col;
      let best = 0;
      let bestDist = l1(x, y, xs[0] ?? x, ys[0] ?? y);
      for (let index = 1; index < sites.length; index += 1) {
        const dist = l1(x, y, xs[index] ?? x, ys[index] ?? y);
        if (dist < bestDist) {
          best = index;
          bestDist = dist;
        }
      }
      owners[offset + col] = best;
    }
  }

  return traceCells(owners, sites, width, height, minX, minY);
}
