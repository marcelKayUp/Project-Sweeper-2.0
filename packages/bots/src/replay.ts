import {
  applyCommand,
  createMissionState,
  CREW_AP,
  missionChecksum,
  projectTeam,
  PROTOCOL_VERSION,
  ROUND_LIMIT,
  RULES_VERSION,
} from "@neon/sim";
import type { CrewCommand, MissionResult, MissionSpec, MissionState, OutcomeId } from "@neon/sim";
import { missionIntent } from "./missionBot.ts";

export const POLICY_ID = "mission-v1" as const;

const MAX_COMMANDS = ROUND_LIMIT * 48;

export interface MissionReplay {
  readonly rulesVersion: number;
  readonly protocolVersion: number;
  readonly missionId: string;
  readonly contentHash: string;
  readonly seed: number;
  readonly policy: typeof POLICY_ID;
  readonly commands: readonly CrewCommand[];
  readonly checkpoints: readonly string[];
  readonly outcome: OutcomeId;
  readonly reason: MissionResult["reason"];
  readonly round: number;
  readonly completedRounds: number;
  readonly rejections: number;
  readonly extracted: number;
  readonly down: number;
}

export function runMission(spec: MissionSpec, seed: number): MissionReplay {
  let state = createMissionState(spec, seed);
  const commands: CrewCommand[] = [];
  const checkpoints: string[] = [];
  let rejections = 0;
  for (let guard = 0; guard < MAX_COMMANDS && !state.result; guard += 1) {
    assertInvariants(state);
    const view = projectTeam(state, spec);
    const intent = missionIntent(view);
    const command = intent ?? pass(view);
    if (!command) break;
    const step = applyCommand(state, spec, command);
    commands.push(command);
    checkpoints.push(missionChecksum(step.state));
    if (step.rejection !== null) {
      rejections += 1;
      const ready: CrewCommand = { kind: "ready", unitId: command.unitId };
      const passed = applyCommand(step.state, spec, ready);
      commands.push(ready);
      checkpoints.push(missionChecksum(passed.state));
      state = passed.state;
      if (passed.rejection !== null) break;
      continue;
    }
    state = step.state;
  }
  assertInvariants(state);
  if (!state.result) throw new Error("Bot hält die Phase offen.");
  return {
    rulesVersion: state.rulesVersion,
    protocolVersion: PROTOCOL_VERSION,
    missionId: spec.id,
    contentHash: spec.hash,
    seed,
    policy: POLICY_ID,
    commands,
    checkpoints,
    outcome: state.result.outcome,
    reason: state.result.reason,
    round: state.result.round,
    completedRounds: state.result.completedRounds,
    rejections,
    extracted: state.result.extractedIds.length,
    down: state.result.downIds.length,
  };
}

export function replayMission(spec: MissionSpec, replay: MissionReplay): MissionState {
  if (replay.rulesVersion !== RULES_VERSION || replay.protocolVersion !== PROTOCOL_VERSION) {
    throw new Error("Replay-Version ist unbekannt.");
  }
  if (replay.policy !== POLICY_ID || replay.missionId !== spec.id || replay.contentHash !== spec.hash) {
    throw new Error("Replay passt nicht zur Mission.");
  }
  if (replay.checkpoints.length !== replay.commands.length) throw new Error("Replay ist unvollständig.");
  let state = createMissionState(spec, replay.seed);
  for (let index = 0; index < replay.commands.length; index += 1) {
    const command = replay.commands[index];
    if (!command) throw new Error("Replay ist unvollständig.");
    state = applyCommand(state, spec, command).state;
    if (missionChecksum(state) !== replay.checkpoints[index]) throw new Error(`Replay weicht bei Schritt ${index} ab.`);
  }
  return state;
}

export function serializeReplay(replay: MissionReplay): string {
  return `${JSON.stringify(replay)}\n`;
}

export function parseReplay(text: string): MissionReplay {
  const value: unknown = JSON.parse(text);
  if (!value || typeof value !== "object") throw new Error("Replay ist unlesbar.");
  const replay = value as Partial<MissionReplay>;
  if (replay.policy !== POLICY_ID || !Array.isArray(replay.commands) || !Array.isArray(replay.checkpoints)) {
    throw new Error("Replay ist unlesbar.");
  }
  return replay as MissionReplay;
}

function pass(view: ReturnType<typeof projectTeam>): CrewCommand | null {
  const runner = view.units
    .filter((unit) => unit.team === "crew" && unit.status === "active" && !unit.ready)
    .slice()
    .sort((left, right) => (left.id < right.id ? -1 : left.id > right.id ? 1 : 0))[0];
  if (!runner) return null;
  return { kind: "ready", unitId: runner.id };
}

function assertInvariants(state: MissionState): void {
  const occupied = new Set<string>();
  const ids = new Set<string>();
  for (const unit of state.units) {
    if (ids.has(unit.id)) throw new Error(`Doppelte Id ${unit.id}`);
    ids.add(unit.id);
    if (unit.ap < 0 || unit.hp < 0 || unit.magazine < 0 || unit.reserveMagazines < 0) {
      throw new Error(`Negative Ressource bei ${unit.id}`);
    }
    if (unit.hp > unit.maxHp || unit.ap > CREW_AP) throw new Error(`Ressource über dem Maximum bei ${unit.id}`);
    if (unit.magazine + (unit.overwatch ? 1 : 0) > unit.magazineSize) throw new Error(`Magazin übervoll bei ${unit.id}`);
    if (unit.status === "extracted") continue;
    const cell = `${unit.x},${unit.y}`;
    if (occupied.has(cell)) throw new Error(`Doppelte Feldbelegung ${cell}`);
    occupied.add(cell);
  }
  if ((state.phase === "ended") !== (state.result !== null)) throw new Error("Abschluss und Phase passen nicht.");
  if (state.copies < 0 || state.copies > 2) throw new Error("Kopien sind ungültig.");
  if (state.round < 1 || state.completedRounds < 0 || state.completedRounds > ROUND_LIMIT) {
    throw new Error("Runde ist ungültig.");
  }
  if (state.combatRng.stream !== "combat" || state.botRng.stream !== "bot") throw new Error("RNG-Stream ist vertauscht.");
}
