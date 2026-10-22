import { deckungFixture, type PlacedUnit } from "./deckungFixture.ts";
import { DIRECTIONS, type BattleMap, type Cell, type Direction } from "./types.ts";

export const CREW_AP = 8;

export type ActionKind = "move" | "shot" | "aim" | "reload" | "overwatch" | "heal";

export type ApMark = "full" | "spent";

const ACTION_AP: Readonly<Record<ActionKind, number>> = {
  move: 1,
  shot: 3,
  aim: 1,
  reload: 2,
  overwatch: 3,
  heal: 3,
};

const STEP: Readonly<Record<Direction, Cell>> = {
  n: { x: 0, y: -1 },
  e: { x: 1, y: 0 },
  s: { x: 0, y: 1 },
  w: { x: -1, y: 0 },
};

export interface MoveQuery {
  readonly map: BattleMap;
  readonly blockers: readonly Cell[];
  readonly from: Cell;
  readonly path: readonly Cell[];
  readonly prior: readonly ActionKind[];
}

export interface ReachTile extends Cell {
  readonly cost: number;
}

export interface MovePreview {
  readonly maxAp: number;
  readonly stepAp: number;
  readonly priorSpent: number;
  readonly available: number;
  readonly path: readonly Cell[];
  readonly cost: number;
  readonly remaining: number;
  readonly legal: boolean;
  readonly markersNow: readonly ApMark[];
  readonly markersAfter: readonly ApMark[];
  readonly reachable: readonly ReachTile[];
}

export interface ApBattle {
  readonly map: BattleMap;
  readonly runner: PlacedUnit;
  readonly enemy: PlacedUnit;
  readonly nix: PlacedUnit;
  readonly preview: MovePreview;
}

const BATTLE_PATH: readonly Cell[] = [
  { x: 1, y: 4 },
  { x: 2, y: 4 },
  { x: 3, y: 4 },
];

export function actionAp(kind: ActionKind): number {
  return ACTION_AP[kind];
}

export function previewMove(query: MoveQuery): MovePreview {
  const spent = spentAp(query.prior);
  const priorOk = spent <= CREW_AP;
  const available = priorOk ? CREW_AP - spent : 0;
  const measured = measurePath(query.map, query.blockers, query.from, query.path);
  const cost = measured.fault === null ? measured.cost : 0;
  const legal = priorOk && measured.fault === null && cost <= available;
  const remaining = legal ? available - cost : available;
  const nowSpent = priorOk ? spent : CREW_AP;
  const afterSpent = legal ? spent + cost : nowSpent;
  return {
    maxAp: CREW_AP,
    stepAp: actionAp("move"),
    priorSpent: nowSpent,
    available,
    path: query.path.map((cell) => ({ x: cell.x, y: cell.y })),
    cost,
    remaining,
    legal,
    markersNow: markerRow(nowSpent),
    markersAfter: markerRow(afterSpent),
    reachable: reachableTiles(query.map, query.blockers, query.from, available),
  };
}

export function apBattle(): ApBattle {
  const { map, runner, enemy, nix } = deckungFixture;
  return {
    map,
    runner,
    enemy,
    nix,
    preview: previewMove({
      map,
      blockers: [enemy, nix],
      from: runner,
      path: BATTLE_PATH,
      prior: ["shot"],
    }),
  };
}

function spentAp(prior: readonly ActionKind[]): number {
  let spent = 0;
  for (const kind of prior) spent += actionAp(kind);
  return spent;
}

function markerRow(spent: number): readonly ApMark[] {
  const used = Math.max(0, Math.min(CREW_AP, spent));
  const marks: ApMark[] = [];
  for (let index = 0; index < CREW_AP; index += 1) marks.push(index < used ? "spent" : "full");
  return marks;
}

export type MoveFault = "step" | "repeat" | "bounds" | "wall" | "blocked";

export interface MeasuredPath {
  readonly cost: number;
  readonly fault: MoveFault | null;
}

