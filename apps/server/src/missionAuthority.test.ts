import { MISSION_ID, PROTOCOL_VERSION } from "@neon/sim";
import { describe, expect, it } from "vitest";
import {
  COMMANDS_PER_SECOND,
  createMissionAuthority,
  type AuthorityStand,
  type PhaseSeconds,
} from "./missionAuthority.ts";

const runners = {
  "s-kite": "kite",
  "s-voss": "voss",
  "s-nera": "nera",
  "s-sol": "sol",
} as const;

type SessionId = keyof typeof runners;

function wish(commandId: string, unitId: string, round: number, action: Record<string, unknown>, epoch = 1) {
  return {
    protocol: PROTOCOL_VERSION,
    missionId: MISSION_ID,
    commandId,
    round,
    phase: "crew" as const,
    epoch,
    unitId,
    playerId: "jemand",
    action,
  };
}

function unit(stand: AuthorityStand, id: string) {
  const found = stand.units.find((item) => item.id === id);
  if (!found) throw new Error(`Einheit ${id} fehlt.`);
  return found;
}

function openRoom(start = 1_000) {
  let now = start;
  const authority = createMissionAuthority({ now: () => now });
  const ids = ["s-kite", "s-voss", "s-nera", "s-sol"] as const;
  const lobby = (sessionId: string, payload: unknown) => {
    authority.submit([{ kind: "lobby", sessionId, payload }]);
  };
  const command = (sessionId: string, payload: unknown) => {
    authority.submit([{ kind: "command", sessionId, payload }]);
  };
  return {
    authority,
    ids,
    setNow(value: number) {
      now = value;
    },
    lobby,
    command,
    joinAll() {
      for (const id of ids) expect(authority.join(id, id).ok).toBe(true);
    },
    prepare(seconds?: PhaseSeconds) {
      this.joinAll();
      if (seconds !== undefined) lobby(ids[0], { kind: "zeit", seconds });
      for (const id of ids) {
        lobby(id, { kind: "preset", preset: "rifle" });
        lobby(id, { kind: "bereit", ready: true });
      }
    },
    start(seconds?: PhaseSeconds) {
      this.prepare(seconds);
      lobby(ids[0], { kind: "start" });
    },
  };
}

