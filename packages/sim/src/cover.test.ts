import { describe, expect, it } from "vitest";
import { deckungFixture, previewShot } from "./index.ts";
import type { BattleMap, Cell } from "./types.ts";

const target: Cell = { x: 5, y: 5 };

function mapWith(walls: readonly Cell[], protects: "e" | "n" = "e"): BattleMap {
  return {
    width: 20,
    height: 20,
    walls,
    lowCover: [{ id: "same", x: target.x, y: target.y, protects }],
  };
}

describe("gerichtete Deckung", () => {
  it("dieselbe niedrige Deckung senkt die Chance nur aus der geschützten Richtung", () => {
    const map = mapWith([]);
    const fromProtected = previewShot(map, { x: 9, y: 5 }, target, 0);
    const fromOpen = previewShot(map, { x: 1, y: 5 }, target, 0);

    expect(fromProtected.blocked).toBe(false);
    expect(fromOpen.blocked).toBe(false);
    expect(fromProtected.distance).toBe(4);
    expect(fromOpen.distance).toBe(4);
    expect(fromProtected.coverPenalty).toBe(25);
    expect(fromOpen.coverPenalty).toBe(0);
    expect(fromProtected.protectedEdgeCrossed).toBe(true);
    expect(fromOpen.protectedEdgeCrossed).toBe(false);
    expect(fromProtected.chance).toBe(40);
    expect(fromOpen.chance).toBe(65);
    expect(fromProtected.chance).toBeLessThan(fromOpen.chance ?? 0);
    expect((fromOpen.chance ?? 0) - (fromProtected.chance ?? 0)).toBe(25);
  });

  it("eine Wand blockiert den Schuss", () => {
    const from = { x: 7, y: 2 };
    const to = { x: 15, y: 2 };
    const blocked = previewShot(mapWith([{ x: 12, y: 2 }]), from, to, 0);
    const open = previewShot(mapWith([]), from, to, 0);

    expect(blocked.blocked).toBe(true);
    expect(blocked.chance).toBeNull();
    expect(blocked.blocker).toEqual({ x: 12, y: 2 });
    expect(blocked.impact).toMatchObject({ kind: "edge", edge: "w", xMilli: 12000, yMilli: 2500 });
    expect(open.blocked).toBe(false);
    expect(open.chance).toBe(45);
  });

  it("stapelt mehrere niedrige Kanten nicht", () => {
    const map: BattleMap = {
      width: 10,
      height: 10,
      walls: [],
      lowCover: [
        { id: "ost", x: 4, y: 4, protects: "e" },
        { id: "nord", x: 4, y: 4, protects: "n" },
      ],
    };
    const shot = previewShot(map, { x: 5, y: 3 }, { x: 4, y: 4 }, 0);
    expect(shot.blocked).toBe(false);
    expect(shot.coverPenalty).toBe(25);
    expect(shot.chance).toBe(45);
  });

  it("begrenzt die Chance auf 10 bis 95", () => {
    const bare: BattleMap = { width: 20, height: 20, walls: [], lowCover: [] };
    const far = previewShot(bare, { x: 0, y: 0 }, { x: 0, y: 16 }, 0);
    const aimed = previewShot(bare, { x: 0, y: 0 }, { x: 0, y: 1 }, 80);
    expect(far.distance).toBe(16);
    expect(far.raw).toBe(5);
    expect(far.chance).toBe(10);
    expect(far.clamped).toBe(true);
    expect(aimed.raw).toBe(150);
    expect(aimed.chance).toBe(95);
    expect(aimed.clamped).toBe(true);
  });

  it("verändert die Eingaben nicht", () => {
    const map = mapWith([{ x: 3, y: 3 }]);
    const from = { x: 9, y: 5 };
    const before = JSON.stringify({ map, from, target });
    previewShot(map, from, target, 0);
    expect(JSON.stringify({ map, from, target })).toBe(before);
  });

  it("blockiert eine berührte undurchsichtige Ecke aus beiden Richtungen", () => {
    const map: BattleMap = { width: 6, height: 6, walls: [{ x: 1, y: 0 }], lowCover: [] };
    const going = previewShot(map, { x: 0, y: 0 }, { x: 1, y: 1 }, 0);
    const returning = previewShot(map, { x: 1, y: 1 }, { x: 0, y: 0 }, 0);
    expect(going.blocked).toBe(true);
    expect(returning.blocked).toBe(true);
    expect(going.chance).toBeNull();
    expect(returning.chance).toBeNull();
  });

  it("liefert die Werte der Gefechtsansicht", () => {
    const incoming = previewShot(deckungFixture.map, deckungFixture.enemy, deckungFixture.runner, 0);
    const blocked = previewShot(deckungFixture.map, deckungFixture.nix, deckungFixture.blockedTarget, 0);
    expect(incoming.chance).toBe(40);
    expect(incoming.base).toBe(70);
    expect(incoming.distancePenalty).toBe(5);
    expect(incoming.coverPenalty).toBe(25);
    expect(incoming.aimBonus).toBe(0);
    expect(blocked.blocked).toBe(true);
    expect(blocked.chance).toBeNull();
    expect(blocked.impact).toMatchObject({ kind: "edge", edge: "w", cell: { x: 7, y: 1 } });
  });
});
