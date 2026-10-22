import { Room, ServerError, type Client } from "@colyseus/core";
import {
  applyCommand,
  createMissionState,
  projectTeam,
  type MissionSpec,
  type MissionState,
  type PublicUnit,
  type WeaponId,
} from "@neon/sim";
import { ghostFloorSpec } from "@neon/sim/ghost-floor";
import { MissionSync } from "./schema.ts";
import { parseCommand, parseLobby } from "./validate.ts";

const ORDER = ["kite", "voss", "nera", "sol"] as const;

interface Seat {
  runnerId: (typeof ORDER)[number];
  name: string;
  preset: "" | WeaponId;
  ready: boolean;
  connected: boolean;
  epoch: number;
}

interface Stand {
  ack: number;
  roomPhase: "lobby" | "mission" | "ended";
  ownRunnerId: string;
  coordinator: boolean;
  round: number;
  phase: string;
  revision: number;
  copies: number;
  doorOpen: boolean;
  outcome: "" | "sieg" | "niederlage";
  reason: string;
  resultRound: number;
  notice: string;
  slots: Array<{
    runnerId: string;
    name: string;
    preset: string;
    ready: boolean;
    connected: boolean;
  }>;
  units: readonly PublicUnit[];
}

export class MissionRoom extends Room<{ state: MissionSync }> {
  private seats = new Map<string, Seat>();
  private seen = new Map<string, string | null>();
  private sim: MissionState | null = null;
  private spec: MissionSpec | null = null;
  private ack = 0;
  private notice = "";

  messages = {
    hallo: (client: Client) => {
      const view = this.sim && this.spec ? projectTeam(this.sim, this.spec) : null;
      client.send("stand", this.standFor(client.sessionId, view));
    },
    lobby: (client: Client, payload: unknown) => {
      this.onLobby(client, payload);
    },
    befehl: (client: Client, payload: unknown) => {
      this.onCommand(client, payload);
    },
  };

  override async onCreate(): Promise<void> {
    this.maxClients = 4;
    this.setState(new MissionSync());
    await this.setPrivate(true);
  }

  override onJoin(client: Client, options?: { name?: unknown }): void {
    if (this.sim) throw new ServerError(403, "Die Mission läuft bereits.");
    const runnerId = ORDER.find((id) => ![...this.seats.values()].some((seat) => seat.runnerId === id));
    if (!runnerId) throw new ServerError(403, "Der Raum ist voll.");
    this.seats.set(client.sessionId, {
      runnerId,
      name: cleanName(options?.name),
      preset: "",
      ready: false,
      connected: true,
      epoch: 1,
    });
    this.notice = "";
    this.publish();
  }

  override onLeave(client: Client): void {
    const seat = this.seats.get(client.sessionId);
    if (!seat) return;
    if (!this.sim) this.seats.delete(client.sessionId);
    else seat.connected = false;
    this.publish();
  }

  private onLobby(client: Client, payload: unknown): void {
    const seat = this.seats.get(client.sessionId);
    if (!seat) return;
    if (this.sim) {
      this.notice = "Die Mission läuft bereits.";
      this.publish();
      return;
    }
    const parsed = parseLobby(payload);
    if (!parsed.ok) {
      this.notice = parsed.rejection;
      this.publish();
      return;
    }
    if (parsed.message.kind === "preset") {
      seat.preset = parsed.message.preset;
      seat.ready = false;
      this.notice = "";
      this.publish();
      return;
    }
    if (parsed.message.kind === "bereit") {
      if (seat.preset !== "rifle" && seat.preset !== "sidearm") {
        this.notice = "Zuerst eine Ausrüstung wählen.";
        this.publish();
        return;
      }
      seat.ready = parsed.message.ready;
      this.notice = "";
      this.publish();
      return;
    }
    this.tryStart(client.sessionId);
  }

