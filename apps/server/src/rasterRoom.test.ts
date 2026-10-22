import { Client } from "@colyseus/sdk";
import { Server } from "@colyseus/core";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { RasterRoom } from "./rasterRoom.ts";

interface WireStand {
  ack: number;
  commandId: string;
  revision: number;
  rulesVersion: number;
  width: number;
  height: number;
  walls: { x: number; y: number }[];
  x: number;
  y: number;
  ap: number;
  notice: string;
}

interface WireRoom {
  roomId: string;
  reconnectionToken: string;
  reconnection: { enabled: boolean };
  leave(consented?: boolean): Promise<number>;
  send(type: string, payload?: unknown): void;
  onMessage(type: string, handler: (payload: unknown) => void): void;
}

function move(commandId: string, x: number, y: number) {
  return { protocol: 1, area: "raster", commandId, kind: "move", path: [{ x, y }] };
}

function reset(commandId: string) {
  return { protocol: 1, area: "raster", commandId, kind: "reset" };
}

function endRound(commandId: string) {
  return { protocol: 1, area: "raster", commandId, kind: "end" };
}

function collect(room: WireRoom) {
  const queue: unknown[] = [];
  const waiters: Array<(value: unknown) => void> = [];
  room.onMessage("stand", (payload) => {
    const waiter = waiters.shift();
    if (waiter) waiter(payload);
    else queue.push(payload);
  });
  return {
    async take(timeoutMs = 3000): Promise<WireStand> {
      const queued = queue.shift();
      const value =
        queued !== undefined
          ? queued
          : await new Promise<unknown>((resolve, reject) => {
              const timer = setTimeout(() => reject(new Error("Kein Stand vom Server.")), timeoutMs);
              waiters.push((payload) => {
                clearTimeout(timer);
                resolve(payload);
              });
            });
      expect(value).toMatchObject({ rulesVersion: 1, width: 8, height: 8 });
      return value as WireStand;
    },
    async named(commandId: string): Promise<WireStand> {
      for (let attempt = 0; attempt < 6; attempt += 1) {
        const stand = await this.take();
        if (stand.commandId === commandId) return stand;
      }
      throw new Error(`Stand ${commandId} fehlt.`);
    },
  };
}

