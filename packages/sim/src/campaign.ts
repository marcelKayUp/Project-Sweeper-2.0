import { MISSION_ID, RESERVE_MAGAZINES, ROUND_LIMIT, SIDEARM_MAGAZINE, type MissionResult, type MissionState, type OutcomeId, type WeaponId } from "./mission.ts";
import { RIFLE_MAGAZINE } from "./resolve.ts";

export const SAVE_VERSION = 3;
export const CAMPAIGN_ID = "lokal";
export const LOADOUT_MEDKITS = 1;
export const LOADOUT_MAGAZINES = 1 + RESERVE_MAGAZINES;
export const SAVE_COUNT_MAX = 99;
export const SAVE_SEED_MAX = 100;
export const PACK_COLUMNS = 4;
export const PACK_ROWS = 3;
export const PACK_CELLS = PACK_COLUMNS * PACK_ROWS;
export const GEAR_POSTS = ["rifle", "sidearm", "rifleMagazines", "sidearmMagazines", "medkits"] as const;
export type GearPost = (typeof GEAR_POSTS)[number];
export type StashDirection = "nehmen" | "legen";
export type HandId = "left" | "right";
export type HandFill = "empty" | "sidearm" | "rifle";
export type BeltFill = "empty" | "medkit";
export type PackFill = "empty" | "sidearm" | "rifle" | "rifleRest" | "rifleMagazine" | "sidearmMagazine";
export type PieceKind = "rifle" | "sidearm" | "rifleMagazine" | "sidearmMagazine" | "medkit";

export const SLOT_LIMITS: Readonly<Record<GearPost, number>> = {
  rifle: 1,
  sidearm: 1,
  rifleMagazines: LOADOUT_MAGAZINES,
  sidearmMagazines: LOADOUT_MAGAZINES,
  medkits: LOADOUT_MEDKITS,
};

export const RUNNER_IDS = ["kite", "voss", "nera", "sol"] as const;
export type CampaignRunnerId = (typeof RUNNER_IDS)[number];

export interface RunnerGear {
  readonly rifle: number;
  readonly sidearm: number;
  readonly rifleMagazines: number;
  readonly sidearmMagazines: number;
  readonly medkits: number;
}

export interface RunnerBody {
  readonly hands: { readonly left: HandFill; readonly right: HandFill };
  readonly belt: BeltFill;
  readonly pack: readonly PackFill[];
}

export type InventoryPlace =
  | { readonly area: "hands" }
  | { readonly area: "hand"; readonly hand: HandId }
  | { readonly area: "belt" }
  | { readonly area: "pack"; readonly index: number }
  | { readonly area: "stash"; readonly post: GearPost };

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
  readonly runners: Readonly<Record<CampaignRunnerId, RunnerBody>>;
  readonly lager: RunnerGear;
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
  readonly body: RunnerBody;
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
  | "Einsatz ist ungültig."
  | "Lager reicht nicht."
  | "Slot ist voll."
  | "Ziel passt nicht.";

export type CampaignResult =
  | { readonly ok: true; readonly state: CampaignState }
  | { readonly ok: false; readonly rejection: CampaignRejection; readonly state: CampaignState };

export type CampaignRead =
  | { readonly ok: true; readonly state: CampaignState; readonly migrated: boolean }
  | { readonly ok: false; readonly rejection: "Save ist ungültig." };

const RESULT_ID = /^ghost-floor-([1-9]\d{0,8})$/;
const GEAR_KEYS = ["rifle", "sidearm", "rifleMagazines", "sidearmMagazines", "medkits"] as const;
const BODY_KEYS = ["hands", "belt", "pack"] as const;
const HAND_KEYS = ["left", "right"] as const;
const KIT_KEYS = ["weapon", "magazines", "medkits"] as const;
const LINE_KEYS = ["runnerId", "weapon", "magazines", "medkits", "spentMagazines", "spentMedkits"] as const;
const PROGRESS_KEYS = ["bookedResults", "lastResultId", "lastOutcome", "lastReason", "lastRound", "lines"] as const;
const FREEZE_KEYS = ["resultId", "missionId", "seed", "kits"] as const;
const STATE_KEYS = ["version", "id", "revision", "runners", "lager", "freeze", "booked", "progress"] as const;
const VERSION_ONE_KEYS = ["version", "id", "revision", "runners", "freeze", "booked", "progress"] as const;

export function createCampaign(): CampaignState {
  return {
    version: SAVE_VERSION,
    id: CAMPAIGN_ID,
    revision: 0,
    runners: {
      kite: stockBody(),
      voss: stockBody(),
      nera: stockBody(),
      sol: stockBody(),
    },
    lager: emptyGear(),
    freeze: null,
    booked: [],
    progress: emptyProgress(),
  };
}

export function isCampaignRunner(id: string): id is CampaignRunnerId {
  return (RUNNER_IDS as readonly string[]).includes(id);
}

