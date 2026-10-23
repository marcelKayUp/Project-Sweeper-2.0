import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { createModularCharacterSpec, validateModularCharacterSpec, type ModularCharacterSpec } from "@neon/characters";
import {
  MISSION_ID,
  PACK_CELLS,
  PACK_COLUMNS,
  SAVE_COUNT_MAX,
  SLOT_LIMITS,
  balancedSheet,
  carriedGear,
  createCampaign,
  GEAR_POSTS,
  isCampaignRunner,
  returnFieldKit,
  validateRunnerSheet,
  type BookedLine,
  type CampaignProgress,
  type CampaignRunnerId,
  type CampaignState,
  type FrozenKit,
  type HandFill,
  type PackFill,
  type RunnerBody,
  type RunnerGear,
  type RunnerSheet,
  type WeaponId,
} from "@neon/sim";

export const RUNNER_FILE_VERSION = 1;
export const RUNNER_NAME_TAKEN = "Der Name ist vergeben.";
export const RUNNER_PASSWORD_SHORT = "Das Passwort ist zu kurz.";
export const RUNNER_PASSWORD_LONG = "Das Passwort ist zu lang.";
export const RUNNER_NAME_INVALID = "Der Name passt nicht.";
export const RUNNER_LOGIN_REJECTED = "Anmeldung abgelehnt.";
export const RUNNER_LOOK_INVALID = "Das Aussehen passt nicht.";
export const RUNNER_POINTS_INVALID = "Die Punkte liegen außerhalb.";
export const RUNNER_SAVE_INVALID = "Save ist ungültig.";

const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const SCRYPT_KEYLEN = 32;
const SALT_BYTES = 16;
const PASSWORD_MIN = 8;
const PASSWORD_MAX = 128;
const NAME_MAX = 16;
const REVISION_MAX = 1_000_000_000;
const RESULT_ID = /^ghost-floor-([1-9]\d{0,8})$/;
const HANDS = ["empty", "sidearm", "rifle"] as const;
const PACK = ["empty", "sidearm", "rifle", "rifleRest", "rifleMagazine", "sidearmMagazine"] as const;
const REASONS = ["extraktion", "keine-handlungsfaehigen", "rundenlimit"] as const;
const HASH_KEYS = ["algorithm", "salt", "hash", "n", "r", "p", "keylen"] as const;
const ACCOUNT_KEYS = ["name", "passwordHash", "body", "lager", "booked", "progress", "hold", "revision"] as const;
const OPTIONAL_ACCOUNT_KEYS = ["look", "sheet"] as const;
const PROGRESS_KEYS = ["bookedResults", "lastResultId", "lastOutcome", "lastReason", "lastRound", "lines"] as const;
const LINE_KEYS = ["runnerId", "weapon", "magazines", "medkits", "spentMagazines", "spentMedkits"] as const;
const HOLD_KEYS = ["resultId", "slotId", "weapon", "magazines", "medkits"] as const;

export interface PasswordHash {
  readonly algorithm: "scrypt";
  readonly salt: string;
  readonly hash: string;
  readonly n: number;
  readonly r: number;
  readonly p: number;
  readonly keylen: number;
}

export interface RunnerHold {
  readonly resultId: string;
  readonly slotId: CampaignRunnerId;
  readonly weapon: WeaponId;
  readonly magazines: number;
  readonly medkits: number;
}

export interface RunnerDraft {
  readonly look: unknown;
  readonly sheet: unknown;
}

export interface RunnerAccount {
  readonly name: string;
  readonly passwordHash: PasswordHash;
  readonly body: RunnerBody;
  readonly lager: RunnerGear;
  readonly booked: readonly string[];
  readonly progress: CampaignProgress;
  readonly hold: RunnerHold | null;
  readonly revision: number;
  readonly look: ModularCharacterSpec;
  readonly sheet: RunnerSheet;
}

export interface RunnerFile {
  readonly version: typeof RUNNER_FILE_VERSION;
  readonly runners: Readonly<Record<string, RunnerAccount>>;
}

export interface RunnerStore {
  read(): RunnerFile;
  write(file: RunnerFile): void;
}

export type RunnerRejection =
  | typeof RUNNER_NAME_TAKEN
  | typeof RUNNER_PASSWORD_SHORT
  | typeof RUNNER_PASSWORD_LONG
  | typeof RUNNER_NAME_INVALID
  | typeof RUNNER_LOGIN_REJECTED
  | typeof RUNNER_LOOK_INVALID
  | typeof RUNNER_POINTS_INVALID;

