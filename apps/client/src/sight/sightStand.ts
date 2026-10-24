import {
  actionAp,
  AIM_BONUS,
  inSector,
  pathTo,
  previewShot,
  RULES_VERSION,
  PROTOCOL_VERSION,
  stepAp,
  type BattleMap,
  type BodyPartId,
  type Cell,
  type Direction,
  type PartState,
} from "@neon/sim";
import { readParts } from "../mission/WoundList.tsx";

const COMMAND_ID = /^[A-Za-z0-9-]{1,40}$/;
const OBJECT_ID = /^[a-z0-9-]{1,48}$/;
const NAME = /^[\p{L}\p{N} ]{1,40}$/u;
const FAMILIES = ["office", "laboratory", "factory"] as const;
const METHODS = ["bsp", "graph", "circulation"] as const;
const PHASES = ["crew", "enemy", "ended"] as const;
const OUTCOMES = ["", "sieg", "niederlage"] as const;
const TEAMS = ["crew", "enemy"] as const;
const STATUSES = ["active", "down", "extracted"] as const;
const EDGES = ["n", "e", "s", "w"] as const;

export type SightFamily = (typeof FAMILIES)[number];

export interface SightLink {
  readonly id: string;
  readonly kind: "stair" | "passenger" | "freight";
  readonly x: number;
  readonly y: number;
  readonly toZ: number;
  readonly toX: number;
  readonly toY: number;
}

export interface SightFloor {
  readonly z: number;
  readonly known: readonly Cell[];
  readonly visible: readonly Cell[];
  readonly walls: readonly Cell[];
  readonly cover: readonly SightCover[];
  readonly links: readonly SightLink[];
}

export interface SightUnit {
  readonly id: string;
  readonly name: string;
  readonly team: "crew" | "enemy";
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly hp: number;
  readonly maxHp: number;
  readonly ap: number;
  readonly range: number;
  readonly magazine: number;
  readonly magazineSize: number;
  readonly reserveMagazines: number;
  readonly status: "active" | "down" | "extracted";
  readonly aiming: boolean;
  readonly medkits: number;
  readonly parts: readonly PartState[];
  readonly overwatch: Direction | null;
}

export interface SightCover {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly protects: Direction;
}

export interface SightPlace {
  readonly id: string;
  readonly x: number;
  readonly y: number;
}

export interface SightStand {
  readonly ack: number;
  readonly commandId: string;
  readonly revision: number;
  readonly rulesVersion: number;
  readonly round: number;
  readonly phase: "crew" | "enemy" | "ended";
  readonly width: number;
  readonly height: number;
  readonly known: readonly Cell[];
  readonly visible: readonly Cell[];
  readonly walls: readonly Cell[];
  readonly cover: readonly SightCover[];
  readonly door: SightPlace | null;
  readonly doorOpen: boolean;
  readonly terminal: SightPlace | null;
  readonly extraction: readonly Cell[];
  readonly units: readonly SightUnit[];
  readonly levelCount: number;
  readonly floors: readonly SightFloor[];
  readonly links: readonly SightLink[];
  readonly copies: number;
  readonly outcome: "" | "sieg" | "niederlage";
  readonly notice: string;
  readonly family: SightFamily;
  readonly seed: number;
  readonly method: "bsp" | "graph" | "circulation";
  readonly rooms: number;
}

interface WishBase {
  readonly protocol: typeof PROTOCOL_VERSION;
  readonly area: "sicht";
  readonly commandId: string;
}

export interface SightStep extends Cell {
  readonly z?: number;
}

export interface SightMoveBody extends WishBase {
  readonly kind: "move";
  readonly unitId: string;
  readonly path: readonly SightStep[];
}

export interface SightTargetBody extends WishBase {
  readonly kind: "shoot" | "interact";
  readonly unitId: string;
  readonly targetId: string;
}

export interface SightUnitBody extends WishBase {
  readonly kind: "extract" | "reload" | "aim";
  readonly unitId: string;
}

