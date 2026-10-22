import {
  actionAp,
  AIM_BONUS,
  EXTRACT_AP,
  inSector,
  INTERACT_AP,
  pathTo,
  previewShot,
  type BattleMap,
  type Cell,
  type Direction,
} from "@neon/sim";

const DIRECTIONS = ["n", "e", "s", "w"] as const;
const STEPS: readonly Cell[] = [
  { x: 0, y: -1 },
  { x: 1, y: 0 },
  { x: 0, y: 1 },
  { x: -1, y: 0 },
];

export type MissionAction =
  | { readonly kind: "move"; readonly x: number; readonly y: number }
  | { readonly kind: "interact"; readonly targetId: "terminal" | "shortcut" }
  | { readonly kind: "extract" }
  | { readonly kind: "shoot"; readonly targetId: string }
  | { readonly kind: "reload" }
  | { readonly kind: "aim" }
  | { readonly kind: "heal"; readonly targetId: string }
  | { readonly kind: "overwatch"; readonly direction: Direction }
  | { readonly kind: "ready" };

export interface TacticalUnit {
  readonly id: string;
  readonly name: string;
  readonly team: "crew" | "enemy";
  readonly weapon: "rifle" | "sidearm";
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
  readonly ready: boolean;
  readonly aiming: boolean;
  readonly medkits: number;
  readonly overwatch: Direction | null;
}

export interface TacticalCover {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly protects: Direction;
}

export interface TacticalPlace {
  readonly id: string;
  readonly x: number;
  readonly y: number;
}

export interface TacticalStand {
  readonly ownRunnerId: string;
  readonly round: number;
  readonly phase: "crew" | "enemy" | "ended";
  readonly copies: number;
  readonly doorOpen: boolean;
  readonly phaseSeconds: 60 | 90 | 120;
  readonly deadlineAt: number;
  readonly width: number;
  readonly height: number;
  readonly knownCells: readonly Cell[];
  readonly visibleCells: readonly Cell[];
  readonly walls: readonly Cell[];
  readonly lowCover: readonly TacticalCover[];
  readonly terminal: TacticalPlace | null;
  readonly door: TacticalPlace | null;
  readonly extraction: readonly Cell[];
  readonly units: readonly TacticalUnit[];
}

export interface TacticalSelection {
  readonly selectedId: string;
  readonly targetId: string;
  readonly showSteps: boolean;
}

export interface OverviewCell extends Cell {
  readonly kind: "floor" | "wall" | "cover" | "terminal" | "door" | "door-open" | "extract" | "runner" | "enemy";
  readonly unitId: string;
}

export interface Pose {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly hp: number;
}

export interface ActionOffers {
  readonly move: boolean;
  readonly aim: boolean;
  readonly shoot: boolean;
  readonly reload: boolean;
  readonly overwatch: boolean;
  readonly terminal: boolean;
  readonly door: boolean;
  readonly extract: boolean;
  readonly ready: boolean;
  readonly heal: readonly { readonly id: string; readonly name: string }[];
}

export function readTacticalStand(payload: unknown): TacticalStand | null {
  if (!payload || typeof payload !== "object") return null;
  const value = payload as Record<string, unknown>;
  const width = bounded(value.width, 1, 32);
  const height = bounded(value.height, 1, 32);
  const round = bounded(value.round, 1, 24);
  const copies = bounded(value.copies, 0, 2);
  const deadlineAt = bounded(value.deadlineAt, 0, Number.MAX_SAFE_INTEGER);
  if (
    width === null ||
    height === null ||
    round === null ||
    copies === null ||
    deadlineAt === null ||
    (value.phase !== "crew" && value.phase !== "enemy" && value.phase !== "ended") ||
    (value.phaseSeconds !== 60 && value.phaseSeconds !== 90 && value.phaseSeconds !== 120) ||
    value.doorOpen !== true && value.doorOpen !== false ||
    typeof value.ownRunnerId !== "string"
  ) {
    return null;
  }
  const knownCells = cellsOf(value.knownCells, width, height, width * height);
  const visibleCells = cellsOf(value.visibleCells, width, height, width * height);
  const walls = cellsOf(value.walls, width, height, width * height);
  const extraction = cellsOf(value.extraction, width, height, 16);
  const terminal = placeOf(value.terminal, width, height);
  const door = placeOf(value.door, width, height);
  const lowCover = coverOf(value.lowCover, width, height);
  const units = unitsOf(value.units, width, height);
  if (!knownCells || !visibleCells || !walls || !extraction || terminal === undefined || door === undefined || !lowCover || !units) {
    return null;
  }
  const known = new Set(knownCells.map(key));
  const visible = new Set(visibleCells.map(key));
  if (![...visible].every((id) => known.has(id))) return null;
  if (!walls.every((cell) => known.has(key(cell)))) return null;
  if (!extraction.every((cell) => known.has(key(cell)))) return null;
  if (terminal && !known.has(key(terminal))) return null;
  if (door && !known.has(key(door))) return null;
  if (lowCover.some((cover) => !known.has(key(cover)))) return null;
  const shown = units.filter((unit) => {
    if (unit.team === "enemy") return visible.has(key(unit));
    return unit.status === "extracted" || known.has(key(unit));
  });
  return {
    ownRunnerId: value.ownRunnerId,
    round,
    phase: value.phase,
    copies,
    doorOpen: value.doorOpen,
    phaseSeconds: value.phaseSeconds,
    deadlineAt,
    width,
    height,
    knownCells,
    visibleCells,
    walls,
    lowCover,
    terminal,
    door,
    extraction,
    units: shown,
  };
}

