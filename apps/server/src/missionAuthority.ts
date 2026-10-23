import { defensiveIntent } from "@neon/bots";
import {
  applyCommand,
  closeTeamPhase,
  createMissionState,
  projectEvents,
  projectTeam,
  type CrewCommand,
  type MissionEvent,
  type MissionSpec,
  type MissionState,
  type PublicUnit,
  type WeaponId,
} from "@neon/sim";
import { ghostFloorSpec } from "@neon/sim/ghost-floor";
import { parseCommand, parseLobby, type CommandMessage } from "./validate.ts";

const ORDER = ["kite", "voss", "nera", "sol"] as const;
const MISSION_SEED = 1;
const RATE_WINDOW_MS = 1000;
const BOT_STEPS = 2;

export const COMMANDS_PER_SECOND = 20;
export const DEFAULT_PHASE_SECONDS = 90;
export const RESUME_SECONDS = 300;
export const RESUME_MS = RESUME_SECONDS * 1000;

export type PhaseSeconds = 60 | 90 | 120;
export type RunnerId = (typeof ORDER)[number];

export interface AuthorityClock {
  now(): number;
}

export type JoinResult = { readonly ok: true } | { readonly ok: false; readonly rejection: string };

export type AuthorityEvent =
  | { readonly kind: "lobby"; readonly sessionId: string; readonly payload: unknown }
  | { readonly kind: "command"; readonly sessionId: string; readonly payload: unknown }
  | { readonly kind: "leave"; readonly sessionId: string }
  | { readonly kind: "resume"; readonly sessionId: string; readonly now: number }
  | { readonly kind: "expire"; readonly now: number };

export type RoomInput =
  | {
      readonly kind: "crew-command";
      readonly commandId: string;
      readonly runnerId: string;
      readonly round: number;
      readonly epoch: number;
      readonly action: CrewCommand["kind"];
    }
  | { readonly kind: "close-team-phase"; readonly round: number };

export type SlotHolder = "human" | "bot" | "reserviert" | "offen";

export interface AuthoritySlot {
  readonly runnerId: string;
  readonly name: string;
  readonly preset: string;
  readonly ready: boolean;
  readonly connected: boolean;
  readonly holder: SlotHolder;
}

export interface AuthorityStand {
  readonly ack: number;
  readonly seed: number;
  readonly roomPhase: "lobby" | "mission" | "ended";
  readonly ownRunnerId: string;
  readonly epoch: number;
  readonly control: "human" | "bot" | "";
  readonly coordinator: boolean;
  readonly round: number;
  readonly phase: string;
  readonly revision: number;
  readonly commandId: string;
  readonly commandRevision: number;
  readonly copies: number;
  readonly doorOpen: boolean;
  readonly outcome: "" | "sieg" | "niederlage";
  readonly reason: string;
  readonly resultRound: number;
  readonly notice: string;
  readonly phaseSeconds: PhaseSeconds;
  readonly configRevision: number;
  readonly deadlineAt: number;
  readonly lastEventId: number;
  readonly width: number;
  readonly height: number;
  readonly knownCells: readonly { readonly x: number; readonly y: number }[];
  readonly visibleCells: readonly { readonly x: number; readonly y: number }[];
  readonly walls: readonly { readonly x: number; readonly y: number }[];
  readonly lowCover: readonly { readonly id: string; readonly x: number; readonly y: number; readonly protects: string }[];
  readonly terminal: { readonly id: string; readonly x: number; readonly y: number } | null;
  readonly door: { readonly id: string; readonly x: number; readonly y: number } | null;
  readonly extraction: readonly { readonly x: number; readonly y: number }[];
  readonly slots: readonly AuthoritySlot[];
  readonly units: readonly PublicUnit[];
}

export interface SharedMission {
  readonly roomPhase: AuthorityStand["roomPhase"];
  readonly round: number;
  readonly phase: string;
  readonly revision: number;
  readonly copies: number;
  readonly doorOpen: boolean;
  readonly outcome: AuthorityStand["outcome"];
  readonly reason: string;
  readonly resultRound: number;
  readonly ack: number;
  readonly phaseSeconds: PhaseSeconds;
  readonly configRevision: number;
  readonly lastEventId: number;
}

export interface TeamBatch {
  readonly fromId: number;
  readonly toId: number;
  readonly targetRevision: number;
  readonly events: readonly (MissionEvent & { readonly id: number })[];
}