export function carriedGear(body: RunnerBody): RunnerGear {
  let rifle = body.hands.left === "rifle" ? 1 : 0;
  let sidearm = (body.hands.left === "sidearm" ? 1 : 0) + (body.hands.right === "sidearm" ? 1 : 0);
  let rifleMagazines = 0;
  let sidearmMagazines = 0;
  for (const cell of body.pack) {
    if (cell === "rifle") rifle += 1;
    if (cell === "sidearm") sidearm += 1;
    if (cell === "rifleMagazine") rifleMagazines += 1;
    if (cell === "sidearmMagazine") sidearmMagazines += 1;
  }
  return { rifle, sidearm, rifleMagazines, sidearmMagazines, medkits: body.belt === "medkit" ? 1 : 0 };
}

export function bodyFromCounts(gear: RunnerGear): RunnerBody | null {
  for (const post of GEAR_POSTS) {
    const value = gear[post];
    if (!Number.isInteger(value) || value < 0 || value > SLOT_LIMITS[post]) return null;
  }
  const placed = placeCounts(gear);
  if (!placed || GEAR_POSTS.some((post) => placed.overflow[post] !== 0)) return null;
  return placed.body;
}

export function canField(gear: RunnerGear, weapon: WeaponId): boolean {
  if (gear.medkits < LOADOUT_MEDKITS) return false;
  if (weapon === "rifle") return gear.rifle >= 1 && gear.rifleMagazines >= LOADOUT_MAGAZINES;
  return gear.sidearm >= 1 && gear.sidearmMagazines >= LOADOUT_MAGAZINES;
}

export function takeFieldKit(body: RunnerBody, weapon: WeaponId): RunnerBody | null {
  if (!isWeapon(weapon)) return null;
  return checkout(body, weapon);
}

export function returnFieldKit(
  body: RunnerBody,
  lager: RunnerGear,
  weapon: WeaponId,
  magazines: number,
  medkits: number,
): { readonly body: RunnerBody; readonly lager: RunnerGear } | null {
  if (!isWeapon(weapon)) return null;
  return storeKit(body, lager, weapon, magazines, medkits);
}

export function countReturnedMagazines(end: RunnerReturn, kitMagazines: number): number | null {
  return returnedMagazines(end, kitMagazines);
}

export function gearOffer(state: CampaignState, runnerId: string): GearOffer {
  if (!isCampaignRunner(runnerId)) {
    return { rifle: 0, sidearm: 0, rifleMagazines: 0, sidearmMagazines: 0, medkits: 0, rifleReady: false, sidearmReady: false, body: emptyBody() };
  }
  const body = state.runners[runnerId];
  const gear = carriedGear(body);
  const open = state.freeze === null;
  return {
    ...gear,
    rifleReady: open && canField(gear, "rifle"),
    sidearmReady: open && canField(gear, "sidearm"),
    body,
  };
}

export function fieldRejection(state: CampaignState, runnerId: string, weapon: WeaponId): CampaignRejection | null {
  if (state.freeze) return "Ein Einsatz ist bereits eingefroren.";
  if (!isCampaignRunner(runnerId) || !canField(carriedGear(state.runners[runnerId]), weapon)) return "Ausrüstung fehlt.";
  return null;
}

export function moveGear(state: CampaignState, runnerId: string, posten: string, direction: string): CampaignResult {
  if (state.freeze) return rejected(state, "Ein Einsatz ist bereits eingefroren.");
  if (!isCampaignRunner(runnerId) || !isGearPost(posten) || !isDirection(direction)) return rejected(state, "Einsatz ist ungültig.");
  const kind = kindOf(posten);
  if (direction === "nehmen") {
    if (state.lager[posten] < 1) return rejected(state, "Lager reicht nicht.");
    const dest = openPlace(state.runners[runnerId], kind);
    if (!dest) return rejected(state, "Slot ist voll.");
    return movePiece(state, runnerId, { area: "stash", post: posten }, dest);
  }
  const source = heldPlace(state.runners[runnerId], kind);
  if (!source) return rejected(state, "Ausrüstung fehlt.");
  if (state.lager[posten] >= SAVE_COUNT_MAX) return rejected(state, "Lager reicht nicht.");
  return movePiece(state, runnerId, source, { area: "stash", post: posten });
}

