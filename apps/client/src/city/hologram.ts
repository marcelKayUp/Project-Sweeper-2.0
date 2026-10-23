import type { CityPicture } from "./cityPicture.ts";

const FOOT = 13;
const X_SCALE = 0.86;
const Y_SHEAR = 0.38;
const Y_SCALE = 0.64;
const PAD = 64;

export interface HoloFace {
  readonly kind: "side" | "front" | "roof";
  readonly points: string;
}

export interface HoloBlock {
  readonly id: string;
  readonly name: string;
  readonly side: string;
  readonly front: string;
  readonly roof: string;
  readonly faces: readonly HoloFace[];
}

export interface HoloStreet {
  readonly id: string;
  readonly x1: number;
  readonly y1: number;
  readonly x2: number;
  readonly y2: number;
}

export interface HoloCellSource {
  readonly id: string;
  readonly rings: readonly (readonly { readonly x: number; readonly y: number }[])[];
}

export interface HoloCell {
  readonly id: string;
  readonly fill: string;
  readonly d: string;
}

export interface HoloScene {
  readonly viewBox: string;
  readonly plate: string;
  readonly grid: readonly string[];
  readonly cells: readonly HoloCell[];
  readonly streets: readonly HoloStreet[];
  readonly blocks: readonly HoloBlock[];
}

interface Point {
  readonly x: number;
  readonly y: number;
}

interface Wall {
  readonly indexes: readonly [number, number];
  readonly wx: number;
  readonly wy: number;
}

