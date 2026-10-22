import { Client } from "@colyseus/sdk";
import { Server } from "@colyseus/core";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { MISSION_ID, PROTOCOL_VERSION } from "@neon/sim";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { AuthorityStand } from "./missionAuthority.ts";
import { MissionRoom } from "./room.ts";

interface WireRoom {
  roomId: string;
  leave(consented?: boolean): Promise<number>;
  send(type: string, payload?: unknown): void;
  onMessage(type: string, handler: (payload: unknown) => void): void;
}

function wish(commandId: string, unitId: string, round: number, action: Record<string, unknown>, epoch = 1) {
  return {
    protocol: PROTOCOL_VERSION,
    missionId: MISSION_ID,
    commandId,
    round,
    phase: "crew",
    epoch,
    unitId,
    playerId: "jemand",
    action,
  };
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
    async take(timeoutMs = 3000): Promise<AuthorityStand> {
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
      expect(value).toMatchObject({ roomPhase: expect.any(String), slots: expect.any(Array) });
      return value as AuthorityStand;
    },
  };
}

async function until(
  stands: ReturnType<typeof collect>,
  predicate: (stand: AuthorityStand) => boolean,
  label: string,
): Promise<AuthorityStand> {
  let last: AuthorityStand | undefined;
  const seen: string[] = [];
  for (let attempt = 0; attempt < 40; attempt += 1) {
    let stand: AuthorityStand;
    try {
      stand = await stands.take();
    } catch (error) {
      throw new Error(`${label}: ${seen.join(" | ") || "keine Nachricht"} (${error instanceof Error ? error.message : ""})`);
    }
    last = stand;
    seen.push(`${stand.roomPhase}/${stand.ownRunnerId}/${stand.notice}/${stand.phaseSeconds}/${stand.ack}`);
    if (predicate(stand)) return stand;
  }
  throw new Error(`Passender Stand fehlt (${label}): ${seen.join(" | ")} | zuletzt ${last?.notice ?? ""}`);
}