export type RunnerAccess =
  | { readonly ok: true; readonly key: string; readonly name: string }
  | { readonly ok: false; readonly rejection: RunnerRejection };

export type RunnerCreate =
  | { readonly ok: true; readonly file: RunnerFile; readonly key: string; readonly name: string }
  | { readonly ok: false; readonly rejection: RunnerRejection };

let dummy: { readonly salt: Buffer; readonly hash: Buffer } | null = null;
const tickets = new Map<string, string>();

export function emptyRunnerFile(): RunnerFile {
  return { version: RUNNER_FILE_VERSION, runners: {} };
}

export function displayName(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.normalize("NFKC").trim();
  if (trimmed.length < 1 || trimmed.length > NAME_MAX) return null;
  if (!/^[\p{L}\p{N} ]+$/u.test(trimmed)) return null;
  return trimmed;
}

export function runnerKey(value: unknown): string | null {
  const name = displayName(value);
  if (!name) return null;
  return name.toLowerCase();
}

export function createRunner(file: RunnerFile, name: unknown, password: unknown, draft?: RunnerDraft): RunnerCreate {
  const display = displayName(name);
  if (!display) return { ok: false, rejection: RUNNER_NAME_INVALID };
  const length = passwordLength(password);
  if (length === null) return { ok: false, rejection: RUNNER_LOGIN_REJECTED };
  if (length < PASSWORD_MIN) return { ok: false, rejection: RUNNER_PASSWORD_SHORT };
  if (length > PASSWORD_MAX) return { ok: false, rejection: RUNNER_PASSWORD_LONG };
  const key = display.toLowerCase();
  if (file.runners[key]) return { ok: false, rejection: RUNNER_NAME_TAKEN };
  const look = draft ? readLook(draft.look) : standardLook();
  if (!look) return { ok: false, rejection: RUNNER_LOOK_INVALID };
  const sheet = draft ? readSheet(draft.sheet) : balancedSheet();
  if (!sheet) return { ok: false, rejection: RUNNER_POINTS_INVALID };
  const passwordHash = hashPassword(password as string);
  if (!passwordHash) return { ok: false, rejection: RUNNER_LOGIN_REJECTED };
  const account = startingAccount(display, passwordHash, look, sheet);
  return { ok: true, key, name: display, file: { version: RUNNER_FILE_VERSION, runners: { ...file.runners, [key]: account } } };
}

export function openRunner(file: RunnerFile, name: unknown, password: unknown): RunnerAccess {
  const display = displayName(name);
  if (!display) return { ok: false, rejection: RUNNER_NAME_INVALID };
  const length = passwordLength(password);
  if (length === null) return { ok: false, rejection: RUNNER_LOGIN_REJECTED };
  if (length < PASSWORD_MIN) return { ok: false, rejection: RUNNER_PASSWORD_SHORT };
  if (length > PASSWORD_MAX) return { ok: false, rejection: RUNNER_PASSWORD_LONG };
  const key = display.toLowerCase();
  const account = file.runners[key] ?? null;
  const match = passwordMatches(password as string, account?.passwordHash ?? null);
  if (!account || !match) return { ok: false, rejection: RUNNER_LOGIN_REJECTED };
  return { ok: true, key, name: account.name };
}

export function decideRunnerWish(store: RunnerStore, raw: unknown): RunnerAccess {
  const body = record(raw);
  if (!body || (body.absicht !== "anlegen" && body.absicht !== "anmelden")) return { ok: false, rejection: RUNNER_LOGIN_REJECTED };
  if (body.absicht === "anlegen") {
    const hasLook = Object.prototype.hasOwnProperty.call(body, "aussehen");
    const hasSheet = Object.prototype.hasOwnProperty.call(body, "punkte");
    if (hasLook !== hasSheet) return { ok: false, rejection: hasLook ? RUNNER_POINTS_INVALID : RUNNER_LOOK_INVALID };
    const created = hasLook
      ? createRunner(store.read(), body.name, body.password, { look: body.aussehen, sheet: body.punkte })
      : createRunner(store.read(), body.name, body.password);
    if (!created.ok) return created;
    store.write(created.file);
    return { ok: true, key: created.key, name: created.name };
  }
  return openRunner(store.read(), body.name, body.password);
}