interface Seat {
  runnerId: RunnerId;
  name: string;
  preset: "" | WeaponId;
  ready: boolean;
  connected: boolean;
  epoch: number;
  controller: "human" | "bot";
  home: "human" | "bot";
  resumeUntil: number;
  returnAtBoundary: boolean;
}

interface Receipt {
  rejection: string | null;
  revision: number;
}

interface SessionNote {
  notice: string;
  commandId: string;
  commandRevision: number;
}

export interface MissionAuthority {
  join(sessionId: string, name: unknown): JoinResult;
  submit(events: readonly AuthorityEvent[]): void;
  stamp(): void;
  stand(sessionId: string): AuthorityStand;
  deadlineAt(): number | null;
  inputs(): readonly RoomInput[];
  events(): TeamBatch["events"];
  latestBatch(): TeamBatch | null;
  shared(): SharedMission;
}

export function createMissionAuthority(clock: AuthorityClock, seed = MISSION_SEED): MissionAuthority {
  if (!Number.isInteger(seed) || seed < 1 || seed > 100) throw new Error("Seed ist ungültig.");
  const missionSeed = seed;
  const seats = new Map<string, Seat>();
  const seen = new Map<string, Map<string, Receipt>>();
  const views = new Map<string, SessionNote>();
  const rates = new Map<string, number[]>();
  const inputs: RoomInput[] = [];
  const teamEvents: TeamBatch["events"][number][] = [];
  const queue: AuthorityEvent[] = [];
  let sim: MissionState | null = null;
  let spec: MissionSpec | null = null;
  let phaseSeconds: PhaseSeconds = DEFAULT_PHASE_SECONDS;
  let configRevision = 1;
  let openedAt: number | null = null;
  let ack = 0;
  let draining = false;
  let batch: TeamBatch | null = null;

  function join(sessionId: string, name: unknown): JoinResult {
    drain();
    if (seats.has(sessionId)) return { ok: true };
    if (sim) return { ok: false, rejection: "Die Mission läuft bereits." };
    const runnerId = ORDER.find((id) => ![...seats.values()].some((seat) => seat.runnerId === id));
    if (!runnerId) return { ok: false, rejection: "Der Raum ist voll." };
    seats.set(sessionId, {
      runnerId,
      name: cleanName(name),
      preset: "",
      ready: false,
      connected: true,
      epoch: 1,
      controller: "human",
      home: "human",
      resumeUntil: 0,
      returnAtBoundary: false,
    });
    views.set(sessionId, emptyNote());
    return { ok: true };
  }

  function submit(events: readonly AuthorityEvent[]): void {
    batch = null;
    const before = teamEvents.length;
    queue.push(...events);
    drain();
    if (teamEvents.length > before && sim) {
      const fresh = teamEvents.slice(before);
      const first = fresh[0];
      const last = fresh[fresh.length - 1];
      if (first && last) {
        batch = { fromId: first.id, toId: last.id, targetRevision: sim.revision, events: fresh };
      }
    }
  }

  function drain(): void {
    if (draining) return;
    draining = true;
    try {
      while (queue.length > 0) {
        const item = queue.shift();
        if (item) applyItem(item);
      }
    } finally {
      draining = false;
    }
  }

  function applyItem(item: AuthorityEvent): void {
    if (item.kind === "lobby") {
      handleLobby(item.sessionId, item.payload);
      return;
    }
    if (item.kind === "command") {
      handleCommand(item.sessionId, item.payload, false);
      return;
    }
    if (item.kind === "leave") {
      handleLeave(item.sessionId);
      return;
    }
    if (item.kind === "resume") {
      handleResume(item.sessionId, item.now);
      return;
    }
    if (!closeDue(item.now)) return;
    const pending = queue.splice(0, queue.length);
    for (const late of pending) {
      if (late.kind === "command") handleCommand(late.sessionId, late.payload, true);
      else if (late.kind === "lobby") handleLobby(late.sessionId, late.payload);
      else if (late.kind === "leave") handleLeave(late.sessionId);
      else if (late.kind === "resume") handleResume(late.sessionId, late.now);
    }
  }

  function handleLeave(sessionId: string): void {
    const seat = seats.get(sessionId);
    if (!seat || seat.home === "bot") return;
    if (!sim) {
      seats.delete(sessionId);
      views.delete(sessionId);
      seen.delete(sessionId);
      rates.delete(sessionId);
      return;
    }
    if (!seat.connected) return;
    seat.connected = false;
    seat.returnAtBoundary = false;
    if (seat.controller === "human") seat.resumeUntil = clock.now() + RESUME_MS;
  }

  function handleResume(sessionId: string, now: number): void {
    const seat = seats.get(sessionId);
    const revision = sim?.revision ?? 0;
    if (!seat || !sim || seat.home === "bot") {
      note(sessionId, "", "Keine Wiederaufnahme.", revision);
      return;
    }
    if (seat.controller === "human" && seat.connected) {
      note(sessionId, "", "Dieser Runner ist bereits verbunden.", revision);
      return;
    }
    if (!Number.isInteger(now) || seat.resumeUntil === 0 || now > seat.resumeUntil) {
      note(sessionId, "", "Die Wiederaufnahme ist abgelaufen.", revision);
      return;
    }
    seat.connected = true;
    if (seat.controller === "bot") {
      seat.returnAtBoundary = true;
      note(sessionId, "", "Die Rückgabe folgt an der nächsten Crewphase.", revision);
      return;
    }
    seat.resumeUntil = 0;
    note(sessionId, "", "", revision);
  }

  function handleLobby(sessionId: string, payload: unknown): void {
    const seat = seats.get(sessionId);
    if (!seat) return;
    if (sim) {
      note(sessionId, "", "Die Mission läuft bereits.", sim.revision);
      return;
    }
    const parsed = parseLobby(payload);
    if (!parsed.ok) {
      note(sessionId, "", parsed.rejection, 0);
      return;
    }
    if (parsed.message.kind === "preset") {
      seat.preset = parsed.message.preset;
      seat.ready = false;
      note(sessionId, "", "", 0);
      return;
    }
    if (parsed.message.kind === "bereit") {
      if (seat.preset !== "rifle" && seat.preset !== "sidearm") {
        note(sessionId, "", "Zuerst eine Ausrüstung wählen.", 0);
        return;
      }
      seat.ready = parsed.message.ready;
      note(sessionId, "", "", 0);
      return;
    }
    if (parsed.message.kind === "zeit") {
      setPhaseSeconds(sessionId, parsed.message.seconds);
      return;
    }
    if (parsed.message.kind === "bot") {
      seatBot(sessionId);
      return;
    }
    tryStart(sessionId);
  }

  function seatBot(sessionId: string): void {
    if (coordinatorSession() !== sessionId) {
      note(sessionId, "", "Nur die Koordination setzt Bots ein.", 0);
      return;
    }
    const runnerId = ORDER.find((id) => ![...seats.values()].some((seat) => seat.runnerId === id));
    if (!runnerId) {
      note(sessionId, "", "Der Raum ist voll.", 0);
      return;
    }
    seats.set(`bot:${runnerId}`, {
      runnerId,
      name: "Bot",
      preset: "rifle",
      ready: true,
      connected: true,
      epoch: 1,
      controller: "bot",
      home: "bot",
      resumeUntil: 0,
      returnAtBoundary: false,
    });
    configRevision += 1;
    for (const seat of seats.values()) {
      if (seat.controller === "human") seat.ready = false;
    }
    for (const id of seats.keys()) {
      if (seats.get(id)?.controller === "human") {
        views.set(id, { notice: "Ein Bot besetzt einen Slot. Bereit ist aufgehoben.", commandId: "", commandRevision: 0 });
      }
    }
  }

  function setPhaseSeconds(sessionId: string, seconds: PhaseSeconds): void {
    if (coordinatorSession() !== sessionId) {
      note(sessionId, "", "Nur die Koordination setzt die Zeit.", 0);
      return;
    }
    if (seconds === phaseSeconds) {
      note(sessionId, "", "", 0);
      return;
    }
    phaseSeconds = seconds;
    configRevision += 1;
    for (const seat of seats.values()) {
      if (seat.controller === "human") seat.ready = false;
    }
    for (const id of seats.keys()) views.set(id, { notice: "Neue Zeit, Bereit ist aufgehoben.", commandId: "", commandRevision: 0 });
  }

  function tryStart(sessionId: string): void {
    if (coordinatorSession() !== sessionId) {
      note(sessionId, "", "Nur die Koordination startet die Mission.", 0);
      return;
    }
    const all = [...seats.values()];
    if (all.length !== 4 || all.some((seat) => seat.controller === "human" && !seat.connected)) {
      note(sessionId, "", "Vier verbundene Runner werden gebraucht.", 0);
      return;
    }
    if (all.some((seat) => (seat.preset !== "rifle" && seat.preset !== "sidearm") || !seat.ready)) {
      note(sessionId, "", "Alle müssen Ausrüstung und Bereit bestätigen.", 0);
      return;
    }
    const presets: Record<string, WeaponId> = {};
    for (const seat of all) {
      if (seat.preset === "rifle" || seat.preset === "sidearm") presets[seat.runnerId] = seat.preset;
    }
    spec = ghostFloorSpec(presets);
    sim = createMissionState(spec, missionSeed);
    openedAt = clock.now();
    note(sessionId, "", "", sim.revision);
    actBots();
  }

  function handleCommand(sessionId: string, payload: unknown, late: boolean): void {
    const parsed = parseCommand(payload);
    if (!parsed.ok) {
      note(sessionId, parsed.commandId, parsed.rejection, sim?.revision ?? 0);
      return;
    }
    if (recall(sessionId, parsed.command.commandId)) return;
    if (!allow(sessionId)) {
      note(sessionId, parsed.command.commandId, "Zu viele Befehle.", sim?.revision ?? 0);
      return;
    }
    const seat = seats.get(sessionId);
    if (!seat || !sim || !spec) {
      remember(sessionId, parsed.command.commandId, "Die Mission hat noch nicht begonnen.");
      return;
    }
    if (parsed.command.epoch !== seat.epoch || parsed.command.unitId !== seat.runnerId) {
      remember(sessionId, parsed.command.commandId, "Dieser Runner gehört dir nicht.");
      return;
    }
    if (seat.controller !== "human") {
      remember(sessionId, parsed.command.commandId, "Die Rückgabe folgt an der nächsten Crewphase.");
      return;
    }
    if (sim.result || sim.phase === "ended") {
      remember(sessionId, parsed.command.commandId, "Die Mission ist beendet.");
      return;
    }
    if (late || !seat.connected || parsed.command.round !== sim.round || parsed.command.phase !== "crew" || sim.phase !== "crew") {
      const rejection = !late && !seat.connected ? "Die Verbindung ist unterbrochen." : "Die Phase ist vorbei.";
      remember(sessionId, parsed.command.commandId, rejection);
      return;
    }
    const previousRound = sim.round;
    const step = applyCommand(sim, spec, toCrew(seat.runnerId, parsed.command.action));
    if (step.rejection !== null) {
      remember(sessionId, parsed.command.commandId, step.rejection);
      return;
    }
    sim = step.state;
    if (sim.result || sim.phase !== "crew") openedAt = null;
    else if (sim.round !== previousRound) openedAt = clock.now();
    record(step.events);
    inputs.push({
      kind: "crew-command",
      commandId: parsed.command.commandId,
      runnerId: seat.runnerId,
      round: previousRound,
      epoch: seat.epoch,
      action: parsed.command.action.kind,
    });
    remember(sessionId, parsed.command.commandId, null);
    if (sim.round !== previousRound) {
      handoff(clock.now());
      actBots();
    }
  }

  function closeDue(now: number): boolean {
    if (!Number.isFinite(now) || !sim || !spec || sim.result || sim.phase !== "crew") return false;
    const due = deadlineAt();
    if (due === null || now < due) return false;
    const round = sim.round;
    const step = closeTeamPhase(sim, spec);
    if (step.rejection !== null) return false;
    sim = step.state;
    inputs.push({ kind: "close-team-phase", round });
    openedAt = sim.result || sim.phase !== "crew" ? null : now;
    record(step.events);
    handoff(now);
    actBots();
    return true;
  }

  function handoff(now: number): void {
    for (const runnerId of ORDER) {
      const seat = [...seats.values()].find((item) => item.runnerId === runnerId);
      if (!seat) continue;
      if (seat.controller === "human" && !seat.connected) {
        seat.controller = "bot";
        seat.returnAtBoundary = false;
        seat.epoch += 1;
        continue;
      }
      if (seat.controller === "bot" && seat.returnAtBoundary) {
        if (seat.connected && now <= seat.resumeUntil) {
          seat.controller = "human";
          seat.returnAtBoundary = false;
          seat.resumeUntil = 0;
          seat.epoch += 1;
        } else {
          seat.returnAtBoundary = false;
        }
      }
    }
  }

  function actBots(): void {
    for (const runnerId of ORDER) {
      const seat = [...seats.values()].find((item) => item.runnerId === runnerId);
      if (!seat || seat.controller !== "bot") continue;
      for (let step = 0; step < BOT_STEPS; step += 1) {
        if (!sim || !spec || sim.result || sim.phase !== "crew") return;
        const command = defensiveIntent(projectTeam(sim, spec), seat.runnerId);
        if (!command) break;
        const applied = applyCommand(sim, spec, command);
        if (applied.rejection !== null) {
          if (command.kind === "ready") break;
          const fallback = applyCommand(sim, spec, { kind: "ready", unitId: seat.runnerId });
          if (fallback.rejection === null) commitBot(seat, fallback.state, fallback.events, "ready");
          break;
        }
        commitBot(seat, applied.state, applied.events, command.kind);
        if (command.kind === "ready") break;
      }
    }
  }

  function commitBot(seat: Seat, state: MissionState, events: readonly MissionEvent[], action: CrewCommand["kind"]): void {
    if (!sim) return;
    const round = sim.round;
    sim = state;
    record(events);
    inputs.push({
      kind: "crew-command",
      commandId: `bot-${seat.runnerId}-${round}-${seat.epoch}-${action}`,
      runnerId: seat.runnerId,
      round,
      epoch: seat.epoch,
      action,
    });
  }

  function record(events: readonly MissionEvent[]): void {
    if (!sim || !spec) return;
    const allowed = projectEvents(events, projectTeam(sim, spec));
    for (const event of allowed) teamEvents.push({ ...event, id: teamEvents.length + 1 });
  }

function remember(sessionId: string, commandId: string, rejection: string | null): void {
  const safe = rejection === null ? null : scrubHiddenNotice(rejection, hiddenEnemyIds());
  const revision = sim?.revision ?? 0;
  const bucket = seen.get(sessionId) ?? new Map<string, Receipt>();
  bucket.set(commandId, { rejection: safe, revision });
  seen.set(sessionId, bucket);
  note(sessionId, commandId, safe, revision);
}

function hiddenEnemyIds(): readonly string[] {
  if (!sim || !spec) return [];
  const visible = new Set(projectTeam(sim, spec).units.map((unit) => unit.id));
  return sim.units.filter((unit) => unit.team === "enemy" && !visible.has(unit.id)).map((unit) => unit.id);
}

  function recall(sessionId: string, commandId: string): boolean {
    const prior = seen.get(sessionId)?.get(commandId);
    if (!prior) return false;
    note(sessionId, commandId, prior.rejection, prior.revision);
    return true;
  }

  function allow(sessionId: string): boolean {
    const at = clock.now();
    const cutoff = at - RATE_WINDOW_MS;
    const fresh = (rates.get(sessionId) ?? []).filter((hit) => hit >= cutoff);
    if (fresh.length >= COMMANDS_PER_SECOND) {
      rates.set(sessionId, fresh);
      return false;
    }
    fresh.push(at);
    rates.set(sessionId, fresh);
    return true;
  }

  function note(sessionId: string, commandId: string, rejection: string | null, commandRevision: number): void {
    views.set(sessionId, { notice: rejection ?? "", commandId, commandRevision });
  }

  function deadlineAt(): number | null {
    if (openedAt === null || !sim || sim.result || sim.phase !== "crew") return null;
    return openedAt + phaseSeconds * 1000;
  }

  function coordinatorSession(): string | null {
    for (const runnerId of ORDER) {
      for (const [sessionId, seat] of seats) {
        if (seat.runnerId === runnerId && seat.connected && seat.controller === "human") return sessionId;
      }
    }
    return null;
  }

  function stand(sessionId: string): AuthorityStand {
    const seat = seats.get(sessionId);
    const view = sim && spec ? projectTeam(sim, spec) : null;
    const receipt = views.get(sessionId) ?? emptyNote();
    const due = deadlineAt();
    return {
      ack,
      seed: missionSeed,
      roomPhase: sim?.result ? "ended" : sim ? "mission" : "lobby",
      ownRunnerId: seat?.runnerId ?? "",
      epoch: seat?.epoch ?? 0,
      control: seat?.controller ?? "",
      coordinator: coordinatorSession() === sessionId,
      round: view?.round ?? 1,
      phase: view?.phase ?? "crew",
      revision: view?.revision ?? 0,
      commandId: receipt.commandId,
      commandRevision: receipt.commandRevision,
      copies: view?.copies ?? 0,
      doorOpen: view?.doorOpen ?? false,
      outcome: view?.result?.outcome ?? "",
      reason: view?.result?.reason ?? "",
      resultRound: view?.result?.round ?? 0,
      notice: receipt.notice,
      phaseSeconds,
      configRevision,
      deadlineAt: due ?? 0,
      lastEventId: teamEvents.length,
      width: view?.width ?? 0,
      height: view?.height ?? 0,
      knownCells: view?.knownCells.map(copyPoint) ?? [],
      visibleCells: view?.visibleCells.map(copyPoint) ?? [],
      walls: view?.walls.map(copyPoint) ?? [],
      lowCover: view?.lowCover.map((cover) => ({ id: cover.id, x: cover.x, y: cover.y, protects: cover.protects })) ?? [],
      terminal: view?.terminal ? { id: view.terminal.id, x: view.terminal.x, y: view.terminal.y } : null,
      door: view?.door ? { id: view.door.id, x: view.door.x, y: view.door.y } : null,
      extraction: view?.extraction.map(copyPoint) ?? [],
      slots: ORDER.map((runnerId) => {
        const found = [...seats.values()].find((item) => item.runnerId === runnerId);
        return {
          runnerId,
          name: found?.name ?? "",
          preset: found?.preset ?? "",
          ready: found?.ready ?? false,
          connected: found?.connected ?? false,
          holder: holderOf(found),
        };
      }),
      units: view?.units ?? [],
    };
  }

  function shared(): SharedMission {
    const sample = stand("");
    return {
      roomPhase: sample.roomPhase,
      round: sample.round,
      phase: sample.phase,
      revision: sample.revision,
      copies: sample.copies,
      doorOpen: sample.doorOpen,
      outcome: sample.outcome,
      reason: sample.reason,
      resultRound: sample.resultRound,
      ack: sample.ack,
      phaseSeconds: sample.phaseSeconds,
      configRevision: sample.configRevision,
      lastEventId: sample.lastEventId,
    };
  }

  return {
    join,
    submit,
    stamp() {
      ack += 1;
    },
    stand,
    deadlineAt,
    inputs: () => inputs.slice(),
    events: () => teamEvents.slice(),
    latestBatch: () => batch,
    shared,
  };
}

