import { actionAp, CREW_AP, pathTo } from "./ap.ts";
import { coverPenalty, inSector, manhattan, sectorFacing } from "./geometry.ts";
import { assertMissionLevels, floorsOf, linkAp, linksOf, resolveLink, type FloorPlate, type VerticalKind, type VerticalLink } from "./levels.ts";
import { AIM_BONUS, CREW_HP, GUARD_HP, resolveShot, RIFLE_MAGAZINE, RIFLE_RANGE, type ShotStatus } from "./resolve.ts";
import { createRng, type RngState } from "./rng.ts";
import { seesUnit, teamVisibleCells, unionCells } from "./sight.ts";
import { DIRECTIONS, type BattleMap, type Cell, type Direction, type LowCover } from "./types.ts";
import {
  derivedHp,
  freshParts,
  isBodyPart,
  PART_HEAL,
  rifleBlocked,
  shotPenalty,
  stepAp,
  tickBleed,
  treatPart,
  type BodyPartId,
  type PartState,
  type WoundKind,
} from "./wounds.ts";

export const RULES_VERSION = 3;
export const PROTOCOL_VERSION = 2;
export const MISSION_ID = "ghost-floor";
export const SIGHT_RANGE = 10;
export const ROUND_LIMIT = 24;
export const INTERACT_AP = 4;
export const EXTRACT_AP = 1;
/** Punkte, die ein Medkit an einem einzelnen Teil herstellt. */
export const HEAL_HP = PART_HEAL;
export const SIDEARM_RANGE = 6;
export const SIDEARM_MAGAZINE = 8;
export const RESERVE_MAGAZINES = 2;
export const RUNNER_HP = CREW_HP;
export const ENEMY_HP = GUARD_HP;

export type WeaponId = "rifle" | "sidearm";
export type TeamId = "crew" | "enemy";
export type UnitStatus = "active" | "down" | "extracted";
export type PhaseId = "crew" | "enemy" | "ended";
export type OutcomeId = "sieg" | "niederlage";

export interface MissionSpawn {
  readonly id: string;
  readonly name: string;
  readonly team: TeamId;
  readonly weapon: WeaponId;
  readonly x: number;
  readonly y: number;
  readonly z?: number;
  readonly patrol: readonly Cell[];
}

export interface MissionSpec {
  readonly id: string;
  readonly hash: string;
  readonly width: number;
  readonly height: number;
  readonly walls: readonly Cell[];
  readonly lowCover: readonly LowCover[];
  readonly terminal: { readonly id: string; readonly x: number; readonly y: number };
  readonly door: { readonly id: string; readonly x: number; readonly y: number };
  readonly extraction: readonly Cell[];
  readonly spawns: readonly MissionSpawn[];
  /** Fehlt die Liste, ist die Mission genau eine Ebene: die Felder oben, z = 0. */
  readonly levels?: readonly FloorPlate[];
  readonly links?: readonly VerticalLink[];
}

export interface UnitState {
  readonly id: string;
  readonly name: string;
  readonly team: TeamId;
  readonly weapon: WeaponId;
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly hp: number;
  readonly maxHp: number;
  readonly parts: readonly PartState[];
  readonly ap: number;
  readonly range: number;
  readonly magazine: number;
  readonly magazineSize: number;
  readonly reserveMagazines: number;
  readonly status: UnitStatus;
  readonly ready: boolean;
  readonly aiming: boolean;
  readonly medkits: number;
  readonly overwatch: Direction | null;
  readonly patrol: readonly Cell[];
  readonly patrolIndex: number;
}

export interface MissionResult {
  readonly outcome: OutcomeId;
  readonly reason: "extraktion" | "keine-handlungsfaehigen" | "rundenlimit";
  readonly round: number;
  readonly completedRounds: number;
  readonly copies: number;
  readonly extractedIds: readonly string[];
  readonly downIds: readonly string[];
}

export interface Contact {
  readonly id: string;
  readonly x: number;
  readonly y: number;
}

export interface KnownLevel {
  readonly z: number;
  readonly cells: readonly Cell[];
}

export interface MissionState {
  readonly missionId: string;
  readonly rulesVersion: number;
  readonly contentHash: string;
  readonly seed: number;
  readonly round: number;
  readonly completedRounds: number;
  readonly phase: PhaseId;
  readonly revision: number;
  readonly combatRng: RngState;
  readonly botRng: RngState;
  readonly copies: number;
  readonly doorOpen: boolean;
  readonly contacts: readonly Contact[];
  readonly knownCells: readonly Cell[];
  readonly knownLevels: readonly KnownLevel[];
  readonly units: readonly UnitState[];
  readonly result: MissionResult | null;
}

export type CrewCommand =
  | { readonly kind: "move"; readonly unitId: string; readonly x: number; readonly y: number; readonly z?: number }
  | { readonly kind: "interact"; readonly unitId: string; readonly targetId: string }
  | { readonly kind: "extract"; readonly unitId: string }
  | { readonly kind: "shoot"; readonly unitId: string; readonly targetId: string }
  | { readonly kind: "reload"; readonly unitId: string }
  | { readonly kind: "aim"; readonly unitId: string }
  | { readonly kind: "heal"; readonly unitId: string; readonly targetId: string; readonly part: BodyPartId }
  | { readonly kind: "overwatch"; readonly unitId: string; readonly direction: Direction }
  | { readonly kind: "ready"; readonly unitId: string };

export type MissionEvent =
  | { readonly type: "UnitMoved"; readonly unitId: string; readonly x: number; readonly y: number; readonly z?: number }
  | { readonly type: "ObjectiveChanged"; readonly copies: number; readonly doorOpen: boolean }
  | {
      readonly type: "ShotResolved";
      readonly shooterId: string;
      readonly targetId: string;
      readonly status: ShotStatus;
      readonly damage: number;
      readonly part: BodyPartId | null;
      readonly wound: WoundKind | null;
      readonly reaction: boolean;
    }
  | { readonly type: "PhaseChanged"; readonly phase: PhaseId; readonly round: number }
  | { readonly type: "MissionEnded"; readonly outcome: OutcomeId; readonly round: number };

export interface StepResult {
  readonly state: MissionState;
  readonly events: readonly MissionEvent[];
  readonly rejection: string | null;
}

export interface FloorLink {
  readonly id: string;
  readonly kind: VerticalKind;
  readonly x: number;
  readonly y: number;
  readonly toZ: number;
  readonly toX: number;
  readonly toY: number;
}