export function answerRunner(
  store: RunnerStore,
  raw: unknown,
): { readonly status: number; readonly body: { readonly ok: true; readonly name: string; readonly ticket: string } | { readonly ok: false; readonly rejection: string } } {
  const decided = decideRunnerWish(store, raw);
  if (!decided.ok) return { status: 400, body: { ok: false, rejection: decided.rejection } };
  return { status: 200, body: { ok: true, name: decided.name, ticket: issueTicket(decided.key) } };
}

export function issueTicket(key: string): string {
  const ticket = randomBytes(32).toString("hex");
  tickets.set(ticket, key);
  return ticket;
}

export function accountKeyForTicket(ticket: string): string | null {
  if (!/^[a-f0-9]{64}$/.test(ticket)) return null;
  return tickets.get(ticket) ?? null;
}

export function projectAccount(account: RunnerAccount, slot: CampaignRunnerId): CampaignState {
  const base = createCampaign();
  const kit = account.hold ? heldKit(account.hold) : null;
  const kits = kit
    ? {
        kite: kit,
        voss: kit,
        nera: kit,
        sol: kit,
      }
    : null;
  return {
    ...base,
    revision: account.revision,
    runners: { ...base.runners, [slot]: account.body },
    lager: account.lager,
    freeze: account.hold && kits ? { resultId: account.hold.resultId, missionId: MISSION_ID, seed: 1, kits } : null,
    booked: account.booked,
    progress: account.progress,
  };
}

export function saveGear(file: RunnerFile, key: string, body: RunnerBody, lager: RunnerGear): RunnerFile | null {
  const account = file.runners[key];
  if (!account || account.hold) return null;
  if (sameBody(account.body, body) && sameGear(account.lager, lager)) return file;
  return replace(file, key, { ...account, body, lager, revision: account.revision + 1 });
}

export function holdKit(file: RunnerFile, key: string, body: RunnerBody, hold: RunnerHold): RunnerFile | null {
  const account = file.runners[key];
  if (!account || account.hold || account.booked.includes(hold.resultId)) return null;
  return replace(file, key, { ...account, body, hold, revision: account.revision + 1 });
}

export function releaseHold(file: RunnerFile, key: string, resultId: string): RunnerFile | null {
  const account = file.runners[key];
  if (!account) return null;
  if (!account.hold) return file;
  if (account.hold.resultId !== resultId) return file;
  const restored = returnField(account);
  if (!restored) return null;
  return replace(file, key, { ...account, body: restored.body, lager: restored.lager, hold: null, revision: account.revision + 1 });
}

export function bookHeld(
  file: RunnerFile,
  key: string,
  body: RunnerBody,
  lager: RunnerGear,
  line: BookedLine,
  outcome: { readonly resultId: string; readonly outcome: "sieg" | "niederlage"; readonly reason: CampaignProgress["lastReason"]; readonly round: number },
): RunnerFile | null {
  const account = file.runners[key];
  if (!account?.hold || account.hold.resultId !== outcome.resultId) return null;
  if (account.booked.includes(outcome.resultId) || account.progress.bookedResults >= SAVE_COUNT_MAX) return null;
  if (outcome.reason === "") return null;
  return replace(file, key, {
    ...account,
    body,
    lager,
    hold: null,
    booked: [...account.booked, outcome.resultId],
    progress: {
      bookedResults: account.progress.bookedResults + 1,
      lastResultId: outcome.resultId,
      lastOutcome: outcome.outcome,
      lastReason: outcome.reason,
      lastRound: outcome.round,
      lines: [line],
    },
    revision: account.revision + 1,
  });
}

export function recoverHolds(file: RunnerFile): { readonly file: RunnerFile; readonly changed: boolean } | null {
  let next = file;
  let changed = false;
  for (const key of Object.keys(file.runners).sort()) {
    const account = next.runners[key];
    if (!account?.hold) continue;
    const released = releaseHold(next, key, account.hold.resultId);
    if (!released) return null;
    next = released;
    changed = true;
  }
  return { file: next, changed };
}

export function readRunnerFile(raw: unknown): { readonly ok: true; readonly file: RunnerFile } | { readonly ok: false } {
  const body = record(raw);
  if (!body || !exactKeys(body, ["version", "runners"]) || body.version !== RUNNER_FILE_VERSION) return { ok: false };
  const runners = record(body.runners);
  if (!runners) return { ok: false };
  const parsed: Record<string, RunnerAccount> = {};
  for (const key of Object.keys(runners)) {
    if (runnerKey(key) !== key) return { ok: false };
    const account = readAccount(runners[key], key);
    if (!account) return { ok: false };
    parsed[key] = account;
  }
  return { ok: true, file: { version: RUNNER_FILE_VERSION, runners: parsed } };
}