function holderOf(seat: Seat | undefined): SlotHolder {
  if (!seat) return "offen";
  if (seat.controller === "bot") return "bot";
  if (!seat.connected) return "reserviert";
  return "human";
}

function emptyNote(): SessionNote {
  return { notice: "", commandId: "", commandRevision: 0 };
}

function copyPoint(cell: { readonly x: number; readonly y: number }): { readonly x: number; readonly y: number } {
  return { x: cell.x, y: cell.y };
}

export function scrubHiddenNotice(notice: string, hiddenIds: readonly string[]): string {
  if (hiddenIds.some((id) => id.length > 0 && notice.includes(id))) return "Aktion abgelehnt.";
  return notice;
}

function toCrew(unitId: string, action: CommandMessage["action"]): CrewCommand {
  switch (action.kind) {
    case "move":
      return { kind: "move", unitId, x: action.x, y: action.y };
    case "interact":
      return { kind: "interact", unitId, targetId: action.targetId };
    case "extract":
      return { kind: "extract", unitId };
    case "shoot":
      return { kind: "shoot", unitId, targetId: action.targetId };
    case "reload":
      return { kind: "reload", unitId };
    case "aim":
      return { kind: "aim", unitId };
    case "heal":
      return { kind: "heal", unitId, targetId: action.targetId };
    case "overwatch":
      return { kind: "overwatch", unitId, direction: action.direction };
    case "ready":
      return { kind: "ready", unitId };
    default: {
      const unreachable: never = action;
      throw new Error(`Unbekannte Aktion: ${String(unreachable)}`);
    }
  }
}

function cleanName(value: unknown): string {
  if (typeof value !== "string") return "Runner";
  const trimmed = value.trim().slice(0, 16);
  if (!/^[\p{L}\p{N} ]+$/u.test(trimmed)) return "Runner";
  return trimmed;
}