describe("Missionsraum", () => {
  it("vergibt vier Slots, einen Koordinator und weist einen fünften ab", () => {
    const room = openRoom();
    room.joinAll();
    const kite = room.authority.stand(room.ids[0]);
    const voss = room.authority.stand(room.ids[1]);
    expect(kite.coordinator).toBe(true);
    expect(kite.ownRunnerId).toBe("kite");
    expect(kite.epoch).toBe(1);
    expect(voss.coordinator).toBe(false);
    expect(voss.ownRunnerId).toBe("voss");
    expect(kite.slots.map((slot) => slot.connected)).toEqual([true, true, true, true]);
    expect(room.authority.join("s-extra", "Extra")).toEqual({ ok: false, rejection: "Der Raum ist voll." });

    room.authority.submit([{ kind: "leave", sessionId: room.ids[0] }]);
    expect(room.authority.stand(room.ids[1])).toMatchObject({ coordinator: true, ownRunnerId: "voss" });
    expect(room.authority.join("s-neu", "Neu").ok).toBe(true);
    expect(room.authority.stand("s-neu")).toMatchObject({ coordinator: true, ownRunnerId: "kite" });
    expect(room.authority.stand(room.ids[1]).ownRunnerId).toBe("voss");
  });

  it("lässt nur die Koordination starten und verwirft einen zweiten Start", () => {
    const room = openRoom();
    room.joinAll();
    room.lobby(room.ids[0], { kind: "start" });
    expect(room.authority.stand(room.ids[0]).notice).toBe("Alle müssen Ausrüstung und Bereit bestätigen.");
    expect(room.authority.stand(room.ids[0]).roomPhase).toBe("lobby");

    room.prepare();
    room.authority.submit([
      { kind: "lobby", sessionId: room.ids[1], payload: { kind: "start" } },
      { kind: "lobby", sessionId: room.ids[0], payload: { kind: "start" } },
      { kind: "lobby", sessionId: room.ids[0], payload: { kind: "start" } },
    ]);
    expect(room.authority.stand(room.ids[1]).notice).toBe("Nur die Koordination startet die Mission.");
    expect(room.authority.stand(room.ids[0])).toMatchObject({
      roomPhase: "mission",
      round: 1,
      notice: "Die Mission läuft bereits.",
      phaseSeconds: 90,
      deadlineAt: 91_000,
    });
    expect(room.authority.join("s-spaet", "Spät")).toEqual({ ok: false, rejection: "Die Mission läuft bereits." });
  });

  it("setzt die Frist auf 60 oder 120 und hebt Bereit bei einer neuen Zeit auf", () => {
    const room = openRoom();
    room.joinAll();
    room.lobby(room.ids[1], { kind: "preset", preset: "sidearm" });
    room.lobby(room.ids[1], { kind: "bereit", ready: true });
    room.lobby(room.ids[1], { kind: "zeit", seconds: 60 });
    expect(room.authority.stand(room.ids[1])).toMatchObject({
      notice: "Nur die Koordination setzt die Zeit.",
      phaseSeconds: 90,
      configRevision: 1,
    });
    expect(room.authority.stand(room.ids[1]).slots.find((slot) => slot.runnerId === "voss")?.ready).toBe(true);

    room.lobby(room.ids[0], { kind: "zeit", seconds: 90 });
    expect(room.authority.stand(room.ids[1]).slots.find((slot) => slot.runnerId === "voss")?.ready).toBe(true);
    room.lobby(room.ids[0], { kind: "zeit", seconds: 60 });
    const changed = room.authority.stand(room.ids[1]);
    expect(changed.phaseSeconds).toBe(60);
    expect(changed.configRevision).toBe(2);
    expect(changed.notice).toBe("Neue Zeit, Bereit ist aufgehoben.");
    expect(changed.slots.every((slot) => slot.ready === false)).toBe(true);
  });

  it("prüft Besitz, Epoche, doppelte Command-ID und veraltete Runde", () => {
    const room = openRoom();
    room.joinAll();
    const early = wish("frueh", "kite", 1, { kind: "move", x: 1, y: 8 });
    room.command(room.ids[0], early);
    expect(room.authority.stand(room.ids[0]).notice).toBe("Die Mission hat noch nicht begonnen.");
    room.start();
    room.command(room.ids[0], early);
    expect(room.authority.stand(room.ids[0])).toMatchObject({
      notice: "Die Mission hat noch nicht begonnen.",
      commandId: "frueh",
    });
    expect(unit(room.authority.stand(room.ids[0]), "kite")).toMatchObject({ x: 1, y: 9, ap: 8 });

    const step = wish("schritt", "kite", 1, { kind: "move", x: 1, y: 8 });
    room.command(room.ids[0], step);
    const moved = room.authority.stand(room.ids[0]);
    expect(unit(moved, "kite")).toMatchObject({ x: 1, y: 8, ap: 7 });
    expect(moved.notice).toBe("");
    room.command(room.ids[0], step);
    const replay = room.authority.stand(room.ids[0]);
    expect(unit(replay, "kite")).toMatchObject({ x: 1, y: 8, ap: 7 });
    expect(replay.revision).toBe(moved.revision);
    expect(replay.commandRevision).toBe(moved.commandRevision);

    room.command(room.ids[0], wish("fremd", "voss", 1, { kind: "move", x: 1, y: 7 }));
    expect(room.authority.stand(room.ids[0]).notice).toBe("Dieser Runner gehört dir nicht.");
    expect(unit(room.authority.stand(room.ids[0]), "voss")).toMatchObject({ x: 0, y: 8, ap: 8 });

    room.command(room.ids[0], wish("epoche", "kite", 1, { kind: "move", x: 1, y: 7 }, 2));
    expect(room.authority.stand(room.ids[0]).notice).toBe("Dieser Runner gehört dir nicht.");
    expect(unit(room.authority.stand(room.ids[0]), "kite").ap).toBe(7);

    room.command(room.ids[0], wish("alt", "kite", 2, { kind: "move", x: 1, y: 7 }));
    expect(room.authority.stand(room.ids[0]).notice).toBe("Die Phase ist vorbei.");
    expect(unit(room.authority.stand(room.ids[0]), "kite")).toMatchObject({ x: 1, y: 8, ap: 7 });
    expect(room.authority.inputs().map((input) => input.kind === "crew-command" && input.commandId)).toEqual(["schritt"]);
  });

  it("löst zwei Züge auf dasselbe Feld in der Eingabereihenfolge auf", () => {
    const first = openRoom();
    first.start();
    first.authority.submit([
      { kind: "command", sessionId: first.ids[1], payload: wish("voss", "voss", 1, { kind: "move", x: 1, y: 8 }) },
      { kind: "command", sessionId: first.ids[0], payload: wish("kite", "kite", 1, { kind: "move", x: 1, y: 8 }) },
    ]);
    const stand = first.authority.stand(first.ids[0]);
    expect(unit(stand, "voss")).toMatchObject({ x: 1, y: 8, ap: 7 });
    expect(unit(stand, "kite")).toMatchObject({ x: 1, y: 9, ap: 8 });
    expect(stand.notice).toBe("Feld ist blockiert.");

    const reverse = openRoom();
    reverse.start();
    reverse.authority.submit([
      { kind: "command", sessionId: reverse.ids[0], payload: wish("kite", "kite", 1, { kind: "move", x: 1, y: 8 }) },
      { kind: "command", sessionId: reverse.ids[1], payload: wish("voss", "voss", 1, { kind: "move", x: 1, y: 8 }) },
    ]);
    const other = reverse.authority.stand(reverse.ids[1]);
    expect(unit(other, "kite")).toMatchObject({ x: 1, y: 8, ap: 7 });
    expect(unit(other, "voss")).toMatchObject({ x: 0, y: 8, ap: 8 });
    expect(other.notice).toBe("Feld ist blockiert.");
  });

  it("beendet die Crewfrist als Barriere und lässt danach eingereihte Befehle nicht mehr wirken", () => {
    const room = openRoom();
    room.start(90);
    room.command(room.ids[0], wish("vorher", "kite", 1, { kind: "move", x: 1, y: 8 }));
    room.authority.submit([{ kind: "expire", now: 90_999 }]);
    expect(room.authority.stand(room.ids[0]).round).toBe(1);
    expect(unit(room.authority.stand(room.ids[0]), "kite").ap).toBe(7);

    room.authority.submit([
      { kind: "expire", now: 91_000 },
      { kind: "command", sessionId: room.ids[0], payload: wish("danach", "kite", 2, { kind: "move", x: 1, y: 7 }) },
    ]);
    const closed = room.authority.stand(room.ids[0]);
    expect(closed.round).toBe(2);
    expect(closed.notice).toBe("Die Phase ist vorbei.");
    expect(unit(closed, "kite")).toMatchObject({ x: 1, y: 8, ap: 8 });
    room.authority.submit([{ kind: "expire", now: 91_000 }]);
    expect(room.authority.stand(room.ids[0]).round).toBe(2);
    expect(room.authority.inputs()).toEqual([
      { kind: "crew-command", commandId: "vorher", runnerId: "kite", round: 1, epoch: 1, action: "move" },
      { kind: "close-team-phase", round: 1 },
    ]);

    const short = openRoom();
    short.start(60);
    expect(short.authority.deadlineAt()).toBe(61_000);
    short.authority.submit([{ kind: "expire", now: 60_999 }]);
    expect(short.authority.stand(short.ids[0]).round).toBe(1);
    short.authority.submit([{ kind: "expire", now: 61_000 }]);
    expect(short.authority.stand(short.ids[0]).round).toBe(2);

    const long = openRoom();
    long.start(120);
    long.authority.submit([{ kind: "expire", now: 91_000 }]);
    expect(long.authority.stand(long.ids[0]).round).toBe(1);
    long.authority.submit([{ kind: "expire", now: 121_000 }]);
    expect(long.authority.stand(long.ids[0]).round).toBe(2);
    expect(unit(long.authority.stand(long.ids[0]), "kite").ap).toBe(8);
  });

  it("schließt früher, wenn alle handlungsfähigen Runner bereit sind, und ignoriert die alte Frist", () => {
    const room = openRoom();
    room.start();
    room.command(room.ids[0], wish("schritt", "kite", 1, { kind: "move", x: 1, y: 8 }));
    room.setNow(5_000);
    for (const id of room.ids) {
      room.command(id, wish(`bereit-${runners[id]}`, runners[id], 1, { kind: "ready" }));
    }
    expect(room.authority.stand(room.ids[0]).round).toBe(2);
    expect(room.authority.deadlineAt()).toBe(95_000);
    expect(unit(room.authority.stand(room.ids[0]), "kite")).toMatchObject({ x: 1, y: 8, ap: 8 });
    room.authority.submit([{ kind: "expire", now: 91_000 }]);
    expect(room.authority.stand(room.ids[0]).round).toBe(2);
  });

  it("führt eine angenommene Aktion nach dem Austritt zu Ende und sperrt danach", () => {
    const room = openRoom();
    room.start();
    room.authority.submit([
      { kind: "command", sessionId: room.ids[0], payload: wish("vorher", "kite", 1, { kind: "move", x: 1, y: 8 }) },
      { kind: "leave", sessionId: room.ids[0] },
    ]);
    expect(unit(room.authority.stand(room.ids[1]), "kite")).toMatchObject({ x: 1, y: 8, ap: 7 });
    expect(room.authority.stand(room.ids[1]).slots[0]?.connected).toBe(false);

    const blocked = openRoom();
    blocked.start();
    blocked.authority.submit([
      { kind: "leave", sessionId: blocked.ids[0] },
      { kind: "command", sessionId: blocked.ids[0], payload: wish("danach", "kite", 1, { kind: "move", x: 1, y: 8 }) },
    ]);
    expect(blocked.authority.stand(blocked.ids[0]).notice).toBe("Die Verbindung ist unterbrochen.");
    expect(unit(blocked.authority.stand(blocked.ids[1]), "kite")).toMatchObject({ x: 1, y: 9, ap: 8 });
  });

  it("wendet Overwatch einmal an und zeigt einen unsichtbaren Gegner weder im Stand noch als Position", () => {
    const room = openRoom();
    room.start();
    const watch = wish("halten", "kite", 1, { kind: "overwatch", direction: "e" });
    room.command(room.ids[0], watch);
    expect(unit(room.authority.stand(room.ids[0]), "kite")).toMatchObject({ ap: 5, magazine: 5, overwatch: "e" });
    room.command(room.ids[0], watch);
    expect(unit(room.authority.stand(room.ids[0]), "kite")).toMatchObject({ ap: 5, magazine: 5 });

    room.command(room.ids[0], wish("schuss", "kite", 1, { kind: "shoot", targetId: "wache-haupt" }));
    const stand = room.authority.stand(room.ids[0]);
    expect(stand.notice).toBe("Kein Sichtkontakt.");
    expect(stand.units.every((item) => item.team === "crew")).toBe(true);
    expect(Object.hasOwn(stand, "contacts")).toBe(false);
    expect(unit(stand, "kite").ap).toBe(5);
  });

  it("begrenzt neue Befehle und lässt eine Wiederholung derselben ID nicht mitzählen", () => {
    const room = openRoom();
    room.start();
    for (let index = 0; index < COMMANDS_PER_SECOND; index += 1) {
      room.command(room.ids[0], wish(`raus-${index}`, "kite", 1, { kind: "move", x: 1, y: 8 }, 2));
    }
    room.command(room.ids[0], wish("raus-0", "kite", 1, { kind: "move", x: 1, y: 8 }, 2));
    expect(room.authority.stand(room.ids[0]).notice).toBe("Dieser Runner gehört dir nicht.");
    room.command(room.ids[0], wish("flut", "kite", 1, { kind: "move", x: 1, y: 8 }));
    expect(room.authority.stand(room.ids[0]).notice).toBe("Zu viele Befehle.");
    expect(unit(room.authority.stand(room.ids[0]), "kite").ap).toBe(8);

    room.setNow(2_001);
    room.command(room.ids[0], wish("flut", "kite", 1, { kind: "move", x: 1, y: 8 }));
    expect(unit(room.authority.stand(room.ids[0]), "kite")).toMatchObject({ x: 1, y: 8, ap: 7 });
  });
});