export function confirmedPose(stand: TacticalStand): Pose[] {
  return stand.units.map((unit) => ({ id: unit.id, x: unit.x, y: unit.y, hp: unit.hp }));
}

export function poseAfterSkip(confirmed: readonly Pose[]): Pose[] {
  return confirmed.map((unit) => ({ id: unit.id, x: unit.x, y: unit.y, hp: unit.hp }));
}

export function remainingSeconds(deadlineAt: number, now: number): number | null {
  if (!Number.isInteger(deadlineAt) || deadlineAt <= 0 || !Number.isInteger(now)) return null;
  if (now >= deadlineAt) return 0;
  return Math.ceil((deadlineAt - now) / 1000);
}

export function stepTargets(stand: TacticalStand, unitId: string): Cell[] {
  const unit = activeCrew(stand, unitId);
  if (!unit || stand.phase !== "crew" || unit.ap < actionAp("move")) return [];
  const map = previewMap(stand);
  const blocked = blockers(stand, unit.id);
  const found: Cell[] = [];
  for (const step of STEPS) {
    const goal = { x: unit.x + step.x, y: unit.y + step.y };
    const path = pathTo(map, blocked, unit, goal, actionAp("move"));
    if (path && path.length === 1) found.push({ x: goal.x, y: goal.y });
  }
  found.sort((left, right) => left.y - right.y || left.x - right.x);
  return found;
}

export function shotPreview(stand: TacticalStand, unitId: string, targetId: string): string {
  const from = stand.units.find((unit) => unit.id === unitId);
  const to = stand.units.find((unit) => unit.id === targetId);
  if (!from || !to || from.team !== "crew" || to.team !== "enemy") return "";
  try {
    const preview = previewShot(previewMap(stand), from, to, from.aiming ? AIM_BONUS : 0);
    if (preview.blocked || preview.chance === null) return "Keine Schusslinie.";
    const cover = preview.protectedEdgeCrossed ? `Deckung ${preview.coverPenalty}.` : "Ohne Deckungsabzug.";
    const range = preview.distance > from.range ? " Außer Reichweite." : "";
    return `Vorschau ${preview.chance} Prozent. ${cover}${range}`;
  } catch {
    return "";
  }
}

export function actionOffers(stand: TacticalStand, targetId: string): ActionOffers {
  const unit = activeCrew(stand, stand.ownRunnerId);
  const crewPhase = stand.phase === "crew" && unit !== null;
  const target = stand.units.find((item) => item.id === targetId);
  const beside = (cell: Cell | null) => Boolean(unit && cell && orthogonal(unit, cell));
  const heal = crewPhase && unit && unit.medkits > 0 && unit.ap >= actionAp("heal")
    ? stand.units
        .filter((target) => {
          if (target.team !== "crew" || target.status !== "active" || target.hp >= target.maxHp) return false;
          return target.id === unit.id || orthogonal(unit, target);
        })
        .map((target) => ({ id: target.id, name: target.name }))
    : [];
  const held = unit?.overwatch ? 1 : 0;
  return {
    move: Boolean(crewPhase && unit && unit.ap >= actionAp("move")),
    aim: Boolean(crewPhase && unit && !unit.aiming && unit.ap >= actionAp("aim")),
    shoot: Boolean(crewPhase && unit && unit.magazine > 0 && unit.ap >= actionAp("shot") && target?.team === "enemy" && target.status === "active"),
    reload: Boolean(
      crewPhase &&
        unit &&
        unit.reserveMagazines > 0 &&
        unit.magazine + held < unit.magazineSize &&
        unit.ap >= actionAp("reload"),
    ),
    overwatch: Boolean(crewPhase && unit && !unit.overwatch && unit.magazine > 0 && unit.ap >= actionAp("overwatch")),
    terminal: Boolean(crewPhase && unit && stand.copies < 2 && beside(stand.terminal) && unit.ap >= INTERACT_AP && stand.terminal?.id === "terminal"),
    door: Boolean(crewPhase && unit && stand.door && !stand.doorOpen && beside(stand.door) && unit.ap >= INTERACT_AP && stand.door.id === "shortcut"),
    extract: Boolean(
      crewPhase &&
        unit &&
        stand.copies >= 2 &&
        stand.extraction.some((cell) => cell.x === unit.x && cell.y === unit.y) &&
        unit.ap >= EXTRACT_AP,
    ),
    ready: Boolean(crewPhase),
    heal,
  };
}

