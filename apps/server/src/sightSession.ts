import {
  applyCommand,
  projectTeam,
  createMissionState,
  type BodyPartId,
  type Cell,
  type MissionEvent,
  type MissionSpec,
  type MissionState,
  type OutcomeId,
  type PartState,
  type PhaseId,
  type StepResult,
  type UnitStatus,
  type WeaponId,
} from "@neon/sim";

const REMEMBERED_COMMANDS = 128;
const COMMANDS_PER_SECOND = 20;
const RATE_WINDOW_MS = 1000;

export interface SightMeta {
  readonly family: "office" | "laboratory" | "factory";
  readonly method: "bsp" | "graph" | "circulation";
  readonly rooms: number;
}

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
  readonly status: UnitStatus;
  readonly weapon: WeaponId;
  readonly aiming: boolean;
  readonly medkits: number;
  readonly parts: readonly PartState[];
  readonly overwatch: "n" | "e" | "s" | "w" | null;
}

export interface SightCover {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly protects: "n" | "e" | "s" | "w";
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
  readonly phase: PhaseId;
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
  readonly outcome: OutcomeId | "";
  readonly notice: string;
  readonly family: SightMeta["family"];
  readonly seed: number;
  readonly method: SightMeta["method"];
  readonly rooms: number;
}

export type SightWish =
  | { readonly commandId: string; readonly kind: "move"; readonly unitId: string; readonly path: readonly Cell[] }
  | { readonly commandId: string; readonly kind: "shoot"; readonly unitId: string; readonly targetId: string }
  | { readonly commandId: string; readonly kind: "interact"; readonly unitId: string; readonly targetId: string }
  | { readonly commandId: string; readonly kind: "extract"; readonly unitId: string }
  | { readonly commandId: string; readonly kind: "reload"; readonly unitId: string }
  | { readonly commandId: string; readonly kind: "aim"; readonly unitId: string }
  | { readonly commandId: string; readonly kind: "heal"; readonly unitId: string; readonly targetId: string; readonly part: BodyPartId }
  | { readonly commandId: string; readonly kind: "overwatch"; readonly unitId: string; readonly direction: "n" | "e" | "s" | "w" }
  | { readonly commandId: string; readonly kind: "end" }
  | { readonly commandId: string; readonly kind: "reset" };

export interface SightSession {
  snapshot(commandId?: string, notice?: string): SightStand;
  receive(wish: SightWish): SightStand;
}