export interface SightHealBody extends WishBase {
  readonly kind: "heal";
  readonly unitId: string;
  readonly targetId: string;
  readonly part: BodyPartId;
}

export interface SightOverwatchBody extends WishBase {
  readonly kind: "overwatch";
  readonly unitId: string;
  readonly direction: Direction;
}

export interface SightPlainBody extends WishBase {
  readonly kind: "end" | "reset";
}

export type SightWishBody = SightMoveBody | SightTargetBody | SightUnitBody | SightHealBody | SightOverwatchBody | SightPlainBody;

export function sightMove(commandId: string, unitId: string, path: readonly SightStep[]): SightMoveBody {
  return {
    protocol: PROTOCOL_VERSION,
    area: "sicht",
    commandId,
    kind: "move",
    unitId,
    path: path.map((cell) => (cell.z === undefined ? { x: cell.x, y: cell.y } : { x: cell.x, y: cell.y, z: cell.z })),
  };
}

export function sightShoot(commandId: string, unitId: string, targetId: string): SightTargetBody {
  return { protocol: PROTOCOL_VERSION, area: "sicht", commandId, kind: "shoot", unitId, targetId };
}

export function sightInteract(commandId: string, unitId: string, targetId: string): SightTargetBody {
  return { protocol: PROTOCOL_VERSION, area: "sicht", commandId, kind: "interact", unitId, targetId };
}

export function sightExtract(commandId: string, unitId: string): SightUnitBody {
  return { protocol: PROTOCOL_VERSION, area: "sicht", commandId, kind: "extract", unitId };
}

export function sightReload(commandId: string, unitId: string): SightUnitBody {
  return { protocol: PROTOCOL_VERSION, area: "sicht", commandId, kind: "reload", unitId };
}

export function sightAim(commandId: string, unitId: string): SightUnitBody {
  return { protocol: PROTOCOL_VERSION, area: "sicht", commandId, kind: "aim", unitId };
}

export function sightHeal(commandId: string, unitId: string, targetId: string, part: BodyPartId): SightHealBody {
  return { protocol: PROTOCOL_VERSION, area: "sicht", commandId, kind: "heal", unitId, targetId, part };
}

export function sightOverwatch(commandId: string, unitId: string, direction: Direction): SightOverwatchBody {
  return { protocol: PROTOCOL_VERSION, area: "sicht", commandId, kind: "overwatch", unitId, direction };
}

export function sightEnd(commandId: string): SightPlainBody {
  return { protocol: PROTOCOL_VERSION, area: "sicht", commandId, kind: "end" };
}

export function sightReset(commandId: string): SightPlainBody {
  return { protocol: PROTOCOL_VERSION, area: "sicht", commandId, kind: "reset" };
}

