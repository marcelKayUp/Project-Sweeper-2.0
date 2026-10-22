import { CREW_AP, measurePath, pathTo, previewMove, type MoveFault } from "./ap.ts";
import { stableHash } from "./mission.ts";
import type { ActionKind } from "./ap.ts";
import type { BattleMap, Cell } from "./types.ts";

export const FLAT_RULES_VERSION = 1;

export interface FlatActor {
  readonly id: "runner";
  readonly x: number;
  readonly y: number;
  readonly ap: number;
}

export interface FlatWalk {
  readonly rulesVersion: typeof FLAT_RULES_VERSION;
  readonly map: BattleMap;
  readonly actor: FlatActor;
  readonly round: number;
  readonly revision: number;
}

export interface FlatStep {
  readonly state: FlatWalk;
  readonly rejection: string | null;
}

const FLAT_MAP: BattleMap = {
  width: 8,
  height: 8,
  walls: [
    { x: 3, y: 3 },
    { x: 4, y: 3 },
    { x: 3, y: 4 },
    { x: 4, y: 4 },
  ],
  lowCover: [],
};

const FAULT_TEXT: Readonly<Record<MoveFault, string>> = {
  step: "Nur orthogonale Nachbarfelder.",
  repeat: "Der Weg betritt ein Feld doppelt.",
  bounds: "Ziel liegt außerhalb.",
  wall: "Feld ist blockiert.",
  blocked: "Feld ist blockiert.",
};

export function createFlatWalk(): FlatWalk {
  return {
    rulesVersion: FLAT_RULES_VERSION,
    map: FLAT_MAP,
    actor: { id: "runner", x: 1, y: 1, ap: CREW_AP },
    round: 1,
    revision: 0,
  };
}

export function applyFlatMove(state: FlatWalk, path: readonly Cell[]): FlatStep {
  if (path.length === 0) return { state, rejection: "Kein Schritt." };
  const from = { x: state.actor.x, y: state.actor.y };
  const measured = measurePath(state.map, [], from, path);
  if (measured.fault) return { state, rejection: FAULT_TEXT[measured.fault] };
  if (measured.cost > state.actor.ap) return { state, rejection: "Zu wenig Aktionspunkte." };
  const end = path[path.length - 1];
  if (!end) return { state, rejection: "Kein Schritt." };
  return {
    state: {
      rulesVersion: state.rulesVersion,
      map: state.map,
      actor: { id: state.actor.id, x: end.x, y: end.y, ap: state.actor.ap - measured.cost },
      round: state.round,
      revision: state.revision + 1,
    },
    rejection: null,
  };
}

export function applyFlatEnd(state: FlatWalk): FlatStep {
  return {
    state: {
      rulesVersion: state.rulesVersion,
      map: state.map,
      actor: { id: state.actor.id, x: state.actor.x, y: state.actor.y, ap: CREW_AP },
      round: state.round + 1,
      revision: state.revision + 1,
    },
    rejection: null,
  };
}

export function flatPath(state: FlatWalk, goal: Cell): readonly Cell[] | null {
  return pathTo(state.map, [], { x: state.actor.x, y: state.actor.y }, goal, state.actor.ap);
}

export function flatReachable(state: FlatWalk) {
  return previewMove({
    map: state.map,
    blockers: [],
    from: { x: state.actor.x, y: state.actor.y },
    path: [],
    prior: spentMoves(state.actor.ap),
  }).reachable;
}

export function flatChecksum(state: FlatWalk): string {
  const walls = state.map.walls.map((cell) => ({ x: cell.x, y: cell.y }));
  walls.sort((a, b) => a.y - b.y || a.x - b.x);
  return stableHash(
    JSON.stringify({
      rulesVersion: state.rulesVersion,
      width: state.map.width,
      height: state.map.height,
      walls,
      actor: { id: state.actor.id, x: state.actor.x, y: state.actor.y, ap: state.actor.ap },
      round: state.round,
      revision: state.revision,
    }),
  );
}

function spentMoves(ap: number): ActionKind[] {
  const spent = CREW_AP - ap;
  if (spent <= 0) return [];
  const prior: ActionKind[] = [];
  for (let index = 0; index < spent; index += 1) prior.push("move");
  return prior;
}
