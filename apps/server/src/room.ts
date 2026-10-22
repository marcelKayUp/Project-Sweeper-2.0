import { Room, ServerError, type Client } from "@colyseus/core";
import { createMissionAuthority, type MissionAuthority } from "./missionAuthority.ts";
import { MissionSync } from "./schema.ts";

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

  override async onCreate(): Promise<void> {
    this.maxClients = 4;
    this.setState(new MissionSync());
    await this.setPrivate(true);
  }

  override onJoin(client: Client, options?: { name?: unknown }): void {
    const joined = this.authority.join(client.sessionId, options?.name);
    if (!joined.ok) throw new ServerError(403, joined.rejection);
    this.publish();
  }

  override onLeave(client: Client): void {
    this.authority.submit([{ kind: "leave", sessionId: client.sessionId }]);
    this.publish();
    this.arm();
  }

  override onDispose(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = undefined;
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
    for (const client of this.clients) client.send("stand", this.authority.stand(client.sessionId));
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