  private tryStart(sessionId: string): void {
    if (this.coordinator() !== sessionId) {
      this.notice = "Nur die Koordination startet die Mission.";
      this.publish();
      return;
    }
    const seats = [...this.seats.values()];
    if (seats.length !== 4 || seats.some((seat) => !seat.connected)) {
      this.notice = "Vier verbundene Runner werden gebraucht.";
      this.publish();
      return;
    }
    if (seats.some((seat) => (seat.preset !== "rifle" && seat.preset !== "sidearm") || !seat.ready)) {
      this.notice = "Alle müssen Ausrüstung und Bereit bestätigen.";
      this.publish();
      return;
    }
    const presets: Record<string, WeaponId> = {};
    for (const seat of seats) {
      if (seat.preset === "rifle" || seat.preset === "sidearm") presets[seat.runnerId] = seat.preset;
    }
    this.spec = ghostFloorSpec(presets);
    this.sim = createMissionState(this.spec, 1);
    this.notice = "";
    this.publish();
  }

  private onCommand(client: Client, payload: unknown): void {
    const seat = this.seats.get(client.sessionId);
    if (!seat || !this.sim || !this.spec) {
      this.notice = "Die Mission hat noch nicht begonnen.";
      this.publish();
      return;
    }
    const parsed = parseCommand(payload);
    if (!parsed.ok) {
      this.notice = parsed.rejection;
      this.publish();
      return;
    }
    const key = `${client.sessionId}:${parsed.command.commandId}`;
    if (this.seen.has(key)) {
      this.notice = this.seen.get(key) ?? "";
      this.publish();
      return;
    }
    if (parsed.command.epoch !== seat.epoch || parsed.command.unitId !== seat.runnerId) {
      this.remember(key, "Dieser Runner gehört dir nicht.");
      return;
    }
    if (this.sim.result) {
      this.remember(key, "Die Mission ist beendet.");
      return;
    }
    if (parsed.command.round !== this.sim.round || parsed.command.phase !== "crew" || this.sim.phase !== "crew") {
      this.remember(key, "Die Phase ist vorbei.");
      return;
    }
    const step = applyCommand(this.sim, this.spec, { ...parsed.command.action, unitId: seat.runnerId });
    this.sim = step.state;
    this.remember(key, step.rejection);
  }

  private remember(key: string, rejection: string | null): void {
    this.seen.set(key, rejection);
    this.notice = rejection ?? "";
    this.publish();
  }

  private publish(): void {
    this.ack += 1;
    const view = this.sim && this.spec ? projectTeam(this.sim, this.spec) : null;
    this.state.roomPhase = this.sim?.result ? "ended" : this.sim ? "mission" : "lobby";
    this.state.round = view?.round ?? 1;
    this.state.phase = view?.phase ?? "crew";
    this.state.revision = view?.revision ?? 0;
    this.state.copies = view?.copies ?? 0;
    this.state.doorOpen = view?.doorOpen ?? false;
    this.state.outcome = view?.result?.outcome ?? "";
    this.state.reason = view?.result?.reason ?? "";
    this.state.resultRound = view?.result?.round ?? 0;
    this.state.notice = this.notice;
    this.state.ack = this.ack;
    for (const client of this.clients) client.send("stand", this.standFor(client.sessionId, view));
  }

  private standFor(sessionId: string, view: ReturnType<typeof projectTeam> | null): Stand {
    const seat = this.seats.get(sessionId);
    return {
      ack: this.ack,
      roomPhase: this.sim?.result ? "ended" : this.sim ? "mission" : "lobby",
      ownRunnerId: seat?.runnerId ?? "",
      coordinator: this.coordinator() === sessionId,
      round: view?.round ?? 1,
      phase: view?.phase ?? "crew",
      revision: view?.revision ?? 0,
      copies: view?.copies ?? 0,
      doorOpen: view?.doorOpen ?? false,
      outcome: view?.result?.outcome ?? "",
      reason: view?.result?.reason ?? "",
      resultRound: view?.result?.round ?? 0,
      notice: this.notice,
      slots: ORDER.map((runnerId) => {
        const found = [...this.seats.values()].find((seat) => seat.runnerId === runnerId);
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

  private coordinator(): string | null {
    for (const runnerId of ORDER) {
      for (const [sessionId, seat] of this.seats) {
        if (seat.runnerId === runnerId && seat.connected) return sessionId;
      }
    }
    return null;
  }
}

function cleanName(value: unknown): string {
  if (typeof value !== "string") return "Runner";
  const trimmed = value.trim().slice(0, 16);
  if (!/^[\p{L}\p{N} ]+$/u.test(trimmed)) return "Runner";
  return trimmed;
}
