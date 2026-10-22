import { Room, type Client } from "@colyseus/core";
import { RasterSync } from "./schema.ts";
import { createRasterSession, type RasterSession, type RasterStand } from "./rasterSession.ts";
import { readRasterWish } from "./rasterValidate.ts";

const SEAT_SECONDS = 30;

export class RasterRoom extends Room<{ state: RasterSync }> {
  private session: RasterSession = createRasterSession();

  messages = {
    hallo: (client: Client) => {
      client.send("stand", this.publish(this.session.snapshot()));
    },
    befehl: (client: Client, payload: unknown) => {
      const parsed = readRasterWish(payload);
      const stand = parsed.ok
        ? this.session.receive(parsed.wish)
        : this.session.snapshot(parsed.commandId, parsed.notice);
      client.send("stand", this.publish(stand));
    },
  };

  override onCreate(): void {
    this.maxClients = 1;
    this.setState(new RasterSync());
  }

  override onJoin(client: Client): void {
    client.send("stand", this.publish(this.session.snapshot()));
  }

  override onDrop(client: Client): void {
    void this.allowReconnection(client, SEAT_SECONDS).catch(() => undefined);
  }

  override onReconnect(client: Client): void {
    client.send("stand", this.publish(this.session.snapshot()));
  }

  private publish(stand: RasterStand): RasterStand {
    this.state.revision = stand.revision;
    this.state.x = stand.x;
    this.state.y = stand.y;
    this.state.ap = stand.ap;
    this.state.round = stand.round;
    this.state.notice = stand.notice;
    this.state.ack = stand.ack;
    return stand;
  }
}
