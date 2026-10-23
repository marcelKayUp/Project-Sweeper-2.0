import { describe, expect, it } from "vitest";
import { applyCommand, battleMapOf, createMissionState, missionChecksum, previewShot, projectTeam, seesUnit, SIGHT_RANGE, type BattleMap, type Cell, type MissionSpec } from "@neon/sim";
import { canonical, contentHash, generateBuilding, parseConfig, validateBuilding } from "./index.ts";
import { buildCandidate } from "./build.ts";
import { cellKey, flood, neighbors } from "./graph.ts";
import { deriveSeed } from "./random.ts";
import type { Building, BuildingPackage, Family, Size } from "./types.ts";

async function generated(seed = 1, family: Family = "office", size: Size = "compact"): Promise<BuildingPackage> {
  const result = await generateBuilding({ seed, family, size });
  if (!result.ok) throw new Error(JSON.stringify(result));
  return result.package;
}

describe("Semantic Building Generator", () => {
  for (const family of ["office", "laboratory", "factory"] as const) {
    it(`${family}: 100 feste Seeds bestehen Semantik und Zellgeometrie ohne Rückfall`, async () => {
      const hashes = new Set<string>();
      let retries = 0;
      for (let seed = 0; seed < 100; seed += 1) {
        const item = await generated(seed, family);
        expect(item.report.errors).toEqual([]);
        expect(item.report.metrics.independentRoutes).toBe(2);
        expect(item.report.metrics.targetDistance).toBeGreaterThan(0);
        expect(item.mission.spawns.filter((spawn) => spawn.team === "crew")).toHaveLength(4);
        const state = createMissionState(item.mission, seed);
        expect(state.contentHash).toBe(item.mission.hash);
        hashes.add(item.hash);
        retries += item.attempt - 1;
      }
      expect(hashes.size).toBe(100);
      console.log(`${family}: accepted=100/100, fallback=0/100, retries=${retries}`);
    }, 30000);
  }

  it("prüft beide größeren Grundrisse je Familie", async () => {
    for (const family of ["office", "laboratory", "factory"] as const) for (const size of ["standard", "large"] as const) {
      for (let seed = 0; seed < 10; seed += 1) expect((await generated(seed, family, size)).report.errors).toEqual([]);
    }
  }, 30000);

  it("reproduziert vollständiges Paket, SHA-256 und Anfangszustand", async () => {
    const first = await generated(42, "laboratory");
    const second = await generated(42, "laboratory");
    expect(canonical(second)).toBe(canonical(first));
    const { hash, ...body } = first;
    expect(hash).toBe(await contentHash(body));
    const { hash: missionHash, ...mission } = first.mission;
    expect(missionHash).toBe(await contentHash(mission));
    expect(missionChecksum(createMissionState(first.mission, 42))).toBe(missionChecksum(createMissionState(second.mission, 42)));
    expect(Object.isFrozen(first.building.rooms[0])).toBe(true);
  });

  it("ändert bei anderem Dekorationsseed weder Geometrie noch Encounter", async () => {
    const item = await generated(42);
    const first = buildCandidate(item.config, item.seeds);
    const second = buildCandidate(item.config, { ...item.seeds, dressing: item.seeds.dressing ^ 0x12345 });
    expect(second.mission).toEqual(first.mission);
    expect(second.building.rooms).toEqual(first.building.rooms);
    expect(second.building.connections).toEqual(first.building.connections);
    expect(second.building.dressing).not.toEqual(first.building.dressing);
  });

  it("erzeugt eine Karte, deren Wände Sicht blockieren und deren Deckung gerichtet bleibt", async () => {
    const item = await generated(42, "office");
    const dressed = buildCandidate(item.config, { ...item.seeds, dressing: item.seeds.dressing ^ 0x12345 });
    const closed = battleMapOf(item.mission, false);
    const opened = battleMapOf(item.mission, true);
    expect(battleMapOf(dressed.mission, false)).toEqual(closed);

    const separated = separatingWall(opened);
    expect(separated).not.toBeNull();
    if (!separated) return;
    expect(seesUnit(opened, separated.a, separated.b, SIGHT_RANGE)).toBe(false);
    expect(seesUnit(opened, separated.b, separated.a, SIGHT_RANGE)).toBe(false);

    const across = doorSides(item.mission.door, opened);
    expect(across).not.toBeNull();
    if (!across) return;
    expect(seesUnit(closed, across[0], across[1], SIGHT_RANGE)).toBe(false);
    expect(seesUnit(closed, across[1], across[0], SIGHT_RANGE)).toBe(false);
    expect(seesUnit(opened, across[0], across[1], SIGHT_RANGE)).toBe(true);
    expect(seesUnit(opened, across[1], across[0], SIGHT_RANGE)).toBe(true);

    let directional = 0;
    for (const cover of item.mission.lowCover) {
      const step = cover.protects === "e" ? { x: 1, y: 0 } : cover.protects === "w" ? { x: -1, y: 0 } : cover.protects === "s" ? { x: 0, y: 1 } : { x: 0, y: -1 };
      const protectedFrom = { x: cover.x + step.x, y: cover.y + step.y };
      const openFrom = { x: cover.x - step.x, y: cover.y - step.y };
      if (!walkable(opened, protectedFrom) || !walkable(opened, openFrom)) continue;
      const incoming = previewShot(opened, protectedFrom, cover, 0);
      const outgoing = previewShot(opened, openFrom, cover, 0);
      if (incoming.blocked || outgoing.blocked) continue;
      expect(incoming.coverPenalty).toBe(25);
      expect(outgoing.coverPenalty).toBe(0);
      directional += 1;
    }
    expect(directional).toBeGreaterThan(0);

    const state = createMissionState(item.mission, 42);
    const view = projectTeam(state, item.mission);
    for (const spawn of item.mission.spawns) {
      if (spawn.team !== "enemy") continue;
      const shown = view.units.some((unit) => unit.id === spawn.id);
      const seen = state.units.some((unit) => unit.team === "crew" && unit.status === "active" && seesUnit(closed, unit, spawn, SIGHT_RANGE));
      expect(shown).toBe(seen);
      if (!shown) expect(view.knownCells.some((cell) => cell.x === spawn.x && cell.y === spawn.y)).toBe(false);
    }
    for (const cover of item.mission.lowCover) {
      const known = view.knownCells.some((cell) => cell.x === cover.x && cell.y === cover.y);
      expect(view.lowCover.some((item) => item.id === cover.id)).toBe(known);
    }
  });

  it("prüft externe Parameter vor jedem Generierungsversuch", async () => {
    for (const input of [null, [], { seed: NaN, family: "office" }, { seed: 1.5, family: "office" }, { seed: -1, family: "office" }, { seed: 2 ** 32, family: "office" }, { seed: 1, family: "__proto__" }, { seed: 1, family: "office", size: "huge" }, { seed: 1, family: "office", crewSize: 8 }, { seed: 1, family: "office", maxAttempts: 11 }, { seed: 1, family: "office", floors: 3 }, { seed: 1, family: "office", instanceId: "../test" }]) {
      const result = await generateBuilding(input);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.attempts).toEqual([]);
    }
    expect(parseConfig({ seed: 0xffffffff, family: "office" }).seed).toBe(0xffffffff);
    expect(deriveSeed(parseConfig({ seed: 1, family: "office" }), "tactics", 1)).not.toBe(deriveSeed(parseConfig({ seed: 1, family: "office" }), "tactics", 2));
    expect(deriveSeed(parseConfig({ seed: 1, family: "office", maxAttempts: 1 }), "tactics", 1)).toBe(deriveSeed(parseConfig({ seed: 1, family: "office", maxAttempts: 10 }), "tactics", 1));
    expect(() => canonical({ invalid: NaN })).toThrow();
    expect(() => canonical({ invalid: undefined })).toThrow();
  });

  it("erkennt fehlende Funktionen, Schleusenumgehung und getrennte Versorgung", async () => {
    const item = await generated(3, "laboratory");
    const clean = item.building.rooms.find((room) => room.type === "cleanroom")!;
    const other = item.building.rooms.find((room) => room.type === "office")!;
    const broken: Building = {
      ...item.building,
      rooms: item.building.rooms.filter((room) => room.type !== "restroom"),
      connections: [...item.building.connections.filter((link) => link.from !== clean.id && link.to !== clean.id), { id: "bad-airlock", from: clean.id, to: other.id, kind: "open", portal: { x: 0, y: 0 } }],
      infrastructure: item.building.infrastructure.map((service) => service.kind === "ventilation" ? { ...service, edges: [] } : service),
    };
    const before = canonical(broken);
    const codes = validateBuilding(broken, item.mission, item.config).errors.map((error) => error.code);
    expect(codes).toContain("room-program");
    expect(codes).toContain("cleanroom-airlock");
    expect(codes).toContain("graph-template");
    expect(codes).toContain("service-required");
    expect(canonical(broken)).toBe(before);
  });

  it("weist einen manipulierten BSP-Suchbericht unabhängig von der Erzeugung ab", async () => {
    const item = await generated(42);
    const building = { ...item.building, layout: { ...item.building.layout, partitions: item.building.layout.partitions.map((part, index) => index === 0 ? { ...part, offset: part.offset + 1 } : part) } };
    const before = canonical(building);
    expect(validateBuilding(building, item.mission, item.config).errors.map((error) => error.code)).toContain("partition-tree");
    expect(canonical(building)).toBe(before);
  });

  it("erkennt blockierte Zielanker, ungültige Spawns und ein zerstörtes Wegpaar", async () => {
    const item = await generated();
    const terminalWalls = neighbors(item.mission.terminal);
    const mission: MissionSpec = { ...item.mission, walls: [...item.mission.walls, ...terminalWalls], spawns: item.mission.spawns.map((spawn, index) => index === 0 ? { ...spawn, ...item.mission.door } : spawn) };
    const building = { ...item.building, connections: item.building.connections.filter((link) => link.from !== item.building.missionGraph.entryRoom) };
    const codes = validateBuilding(building, mission, item.config).errors.map((error) => error.code);
    expect(codes).toContain("target-unreachable");
    expect(codes).toContain("spawn-blocked");
    expect(codes).toContain("alternate-route");
  });

  it("erkennt einen unmodellierten Durchbruch in den Reinraum", async () => {
    const item = await generated(7, "laboratory");
    const clean = item.building.rooms.find((room) => room.type === "cleanroom")!;
    const breach = { x: clean.x + 1, y: clean.y - 1 };
    const mission = { ...item.mission, walls: item.mission.walls.filter((wall) => cellKey(wall) !== cellKey(breach)) };
    expect(validateBuilding(item.building, mission, item.config).errors.map((error) => error.code)).toContain("unmodeled-opening");
  });

  it("verwendet für Bewegung und zweimaliges Kopieren die vorhandenen Simulationsregeln", async () => {
    const item = await generated(12);
    const spec = item.mission;
    const runner = spec.spawns.find((spawn) => spawn.team === "crew")!;
    const blocked = new Set([...spec.walls, spec.door, spec.terminal].map(cellKey));
    const distances = flood(spec.width, spec.height, blocked, spec.terminal); // terminal blocked: choose an approach first
    expect(distances.size).toBe(0);
    const fromRunner = flood(spec.width, spec.height, blocked, runner);
    let cell = neighbors(spec.terminal).find((next) => fromRunner.has(cellKey(next)))!;
    const path = [cell];
    while (fromRunner.get(cellKey(cell))! > 0) {
      cell = neighbors(cell).find((next) => fromRunner.get(cellKey(next)) === fromRunner.get(cellKey(cell))! - 1)!;
      path.push(cell);
    }
    path.reverse();
    // Exercise the real resolver at the last step; no combat or fairness claim.
    const last = path[path.length - 1]!;
    const previous = path[path.length - 2]!;
    const initial = createMissionState(spec, 12);
    const staged = { ...initial, units: initial.units.map((unit) => unit.id === runner.id ? { ...unit, ...previous, ap: 8 } : unit) };
    const moved = applyCommand(staged, spec, { kind: "move", unitId: runner.id, ...last });
    expect(moved.rejection).toBeNull();
    const copied = applyCommand(moved.state, spec, { kind: "interact", unitId: runner.id, targetId: spec.terminal.id });
    expect(copied.rejection).toBeNull();
    expect(copied.state.copies).toBe(1);
    const refreshed = { ...copied.state, units: copied.state.units.map((unit) => unit.id === runner.id ? { ...unit, ap: 4 } : unit) };
    expect(applyCommand(refreshed, spec, { kind: "interact", unitId: runner.id, targetId: spec.terminal.id }).state.copies).toBe(2);
    expect(initial.copies).toBe(0);
  });

  it("legt zwei Ebenen und die familieneigene Erschließung an", async () => {
    for (const family of ["office", "laboratory", "factory"] as const) {
      const item = await generated(7, family);
      const lift = family === "factory" ? "freight" : "passenger";
      expect(item.mission.levels?.map((floor) => floor.z)).toEqual([0, 1]);
      expect(item.mission.levels?.[0]?.walls).toEqual(item.mission.walls);
      expect(item.mission.levels?.[1]?.lowCover).toEqual([]);
      expect(item.building.links.map((link) => link.kind).sort()).toEqual(["stair", lift].sort());
      expect(item.building.links).toEqual(item.mission.links);
      const halls = new Set(item.building.circulation.map(cellKey));
      const dressed = new Set(item.building.dressing.map(cellKey));
      for (const link of item.building.links) {
        expect(halls.has(cellKey({ x: link.fromX, y: link.fromY }))).toBe(true);
        expect(dressed.has(cellKey({ x: link.fromX, y: link.fromY }))).toBe(false);
        expect(link.fromX).toBe(link.toX);
        expect(link.fromY).toBe(link.toY);
        expect(link.fromZ).toBe(0);
        expect(link.toZ).toBe(1);
      }
    }
  });
});

