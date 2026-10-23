import { Server } from "@colyseus/core";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { openCampaignFile } from "./campaignStore.ts";
import { RasterRoom } from "./rasterRoom.ts";
import { DEFAULT_CAMPAIGN_FILE, MissionRoom } from "./room.ts";
import { SightRoom } from "./sightRoom.ts";

openCampaignFile(process.env.NEON_CAMPAIGN_FILE ?? DEFAULT_CAMPAIGN_FILE);

const port = Number(process.env.PORT ?? 2567);
const host = process.env.HOST ?? "127.0.0.1";
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("Port ist ungültig");

interface HealthResponse {
  status(code: number): HealthResponse;
  type(value: string): HealthResponse;
  send(body: string): void;
}

const gameServer = new Server({
  greet: false,
  devMode: false,
  transport: new WebSocketTransport(),
  express: (app: { get(path: string, handler: (request: unknown, response: HealthResponse) => void): void }) => {
    app.get("/health", (_request, response) => {
      response.status(200).type("text/plain").send("ok");
    });
  },
});

gameServer.define("mission", MissionRoom);
gameServer.define("raster", RasterRoom);
gameServer.define("sicht", SightRoom).filterBy(["seed", "family"]);
await gameServer.listen(port, host);
