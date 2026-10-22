import { SIZE_DIMENSIONS } from "@neon/generator";
import { RULES_VERSION } from "@neon/sim";
import { Client } from "@colyseus/sdk";
import { Server } from "@colyseus/core";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { SightStand } from "./sightSession.ts";
import { SightRoom } from "./sightRoom.ts";

interface WireRoom {
  roomId: string;
  reconnectionToken: string;
  reconnection: { enabled: boolean };
  leave(consented?: boolean): Promise<number>;
  send(type: string, payload?: unknown): void;
  onMessage(type: string, handler: (payload: unknown) => void): void;
}

function move(commandId: string, unitId: string, x: number, y: number) {
  return { protocol: 1, area: "sicht", commandId, kind: "move", unitId, path: [{ x, y }] };
}

function reset(commandId: string) {
  return { protocol: 1, area: "sicht", commandId, kind: "reset" };
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
    async take(timeoutMs = 3000): Promise<SightStand> {
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
      expect(value).toMatchObject({
        rulesVersion: RULES_VERSION,
        width: SIZE_DIMENSIONS.compact.width,
        height: SIZE_DIMENSIONS.compact.height,
        family: "office",
        seed: 42,
      });
      return value as SightStand;
    },
    async named(commandId: string): Promise<SightStand> {
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

describe("Sicht-Raum", () => {
  let gameServer: Server;
  let url = "";

  beforeAll(async () => {
    gameServer = new Server({
      greet: false,
      devMode: false,
      gracefullyShutdown: false,
      transport: new WebSocketTransport(),
    });
    gameServer.define("sicht", SightRoom).filterBy(["seed", "family"]);
    await gameServer.listen(0, "127.0.0.1");
    const address = gameServer.transport.server?.address();
    if (!address || typeof address === "string") throw new Error("Der Testdienst hat keinen Port.");
    url = `ws://127.0.0.1:${address.port}`;
  }, 15000);

  afterAll(async () => {
    await gameServer.gracefullyShutdown(false);
  });

  it("bestätigt einen Schritt auf der erzeugten Karte und behält ihn über die Verbindung", async () => {
    const client = new Client(url);
    const room = (await client.create("sicht", { seed: 42, family: "office" })) as unknown as WireRoom;
    let current = room;
    try {
      const stands = collect(room);
      room.send("hallo", {});
      const hello = await stands.take();
      const known = new Set(hello.known.map((cell) => `${cell.x},${cell.y}`));
      expect(hello.units.filter((unit) => unit.team === "crew")).toHaveLength(4);
      expect(JSON.stringify(hello)).not.toContain("patrol");
      expect(JSON.stringify(hello)).not.toContain("combatRng");
      for (const wall of hello.walls) expect(known.has(`${wall.x},${wall.y}`)).toBe(true);
      for (const cell of hello.visible) expect(known.has(`${cell.x},${cell.y}`)).toBe(true);
      for (const enemy of hello.units.filter((unit) => unit.team === "enemy")) {
        expect(hello.visible.some((cell) => cell.x === enemy.x && cell.y === enemy.y)).toBe(true);
      }

      const choice = crewStep(hello);
      expect(choice).not.toBeNull();
      if (!choice) return;
      room.send("befehl", move("schritt", choice.unitId, choice.cell.x, choice.cell.y));
      const moved = await stands.named("schritt");
      expect(moved.notice).toBe("");
      expect(moved.revision).toBe(1);
      expect(moved.units.find((unit) => unit.id === choice.unitId)).toMatchObject({
        x: choice.cell.x,
        y: choice.cell.y,
        ap: 7,
      });

      room.send("befehl", { commandId: "nope" });
      const invalid = await stands.named("nope");
      expect(invalid.notice).toBe("Befehl ist ungültig.");
      expect(invalid.units.find((unit) => unit.id === choice.unitId)).toMatchObject({
        x: choice.cell.x,
        y: choice.cell.y,
        ap: 7,
      });

      const other = new Client(url);
      await expect(other.joinById(room.roomId)).rejects.toThrow();

      room.reconnection.enabled = false;
      const token = room.reconnectionToken;
      await room.leave(false);
      current = await reopen(client, token);
      const restored = collect(current);
      current.send("hallo", {});
      const back = await restored.take();
      expect(back.revision).toBe(1);
      expect(back.units.find((unit) => unit.id === choice.unitId)).toMatchObject({
        x: choice.cell.x,
        y: choice.cell.y,
        ap: 7,
      });
      current.send("befehl", reset("neu"));
      const fresh = await restored.named("neu");
      expect(fresh.revision).toBe(0);
      expect(fresh.round).toBe(1);
      expect(fresh.units.find((unit) => unit.id === choice.unitId)?.ap).toBe(8);
    } finally {
      await current.leave();
    }
  }, 30000);

  it("lehnt eine unbekannte Gebäudefamilie ab", async () => {
    const client = new Client(url);
    await expect(client.create("sicht", { seed: 1, family: "lab" })).rejects.toThrow();
  });
});

function crewStep(stand: SightStand): { unitId: string; cell: { x: number; y: number } } | null {
  const known = new Set(stand.known.map((cell) => `${cell.x},${cell.y}`));
  const blocked = new Set(stand.walls.map((cell) => `${cell.x},${cell.y}`));
  if (stand.door && !stand.doorOpen) blocked.add(`${stand.door.x},${stand.door.y}`);
  if (stand.terminal) blocked.add(`${stand.terminal.x},${stand.terminal.y}`);
  for (const unit of stand.units) {
    if (unit.status !== "extracted") blocked.add(`${unit.x},${unit.y}`);
  }
  const steps = [
    { x: 1, y: 0 },
    { x: -1, y: 0 },
    { x: 0, y: 1 },
    { x: 0, y: -1 },
  ];
  for (const unit of stand.units) {
    if (unit.team !== "crew" || unit.status !== "active") continue;
    for (const step of steps) {
      const cell = { x: unit.x + step.x, y: unit.y + step.y };
      const id = `${cell.x},${cell.y}`;
      if (!known.has(id) || blocked.has(id)) continue;
      return { unitId: unit.id, cell };
    }
  }
  return null;
}
