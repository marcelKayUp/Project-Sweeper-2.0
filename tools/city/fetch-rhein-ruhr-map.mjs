import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const cacheDir = resolve(root, ".cache-assets/city-map");
const outFile = resolve(root, "packages/sim/src/rheinRuhrMap.ts");
const endpoint = "https://overpass-api.de/api/interpreter";
const minLon = 6.4353792;
const maxLon = 7.8191185;
const minLat = 50.7352621;
const maxLat = 51.681281;
const scale = 10000;
const localRadius = 1300;
const buildingRadius = 850;
const cell = 7;
const maxBuildingsPerPlace = 160;
const minBuildingArea = 0.55;

const places = readPlaces();
const quads = [
  [50.65, 6.35, 51.175, 7.15],
  [50.65, 7.15, 51.175, 7.95],
  [51.175, 6.35, 51.7, 7.15],
  [51.175, 7.15, 51.7, 7.95],
];

mkdirSync(cacheDir, { recursive: true });
const stamp = { value: "" };
const streets = new Map();
const buildings = [];

for (let index = 0; index < quads.length; index += 1) {
  const [south, west, north, east] = quads[index];
  const query = `[out:json][timeout:90];way["highway"~"^(motorway|trunk|primary|motorway_link|trunk_link|primary_link)$"](${south},${west},${north},${east});out geom;`;
  const payload = await ask(`regional-${index}`, query);
  takeStreets(payload, "fern");
  await pause();
}

for (const place of places) {
  const query = `[out:json][timeout:90];(way["highway"~"^(secondary|tertiary|unclassified|residential|living_street|secondary_link|tertiary_link)$"](around:${localRadius},${place.lat},${place.lon});way["building"](around:${buildingRadius},${place.lat},${place.lon}););out geom;`;
  const payload = await ask(`place-${place.id}`, query);
  takeStreets(payload, "nah");
  takeBuildings(payload, place.id);
  const count = buildings.filter((building) => building.place === place.id).length;
  console.log(`${place.id}: ${count} Gebäude`);
  await pause();
}

const streetRows = mergeStreets([...streets.values()].sort(compareStreet));
const buildingRows = thinBuildings(buildings).sort(compareBuilding);
const fern = streetRows.filter((street) => street.kind === "fern").length;
const nah = streetRows.length - fern;
console.log(`Straßen ${streetRows.length} (fern ${fern}, nah ${nah}), Gebäude ${buildingRows.length}`);
writeFileSync(outFile, render(streetRows, buildingRows), "utf8");
console.log(outFile);

function readPlaces() {
  const source = readFileSync(resolve(root, "packages/sim/src/rheinRuhr.ts"), "utf8");
  const found = [...source.matchAll(/id: "([^"]+)", osm: \d+, place: "[^"]+", lat: "([^"]+)", lon: "([^"]+)"/g)];
  if (found.length !== 32) throw new Error(`Erwarte 32 Orte, gefunden ${found.length}`);
  return found.map((match) => ({ id: match[1], lat: Number(match[2]), lon: Number(match[3]) }));
}

async function ask(name, query) {
  const file = resolve(cacheDir, `${name}.json`);
  if (existsSync(file)) {
    const cached = JSON.parse(readFileSync(file, "utf8"));
    if (!stamp.value && cached.osm3s?.timestamp_osm_base) stamp.value = cached.osm3s.timestamp_osm_base;
    return cached;
  }
  let lastError = "keine Antwort";
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "User-Agent": "Sweepers-city-map/1.0",
      },
      body: query,
    });
    const text = await response.text();
    if (!response.ok || text.includes("Error</strong>") || text.startsWith("<")) {
      lastError = `${response.status} ${text.slice(0, 240)}`;
      console.log(`${name} Versuch ${attempt}: ${lastError}`);
      await pause(15000 * attempt);
      continue;
    }
    const payload = JSON.parse(text);
    if (!Array.isArray(payload.elements)) throw new Error(`${name} ohne Elemente`);
    if (!stamp.value && payload.osm3s?.timestamp_osm_base) stamp.value = payload.osm3s.timestamp_osm_base;
    writeFileSync(file, text);
    console.log(`${name}: ${payload.elements.length} Elemente`);
    return payload;
  }
  throw new Error(`${name}: ${lastError}`);
}

function takeStreets(payload, fallbackKind) {
  for (const element of payload.elements) {
    if (element.type !== "way" || !element.tags?.highway || !Array.isArray(element.geometry)) continue;
    const kind = kindOf(element.tags.highway, fallbackKind);
    if (!kind) continue;
    const points = simplify(project(element.geometry), kind === "fern" ? 3 : 1.4);
    if (points.length < 2) continue;
    const id = String(element.id);
    const existing = streets.get(id);
    if (!existing || (existing.kind === "nah" && kind === "fern")) streets.set(id, { kind, points });
  }
}