export interface FloorView {
  readonly z: number;
  readonly knownCells: readonly Cell[];
  readonly visibleCells: readonly Cell[];
  readonly walls: readonly Cell[];
  readonly lowCover: readonly LowCover[];
  readonly links: readonly FloorLink[];
}

export interface PublicUnit {
  readonly id: string;
  readonly name: string;
  readonly team: TeamId;
  readonly weapon: WeaponId;
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly hp: number;
  readonly maxHp: number;
  readonly parts: readonly PartState[];
  readonly ap: number;
  readonly range: number;
  readonly magazine: number;
  readonly magazineSize: number;
  readonly reserveMagazines: number;
  readonly status: UnitStatus;
  readonly ready: boolean;
  readonly aiming: boolean;
  readonly medkits: number;
  readonly overwatch: Direction | null;
}

export interface TeamView {
  readonly missionId: string;
  readonly round: number;
  readonly phase: PhaseId;
  readonly revision: number;
  readonly copies: number;
  readonly doorOpen: boolean;
  readonly result: MissionResult | null;
  readonly width: number;
  readonly height: number;
  readonly knownCells: readonly Cell[];
  readonly visibleCells: readonly Cell[];
  readonly walls: readonly Cell[];
  readonly lowCover: readonly LowCover[];
  readonly terminal: { readonly id: string; readonly x: number; readonly y: number } | null;
  readonly door: { readonly id: string; readonly x: number; readonly y: number } | null;
  readonly extraction: readonly Cell[];
  readonly units: readonly PublicUnit[];
  readonly levelCount: number;
  readonly floors: readonly FloorView[];
}

export function createMissionState(spec: MissionSpec, seed: number): MissionState {
  if (!Number.isInteger(seed)) throw new Error("Seed muss ganzzahlig sein");
  assertMissionLevels(spec);
  const floors = floorsOf(spec);
  const seen = new Set<string>();
  const units: UnitState[] = [];
  for (const spawn of spec.spawns) {
    if (seen.has(spawn.id)) throw new Error("Spawn-Id ist doppelt");
    seen.add(spawn.id);
    const weapon = weaponStats(spawn.weapon);
    const parts = freshParts();
    // Abgeleitete HP sind die Summe der Teilpunkte. 0 bleibt kampfunfähig.
    const maxHp = derivedHp(parts);
    const patrol = spawn.patrol.map((cell) => ({ x: cell.x, y: cell.y }));
    const first = patrol[0];
    if (spawn.team === "enemy" && (!first || first.x !== spawn.x || first.y !== spawn.y)) {
      throw new Error("Patrouille beginnt nicht auf dem Gegner");
    }
    const z = spawn.z ?? 0;
    if (!floors.some((floor) => floor.z === z)) throw new Error("Spawn-Etage ist ungültig");
    units.push({
      id: spawn.id,
      name: spawn.name,
      team: spawn.team,
      weapon: spawn.weapon,
      x: spawn.x,
      y: spawn.y,
      z,
      hp: maxHp,
      maxHp,
      parts,
      ap: spawn.team === "crew" ? CREW_AP : 0,
      range: weapon.range,
      magazine: weapon.magazine,
      magazineSize: weapon.magazine,
      reserveMagazines: RESERVE_MAGAZINES,
      status: "active",
      ready: false,
      aiming: false,
      medkits: spawn.team === "crew" ? 1 : 0,
      overwatch: null,
      patrol,
      patrolIndex: 0,
    });
  }
  units.sort((a, b) => compareId(a.id, b.id));
  return absorbSight(
    {
      missionId: spec.id,
      rulesVersion: RULES_VERSION,
      contentHash: spec.hash,
      seed,
      round: 1,
      completedRounds: 0,
      phase: "crew",
      revision: 1,
      combatRng: createRng(seed, "combat"),
      botRng: createRng(seed, "bot"),
      copies: 0,
      doorOpen: false,
      contacts: [],
      knownCells: [],
      knownLevels: [],
      units,
      result: null,
    },
    spec,
  );
}

export function applyCommand(state: MissionState, spec: MissionSpec, command: CrewCommand): StepResult {
  const step = applyCrewCommand(state, spec, command);
  if (step.rejection !== null || step.state === state) return step;
  const seen = absorbSight(step.state, spec);
  if (seen === step.state) return step;
  return { state: seen, events: step.events, rejection: null };
}

export function closeTeamPhase(state: MissionState, spec: MissionSpec): StepResult {
  if (state.result || state.phase === "ended") {
    return { state, events: [], rejection: "Die Mission ist beendet." };
  }
  if (state.phase !== "crew") return { state, events: [], rejection: "Die Crewphase ist vorbei." };
  return finishCrewPhase(state, spec);
}

function applyCrewCommand(state: MissionState, spec: MissionSpec, command: CrewCommand): StepResult {
  if (state.result || state.phase === "ended") {
    return { state, events: [], rejection: "Die Mission ist beendet." };
  }
  if (state.phase !== "crew") return { state, events: [], rejection: "Die Crewphase ist vorbei." };
  const unit = findUnit(state, command.unitId);
  if (!unit || unit.team !== "crew") return { state, events: [], rejection: "Unbekannter Runner." };
  if (unit.status !== "active") return { state, events: [], rejection: "Dieser Runner ist nicht handlungsfähig." };

  if (command.kind === "ready") return markReady(state, spec, unit.id);
  if (command.kind === "move") return moveUnit(state, spec, unit, command.x, command.y, command.z);
  if (command.kind === "interact") return interact(state, spec, unit, command.targetId);
  if (command.kind === "extract") return extract(state, spec, unit);
  if (command.kind === "shoot") return shoot(state, spec, unit, command.targetId);
  if (command.kind === "aim") return aim(state, unit);
  if (command.kind === "heal") return heal(state, unit, command.targetId, command.part);
  if (command.kind === "overwatch") return overwatch(state, unit, command.direction);
  return reload(state, unit);
}