export function readSightStand(payload: unknown): SightStand | null {
  if (!payload || typeof payload !== "object") return null;
  const value = payload as Record<string, unknown>;
  const width = bounded(value.width, 1, 32);
  const height = bounded(value.height, 1, 32);
  const ack = bounded(value.ack, 0, Number.MAX_SAFE_INTEGER);
  const revision = bounded(value.revision, 0, Number.MAX_SAFE_INTEGER);
  const round = bounded(value.round, 1, Number.MAX_SAFE_INTEGER);
  const copies = bounded(value.copies, 0, 2);
  const seed = bounded(value.seed, 0, 0xffffffff);
  const rooms = bounded(value.rooms, 1, 80);
  if (
    width === null ||
    height === null ||
    ack === null ||
    revision === null ||
    round === null ||
    copies === null ||
    seed === null ||
    rooms === null ||
    value.rulesVersion !== RULES_VERSION ||
    value.doorOpen !== true && value.doorOpen !== false ||
    !includes(PHASES, value.phase) ||
    !includes(OUTCOMES, value.outcome) ||
    !includes(FAMILIES, value.family) ||
    !includes(METHODS, value.method) ||
    !commandIdOk(value.commandId) ||
    !noticeOk(value.notice)
  ) {
    return null;
  }
  const known = cellsOf(value.known, width, height, width * height);
  const visible = cellsOf(value.visible, width, height, width * height);
  const walls = cellsOf(value.walls, width, height, width * height);
  const extraction = cellsOf(value.extraction, width, height, 16);
  const door = placeOf(value.door, width, height);
  const terminal = placeOf(value.terminal, width, height);
  const cover = coverOf(value.cover, width, height);
  const units = unitsOf(value.units, width, height);
  if (!known || !visible || !walls || !extraction || door === undefined || terminal === undefined || !cover || !units) {
    return null;
  }
  const seen = new Set(known.map(key));
  if (!contained(visible, seen) || !contained(walls, seen) || !contained(extraction, seen)) return null;
  if (door && !seen.has(key(door))) return null;
  if (terminal && !seen.has(key(terminal))) return null;
  for (const item of cover) if (!seen.has(key(item))) return null;
  const floors = floorsOf(value.floors, value.levelCount, width, height, { known, visible, walls, cover });
  if (!floors) return null;
  for (const unit of units) {
    const home = floors.find((floor) => floor.z === unit.z);
    if (!home) return null;
    const id = key(unit);
    const knownHere = new Set(home.known.map(key));
    const visibleHere = new Set(home.visible.map(key));
    if (unit.team === "enemy" && !visibleHere.has(id)) return null;
    if (unit.team === "crew" && !knownHere.has(id)) return null;
  }
  return {
    ack,
    commandId: value.commandId,
    revision,
    rulesVersion: RULES_VERSION,
    round,
    phase: value.phase,
    width,
    height,
    known,
    visible,
    walls,
    cover,
    door,
    doorOpen: value.doorOpen,
    terminal,
    extraction,
    units,
    levelCount: floors.length,
    floors,
    links: floors.find((floor) => floor.z === 0)?.links ?? [],
    copies,
    outcome: value.outcome,
    notice: value.notice,
    family: value.family,
    seed,
    method: value.method,
    rooms,
  };
}

export function shownSight(stand: SightStand, z: number): SightStand {
  const floor = stand.floors.find((item) => item.z === z) ?? stand.floors[0];
  if (!floor) return stand;
  const units = stand.units.filter((unit) => unit.z === floor.z);
  if (floor.z === 0) return { ...stand, units, links: floor.links };
  return {
    ...stand,
    known: floor.known,
    visible: floor.visible,
    walls: floor.walls,
    cover: floor.cover,
    links: floor.links,
    door: null,
    terminal: null,
    extraction: [],
    units,
  };
}

export function sightPath(stand: SightStand, unitId: string, goal: Cell): readonly Cell[] | null {
  const unit = activeCrew(stand, unitId);
  if (!unit) return null;
  const stride = stepAp(unit.parts);
  if (unit.ap < stride) return null;
  return pathTo(previewMap(stand), blockers(stand, unitId), { x: unit.x, y: unit.y }, goal, Math.floor(unit.ap / stride));
}

export function sightReach(stand: SightStand, unitId: string): Cell[] {
  const unit = activeCrew(stand, unitId);
  const stride = unit ? stepAp(unit.parts) : 0;
  if (!unit || unit.ap < stride) return [];
  const map = previewMap(stand);
  const walls = new Set(map.walls.map(key));
  const blocked = new Set(blockers(stand, unitId).map(key));
  const steps = [
    { x: 0, y: -1 },
    { x: 1, y: 0 },
    { x: 0, y: 1 },
    { x: -1, y: 0 },
  ];
  const seen = new Set<string>([key(unit)]);
  const queue: Array<{ x: number; y: number; cost: number }> = [{ x: unit.x, y: unit.y, cost: 0 }];
  const found: Cell[] = [];
  let head = 0;
  while (head < queue.length) {
    const current = queue[head];
    head += 1;
    if (!current || current.cost + stride > unit.ap) continue;
    for (const step of steps) {
      const next = { x: current.x + step.x, y: current.y + step.y };
      const id = key(next);
      if (seen.has(id)) continue;
      seen.add(id);
      if (next.x < 0 || next.y < 0 || next.x >= map.width || next.y >= map.height) continue;
      if (walls.has(id) || blocked.has(id)) continue;
      found.push(next);
      queue.push({ x: next.x, y: next.y, cost: current.cost + stride });
    }
  }
  found.sort((left, right) => left.y - right.y || left.x - right.x);
  return found;
}

