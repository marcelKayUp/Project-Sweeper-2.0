import { Room, type Client } from "@colyseus/core";
import { generateBuilding } from "@neon/generator";
import { SichtSync } from "./schema.ts";
import { createSightSession, type SightSession, type SightStand } from "./sightSession.ts";
import { readSightOptions, readSightWish } from "./sightValidate.ts";

const SEAT_SECONDS = 30;

// Ein Sitz. Die Karte entsteht auf dem Server; der Client bekommt nur die Teamsicht.
export class SightRoom extends Room<{ state: SichtSync }> {
  private session: SightSession | null = null;

  messages = {
    hallo: (client: Client) => {
      const stand = this.session?.snapshot();
      if (stand) client.send("stand", this.publish(stand));
    },
    befehl: (client: Client, payload: unknown) => {
      if (!this.session) return;
      const parsed = readSightWish(payload);
      const stand = parsed.ok
        ? this.session.receive(parsed.wish)
        : this.session.snapshot(parsed.commandId, parsed.notice);
      client.send("stand", this.publish(stand));
    },
  };

  override async onCreate(options: unknown): Promise<void> {
    const config = readSightOptions(options);
    const result = await generateBuilding({
      seed: config.seed,
      family: config.family,
      size: "compact",
      instanceId: "sicht",
    });
    if (!result.ok) throw new Error("Kein Grundriss.");
    this.session = createSightSession(result.package.mission, config.seed, {
      family: config.family,
      method: result.package.building.layout.method,
      rooms: result.package.building.rooms.length,
    });
    this.maxClients = 1;
    this.setState(new SichtSync());
  }

  override onJoin(client: Client): void {
    const stand = this.session?.snapshot();
    if (stand) client.send("stand", this.publish(stand));
  }

  override onDrop(client: Client): void {
    void this.allowReconnection(client, SEAT_SECONDS).catch(() => undefined);
  }

  override onReconnect(client: Client): void {
    const stand = this.session?.snapshot();
    if (stand) client.send("stand", this.publish(stand));
  }

  private publish(stand: SightStand): SightStand {
    this.state.revision = stand.revision;
    this.state.round = stand.round;
    this.state.phase = stand.phase;
    this.state.copies = stand.copies;
    this.state.outcome = stand.outcome;
    this.state.notice = stand.notice;
    this.state.ack = stand.ack;
    return stand;
  }
}