export function projectTeam(state: MissionState, spec: MissionSpec): TeamView {
  const floors = projectFloors(state, spec);
  const ground = floors[0] ?? { z: 0, knownCells: [], visibleCells: [], walls: [], lowCover: [], links: [] };
  const known = new Set(ground.knownCells.map(cellKey));
  const units: PublicUnit[] = [];
  for (const unit of state.units) {
    if (unit.team === "enemy" && !teamSees(state, spec, "crew", unit)) continue;
    units.push(toPublic(unit));
  }
  return {
    missionId: state.missionId,
    round: state.round,
    phase: state.phase,
    revision: state.revision,
    copies: state.copies,
    doorOpen: state.doorOpen,
    result: state.result,
    width: spec.width,
    height: spec.height,
    knownCells: ground.knownCells,
    visibleCells: ground.visibleCells,
    walls: ground.walls,
    lowCover: ground.lowCover,
    terminal: known.has(cellKey(spec.terminal)) ? { id: spec.terminal.id, x: spec.terminal.x, y: spec.terminal.y } : null,
    door: known.has(cellKey(spec.door)) ? { id: spec.door.id, x: spec.door.x, y: spec.door.y } : null,
    extraction: spec.extraction.filter((cell) => known.has(cellKey(cell))).map(copyCell),
    units,
    levelCount: floors.length,
    floors,
  };
}

export function projectEvents(events: readonly MissionEvent[], view: TeamView): MissionEvent[] {
  const visible = new Set(view.units.map((unit) => unit.id));
  const allowed: MissionEvent[] = [];
  for (const event of events) {
    if (event.type === "UnitMoved" && !visible.has(event.unitId)) continue;
    if (event.type === "ShotResolved" && (!visible.has(event.shooterId) || !visible.has(event.targetId))) continue;
    allowed.push(event);
  }
  return allowed;
}

export function missionChecksum(state: MissionState): string {
  return stableHash(canonical(state));
}

