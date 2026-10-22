import {
  applyCommand,
  closeTeamPhase,
  createMissionState,
  projectTeam,
  type CrewCommand,
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

export const COMMANDS_PER_SECOND = 20;
export const DEFAULT_PHASE_SECONDS = 90;

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

export interface AuthoritySlot {
  readonly runnerId: string;
  readonly name: string;
  readonly preset: string;
  readonly ready: boolean;
  readonly connected: boolean;
}

export interface AuthorityStand {
  readonly ack: number;
  readonly roomPhase: "lobby" | "mission" | "ended";
  readonly ownRunnerId: string;
  readonly epoch: number;
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
}

interface Seat {
  runnerId: RunnerId;
  name: string;
  preset: "" | WeaponId;
  ready: boolean;
  connected: boolean;
  epoch: number;
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
  shared(): SharedMission;
}

export function createMissionAuthority(clock: AuthorityClock): MissionAuthority {
  const seats = new Map<string, Seat>();
  const seen = new Map<string, Map<string, Receipt>>();
  const views = new Map<string, SessionNote>();
  const rates = new Map<string, number[]>();
  const inputs: RoomInput[] = [];
  const queue: AuthorityEvent[] = [];
  let sim: MissionState | null = null;
  let spec: MissionSpec | null = null;
  let phaseSeconds: PhaseSeconds = DEFAULT_PHASE_SECONDS;
  let configRevision = 1;
  let openedAt: number | null = null;
  let ack = 0;
  let draining = false;

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
    });
    views.set(sessionId, emptyNote());
    return { ok: true };
  }

  function submit(events: readonly AuthorityEvent[]): void {
    queue.push(...events);
    drain();
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
    if (!closeDue(item.now)) return;
    const pending = queue.splice(0, queue.length);
    for (const late of pending) {
      if (late.kind === "command") handleCommand(late.sessionId, late.payload, true);
      else if (late.kind === "lobby") handleLobby(late.sessionId, late.payload);
      else if (late.kind === "leave") handleLeave(late.sessionId);
    }
  }

  function handleLeave(sessionId: string): void {
    const seat = seats.get(sessionId);
    if (!seat) return;
    if (!sim) {
      seats.delete(sessionId);
      views.delete(sessionId);
      seen.delete(sessionId);
      rates.delete(sessionId);
      return;
    }
    seat.connected = false;
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
    tryStart(sessionId);
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
    for (const seat of seats.values()) seat.ready = false;
    for (const id of seats.keys()) views.set(id, { notice: "Neue Zeit, Bereit ist aufgehoben.", commandId: "", commandRevision: 0 });
  }

  function tryStart(sessionId: string): void {
    if (coordinatorSession() !== sessionId) {
      note(sessionId, "", "Nur die Koordination startet die Mission.", 0);
      return;
    }
    const all = [...seats.values()];
    if (all.length !== 4 || all.some((seat) => !seat.connected)) {
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
    sim = createMissionState(spec, MISSION_SEED);
    openedAt = clock.now();
    note(sessionId, "", "", sim.revision);
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
    inputs.push({
      kind: "crew-command",
      commandId: parsed.command.commandId,
      runnerId: seat.runnerId,
      round: previousRound,
      epoch: seat.epoch,
      action: parsed.command.action.kind,
    });
    remember(sessionId, parsed.command.commandId, null);
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
    return true;
  }

  function remember(sessionId: string, commandId: string, rejection: string | null): void {
    const revision = sim?.revision ?? 0;
    const bucket = seen.get(sessionId) ?? new Map<string, Receipt>();
    bucket.set(commandId, { rejection, revision });
    seen.set(sessionId, bucket);
    note(sessionId, commandId, rejection, revision);
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
        if (seat.runnerId === runnerId && seat.connected) return sessionId;
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
      roomPhase: sim?.result ? "ended" : sim ? "mission" : "lobby",
      ownRunnerId: seat?.runnerId ?? "",
      epoch: seat?.epoch ?? 0,
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
      slots: ORDER.map((runnerId) => {
        const found = [...seats.values()].find((item) => item.runnerId === runnerId);
        return {
          runnerId,
          name: found?.name ?? "",
          preset: found?.preset ?? "",
          ready: found?.ready ?? false,
          connected: found?.connected ?? false,
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
    shared,
  };
}

function emptyNote(): SessionNote {
  return { notice: "", commandId: "", commandRevision: 0 };
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