function takeBuildings(payload, place) {
  const anchor = project([{ lon: places.find((item) => item.id === place).lon, lat: places.find((item) => item.id === place).lat }])[0];
  for (const element of payload.elements) {
    if (element.type !== "way" || element.tags?.building === undefined || !Array.isArray(element.geometry)) continue;
    const points = simplify(project(element.geometry), 0.8).slice(0, 8);
    if (points.length < 3) continue;
    const footprint = area(points);
    if (footprint < minBuildingArea) continue;
    const center = centroid(points);
    if (Math.hypot(center.x - anchor.x, center.y - anchor.y) > buildingRadius / 9.6) continue;
    buildings.push({ place, points, area: footprint, center });
  }
}

function thinBuildings(rows) {
  const best = new Map();
  for (const row of rows) {
    const key = `${row.place}:${Math.floor(row.center.x / cell)}:${Math.floor(row.center.y / cell)}`;
    const current = best.get(key);
    if (!current || row.area > current.area) best.set(key, row);
  }
  const byPlace = new Map();
  for (const row of best.values()) {
    const list = byPlace.get(row.place) ?? [];
    list.push(row);
    byPlace.set(row.place, list);
  }
  const kept = [];
  for (const list of byPlace.values()) {
    list.sort((a, b) => b.area - a.area || a.center.x - b.center.x || a.center.y - b.center.y);
    kept.push(...list.slice(0, maxBuildingsPerPlace));
  }
  return kept;
}

function kindOf(highway, fallbackKind) {
  if (/^(motorway|trunk|primary)(_link)?$/.test(highway)) return "fern";
  if (/^(secondary|tertiary|unclassified|residential|living_street)(_link)?$/.test(highway)) return "nah";
  return fallbackKind === "fern" ? null : null;
}

function project(geometry) {
  const points = [];
  for (const node of geometry) {
    const x = Math.round(((node.lon - minLon) / (maxLon - minLon)) * scale);
    const y = scale - Math.round(((node.lat - minLat) / (maxLat - minLat)) * scale);
    const previous = points[points.length - 1];
    if (previous && previous.x === x && previous.y === y) continue;
    points.push({ x, y });
  }
  if (points.length > 1 && points[0].x === points[points.length - 1].x && points[0].y === points[points.length - 1].y) points.pop();
  return points;
}

function simplify(points, epsilon) {
  if (points.length < 3) return points;
  const kept = douglas(points, 0, points.length - 1, epsilon);
  kept.sort((a, b) => a - b);
  const result = [];
  for (const index of kept) {
    const point = points[index];
    const previous = result[result.length - 1];
    if (previous && previous.x === point.x && previous.y === point.y) continue;
    result.push(point);
  }
  return result;
}

function douglas(points, start, end, epsilon) {
  const from = points[start];
  const to = points[end];
  let farthest = -1;
  let distance = 0;
  for (let index = start + 1; index < end; index += 1) {
    const candidate = deviation(points[index], from, to);
    if (candidate > distance) {
      distance = candidate;
      farthest = index;
    }
  }
  if (farthest >= 0 && distance > epsilon) {
    return douglas(points, start, farthest, epsilon).concat(douglas(points, farthest, end, epsilon));
  }
  return [start, end];
}

function deviation(point, from, to) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy);
  if (length === 0) return Math.hypot(point.x - from.x, point.y - from.y);
  return Math.abs(dy * point.x - dx * point.y + to.x * from.y - to.y * from.x) / length;
}

function area(points) {
  let sum = 0;
  for (let index = 0; index < points.length; index += 1) {
    const next = points[(index + 1) % points.length];
    sum += points[index].x * next.y - next.x * points[index].y;
  }
  return Math.abs(sum) / 2;
}

function centroid(points) {
  let x = 0;
  let y = 0;
  for (const point of points) {
    x += point.x;
    y += point.y;
  }
  return { x: x / points.length, y: y / points.length };
}

function compareStreet(a, b) {
  return a.kind.localeCompare(b.kind) || a.points[0].x - b.points[0].x || a.points[0].y - b.points[0].y || a.points.length - b.points.length;
}

function compareBuilding(a, b) {
  return a.place.localeCompare(b.place) || a.points[0].x - b.points[0].x || a.points[0].y - b.points[0].y;
}

function mergeStreets(rows) {
  const grouped = { fern: [], nah: [] };
  for (const row of rows) grouped[row.kind].push(row.points);
  return [
    ...joinLines(grouped.fern).map((points) => ({ kind: "fern", points })),
    ...joinLines(grouped.nah).map((points) => ({ kind: "nah", points })),
  ];
}

function joinLines(lines) {
  const unused = new Set(lines.map((_, index) => index));
  const starts = new Map();
  const ends = new Map();
  lines.forEach((points, index) => {
    pushAt(starts, pointKey(points[0]), index);
    pushAt(ends, pointKey(points[points.length - 1]), index);
  });
  const joined = [];
  for (const seed of [...unused]) {
    if (!unused.has(seed)) continue;
    unused.delete(seed);
    const points = lines[seed].slice();
    const prefixes = [];
    const suffixes = [];
    let backward = nextBackward(points[0], lines, unused, starts, ends);
    while (backward && backward.length > 0) {
      prefixes.push(backward);
      backward = nextBackward(backward[0], lines, unused, starts, ends);
    }
    let forward = nextForward(points[points.length - 1], lines, unused, starts, ends);
    while (forward && forward.length > 0) {
      suffixes.push(forward);
      forward = nextForward(forward[forward.length - 1], lines, unused, starts, ends);
    }
    joined.push(prefixes.reverse().flat().concat(points, suffixes.flat()));
  }
  return joined;
}