export function stableHash(text: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function battleMapOf(spec: MissionSpec, doorOpen: boolean, z = 0): BattleMap {
  const floor = floorsOf(spec).find((item) => item.z === z);
  if (!floor) {
    const walls: Cell[] = [];
    for (let y = 0; y < spec.height; y += 1) for (let x = 0; x < spec.width; x += 1) walls.push({ x, y });
    return { width: spec.width, height: spec.height, walls, lowCover: [] };
  }
  if (z === 0 && doorOpen) return { width: spec.width, height: spec.height, walls: floor.walls, lowCover: floor.lowCover };
  const walls = z === 0 ? [...floor.walls, { x: spec.door.x, y: spec.door.y }] : [...floor.walls];
  return { width: spec.width, height: spec.height, walls, lowCover: floor.lowCover };
}

function markReady(state: MissionState, spec: MissionSpec, unitId: string): StepResult {
  const readyState = updateUnit(state, unitId, { ready: true });
  const active = crewActive(readyState);
  if (active.some((unit) => !unit.ready)) return { state: readyState, events: [], rejection: null };
  return finishCrewPhase(readyState, spec);
}

function moveUnit(state: MissionState, spec: MissionSpec, unit: UnitState, x: number, y: number, z?: number): StepResult {
  if (!Number.isInteger(x) || !Number.isInteger(y)) return { state, events: [], rejection: "Ziel ist kein Feld." };
  const toZ = z === undefined ? unit.z : z;
  if (!Number.isInteger(toZ)) return { state, events: [], rejection: "Ziel ist kein Feld." };
  if (toZ === unit.z) {
    if (!orthogonal(unit, { x, y })) return { state, events: [], rejection: "Nur ein orthogonales Nachbarfeld." };
    const cost = stepAp(unit.parts);
    if (unit.ap < cost) return { state, events: [], rejection: "Zu wenig Aktionspunkte." };
    if (!cellFree(state, spec, x, y, unit.id, unit.z)) return { state, events: [], rejection: "Feld ist blockiert." };
    const next = updateUnit(state, unit.id, { x, y, ap: unit.ap - cost, ...dropStance(unit) });
    return finishStep(next, spec, unit.id, [{ type: "UnitMoved", unitId: unit.id, x, y, z: unit.z }]);
  }
  const link = resolveLink(spec, { z: unit.z, x: unit.x, y: unit.y }, { z: toZ, x, y });
  if (!link) return { state, events: [], rejection: "Kein Übergang zu diesem Feld." };
  const cost = linkAp(link.kind);
  if (unit.ap < cost) return { state, events: [], rejection: "Zu wenig Aktionspunkte." };
  if (!cellFree(state, spec, x, y, unit.id, toZ)) return { state, events: [], rejection: "Feld ist blockiert." };
  const next = updateUnit(state, unit.id, { x, y, z: toZ, ap: unit.ap - cost, ...dropStance(unit) });
  return finishStep(next, spec, unit.id, [{ type: "UnitMoved", unitId: unit.id, x, y, z: toZ }]);
}

function aim(state: MissionState, unit: UnitState): StepResult {
  if (unit.aiming) return { state, events: [], rejection: "Bereits gezielt." };
  if (unit.ap < actionAp("aim")) return { state, events: [], rejection: "Zu wenig Aktionspunkte." };
  const next = updateUnit(state, unit.id, { ...dropStance(unit), ap: unit.ap - actionAp("aim"), aiming: true });
  return { state: next, events: [], rejection: null };
}

function heal(state: MissionState, unit: UnitState, targetId: string, part: BodyPartId): StepResult {
  if (!isBodyPart(part)) return { state, events: [], rejection: "Körperteil ist ungültig." };
  if (unit.medkits < 1) return { state, events: [], rejection: "Kein Medkit." };
  if (unit.ap < actionAp("heal")) return { state, events: [], rejection: "Zu wenig Aktionspunkte." };
  const target = findUnit(state, targetId);
  if (!target || target.team !== "crew") return { state, events: [], rejection: "Kein gültiges Ziel." };
  if (target.status !== "active") return { state, events: [], rejection: "Ziel ist nicht handlungsfähig." };
  if (target.id !== unit.id && !orthogonal(unit, target)) return { state, events: [], rejection: "Nicht in Reichweite." };
  const treated = treatPart(target.parts, part);
  if (!treated) return { state, events: [], rejection: "Dieses Teil braucht kein Medkit." };
  const hp = derivedHp(treated.parts);
  const spent = updateUnit(state, unit.id, {
    ap: unit.ap - actionAp("heal"),
    medkits: unit.medkits - 1,
    ...dropStance(unit),
    ...(target.id === unit.id ? { hp, parts: treated.parts } : {}),
  });
  const next = target.id === unit.id ? spent : updateUnit(spent, target.id, { hp, parts: treated.parts });
  return { state: next, events: [], rejection: null };
}

function overwatch(state: MissionState, unit: UnitState, direction: Direction): StepResult {
  if (!isDirection(direction)) return { state, events: [], rejection: "Richtung ist ungültig." };
  if (unit.overwatch) return { state, events: [], rejection: "Haltung besteht bereits." };
  if (unit.ap < actionAp("overwatch")) return { state, events: [], rejection: "Zu wenig Aktionspunkte." };
  if (unit.magazine < 1) return { state, events: [], rejection: "Magazin ist leer." };
  const next = updateUnit(state, unit.id, {
    ap: unit.ap - actionAp("overwatch"),
    magazine: unit.magazine - 1,
    overwatch: direction,
    aiming: false,
  });
  return { state: next, events: [], rejection: null };
}

function interact(state: MissionState, spec: MissionSpec, unit: UnitState, targetId: string): StepResult {
  if (unit.ap < INTERACT_AP) return { state, events: [], rejection: "Zu wenig Aktionspunkte." };
  if (targetId === spec.terminal.id) {
    if (unit.z !== 0 || !orthogonal(unit, spec.terminal)) return { state, events: [], rejection: "Nicht am Terminal." };
    if (state.copies >= 2) return { state, events: [], rejection: "Die Daten sind bereits kopiert." };
    const copies = state.copies + 1;
    const spent = updateUnit({ ...state, copies }, unit.id, { ap: unit.ap - INTERACT_AP, ...dropStance(unit) });
    const judged = judge(spent);
    return {
      state: judged,
      events: endedEvents(spent, judged, [{ type: "ObjectiveChanged", copies, doorOpen: state.doorOpen }]),
      rejection: null,
    };
  }
  if (targetId === spec.door.id) {
    if (unit.z !== 0 || !orthogonal(unit, spec.door)) return { state, events: [], rejection: "Nicht an der Tür." };
    if (state.doorOpen) return { state, events: [], rejection: "Die Tür ist bereits offen." };
    const spent = updateUnit({ ...state, doorOpen: true }, unit.id, { ap: unit.ap - INTERACT_AP, ...dropStance(unit) });
    const judged = judge(spent);
    return {
      state: judged,
      events: endedEvents(spent, judged, [{ type: "ObjectiveChanged", copies: state.copies, doorOpen: true }]),
      rejection: null,
    };
  }
  return { state, events: [], rejection: "Unbekanntes Ziel." };
}

function extract(state: MissionState, spec: MissionSpec, unit: UnitState): StepResult {
  if (unit.ap < EXTRACT_AP) return { state, events: [], rejection: "Zu wenig Aktionspunkte." };
  if (unit.z !== 0 || !spec.extraction.some((cell) => cell.x === unit.x && cell.y === unit.y)) {
    return { state, events: [], rejection: "Nicht in der Extraktionszone." };
  }
  const spent = updateUnit(state, unit.id, {
    status: "extracted",
    ap: unit.ap - EXTRACT_AP,
    ready: false,
    ...dropStance(unit),
  });
  const judged = judge(spent);
  return { state: judged, events: endedEvents(spent, judged, []), rejection: null };
}

function shoot(state: MissionState, spec: MissionSpec, shooter: UnitState, targetId: string): StepResult {
  const target = findUnit(state, targetId);
  if (!target || target.team === shooter.team) return { state, events: [], rejection: "Kein gültiges Ziel." };
  if (target.status !== "active") return { state, events: [], rejection: "Ziel ist nicht handlungsfähig." };
  const bonus = shooter.aiming ? AIM_BONUS : 0;
  const released = dropStance(shooter);
  const prepared = updateUnit(state, shooter.id, released);
  const actor = findUnit(prepared, shooter.id);
  if (!actor) return { state, events: [], rejection: "Unbekannter Runner." };
  const fired = resolveFire(prepared, spec, actor, target, bonus, false);
  if (fired.rejection !== null) return { state, events: [], rejection: fired.rejection };
  return fired;
}

function reload(state: MissionState, unit: UnitState): StepResult {
  if (unit.ap < actionAp("reload")) return { state, events: [], rejection: "Zu wenig Aktionspunkte." };
  if (unit.reserveMagazines < 1) return { state, events: [], rejection: "Keine Reservemagazine." };
  const released = unit.magazine + (unit.overwatch ? 1 : 0);
  if (released >= unit.magazineSize) return { state, events: [], rejection: "Magazin ist voll." };
  const next = updateUnit(state, unit.id, {
    ap: unit.ap - actionAp("reload"),
    magazine: unit.magazineSize,
    reserveMagazines: unit.reserveMagazines - 1,
    aiming: false,
    overwatch: null,
  });
  return { state: next, events: [], rejection: null };
}

function finishCrewPhase(state: MissionState, spec: MissionSpec): StepResult {
  const events: MissionEvent[] = [{ type: "PhaseChanged", phase: "enemy", round: state.round }];
  let current: MissionState = releaseTeam({ ...state, phase: "enemy", revision: state.revision + 1 }, "enemy");
  const bled = bleedUnits(current);
  current = bled.state;
  events.push(...bled.events);
  if (current.result) return { state: current, events, rejection: null };
  const order = current.units
    .filter((unit) => unit.team === "enemy" && unit.status === "active")
    .map((unit) => unit.id)
    .sort(compareId);
  for (const enemyId of order) {
    const enemy = findUnit(current, enemyId);
    if (!enemy || enemy.status !== "active") continue;
    current = updateUnit(current, enemyId, { ap: CREW_AP });
    current = rememberContacts(current, spec);
    const turned = enemyTurn(current, spec, enemyId);
    current = rememberContacts(turned.state, spec);
    events.push(...turned.events);
    if (current.result) return { state: current, events, rejection: null };
  }
  const completedRounds = state.completedRounds + 1;
  if (completedRounds >= ROUND_LIMIT) {
    const sealed = seal(current, "niederlage", "rundenlimit", state.round, completedRounds);
    events.push({ type: "MissionEnded", outcome: "niederlage", round: state.round });
    return { state: sealed, events, rejection: null };
  }
  const refreshed = current.units.map((unit) =>
    unit.team === "crew" && unit.status === "active"
      ? { ...unit, ap: CREW_AP, ready: false, ...dropStance(unit) }
      : unit,
  );
  const next: MissionState = {
    ...current,
    units: refreshed,
    completedRounds,
    round: state.round + 1,
    phase: "crew",
    revision: current.revision + 1,
  };
  events.push({ type: "PhaseChanged", phase: "crew", round: next.round });
  return { state: next, events, rejection: null };
}

function enemyShot(state: MissionState, spec: MissionSpec, shooter: UnitState): StepResult {
  const options = state.units.filter(
    (unit) => unit.team === "crew" && unit.status === "active" && canFire(state, spec, shooter, unit),
  );
  options.sort((a, b) => manhattan(shooter, a) - manhattan(shooter, b) || compareId(a.id, b.id));
  const target = options[0];
  if (!target) return { state, events: [], rejection: null };
  return resolveFire(state, spec, shooter, target, 0, false);
}

function enemyTurn(state: MissionState, spec: MissionSpec, unitId: string): StepResult {
  const shooter = findUnit(state, unitId);
  if (!shooter || shooter.status !== "active") return { state, events: [], rejection: null };
  const fired = enemyShot(state, spec, shooter);
  if (fired.state.result) return fired;
  let current = fired.state;
  const events = [...fired.events];
  const lived = findUnit(current, unitId);
  if (!lived || lived.status !== "active") return { state: current, events, rejection: null };
  if (visibleCrew(current, spec, lived).length > 0) {
    const stepped = enemyRole(lived) === "flanker" ? flankStep(current, spec, lived) : guardCoverStep(current, spec, lived);
    if (stepped.state !== current) {
      current = stepped.state;
      events.push(...stepped.events);
      if (current.result) return { state: current, events, rejection: null };
    }
    const after = findUnit(current, unitId);
    if (!after || after.status !== "active") return { state: current, events, rejection: null };
    const held = holdContact(current, spec, after);
    if (held) return { state: held.state, events: [...events, ...held.events], rejection: null };
    return { state: current, events, rejection: null };
  }
  const chased = pursueStep(current, spec, lived);
  if (chased.state !== current) return { state: chased.state, events: [...events, ...chased.events], rejection: null };
  const walked = enemyStep(current, spec, unitId);
  return { state: walked.state, events: [...events, ...walked.events], rejection: null };
}

const STEP_DELTA: Readonly<Record<Direction, Cell>> = {
  n: { x: 0, y: -1 },
  e: { x: 1, y: 0 },
  s: { x: 0, y: 1 },
  w: { x: -1, y: 0 },
};

function enemyRole(unit: UnitState): "guard" | "flanker" {
  // Handbau kennzeichnet Flanker über die Id, der Generator über den Namen.
  if (unit.id.startsWith("flanker") || unit.name.startsWith("Flanker")) return "flanker";
  return "guard";
}

function guardCoverStep(state: MissionState, spec: MissionSpec, unit: UnitState): StepResult {
  const idle = { state, events: [] as const, rejection: null };
  if (unit.ap < stepAp(unit.parts)) return idle;
  const target = visibleCrew(state, spec, unit)[0];
  if (!target) return idle;
  const map = battleMapOf(spec, state.doorOpen, unit.z);
  if (coverPenalty(map, target, unit) === 25) return idle;
  for (const direction of DIRECTIONS) {
    const delta = STEP_DELTA[direction];
    const next = { x: unit.x + delta.x, y: unit.y + delta.y };
    if (!cellFree(state, spec, next.x, next.y, unit.id, unit.z)) continue;
    if (coverPenalty(map, target, next) !== 25) continue;
    if (!seesUnit(map, next, target, SIGHT_RANGE)) continue;
    return stepOnto(state, spec, unit, next.x, next.y);
  }
  return idle;
}

function flankStep(state: MissionState, spec: MissionSpec, unit: UnitState): StepResult {
  const idle = { state, events: [] as const, rejection: null };
  if (unit.ap < stepAp(unit.parts)) return idle;
  const target = visibleCrew(state, spec, unit)[0];
  if (!target) return idle;
  const map = battleMapOf(spec, state.doorOpen, unit.z);
  const currentPenalty = coverPenalty(map, unit, target);
  let best: Cell | null = null;
  for (const direction of DIRECTIONS) {
    const delta = STEP_DELTA[direction];
    const next = { x: unit.x + delta.x, y: unit.y + delta.y };
    if (!cellFree(state, spec, next.x, next.y, unit.id, unit.z)) continue;
    if (!seesUnit(map, next, target, SIGHT_RANGE) || manhattan(next, target) > unit.range) continue;
    if (coverPenalty(map, next, target) >= currentPenalty) continue;
    best = next;
    break;
  }
  if (!best) return idle;
  return stepOnto(state, spec, unit, best.x, best.y);
}

function pursueStep(state: MissionState, spec: MissionSpec, unit: UnitState): StepResult {
  const idle = { state, events: [] as const, rejection: null };
  if (unit.ap < stepAp(unit.parts)) return idle;
  const contact = nearestContact(state, unit);
  if (!contact || (contact.x === unit.x && contact.y === unit.y)) return idle;
  const map = battleMapOf(spec, state.doorOpen, unit.z);
  const blocks = occupied(state, spec, unit.id, unit.z);
  const horizon = spec.width * spec.height;
  const goals: Cell[] = [{ x: contact.x, y: contact.y }];
  for (const direction of DIRECTIONS) {
    const delta = STEP_DELTA[direction];
    goals.push({ x: contact.x + delta.x, y: contact.y + delta.y });
  }
  let best: readonly Cell[] | null = null;
  for (const goal of goals) {
    if (goal.x === unit.x && goal.y === unit.y) continue;
    const path = pathTo(map, blocks, unit, goal, horizon);
    if (!path || path.length === 0) continue;
    if (!best || path.length < best.length) best = path;
  }
  const next = best?.[0];
  if (!next || manhattan(next, contact) >= manhattan(unit, contact)) return idle;
  return stepOnto(state, spec, unit, next.x, next.y);
}

function stepOnto(state: MissionState, spec: MissionSpec, unit: UnitState, x: number, y: number): StepResult {
  if (!cellFree(state, spec, x, y, unit.id, unit.z)) return { state, events: [], rejection: null };
  const moved = updateUnit(state, unit.id, {
    x,
    y,
    ap: unit.ap - stepAp(unit.parts),
    ...dropStance(unit),
  });
  return finishStep(moved, spec, unit.id, [{ type: "UnitMoved", unitId: unit.id, x, y, z: unit.z }]);
}

function visibleCrew(state: MissionState, spec: MissionSpec, unit: UnitState): readonly UnitState[] {
  const map = battleMapOf(spec, state.doorOpen, unit.z);
  return state.units
    .filter((other) => other.team === "crew" && other.status === "active" && other.z === unit.z && seesUnit(map, unit, other, SIGHT_RANGE))
    .slice()
    .sort((left, right) => manhattan(unit, left) - manhattan(unit, right) || compareId(left.id, right.id));
}

function nearestContact(state: MissionState, unit: UnitState): Contact | null {
  let best: Contact | null = null;
  let bestDistance = 0;
  for (const contact of state.contacts) {
    const distance = manhattan(unit, contact);
    if (!best || distance < bestDistance || (distance === bestDistance && compareId(contact.id, best.id) < 0)) {
      best = contact;
      bestDistance = distance;
    }
  }
  return best;
}

function rememberContacts(state: MissionState, spec: MissionSpec): MissionState {
  const seen = new Map<string, Cell>();
  for (const enemy of state.units) {
    if (enemy.team !== "enemy" || enemy.status !== "active") continue;
    for (const crew of state.units) {
      if (crew.team !== "crew" || crew.status !== "active") continue;
      if (!lineOfSight(spec, state.doorOpen, enemy, crew)) continue;
      seen.set(crew.id, { x: crew.x, y: crew.y });
    }
  }
  const activeCrew = new Set(
    state.units.filter((unit) => unit.team === "crew" && unit.status === "active").map((unit) => unit.id),
  );
  const next: Contact[] = [];
  for (const id of [...seen.keys()].sort(compareId)) {
    const cell = seen.get(id);
    if (!cell) continue;
    next.push({ id, x: cell.x, y: cell.y });
  }
  for (const old of state.contacts) {
    if (seen.has(old.id) || !activeCrew.has(old.id)) continue;
    const stoodOn = state.units.some(
      (unit) => unit.team === "enemy" && unit.status === "active" && unit.x === old.x && unit.y === old.y,
    );
    if (stoodOn) continue;
    next.push({ id: old.id, x: old.x, y: old.y });
  }
  next.sort((left, right) => compareId(left.id, right.id));
  if (sameContacts(state.contacts, next)) return state;
  return { ...state, contacts: next, revision: state.revision + 1 };
}

function sameContacts(left: readonly Contact[], right: readonly Contact[]): boolean {
  if (left.length !== right.length) return false;
  for (let index = 0; index < left.length; index += 1) {
    const a = left[index];
    const b = right[index];
    if (!a || !b || a.id !== b.id || a.x !== b.x || a.y !== b.y) return false;
  }
  return true;
}

function occupied(state: MissionState, spec: MissionSpec, selfId: string, z = 0): Cell[] {
  const cells: Cell[] = [];
  if (z === 0) cells.push({ x: spec.terminal.x, y: spec.terminal.y });
  for (const unit of state.units) {
    if (unit.id === selfId || unit.status === "extracted" || unit.z !== z) continue;
    cells.push({ x: unit.x, y: unit.y });
  }
  return cells;
}

function holdContact(state: MissionState, spec: MissionSpec, unit: UnitState): StepResult | null {
  if (unit.overwatch || unit.ap < actionAp("overwatch") || unit.magazine < 1) return null;
  const map = battleMapOf(spec, state.doorOpen, unit.z);
  const seen = state.units
    .filter((other) => other.team === "crew" && other.status === "active" && other.z === unit.z && seesUnit(map, unit, other, SIGHT_RANGE))
    .slice()
    .sort((left, right) => manhattan(unit, left) - manhattan(unit, right) || compareId(left.id, right.id));
  const target = seen[0];
  const direction = target ? sectorFacing(unit, target) : null;
  if (!direction) return null;
  return {
    state: updateUnit(state, unit.id, {
      ap: unit.ap - actionAp("overwatch"),
      magazine: unit.magazine - 1,
      overwatch: direction,
      aiming: false,
    }),
    events: [],
    rejection: null,
  };
}

function enemyStep(state: MissionState, spec: MissionSpec, unitId: string): StepResult {
  const unit = findUnit(state, unitId);
  if (!unit || unit.status !== "active" || unit.patrol.length === 0) return { state, events: [], rejection: null };
  if (unit.ap < stepAp(unit.parts)) return { state, events: [], rejection: null };
  const nextIndex = (unit.patrolIndex + 1) % unit.patrol.length;
  const next = unit.patrol[nextIndex];
  if (!next || !orthogonal(unit, next) || !cellFree(state, spec, next.x, next.y, unit.id, unit.z)) {
    return { state, events: [], rejection: null };
  }
  const moved = updateUnit(state, unit.id, {
    x: next.x,
    y: next.y,
    ap: unit.ap - stepAp(unit.parts),
    patrolIndex: nextIndex,
    ...dropStance(unit),
  });
  return finishStep(moved, spec, unit.id, [{ type: "UnitMoved", unitId: unit.id, x: next.x, y: next.y, z: unit.z }]);
}

function resolveFire(
  state: MissionState,
  spec: MissionSpec,
  shooter: UnitState,
  target: UnitState,
  aimBonus: 0 | typeof AIM_BONUS,
  reaction: boolean,
): StepResult {
  if (!teamSees(state, spec, shooter.team, target)) return { state, events: [], rejection: "Kein Sichtkontakt." };
  if (!lineOfSight(spec, state.doorOpen, shooter, target)) return { state, events: [], rejection: "Keine Schusslinie." };
  if (manhattan(shooter, target) > shooter.range) return { state, events: [], rejection: "Außer Reichweite." };
  if (shooter.weapon === "rifle" && rifleBlocked(shooter.parts)) {
    return { state, events: [], rejection: "Beide Arme sind ausgefallen." };
  }
  const resolution = resolveShot(
    battleMapOf(spec, state.doorOpen, shooter.z),
    shooter,
    target,
    aimBonus,
    { hp: shooter.hp, ap: shooter.ap, magazine: shooter.magazine, range: shooter.range },
    target.parts,
    state.combatRng,
    reaction ? "reaction" : "action",
    shotPenalty(shooter.parts),
  );
  if (resolution.roll === null) {
    if (resolution.status === "no-ap") return { state, events: [], rejection: "Zu wenig Aktionspunkte." };
    if (resolution.status === "no-ammo") return { state, events: [], rejection: "Magazin ist leer." };
    if (resolution.status === "out-of-range") return { state, events: [], rejection: "Außer Reichweite." };
    return { state, events: [], rejection: "Keine Schusslinie." };
  }
  let next = updateUnit({ ...state, combatRng: resolution.rng }, shooter.id, {
    ap: resolution.shooterAp,
    magazine: reaction ? shooter.magazine : resolution.shooterMagazine,
    overwatch: reaction ? null : shooter.overwatch,
    aiming: false,
  });
  const wounded = findUnit(next, target.id) ?? target;
  next = updateUnit(next, target.id, wound(wounded, resolution.targetHp, resolution.parts));
  const judged = judge(next);
  const shotEvent: MissionEvent = {
    type: "ShotResolved",
    shooterId: shooter.id,
    targetId: target.id,
    status: resolution.status,
    damage: resolution.damage,
    part: resolution.part,
    wound: resolution.wound,
    reaction,
  };
  return { state: judged, events: endedEvents(next, judged, [shotEvent]), rejection: null };
}

function finishStep(state: MissionState, spec: MissionSpec, moverId: string, prior: MissionEvent[]): StepResult {
  const reacted = react(state, spec, moverId);
  if (reacted.state.result) return { state: reacted.state, events: [...prior, ...reacted.events], rejection: null };
  const judged = judge(reacted.state);
  return { state: judged, events: endedEvents(reacted.state, judged, [...prior, ...reacted.events]), rejection: null };
}

function react(state: MissionState, spec: MissionSpec, moverId: string): StepResult {
  const origin = findUnit(state, moverId);
  if (!origin || origin.status !== "active") return { state, events: [], rejection: null };
  const watchers = state.units
    .filter((unit) => unit.team !== origin.team && unit.status === "active" && unit.overwatch !== null)
    .slice()
    .sort((left, right) => compareId(left.id, right.id));
  let current = state;
  const events: MissionEvent[] = [];
  for (const watcher of watchers) {
    const mover = findUnit(current, moverId);
    const actor = findUnit(current, watcher.id);
    if (!mover || mover.status !== "active") break;
    if (!actor || actor.status !== "active" || !actor.overwatch) continue;
    if (!inSector(actor, mover, actor.overwatch)) continue;
    if (!lineOfSight(spec, current.doorOpen, actor, mover) || manhattan(actor, mover) > actor.range) continue;
    const shot = resolveFire(current, spec, actor, mover, 0, true);
    if (shot.rejection !== null) continue;
    current = shot.state;
    events.push(...shot.events);
    if (current.result) break;
  }
  return { state: current, events, rejection: null };
}

function releaseTeam(state: MissionState, team: TeamId): MissionState {
  let current = state;
  for (const unit of state.units) {
    if (unit.team !== team || unit.overwatch === null) continue;
    current = updateUnit(current, unit.id, dropStance(unit));
  }
  return current;
}

function dropStance(unit: UnitState): Pick<UnitState, "aiming" | "magazine" | "overwatch"> {
  return { aiming: false, overwatch: null, magazine: unit.magazine + (unit.overwatch ? 1 : 0) };
}

function wound(unit: UnitState, hp: number, parts: readonly PartState[]): Partial<UnitState> {
  const dead = hp <= 0;
  return {
    hp,
    parts,
    status: dead ? "down" : unit.status,
    ap: dead ? 0 : unit.ap,
    ready: dead ? false : unit.ready,
    aiming: dead ? false : unit.aiming,
    overwatch: dead ? null : unit.overwatch,
    magazine: dead && unit.overwatch ? unit.magazine + 1 : unit.magazine,
  };
}

function bleedUnits(state: MissionState): { readonly state: MissionState; readonly events: MissionEvent[] } {
  let changed = false;
  const units = state.units.map((unit) => {
    if (unit.status !== "active") return unit;
    const ticked = tickBleed(unit.parts);
    if (ticked.damage === 0) return unit;
    changed = true;
    return { ...unit, ...wound(unit, derivedHp(ticked.parts), ticked.parts) };
  });
  if (!changed) return { state, events: [] };
  const next = { ...state, units, revision: state.revision + 1 };
  const judged = judge(next);
  return { state: judged, events: endedEvents(next, judged, []) };
}

function isDirection(value: string): value is Direction {
  return DIRECTIONS.some((direction) => direction === value);
}

function canFire(state: MissionState, spec: MissionSpec, shooter: UnitState, target: UnitState): boolean {
  if (shooter.weapon === "rifle" && rifleBlocked(shooter.parts)) return false;
  if (shooter.ap < actionAp("shot") || shooter.magazine < 1) return false;
  if (target.status !== "active" || target.team === shooter.team) return false;
  if (!teamSees(state, spec, shooter.team, target)) return false;
  if (!lineOfSight(spec, state.doorOpen, shooter, target)) return false;
  return manhattan(shooter, target) <= shooter.range;
}

function teamSees(state: MissionState, spec: MissionSpec, team: TeamId, target: Cell & { readonly z?: number }): boolean {
  return state.units.some(
    (unit) => unit.team === team && unit.status === "active" && lineOfSight(spec, state.doorOpen, unit, target),
  );
}

function lineOfSight(spec: MissionSpec, doorOpen: boolean, from: Cell & { readonly z?: number }, to: Cell & { readonly z?: number }): boolean {
  const fromZ = from.z ?? 0;
  const toZ = to.z ?? 0;
  if (fromZ !== toZ) return false;
  return seesUnit(battleMapOf(spec, doorOpen, fromZ), from, to, SIGHT_RANGE);
}

function absorbSight(state: MissionState, spec: MissionSpec): MissionState {
  const knownCells = unionCells(state.knownCells, crewVisible(state, spec, 0));
  let knownLevels = state.knownLevels;
  let levelsChanged = false;
  for (const floor of floorsOf(spec)) {
    if (floor.z === 0) continue;
    const prior = knownLevels.find((item) => item.z === floor.z)?.cells ?? [];
    const seen = unionCells(prior, crewVisible(state, spec, floor.z));
    if (seen === prior) continue;
    levelsChanged = true;
    knownLevels = knownLevels
      .filter((item) => item.z !== floor.z)
      .concat({ z: floor.z, cells: seen })
      .sort((left, right) => left.z - right.z);
  }
  if (knownCells === state.knownCells && !levelsChanged) return state;
  return { ...state, knownCells, knownLevels };
}

function crewVisible(state: MissionState, spec: MissionSpec, z = 0): Cell[] {
  const origins: Cell[] = [];
  for (const unit of state.units) {
    if (unit.team === "crew" && unit.status === "active" && unit.z === z) origins.push({ x: unit.x, y: unit.y });
  }
  return teamVisibleCells(battleMapOf(spec, state.doorOpen, z), origins, SIGHT_RANGE);
}

function knownOn(state: MissionState, z: number): readonly Cell[] {
  if (z === 0) return state.knownCells;
  return state.knownLevels.find((item) => item.z === z)?.cells ?? [];
}

function linksOn(spec: MissionSpec, z: number, known: ReadonlySet<string>): FloorLink[] {
  const links: FloorLink[] = [];
  for (const link of linksOf(spec)) {
    const ends = [
      { z: link.fromZ, x: link.fromX, y: link.fromY, toZ: link.toZ, toX: link.toX, toY: link.toY },
      { z: link.toZ, x: link.toX, y: link.toY, toZ: link.fromZ, toX: link.fromX, toY: link.fromY },
    ];
    for (const end of ends) {
      if (end.z !== z || !known.has(cellKey(end))) continue;
      links.push({ id: link.id, kind: link.kind, x: end.x, y: end.y, toZ: end.toZ, toX: end.toX, toY: end.toY });
    }
  }
  links.sort((left, right) => left.y - right.y || left.x - right.x || compareId(left.id, right.id));
  return links;
}

function projectFloors(state: MissionState, spec: MissionSpec): FloorView[] {
  return floorsOf(spec).map((floor) => {
    const knownCells = knownOn(state, floor.z).map(copyCell);
    const known = new Set(knownCells.map(cellKey));
    const map = battleMapOf(spec, state.doorOpen, floor.z);
    return {
      z: floor.z,
      knownCells,
      visibleCells: crewVisible(state, spec, floor.z).map(copyCell),
      walls: map.walls
        .filter((wall) => known.has(cellKey(wall)) && (floor.z !== 0 || !sameCell(wall, spec.door)))
        .map(copyCell),
      lowCover: floor.lowCover
        .filter((cover) => known.has(cellKey(cover)))
        .map((cover) => ({ id: cover.id, x: cover.x, y: cover.y, protects: cover.protects })),
      links: linksOn(spec, floor.z, known),
    };
  });
}

function copyCell(cell: Cell): Cell {
  return { x: cell.x, y: cell.y };
}

function cellKey(cell: Cell): string {
  return `${cell.x},${cell.y}`;
}

function sameCell(left: Cell, right: Cell): boolean {
  return left.x === right.x && left.y === right.y;
}

function judge(state: MissionState): MissionState {
  if (state.result) return state;
  const crew = state.units.filter((unit) => unit.team === "crew");
  const active = crew.filter((unit) => unit.status === "active");
  const extracted = crew.filter((unit) => unit.status === "extracted");
  if (state.copies >= 2 && extracted.length >= 1 && active.length === 0) {
    return seal(state, "sieg", "extraktion", state.round, state.completedRounds);
  }
  if (active.length === 0 && crew.length > 0) {
    return seal(state, "niederlage", "keine-handlungsfaehigen", state.round, state.completedRounds);
  }
  return state;
}

function seal(
  state: MissionState,
  outcome: OutcomeId,
  reason: MissionResult["reason"],
  round: number,
  completedRounds: number,
): MissionState {
  const crew = state.units.filter((unit) => unit.team === "crew");
  return {
    ...state,
    phase: "ended",
    revision: state.revision + 1,
    result: {
      outcome,
      reason,
      round,
      completedRounds,
      copies: state.copies,
      extractedIds: crew.filter((unit) => unit.status === "extracted").map((unit) => unit.id),
      downIds: crew.filter((unit) => unit.status === "down").map((unit) => unit.id),
    },
  };
}

function endedEvents(before: MissionState, after: MissionState, events: MissionEvent[]): MissionEvent[] {
  if (!before.result && after.result) {
    return [...events, { type: "MissionEnded", outcome: after.result.outcome, round: after.result.round }];
  }
  return events;
}

function cellFree(state: MissionState, spec: MissionSpec, x: number, y: number, ignoreId: string, z = 0): boolean {
  if (!Number.isInteger(x) || !Number.isInteger(y) || !Number.isInteger(z)) return false;
  if (x < 0 || y < 0 || x >= spec.width || y >= spec.height) return false;
  if (!floorsOf(spec).some((floor) => floor.z === z)) return false;
  if (z === 0 && spec.terminal.x === x && spec.terminal.y === y) return false;
  const map = battleMapOf(spec, state.doorOpen, z);
  if (map.walls.some((wall) => wall.x === x && wall.y === y)) return false;
  return !state.units.some((unit) => unit.id !== ignoreId && unit.status !== "extracted" && unit.z === z && unit.x === x && unit.y === y);
}

function updateUnit(state: MissionState, id: string, patch: Partial<UnitState>): MissionState {
  return {
    ...state,
    revision: state.revision + 1,
    units: state.units.map((unit) => (unit.id === id ? { ...unit, ...patch } : unit)),
  };
}

function findUnit(state: MissionState, id: string): UnitState | undefined {
  return state.units.find((unit) => unit.id === id);
}

function crewActive(state: MissionState): readonly UnitState[] {
  return state.units.filter((unit) => unit.team === "crew" && unit.status === "active");
}

function toPublic(unit: UnitState): PublicUnit {
  return {
    id: unit.id,
    name: unit.name,
    team: unit.team,
    weapon: unit.weapon,
    x: unit.x,
    y: unit.y,
    z: unit.z,
    hp: unit.hp,
    maxHp: unit.maxHp,
    parts: unit.parts.map((part) => ({ id: part.id, hp: part.hp, maxHp: part.maxHp, wound: part.wound })),
    ap: unit.ap,
    range: unit.range,
    magazine: unit.magazine,
    magazineSize: unit.magazineSize,
    reserveMagazines: unit.reserveMagazines,
    status: unit.status,
    ready: unit.ready,
    aiming: unit.aiming,
    medkits: unit.medkits,
    overwatch: unit.overwatch,
  };
}

function weaponStats(weapon: WeaponId): { readonly range: number; readonly magazine: number } {
  if (weapon === "sidearm") return { range: SIDEARM_RANGE, magazine: SIDEARM_MAGAZINE };
  return { range: RIFLE_RANGE, magazine: RIFLE_MAGAZINE };
}

function orthogonal(from: Cell, to: Cell): boolean {
  return Math.abs(from.x - to.x) + Math.abs(from.y - to.y) === 1;
}

function compareId(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map((item) => canonical(item)).join(",")}]`;
  if (value !== null && typeof value === "object") {
    const entries = Object.entries(value).sort((left, right) => compareId(left[0], right[0]));
    return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`).join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}