export function sightWatch(stand: SightStand): Cell[] {
  const cells: Cell[] = [];
  const seen = new Set<string>();
  for (const unit of stand.units) {
    if (unit.status !== "active" || !unit.overwatch) continue;
    for (const floor of stand.known) {
      if (!inSector(unit, floor, unit.overwatch)) continue;
      const id = key(floor);
      if (seen.has(id)) continue;
      seen.add(id);
      cells.push({ x: floor.x, y: floor.y });
    }
  }
  cells.sort((left, right) => left.y - right.y || left.x - right.x);
  return cells;
}

export function shotLine(stand: SightStand, unitId: string, targetId: string): string {
  const from = stand.units.find((unit) => unit.id === unitId);
  const to = stand.units.find((unit) => unit.id === targetId);
  if (!from || !to || from.team !== "crew" || to.team !== "enemy") return "";
  try {
    const preview = previewShot(previewMap(stand), from, to, from.aiming ? AIM_BONUS : 0);
    if (preview.blocked || preview.chance === null) return "Keine Schusslinie.";
    const coverText = preview.protectedEdgeCrossed ? `Deckung ${preview.coverPenalty}.` : "Keine Deckung auf dem Zielfeld.";
    const rangeText = preview.distance > from.range ? " Außer Reichweite." : "";
    return `${preview.base} + ${preview.aimBonus} − ${preview.distancePenalty} − ${preview.coverPenalty} = ${preview.chance}. ${coverText}${rangeText}`;
  } catch {
    return "";
  }
}

function previewMap(stand: SightStand): BattleMap {
  const known = new Set(stand.known.map(key));
  const walls: Cell[] = [];
  for (let y = 0; y < stand.height; y += 1) {
    for (let x = 0; x < stand.width; x += 1) {
      if (!known.has(`${x},${y}`)) walls.push({ x, y });
    }
  }
  for (const wall of stand.walls) walls.push({ x: wall.x, y: wall.y });
  if (stand.door && !stand.doorOpen) walls.push({ x: stand.door.x, y: stand.door.y });
  return {
    width: stand.width,
    height: stand.height,
    walls,
    lowCover: stand.cover.map((cover) => ({ id: cover.id, x: cover.x, y: cover.y, protects: cover.protects })),
  };
}

function blockers(stand: SightStand, unitId: string): Cell[] {
  const cells: Cell[] = [];
  if (stand.terminal) cells.push({ x: stand.terminal.x, y: stand.terminal.y });
  for (const unit of stand.units) {
    if (unit.id === unitId || unit.status === "extracted") continue;
    cells.push({ x: unit.x, y: unit.y });
  }
  return cells;
}

function activeCrew(stand: SightStand, unitId: string): SightUnit | null {
  const unit = stand.units.find((item) => item.id === unitId);
  if (!unit || unit.team !== "crew" || unit.status !== "active") return null;
  return unit;
}

function cellsOf(value: unknown, width: number, height: number, max: number): Cell[] | null {
  if (!Array.isArray(value) || value.length > max) return null;
  const seen = new Set<string>();
  const cells: Cell[] = [];
  for (const entry of value) {
    const cell = cellOf(entry, width, height);
    if (!cell) return null;
    const id = key(cell);
    if (seen.has(id)) return null;
    seen.add(id);
    cells.push(cell);
  }
  return cells;
}