export function createSightSession(
  spec: MissionSpec,
  seed: number,
  meta: SightMeta,
  now: () => number = Date.now,
): SightSession {
  let mission = createMissionState(spec, seed);
  let revision = 0;
  let ack = 0;
  const seen = new Map<string, string>();
  const hits: number[] = [];

  function snapshot(commandId = "", notice = ""): SightStand {
    ack += 1;
    const view = projectTeam(mission, spec);
    return {
      ack,
      commandId,
      revision,
      rulesVersion: mission.rulesVersion,
      round: view.round,
      phase: view.phase,
      width: view.width,
      height: view.height,
      known: copyCells(view.knownCells),
      visible: copyCells(view.visibleCells),
      walls: copyCells(view.walls),
      cover: view.lowCover
        .map((cover) => ({ id: cover.id, x: cover.x, y: cover.y, protects: cover.protects }))
        .sort((left, right) => left.y - right.y || left.x - right.x || left.protects.localeCompare(right.protects)),
      door: view.door ? { id: view.door.id, x: view.door.x, y: view.door.y } : null,
      doorOpen: view.doorOpen,
      terminal: view.terminal ? { id: view.terminal.id, x: view.terminal.x, y: view.terminal.y } : null,
      extraction: copyCells(view.extraction),
      units: view.units.map((unit) => ({
        id: unit.id,
        name: unit.name,
        team: unit.team,
        x: unit.x,
        y: unit.y,
        hp: unit.hp,
        maxHp: unit.maxHp,
        ap: unit.ap,
        range: unit.range,
        magazine: unit.magazine,
        magazineSize: unit.magazineSize,
        reserveMagazines: unit.reserveMagazines,
        status: unit.status,
        weapon: unit.weapon,
        aiming: unit.aiming,
        medkits: unit.medkits,
        parts: unit.parts.map((part) => ({ id: part.id, hp: part.hp, maxHp: part.maxHp, wound: part.wound })),
        overwatch: unit.overwatch,
      })),
      copies: view.copies,
      outcome: view.result?.outcome ?? "",
      notice: notice.slice(0, 200),
      family: meta.family,
      seed,
      method: meta.method,
      rooms: meta.rooms,
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

  function applyWish(wish: SightWish): StepResult {
    if (wish.kind === "reset") return { state: createMissionState(spec, seed), events: [], rejection: null };
    if (wish.kind === "end") return endRound(mission, spec);
    if (wish.kind === "move") return moveAlong(mission, spec, wish.unitId, wish.path);
    if (wish.kind === "shoot") {
      if (!enemyVisible(mission, spec, wish.targetId)) {
        return { state: mission, events: [], rejection: "Kein gültiges Ziel." };
      }
      return applyCommand(mission, spec, { kind: "shoot", unitId: wish.unitId, targetId: wish.targetId });
    }
    if (wish.kind === "interact") {
      if (!objectVisible(mission, spec, wish.targetId)) {
        return { state: mission, events: [], rejection: "Kein gültiges Ziel." };
      }
      return applyCommand(mission, spec, { kind: "interact", unitId: wish.unitId, targetId: wish.targetId });
    }
    if (wish.kind === "extract") return applyCommand(mission, spec, { kind: "extract", unitId: wish.unitId });
    if (wish.kind === "aim") return applyCommand(mission, spec, { kind: "aim", unitId: wish.unitId });
    if (wish.kind === "heal") {
      return applyCommand(mission, spec, { kind: "heal", unitId: wish.unitId, targetId: wish.targetId, part: wish.part });
    }
    if (wish.kind === "overwatch") {
      return applyCommand(mission, spec, { kind: "overwatch", unitId: wish.unitId, direction: wish.direction });
    }
    return applyCommand(mission, spec, { kind: "reload", unitId: wish.unitId });
  }

  return {
    snapshot,
    receive(wish) {
      const prior = seen.get(wish.commandId);
      if (prior !== undefined) return snapshot(wish.commandId, prior);
      if (!allow(now())) return snapshot(wish.commandId, "Zu viele Befehle.");
      const step = applyWish(wish);
      if (step.rejection === null) {
        mission = step.state;
        revision = wish.kind === "reset" ? 0 : revision + 1;
      }
      const text = step.rejection ?? describe(step.events, step.state, spec);
      remember(wish.commandId, text);
      return snapshot(wish.commandId, text);
    },
  };
}

function moveAlong(state: MissionState, spec: MissionSpec, unitId: string, path: readonly Cell[]): StepResult {
  const known = new Set(state.knownCells.map((cell) => `${cell.x},${cell.y}`));
  if (path.some((cell) => !known.has(`${cell.x},${cell.y}`))) {
    return { state, events: [], rejection: "Feld ist nicht erkundet." };
  }
  let current = state;
  const events: MissionEvent[] = [];
  for (const step of path) {
    const mover = current.units.find((unit) => unit.id === unitId);
    if (!mover || mover.status !== "active" || current.result) break;
    const result = applyCommand(current, spec, { kind: "move", unitId, x: step.x, y: step.y });
    if (result.rejection !== null) {
      if (mover.status === "active" && !current.result) return { state, events: [], rejection: result.rejection };
      break;
    }
    current = result.state;
    events.push(...result.events);
  }
  return { state: current, events, rejection: null };
}

function endRound(state: MissionState, spec: MissionSpec): StepResult {
  const ids = state.units
    .filter((unit) => unit.team === "crew" && unit.status === "active" && !unit.ready)
    .map((unit) => unit.id);
  if (ids.length === 0) return { state, events: [], rejection: "Niemand ist mehr dran." };
  let current = state;
  const events: MissionEvent[] = [];
  for (const unitId of ids) {
    const result = applyCommand(current, spec, { kind: "ready", unitId });
    if (result.rejection !== null) return { state, events: [], rejection: result.rejection };
    current = result.state;
    events.push(...result.events);
  }
  return { state: current, events, rejection: null };
}

function enemyVisible(state: MissionState, spec: MissionSpec, targetId: string): boolean {
  return projectTeam(state, spec).units.some((unit) => unit.id === targetId && unit.team === "enemy");
}

function objectVisible(state: MissionState, spec: MissionSpec, targetId: string): boolean {
  const view = projectTeam(state, spec);
  return view.door?.id === targetId || view.terminal?.id === targetId;
}

function describe(events: readonly MissionEvent[], state: MissionState, spec: MissionSpec): string {
  const named = new Map(projectTeam(state, spec).units.map((unit) => [unit.id, unit.name]));
  const parts: string[] = [];
  const resumed = [...events].reverse().find((event) => event.type === "PhaseChanged" && event.phase === "crew");
  if (events.some((event) => event.type === "PhaseChanged" && event.phase === "enemy")) {
    parts.push(resumed?.type === "PhaseChanged" ? `Gegnerzug. Runde ${resumed.round}.` : "Gegnerzug.");
  }
  for (const event of events) {
    if (event.type === "ShotResolved") parts.push(shotText(event, named));
    else if (event.type === "ObjectiveChanged") {
      if (event.copies > 0) parts.push(`Kopie ${event.copies} von 2.`);
      if (event.doorOpen) parts.push("Tür ist offen.");
    } else if (event.type === "MissionEnded") parts.push(event.outcome === "sieg" ? "Sieg." : "Niederlage.");
  }
  return parts.filter((part) => part.length > 0).slice(0, 4).join(" ").slice(0, 200);
}

function shotText(event: Extract<MissionEvent, { type: "ShotResolved" }>, named: ReadonlyMap<string, string>): string {
  const shooter = named.get(event.shooterId);
  const target = named.get(event.targetId);
  const prefix = event.reaction ? "Overwatch. " : "";
  if (event.status === "hit") {
    if (shooter && target) return `${prefix}${shooter} trifft ${target}, ${event.damage} Schaden.`;
    if (target) return `${prefix}${target} erleidet ${event.damage} Schaden.`;
    return `${prefix}Treffer, ${event.damage} Schaden.`;
  }
  if (event.status === "miss") return `${prefix}${target ? `Schuss auf ${target} verfehlt.` : "Verfehlt."}`;
  if (event.status === "blocked") return `${prefix}${target ? `Schuss auf ${target} blockiert.` : "Schuss blockiert."}`;
  return "";
}

function copyCells(cells: readonly Cell[]): Cell[] {
  return cells.map((cell) => ({ x: cell.x, y: cell.y })).sort((left, right) => left.y - right.y || left.x - right.x);
}
