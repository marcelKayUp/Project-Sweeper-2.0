import { MISSION_ID, RESERVE_MAGAZINES, ROUND_LIMIT, SIDEARM_MAGAZINE, type MissionResult, type MissionState, type OutcomeId, type WeaponId } from "./mission.ts";
import { RIFLE_MAGAZINE } from "./resolve.ts";

export const SAVE_VERSION = 1;
export const CAMPAIGN_ID = "lokal";
export const LOADOUT_MEDKITS = 1;
export const LOADOUT_MAGAZINES = 1 + RESERVE_MAGAZINES;
export const SAVE_COUNT_MAX = 99;
export const SAVE_SEED_MAX = 100;

export const RUNNER_IDS = ["kite", "voss", "nera", "sol"] as const;
export type CampaignRunnerId = (typeof RUNNER_IDS)[number];

export interface RunnerGear {
  readonly rifle: number;
  readonly sidearm: number;
  readonly rifleMagazines: number;
  readonly sidearmMagazines: number;
  readonly medkits: number;
}

export interface FrozenKit {
  readonly weapon: WeaponId;
  readonly magazines: number;
  readonly medkits: number;
}

export interface CampaignFreeze {
  readonly resultId: string;
  readonly missionId: typeof MISSION_ID;
  readonly seed: number;
  readonly kits: Readonly<Record<CampaignRunnerId, FrozenKit>>;
}

export interface BookedLine {
  readonly runnerId: CampaignRunnerId;
  readonly weapon: WeaponId;
  readonly magazines: number;
  readonly medkits: number;
  readonly spentMagazines: number;
  readonly spentMedkits: number;
}

export interface CampaignProgress {
  readonly bookedResults: number;
  readonly lastResultId: string;
  readonly lastOutcome: "" | OutcomeId;
  readonly lastReason: "" | MissionResult["reason"];
  readonly lastRound: number;
  readonly lines: readonly BookedLine[];
}

export interface CampaignState {
  readonly version: typeof SAVE_VERSION;
  readonly id: typeof CAMPAIGN_ID;
  readonly revision: number;
  readonly runners: Readonly<Record<CampaignRunnerId, RunnerGear>>;
  readonly freeze: CampaignFreeze | null;
  readonly booked: readonly string[];
  readonly progress: CampaignProgress;
}

export interface GearOffer {
  readonly rifle: number;
  readonly sidearm: number;
  readonly rifleMagazines: number;
  readonly sidearmMagazines: number;
  readonly medkits: number;
  readonly rifleReady: boolean;
  readonly sidearmReady: boolean;
}

export interface LoadoutChoice {
  readonly runnerId: string;
  readonly weapon: WeaponId;
}

export interface RunnerReturn {
  readonly runnerId: string;
  readonly weapon: WeaponId;
  readonly magazine: number;
  readonly magazineSize: number;
  readonly reserveMagazines: number;
  readonly overwatch: boolean;
  readonly medkits: number;
}

export interface MissionBooking {
  readonly resultId: string;
  readonly missionId: string;
  readonly seed: number;
  readonly outcome: OutcomeId;
  readonly reason: MissionResult["reason"];
  readonly round: number;
  readonly runners: readonly RunnerReturn[];
}

export type CampaignRejection =
  | "Ausrüstung fehlt."
  | "Ein Einsatz ist bereits eingefroren."
  | "Ergebnis ist bereits verbucht."
  | "Kein eingefrorener Einsatz."
  | "Ergebnis passt nicht zum Einsatz."
  | "Buchung ist unvollständig."
  | "Einsatz ist ungültig.";

export type CampaignResult =
  | { readonly ok: true; readonly state: CampaignState }
  | { readonly ok: false; readonly rejection: CampaignRejection; readonly state: CampaignState };

export type CampaignRead =
  | { readonly ok: true; readonly state: CampaignState; readonly migrated: boolean }
  | { readonly ok: false; readonly rejection: "Save ist ungültig." };