function walkable(map: BattleMap, cell: Cell): boolean {
  return cell.x >= 0 && cell.y >= 0 && cell.x < map.width && cell.y < map.height && map.walls.every((wall) => wall.x !== cell.x || wall.y !== cell.y);
}

function separatingWall(map: BattleMap): { a: Cell; b: Cell } | null {
  for (const wall of map.walls) {
    const pairs = [
      [{ x: wall.x - 1, y: wall.y }, { x: wall.x + 1, y: wall.y }],
      [{ x: wall.x, y: wall.y - 1 }, { x: wall.x, y: wall.y + 1 }],
    ];
    for (const pair of pairs) {
      const left = pair[0];
      const right = pair[1];
      if (left && right && walkable(map, left) && walkable(map, right)) return { a: left, b: right };
    }
  }
  return null;
}

function doorSides(door: Cell, map: BattleMap): readonly [Cell, Cell] | null {
  const horizontal: readonly [Cell, Cell] = [{ x: door.x - 1, y: door.y }, { x: door.x + 1, y: door.y }];
  if (walkable(map, horizontal[0]) && walkable(map, horizontal[1])) return horizontal;
  const vertical: readonly [Cell, Cell] = [{ x: door.x, y: door.y - 1 }, { x: door.x, y: door.y + 1 }];
  if (walkable(map, vertical[0]) && walkable(map, vertical[1])) return vertical;
  return null;
}
