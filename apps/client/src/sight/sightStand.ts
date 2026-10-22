import {
  actionAp,
  AIM_BONUS,
  inSector,
  pathTo,
  previewShot,
  RULES_VERSION,
  PROTOCOL_VERSION,
  type BattleMap,
  type Cell,
  type Direction,
} from "@neon/sim";

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

export interface SightUnit {
  readonly id: string;
  readonly name: string;
  readonly team: "crew" | "enemy";
  readonly x: number;
  readonly y: number;
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

export interface SightMoveBody extends WishBase {
  readonly kind: "move";
  readonly unitId: string;
  readonly path: readonly Cell[];
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

export function sightMove(commandId: string, unitId: string, path: readonly Cell[]): SightMoveBody {
  return {
    protocol: PROTOCOL_VERSION,
    area: "sicht",
    commandId,
    kind: "move",
    unitId,
    path: path.map((cell) => ({ x: cell.x, y: cell.y })),
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

export function sightHeal(commandId: string, unitId: string, targetId: string): SightHealBody {
  return { protocol: PROTOCOL_VERSION, area: "sicht", commandId, kind: "heal", unitId, targetId };
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
  const visibleKeys = new Set(visible.map(key));
  for (const item of cover) if (!seen.has(key(item))) return null;
  for (const unit of units) {
    const id = key(unit);
    if (unit.team === "enemy" && !visibleKeys.has(id)) return null;
    if (unit.team === "crew" && !seen.has(id)) return null;
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
    copies,
    outcome: value.outcome,
    notice: value.notice,
    family: value.family,
    seed,
    method: value.method,
    rooms,
  };
}

export function sightPath(stand: SightStand, unitId: string, goal: Cell): readonly Cell[] | null {
  const unit = activeCrew(stand, unitId);
  if (!unit) return null;
  return pathTo(previewMap(stand), blockers(stand, unitId), { x: unit.x, y: unit.y }, goal, unit.ap);
}

export function sightReach(stand: SightStand, unitId: string): Cell[] {
  const unit = activeCrew(stand, unitId);
  if (!unit || unit.ap < actionAp("move")) return [];
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
    if (!current || current.cost >= unit.ap) continue;
    for (const step of steps) {
      const next = { x: current.x + step.x, y: current.y + step.y };
      const id = key(next);
      if (seen.has(id)) continue;
      seen.add(id);
      if (next.x < 0 || next.y < 0 || next.x >= map.width || next.y >= map.height) continue;
      if (walls.has(id) || blocked.has(id)) continue;
      found.push(next);
      queue.push({ x: next.x, y: next.y, cost: current.cost + actionAp("move") });
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
    const hp = bounded(record.hp, 0, 12);
    const maxHp = bounded(record.maxHp, 1, 12);
    const ap = bounded(record.ap, 0, 8);
    const range = bounded(record.range, 1, 20);
    const magazine = bounded(record.magazine, 0, 12);
    const magazineSize = bounded(record.magazineSize, 1, 12);
    const reserveMagazines = bounded(record.reserveMagazines, 0, 4);
    if (
      x === null ||
      y === null ||
      hp === null ||
      maxHp === null ||
      ap === null ||
      range === null ||
      magazine === null ||
      magazineSize === null ||
      reserveMagazines === null ||
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
      overwatch: record.overwatch,
    });
  }
  return units;
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