const RESULT_ID = /^ghost-floor-([1-9]\d{0,8})$/;
const GEAR_KEYS = ["rifle", "sidearm", "rifleMagazines", "sidearmMagazines", "medkits"] as const;
const KIT_KEYS = ["weapon", "magazines", "medkits"] as const;
const LINE_KEYS = ["runnerId", "weapon", "magazines", "medkits", "spentMagazines", "spentMedkits"] as const;
const PROGRESS_KEYS = ["bookedResults", "lastResultId", "lastOutcome", "lastReason", "lastRound", "lines"] as const;
const FREEZE_KEYS = ["resultId", "missionId", "seed", "kits"] as const;
const STATE_KEYS = ["version", "id", "revision", "runners", "freeze", "booked", "progress"] as const;

export function createCampaign(): CampaignState {
  return {
    version: SAVE_VERSION,
    id: CAMPAIGN_ID,
    revision: 0,
    runners: {
      kite: stock(),
      voss: stock(),
      nera: stock(),
      sol: stock(),
    },
    freeze: null,
    booked: [],
    progress: emptyProgress(),
  };
}

export function isCampaignRunner(id: string): id is CampaignRunnerId {
  return (RUNNER_IDS as readonly string[]).includes(id);
}

export function canField(gear: RunnerGear, weapon: WeaponId): boolean {
  if (gear.medkits < LOADOUT_MEDKITS) return false;
  if (weapon === "rifle") return gear.rifle >= 1 && gear.rifleMagazines >= LOADOUT_MAGAZINES;
  return gear.sidearm >= 1 && gear.sidearmMagazines >= LOADOUT_MAGAZINES;
}

export function gearOffer(state: CampaignState, runnerId: string): GearOffer {
  if (!isCampaignRunner(runnerId)) {
    return { rifle: 0, sidearm: 0, rifleMagazines: 0, sidearmMagazines: 0, medkits: 0, rifleReady: false, sidearmReady: false };
  }
  const gear = state.runners[runnerId];
  const open = state.freeze === null;
  return {
    rifle: gear.rifle,
    sidearm: gear.sidearm,
    rifleMagazines: gear.rifleMagazines,
    sidearmMagazines: gear.sidearmMagazines,
    medkits: gear.medkits,
    rifleReady: open && canField(gear, "rifle"),
    sidearmReady: open && canField(gear, "sidearm"),
  };
}

export function fieldRejection(state: CampaignState, runnerId: string, weapon: WeaponId): CampaignRejection | null {
  if (state.freeze) return "Ein Einsatz ist bereits eingefroren.";
  if (!isCampaignRunner(runnerId) || !canField(state.runners[runnerId], weapon)) return "Ausrüstung fehlt.";
  return null;
}

export function freezeLoadout(state: CampaignState, choices: readonly LoadoutChoice[], seed: number): CampaignResult {
  if (state.freeze) return rejected(state, "Ein Einsatz ist bereits eingefroren.");
  if (!Number.isInteger(seed) || seed < 1 || seed > SAVE_SEED_MAX) return rejected(state, "Einsatz ist ungültig.");
  const chosen = new Map<CampaignRunnerId, WeaponId>();
  for (const choice of choices) {
    if (!isCampaignRunner(choice.runnerId) || !isWeapon(choice.weapon) || chosen.has(choice.runnerId)) {
      return rejected(state, "Einsatz ist ungültig.");
    }
    chosen.set(choice.runnerId, choice.weapon);
  }
  if (chosen.size !== RUNNER_IDS.length) return rejected(state, "Einsatz ist ungültig.");
  const runners = { ...state.runners };
  const kits = {} as Record<CampaignRunnerId, FrozenKit>;
  for (const runnerId of RUNNER_IDS) {
    const weapon = chosen.get(runnerId);
    if (!weapon) return rejected(state, "Einsatz ist ungültig.");
    const next = checkout(state.runners[runnerId], weapon);
    if (!next) return rejected(state, "Ausrüstung fehlt.");
    runners[runnerId] = next;
    kits[runnerId] = { weapon, magazines: LOADOUT_MAGAZINES, medkits: LOADOUT_MEDKITS };
  }
  const resultId = resultIdFor(state.progress.bookedResults + 1);
  return {
    ok: true,
    state: nextState(state, runners, { resultId, missionId: MISSION_ID, seed, kits }, state.booked, state.progress),
  };
}

