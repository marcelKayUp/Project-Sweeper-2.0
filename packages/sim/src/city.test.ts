import { describe, expect, it } from "vitest";
import { cityNeighbors, type CityGraph } from "./city.ts";
import { RHEIN_RUHR, RHEIN_RUHR_PLACES, RHEIN_RUHR_SOURCE } from "./rheinRuhr.ts";

describe("Rhein-Ruhr-Graph", () => {
  it("gibt Nachbarn in der gespeicherten Kantenreihenfolge zurück", () => {
    const graph: CityGraph = {
      id: "probe",
      nodes: [
        { id: "a", name: "A", x: 0, y: 0 },
        { id: "m", name: "M", x: 1, y: 0 },
        { id: "b", name: "B", x: 2, y: 0 },
      ],
      edges: [
        { id: "z-a-m", from: "a", to: "m", corridor: "z" },
        { id: "a-a-b", from: "a", to: "b", corridor: "a" },
      ],
    };
    expect(cityNeighbors(graph, "a")).toEqual(["m", "b"]);
    expect(cityNeighbors(graph, "fehlend")).toEqual([]);
    expect(cityNeighbors(RHEIN_RUHR, "essen")).toEqual(["bochum", "muelheim-an-der-ruhr", "velbert", "ratingen"]);
  });

  it("hält Knoten, Kanten und Quelle stabil", () => {
    expect(RHEIN_RUHR.nodes.length).toBeGreaterThanOrEqual(15);
    expect(RHEIN_RUHR.nodes.length).toBeLessThanOrEqual(40);
    expect(RHEIN_RUHR.nodes.length).toBe(32);
    expect(RHEIN_RUHR.edges.length).toBe(49);
    expect(RHEIN_RUHR.nodes.map((node) => node.id)).toEqual([...RHEIN_RUHR.nodes.map((node) => node.id)].sort());
    expect(RHEIN_RUHR.edges.map((edge) => edge.id)).toEqual([...RHEIN_RUHR.edges.map((edge) => edge.id)].sort());
    const ids = new Set<string>();
    const cells = new Set<string>();
    for (const node of RHEIN_RUHR.nodes) {
      expect(ids.has(node.id)).toBe(false);
      ids.add(node.id);
      expect(Number.isInteger(node.x)).toBe(true);
      expect(Number.isInteger(node.y)).toBe(true);
      const cell = `${node.x},${node.y}`;
      expect(cells.has(cell)).toBe(false);
      cells.add(cell);
    }
    for (const edge of RHEIN_RUHR.edges) {
      expect(edge.from < edge.to).toBe(true);
      expect(ids.has(edge.from)).toBe(true);
      expect(ids.has(edge.to)).toBe(true);
    }
    expect(RHEIN_RUHR.nodes.find((node) => node.id === "essen")).toMatchObject({ x: 419, y: 236 });
    expect(RHEIN_RUHR.nodes.find((node) => node.id === "koeln")).toMatchObject({ name: "Köln", x: 379, y: 785 });
    expect(RHEIN_RUHR.nodes.find((node) => node.id === "hamm")).toMatchObject({ x: 1000, y: 0 });
    expect(RHEIN_RUHR.nodes.find((node) => node.id === "bonn")).toMatchObject({ x: 482, y: 1000 });
    expect(RHEIN_RUHR_PLACES.map((place) => place.id)).toEqual(RHEIN_RUHR.nodes.map((node) => node.id));
    expect(RHEIN_RUHR_SOURCE.placesLive).toBe("ja");
    expect(RHEIN_RUHR_SOURCE.roadsLive).toBe("nein");
    expect(RHEIN_RUHR_SOURCE.license).toBe("ODbL-1.0");

    const seen = new Set<string>();
    const queue = [RHEIN_RUHR.nodes[0]?.id ?? ""];
    while (queue.length > 0) {
      const current = queue.shift();
      if (!current || seen.has(current)) continue;
      seen.add(current);
      queue.push(...cityNeighbors(RHEIN_RUHR, current));
    }
    expect(seen.size).toBe(RHEIN_RUHR.nodes.length);
  });
});