export function tacticalBoard(stand: TacticalStand, selection: TacticalSelection) {
  const known = new Set(stand.knownCells.map(key));
  const visible = new Set(stand.visibleCells.map(key));
  const walls = new Set(stand.walls.map(key));
  const doorClosed = stand.door && !stand.doorOpen ? key(stand.door) : "";
  const terminal = stand.terminal ? key(stand.terminal) : "";
  const floors = stand.knownCells
    .filter((cell) => {
      const id = key(cell);
      return !walls.has(id) && id !== doorClosed && id !== terminal;
    })
    .map((cell) => ({ x: cell.x, y: cell.y, lit: visible.has(key(cell)) }));
  const floorKeys = new Set(floors.map(key));
  const steps = selection.showSteps ? stepTargets(stand, stand.ownRunnerId) : [];
  const watch: Cell[] = [];
  const seenWatch = new Set<string>();
  for (const unit of stand.units) {
    if (unit.status !== "active" || !unit.overwatch) continue;
    for (const floor of stand.knownCells) {
      if (!inSector(unit, floor, unit.overwatch)) continue;
      const id = key(floor);
      if (seenWatch.has(id) || !known.has(id)) continue;
      seenWatch.add(id);
      watch.push({ x: floor.x, y: floor.y });
    }
  }
  watch.sort((left, right) => left.y - right.y || left.x - right.x);
  return {
    width: stand.width,
    height: stand.height,
    floors,
    walls: stand.walls.map((cell) => ({ x: cell.x, y: cell.y, lit: visible.has(key(cell)) })),
    door: stand.door && !stand.doorOpen ? { x: stand.door.x, y: stand.door.y } : null,
    openDoor: stand.door && stand.doorOpen ? { x: stand.door.x, y: stand.door.y } : null,
    terminal: stand.terminal ? { x: stand.terminal.x, y: stand.terminal.y } : null,
    extraction: stand.extraction.filter((cell) => floorKeys.has(key(cell))).map((cell) => ({ x: cell.x, y: cell.y })),
    cover: stand.lowCover.map((cover) => ({ x: cover.x, y: cover.y, protects: cover.protects })),
    units: stand.units
      .filter((unit) => unit.status !== "extracted")
      .map((unit) => ({
        id: unit.id,
        x: unit.x,
        y: unit.y,
        team: unit.team,
        selected: unit.id === selection.selectedId,
        target: unit.id === selection.targetId,
        down: unit.status === "down",
      })),
    reachable: steps.filter((cell) => floorKeys.has(key(cell))),
    watch,
  };
}

export function overviewCells(stand: TacticalStand): OverviewCell[] {
  const occupied = new Map(
    stand.units.filter((unit) => unit.status !== "extracted").map((unit) => [key(unit), unit]),
  );
  const walls = new Set(stand.walls.map(key));
  const cover = new Set(stand.lowCover.map(key));
  const extraction = new Set(stand.extraction.map(key));
  const cells = stand.knownCells.map((cell) => {
    const id = key(cell);
    const unit = occupied.get(id);
    let kind: OverviewCell["kind"] = "floor";
    if (unit?.team === "crew") kind = "runner";
    else if (unit?.team === "enemy") kind = "enemy";
    else if (stand.terminal && key(stand.terminal) === id) kind = "terminal";
    else if (stand.door && key(stand.door) === id) kind = stand.doorOpen ? "door-open" : "door";
    else if (walls.has(id)) kind = "wall";
    else if (extraction.has(id)) kind = "extract";
    else if (cover.has(id)) kind = "cover";
    return { x: cell.x, y: cell.y, kind, unitId: unit?.id ?? "" };
  });
  cells.sort((left, right) => left.y - right.y || left.x - right.x);
  return cells;
}

export function sameCell(left: Cell, right: Cell): boolean {
  return left.x === right.x && right.y === left.y;
}