export function applyMissionResult(state: CampaignState, booking: MissionBooking): CampaignResult {
  if (state.booked.includes(booking.resultId)) return rejected(state, "Ergebnis ist bereits verbucht.");
  const freeze = state.freeze;
  if (!freeze) return rejected(state, "Kein eingefrorener Einsatz.");
  if (
    booking.resultId !== freeze.resultId ||
    booking.missionId !== freeze.missionId ||
    booking.seed !== freeze.seed ||
    !isOutcome(booking.outcome) ||
    !isReason(booking.reason) ||
    !Number.isInteger(booking.round) ||
    booking.round < 1 ||
    booking.round > ROUND_LIMIT
  ) {
    return rejected(state, "Ergebnis passt nicht zum Einsatz.");
  }
  const returns = new Map<CampaignRunnerId, { readonly magazines: number; readonly medkits: number; readonly weapon: WeaponId }>();
  for (const runner of booking.runners) {
    if (!isCampaignRunner(runner.runnerId) || returns.has(runner.runnerId)) return rejected(state, "Buchung ist unvollständig.");
    const kit = freeze.kits[runner.runnerId];
    if (runner.weapon !== kit.weapon) return rejected(state, "Buchung ist unvollständig.");
    const magazines = returnedMagazines(runner, kit.magazines);
    if (magazines === null || !Number.isInteger(runner.medkits) || runner.medkits < 0 || runner.medkits > kit.medkits) {
      return rejected(state, "Buchung ist unvollständig.");
    }
    returns.set(runner.runnerId, { magazines, medkits: runner.medkits, weapon: runner.weapon });
  }
  if (returns.size !== RUNNER_IDS.length) return rejected(state, "Buchung ist unvollständig.");
  const runners = { ...state.runners };
  const lines: BookedLine[] = [];
  for (const runnerId of RUNNER_IDS) {
    const back = returns.get(runnerId);
    if (!back) return rejected(state, "Buchung ist unvollständig.");
    const restored = restore(runners[runnerId], back.weapon, back.magazines, back.medkits);
    if (!restored) return rejected(state, "Buchung ist unvollständig.");
    runners[runnerId] = restored;
    const kit = freeze.kits[runnerId];
    lines.push({
      runnerId,
      weapon: back.weapon,
      magazines: back.weapon === "rifle" ? restored.rifleMagazines : restored.sidearmMagazines,
      medkits: restored.medkits,
      spentMagazines: kit.magazines - back.magazines,
      spentMedkits: kit.medkits - back.medkits,
    });
  }
  return {
    ok: true,
    state: nextState(state, runners, null, [...state.booked, booking.resultId], {
      bookedResults: state.progress.bookedResults + 1,
      lastResultId: booking.resultId,
      lastOutcome: booking.outcome,
      lastReason: booking.reason,
      lastRound: booking.round,
      lines,
    }),
  };
}

export function releaseFreeze(state: CampaignState, resultId?: string): { readonly state: CampaignState; readonly released: boolean } {
  const freeze = state.freeze;
  if (!freeze) return { state, released: false };
  if (resultId !== undefined && freeze.resultId !== resultId) return { state, released: false };
  const runners = { ...state.runners };
  for (const runnerId of RUNNER_IDS) {
    const kit = freeze.kits[runnerId];
    const restored = restore(runners[runnerId], kit.weapon, kit.magazines, kit.medkits);
    if (!restored) return { state, released: false };
    runners[runnerId] = restored;
  }
  return { state: nextState(state, runners, null, state.booked, state.progress), released: true };
}

export function bookingFromMission(mission: MissionState, resultId: string): MissionBooking | null {
  if (!mission.result || !Number.isInteger(mission.seed)) return null;
  const runners: RunnerReturn[] = [];
  for (const runnerId of RUNNER_IDS) {
    const unit = mission.units.find((item) => item.id === runnerId);
    if (!unit || unit.team !== "crew" || !isWeapon(unit.weapon)) return null;
    runners.push({
      runnerId,
      weapon: unit.weapon,
      magazine: unit.magazine,
      magazineSize: unit.magazineSize,
      reserveMagazines: unit.reserveMagazines,
      overwatch: unit.overwatch !== null,
      medkits: unit.medkits,
    });
  }
  return {
    resultId,
    missionId: mission.missionId,
    seed: mission.seed,
    outcome: mission.result.outcome,
    reason: mission.result.reason,
    round: mission.result.round,
    runners,
  };
}

