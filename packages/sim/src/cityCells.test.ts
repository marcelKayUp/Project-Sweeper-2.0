import { describe, expect, it } from "vitest";
import { CITY_CELL_MARGIN, cityCellOwner, cityCells, type CityCell, type CityNode } from "./cityCells.ts";
import { RHEIN_RUHR } from "./rheinRuhr.ts";

function covers(cell: CityCell, x: number, y: number): boolean {
  let hits = 0;
  for (const ring of cell.rings) {
    for (let index = 0, previous = ring.length - 1; index < ring.length; previous = index, index += 1) {
      const start = ring[index];
      const end = ring[previous];
      if (!start || !end) continue;
      const crosses = start.y > y !== end.y > y;
      if (crosses && x < ((end.x - start.x) * (y - start.y)) / (end.y - start.y) + start.x) hits += 1;
    }
  }
  return hits % 2 === 1;
}

function ownerOf(cells: readonly CityCell[], x: number, y: number): string | null {
  let owner: string | null = null;
  for (const cell of cells) {
    if (!covers(cell, x, y)) continue;
    expect(owner).toBeNull();
    owner = cell.id;
  }
  return owner;
}

describe("Manhattan-Voronoi der Stadtkarte", () => {
  const places: readonly CityNode[] = [
    { id: "m", name: "Mitte", x: 0, y: 0 },
    { id: "a", name: "Alt", x: 4, y: 0 },
  ];

  it("gibt einen näheren Punkt an A und einen Gleichstand an die kleinere ID", () => {
    expect(cityCellOwner(places, 1, 0)).toBe("m");
    expect(cityCellOwner(places, 0, 2)).toBe("m");
    expect(cityCellOwner(places, 3, 0)).toBe("a");
    expect(cityCellOwner(places, 2, 0)).toBe("a");
    expect(cityCellOwner(places, 2, 5)).toBe("a");
    expect(cityCellOwner([...places].reverse(), 2, 5)).toBe("a");
    expect(cityCellOwner(places, 0, 0)).toBe("m");
    expect(cityCellOwner(places, 4, 0)).toBe("a");
  });

  it("lässt die Eingabe unverändert und füllt um einen Ort das feste Rechteck", () => {
    const nodes = Object.freeze([Object.freeze({ id: "a", name: "A", x: 5, y: 5 })]);
    const before = nodes.map((node) => ({ ...node }));
    const cells = cityCells(nodes);
    expect(nodes.map((node) => ({ ...node }))).toEqual(before);
    expect(cells.map((cell) => cell.id)).toEqual(["a"]);
    const min = 5 - CITY_CELL_MARGIN - 0.5;
    const max = 5 + CITY_CELL_MARGIN + 0.5;
    expect(cells[0]?.rings).toEqual([
      [
        { x: min, y: min },
        { x: max, y: min },
        { x: max, y: max },
        { x: min, y: max },
      ],
    ]);
    expect(covers(cells[0] ?? { id: "a", rings: [] }, 5, 5)).toBe(true);
  });

  it("deckt jeden Rasterpunkt genau mit demselben Gewinner und bleibt stabil", () => {
    const once = cityCells(places);
    const twice = cityCells([...places].reverse());
    expect(twice).toEqual(once);
    const minX = -CITY_CELL_MARGIN;
    const maxX = 4 + CITY_CELL_MARGIN;
    const minY = -CITY_CELL_MARGIN;
    const maxY = CITY_CELL_MARGIN;
    for (let y = minY; y <= maxY; y += 1) {
      for (let x = minX; x <= maxX; x += 1) {
        expect(ownerOf(once, x, y)).toBe(cityCellOwner(places, x, y));
      }
    }
    for (const place of places) {
      expect(ownerOf(once, place.x, place.y)).toBe(place.id);
    }
  });

  it("hält für den Rhein-Ruhr-Graphen jeden Ort und dieselbe Zuordnung", () => {
    const once = cityCells(RHEIN_RUHR.nodes);
    const twice = cityCells([...RHEIN_RUHR.nodes].reverse());
    expect(twice).toEqual(once);
    expect(once.map((cell) => cell.id)).toEqual(RHEIN_RUHR.nodes.map((node) => node.id));
    for (const node of RHEIN_RUHR.nodes) {
      expect(cityCellOwner(RHEIN_RUHR.nodes, node.x, node.y)).toBe(node.id);
      const cell = once.find((entry) => entry.id === node.id);
      expect(cell).toBeDefined();
      expect(covers(cell ?? { id: "", rings: [] }, node.x, node.y)).toBe(true);
    }
    expect(cityCellOwner(RHEIN_RUHR.nodes, 419, 237)).toBe("essen");
    const hamm = once.find((cell) => cell.id === "hamm");
    const bonn = once.find((cell) => cell.id === "bonn");
    expect(covers(hamm ?? { id: "", rings: [] }, 1000, 0)).toBe(true);
    expect(covers(bonn ?? { id: "", rings: [] }, 482, 1000)).toBe(true);
  });
});