function previewMap(stand: TacticalStand): BattleMap {
  const known = new Set(stand.knownCells.map(key));
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
    lowCover: stand.lowCover.map((cover) => ({ id: cover.id, x: cover.x, y: cover.y, protects: cover.protects })),
  };
}

function blockers(stand: TacticalStand, unitId: string): Cell[] {
  const cells: Cell[] = [];
  if (stand.terminal) cells.push({ x: stand.terminal.x, y: stand.terminal.y });
  for (const unit of stand.units) {
    if (unit.id === unitId || unit.status === "extracted") continue;
    cells.push({ x: unit.x, y: unit.y });
  }
  return cells;
}

function activeCrew(stand: TacticalStand, unitId: string): TacticalUnit | null {
  const unit = stand.units.find((item) => item.id === unitId);
  if (!unit || unit.team !== "crew" || unit.status !== "active") return null;
  return unit;
}

function orthogonal(from: Cell, to: Cell): boolean {
  return Math.abs(from.x - to.x) + Math.abs(from.y - to.y) === 1;
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

function coverOf(value: unknown, width: number, height: number): TacticalCover[] | null {
  if (!Array.isArray(value) || value.length > 64) return null;
  const covers: TacticalCover[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== "object") return null;
    const record = entry as Record<string, unknown>;
    const cell = cellOf(record, width, height);
    if (!cell || typeof record.id !== "string" || !/^[a-z0-9-]{1,24}$/.test(record.id) || !isDirection(record.protects)) return null;
    covers.push({ id: record.id, x: cell.x, y: cell.y, protects: record.protects });
  }
  return covers;
}

function unitsOf(value: unknown, width: number, height: number): TacticalUnit[] | null {
  if (!Array.isArray(value) || value.length > 16) return null;
  const units: TacticalUnit[] = [];
  const seen = new Set<string>();
  for (const entry of value) {
    const unit = unitOf(entry, width, height);
    if (!unit || seen.has(unit.id)) return null;
    seen.add(unit.id);
    units.push(unit);
  }
  return units;
}

function unitOf(value: unknown, width: number, height: number): TacticalUnit | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const cell = cellOf(record, width, height);
  const hp = bounded(record.hp, 0, 99);
  const maxHp = bounded(record.maxHp, 1, 99);
  const ap = bounded(record.ap, 0, 8);
  const range = bounded(record.range, 1, 20);
  const magazine = bounded(record.magazine, 0, 20);
  const magazineSize = bounded(record.magazineSize, 1, 20);
  const reserveMagazines = bounded(record.reserveMagazines, 0, 8);
  const medkits = bounded(record.medkits, 0, 4);
  if (
    !cell ||
    hp === null ||
    maxHp === null ||
    ap === null ||
    range === null ||
    magazine === null ||
    magazineSize === null ||
    reserveMagazines === null ||
    medkits === null ||
    hp > maxHp ||
    typeof record.id !== "string" ||
    !/^[a-z0-9-]{1,24}$/.test(record.id) ||
    typeof record.name !== "string" ||
    !/^[\p{L}\p{N} ]{1,40}$/u.test(record.name) ||
    (record.team !== "crew" && record.team !== "enemy") ||
    (record.weapon !== "rifle" && record.weapon !== "sidearm") ||
    (record.status !== "active" && record.status !== "down" && record.status !== "extracted") ||
    record.ready !== true && record.ready !== false ||
    record.aiming !== true && record.aiming !== false ||
    !(record.overwatch === null || isDirection(record.overwatch))
  ) {
    return null;
  }
  return {
    id: record.id,
    name: record.name,
    team: record.team,
    weapon: record.weapon,
    x: cell.x,
    y: cell.y,
    hp,
    maxHp,
    ap,
    range,
    magazine,
    magazineSize,
    reserveMagazines,
    status: record.status,
    ready: record.ready,
    aiming: record.aiming,
    medkits,
    overwatch: record.overwatch,
  };
}

function placeOf(value: unknown, width: number, height: number): TacticalPlace | null | undefined {
  if (value === null) return null;
  if (!value || typeof value !== "object") return undefined;
  const record = value as Record<string, unknown>;
  const cell = cellOf(record, width, height);
  if (!cell || typeof record.id !== "string" || !/^[a-z0-9-]{1,24}$/.test(record.id)) return undefined;
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

function bounded(value: unknown, min: number, max: number): number | null {
  if (typeof value !== "number" || !Number.isInteger(value) || value < min || value > max) return null;
  return value;
}

function isDirection(value: unknown): value is Direction {
  return typeof value === "string" && DIRECTIONS.some((direction) => direction === value);
}

function key(cell: Cell): string {
  return `${cell.x},${cell.y}`;
}