async function reopen(client: Client, token: string): Promise<WireRoom> {
  let error: unknown;
  for (let attempt = 0; attempt < 20; attempt += 1) {
    try {
      return (await client.reconnect(token)) as unknown as WireRoom;
    } catch (caught) {
      error = caught;
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
  }
  throw error;
}

describe("Raster-Raum", () => {
  let gameServer: Server;
  let url = "";

  beforeAll(async () => {
    gameServer = new Server({
      greet: false,
      devMode: false,
      gracefullyShutdown: false,
      transport: new WebSocketTransport(),
    });
    gameServer.define("raster", RasterRoom);
    await gameServer.listen(0, "127.0.0.1");
    const address = gameServer.transport.server?.address();
    if (!address || typeof address === "string") throw new Error("Der Testdienst hat keinen Port.");
    url = `ws://127.0.0.1:${address.port}`;
  }, 15000);

  afterAll(async () => {
    await gameServer.gracefullyShutdown(false);
  });

  it("bestätigt Schritte der Reihe nach und setzt auf Befehl zurück", async () => {
    const client = new Client(url);
    const room = (await client.create("raster")) as unknown as WireRoom;
    try {
      const stands = collect(room);
      room.send("hallo", {});
      const hello = await stands.take();
      expect(hello).toMatchObject({ x: 1, y: 1, ap: 8, round: 1, revision: 0, notice: "" });
      expect(hello.walls).toEqual([
        { x: 3, y: 3 },
        { x: 4, y: 3 },
        { x: 3, y: 4 },
        { x: 4, y: 4 },
      ]);

      room.send("befehl", move("east", 2, 1));
      room.send("befehl", move("south", 2, 2));
      const east = await stands.named("east");
      const south = await stands.named("south");
      expect(east).toMatchObject({ x: 2, y: 1, ap: 7, revision: 1, notice: "" });
      expect(south).toMatchObject({ x: 2, y: 2, ap: 6, revision: 2, notice: "" });

      room.send("befehl", move("east", 2, 1));
      const replay = await stands.named("east");
      expect(replay).toMatchObject({ x: 2, y: 2, ap: 6, revision: 2, notice: "" });

      room.send("befehl", move("diagonal", 3, 3));
      const rejected = await stands.named("diagonal");
      expect(rejected.notice).toBe("Nur orthogonale Nachbarfelder.");
      expect(rejected).toMatchObject({ x: 2, y: 2, ap: 6, revision: 2 });

      room.send("befehl", { commandId: "nope" });
      const invalid = await stands.named("nope");
      expect(invalid.notice).toBe("Befehl ist ungültig.");
      expect(invalid).toMatchObject({ x: 2, y: 2, ap: 6 });

      room.send("befehl", reset("neu"));
      const fresh = await stands.named("neu");
      expect(fresh).toMatchObject({ x: 1, y: 1, ap: 8, revision: 0, notice: "" });

      room.send("befehl", move("south", 2, 2));
      const ignored = await stands.named("south");
      expect(ignored).toMatchObject({ x: 1, y: 1, ap: 8, revision: 0 });
    } finally {
      await room.leave();
    }
  });

  it("behält Feld und Aktionspunkte über eine unterbrochene Verbindung", async () => {
    const client = new Client(url);
    const room = (await client.create("raster")) as unknown as WireRoom;
    const stands = collect(room);
    room.send("hallo", {});
    await stands.take();
    room.send("befehl", move("east", 2, 1));
    room.send("befehl", move("north", 2, 0));
    const north = await stands.named("north");
    expect(north).toMatchObject({ x: 2, y: 0, ap: 6, revision: 2 });

    room.reconnection.enabled = false;
    const token = room.reconnectionToken;
    await room.leave(false);

    const again = await reopen(client, token);
    try {
      const restored = collect(again);
      again.send("hallo", {});
      const stand = await restored.take();
      expect(stand).toMatchObject({ x: 2, y: 0, ap: 6, revision: 2, notice: "" });
      again.send("befehl", move("north", 2, 0));
      const replay = await restored.named("north");
      expect(replay).toMatchObject({ x: 2, y: 0, ap: 6, revision: 2, notice: "" });
    } finally {
      await again.leave();
    }
  });

  it("füllt die Aktionspunkte beim Rundenende einmal auf", async () => {
    const client = new Client(url);
    const room = (await client.create("raster")) as unknown as WireRoom;
    try {
      const stands = collect(room);
      room.send("hallo", {});
      await stands.take();
      room.send("befehl", move("east", 2, 1));
      await stands.named("east");
      room.send("befehl", endRound("ende"));
      const ended = await stands.named("ende");
      expect(ended).toMatchObject({ x: 2, y: 1, ap: 8, round: 2, revision: 2, notice: "" });
      room.send("befehl", endRound("ende"));
      const replay = await stands.named("ende");
      expect(replay).toMatchObject({ x: 2, y: 1, ap: 8, round: 2, revision: 2 });
      room.send("befehl", move("weiter", 3, 1));
      const next = await stands.named("weiter");
      expect(next).toMatchObject({ x: 3, y: 1, ap: 7, round: 2, revision: 3 });
    } finally {
      await room.leave();
    }
  });

  it("gibt denselben Sitz nicht an einen zweiten Client", async () => {
    const client = new Client(url);
    const room = (await client.create("raster")) as unknown as WireRoom;
    const other = new Client(url);
    try {
      await expect(other.joinById(room.roomId)).rejects.toThrow();
    } finally {
      await room.leave();
    }
  });
});