export function movePiece(state: CampaignState, runnerId: string, von: unknown, nach: unknown): CampaignResult {
  if (state.freeze) return rejected(state, "Ein Einsatz ist bereits eingefroren.");
  if (!isCampaignRunner(runnerId)) return rejected(state, "Einsatz ist ungültig.");
  const from = parsePlace(von);
  const to = parsePlace(nach);
  if (!from || !to) return rejected(state, "Einsatz ist ungültig.");
  const pulled = pull(state.runners[runnerId], state.lager, from);
  if (!pulled.ok) return rejected(state, pulled.rejection);
  const dropped = drop(pulled.body, pulled.lager, pulled.kind, to);
  if (!dropped.ok) return rejected(state, dropped.rejection);
  const runners = { ...state.runners, [runnerId]: dropped.body };
  if (sameGear(dropped.lager, state.lager) && sameRunners(runners, state.runners)) return { ok: true, state };
  return { ok: true, state: nextState(state, runners, dropped.lager, state.freeze, state.booked, state.progress) };
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
    state: nextState(state, runners, state.lager, { resultId, missionId: MISSION_ID, seed, kits }, state.booked, state.progress),
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
  let lager = state.lager;
  const lines: BookedLine[] = [];
  for (const runnerId of RUNNER_IDS) {
    const back = returns.get(runnerId);
    if (!back) return rejected(state, "Buchung ist unvollständig.");
    const restored = storeKit(runners[runnerId], lager, back.weapon, back.magazines, back.medkits);
    if (!restored) return rejected(state, "Buchung ist unvollständig.");
    runners[runnerId] = restored.body;
    lager = restored.lager;
    const kit = freeze.kits[runnerId];
    const gear = carriedGear(restored.body);
    lines.push({
      runnerId,
      weapon: back.weapon,
      magazines: back.weapon === "rifle" ? gear.rifleMagazines : gear.sidearmMagazines,
      medkits: gear.medkits,
      spentMagazines: kit.magazines - back.magazines,
      spentMedkits: kit.medkits - back.medkits,
    });
  }
  return {
    ok: true,
    state: nextState(state, runners, lager, null, [...state.booked, booking.resultId], {
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
  let lager = state.lager;
  for (const runnerId of RUNNER_IDS) {
    const kit = freeze.kits[runnerId];
    const restored = storeKit(runners[runnerId], lager, kit.weapon, kit.magazines, kit.medkits);
    if (!restored) return { state, released: false };
    runners[runnerId] = restored.body;
    lager = restored.lager;
  }
  return { state: nextState(state, runners, lager, null, state.booked, state.progress), released: true };
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
  if (body.version === 1) {
    const migrated = readVersionOne(body);
    return migrated ? { ok: true, state: migrated, migrated: true } : invalid();
  }
  if (body.version === 2) {
    const migrated = readVersionTwo(body);
    return migrated ? { ok: true, state: migrated, migrated: true } : invalid();
  }
  if (body.version === SAVE_VERSION) {
    const state = readVersionThree(body);
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

function stockBody(): RunnerBody {
  const placed = placeCounts(stock());
  if (!placed || GEAR_POSTS.some((post) => placed.overflow[post] !== 0)) {
    throw new Error("Startbestand passt nicht.");
  }
  return placed.body;
}

function emptyProgress(): CampaignProgress {
  return { bookedResults: 0, lastResultId: "", lastOutcome: "", lastReason: "", lastRound: 0, lines: [] };
}

function emptyBody(): RunnerBody {
  return { hands: { left: "empty", right: "empty" }, belt: "empty", pack: Array.from({ length: PACK_CELLS }, () => "empty" as const) };
}

function checkout(body: RunnerBody, weapon: WeaponId): RunnerBody | null {
  if (!canField(carriedGear(body), weapon)) return null;
  let next: RunnerBody | null = removeOne(body, weapon === "rifle" ? "rifle" : "sidearm");
  const magazine: PieceKind = weapon === "rifle" ? "rifleMagazine" : "sidearmMagazine";
  for (let index = 0; index < LOADOUT_MAGAZINES && next; index += 1) next = removeOne(next, magazine);
  if (!next) return null;
  return removeOne(next, "medkit");
}

function emptyGear(): RunnerGear {
  return { rifle: 0, sidearm: 0, rifleMagazines: 0, sidearmMagazines: 0, medkits: 0 };
}

function withCount(gear: RunnerGear, posten: GearPost, value: number): RunnerGear {
  if (posten === "rifle") return { ...gear, rifle: value };
  if (posten === "sidearm") return { ...gear, sidearm: value };
  if (posten === "rifleMagazines") return { ...gear, rifleMagazines: value };
  if (posten === "sidearmMagazines") return { ...gear, sidearmMagazines: value };
  return { ...gear, medkits: value };
}

function kitParts(weapon: WeaponId, magazines: number, medkits: number): readonly (readonly [PieceKind, number])[] {
  return [
    [weapon === "rifle" ? "rifle" : "sidearm", 1],
    [weapon === "rifle" ? "rifleMagazine" : "sidearmMagazine", magazines],
    ["medkit", medkits],
  ];
}

function storeKit(
  body: RunnerBody,
  lager: RunnerGear,
  weapon: WeaponId,
  magazines: number,
  medkits: number,
): { readonly body: RunnerBody; readonly lager: RunnerGear } | null {
  let nextBody = body;
  let nextLager = lager;
  for (const [kind, amount] of kitParts(weapon, magazines, medkits)) {
    if (amount < 0) return null;
    const post = postOf(kind);
    for (let index = 0; index < amount; index += 1) {
      const held = carriedGear(nextBody)[post];
      if (held > SLOT_LIMITS[post]) return null;
      const placed = held < SLOT_LIMITS[post] ? putOnBody(nextBody, kind) : null;
      if (placed) {
        nextBody = placed;
        continue;
      }
      if (nextLager[post] >= SAVE_COUNT_MAX) return null;
      nextLager = withCount(nextLager, post, nextLager[post] + 1);
    }
  }
  return { body: nextBody, lager: nextLager };
}

function divideRunners(counts: Readonly<Record<CampaignRunnerId, RunnerGear>>): { readonly runners: CampaignState["runners"]; readonly lager: RunnerGear } | null {
  let lager = emptyGear();
  const kept = {} as Record<CampaignRunnerId, RunnerGear>;
  for (const runnerId of RUNNER_IDS) {
    const gear = counts[runnerId];
    let slot = emptyGear();
    for (const posten of GEAR_POSTS) {
      const keep = Math.min(gear[posten], SLOT_LIMITS[posten]);
      const extra = gear[posten] - keep;
      if (lager[posten] + extra > SAVE_COUNT_MAX) return null;
      slot = withCount(slot, posten, keep);
      if (extra > 0) lager = withCount(lager, posten, lager[posten] + extra);
    }
    kept[runnerId] = slot;
  }
  return placeRunners(kept, lager);
}

function placeRunners(
  counts: Readonly<Record<CampaignRunnerId, RunnerGear>>,
  lager: RunnerGear,
): { readonly runners: CampaignState["runners"]; readonly lager: RunnerGear } | null {
  let nextLager = lager;
  const runners = {} as Record<CampaignRunnerId, RunnerBody>;
  for (const runnerId of RUNNER_IDS) {
    const placed = placeCounts(counts[runnerId]);
    if (!placed) return null;
    for (const posten of GEAR_POSTS) {
      const extra = placed.overflow[posten];
      if (extra === 0) continue;
      if (nextLager[posten] + extra > SAVE_COUNT_MAX) return null;
      nextLager = withCount(nextLager, posten, nextLager[posten] + extra);
    }
    runners[runnerId] = placed.body;
  }
  return { runners, lager: nextLager };
}

function placeCounts(gear: RunnerGear): { readonly body: RunnerBody; readonly overflow: RunnerGear } | null {
  for (const posten of GEAR_POSTS) {
    if (!Number.isInteger(gear[posten]) || gear[posten] < 0 || gear[posten] > SAVE_COUNT_MAX) return null;
  }
  let rifle = gear.rifle;
  let sidearm = gear.sidearm;
  let rifleMagazines = gear.rifleMagazines;
  let sidearmMagazines = gear.sidearmMagazines;
  let medkits = gear.medkits;
  let body = emptyBody();
  if (rifle > 0) {
    const next = putOnBody(body, "rifle");
    if (!next) return null;
    body = next;
    rifle -= 1;
  } else if (sidearm > 0) {
    const next = putOnBody(body, "sidearm");
    if (!next) return null;
    body = next;
    sidearm -= 1;
  }
  if (medkits > 0) {
    const next = putOnBody(body, "medkit");
    if (!next) return null;
    body = next;
    medkits -= 1;
  }
  const queue: PieceKind[] = [];
  for (let index = 0; index < rifle; index += 1) queue.push("rifle");
  for (let index = 0; index < sidearm; index += 1) queue.push("sidearm");
  for (let index = 0; index < rifleMagazines; index += 1) queue.push("rifleMagazine");
  for (let index = 0; index < sidearmMagazines; index += 1) queue.push("sidearmMagazine");
  let overflow = emptyGear();
  for (const kind of queue) {
    const next = putOnBody(body, kind);
    if (next) {
      body = next;
      continue;
    }
    const posten = postOf(kind);
    if (overflow[posten] >= SAVE_COUNT_MAX) return null;
    overflow = withCount(overflow, posten, overflow[posten] + 1);
  }
  if (medkits > 0) {
    if (overflow.medkits + medkits > SAVE_COUNT_MAX) return null;
    overflow = withCount(overflow, "medkits", overflow.medkits + medkits);
  }
  if (!bodyValid(body)) return null;
  return { body, overflow };
}

function putOnBody(body: RunnerBody, kind: PieceKind): RunnerBody | null {
  const place = openPlace(body, kind);
  if (!place) return null;
  return applyBody(body, kind, place);
}

function openPlace(body: RunnerBody, kind: PieceKind): InventoryPlace | null {
  const places: InventoryPlace[] = [];
  if (kind === "rifle") {
    places.push({ area: "hands" });
    for (let index = 0; index < PACK_CELLS; index += 1) {
      if (index % PACK_COLUMNS !== PACK_COLUMNS - 1) places.push({ area: "pack", index });
    }
  } else if (kind === "sidearm") {
    places.push({ area: "hand", hand: "right" }, { area: "hand", hand: "left" });
    for (let index = 0; index < PACK_CELLS; index += 1) places.push({ area: "pack", index });
  } else if (kind === "medkit") {
    places.push({ area: "belt" });
  } else {
    for (let index = 0; index < PACK_CELLS; index += 1) places.push({ area: "pack", index });
  }
  for (const place of places) if (bodyAccepts(body, kind, place) === null) return place;
  return null;
}

function heldPlace(body: RunnerBody, kind: PieceKind): InventoryPlace | null {
  if (kind === "rifle") {
    if (body.hands.left === "rifle") return { area: "hands" };
    const index = body.pack.indexOf("rifle");
    return index < 0 ? null : { area: "pack", index };
  }
  if (kind === "sidearm") {
    if (body.hands.right === "sidearm") return { area: "hand", hand: "right" };
    if (body.hands.left === "sidearm") return { area: "hand", hand: "left" };
    const index = body.pack.indexOf("sidearm");
    return index < 0 ? null : { area: "pack", index };
  }
  if (kind === "medkit") return body.belt === "medkit" ? { area: "belt" } : null;
  const cell = kind === "rifleMagazine" ? "rifleMagazine" : "sidearmMagazine";
  const index = body.pack.indexOf(cell);
  return index < 0 ? null : { area: "pack", index };
}

function removeOne(body: RunnerBody, kind: PieceKind): RunnerBody | null {
  if (kind === "medkit") return body.belt === "medkit" ? { ...body, belt: "empty" } : null;
  if (kind === "rifle") {
    if (body.hands.left === "rifle") return { ...body, hands: { left: "empty", right: "empty" } };
    const index = body.pack.indexOf("rifle");
    if (index < 0 || body.pack[index + 1] !== "rifleRest") return null;
    const pack = body.pack.slice();
    pack[index] = "empty";
    pack[index + 1] = "empty";
    return { ...body, pack };
  }
  if (kind === "sidearm") {
    if (body.hands.right === "sidearm") return { ...body, hands: { ...body.hands, right: "empty" } };
    if (body.hands.left === "sidearm") return { ...body, hands: { ...body.hands, left: "empty" } };
    const index = body.pack.indexOf("sidearm");
    if (index < 0) return null;
    const pack = body.pack.slice();
    pack[index] = "empty";
    return { ...body, pack };
  }
  const cell = kind === "rifleMagazine" ? "rifleMagazine" : "sidearmMagazine";
  const index = body.pack.indexOf(cell);
  if (index < 0) return null;
  const pack = body.pack.slice();
  pack[index] = "empty";
  return { ...body, pack };
}

function pull(
  body: RunnerBody,
  lager: RunnerGear,
  place: InventoryPlace,
): { readonly ok: true; readonly kind: PieceKind; readonly body: RunnerBody; readonly lager: RunnerGear } | { readonly ok: false; readonly rejection: CampaignRejection } {
  if (place.area === "stash") {
    if (lager[place.post] < 1) return { ok: false, rejection: "Lager reicht nicht." };
    return { ok: true, kind: kindOf(place.post), body, lager: withCount(lager, place.post, lager[place.post] - 1) };
  }
  if (place.area === "hands") {
    if (body.hands.left !== "rifle" || body.hands.right !== "rifle") return { ok: false, rejection: "Ausrüstung fehlt." };
    return { ok: true, kind: "rifle", body: { ...body, hands: { left: "empty", right: "empty" } }, lager };
  }
  if (place.area === "hand") {
    const fill = body.hands[place.hand];
    if (fill === "empty") return { ok: false, rejection: "Ausrüstung fehlt." };
    if (fill === "rifle") return { ok: true, kind: "rifle", body: { ...body, hands: { left: "empty", right: "empty" } }, lager };
    return { ok: true, kind: "sidearm", body: { ...body, hands: { ...body.hands, [place.hand]: "empty" } }, lager };
  }
  if (place.area === "belt") {
    if (body.belt !== "medkit") return { ok: false, rejection: "Ausrüstung fehlt." };
    return { ok: true, kind: "medkit", body: { ...body, belt: "empty" }, lager };
  }
  const cell = body.pack[place.index];
  if (!cell || cell === "empty") return { ok: false, rejection: "Ausrüstung fehlt." };
  if (cell === "rifle" || cell === "rifleRest") {
    const anchor = cell === "rifle" ? place.index : place.index - 1;
    if (body.pack[anchor] !== "rifle" || body.pack[anchor + 1] !== "rifleRest") return { ok: false, rejection: "Einsatz ist ungültig." };
    const pack = body.pack.slice();
    pack[anchor] = "empty";
    pack[anchor + 1] = "empty";
    return { ok: true, kind: "rifle", body: { ...body, pack }, lager };
  }
  const pack = body.pack.slice();
  pack[place.index] = "empty";
  const kind: PieceKind = cell === "sidearm" ? "sidearm" : cell === "rifleMagazine" ? "rifleMagazine" : "sidearmMagazine";
  return { ok: true, kind, body: { ...body, pack }, lager };
}

function drop(
  body: RunnerBody,
  lager: RunnerGear,
  kind: PieceKind,
  place: InventoryPlace,
): { readonly ok: true; readonly body: RunnerBody; readonly lager: RunnerGear } | { readonly ok: false; readonly rejection: CampaignRejection } {
  if (place.area === "stash") {
    if (postOf(kind) !== place.post) return { ok: false, rejection: "Ziel passt nicht." };
    if (lager[place.post] >= SAVE_COUNT_MAX) return { ok: false, rejection: "Lager reicht nicht." };
    return { ok: true, body, lager: withCount(lager, place.post, lager[place.post] + 1) };
  }
  const rejection = bodyAccepts(body, kind, place);
  if (rejection) return { ok: false, rejection };
  return { ok: true, body: applyBody(body, kind, place), lager };
}

function bodyAccepts(body: RunnerBody, kind: PieceKind, place: InventoryPlace): CampaignRejection | null {
  if (place.area === "stash") return "Einsatz ist ungültig.";
  if (carriedGear(body)[postOf(kind)] >= SLOT_LIMITS[postOf(kind)]) return "Slot ist voll.";
  if (place.area === "hands") {
    if (kind !== "rifle") return "Ziel passt nicht.";
    if (body.hands.left !== "empty" || body.hands.right !== "empty") return "Slot ist voll.";
    return null;
  }
  if (place.area === "hand") {
    if (kind !== "sidearm") return "Ziel passt nicht.";
    if (body.hands.left === "rifle" || body.hands.right === "rifle" || body.hands[place.hand] !== "empty") return "Slot ist voll.";
    return null;
  }
  if (place.area === "belt") {
    if (kind !== "medkit") return "Ziel passt nicht.";
    if (body.belt !== "empty") return "Slot ist voll.";
    return null;
  }
  if (kind === "medkit") return "Ziel passt nicht.";
  const cell = body.pack[place.index];
  if (cell === undefined) return "Einsatz ist ungültig.";
  if (kind === "rifle") {
    if (place.index % PACK_COLUMNS === PACK_COLUMNS - 1) return "Ziel passt nicht.";
    if (cell !== "empty" || body.pack[place.index + 1] !== "empty") return "Slot ist voll.";
    return null;
  }
  if (cell !== "empty") return "Slot ist voll.";
  return null;
}

function applyBody(body: RunnerBody, kind: PieceKind, place: InventoryPlace): RunnerBody {
  if (place.area === "hands") return { ...body, hands: { left: "rifle", right: "rifle" } };
  if (place.area === "hand") return { ...body, hands: { ...body.hands, [place.hand]: "sidearm" } };
  if (place.area === "belt") return { ...body, belt: "medkit" };
  const pack = body.pack.slice();
  if (place.area === "pack" && kind === "rifle") {
    pack[place.index] = "rifle";
    pack[place.index + 1] = "rifleRest";
  } else if (place.area === "pack" && kind === "sidearm") pack[place.index] = "sidearm";
  else if (place.area === "pack" && kind === "rifleMagazine") pack[place.index] = "rifleMagazine";
  else if (place.area === "pack") pack[place.index] = "sidearmMagazine";
  return { ...body, pack };
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
  lager: RunnerGear,
  freeze: CampaignFreeze | null,
  booked: readonly string[],
  progress: CampaignProgress,
): CampaignState {
  return {
    version: SAVE_VERSION,
    id: CAMPAIGN_ID,
    revision: state.revision + 1,
    runners,
    lager,
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
  const runners = readGearTable(body.runners, SAVE_COUNT_MAX);
  if (!runners) return null;
  const divided = divideRunners(runners);
  if (!divided) return null;
  return { ...createCampaign(), runners: divided.runners, lager: divided.lager };
}

function readVersionOne(body: Record<string, unknown>): CampaignState | null {
  const parsed = readLegacy(body);
  if (!parsed) return null;
  const divided = divideRunners(parsed.runners);
  if (!divided) return null;
  if (parsed.freeze && !freezeFits(divided.runners, divided.lager, parsed.freeze)) return null;
  return {
    version: SAVE_VERSION,
    id: CAMPAIGN_ID,
    revision: parsed.revision,
    runners: divided.runners,
    lager: divided.lager,
    freeze: parsed.freeze,
    booked: parsed.booked,
    progress: parsed.progress,
  };
}

function readVersionTwo(body: Record<string, unknown>): CampaignState | null {
  if (!exactKeys(body, STATE_KEYS) || body.id !== CAMPAIGN_ID || body.version !== 2) return null;
  const revision = count(body.revision, 1_000_000_000);
  const runners = readGearTable(body.runners, null);
  const lager = readGear(body.lager, SAVE_COUNT_MAX);
  const booked = readBooked(body.booked);
  const progress = readProgress(body.progress);
  if (revision === null || !runners || !lager || !booked || !progress) return null;
  if (!progressMatches(progress, booked)) return null;
  const placed = placeRunners(runners, lager);
  if (!placed) return null;
  const freeze = readFreeze(body.freeze, booked);
  if (freeze === undefined) return null;
  if (freeze && !freezeFits(placed.runners, placed.lager, freeze)) return null;
  return { version: SAVE_VERSION, id: CAMPAIGN_ID, revision, runners: placed.runners, lager: placed.lager, freeze, booked, progress };
}

function readVersionThree(body: Record<string, unknown>): CampaignState | null {
  if (!exactKeys(body, STATE_KEYS) || body.id !== CAMPAIGN_ID || body.version !== SAVE_VERSION) return null;
  const revision = count(body.revision, 1_000_000_000);
  const runners = readBodies(body.runners);
  const lager = readGear(body.lager, SAVE_COUNT_MAX);
  const booked = readBooked(body.booked);
  const progress = readProgress(body.progress);
  if (revision === null || !runners || !lager || !booked || !progress) return null;
  if (!progressMatches(progress, booked)) return null;
  const freeze = readFreeze(body.freeze, booked);
  if (freeze === undefined) return null;
  if (freeze && !freezeFits(runners, lager, freeze)) return null;
  return { version: SAVE_VERSION, id: CAMPAIGN_ID, revision, runners, lager, freeze, booked, progress };
}

function readLegacy(body: Record<string, unknown>): {
  readonly revision: number;
  readonly runners: Readonly<Record<CampaignRunnerId, RunnerGear>>;
  readonly freeze: CampaignFreeze | null;
  readonly booked: readonly string[];
  readonly progress: CampaignProgress;
} | null {
  if (!exactKeys(body, VERSION_ONE_KEYS) || body.id !== CAMPAIGN_ID) return null;
  const revision = count(body.revision, 1_000_000_000);
  const runners = readGearTable(body.runners, SAVE_COUNT_MAX);
  const booked = readBooked(body.booked);
  const progress = readProgress(body.progress);
  if (revision === null || !runners || !booked || !progress || !progressMatches(progress, booked)) return null;
  const freeze = readFreeze(body.freeze, booked);
  if (freeze === undefined) return null;
  if (freeze && !legacyFreezeFits(runners, freeze)) return null;
  return { revision, runners, freeze, booked, progress };
}

function progressMatches(progress: CampaignProgress, booked: readonly string[]): boolean {
  if (progress.bookedResults !== booked.length) return false;
  if (booked.length === 0) {
    return progress.lastResultId === "" && progress.lastOutcome === "" && progress.lastReason === "" && progress.lastRound === 0 && progress.lines.length === 0;
  }
  return progress.lastResultId === booked[booked.length - 1] && progress.lines.length === RUNNER_IDS.length;
}

function readGearTable(value: unknown, saveMax: number | null): Readonly<Record<CampaignRunnerId, RunnerGear>> | null {
  const body = record(value);
  if (!body || !exactKeys(body, RUNNER_IDS)) return null;
  const runners = {} as Record<CampaignRunnerId, RunnerGear>;
  for (const runnerId of RUNNER_IDS) {
    const gear = readGear(body[runnerId], saveMax);
    if (!gear) return null;
    runners[runnerId] = gear;
  }
  return runners;
}

function readBodies(value: unknown): CampaignState["runners"] | null {
  const body = record(value);
  if (!body || !exactKeys(body, RUNNER_IDS)) return null;
  const runners = {} as Record<CampaignRunnerId, RunnerBody>;
  for (const runnerId of RUNNER_IDS) {
    const runner = readBody(body[runnerId]);
    if (!runner) return null;
    runners[runnerId] = runner;
  }
  return runners;
}

function readBody(value: unknown): RunnerBody | null {
  const body = record(value);
  if (!body || !exactKeys(body, BODY_KEYS)) return null;
  const hands = readHands(body.hands);
  const belt: BeltFill | null = body.belt === "medkit" ? "medkit" : body.belt === "empty" ? "empty" : null;
  const pack = readPack(body.pack);
  if (!hands || !belt || !pack) return null;
  const runner: RunnerBody = { hands, belt, pack };
  return bodyValid(runner) ? runner : null;
}

function readHands(value: unknown): RunnerBody["hands"] | null {
  const body = record(value);
  if (!body || !exactKeys(body, HAND_KEYS) || !isHandFill(body.left) || !isHandFill(body.right)) return null;
  return { left: body.left, right: body.right };
}

function readPack(value: unknown): readonly PackFill[] | null {
  if (!Array.isArray(value) || value.length !== PACK_CELLS) return null;
  const pack: PackFill[] = [];
  for (const cell of value) {
    if (!isPackFill(cell)) return null;
    pack.push(cell);
  }
  return pack;
}

function readGear(value: unknown, saveMax: number | null): RunnerGear | null {
  const body = record(value);
  if (!body || !exactKeys(body, GEAR_KEYS)) return null;
  const rifle = count(body.rifle, saveMax ?? SLOT_LIMITS.rifle);
  const sidearm = count(body.sidearm, saveMax ?? SLOT_LIMITS.sidearm);
  const rifleMagazines = count(body.rifleMagazines, saveMax ?? SLOT_LIMITS.rifleMagazines);
  const sidearmMagazines = count(body.sidearmMagazines, saveMax ?? SLOT_LIMITS.sidearmMagazines);
  const medkits = count(body.medkits, saveMax ?? SLOT_LIMITS.medkits);
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

function legacyFreezeFits(runners: Readonly<Record<CampaignRunnerId, RunnerGear>>, freeze: CampaignFreeze): boolean {
  for (const runnerId of RUNNER_IDS) {
    const gear = runners[runnerId];
    const kit = freeze.kits[runnerId];
    const weapons = kit.weapon === "rifle" ? gear.rifle : gear.sidearm;
    const magazines = kit.weapon === "rifle" ? gear.rifleMagazines : gear.sidearmMagazines;
    if (weapons + 1 > SAVE_COUNT_MAX || magazines + kit.magazines > SAVE_COUNT_MAX || gear.medkits + kit.medkits > SAVE_COUNT_MAX) return false;
  }
  return true;
}

function freezeFits(runners: CampaignState["runners"], lager: RunnerGear, freeze: CampaignFreeze): boolean {
  let nextLager = lager;
  for (const runnerId of RUNNER_IDS) {
    const kit = freeze.kits[runnerId];
    const stored = storeKit(runners[runnerId], nextLager, kit.weapon, kit.magazines, kit.medkits);
    if (!stored) return false;
    nextLager = stored.lager;
  }
  return true;
}

function bodyValid(body: RunnerBody): boolean {
  const { left, right } = body.hands;
  if ((left === "rifle" || right === "rifle") && (left !== "rifle" || right !== "rifle")) return false;
  if (left === "sidearm" && right === "sidearm") return false;
  if (body.pack.length !== PACK_CELLS) return false;
  for (let index = 0; index < body.pack.length; index += 1) {
    const cell = body.pack[index];
    if (cell === "rifle") {
      if (index % PACK_COLUMNS === PACK_COLUMNS - 1 || body.pack[index + 1] !== "rifleRest") return false;
    } else if (cell === "rifleRest") {
      if (index % PACK_COLUMNS === 0 || body.pack[index - 1] !== "rifle") return false;
    }
  }
  const gear = carriedGear(body);
  return GEAR_POSTS.every((post) => gear[post] <= SLOT_LIMITS[post]);
}

function parsePlace(value: unknown): InventoryPlace | null {
  const body = record(value);
  if (!body || typeof body.area !== "string") return null;
  if (body.area === "hands" && exactKeys(body, ["area"])) return { area: "hands" };
  if (body.area === "hand" && exactKeys(body, ["area", "hand"]) && (body.hand === "left" || body.hand === "right")) return { area: "hand", hand: body.hand };
  if (body.area === "belt" && exactKeys(body, ["area"])) return { area: "belt" };
  if (body.area === "pack" && exactKeys(body, ["area", "index"]) && typeof body.index === "number" && Number.isInteger(body.index) && body.index >= 0 && body.index < PACK_CELLS) {
    return { area: "pack", index: body.index };
  }
  if (body.area === "stash" && exactKeys(body, ["area", "post"]) && typeof body.post === "string" && isGearPost(body.post)) return { area: "stash", post: body.post };
  return null;
}

function postOf(kind: PieceKind): GearPost {
  if (kind === "rifle") return "rifle";
  if (kind === "sidearm") return "sidearm";
  if (kind === "rifleMagazine") return "rifleMagazines";
  if (kind === "sidearmMagazine") return "sidearmMagazines";
  return "medkits";
}

function kindOf(post: GearPost): PieceKind {
  if (post === "rifle") return "rifle";
  if (post === "sidearm") return "sidearm";
  if (post === "rifleMagazines") return "rifleMagazine";
  if (post === "sidearmMagazines") return "sidearmMagazine";
  return "medkit";
}

function sameGear(left: RunnerGear, right: RunnerGear): boolean {
  return GEAR_POSTS.every((post) => left[post] === right[post]);
}

function sameRunners(left: CampaignState["runners"], right: CampaignState["runners"]): boolean {
  return RUNNER_IDS.every((runnerId) => sameBody(left[runnerId], right[runnerId]));
}

function sameBody(left: RunnerBody, right: RunnerBody): boolean {
  if (left.hands.left !== right.hands.left || left.hands.right !== right.hands.right || left.belt !== right.belt) return false;
  return left.pack.every((cell, index) => cell === right.pack[index]);
}

function isGearPost(value: string): value is GearPost {
  return (GEAR_POSTS as readonly string[]).includes(value);
}

function isDirection(value: string): value is StashDirection {
  return value === "nehmen" || value === "legen";
}

function isHandFill(value: unknown): value is HandFill {
  return value === "empty" || value === "sidearm" || value === "rifle";
}

function isPackFill(value: unknown): value is PackFill {
  return value === "empty" || value === "sidearm" || value === "rifle" || value === "rifleRest" || value === "rifleMagazine" || value === "sidearmMagazine";
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
