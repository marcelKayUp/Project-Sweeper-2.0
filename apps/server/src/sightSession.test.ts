import { describe, expect, it } from "vitest";
import { generateBuilding } from "@neon/generator";
import type { Cell, MissionSpec } from "@neon/sim";
import { createSightSession, type SightMeta, type SightStand, type SightWish } from "./sightSession.ts";
import { readSightOptions, readSightWish } from "./sightValidate.ts";

const META: SightMeta = { family: "office", method: "bsp", rooms: 1 };

describe("Sicht-Sitzung", () => {
  it("zeigt nur bekanntes Gelände und verbirgt den fernen Gegner", () => {
    const spec = lane();
    const session = createSightSession(spec, 4, META, () => 0);
    const start = session.snapshot();
    expect(start.units.map((unit) => unit.id)).toEqual(["kite"]);
    expect(start.cover.map((cover) => cover.id)).toEqual(["sichtbar"]);
    expect(start.walls).toContainEqual({ x: 1, y: 0 });
    expect(start.walls).not.toContainEqual({ x: 15, y: 0 });
    expect(start.known).not.toContainEqual({ x: 14, y: 1 });
    expect(JSON.stringify(start)).not.toContain("Nahe");
    expect(JSON.stringify(start)).not.toContain("combatRng");

    const dark = session.receive({ commandId: "dunkel", kind: "move", unitId: "kite", path: [{ x: 14, y: 1 }] });
    expect(dark.notice).toBe("Feld ist nicht erkundet.");
    expect(dark.revision).toBe(0);
    expect(dark.units.map((unit) => unit.id)).toEqual(["kite"]);

    const rolled = session.receive({
      commandId: "halb",
      kind: "move",
      unitId: "kite",
      path: [
        { x: 2, y: 1 },
        { x: 2, y: 1 },
      ],
    });
    expect(rolled.notice).toBe("Nur ein orthogonales Nachbarfeld.");
    expect(rolled.revision).toBe(0);
    expect(rolled.known).toEqual(start.known);
    expect(rolled.units.map((unit) => unit.id)).toEqual(["kite"]);

    const moved = session.receive({
      commandId: "nah",
      kind: "move",
      unitId: "kite",
      path: [
        { x: 2, y: 1 },
        { x: 3, y: 1 },
      ],
    });
    expect(moved.notice).toBe("");
    expect(moved.revision).toBe(1);
    expect(moved.units.map((unit) => unit.id)).toEqual(["kite", "nahe"]);
    expect(moved.units.find((unit) => unit.id === "kite")).toMatchObject({ x: 3, y: 1, ap: 6 });
    expect(moved.known).toContainEqual({ x: 12, y: 1 });

    const again = session.receive({ commandId: "nah", kind: "move", unitId: "kite", path: [{ x: 4, y: 1 }] });
    expect(again.units.find((unit) => unit.id === "kite")).toMatchObject({ x: 3, y: 1, ap: 6 });

    const back = session.receive({
      commandId: "zurueck",
      kind: "move",
      unitId: "kite",
      path: [
        { x: 2, y: 1 },
        { x: 1, y: 1 },
      ],
    });
    expect(back.units.map((unit) => unit.id)).toEqual(["kite"]);
    expect(back.known).toContainEqual({ x: 12, y: 1 });
    expect(JSON.stringify(back)).not.toContain("Nahe");

    const hiddenShot = session.receive({ commandId: "feuer", kind: "shoot", unitId: "kite", targetId: "nahe" });
    expect(hiddenShot.notice).toBe("Kein gültiges Ziel.");
    expect(hiddenShot.units.find((unit) => unit.id === "kite")?.ap).toBe(4);
  });

  it("beendet die Runde, setzt zurück und drosselt Befehle", () => {
    let clock = 0;
    const session = createSightSession(lane(), 4, META, () => clock++);
    const ended = session.receive({ commandId: "ende", kind: "end" });
    expect(ended.round).toBe(2);
    expect(ended.phase).toBe("crew");
    expect(ended.notice).toBe("Gegnerzug. Runde 2.");
    expect(ended.notice).not.toMatch(/\d+,\s*\d+/);
    expect(ended.units.find((unit) => unit.id === "kite")).toMatchObject({ x: 1, y: 1, ap: 8 });
    expect(ended.units.some((unit) => unit.id === "nahe")).toBe(false);

    const fresh = session.receive({ commandId: "neu", kind: "reset" });
    expect(fresh.revision).toBe(0);
    expect(fresh.round).toBe(1);
    expect(fresh.units.map((unit) => unit.id)).toEqual(["kite"]);

    const limited = createSightSession(lane(), 4, META, () => 5_000);
    for (let index = 0; index < 20; index += 1) {
      limited.receive({ commandId: `wand-${index}`, kind: "move", unitId: "kite", path: [{ x: 1, y: 0 }] });
    }
    const blocked = limited.receive({ commandId: "zu-viel", kind: "move", unitId: "kite", path: [{ x: 2, y: 1 }] });
    expect(blocked.notice).toBe("Zu viele Befehle.");
    expect(blocked.units.find((unit) => unit.id === "kite")).toMatchObject({ x: 1, y: 1, ap: 8 });
  });

  it("öffnet eine sichtbare Tür und lässt den Gegner dahinter erscheinen", () => {
    const session = createSightSession(doorLane(), 4, META, () => 0);
    const start = session.snapshot();
    expect(start.units.map((unit) => unit.id)).toEqual(["kite"]);
    expect(start.door).toEqual({ id: "shortcut", x: 2, y: 1 });
    expect(start.doorOpen).toBe(false);

    const opened = session.receive({ commandId: "auf", kind: "interact", unitId: "kite", targetId: "shortcut" });
    expect(opened.notice).toBe("Tür ist offen.");
    expect(opened.doorOpen).toBe(true);
    expect(opened.units.map((unit) => unit.id)).toEqual(["kite", "nahe"]);
    expect(opened.units.find((unit) => unit.id === "kite")?.ap).toBe(4);

    const shot = session.receive({ commandId: "schuss", kind: "shoot", unitId: "kite", targetId: "nahe" });
    expect(shot.notice === "Kite trifft Nahe, 2 Schaden." || shot.notice === "Schuss auf Nahe verfehlt.").toBe(true);
    expect(shot.units.find((unit) => unit.id === "kite")?.ap).toBe(1);
  });

  it("behält den gelaufenen Teil, wenn Overwatch den restlichen Weg abbricht", () => {
    let tick = 0;
    const session = createSightSession(alley(), 3, META, () => (tick += 1000));
    session.receive({ commandId: "runde-1", kind: "end" });
    const armed = session.receive({ commandId: "runde-2", kind: "end" });
    expect(armed.units.find((unit) => unit.id === "kite")).toMatchObject({ hp: 2, x: 1, y: 1 });
    expect(armed.units.find((unit) => unit.id === "wache")?.overwatch).not.toBeNull();
    const stopped = session.receive({
      commandId: "lauf",
      kind: "move",
      unitId: "kite",
      path: [
        { x: 2, y: 1 },
        { x: 3, y: 1 },
      ],
    });
    expect(stopped.units.find((unit) => unit.id === "kite")).toMatchObject({ x: 2, y: 1, status: "down", hp: 0 });
    expect(stopped.notice).toContain("Overwatch.");
    const guard = stopped.units.find((unit) => unit.id === "wache");
    if (guard) expect(guard.overwatch).toBeNull();
  });

  it("erzeugt eine kompakte Karte, ohne unsichtbare Gegner oder fremde Wände zu senden", async () => {
    const result = await generateBuilding({ seed: 42, family: "office", size: "compact", instanceId: "sicht" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const mission = result.package.mission;
    const session = createSightSession(mission, 42, {
      family: "office",
      method: result.package.building.layout.method,
      rooms: result.package.building.rooms.length,
    });
    const stand = session.snapshot();
    const known = new Set(stand.known.map((cell) => `${cell.x},${cell.y}`));
    const missionWalls = new Set(mission.walls.map((cell) => `${cell.x},${cell.y}`));
    expect(stand).toMatchObject({
      width: mission.width,
      height: mission.height,
      seed: 42,
      family: "office",
      method: result.package.building.layout.method,
    });
    expect(["bsp", "graph", "circulation"]).toContain(stand.method);
    expect(stand.rooms).toBeGreaterThan(0);
    expect(stand.walls.length).toBeGreaterThan(0);
    expect(stand.walls.length).toBeLessThan(mission.walls.length);
    expect(stand.units.filter((unit) => unit.team === "crew")).toHaveLength(4);
    for (const wall of stand.walls) {
      expect(known.has(`${wall.x},${wall.y}`)).toBe(true);
      expect(missionWalls.has(`${wall.x},${wall.y}`)).toBe(true);
    }
    for (const spawn of mission.spawns.filter((entry) => entry.team === "enemy")) {
      const listed = stand.units.some((unit) => unit.id === spawn.id);
      const seen = stand.visible.some((cell) => cell.x === spawn.x && cell.y === spawn.y);
      expect(listed).toBe(seen);
      if (!listed) {
        expect(known.has(`${spawn.x},${spawn.y}`)).toBe(false);
        expect(JSON.stringify(stand)).not.toContain(spawn.name);
      }
    }
  });

  it("prüft Optionen und Befehle, bevor sie die Sitzung erreichen", () => {
    expect(readSightOptions(undefined)).toEqual({ seed: 42, family: "office" });
    expect(readSightOptions({ seed: 7, family: "factory" })).toEqual({ seed: 7, family: "factory" });
    expect(() => readSightOptions({ seed: -1, family: "office" })).toThrow(/Seed/);
    expect(() => readSightOptions({ seed: 1, family: "lab" })).toThrow(/Gebäudefamilie/);
    expect(
      readSightWish({
        protocol: 1,
        area: "sicht",
        commandId: "a",
        kind: "move",
        unitId: "kite",
        path: [{ x: 2, y: 1 }],
      }).ok,
    ).toBe(true);
    const foreign = readSightWish({ protocol: 1, area: "raster", commandId: "a", kind: "reset" });
    expect(foreign.ok).toBe(false);
    if (!foreign.ok) expect(foreign.notice).toBe("Befehl ist ungültig.");
  });

  it("spielt das Büro bis zum Sieg und benennt Tür und Gegnerzug", async () => {
    const result = await generateBuilding({ seed: 42, family: "office", size: "compact", instanceId: "sicht" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    let tick = 0;
    const session = createSightSession(result.package.mission, 42, {
      family: "office",
      method: result.package.building.layout.method,
      rooms: result.package.building.rooms.length,
    }, () => (tick += 1000));
    let stand = session.snapshot();
    const notices: string[] = [];
    for (let step = 0; step < 200 && stand.outcome === ""; step += 1) {
      const wish = nextWish(stand, result.package.mission);
      expect(wish).not.toBeNull();
      if (!wish) break;
      stand = session.receive({ ...wish, commandId: `sieg-${step}` });
      if (stand.notice) notices.push(stand.notice);
    }
    expect(stand.outcome).toBe("sieg");
    expect(stand.copies).toBe(2);
    expect(stand.doorOpen).toBe(true);
    expect(stand.cover.length).toBeGreaterThan(0);
    expect(stand.units.filter((unit) => unit.team === "crew" && unit.status === "extracted").length).toBeGreaterThan(0);
    expect(stand.units.some((unit) => unit.team === "crew" && unit.status === "active")).toBe(false);
    expect(notices.some((notice) => notice.includes("Tür ist offen."))).toBe(true);
    expect(notices.some((notice) => notice.startsWith("Gegnerzug."))).toBe(true);
    expect(notices.some((notice) => notice.includes("Sieg."))).toBe(true);
    for (const notice of notices) {
      expect(notice).not.toMatch(/\d+,\s*\d+/);
      expect(notice).not.toContain("patrol");
    }
  }, 30000);
});

function alley(): MissionSpec {
  return spec("alley", 8, 3, (x, y) => y === 1 && x >= 1 && x <= 6, [], { id: "terminal", x: 0, y: 0 }, { id: "shortcut", x: 0, y: 2 }, [
    crew("kite", "Kite", 1, 1),
    crew("voss", "Voss", 1, 0),
    enemy("wache", "Wache", 5, 1),
  ]);
}

function lane(): MissionSpec {
  return spec("lane", 16, 3, (x, y) => y === 1 && x >= 1 && x <= 14, [
    { id: "sichtbar", x: 4, y: 1, protects: "e" },
    { id: "verborgen", x: 14, y: 1, protects: "n" },
  ], { id: "terminal", x: 14, y: 1 }, { id: "shortcut", x: 13, y: 1 }, [
    crew("kite", "Kite", 1, 1),
    enemy("nahe", "Nahe", 12, 1),
  ]);
}

function doorLane(): MissionSpec {
  return spec("door", 5, 3, (_x, y) => y === 1, [], { id: "terminal", x: 0, y: 1 }, { id: "shortcut", x: 2, y: 1 }, [
    crew("kite", "Kite", 1, 1),
    enemy("nahe", "Nahe", 4, 1),
  ]);
}

function spec(
  id: string,
  width: number,
  height: number,
  open: (x: number, y: number) => boolean,
  lowCover: MissionSpec["lowCover"],
  terminal: MissionSpec["terminal"],
  door: MissionSpec["door"],
  spawns: MissionSpec["spawns"],
): MissionSpec {
  const walls: Cell[] = [];
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (x === door.x && y === door.y) continue;
      if (open(x, y)) continue;
      walls.push({ x, y });
    }
  }
  return {
    id,
    hash: id,
    width,
    height,
    walls,
    lowCover,
    terminal,
    door,
    extraction: [{ x: spawns[0]?.x ?? 0, y: spawns[0]?.y ?? 0 }],
    spawns,
  };
}

function crew(id: string, name: string, x: number, y: number): MissionSpec["spawns"][number] {
  return { id, name, team: "crew", weapon: "rifle", x, y, patrol: [] };
}

function enemy(id: string, name: string, x: number, y: number): MissionSpec["spawns"][number] {
  return { id, name, team: "enemy", weapon: "rifle", x, y, patrol: [{ x, y }, { x, y }] };
}

function nextWish(current: SightStand, mission: MissionSpec): Omit<SightWish, "commandId"> | null {
  const crew = current.units.filter((unit) => unit.team === "crew" && unit.status === "active");
  if (crew.length === 0) return null;
  if (current.copies < 2) {
    const hacker = crew.find((unit) => beside(unit, mission.terminal) && unit.ap >= 4);
    if (hacker && current.terminal) return { kind: "interact", unitId: hacker.id, targetId: mission.terminal.id };
  }
  if (current.copies >= 2 && !current.doorOpen) {
    const opener = crew.find((unit) => beside(unit, mission.door) && unit.ap >= 4);
    if (opener && current.door) return { kind: "interact", unitId: opener.id, targetId: mission.door.id };
  }
  if (current.copies >= 2 && current.doorOpen) {
    const leaving = crew.find((unit) => mission.extraction.some((cell) => cell.x === unit.x && cell.y === unit.y) && unit.ap >= 1);
    if (leaving) return { kind: "extract", unitId: leaving.id };
  }
  const goals = current.copies < 2
    ? approaches(mission, mission.terminal, false)
    : !current.doorOpen
      ? approaches(mission, mission.door, false)
      : mission.extraction;
  const ordered = crew.slice().sort((left, right) => right.ap - left.ap);
  for (const unit of ordered) {
    if (unit.ap < 1) continue;
    const path = knownPrefix(current, mission, unit, goals);
    if (path.length > 0) return { kind: "move", unitId: unit.id, path: path.slice(0, unit.ap) };
  }
  return { kind: "end" };
}

function knownPrefix(current: SightStand, mission: MissionSpec, unit: Cell & { id: string }, goals: readonly Cell[]): Cell[] {
  const full = shortest(current, mission, unit, goals);
  if (!full) return [];
  const known = new Set(current.known.map(cellKey));
  const path: Cell[] = [];
  for (const cell of full) {
    if (!known.has(cellKey(cell))) break;
    path.push(cell);
  }
  return path;
}

function shortest(current: SightStand, mission: MissionSpec, unit: Cell & { id: string }, goals: readonly Cell[]): Cell[] | null {
  const wanted = new Set(goals.map(cellKey));
  if (wanted.has(cellKey(unit))) return [];
  const occupied = new Set(current.units.filter((other) => other.id !== unit.id && other.status !== "extracted").map((other) => cellKey(other)));
  const queue: Cell[] = [unit];
  const previous = new Map<string, string | null>([[cellKey(unit), null]]);
  let found = "";
  while (queue.length > 0 && !found) {
    const cell = queue.shift();
    if (!cell) break;
    for (const next of around(cell)) {
      const id = cellKey(next);
      if (previous.has(id) || !openCell(mission, next, current.doorOpen) || occupied.has(id)) continue;
      previous.set(id, cellKey(cell));
      if (wanted.has(id)) {
        found = id;
        break;
      }
      queue.push(next);
    }
  }
  if (!found) return null;
  const path: Cell[] = [];
  let cursor: string | null = found;
  while (cursor && cursor !== cellKey(unit)) {
    const [x, y] = cursor.split(",").map(Number);
    path.push({ x: x ?? 0, y: y ?? 0 });
    cursor = previous.get(cursor) ?? null;
  }
  path.reverse();
  return path;
}

function approaches(mission: MissionSpec, target: Cell, doorOpen: boolean): Cell[] {
  return around(target).filter((cell) => openCell(mission, cell, doorOpen));
}

function openCell(mission: MissionSpec, cell: Cell, doorOpen: boolean): boolean {
  if (cell.x < 0 || cell.y < 0 || cell.x >= mission.width || cell.y >= mission.height) return false;
  if (cell.x === mission.terminal.x && cell.y === mission.terminal.y) return false;
  if (!doorOpen && cell.x === mission.door.x && cell.y === mission.door.y) return false;
  return !mission.walls.some((wall) => wall.x === cell.x && wall.y === cell.y);
}

function around(cell: Cell): Cell[] {
  return [
    { x: cell.x, y: cell.y - 1 },
    { x: cell.x + 1, y: cell.y },
    { x: cell.x, y: cell.y + 1 },
    { x: cell.x - 1, y: cell.y },
  ];
}

function beside(from: Cell, to: Cell): boolean {
  return Math.abs(from.x - to.x) + Math.abs(from.y - to.y) === 1;
}

function cellKey(cell: Cell): string {
  return `${cell.x},${cell.y}`;
}