export function readCampaign(raw: unknown): CampaignRead {
  const body = record(raw);
  if (!body) return invalid();
  if (body.version === 0) {
    const migrated = readVersionZero(body);
    return migrated ? { ok: true, state: migrated, migrated: true } : invalid();
  }
  if (body.version === SAVE_VERSION) {
    const state = readVersionOne(body);
    return state ? { ok: true, state, migrated: false } : invalid();
  }
  return invalid();
}

function stock(): RunnerGear {
  return {
    rifle: 1,
    sidearm: 1,
    rifleMagazines: LOADOUT_MAGAZINES,
    sidearmMagazines: LOADOUT_MAGAZINES,
    medkits: LOADOUT_MEDKITS,
  };
}

function emptyProgress(): CampaignProgress {
  return { bookedResults: 0, lastResultId: "", lastOutcome: "", lastReason: "", lastRound: 0, lines: [] };
}

function checkout(gear: RunnerGear, weapon: WeaponId): RunnerGear | null {
  if (!canField(gear, weapon)) return null;
  if (weapon === "rifle") {
    return { ...gear, rifle: gear.rifle - 1, rifleMagazines: gear.rifleMagazines - LOADOUT_MAGAZINES, medkits: gear.medkits - LOADOUT_MEDKITS };
  }
  return { ...gear, sidearm: gear.sidearm - 1, sidearmMagazines: gear.sidearmMagazines - LOADOUT_MAGAZINES, medkits: gear.medkits - LOADOUT_MEDKITS };
}

function restore(gear: RunnerGear, weapon: WeaponId, magazines: number, medkits: number): RunnerGear | null {
  const nextMedkits = gear.medkits + medkits;
  if (nextMedkits > SAVE_COUNT_MAX) return null;
  if (weapon === "rifle") {
    const rifle = gear.rifle + 1;
    const rifleMagazines = gear.rifleMagazines + magazines;
    if (rifle > SAVE_COUNT_MAX || rifleMagazines > SAVE_COUNT_MAX) return null;
    return { ...gear, rifle, rifleMagazines, medkits: nextMedkits };
  }
  const sidearm = gear.sidearm + 1;
  const sidearmMagazines = gear.sidearmMagazines + magazines;
  if (sidearm > SAVE_COUNT_MAX || sidearmMagazines > SAVE_COUNT_MAX) return null;
  return { ...gear, sidearm, sidearmMagazines, medkits: nextMedkits };
}

function returnedMagazines(end: RunnerReturn, kitMagazines: number): number | null {
  const size = end.weapon === "sidearm" ? SIDEARM_MAGAZINE : RIFLE_MAGAZINE;
  if (end.magazineSize !== size || !Number.isInteger(end.magazine) || end.magazine < 0 || end.magazine > size) return null;
  if (!Number.isInteger(end.reserveMagazines) || end.reserveMagazines < 0 || end.reserveMagazines > RESERVE_MAGAZINES) return null;
  if (typeof end.overwatch !== "boolean") return null;
  const held = end.magazine + (end.overwatch ? 1 : 0);
  if (held > size) return null;
  const returned = end.reserveMagazines + (held > 0 ? 1 : 0);
  if (returned > kitMagazines) return null;
  return returned;
}

function nextState(
  state: CampaignState,
  runners: CampaignState["runners"],
  freeze: CampaignFreeze | null,
  booked: readonly string[],
  progress: CampaignProgress,
): CampaignState {
  return {
    version: SAVE_VERSION,
    id: CAMPAIGN_ID,
    revision: state.revision + 1,
    runners,
    freeze,
    booked,
    progress,
  };
}

function rejected(state: CampaignState, rejection: CampaignRejection): CampaignResult {
  return { ok: false, rejection, state };
}

function invalid(): CampaignRead {
  return { ok: false, rejection: "Save ist ungültig." };
}

function resultIdFor(number: number): string {
  return `ghost-floor-${number}`;
}