export function nextResultId(file: RunnerFile, keys: readonly string[]): string | null {
  const used = new Set<string>();
  let max = 0;
  for (const key of keys) {
    const account = file.runners[key];
    if (!account) return null;
    max = Math.max(max, account.progress.bookedResults);
    for (const id of account.booked) used.add(id);
  }
  for (let number = max + 1; number <= SAVE_COUNT_MAX; number += 1) {
    const id = `ghost-floor-${number}`;
    if (!used.has(id)) return id;
  }
  return null;
}

function startingAccount(name: string, passwordHash: PasswordHash, look: ModularCharacterSpec, sheet: RunnerSheet): RunnerAccount {
  const stock = createCampaign();
  const body = stock.runners.kite;
  return {
    name,
    passwordHash,
    body: { hands: { left: body.hands.left, right: body.hands.right }, belt: body.belt, pack: body.pack.slice() },
    lager: { ...stock.lager },
    booked: [],
    progress: { ...stock.progress, lines: [] },
    hold: null,
    revision: 0,
    look,
    sheet,
  };
}

function standardLook(): ModularCharacterSpec {
  return createModularCharacterSpec(42);
}

function readLook(value: unknown): ModularCharacterSpec | null {
  const parsed = validateModularCharacterSpec(value);
  return parsed.ok ? parsed.value : null;
}

function readSheet(value: unknown): RunnerSheet | null {
  const parsed = validateRunnerSheet(value);
  return parsed.ok ? parsed.value : null;
}

function heldKit(hold: RunnerHold): FrozenKit {
  return { weapon: hold.weapon, magazines: hold.magazines, medkits: hold.medkits };
}

function returnField(account: RunnerAccount): { readonly body: RunnerBody; readonly lager: RunnerGear } | null {
  if (!account.hold) return null;
  return returnFieldKit(account.body, account.lager, account.hold.weapon, account.hold.magazines, account.hold.medkits);
}

function passwordLength(password: unknown): number | null {
  if (typeof password !== "string") return null;
  return [...password].length;
}

function hashPassword(password: string): PasswordHash | null {
  const salt = randomBytes(SALT_BYTES);
  const hash = derive(password, salt, SCRYPT_KEYLEN, SCRYPT_N, SCRYPT_R, SCRYPT_P);
  if (!hash) return null;
  return {
    algorithm: "scrypt",
    salt: salt.toString("base64"),
    hash: hash.toString("base64"),
    n: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
    keylen: SCRYPT_KEYLEN,
  };
}

function passwordMatches(password: string, stored: PasswordHash | null): boolean {
  const material = stored ? { salt: Buffer.from(stored.salt, "base64"), hash: Buffer.from(stored.hash, "base64"), n: stored.n, r: stored.r, p: stored.p } : dummyMaterial();
  const actual = derive(password, material.salt, material.hash.length, material.n, material.r, material.p);
  if (!actual || actual.length !== material.hash.length) return false;
  const same = timingSafeEqual(actual, material.hash);
  return stored !== null && same;
}

function dummyMaterial(): { readonly salt: Buffer; readonly hash: Buffer; readonly n: number; readonly r: number; readonly p: number } {
  if (!dummy) {
    const salt = randomBytes(SALT_BYTES);
    const hash = scryptSync(String.fromCharCode(0), salt, SCRYPT_KEYLEN, { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P });
    dummy = { salt, hash };
  }
  return { salt: dummy.salt, hash: dummy.hash, n: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P };
}

function derive(password: string, salt: Buffer, keylen: number, n: number, r: number, p: number): Buffer | null {
  try {
    return scryptSync(password, salt, keylen, { N: n, r, p });
  } catch {
    return null;
  }
}

