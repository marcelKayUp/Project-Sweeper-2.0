import { describe, expect, it } from "vitest";
import { actionAp, apBattle, previewMove } from "./index.ts";
import type { BattleMap, Cell } from "./types.ts";

function openMap(): BattleMap {
  return { width: 10, height: 10, walls: [], lowCover: [] };
}

describe("Aktionspunkte", () => {
  it("startet bei 8 AP, drei Schritte kosten 3, Rest 5, ein Schuss kostet 3", () => {
    const from: Cell = { x: 2, y: 2 };
    const path: Cell[] = [
      { x: 3, y: 2 },
      { x: 4, y: 2 },
      { x: 5, y: 2 },
    ];
    const preview = previewMove({ map: openMap(), blockers: [], from, path, prior: [] });

    expect(preview.maxAp).toBe(8);
    expect(preview.available).toBe(8);
    expect(preview.priorSpent).toBe(0);
    expect(preview.stepAp).toBe(1);
    expect(preview.legal).toBe(true);
    expect(preview.cost).toBe(3);
    expect(preview.remaining).toBe(5);
    expect(preview.markersNow).toHaveLength(8);
    expect(preview.markersNow.every((mark) => mark === "full")).toBe(true);
    expect(preview.markersAfter.filter((mark) => mark === "spent")).toHaveLength(3);
    expect(preview.markersAfter.filter((mark) => mark === "full")).toHaveLength(5);
    expect(actionAp("move")).toBe(1);
    expect(actionAp("shot")).toBe(3);
    expect(actionAp("aim")).toBe(1);
    expect(actionAp("reload")).toBe(2);
  });

  it("zeigt am Runner verbrauchte Marken und die Kosten des Wegs", () => {
    const battle = apBattle();
    const end = battle.preview.path[2];
    const tile = battle.preview.reachable.find((item) => item.x === end?.x && item.y === end?.y);

    expect(battle.preview.priorSpent).toBe(actionAp("shot"));
    expect(battle.preview.available).toBe(5);
    expect(battle.preview.path).toEqual([
      { x: 1, y: 4 },
      { x: 2, y: 4 },
      { x: 3, y: 4 },
    ]);
    expect(battle.preview.legal).toBe(true);
    expect(battle.preview.cost).toBe(3);
    expect(battle.preview.remaining).toBe(2);
    expect(tile?.cost).toBe(battle.preview.cost);
    expect(battle.preview.markersNow.filter((mark) => mark === "spent")).toHaveLength(3);
    expect(battle.preview.markersNow.filter((mark) => mark === "full")).toHaveLength(5);
    expect(battle.preview.markersAfter.filter((mark) => mark === "full")).toHaveLength(2);
    expect(battle.preview.reachable.some((item) => item.x === battle.enemy.x && item.y === battle.enemy.y)).toBe(false);
    expect(battle.preview.reachable.some((item) => item.x === battle.nix.x && item.y === battle.nix.y)).toBe(false);
  });

  it("bucht Wand, Figur und Schrägschritt nicht", () => {
    const map: BattleMap = { width: 8, height: 8, walls: [{ x: 4, y: 2 }], lowCover: [] };
    const from: Cell = { x: 2, y: 2 };
    const blocked = [
      previewMove({ map, blockers: [], from, path: [{ x: 3, y: 2 }, { x: 4, y: 2 }], prior: [] }),
      previewMove({ map, blockers: [{ x: 3, y: 2 }], from, path: [{ x: 3, y: 2 }], prior: [] }),
      previewMove({ map, blockers: [], from, path: [{ x: 3, y: 3 }], prior: [] }),
    ];
    for (const preview of blocked) {
      expect(preview.legal).toBe(false);
      expect(preview.cost).toBe(0);
      expect(preview.remaining).toBe(8);
      expect(preview.markersAfter.every((mark) => mark === "full")).toBe(true);
    }
  });

  it("behält die Restpunkte, wenn der Weg mehr kostet als vorhanden", () => {
    const preview = previewMove({
      map: openMap(),
      blockers: [],
      from: { x: 1, y: 1 },
      path: [
        { x: 2, y: 1 },
        { x: 3, y: 1 },
        { x: 4, y: 1 },
      ],
      prior: ["shot", "shot"],
    });
    expect(preview.available).toBe(2);
    expect(preview.cost).toBe(3);
    expect(preview.legal).toBe(false);
    expect(preview.remaining).toBe(2);
    expect(preview.markersAfter.filter((mark) => mark === "full")).toHaveLength(2);
  });

  it("verändert die Eingaben nicht", () => {
    const map = openMap();
    const from: Cell = { x: 2, y: 2 };
    const path: Cell[] = [{ x: 3, y: 2 }];
    const blockers: Cell[] = [{ x: 8, y: 8 }];
    const prior = ["aim"] as const;
    const before = JSON.stringify({ map, from, path, blockers, prior });
    previewMove({ map, blockers, from, path, prior });
    expect(JSON.stringify({ map, from, path, blockers, prior })).toBe(before);
  });
});
