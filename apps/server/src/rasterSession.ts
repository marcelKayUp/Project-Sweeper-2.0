import { applyFlatEnd, applyFlatMove, createFlatWalk, type Cell, type FlatWalk } from "@neon/sim";

const REMEMBERED_COMMANDS = 128;
const COMMANDS_PER_SECOND = 20;
const RATE_WINDOW_MS = 1000;

export interface RasterStand {
  readonly ack: number;
  readonly commandId: string;
  readonly revision: number;
  readonly rulesVersion: number;
  readonly width: number;
  readonly height: number;
  readonly walls: readonly Cell[];
  readonly round: number;
  readonly x: number;
  readonly y: number;
  readonly ap: number;
  readonly notice: string;
}

export type RasterWish =
  | { readonly commandId: string; readonly kind: "move"; readonly path: readonly Cell[] }
  | { readonly commandId: string; readonly kind: "reset" }
  | { readonly commandId: string; readonly kind: "end" };

export interface RasterSession {
  snapshot(commandId?: string, notice?: string): RasterStand;
  receive(wish: RasterWish): RasterStand;
}

export function createRasterSession(now: () => number = Date.now): RasterSession {
  let walk: FlatWalk = createFlatWalk();
  let ack = 0;
  const seen = new Map<string, string>();
  const hits: number[] = [];

  function snapshot(commandId = "", notice = ""): RasterStand {
    ack += 1;
    return {
      ack,
      commandId,
      revision: walk.revision,
      rulesVersion: walk.rulesVersion,
      width: walk.map.width,
      height: walk.map.height,
      walls: walk.map.walls.map((cell) => ({ x: cell.x, y: cell.y })),
      x: walk.actor.x,
      y: walk.actor.y,
      ap: walk.actor.ap,
      round: walk.round,
      notice,
    };
  }

  function remember(commandId: string, notice: string): void {
    seen.set(commandId, notice);
    while (seen.size > REMEMBERED_COMMANDS) {
      const oldest = seen.keys().next().value;
      if (oldest === undefined) break;
      seen.delete(oldest);
    }
  }

  function allow(at: number): boolean {
    const cutoff = at - RATE_WINDOW_MS;
    while (hits.length > 0) {
      const oldest = hits[0];
      if (oldest === undefined || oldest >= cutoff) break;
      hits.shift();
    }
    if (hits.length >= COMMANDS_PER_SECOND) return false;
    hits.push(at);
    return true;
  }

  return {
    snapshot,
    receive(wish) {
      const prior = seen.get(wish.commandId);
      if (prior !== undefined) return snapshot(wish.commandId, prior);
      if (!allow(now())) return snapshot(wish.commandId, "Zu viele Befehle.");
      if (wish.kind === "reset") {
        walk = createFlatWalk();
        remember(wish.commandId, "");
        return snapshot(wish.commandId, "");
      }
      if (wish.kind === "end") {
        const step = applyFlatEnd(walk);
        walk = step.state;
        remember(wish.commandId, "");
        return snapshot(wish.commandId, "");
      }
      const step = applyFlatMove(walk, wish.path);
      if (step.rejection === null) walk = step.state;
      const notice = step.rejection ?? "";
      remember(wish.commandId, notice);
      return snapshot(wish.commandId, notice);
    },
  };
}
