import { describe, expect, it } from "vitest";
import { canonical, generateBuilding, parseConfig, planDemand, validateBuilding } from "./index.ts";
import type { BuildingPackage } from "./types.ts";

describe("capacity-based room program", () => {
  it("leitet sechs Büros aus 24 Arbeitsplätzen ab, unabhängig von Seed und Flächenbudget", () => {
    const input = { seed: 42, family: "office", occupants: 24, workplaces: 24, processUnits: 0, storageUnits: 8 };
    const small = planDemand(parseConfig({ ...input, size: "compact" }));
    const large = planDemand(parseConfig({ ...input, seed: 9, size: "large" }));
    expect(small.program.find((row) => row.type === "office")).toMatchObject({ required: 24, count: 6, capacityPerRoom: 4, capacity: 24, minimumArea: 84 });
    expect(small.program).toEqual(large.program);
    expect(small.instances).toEqual(large.instances);
  });

  it("rundet Kapazitätsschwellen auf und gibt dem letzten Raum nur den restlichen Bedarf", () => {
    for (const workplaces of [1, 4, 5, 8, 9, 24, 25]) {
      const plan = planDemand(parseConfig({ seed: 1, family: "office", occupants: 32, workplaces }));
      const offices = plan.instances.filter((room) => room.type === "office");
      expect(offices).toHaveLength(Math.ceil(workplaces / 4));
      expect(offices.reduce((sum, room) => sum + room.assignedDemand, 0)).toBe(workplaces);
      expect(offices.every((room) => room.assignedDemand <= room.capacity)).toBe(true);
      expect(offices.at(-1)!.minArea).toBe(Math.max(12, 6 + 2 * offices.at(-1)!.assignedDemand));
    }
    const plan = planDemand(parseConfig({ seed: 1, family: "office", occupants: 25, workplaces: 25 }));
    expect(plan.program.find((row) => row.type === "restroom")?.count).toBe(2);
    expect(plan.summary.sanitaryFixtures).toBe(3);
    expect(plan.program.find((row) => row.type === "breakroom")).toMatchObject({ required: 13, count: 2 });
  });

  it("leitet Laborgruppen und Logistik aus Prozessplätzen und Lagerbedarf ab", () => {
    const lab = planDemand(parseConfig({ seed: 1, family: "laboratory", processUnits: 9 }));
    expect(lab.program.find((row) => row.type === "laboratory")?.count).toBe(3);
    expect(lab.program.find((row) => row.type === "cleanroom")?.count).toBe(2);
    expect(lab.program.find((row) => row.type === "airlock")?.count).toBe(2);
    const factory = planDemand(parseConfig({ seed: 1, family: "factory", storageUnits: 17, processUnits: 9 }));
    expect(factory.program.find((row) => row.type === "production")?.count).toBe(3);
    expect(factory.program.find((row) => row.type === "storage")?.count).toBe(3);
    expect(factory.program.find((row) => row.type === "dispatch")?.count).toBe(2);
  });

  it("trennt örtlichen und äußeren Bedarf einschließlich aufgerundeter Raumkapazitäten", () => {
    const plan = planDemand(parseConfig({ seed: 42, family: "office", occupants: 24, workplaces: 24, storageUnits: 7, scope: "mission-floor", floorShare: 50 }));
    expect(plan.summary.local).toMatchObject({ occupants: 12, workplaces: 12, storageUnits: 4 });
    expect(plan.summary.outside).toMatchObject({ occupants: 12, workplaces: 12, storageUnits: 3 });
    expect(plan.program.find((row) => row.type === "office")).toMatchObject({ count: 3, outsideCount: 3, totalCount: 6 });
    expect(plan.program.find((row) => row.type === "storage")).toMatchObject({ count: 1, outsideCount: 1, totalCount: 2 });
    expect(plan.program.find((row) => row.type === "reception")).toMatchObject({ count: 0, outsideCount: 1 });
    expect(plan.program.find((row) => row.type === "loading")).toMatchObject({ count: 0, outsideCount: 1 });
    expect(plan.instances.some((room) => room.type === "reception" || room.type === "loading")).toBe(false);
    expect(plan.instances.find((room) => room.id === plan.entryRoomId)?.type).toBe("corridor");
    expect(plan.entryRoomId).not.toBe(plan.secondaryEntryRoomId);
    for (const row of plan.program) {
      expect(row.capacity).toBeGreaterThanOrEqual(row.required);
      expect(row.outsideCount * row.capacityPerRoom).toBeGreaterThanOrEqual(row.outsideRequired);
      expect(row.totalCount).toBe(row.count + row.outsideCount);
    }
  });

  it("weist zu großen Bedarf vor der Layoutsuche nachvollziehbar ab und löscht keine Pflichträume", async () => {
    const input = { seed: 1, family: "office", size: "compact", occupants: 96, workplaces: 96, storageUnits: 96 };
    const result = await generateBuilding(input);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.attempts).toEqual([]);
    expect(result.errors.map((error) => error.code)).toContain("demand-area");
    expect(result.demand?.summary.scale.floors).toBe(4);
    expect(result.demand?.program.find((row) => row.type === "office")?.count).toBeGreaterThan(0);
    expect(canonical(result)).toBe(canonical(await generateBuilding(input)));
  });

  it("prüft alle neuen Eingaben streng vor dem Bedarfsmodell", async () => {
    for (const patch of [{ occupants: 0 }, { occupants: 97 }, { occupants: "8" }, { workplaces: 1.5 }, { workplaces: 20 }, { storageUnits: 0 }, { processUnits: 1 }, { floorShare: 0 }, { floorShare: 50 }, { scope: null }, { scope: "roof" }, { scope: "mission-floor", floorShare: 101 }, { occupants: null }, { storageUnits: Infinity }]) {
      const result = await generateBuilding({ seed: 1, family: "office", ...patch });
      expect(result.ok, JSON.stringify(patch)).toBe(false);
      if (!result.ok) { expect(result.attempts).toEqual([]); expect(result.demand).toBeNull(); expect(result.errors[0]?.code).toBe("config"); }
    }
    expect((await generateBuilding({ seed: 1, family: "laboratory", processUnits: 0 })).ok).toBe(false);
  });

  it("erzeugt ganze Gebäude und Ausschnitte mit wechselnden Kapazitäten, vier Runnern und sechs Gegnern", async () => {
    for (const family of ["office", "laboratory", "factory"] as const) for (const occupants of [1, 8, 24, 48]) for (const scope of ["building", "mission-floor"] as const) {
      const input = { seed: 42, family, size: "large", occupants, workplaces: family === "office" ? Math.min(occupants, 24) : occupants === 1 ? 0 : 4, processUnits: family === "office" ? 0 : 9, storageUnits: 17, scope };
      const result = await generateBuilding(input);
      if (!result.ok) throw new Error(canonical(result));
      const item = result.package;
      expect(item.report.errors).toEqual([]);
      expect(item.building.rooms).toHaveLength(planDemand(item.config).instances.length);
      expect(item.mission.spawns.filter((spawn) => spawn.team === "crew")).toHaveLength(4);
      expect(item.mission.spawns.filter((spawn) => spawn.team === "enemy")).toHaveLength(6);
      expect(item.building.rooms.every((room) => room.width * room.height >= room.minArea)).toBe(true);
      if (scope === "mission-floor") expect(item.building.rooms.some((room) => room.type === "reception" || room.type === "loading")).toBe(false);
      const repeat = await generateBuilding(input);
      expect(canonical(repeat)).toBe(canonical(result));
    }
  }, 30000);

  it("erkennt manipulierte Bedarfsangaben, Kapazitäten und fehlende Rauminstanzen unabhängig", async () => {
    const result = await generateBuilding({ seed: 42, family: "office", size: "standard", occupants: 24, workplaces: 24 });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const item: BuildingPackage = result.package;
    const broken = { ...item.building, demand: { ...item.building.demand, local: { ...item.building.demand.local, occupants: 1 } }, program: item.building.program.map((row) => ({ ...row, outsideCount: 0, capacity: 0 })), rooms: item.building.rooms.filter((room) => room.id !== "room-office-06").map((room) => room.id === "room-office-01" ? { ...room, capacity: 1, minArea: 1 } : room) };
    const before = canonical(broken);
    const codes = validateBuilding(broken, item.mission, item.config).errors.map((error) => error.code);
    for (const code of ["demand-summary", "program-declaration", "room-capacity", "room-program"]) expect(codes).toContain(code);
    expect(canonical(broken)).toBe(before);
  });
});
