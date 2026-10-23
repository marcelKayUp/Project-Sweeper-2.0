import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Room, ServerError, type Client } from "@colyseus/core";
import { campaignStore } from "./campaignStore.ts";
import { createMissionAuthority, RESUME_SECONDS, type MissionAuthority } from "./missionAuthority.ts";
import { MissionSync } from "./schema.ts";

export const DEFAULT_CAMPAIGN_FILE = join(dirname(fileURLToPath(import.meta.url)), "..", "data", "campaign.json");

export class MissionRoom extends Room<{ state: MissionSync }> {
  private authority: MissionAuthority = createMissionAuthority({ now: () => Date.now() });
  private timer: ReturnType<typeof setTimeout> | undefined;

  messages = {
    hallo: (client: Client) => {
      client.send("stand", this.authority.stand(client.sessionId));
    },
    lobby: (client: Client, payload: unknown) => {
      this.authority.submit([{ kind: "lobby", sessionId: client.sessionId, payload }]);
      this.publish();
      this.arm();
    },
    befehl: (client: Client, payload: unknown) => {
      this.authority.submit([{ kind: "command", sessionId: client.sessionId, payload }]);
      this.publish();
      this.arm();
    },
  };

  override async onCreate(options?: { seed?: unknown }): Promise<void> {
    this.authority = createMissionAuthority({ now: () => Date.now() }, readRoomSeed(options?.seed), campaignStore());
    this.maxClients = 4;
    this.setState(new MissionSync());
    await this.setPrivate(true);
  }

  override onJoin(client: Client, options?: { name?: unknown }): void {
    const joined = this.authority.join(client.sessionId, options?.name);
    if (!joined.ok) throw new ServerError(403, joined.rejection);
    this.publish();
  }

  override onDrop(client: Client): void {
    const phase = this.authority.stand(client.sessionId).roomPhase;
    this.authority.submit([{ kind: "leave", sessionId: client.sessionId }]);
    this.publish();
    if (phase === "lobby") return;
    void this.allowReconnection(client, RESUME_SECONDS).catch(() => undefined);
  }

  override onReconnect(client: Client): void {
    this.authority.submit([{ kind: "resume", sessionId: client.sessionId, now: Date.now() }]);
    this.publish();
    this.arm();
  }

  override onLeave(client: Client): void {
    this.authority.submit([{ kind: "leave", sessionId: client.sessionId }]);
    this.publish();
    this.arm();
  }

  override onDispose(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = undefined;
    this.authority.abort();
  }

  private publish(): void {
    this.authority.stamp();
    const shared = this.authority.shared();
    this.state.roomPhase = shared.roomPhase;
    this.state.round = shared.round;
    this.state.phase = shared.phase;
    this.state.revision = shared.revision;
    this.state.copies = shared.copies;
    this.state.doorOpen = shared.doorOpen;
    this.state.outcome = shared.outcome;
    this.state.reason = shared.reason;
    this.state.resultRound = shared.resultRound;
    this.state.notice = "";
    this.state.ack = shared.ack;
    this.state.phaseSeconds = shared.phaseSeconds;
    this.state.configRevision = shared.configRevision;
    this.state.lastEventId = shared.lastEventId;
    for (const client of this.clients) client.send("stand", this.authority.stand(client.sessionId));
    const events = this.authority.latestBatch();
    if (!events) return;
    for (const client of this.clients) client.send("ereignisse", events);
  }

  private arm(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = undefined;
    const at = this.authority.deadlineAt();
    if (at === null) return;
    const delay = Math.max(0, at - Date.now());
    this.timer = setTimeout(() => {
      this.timer = undefined;
      this.authority.submit([{ kind: "expire", now: at }]);
      this.publish();
      this.arm();
    }, delay);
    this.timer.unref();
  }
}

function readRoomSeed(value: unknown): number {
  if (value === undefined) return 1;
  if (typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 100) return value;
  throw new ServerError(400, "Seed ist ungültig.");
}