function readAccount(value: unknown, key: string): RunnerAccount | null {
  const body = record(value);
  if (!body || !accountShape(body)) return null;
  if (body.name !== key && runnerKey(body.name) !== key) return null;
  const name = displayName(body.name);
  if (!name || name.toLowerCase() !== key) return null;
  const passwordHash = readHash(body.passwordHash);
  const runnerBody = readBody(body.body);
  const lager = readGear(body.lager, SAVE_COUNT_MAX);
  const booked = readBooked(body.booked);
  const progress = readProgress(body.progress, booked);
  const hold = readHold(body.hold);
  const look = Object.prototype.hasOwnProperty.call(body, "look") ? readLook(body.look) : standardLook();
  const sheet = Object.prototype.hasOwnProperty.call(body, "sheet") ? readSheet(body.sheet) : balancedSheet();
  if (!passwordHash || !runnerBody || !lager || !booked || !progress || hold === undefined || !look || !sheet) return null;
  if (typeof body.revision !== "number" || !Number.isInteger(body.revision) || body.revision < 0 || body.revision > REVISION_MAX) return null;
  return { name, passwordHash, body: runnerBody, lager, booked, progress, hold, revision: body.revision, look, sheet };
}

function accountShape(body: Record<string, unknown>): boolean {
  const allowed = new Set<string>([...ACCOUNT_KEYS, ...OPTIONAL_ACCOUNT_KEYS]);
  const own = Object.keys(body);
  if (!own.every((key) => allowed.has(key))) return false;
  return ACCOUNT_KEYS.every((key) => Object.prototype.hasOwnProperty.call(body, key));
}

function readHash(value: unknown): PasswordHash | null {
  const body = record(value);
  if (!body || !exactKeys(body, HASH_KEYS)) return null;
  if (body.algorithm !== "scrypt" || body.n !== SCRYPT_N || body.r !== SCRYPT_R || body.p !== SCRYPT_P || body.keylen !== SCRYPT_KEYLEN) return null;
  if (typeof body.salt !== "string" || typeof body.hash !== "string") return null;
  const salt = decodeBase64(body.salt, SALT_BYTES);
  const hash = decodeBase64(body.hash, SCRYPT_KEYLEN);
  if (!salt || !hash) return null;
  return { algorithm: "scrypt", salt: body.salt, hash: body.hash, n: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P, keylen: SCRYPT_KEYLEN };
}

function readBody(value: unknown): RunnerBody | null {
  const body = record(value);
  if (!body || !exactKeys(body, ["hands", "belt", "pack"])) return null;
  const hands = record(body.hands);
  if (!hands || !exactKeys(hands, ["left", "right"]) || !isHand(hands.left) || !isHand(hands.right)) return null;
  if ((hands.left === "rifle" || hands.right === "rifle") && (hands.left !== "rifle" || hands.right !== "rifle")) return null;
  if (hands.left === "sidearm" && hands.right === "sidearm") return null;
  if (body.belt !== "empty" && body.belt !== "medkit") return null;
  if (!Array.isArray(body.pack) || body.pack.length !== PACK_CELLS) return null;
  const pack: PackFill[] = [];
  for (const cell of body.pack) {
    if (!isPack(cell)) return null;
    pack.push(cell);
  }
  for (let index = 0; index < pack.length; index += 1) {
    const cell = pack[index];
    if (cell === "rifle") {
      if (index % PACK_COLUMNS === PACK_COLUMNS - 1 || pack[index + 1] !== "rifleRest") return null;
    } else if (cell === "rifleRest") {
      if (index % PACK_COLUMNS === 0 || pack[index - 1] !== "rifle") return null;
    }
  }
  const parsed: RunnerBody = { hands: { left: hands.left, right: hands.right }, belt: body.belt, pack };
  const gear = carriedGear(parsed);
  if (GEAR_POSTS.some((post) => gear[post] > SLOT_LIMITS[post])) return null;
  return parsed;
}

function readGear(value: unknown, max: number): RunnerGear | null {
  const body = record(value);
  if (!body || !exactKeys(body, GEAR_POSTS)) return null;
  const gear = { rifle: 0, sidearm: 0, rifleMagazines: 0, sidearmMagazines: 0, medkits: 0 };
  for (const post of GEAR_POSTS) {
    const count = body[post];
    if (typeof count !== "number" || !Number.isInteger(count) || count < 0 || count > max) return null;
    gear[post] = count;
  }
  return gear;
}

function readBooked(value: unknown): readonly string[] | null {
  if (!Array.isArray(value)) return null;
  const ids: string[] = [];
  for (const entry of value) {
    if (typeof entry !== "string" || !RESULT_ID.test(entry) || ids.includes(entry)) return null;
    const number = resultNumber(entry);
    if (number === null || number > SAVE_COUNT_MAX) return null;
    ids.push(entry);
  }
  return ids;
}

