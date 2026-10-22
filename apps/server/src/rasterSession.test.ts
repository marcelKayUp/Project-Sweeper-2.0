import { describe, expect, it } from "vitest";
import { CREW_AP } from "@neon/sim";
import { createRasterSession } from "./rasterSession.ts";
import { readRasterWish } from "./rasterValidate.ts";

const EAST = [{ x: 2, y: 1 }];
const WALL_PATH = [
  { x: 2, y: 1 },
  { x: 2, y: 2 },
  { x: 2, y: 3 },
  { x: 3, y: 3 },
];

describe("Raster-Sitzung", () => {
  it("beginnt auf dem Startfeld mit der Karte", () => {
    const stand = createRasterSession(() => 0).snapshot();
    expect(stand).toMatchObject({
      commandId: "",
      revision: 0,
      rulesVersion: 1,
      width: 8,
      height: 8,
      x: 1,
      y: 1,
      ap: CREW_AP,
      round: 1,
      notice: "",
    });
    expect(stand.walls).toEqual([
      { x: 3, y: 3 },
      { x: 4, y: 3 },
      { x: 3, y: 4 },
      { x: 4, y: 4 },
    ]);
  });

  it("bucht einen Schritt und wiederholt dieselbe Befehlsnummer nicht", () => {
    const session = createRasterSession(() => 0);
    const moved = session.receive({ commandId: "east", kind: "move", path: EAST });
    expect(moved).toMatchObject({ x: 2, y: 1, ap: 7, revision: 1, notice: "", commandId: "east" });
    const again = session.receive({ commandId: "east", kind: "move", path: EAST });
    expect(again).toMatchObject({ x: 2, y: 1, ap: 7, revision: 1, notice: "" });
    expect(again.ack).toBeGreaterThan(moved.ack);
  });

  it("lässt eine Ablehnung die Aktionspunkte unverändert", () => {
    const session = createRasterSession(() => 0);
    const diagonal = session.receive({ commandId: "bad", kind: "move", path: [{ x: 2, y: 2 }] });
    expect(diagonal.notice).toBe("Nur orthogonale Nachbarfelder.");
    expect(diagonal).toMatchObject({ x: 1, y: 1, ap: CREW_AP, revision: 0 });
    const blocked = session.receive({ commandId: "wall", kind: "move", path: WALL_PATH });
    expect(blocked.notice).toBe("Feld ist blockiert.");
    expect(blocked.revision).toBe(0);
  });

  it("setzt zurück und spielt den alten Schritt nicht erneut", () => {
    const session = createRasterSession(() => 0);
    session.receive({ commandId: "east", kind: "move", path: EAST });
    const reset = session.receive({ commandId: "neu", kind: "reset" });
    expect(reset).toMatchObject({ x: 1, y: 1, ap: CREW_AP, revision: 0, notice: "" });
    const replay = session.receive({ commandId: "east", kind: "move", path: EAST });
    expect(replay).toMatchObject({ x: 1, y: 1, ap: CREW_AP, revision: 0, notice: "" });
  });

  it("weist den Schritt über den Rand ab", () => {
    let now = 0;
    const session = createRasterSession(() => now);
    now = 1000;
    session.receive({ commandId: "north", kind: "move", path: [{ x: 1, y: 0 }] });
    now = 2000;
    const outside = session.receive({ commandId: "off", kind: "move", path: [{ x: 1, y: -1 }] });
    expect(outside.notice).toBe("Ziel liegt außerhalb.");
    expect(outside).toMatchObject({ x: 1, y: 0, ap: 7, revision: 1 });
  });

  it("begrenzt die Befehlshäufigkeit und merkt sich die abgewiesene Nummer nicht", () => {
    let now = 0;
    const session = createRasterSession(() => now);
    for (let index = 0; index < 20; index += 1) {
      const stand = session.receive({ commandId: `r-${index}`, kind: "reset" });
      expect(stand.notice).toBe("");
    }
    const blocked = session.receive({ commandId: "later", kind: "move", path: EAST });
    expect(blocked.notice).toBe("Zu viele Befehle.");
    expect(blocked.x).toBe(1);
    now = 1001;
    const later = session.receive({ commandId: "later", kind: "move", path: EAST });
    expect(later).toMatchObject({ x: 2, y: 1, ap: 7, notice: "" });
  });

  it("zählt eine Wiederholung nicht als neuen Befehl", () => {
    const session = createRasterSession(() => 0);
    session.receive({ commandId: "same", kind: "move", path: EAST });
    for (let index = 0; index < 30; index += 1) {
      const again = session.receive({ commandId: "same", kind: "move", path: EAST });
      expect(again).toMatchObject({ x: 2, ap: 7, revision: 1 });
    }
    const next = session.receive({ commandId: "other", kind: "move", path: [{ x: 3, y: 1 }] });
    expect(next).toMatchObject({ x: 3, y: 1, ap: 6, notice: "" });
  });

  it("beendet die Runde einmal und spielt sie nach dem Zurücksetzen nicht erneut", () => {
    let now = 0;
    const session = createRasterSession(() => now);
    now = 1000;
    session.receive({ commandId: "east", kind: "move", path: EAST });
    now = 2000;
    const ended = session.receive({ commandId: "ende", kind: "end" });
    expect(ended).toMatchObject({ x: 2, y: 1, ap: CREW_AP, round: 2, revision: 2, notice: "" });
    now = 3000;
    const replay = session.receive({ commandId: "ende", kind: "end" });
    expect(replay).toMatchObject({ x: 2, y: 1, ap: CREW_AP, round: 2, revision: 2 });
    now = 4000;
    const next = session.receive({ commandId: "weiter", kind: "move", path: [{ x: 3, y: 1 }] });
    expect(next).toMatchObject({ x: 3, y: 1, ap: 7, round: 2, revision: 3 });
    now = 5000;
    session.receive({ commandId: "neu", kind: "reset" });
    now = 6000;
    const ignored = session.receive({ commandId: "ende", kind: "end" });
    expect(ignored).toMatchObject({ x: 1, y: 1, ap: CREW_AP, round: 1, revision: 0, notice: "" });
  });

  it("vergisst die älteste Befehlsnummer nach 128 weiteren Befehlen", () => {
    let now = 0;
    const session = createRasterSession(() => now);
    session.receive({ commandId: "alt", kind: "move", path: EAST });
    for (let index = 0; index < 128; index += 1) {
      now += 1001;
      const stand = session.receive({ commandId: `r-${index}`, kind: "reset" });
      expect(stand.x).toBe(1);
    }
    now += 1001;
    const again = session.receive({ commandId: "alt", kind: "move", path: EAST });
    expect(again).toMatchObject({ x: 2, y: 1, ap: 7, notice: "" });
  });
});