function hashId(id: string): number {
  let hash = 2166136261;
  for (let i = 0; i < id.length; i += 1) {
    hash ^= id.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function blockHeight(id: string): number {
  return 36 + (hashId(id) % 89);
}

function channel(hex: string, index: number): number {
  const value = Number.parseInt(hex.slice(index, index + 2), 16);
  return Number.isFinite(value) ? value : 0;
}

function mix(from: string, to: string, t: number): string {
  const mixed = [1, 3, 5].map((index) => Math.round(channel(from, index) + (channel(to, index) - channel(from, index)) * t));
  return `#${mixed.map((value) => value.toString(16).padStart(2, "0")).join("")}`;
}

function project(x: number, y: number, z: number): Point {
  return {
    x: x * X_SCALE + y * Y_SHEAR,
    y: y * Y_SCALE - z,
  };
}

export function turnAround(x: number, y: number, cx: number, cy: number, turn: number): Point {
  const cos = Math.cos(turn);
  const sin = Math.sin(turn);
  const dx = x - cx;
  const dy = y - cy;
  return {
    x: cx + dx * cos - dy * sin,
    y: cy + dx * sin + dy * cos,
  };
}

export function projectTurned(x: number, y: number, z: number, cx: number, cy: number, turn: number): Point {
  const spun = turnAround(x, y, cx, cy, turn);
  return project(spun.x, spun.y, z);
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}

function chain(points: readonly Point[]): string {
  return points.map((point) => `${round(point.x)},${round(point.y)}`).join(" ");
}

function byteChannel(value: number): string {
  return Math.round(Math.min(255, Math.max(0, value))).toString(16).padStart(2, "0");
}

function hslToHex(hue: number, saturation: number, lightness: number): string {
  const chroma = (1 - Math.abs(2 * (lightness / 100) - 1)) * (saturation / 100);
  const hueStep = hue / 60;
  const secondary = chroma * (1 - Math.abs((hueStep % 2) - 1));
  const match = lightness / 100 - chroma / 2;
  let red = 0;
  let green = 0;
  let blue = 0;
  if (hueStep < 1) {
    red = chroma;
    green = secondary;
  } else if (hueStep < 2) {
    red = secondary;
    green = chroma;
  } else if (hueStep < 3) {
    green = chroma;
    blue = secondary;
  } else if (hueStep < 4) {
    green = secondary;
    blue = chroma;
  } else if (hueStep < 5) {
    red = secondary;
    blue = chroma;
  } else {
    red = chroma;
    blue = secondary;
  }
  return `#${byteChannel((red + match) * 255)}${byteChannel((green + match) * 255)}${byteChannel((blue + match) * 255)}`;
}

function cellFill(index: number): string {
  const hue = 164 + (index % 8) * 16;
  const lightness = 32 + Math.floor(index / 8) * 6;
  return hslToHex(hue, 48, lightness);
}

function face(points: readonly Point[], indexes: readonly number[]): Point[] {
  return indexes.map((index) => {
    const point = points[index];
    if (!point) throw new Error("Projektionspunkt fehlt");
    return point;
  });
}

function wallQuad(ground: readonly Point[], roof: readonly Point[], indexes: readonly [number, number]): string {
  const [from, to] = indexes;
  return chain(face(ground, [from, to]).concat(face(roof, [to, from])));
}

function facing(walls: readonly Wall[], score: (wall: Wall) => number, skip = -1): number {
  let winner = -1;
  let bestScore = Number.NEGATIVE_INFINITY;
  for (let index = 0; index < walls.length; index += 1) {
    if (index === skip) continue;
    const wall = walls[index];
    if (!wall) continue;
    const value = score(wall);
    if (winner < 0 || value > bestScore) {
      winner = index;
      bestScore = value;
    }
  }
  if (winner < 0) throw new Error("Wand fehlt");
  return winner;
}

function frameAround(points: readonly Point[], anchor: Point): string {
  let minX = anchor.x;
  let maxX = anchor.x;
  let minY = anchor.y;
  let maxY = anchor.y;
  for (const point of points) {
    if (point.x < minX) minX = point.x;
    if (point.x > maxX) maxX = point.x;
    if (point.y < minY) minY = point.y;
    if (point.y > maxY) maxY = point.y;
  }
  minX -= PAD;
  maxX += PAD;
  minY -= PAD;
  maxY += PAD;
  const halfW = Math.max(anchor.x - minX, maxX - anchor.x);
  const halfH = Math.max(anchor.y - minY, maxY - anchor.y);
  const left = anchor.x - halfW;
  const top = anchor.y - halfH;
  return `${round(left)} ${round(top)} ${round(halfW * 2)} ${round(halfH * 2)}`;
}

export function hologram(picture: CityPicture, cells: readonly HoloCellSource[] = [], turn = 0): HoloScene {
  const tone = (id: string) => {
    const blend = (hashId(id) % 1000) / 999;
    return {
      side: mix("#0c3a72", "#16527f", blend),
      front: mix("#1764c4", "#1aa4dc", blend),
      roof: mix("#3ecfff", "#c8fbff", blend),
    };
  };

  const xs = picture.blocks.map((block) => block.x);
  const ys = picture.blocks.map((block) => block.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const center = { x: (minX + maxX) / 2, y: (minY + maxY) / 2 };
  const occupied: Point[] = [];
  const placed = (x: number, y: number, z: number): Point => {
    const point = projectTurned(x, y, z, center.x, center.y, turn);
    occupied.push(point);
    return point;
  };

  const drafted = picture.blocks.map((block) => {
    const height = blockHeight(block.id);
    const colors = tone(block.id);
    const footprint = [
      { x: block.x - FOOT, y: block.y - FOOT },
      { x: block.x + FOOT, y: block.y - FOOT },
      { x: block.x + FOOT, y: block.y + FOOT },
      { x: block.x - FOOT, y: block.y + FOOT },
    ];
    const ground = footprint.map((corner) => placed(corner.x, corner.y, 0));
    const roof = footprint.map((corner) => placed(corner.x, corner.y, height));
    const spunWall = (indexes: readonly [number, number], nx: number, ny: number): Wall => {
      const spun = turnAround(nx, ny, 0, 0, turn);
      return { indexes, wx: spun.x, wy: spun.y };
    };
    const walls: readonly Wall[] = [
      spunWall([1, 2], 1, 0),
      spunWall([3, 2], 0, 1),
      spunWall([0, 3], -1, 0),
      spunWall([0, 1], 0, -1),
    ];
    const sideIndex = facing(walls, (wall) => wall.wx);
    const frontIndex = facing(walls, (wall) => wall.wy, sideIndex);
    const side = walls[sideIndex];
    const front = walls[frontIndex];
    if (!side || !front) throw new Error("Wand fehlt");
    const spun = turnAround(block.x, block.y, center.x, center.y, turn);
    return {
      id: block.id,
      name: block.name,
      x: spun.x,
      y: spun.y,
      ...colors,
      faces: [
        { kind: "side" as const, points: wallQuad(ground, roof, side.indexes) },
        { kind: "front" as const, points: wallQuad(ground, roof, front.indexes) },
        { kind: "roof" as const, points: chain(roof) },
      ],
    };
  });

  const plateWorld = [
    { x: minX - 48, y: minY - 48 },
    { x: maxX + 48, y: minY - 48 },
    { x: maxX + 48, y: maxY + 48 },
    { x: minX - 48, y: maxY + 48 },
  ];
  const platePoints = plateWorld.map((point) => placed(point.x, point.y, 0));
  const grid: Point[][] = [];
  for (let step = 0; step <= 4; step += 1) {
    const x = minX + ((maxX - minX) * step) / 4;
    const y = minY + ((maxY - minY) * step) / 4;
    grid.push([placed(x, minY, 0), placed(x, maxY, 0)]);
    grid.push([placed(minX, y, 0), placed(maxX, y, 0)]);
  }

  const streets = picture.streets.map((street) => {
    const from = placed(street.x1, street.y1, 0);
    const to = placed(street.x2, street.y2, 0);
    return { id: street.id, x1: round(from.x), y1: round(from.y), x2: round(to.x), y2: round(to.y) };
  });

  const drawnCells = cells.flatMap((cell, index) => {
    const rings = cell.rings.filter((ring) => ring.length >= 3);
    if (rings.length === 0) return [];
    const d = rings
      .map((ring) => {
        const turned = ring.map((corner) => turnAround(corner.x, corner.y, center.x, center.y, turn));
        const projected = turned.map((point) => project(point.x, point.y, 0));
        occupied.push(...projected);
        return `M ${chain(projected)} Z`;
      })
      .join(" ");
    return [{ id: cell.id, fill: cellFill(index), d }];
  });

  return {
    viewBox: frameAround(occupied, projectTurned(center.x, center.y, 0, center.x, center.y, turn)),
    plate: chain(platePoints),
    grid: grid.map(chain),
    cells: drawnCells,
    streets,
    blocks: drafted.sort((a, b) => a.y - b.y || a.x - b.x).map(({ x: _x, y: _y, ...block }) => block),
  };
}
