import { describe, expect, it } from "vitest";
import { generateBuilding, canonical } from "./index.ts";
import { independentRoomPaths } from "./graph.ts";
import { bspRooms, sharedPortals, splitRectangle } from "./layout/bsp.ts";
import { EMBEDDING_NODE_LIMIT, embedRoomGraph } from "./layout/embed.ts";
import { LAYOUT_CANDIDATE_LIMIT } from "./layout/index.ts";
import type { Connection } from "./types.ts";

describe("variable floorplans", () => {
  it("teilt exakt in zwölf überschneidungsfreie Flächen mit ganzen Maßen", () => {
    for (let seed = 0; seed < 100; seed += 1) {
      const result = bspRooms({ x: 1, y: 1, width: 18, height: 18 }, 12, seed);
      expect(result.rectangles).toHaveLength(12);
      expect(result.partitions).toHaveLength(11);
      const occupied = new Set<string>();
      for (const rect of result.rectangles) {
        expect(rect.width).toBeGreaterThanOrEqual(3);
        expect(rect.height).toBeGreaterThanOrEqual(3);
        expect(rect.width * rect.height).toBeGreaterThanOrEqual(12);
        expect(rect.x + rect.width).toBeLessThanOrEqual(19);
        expect(rect.y + rect.height).toBeLessThanOrEqual(19);
        for (let y = rect.y; y < rect.y + rect.height; y += 1) for (let x = rect.x; x < rect.x + rect.width; x += 1) {
          expect(occupied.has(`${x}/${y}`)).toBe(false); occupied.add(`${x}/${y}`);
        }
      }
    }
  });

  it("reserviert die Trennwand und erkennt versetzte Türanschlüsse", () => {
    const [left, right] = splitRectangle({ x: 1, y: 1, width: 11, height: 8 }, "x", 4);
    expect(left.width).toBe(4); expect(right.x).toBe(6);
    expect(sharedPortals(left, { ...right, y: 3, height: 3 })).toEqual([{ x: 5, y: 3 }, { x: 5, y: 4 }, { x: 5, y: 5 }]);
    expect(() => splitRectangle(left, "x", 0)).toThrow();
    expect(() => bspRooms({ x: 1, y: 1, width: 5, height: 5 }, 12, 1)).toThrow();
  });

  it("bettet einen vorgegebenen Zyklus ein und begrenzt unlösbare Suchläufe", () => {
    const rectangles = [{ x: 1, y: 1, width: 4, height: 4 }, { x: 6, y: 1, width: 4, height: 4 }, { x: 6, y: 6, width: 4, height: 4 }, { x: 1, y: 6, width: 4, height: 4 }];
    const types = ["reception", "office", "server", "loading"] as const;
    const template = { id: "cycle", edges: [[0, 1], [1, 2], [2, 3], [3, 0]] as const, shortcut: null };
    const result = embedRoomGraph(rectangles, types, template, 11, 11, 42);
    expect(result.assignment).not.toBeNull();
    for (const [a, b] of template.edges) expect(sharedPortals(rectangles[result.assignment![a]!]!, rectangles[result.assignment![b]!]!).length).toBeGreaterThan(0);
    const budget = embedRoomGraph(rectangles, types, template, 11, 11, 42, 1);
    expect(budget.assignment).toBeNull(); expect(budget.exhausted).toBe(true); expect(budget.nodes).toBe(1);
    const impossible = embedRoomGraph(rectangles, types, { ...template, edges: [...template.edges, [0, 2]] }, 11, 11, 42);
    expect(impossible.assignment).toBeNull(); expect(impossible.nodes).toBeLessThanOrEqual(EMBEDDING_NODE_LIMIT);
  });

  for (const family of ["office", "factory", "laboratory"] as const) {
    it(`${family}: variiert die Raumgeometrie und bleibt innerhalb des Suchbudgets`, async () => {
      const geometries = new Set<string>();
      let nonGrid = 0;
      for (let seed = 0; seed < 100; seed += 1) {
        const result = await generateBuilding({ seed, family });
        if (!result.ok) throw new Error(canonical(result));
        const { rooms, layout } = result.package.building;
        geometries.add(canonical(rooms.map(({ x, y, width, height }) => ({ x, y, width, height })).sort((a, b) => a.y - b.y || a.x - b.x)));
        nonGrid += Number(new Set(rooms.map((room) => `${room.x}/${room.width}`)).size * new Set(rooms.map((room) => `${room.y}/${room.height}`)).size > rooms.length);
        expect(layout.method).toBe("circulation");
        expect(layout.candidate).toBeLessThanOrEqual(LAYOUT_CANDIDATE_LIMIT);
        expect(layout.searchNodes).toBeLessThanOrEqual(EMBEDDING_NODE_LIMIT);
        expect(layout.rejected).toHaveLength(layout.candidate - 1);
        expect(result.package.formatVersion).toBe(6);
      }
      expect(geometries.size).toBeGreaterThan(80);
      expect(nonGrid).toBeGreaterThan(50);
    }, 30000);
  }

  it("ändert keine globale Zufallsquelle und braucht sie nicht für IDs oder Geometrie", async () => {
    const original = Math.random;
    try {
      Math.random = () => { throw new Error("Globale Zufallsquelle benutzt"); };
      const first = await generateBuilding({ seed: 42, family: "laboratory" });
      const second = await generateBuilding({ seed: 42, family: "laboratory" });
      expect(first.ok).toBe(true); expect(canonical(first)).toBe(canonical(second));
      expect(() => Math.random()).toThrow("Globale Zufallsquelle benutzt");
    } finally { Math.random = original; }
  });

  it("beendet eine unpassende Einbettung reproduzierbar am vereinbarten Budget", async () => {
    const config = { seed: 3, family: "office", occupants: 28, workplaces: 28, maxAttempts: 1 };
    const first = await generateBuilding(config);
    const second = await generateBuilding(config);
    expect(first.ok).toBe(false);
    expect(canonical(first)).toBe(canonical(second));
    if (!first.ok) {
      expect(first.attempts).toHaveLength(1);
      expect(first.attempts[0]!.errors).toHaveLength(LAYOUT_CANDIDATE_LIMIT);
      expect(first.errors[0]!.code).toBe("attempt-budget");
    }
    expect((await generateBuilding({ ...config, size: "standard" })).ok).toBe(true);
  });

  it("findet zwei Wege auch wenn der erste Flussweg umgeleitet werden muss", () => {
    const pairs = [["s", "a"], ["a", "b"], ["b", "t"], ["s", "x"], ["x", "y"], ["y", "b"], ["a", "u"], ["u", "v"], ["v", "t"]];
    const links: Connection[] = pairs.map(([from, to], index) => ({ id: `e${index}`, from: from!, to: to!, kind: "open", portal: { x: index, y: 0 } }));
    const paths = independentRoomPaths(links, "s", "t");
    expect(paths).toHaveLength(2);
    const used = new Set<string>();
    for (const path of paths) for (let i = 1; i < path.length; i += 1) {
      const key = [path[i - 1], path[i]].sort().join("/");
      expect(used.has(key)).toBe(false); used.add(key);
    }
  });
});