function resultNumber(id: string): number | null {
  const match = RESULT_ID.exec(id);
  if (!match?.[1]) return null;
  const value = Number(match[1]);
  if (!Number.isInteger(value)) return null;
  return value;
}

function readVersionZero(body: Record<string, unknown>): CampaignState | null {
  if (!exactKeys(body, ["version", "runners"])) return null;
  const runners = readRunners(body.runners);
  if (!runners) return null;
  return { ...createCampaign(), runners };
}

function readVersionOne(body: Record<string, unknown>): CampaignState | null {
  if (!exactKeys(body, STATE_KEYS) || body.id !== CAMPAIGN_ID) return null;
  const revision = count(body.revision, 1_000_000_000);
  const runners = readRunners(body.runners);
  const booked = readBooked(body.booked);
  const progress = readProgress(body.progress);
  if (revision === null || !runners || !booked || !progress) return null;
  if (progress.bookedResults !== booked.length) return null;
  if (booked.length === 0) {
    if (progress.lastResultId !== "" || progress.lastOutcome !== "" || progress.lastReason !== "" || progress.lastRound !== 0 || progress.lines.length !== 0) {
      return null;
    }
  } else if (progress.lastResultId !== booked[booked.length - 1] || progress.lines.length !== RUNNER_IDS.length) {
    return null;
  }
  const freeze = readFreeze(body.freeze, booked);
  if (freeze === undefined) return null;
  if (freeze && !freezeFits(runners, freeze)) return null;
  return { version: SAVE_VERSION, id: CAMPAIGN_ID, revision, runners, freeze, booked, progress };
}

function readRunners(value: unknown): CampaignState["runners"] | null {
  const body = record(value);
  if (!body || !exactKeys(body, RUNNER_IDS)) return null;
  const runners = {} as Record<CampaignRunnerId, RunnerGear>;
  for (const runnerId of RUNNER_IDS) {
    const gear = readGear(body[runnerId]);
    if (!gear) return null;
    runners[runnerId] = gear;
  }
  return runners;
}

function readGear(value: unknown): RunnerGear | null {
  const body = record(value);
  if (!body || !exactKeys(body, GEAR_KEYS)) return null;
  const rifle = count(body.rifle, SAVE_COUNT_MAX);
  const sidearm = count(body.sidearm, SAVE_COUNT_MAX);
  const rifleMagazines = count(body.rifleMagazines, SAVE_COUNT_MAX);
  const sidearmMagazines = count(body.sidearmMagazines, SAVE_COUNT_MAX);
  const medkits = count(body.medkits, SAVE_COUNT_MAX);
  if (rifle === null || sidearm === null || rifleMagazines === null || sidearmMagazines === null || medkits === null) return null;
  return { rifle, sidearm, rifleMagazines, sidearmMagazines, medkits };
}

function readFreeze(value: unknown, booked: readonly string[]): CampaignFreeze | null | undefined {
  if (value === null) return null;
  const body = record(value);
  if (!body || !exactKeys(body, FREEZE_KEYS)) return undefined;
  const number = typeof body.resultId === "string" ? resultNumber(body.resultId) : null;
  if (!number || number !== booked.length + 1 || body.missionId !== MISSION_ID) return undefined;
  const seed = count(body.seed, SAVE_SEED_MAX);
  if (seed === null || seed < 1 || booked.includes(body.resultId as string)) return undefined;
  const kitsBody = record(body.kits);
  if (!kitsBody || !exactKeys(kitsBody, RUNNER_IDS)) return undefined;
  const kits = {} as Record<CampaignRunnerId, FrozenKit>;
  for (const runnerId of RUNNER_IDS) {
    const kit = readKit(kitsBody[runnerId]);
    if (!kit) return undefined;
    kits[runnerId] = kit;
  }
  return { resultId: body.resultId as string, missionId: MISSION_ID, seed, kits };
}

function readKit(value: unknown): FrozenKit | null {
  const body = record(value);
  if (!body || !exactKeys(body, KIT_KEYS) || !isWeaponValue(body.weapon)) return null;
  if (body.magazines !== LOADOUT_MAGAZINES || body.medkits !== LOADOUT_MEDKITS) return null;
  return { weapon: body.weapon, magazines: LOADOUT_MAGAZINES, medkits: LOADOUT_MEDKITS };
}