function nextForward(end, lines, unused, starts, ends) {
  const forward = take(starts, pointKey(end), unused);
  if (forward !== undefined) return lines[forward].slice(1);
  const backward = take(ends, pointKey(end), unused);
  if (backward !== undefined) return lines[backward].slice(0, -1).reverse();
  return null;
}

function nextBackward(start, lines, unused, starts, ends) {
  const backward = take(ends, pointKey(start), unused);
  if (backward !== undefined) return lines[backward].slice(0, -1);
  const forward = take(starts, pointKey(start), unused);
  if (forward !== undefined) return lines[forward].slice(1).reverse();
  return null;
}

function take(index, key, unused) {
  const list = index.get(key);
  if (!list) return undefined;
  const found = list.find((candidate) => unused.has(candidate));
  if (found === undefined) return undefined;
  unused.delete(found);
  return found;
}

function pushAt(index, key, value) {
  const list = index.get(key) ?? [];
  list.push(value);
  index.set(key, list);
}

function pointKey(point) {
  return `${point.x},${point.y}`;
}

function render(streetRowsOut, buildingRowsOut) {
  const queriedAt = stamp.value || "unbekannt";
  const placeIds = [...new Set(buildingRowsOut.map((building) => building.place))];
  const streetLiteral = streetRowsOut.map((street) => `  [${street.kind === "fern" ? 0 : 1},${street.points.map((point) => `${point.x},${point.y}`).join(",")}],`).join("\n");
  const buildingLiteral = buildingRowsOut.map((building) => `  [${placeIds.indexOf(building.place)},${building.points.map((point) => `${point.x},${point.y}`).join(",")}],`).join("\n");
  return `// Erzeugt von tools/city/fetch-rhein-ruhr-map.mjs. Nicht von Hand ändern.
// OpenStreetMap-Mitwirkende, ODbL. Abfrage ${queriedAt}. Vereinfachte Vektoren, keine Missionsregel.

export interface CityMapPoint {
  readonly x: number;
  readonly y: number;
}

export interface CityMapStreet {
  readonly kind: "fern" | "nah";
  readonly points: readonly CityMapPoint[];
}

export interface CityMapBuilding {
  readonly place: string;
  readonly points: readonly CityMapPoint[];
}

export const RHEIN_RUHR_MAP_SOURCE = {
  origin: "OpenStreetMap",
  license: "ODbL-1.0",
  copyright: "The data included in this document is from www.openstreetmap.org. The data is made available under ODbL.",
  endpoint: "${endpoint}",
  queriedAt: "${queriedAt}",
  bbox: "50.65,6.35,51.70,7.95",
  scale: "${scale}",
  minLon: "${minLon}",
  maxLon: "${maxLon}",
  minLat: "${minLat}",
  maxLat: "${maxLat}",
  roadsLive: "ja",
  buildingsLive: "ja",
  regionalHighways: "motorway, trunk, primary und Link-Wege im gesamten Ausschnitt",
  localHighways: "secondary, tertiary, unclassified, residential, living_street und Link-Wege, ${localRadius} m um jeden Ort",
  buildings: "Gebäudeumrisse, ${buildingRadius} m um jeden Ort, je ${cell} Karteneinheiten die größte Fläche, höchstens ${maxBuildingsPerPlace}",
} as const;

const PLACE_IDS = ${JSON.stringify(placeIds)} as const;

const STREET_ROWS: readonly (readonly number[])[] = [
${streetLiteral}
];

const BUILDING_ROWS: readonly (readonly number[])[] = [
${buildingLiteral}
];

export const RHEIN_RUHR_STREETS: readonly CityMapStreet[] = STREET_ROWS.map((row) => ({
  kind: row[0] === 0 ? "fern" : "nah",
  points: pairs(row),
}));

export const RHEIN_RUHR_BUILDINGS: readonly CityMapBuilding[] = BUILDING_ROWS.map((row) => {
  const place = PLACE_IDS[row[0] ?? 0] ?? PLACE_IDS[0] ?? "";
  return { place, points: pairs(row) };
});

function pairs(row: readonly number[]): CityMapPoint[] {
  const points: CityMapPoint[] = [];
  for (let index = 1; index + 1 < row.length; index += 2) {
    const x = row[index];
    const y = row[index + 1];
    if (x === undefined || y === undefined) continue;
    points.push({ x, y });
  }
  return points;
}

export function rheinRuhrMapPoint(lon: number, lat: number): CityMapPoint {
  return {
    x: Math.round(((lon - ${minLon}) / (${maxLon} - ${minLon})) * ${scale}),
    y: ${scale} - Math.round(((lat - ${minLat}) / (${maxLat} - ${minLat})) * ${scale}),
  };
}
`;
}

function pause(ms = 1200) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
}