describe("Raster-Befehl", () => {
  it("nimmt einen Schritt und eine Rücksetzung an", () => {
    expect(readRasterWish({ protocol: 1, area: "raster", commandId: "m-1", kind: "reset" })).toEqual({
      ok: true,
      wish: { protocol: 1, area: "raster", commandId: "m-1", kind: "reset" },
    });
    expect(readRasterWish({ protocol: 1, area: "raster", commandId: "m-3", kind: "end" })).toEqual({
      ok: true,
      wish: { protocol: 1, area: "raster", commandId: "m-3", kind: "end" },
    });
    const parsed = readRasterWish({
      protocol: 1,
      area: "raster",
      commandId: "m-2",
      kind: "move",
      path: [{ x: 1, y: -1 }],
    });
    expect(parsed.ok).toBe(true);
  });

  it("weist fremde, leere und übergroße Nachrichten ab", () => {
    const broken = readRasterWish({ protocol: 1, area: "ghost-floor", commandId: "abc", kind: "reset" });
    expect(broken).toEqual({ ok: false, commandId: "abc", notice: "Befehl ist ungültig." });
    expect(readRasterWish({ protocol: 1, area: "raster", commandId: "abc", kind: "move", path: [] })).toMatchObject({
      ok: false,
      notice: "Befehl ist ungültig.",
    });
    const huge = readRasterWish({
      protocol: 1,
      area: "raster",
      commandId: "abc",
      kind: "reset",
      pad: "x".repeat(3000),
    });
    expect(huge).toEqual({ ok: false, commandId: "abc", notice: "Befehl ist zu groß." });
  });
});