function readProgress(value: unknown, booked: readonly string[] | null): CampaignProgress | null {
  if (!booked) return null;
  const body = record(value);
  if (!body || !exactKeys(body, PROGRESS_KEYS)) return null;
  if (typeof body.bookedResults !== "number" || !Number.isInteger(body.bookedResults) || body.bookedResults !== booked.length || body.bookedResults > SAVE_COUNT_MAX) return null;
  if (typeof body.lastResultId !== "string") return null;
  if (body.bookedResults === 0) {
    if (body.lastResultId !== "" || body.lastOutcome !== "" || body.lastReason !== "" || body.lastRound !== 0) return null;
    if (!Array.isArray(body.lines) || body.lines.length !== 0) return null;
    return { bookedResults: 0, lastResultId: "", lastOutcome: "", lastReason: "", lastRound: 0, lines: [] };
  }
  if (!booked.includes(body.lastResultId) || (body.lastOutcome !== "sieg" && body.lastOutcome !== "niederlage")) return null;
  if (!isReason(body.lastReason)) return null;
  if (typeof body.lastRound !== "number" || !Number.isInteger(body.lastRound) || body.lastRound < 1 || body.lastRound > 24) return null;
  if (!Array.isArray(body.lines) || body.lines.length < 1) return null;
  const lines: BookedLine[] = [];
  for (const entry of body.lines) {
    const line = readLine(entry);
    if (!line) return null;
    lines.push(line);
  }
  return { bookedResults: body.bookedResults, lastResultId: body.lastResultId, lastOutcome: body.lastOutcome, lastReason: body.lastReason, lastRound: body.lastRound, lines };
}

function readLine(value: unknown): BookedLine | null {
  const line = record(value);
  if (!line || !exactKeys(line, LINE_KEYS) || typeof line.runnerId !== "string" || !isCampaignRunner(line.runnerId)) return null;
  if (line.weapon !== "rifle" && line.weapon !== "sidearm") return null;
  const magazines = whole(line.magazines);
  const medkits = whole(line.medkits);
  const spentMagazines = whole(line.spentMagazines);
  const spentMedkits = whole(line.spentMedkits);
  if (magazines === null || medkits === null || spentMagazines === null || spentMedkits === null) return null;
  return { runnerId: line.runnerId, weapon: line.weapon, magazines, medkits, spentMagazines, spentMedkits };
}

function readHold(value: unknown): RunnerHold | null | undefined {
  if (value === null) return null;
  const hold = record(value);
  if (!hold || !exactKeys(hold, HOLD_KEYS) || typeof hold.resultId !== "string" || typeof hold.slotId !== "string" || !isCampaignRunner(hold.slotId)) return undefined;
  const number = resultNumber(hold.resultId);
  if (number === null || number > SAVE_COUNT_MAX) return undefined;
  if (hold.weapon !== "rifle" && hold.weapon !== "sidearm") return undefined;
  const magazines = whole(hold.magazines);
  const medkits = whole(hold.medkits);
  if (magazines === null || medkits === null) return undefined;
  return { resultId: hold.resultId, slotId: hold.slotId, weapon: hold.weapon, magazines, medkits };
}

function resultNumber(id: string): number | null {
  const match = RESULT_ID.exec(id);
  if (!match?.[1]) return null;
  const value = Number(match[1]);
  return Number.isInteger(value) ? value : null;
}

function whole(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0 || value > SAVE_COUNT_MAX) return null;
  return value;
}

function isReason(value: unknown): value is Exclude<CampaignProgress["lastReason"], ""> {
  return REASONS.some((reason) => reason === value);
}

function isHand(value: unknown): value is HandFill {
  return HANDS.some((hand) => hand === value);
}

function isPack(value: unknown): value is PackFill {
  return PACK.some((cell) => cell === value);
}

function decodeBase64(value: string, bytes: number): Buffer | null {
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(value)) return null;
  const buffer = Buffer.from(value, "base64");
  if (buffer.length !== bytes) return null;
  return buffer;
}

function replace(file: RunnerFile, key: string, account: RunnerAccount): RunnerFile {
  return { version: RUNNER_FILE_VERSION, runners: { ...file.runners, [key]: account } };
}

function sameGear(left: RunnerGear, right: RunnerGear): boolean {
  return GEAR_POSTS.every((post) => left[post] === right[post]);
}

function sameBody(left: RunnerBody, right: RunnerBody): boolean {
  if (left.hands.left !== right.hands.left || left.hands.right !== right.hands.right || left.belt !== right.belt) return false;
  return left.pack.every((cell, index) => cell === right.pack[index]);
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