describe("Ghost-Floor-Raum", () => {
  let gameServer: Server;
  let url = "";

  beforeAll(async () => {
    gameServer = new Server({
      greet: false,
      devMode: false,
      gracefullyShutdown: false,
      transport: new WebSocketTransport(),
    });
    gameServer.define("mission", MissionRoom);
    await gameServer.listen(0, "127.0.0.1");
    const address = gameServer.transport.server?.address();
    if (!address || typeof address === "string") throw new Error("Der Testdienst hat keinen Port.");
    url = `ws://127.0.0.1:${address.port}`;
  }, 15000);

  afterAll(async () => {
    await gameServer.gracefullyShutdown(false);
  });

  it("weist einen vollen Raum und eine unbekannte Einladung ab", async () => {
    const client = new Client(url);
    const first = (await client.create("mission", { name: "Kite" })) as unknown as WireRoom;
    const joined = [first];
    try {
      for (const name of ["Voss", "Nera", "Sol"]) {
        joined.push((await client.joinById(first.roomId, { name })) as unknown as WireRoom);
      }
      await expect(client.joinById(first.roomId, { name: "Extra" })).rejects.toThrow();
      await expect(client.joinById("kein-raum", { name: "Extra" })).rejects.toThrow();
      const stands = collect(first);
      first.send("hallo", {});
      const hello = await until(stands, (stand) => stand.ownRunnerId === "kite" && stand.slots.every((slot) => slot.connected), "vier");
      expect(hello.coordinator).toBe(true);
      expect(hello.phaseSeconds).toBe(90);
      expect(hello.slots.map((slot) => slot.runnerId)).toEqual(["kite", "voss", "nera", "sol"]);
    } finally {
      await Promise.all(joined.map((room) => room.leave()));
    }
  }, 20000);

  it("hält konkurrierende Starts, fremde Runner, doppelte Befehle und eine veraltete Runde auseinander", async () => {
    const client = new Client(url);
    const creator = (await client.create("mission", { name: "Kite" })) as unknown as WireRoom;
    const rooms = [creator];
    const stands = [collect(creator)];
    try {
      for (const name of ["Voss", "Nera", "Sol"]) {
        const room = (await client.joinById(creator.roomId, { name })) as unknown as WireRoom;
        rooms.push(room);
        stands.push(collect(room));
      }
      for (const room of rooms) room.send("lobby", { kind: "preset", preset: "rifle" });
      for (const room of rooms) room.send("lobby", { kind: "bereit", ready: true });
      rooms[1]?.send("lobby", { kind: "start" });
      const denied = await until(stands[1]!, (stand) => stand.notice === "Nur die Koordination startet die Mission.", "start-abgewiesen");
      expect(denied.roomPhase).toBe("lobby");
      expect(denied.ownRunnerId).toBe("voss");

      creator.send("lobby", { kind: "zeit", seconds: 60 });
      const timed = await until(stands[0]!, (stand) => stand.phaseSeconds === 60 && stand.configRevision === 2, "zeit");
      expect(timed.slots.every((slot) => slot.ready === false)).toBe(true);
      for (const room of rooms) room.send("lobby", { kind: "bereit", ready: true });
      await until(stands[0]!, (stand) => stand.slots.every((slot) => slot.ready), "alle-bereit");
      creator.send("lobby", { kind: "start" });
      const started = await until(stands[0]!, (stand) => stand.roomPhase === "mission", "gestartet");
      const remaining = started.deadlineAt - Date.now();
      expect(remaining).toBeGreaterThan(50_000);
      expect(remaining).toBeLessThanOrEqual(60_000);
      expect(started.units.every((unit) => unit.team === "crew")).toBe(true);
      expect(started.lastEventId).toBe(0);
      expect(JSON.stringify(started).includes("wache-haupt")).toBe(false);

      creator.send("lobby", { kind: "start" });
      const second = await until(stands[0]!, (stand) => stand.notice === "Die Mission läuft bereits.", "zweiter-start");
      expect(second.round).toBe(1);
      expect(second.revision).toBe(started.revision);

      const batches: unknown[] = [];
      rooms[1]?.onMessage("ereignisse", (payload) => {
        batches.push(payload);
      });
      const step = wish("schritt", "voss", 1, { kind: "move", x: 1, y: 8 });
      rooms[1]?.send("befehl", step);
      const moved = await until(stands[1]!, (stand) => stand.commandId === "schritt" && stand.notice === "", "schritt");
      expect(moved.units.find((unit) => unit.id === "voss")).toMatchObject({ x: 1, y: 8, ap: 7 });
      rooms[1]?.send("befehl", step);
      const replay = await until(stands[1]!, (stand) => stand.commandId === "schritt" && stand.ack > moved.ack, "doppelt");
      expect(replay.units.find((unit) => unit.id === "voss")).toMatchObject({ x: 1, y: 8, ap: 7 });
      expect(replay.revision).toBe(moved.revision);
      expect(replay.lastEventId).toBe(moved.lastEventId);
      expect(JSON.stringify(batches).includes("wache-haupt")).toBe(false);
      expect(batches.length).toBeGreaterThan(0);

      creator.send("befehl", wish("fremd", "voss", 1, { kind: "move", x: 1, y: 7 }));
      const foreign = await until(stands[0]!, (stand) => stand.commandId === "fremd", "fremd");
      expect(foreign.notice).toBe("Dieser Runner gehört dir nicht.");
      expect(foreign.units.find((unit) => unit.id === "voss")).toMatchObject({ x: 1, y: 8, ap: 7 });

      creator.send("befehl", wish("alt", "kite", 2, { kind: "move", x: 1, y: 8 }));
      const stale = await until(stands[0]!, (stand) => stand.commandId === "alt", "alt");
      expect(stale.notice).toBe("Die Phase ist vorbei.");
      expect(stale.units.find((unit) => unit.id === "kite")).toMatchObject({ x: 1, y: 9, ap: 8 });

      creator.send("befehl", wish("besetzt", "kite", 1, { kind: "move", x: 1, y: 8 }));
      const blocked = await until(stands[0]!, (stand) => stand.commandId === "besetzt", "besetzt");
      expect(blocked.notice).toBe("Feld ist blockiert.");
      expect(blocked.units.find((unit) => unit.id === "kite")).toMatchObject({ x: 1, y: 9, ap: 8 });

      await rooms[3]?.leave();
      rooms.pop();
      await expect(client.joinById(creator.roomId, { name: "Neu" })).rejects.toThrow();
    } finally {
      await Promise.all(rooms.map((room) => room.leave()));
    }
  }, 20000);
});
