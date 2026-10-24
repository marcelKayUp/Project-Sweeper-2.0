import type { CityMapBuilding, CityMapPoint, CityMapStreet } from "@neon/sim";

export interface VectorPlace {
  readonly id: string;
  readonly name: string;
  readonly x: number;
  readonly y: number;
}

export interface VectorScene {
  readonly center: CityMapPoint;
  readonly fullSpan: number;
  readonly paths: { readonly fern: string; readonly nah: string };
  readonly streets: readonly { readonly kind: "fern" | "nah"; readonly points: string }[];
  readonly buildings: readonly { readonly place: string; readonly points: string; readonly fill: string }[];
  readonly labels: readonly { readonly id: string; readonly name: string; readonly x: number; readonly y: number }[];
}

interface Bounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export function spin(x: number, y: number, cx: number, cy: number, turn: number): CityMapPoint {
  const cos = Math.cos(turn);
  const sin = Math.sin(turn);
  const dx = x - cx;
  const dy = y - cy;
  return { x: cx + dx * cos - dy * sin, y: cy + dx * sin + dy * cos };
}

export function vectorScene(
  streets: readonly CityMapStreet[],
  buildings: readonly CityMapBuilding[],
  places: readonly VectorPlace[],
  turn = 0,
): VectorScene {
  const center = centerOf(places);
  const bounds = emptyBounds();
  const project = (point: CityMapPoint) => {
    const spun = spin(point.x, point.y, center.x, center.y, turn);
    include(bounds, spun.x, spun.y);
    return spun;
  };
  const buckets = { fern: [] as string[], nah: [] as string[] };
  const drawnStreets = streets.map((street) => {
    const drawn = street.points.map((point) => chain(project(point)));
    const first = drawn[0];
    if (first) buckets[street.kind].push(`M ${first}${drawn.slice(1).map((point) => ` L ${point}`).join("")}`);
    return { kind: street.kind, points: drawn.join(" ") };
  });
  const drawnBuildings = buildings.map((building) => ({
    place: building.place,
    points: building.points.map((point) => chain(project(point))).join(" "),
    fill: buildingFill(building.points),
  }));
  const labels = places.map((place) => {
    const point = project({ x: place.x, y: place.y });
    return { id: place.id, name: place.name, x: round(point.x), y: round(point.y) };
  });
  const width = bounds.maxX - bounds.minX;
  const height = bounds.maxY - bounds.minY;
  return {
    center,
    fullSpan: Math.max(width, height, 1) + 80,
    paths: { fern: buckets.fern.join(" "), nah: buckets.nah.join(" ") },
    streets: drawnStreets,
    buildings: drawnBuildings,
    labels,
  };
}

export function frame(center: CityMapPoint, x: number, y: number, span: number, turn: number): string {
  const point = spin(x, y, center.x, center.y, turn);
  const safe = Math.max(span, 1);
  return `${round(point.x - safe / 2)} ${round(point.y - safe / 2)} ${round(safe)} ${round(safe)}`;
}

function centerOf(places: readonly VectorPlace[]): CityMapPoint {
  if (places.length === 0) return { x: 0, y: 0 };
  let x = 0;
  let y = 0;
  for (const place of places) {
    x += place.x;
    y += place.y;
  }
  return { x: x / places.length, y: y / places.length };
}

function buildingFill(points: readonly CityMapPoint[]): string {
  const first = points[0];
  const blend = first ? ((Math.abs(first.x * 13 + first.y * 7) % 1000) / 999) : 0;
  return mix("#0c4f86", "#2f9fe0", blend);
}

function mix(from: string, to: string, t: number): string {
  const mixed = [1, 3, 5].map((index) => {
    const start = Number.parseInt(from.slice(index, index + 2), 16);
    const end = Number.parseInt(to.slice(index, index + 2), 16);
    return Math.round(start + (end - start) * t).toString(16).padStart(2, "0");
  });
  return `#${mixed.join("")}`;
}

function chain(point: CityMapPoint): string {
  return `${round(point.x)},${round(point.y)}`;
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}

function emptyBounds(): Bounds {
  return { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity };
}

function include(bounds: Bounds, x: number, y: number) {
  if (x < bounds.minX) bounds.minX = x;
  if (x > bounds.maxX) bounds.maxX = x;
  if (y < bounds.minY) bounds.minY = y;
  if (y > bounds.maxY) bounds.maxY = y;
}