function readBooked(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  const booked: string[] = [];
  for (let index = 0; index < value.length; index += 1) {
    const id = value[index];
    if (typeof id !== "string" || resultNumber(id) !== index + 1) return null;
    booked.push(id);
  }
  return booked;
}

function readProgress(value: unknown): CampaignProgress | null {
  const body = record(value);
  if (!body || !exactKeys(body, PROGRESS_KEYS)) return null;
  const bookedResults = count(body.bookedResults, 1_000_000_000);
  const lastRound = count(body.lastRound, ROUND_LIMIT);
  const lastResultId = body.lastResultId;
  if (bookedResults === null || lastRound === null || typeof lastResultId !== "string") return null;
  if (lastResultId !== "" && resultNumber(lastResultId) === null) return null;
  const lastOutcome = readOutcome(body.lastOutcome);
  const lastReason = readReason(body.lastReason);
  if (lastOutcome === null || lastReason === null || !Array.isArray(body.lines)) return null;
  const lines: BookedLine[] = [];
  for (const entry of body.lines) {
    const line = readLine(entry);
    if (!line) return null;
    lines.push(line);
  }
  if (lines.length !== 0 && lines.length !== RUNNER_IDS.length) return null;
  for (let index = 0; index < lines.length; index += 1) {
    if (lines[index]?.runnerId !== RUNNER_IDS[index]) return null;
  }
  return { bookedResults, lastResultId, lastOutcome, lastReason, lastRound, lines };
}

function readLine(value: unknown): BookedLine | null {
  const body = record(value);
  if (!body || !exactKeys(body, LINE_KEYS) || typeof body.runnerId !== "string" || !isCampaignRunner(body.runnerId) || !isWeaponValue(body.weapon)) {
    return null;
  }
  const magazines = count(body.magazines, SAVE_COUNT_MAX);
  const medkits = count(body.medkits, SAVE_COUNT_MAX);
  const spentMagazines = count(body.spentMagazines, LOADOUT_MAGAZINES);
  const spentMedkits = count(body.spentMedkits, LOADOUT_MEDKITS);
  if (magazines === null || medkits === null || spentMagazines === null || spentMedkits === null) return null;
  return { runnerId: body.runnerId, weapon: body.weapon, magazines, medkits, spentMagazines, spentMedkits };
}

function freezeFits(runners: CampaignState["runners"], freeze: CampaignFreeze): boolean {
  for (const runnerId of RUNNER_IDS) {
    const gear = runners[runnerId];
    const kit = freeze.kits[runnerId];
    const weapons = kit.weapon === "rifle" ? gear.rifle : gear.sidearm;
    const magazines = kit.weapon === "rifle" ? gear.rifleMagazines : gear.sidearmMagazines;
    if (weapons + 1 > SAVE_COUNT_MAX || magazines + kit.magazines > SAVE_COUNT_MAX || gear.medkits + kit.medkits > SAVE_COUNT_MAX) return false;
  }
  return true;
}

function count(value: unknown, max: number): number | null {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0 || value > max) return null;
  return value;
}

function record(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function exactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const own = Object.keys(value);
  if (own.length !== keys.length) return false;
  return keys.every((key) => Object.prototype.hasOwnProperty.call(value, key));
}

function isWeapon(value: string): value is WeaponId {
  return value === "rifle" || value === "sidearm";
}

function isWeaponValue(value: unknown): value is WeaponId {
  return value === "rifle" || value === "sidearm";
}

function isOutcome(value: unknown): value is OutcomeId {
  return value === "sieg" || value === "niederlage";
}

function isReason(value: unknown): value is MissionResult["reason"] {
  return value === "extraktion" || value === "keine-handlungsfaehigen" || value === "rundenlimit";
}

function readOutcome(value: unknown): "" | OutcomeId | null {
  if (value === "") return "";
  return isOutcome(value) ? value : null;
}

function readReason(value: unknown): "" | MissionResult["reason"] | null {
  if (value === "") return "";
  return isReason(value) ? value : null;
}