export function measurePath(
  map: BattleMap,
  blockers: readonly Cell[],
  from: Cell,
  path: readonly Cell[],
): MeasuredPath {
  if (!isWholeCell(from)) return { cost: 0, fault: "step" };
  const walls = new Set(map.walls.map(key));
  const blocked = new Set(blockers.map(key));
  const seen = new Set<string>([key(from)]);
  let prev = from;
  for (const step of path) {
    if (!isWholeCell(step) || !isOrthogonal(prev, step)) return { cost: 0, fault: "step" };
    const id = key(step);
    if (seen.has(id)) return { cost: 0, fault: "repeat" };
    if (!inBounds(map, step)) return { cost: 0, fault: "bounds" };
    if (walls.has(id)) return { cost: 0, fault: "wall" };
    if (blocked.has(id)) return { cost: 0, fault: "blocked" };
    seen.add(id);
    prev = step;
  }
  return { cost: path.length * actionAp("move"), fault: null };
}

export function pathTo(
  map: BattleMap,
  blockers: readonly Cell[],
  from: Cell,
  goal: Cell,
  budget: number,
): readonly Cell[] | null {
  if (!isWholeCell(from) || !isWholeCell(goal)) return null;
  if (from.x === goal.x && from.y === goal.y) return inBounds(map, from) ? [] : null;
  if (!inBounds(map, from) || budget < actionAp("move")) return null;
  const visits = search(map, blockers, from, budget);
  const found = visits.get(key(goal));
  if (!found || found.cost <= 0) return null;
  const steps: Cell[] = [];
  let cursor: Visit | undefined = found;
  for (let hop = 0; cursor?.parent && hop <= budget; hop += 1) {
    steps.push({ x: cursor.x, y: cursor.y });
    cursor = visits.get(cursor.parent);
  }
  if (!cursor || cursor.parent !== null) return null;
  steps.reverse();
  return steps;
}

interface Visit {
  readonly x: number;
  readonly y: number;
  readonly cost: number;
  readonly parent: string | null;
}

function search(map: BattleMap, blockers: readonly Cell[], from: Cell, budget: number): Map<string, Visit> {
  const walls = new Set(map.walls.map(key));
  const blocked = new Set(blockers.map(key));
  const origin = key(from);
  const start: Visit = { x: from.x, y: from.y, cost: 0, parent: null };
  const visits = new Map<string, Visit>([[origin, start]]);
  const seen = new Set<string>([origin]);
  const queue: Visit[] = [start];
  let head = 0;
  while (head < queue.length) {
    const current = queue[head];
    head += 1;
    if (!current || current.cost >= budget) continue;
    for (const dir of DIRECTIONS) {
      const step = STEP[dir];
      const next = { x: current.x + step.x, y: current.y + step.y };
      const id = key(next);
      if (seen.has(id)) continue;
      seen.add(id);
      if (!inBounds(map, next) || walls.has(id) || blocked.has(id)) continue;
      const visit: Visit = {
        x: next.x,
        y: next.y,
        cost: current.cost + actionAp("move"),
        parent: key(current),
      };
      visits.set(id, visit);
      queue.push(visit);
    }
  }
  return visits;
}

function reachableTiles(map: BattleMap, blockers: readonly Cell[], from: Cell, budget: number): ReachTile[] {
  const result: ReachTile[] = [];
  for (const visit of search(map, blockers, from, budget).values()) {
    if (visit.cost <= 0) continue;
    result.push({ x: visit.x, y: visit.y, cost: visit.cost });
  }
  result.sort((a, b) => a.y - b.y || a.x - b.x);
  return result;
}

function isWholeCell(cell: Cell): boolean {
  return Number.isInteger(cell.x) && Number.isInteger(cell.y);
}

function isOrthogonal(from: Cell, to: Cell): boolean {
  const dx = Math.abs(to.x - from.x);
  const dy = Math.abs(to.y - from.y);
  return (dx === 1 && dy === 0) || (dx === 0 && dy === 1);
}

function inBounds(map: BattleMap, cell: Cell): boolean {
  return cell.x >= 0 && cell.y >= 0 && cell.x < map.width && cell.y < map.height;
}

function key(cell: Cell): string {
  return `${cell.x},${cell.y}`;
}