function coverOf(value: unknown, width: number, height: number): SightCover[] | null {
  if (!Array.isArray(value) || value.length > width * height) return null;
  const seen = new Set<string>();
  const cover: SightCover[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== "object") return null;
    const record = entry as Record<string, unknown>;
    const cell = cellOf(record, width, height);
    if (!cell || typeof record.id !== "string" || !OBJECT_ID.test(record.id) || !includes(EDGES, record.protects)) return null;
    const id = `${cell.x},${cell.y},${record.protects}`;
    if (seen.has(id)) return null;
    seen.add(id);
    cover.push({ id: record.id, x: cell.x, y: cell.y, protects: record.protects });
  }
  return cover;
}

function unitsOf(value: unknown, width: number, height: number): SightUnit[] | null {
  if (!Array.isArray(value) || value.length > 16) return null;
  const seen = new Set<string>();
  const units: SightUnit[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== "object") return null;
    const record = entry as Record<string, unknown>;
    const x = bounded(record.x, 0, width - 1);
    const y = bounded(record.y, 0, height - 1);
    const z = record.z === undefined ? 0 : bounded(record.z, 0, 7);
    const hp = bounded(record.hp, 0, 99);
    const maxHp = bounded(record.maxHp, 1, 99);
    const parts = readParts(record.parts);
    const ap = bounded(record.ap, 0, 8);
    const range = bounded(record.range, 1, 20);
    const magazine = bounded(record.magazine, 0, 12);
    const magazineSize = bounded(record.magazineSize, 1, 12);
    const reserveMagazines = bounded(record.reserveMagazines, 0, 4);
    if (
      x === null ||
      y === null ||
      z === null ||
      hp === null ||
      maxHp === null ||
      ap === null ||
      range === null ||
      magazine === null ||
      magazineSize === null ||
      reserveMagazines === null ||
      parts === null ||
      hp > maxHp ||
      magazine > magazineSize ||
      record.aiming !== true && record.aiming !== false ||
      (record.medkits !== 0 && record.medkits !== 1) ||
      !(record.overwatch === null || includes(EDGES, record.overwatch)) ||
      typeof record.id !== "string" ||
      !OBJECT_ID.test(record.id) ||
      typeof record.name !== "string" ||
      !NAME.test(record.name) ||
      !includes(TEAMS, record.team) ||
      !includes(STATUSES, record.status) ||
      seen.has(record.id)
    ) {
      return null;
    }
    seen.add(record.id);
    units.push({
      id: record.id,
      name: record.name,
      team: record.team,
      x,
      y,
      z,
      hp,
      maxHp,
      ap,
      range,
      magazine,
      magazineSize,
      reserveMagazines,
      status: record.status,
      aiming: record.aiming,
      medkits: record.medkits,
      parts,
      overwatch: record.overwatch,
    });
  }
  return units;
}

const LINK_KINDS = ["stair", "passenger", "freight"] as const;

function floorsOf(
  value: unknown,
  declared: unknown,
  width: number,
  height: number,
  ground: { known: readonly Cell[]; visible: readonly Cell[]; walls: readonly Cell[]; cover: readonly SightCover[] },
): SightFloor[] | null {
  if (value === undefined) {
    if (declared !== undefined && declared !== 1) return null;
    return [{ z: 0, known: ground.known, visible: ground.visible, walls: ground.walls, cover: ground.cover, links: [] }];
  }
  if (!Array.isArray(value) || value.length < 1 || value.length > 8) return null;
  const floors: SightFloor[] = [];
  const seenZ = new Set<number>();
  for (const entry of value) {
    if (!entry || typeof entry !== "object") return null;
    const record = entry as Record<string, unknown>;
    const z = bounded(record.z, 0, 7);
    const known = cellsOf(record.known, width, height, width * height);
    const visible = cellsOf(record.visible, width, height, width * height);
    const walls = cellsOf(record.walls, width, height, width * height);
    const cover = coverOf(record.cover, width, height);
    const links = linksOf(record.links, width, height);
    if (z === null || seenZ.has(z) || !known || !visible || !walls || !cover || !links) return null;
    const knownKeys = new Set(known.map(key));
    if (!contained(visible, knownKeys) || !contained(walls, knownKeys)) return null;
    if (cover.some((item) => !knownKeys.has(key(item))) || links.some((link) => !knownKeys.has(key(link)))) return null;
    seenZ.add(z);
    floors.push({ z, known, visible, walls, cover, links });
  }
  floors.sort((left, right) => left.z - right.z);
  const plate = floors.find((floor) => floor.z === 0);
  if (!plate) return null;
  if (!sameCells(plate.known, ground.known) || !sameCells(plate.visible, ground.visible) || !sameCells(plate.walls, ground.walls) || !sameCovers(plate.cover, ground.cover)) return null;
  const count = declared === undefined ? floors.length : bounded(declared, 1, 8);
  if (count === null || count !== floors.length) return null;
  return floors;
}

