import { Server } from "@colyseus/core";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { openCampaignFile } from "./campaignStore.ts";
import { answerRunner, RUNNER_LOGIN_REJECTED } from "./runnerAccount.ts";
import { DEFAULT_RUNNERS_FILE, openRunnerFile, runnerStore } from "./runnerStore.ts";
import { RasterRoom } from "./rasterRoom.ts";
import { DEFAULT_CAMPAIGN_FILE, MissionRoom } from "./room.ts";
import { SightRoom } from "./sightRoom.ts";

openCampaignFile(process.env.NEON_CAMPAIGN_FILE ?? DEFAULT_CAMPAIGN_FILE);
openRunnerFile(process.env.NEON_RUNNERS_FILE ?? DEFAULT_RUNNERS_FILE);

const port = Number(process.env.PORT ?? 2567);
const host = process.env.HOST ?? "127.0.0.1";
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("Port ist ungültig");

interface HealthResponse {
  status(code: number): HealthResponse;
  type(value: string): HealthResponse;
  setHeader(name: string, value: string): void;
  send(body: string): void;
}

interface PostedRequest {
  on(event: "data", listener: (chunk: Buffer | string) => void): void;
  on(event: "end", listener: () => void): void;
  on(event: "error", listener: (error: unknown) => void): void;
}

interface HttpApp {
  get(path: string, handler: (request: unknown, response: HealthResponse) => void): void;
  options(path: string, handler: (request: unknown, response: HealthResponse) => void): void;
  post(path: string, handler: (request: PostedRequest, response: HealthResponse) => void): void;
}

const gameServer = new Server({
  greet: false,
  devMode: false,
  transport: new WebSocketTransport(),
  express: (app: HttpApp) => {
    app.get("/health", (_request, response) => {
      response.status(200).type("text/plain").send("ok");
    });
    app.options("/runner", (_request, response) => {
      allowRunner(response);
      response.status(204).send("");
    });
    app.post("/runner", (request, response) => {
      allowRunner(response);
      void readJson(request)
        .then((raw) => {
          const result = answerRunner(runnerStore(), raw);
          response.status(result.status).type("application/json").send(JSON.stringify(result.body));
        })
        .catch(() => {
          response.status(400).type("application/json").send(JSON.stringify({ ok: false, rejection: RUNNER_LOGIN_REJECTED }));
        });
    });
  },
});

gameServer.define("mission", MissionRoom);
gameServer.define("raster", RasterRoom);
gameServer.define("sicht", SightRoom).filterBy(["seed", "family"]);
await gameServer.listen(port, host);

function allowRunner(response: HealthResponse): void {
  response.setHeader("access-control-allow-origin", "*");
  response.setHeader("access-control-allow-methods", "POST, OPTIONS");
  response.setHeader("access-control-allow-headers", "content-type");
  response.setHeader("cache-control", "no-store");
}

function readJson(request: PostedRequest): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    let failed = false;
    request.on("data", (chunk) => {
      if (failed) return;
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      size += buffer.length;
      if (size > 4096) {
        failed = true;
        reject(new Error("zu groß"));
        return;
      }
      chunks.push(buffer);
    });
    request.on("end", () => {
      if (failed) return;
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
      } catch {
        reject(new Error("json"));
      }
    });
    request.on("error", () => {
      if (!failed) reject(new Error("io"));
    });
  });
}
