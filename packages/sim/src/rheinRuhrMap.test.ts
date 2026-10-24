import { describe, expect, it } from "vitest";
import { RHEIN_RUHR, RHEIN_RUHR_PLACES } from "./rheinRuhr.ts";
import { RHEIN_RUHR_BUILDINGS, RHEIN_RUHR_MAP_SOURCE, RHEIN_RUHR_STREETS, rheinRuhrMapPoint } from "./rheinRuhrMap.ts";

describe("Rhein-Ruhr-Vektorkarte", () => {
  it("legt Gebäude und kleinere Straßen als Ganzzahlen ab", () => {
    expect(RHEIN_RUHR_MAP_SOURCE.roadsLive).toBe("ja");
    expect(RHEIN_RUHR_MAP_SOURCE.buildingsLive).toBe("ja");
    expect(RHEIN_RUHR_MAP_SOURCE.license).toBe("ODbL-1.0");
    expect(RHEIN_RUHR.edges).toHaveLength(49);
    expect(RHEIN_RUHR_STREETS.some((street) => street.kind === "fern" && street.points.length >= 2)).toBe(true);
    expect(RHEIN_RUHR_STREETS.some((street) => street.kind === "nah" && street.points.length >= 2)).toBe(true);
    expect(RHEIN_RUHR_BUILDINGS.length).toBeGreaterThan(RHEIN_RUHR.nodes.length);
    for (const place of RHEIN_RUHR_PLACES) {
      expect(RHEIN_RUHR_BUILDINGS.some((building) => building.place === place.id && building.points.length >= 3)).toBe(true);
    }
    for (const street of RHEIN_RUHR_STREETS) {
      for (const point of street.points) {
        expect(Number.isInteger(point.x)).toBe(true);
        expect(Number.isInteger(point.y)).toBe(true);
      }
    }
    for (const building of RHEIN_RUHR_BUILDINGS) {
      for (const point of building.points) {
        expect(Number.isInteger(point.x)).toBe(true);
        expect(Number.isInteger(point.y)).toBe(true);
      }
    }
    expect(rheinRuhrMapPoint(7.0158171, 51.4582235)).toEqual({ x: 4195, y: 2358 });
  });
});