function linksOf(value: unknown, width: number, height: number): SightLink[] | null {
  if (!Array.isArray(value) || value.length > 16) return null;
  const links: SightLink[] = [];
  const seen = new Set<string>();
  for (const entry of value) {
    if (!entry || typeof entry !== "object") return null;
    const record = entry as Record<string, unknown>;
    const x = bounded(record.x, 0, width - 1);
    const y = bounded(record.y, 0, height - 1);
    const toZ = bounded(record.toZ, 0, 7);
    const toX = bounded(record.toX, 0, width - 1);
    const toY = bounded(record.toY, 0, height - 1);
    if (
      x === null ||
      y === null ||
      toZ === null ||
      toX === null ||
      toY === null ||
      typeof record.id !== "string" ||
      !OBJECT_ID.test(record.id) ||
      seen.has(record.id) ||
      !includes(LINK_KINDS, record.kind)
    ) {
      return null;
    }
    seen.add(record.id);
    links.push({ id: record.id, kind: record.kind, x, y, toZ, toX, toY });
  }
  return links;
}

function sameCells(left: readonly Cell[], right: readonly Cell[]): boolean {
  return left.map(key).sort().join("|") === right.map(key).sort().join("|");
}

function sameCovers(left: readonly SightCover[], right: readonly SightCover[]): boolean {
  const mark = (cover: SightCover) => `${cover.id}:${cover.x},${cover.y}:${cover.protects}`;
  return left.map(mark).sort().join("|") === right.map(mark).sort().join("|");
}

function placeOf(value: unknown, width: number, height: number): SightPlace | null | undefined {
  if (value === null) return null;
  if (!value || typeof value !== "object") return undefined;
  const record = value as Record<string, unknown>;
  const cell = cellOf(record, width, height);
  if (!cell || typeof record.id !== "string" || !OBJECT_ID.test(record.id)) return undefined;
  return { id: record.id, x: cell.x, y: cell.y };
}

function cellOf(value: unknown, width: number, height: number): Cell | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const x = bounded(record.x, 0, width - 1);
  const y = bounded(record.y, 0, height - 1);
  if (x === null || y === null) return null;
  return { x, y };
}

function contained(cells: readonly Cell[], known: ReadonlySet<string>): boolean {
  return cells.every((cell) => known.has(key(cell)));
}

function bounded(value: unknown, min: number, max: number): number | null {
  if (typeof value !== "number" || !Number.isInteger(value) || value < min || value > max) return null;
  return value;
}

function commandIdOk(value: unknown): value is string {
  return typeof value === "string" && (value === "" || COMMAND_ID.test(value));
}

function noticeOk(value: unknown): value is string {
  return typeof value === "string" && value.length <= 200 && !/[\u0000-\u001F]/.test(value);
}

function includes<T extends string>(options: readonly T[], value: unknown): value is T {
  return typeof value === "string" && options.some((option) => option === value);
}

function key(cell: Cell): string {
  return `${cell.x},${cell.y}`;
}
