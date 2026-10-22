import { describe, expect, it } from "vitest";
import { canonical, generateBuilding, sanitaryPath, validateBuilding, EXECUTIVE_SANITARY_LIMIT } from "./index.ts";
import { cellKey, contains, neighbors, roomPath } from "./graph.ts";
import type { BuildingPackage, Room } from "./types.ts";

const config = { seed: 42, family: "office", size: "standard", corporation: "kasane", siteRole: "headquarters" };
async function sample(input: object = config): Promise<BuildingPackage> {
  const result = await generateBuilding(input);
  if (!result.ok) throw new Error(canonical(result));
  return result.package;
}
describe("physical circulation and local sanitation", () => {
  it("reserviert eigene verbundene Flurfelder und Türen statt Büros als Verkehrswege", async () => {
    const item = await sample(); const { building, mission } = item;
    expect(building.circulation.length).toBeGreaterThan(60);
    expect(item.report.metrics.corridorCells).toBe(building.circulation.length);
    for (const cell of building.circulation) {
      expect(mission.walls.some((wall) => cellKey(wall) === cellKey(cell))).toBe(false);
      expect(building.rooms.some((room) => contains(room, cell))).toBe(false);
    }
    for (const room of building.rooms.filter((room) => room.workplaceRole !== "support")) {
      const path = sanitaryPath(building, room, mission);
      expect(path.length, room.id).toBeGreaterThan(1);
      for (const cell of path) expect(building.rooms.some((other) => contains(other, cell) && ![room.id, "room-restroom-01", "room-assistant-01"].includes(other.id) && other.type !== "corridor")).toBe(false);
      for (let i = 1; i < path.length; i++) expect(neighbors(path[i - 1]!).map(cellKey)).toContain(cellKey(path[i]!));
    }
  });

  it("hält reale CEO-Sanitärwege in vier Konzernen und repräsentativen Geschossen kurz", async () => {
    for (const corporation of ["kasane", "concord", "parallax", "verdant"]) for (const seed of [0, 1, 42]) for (const scope of ["building", "mission-floor"]) {
      const item = await sample({ ...config, corporation, seed, scope, ...(scope === "mission-floor" ? { floorShare: 50, statusTier: "executive" } : {}) });
      const ceo = item.building.rooms.find((room) => room.type === "executive")!;
      const path = sanitaryPath(item.building, ceo, item.mission);
      expect(path.length - 1).toBeGreaterThan(0);
      expect(path.length - 1).toBeLessThanOrEqual(EXECUTIVE_SANITARY_LIMIT);
      expect(item.report.metrics.executiveSanitaryDistance).toBe(path.length - 1);
      expect(item.building.rooms.filter((room) => room.type === "restroom")).toHaveLength(1);
      expect(item.building.program.find((row) => row.type === "restroom")?.required).toBe(item.building.demand.local.occupants);
    }
  });

  it("weist fehlende Flure und blockierte Assistenzwege unabhängig ab", async () => {
    const item = await sample();
    expect(validateBuilding({ ...item.building, circulation: [] }, item.mission, item.config).errors.map((error) => error.code)).toContain("corridor-missing");
    const assistant = item.building.rooms.find((room) => room.type === "assistant")!;
    const door = item.building.connections.find((link) => link.from === assistant.id && link.to.startsWith("hall-"))!;
    const blocked = { ...item.mission, walls: [...item.mission.walls, door.portal] };
    const codes = validateBuilding(item.building, blocked, item.config).errors.map((error) => error.code);
    expect(codes).toContain("staff-sanitation");
    expect(codes).toContain("executive-sanitation");
  });

  it("erkennt den alten Fehler: WC im Graph erreichbar, realer CEO-Weg aber zu lang", async () => {
    const item = await sample(); const { building, mission } = item;
    const ceo = building.rooms.find((room) => room.type === "executive")!;
    const wc = building.rooms.find((room) => room.type === "restroom")!;
    const geometry = (room: Room) => ({ x: room.x, y: room.y, width: room.width, height: room.height });
    let found = false;
    for (const far of building.rooms.filter((room) => ["office", "storage", "breakroom", "records"].includes(room.type))) {
      const swap = (id: string) => id === wc.id ? far.id : id === far.id ? wc.id : id;
      const changed = { ...building, rooms: building.rooms.map((room) => room.id === wc.id ? { ...room, ...geometry(far) } : room.id === far.id ? { ...room, ...geometry(wc) } : room), connections: building.connections.map((link) => ({ ...link, from: swap(link.from), to: swap(link.to) })) };
      const path = sanitaryPath(changed, ceo, mission);
      if (path.length - 1 <= EXECUTIVE_SANITARY_LIMIT) continue;
      expect(roomPath(changed.connections, ceo.id, wc.id).length).toBeGreaterThan(0);
      expect(validateBuilding(changed, mission, item.config).errors.map((error) => error.code)).toContain("executive-sanitation");
      found = true; break;
    }
    expect(found).toBe(true);
  });

  it("lässt ein fremdes Büro nicht als Ersatz für eine fehlende Flurtür gelten", async () => {
    const item = await sample();
    const manager = item.building.rooms.find((room) => room.type === "manager")!;
    const changed = { ...item.building, connections: item.building.connections.filter((link) => !(link.from === manager.id && link.to.startsWith("hall-"))) };
    // Its required neighbor still keeps the room reachable in the old graph test.
    expect(roomPath(changed.connections, changed.missionGraph.entryRoom, manager.id).length).toBeGreaterThan(0);
    const codes = validateBuilding(changed, item.mission, item.config).errors.map((error) => error.code);
    expect(codes).toContain("corridor-access");
    expect(codes).toContain("staff-sanitation");
  });
});
