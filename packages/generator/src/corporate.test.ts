import { describe, expect, it } from "vitest";
import { canonical, generateBuilding, parseConfig, planDemand, validateBuilding } from "./index.ts";
import type { BuildingPackage } from "./types.ts";

const sample = { seed: 42, family: "office", size: "standard", occupants: 16, workplaces: 16, corporation: "kasane", siteRole: "headquarters" };
async function generated(input: object): Promise<BuildingPackage> {
  const result = await generateBuilding(input);
  if (!result.ok) throw new Error(canonical(result));
  return result.package;
}
const workplaceTypes = new Set(["office", "executive", "manager", "assistant"]);

describe("corporate architecture", () => {
  it("erzeugt vier unterscheidbare Raumprogramme, Materialien und verbindliche Konzernbeziehungen", async () => {
    const signatures = new Set<string>();
    const plans = new Set<string>();
    const expected = { kasane: ["reception", "security"], concord: ["mechanical", "corridor"], parallax: ["reception", "meeting"], verdant: ["atrium", "corridor"] };
    for (const corporation of ["kasane", "concord", "parallax", "verdant"] as const) {
      const item = await generated({ ...sample, corporation });
      const names = expected[corporation].map((type) => item.building.rooms.find((room) => room.type === type)!.id);
      expect(item.building.connections.some((link) => link.kind !== "shortcut" && names.includes(link.from) && names.includes(link.to))).toBe(true);
      signatures.add(canonical(item.building.identity)); plans.add(canonical(item.building.program));
      expect(item.building.rooms.some((room) => room.type === "executive")).toBe(true);
      expect(item.building.rooms.filter((room) => workplaceTypes.has(room.type)).reduce((sum, room) => sum + room.assignedDemand, 0)).toBe(16);
      expect(item.report.errors).toEqual([]);
      expect(canonical(await generated({ ...sample, corporation }))).toBe(canonical(item));
    }
    expect(signatures.size).toBe(4); expect(plans.size).toBe(4);
  }, 30000);

  it("bewahrt die Arbeitsplätze über Hierarchie und Geschossausschnitte ohne negative oder doppelte Zuweisungen", () => {
    for (const workplaces of [0, 1, 2, 5, 6, 8, 16, 24, 48, 96]) for (const floorShare of [1, 25, 50, 99, 100]) for (const statusTier of ["staff", "executive", "contractor"]) {
      const plan = planDemand(parseConfig({ seed: 1, family: "laboratory", occupants: 96, workplaces, corporation: "kasane", siteRole: "headquarters", scope: "mission-floor", floorShare, statusTier }));
      for (const [field, count] of [["required", plan.summary.local.workplaces], ["outsideRequired", plan.summary.outside.workplaces]] as const) {
        expect(plan.program.filter((row) => workplaceTypes.has(row.type)).reduce((sum, row) => sum + row[field], 0)).toBe(count);
      }
      expect(plan.program.every((row) => row.required >= 0 && row.outsideRequired >= 0)).toBe(true);
      expect(plan.instances.every((room) => room.assignedDemand > 0 && room.assignedDemand <= room.capacity)).toBe(true);
    }
  });

  it("erzeugt CEO, Assistenz und Vorstand nur aus vertretenem Hauptsitzbedarf", async () => {
    for (const siteRole of ["branch", "operations"]) {
      const item = await generated({ ...sample, siteRole });
      expect(item.building.rooms.some((room) => ["executive", "assistant", "boardroom"].includes(room.type))).toBe(false);
    }
    const floor = await generated({ ...sample, scope: "mission-floor", floorShare: 50 });
    expect(floor.building.rooms.some((room) => room.type === "executive")).toBe(false);
    expect(floor.building.program.find((row) => row.type === "executive")).toMatchObject({ count: 0, outsideCount: 1 });
    const top = await generated({ ...sample, scope: "mission-floor", floorShare: 50, statusTier: "executive" });
    const executive = top.building.rooms.find((room) => room.type === "executive")!;
    const links = top.building.connections.filter((link) => link.from === executive.id || link.to === executive.id);
    expect(links).toHaveLength(1);
    expect([links[0]!.from, links[0]!.to]).toContain("room-assistant-01");
  }, 30000);

  it("unterscheidet vertrauliche Büroeinheiten, offene Teams, Gesprächsräume und Umbaureste", async () => {
    const open = planDemand(parseConfig({ ...sample, corporation: "parallax", siteRole: "branch" }));
    const legal = planDemand(parseConfig({ ...sample, corporation: "parallax", siteRole: "branch", department: "legal" }));
    expect(open.instances.find((room) => room.type === "office")?.officeForm).toBe("open");
    expect(legal.instances.find((room) => room.type === "office")?.officeForm).toBe("cell");
    expect(legal.program.find((row) => row.type === "office")!.count).toBeGreaterThan(open.program.find((row) => row.type === "office")!.count);
    expect(legal.program.find((row) => row.type === "focus")?.count).toBe(2);
    const converted = await generated({ ...sample, buildingHistory: "converted" });
    expect(converted.building.rooms.filter((room) => room.type === "corridor")).toHaveLength(2);
    expect(converted.building.rooms.find((room) => room.type === "executive")!.minArea).toBeGreaterThan(converted.building.rooms.find((room) => room.type === "office")!.minArea);
  });

  it("ändert durch Abnutzung keine Geometrie, AP, Sichtblocker oder Encounter", async () => {
    const clean = await generated(sample);
    const patched = await generated({ ...sample, condition: "patched" });
    expect(patched.mission).toEqual(clean.mission);
    expect(patched.building.connections).toEqual(clean.building.connections);
    expect(patched.building.rooms.map(({ appearance, ...room }) => room)).toEqual(clean.building.rooms.map(({ appearance, ...room }) => room));
    expect(patched.building.rooms[0]!.appearance.wear).toBe("patched");
    expect(patched.seeds.floorplan).toBe(clean.seeds.floorplan);
    expect(patched.seeds.encounters).toBe(clean.seeds.encounters);
    expect(patched.seeds.dressing).not.toBe(clean.seeds.dressing);
    expect(patched.hash).not.toBe(clean.hash);
  });

  it("weist unbekannte Konzernparameter vor der Suche ab", async () => {
    for (const patch of [{ corporation: "__proto__" }, { corporation: null }, { siteRole: "penthouse" }, { department: [] }, { statusTier: "boss" }, { buildingHistory: false }, { condition: 1 }]) {
      const result = await generateBuilding({ ...sample, ...patch });
      expect(result.ok).toBe(false);
      if (!result.ok) { expect(result.attempts).toEqual([]); expect(result.demand).toBeNull(); }
    }
  });

  it("erkennt veränderte Identität, Materialien und den umgangenen Zugang zur Geschäftsführung", async () => {
    const item = await generated(sample);
    const executive = item.building.rooms.find((room) => room.type === "executive")!;
    const broken = { ...item.building, identity: { ...item.building.identity, officeCapacity: 99 }, rooms: item.building.rooms.map((room) => room.id === executive.id ? { ...room, access: "public" as const, appearance: { ...room.appearance, surface: "rubber" as const } } : room), connections: [...item.building.connections, { id: "executive-bypass", from: executive.id, to: "room-corridor-01", kind: "open" as const, portal: { x: 0, y: 0 } }] };
    const before = canonical(broken);
    const codes = validateBuilding(broken, item.mission, item.config).errors.map((finding) => finding.code);
    for (const code of ["corporate-identity", "office-semantics", "room-appearance", "exclusive-access"]) expect(codes).toContain(code);
    expect(canonical(broken)).toBe(before);
  });

  it("verkleinert bei Platzmangel keine verpflichtende Konzernfunktion", async () => {
    const input = { ...sample, size: "compact", occupants: 48, workplaces: 48, department: "legal" };
    const result = await generateBuilding(input);
    if (result.ok) {
      expect(result.package.building.demand.scale.floors).toBeGreaterThan(1);
      expect(result.package.building.rooms.some((room) => room.type === "executive")).toBe(true);
      expect(result.package.building.program.find((row) => row.type === "executive")?.count).toBe(1);
    } else {
      expect(result.demand?.summary.scale.floors).toBeGreaterThan(1);
      expect(result.demand?.instances.some((room) => room.type === "executive")).toBe(true);
      expect(result.demand?.program.find((row) => row.type === "executive")?.count).toBe(1);
    }
  });

  it("bettet ein großes Legal-Programm mit 31 Räumen neben einem eigenen Flurnetz ein", async () => {
    const item = await generated({ ...sample, size: "large", occupants: 24, workplaces: 24, corporation: "verdant", siteRole: "branch", department: "legal" });
    expect(item.building.rooms).toHaveLength(31);
    expect(item.building.rooms.filter((room) => room.type === "office")).toHaveLength(11);
    expect(item.building.rooms.some((room) => room.type === "atrium")).toBe(true);
    expect(item.report.metrics.independentRoutes).toBe(2);
  }, 30000);
});
