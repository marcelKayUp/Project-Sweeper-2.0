import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { CREW_AP, pathTo } from "./index.ts";
import { applyFlatEnd, applyFlatMove, createFlatWalk, flatChecksum, flatPath, flatReachable } from "./index.ts";
import type { Cell } from "./types.ts";

const LONG_PATH: readonly Cell[] = [
  { x: 2, y: 1 },
  { x: 3, y: 1 },
  { x: 4, y: 1 },
  { x: 5, y: 1 },
  { x: 6, y: 1 },
  { x: 7, y: 1 },
  { x: 7, y: 2 },
  { x: 7, y: 3 },
];

describe("Flaches Raster", () => {
  it("startet einen Runner mit vollen Aktionspunkten", () => {
    const state = createFlatWalk();
    expect(state.actor).toEqual({ id: "runner", x: 1, y: 1, ap: CREW_AP });
    expect(state.round).toBe(1);
    expect(state.map.width).toBe(8);
    expect(state.map.height).toBe(8);
    expect(flatReachable(state).some((cell) => cell.x === 3 && cell.y === 3)).toBe(false);
    expect(flatReachable(state).some((cell) => cell.x === 1 && cell.y === 0 && cell.cost === 1)).toBe(true);
  });

  it("bucht einen orthogonalen Weg und senkt die Aktionspunkte", () => {
    const state = createFlatWalk();
    const step = applyFlatMove(state, [
      { x: 2, y: 1 },
      { x: 2, y: 2 },
    ]);
    expect(step.rejection).toBeNull();
    expect(step.state.actor).toEqual({ id: "runner", x: 2, y: 2, ap: 6 });
    expect(step.state.revision).toBe(1);
    expect(step.state.map).toBe(state.map);
    expect(state.actor).toEqual({ id: "runner", x: 1, y: 1, ap: CREW_AP });
  });

  it("lehnt Wand, Rand, Schrägschritt, Doppelbesuch und leeren Weg ab", () => {
    const state = createFlatWalk();
    const rejected = [
      applyFlatMove(state, [
        { x: 2, y: 1 },
        { x: 3, y: 1 },
        { x: 3, y: 2 },
        { x: 3, y: 3 },
      ]),
      applyFlatMove(state, [
        { x: 1, y: 0 },
        { x: 1, y: -1 },
      ]),
      applyFlatMove(state, [{ x: 2, y: 2 }]),
      applyFlatMove(state, [
        { x: 2, y: 1 },
        { x: 1, y: 1 },
      ]),
      applyFlatMove(state, []),
    ];
    expect(rejected.map((step) => step.rejection)).toEqual([
      "Feld ist blockiert.",
      "Ziel liegt außerhalb.",
      "Nur orthogonale Nachbarfelder.",
      "Der Weg betritt ein Feld doppelt.",
      "Kein Schritt.",
    ]);
    for (const step of rejected) expect(step.state).toBe(state);
  });

  it("behält den Stand, wenn der Weg mehr kostet als vorhanden", () => {
    const state = createFlatWalk();
    const spent = applyFlatMove(state, LONG_PATH);
    expect(spent.rejection).toBeNull();
    expect(spent.state.actor.ap).toBe(0);
    expect(flatReachable(spent.state)).toEqual([]);
    const extra = applyFlatMove(spent.state, [{ x: 7, y: 4 }]);
    expect(extra.rejection).toBe("Zu wenig Aktionspunkte.");
    expect(extra.state).toBe(spent.state);
  });

  it("beendet die Runde und füllt die Aktionspunkte auf das Maximum", () => {
    const spent = applyFlatMove(createFlatWalk(), LONG_PATH);
    expect(spent.state.actor.ap).toBe(0);
    const first = applyFlatEnd(spent.state);
    const second = applyFlatEnd(spent.state);
    expect(first.rejection).toBeNull();
    expect(first.state.actor).toEqual({ id: "runner", x: 7, y: 3, ap: CREW_AP });
    expect(first.state.round).toBe(2);
    expect(first.state.revision).toBe(2);
    expect(second.state.round).toBe(2);
    expect(second.state.actor.ap).toBe(CREW_AP);
    expect(flatChecksum(first.state)).toBe(flatChecksum(second.state));
    expect(spent.state.round).toBe(1);
    expect(spent.state.actor.ap).toBe(0);
    const full = applyFlatEnd(createFlatWalk());
    expect(full.state.actor.ap).toBe(CREW_AP);
    expect(full.state.round).toBe(2);
    const next = applyFlatMove(first.state, [{ x: 7, y: 4 }]);
    expect(next.rejection).toBeNull();
    expect(next.state.actor.ap).toBe(7);
    expect(next.state.round).toBe(2);
  });

  it("liefert für denselben Eingabestrom denselben Hash", () => {
    expect(play()).toBe(play());
    const moved = applyFlatMove(createFlatWalk(), [{ x: 2, y: 1 }]);
    expect(flatChecksum(moved.state)).not.toBe(flatChecksum(createFlatWalk()));
  });

  it("verändert die Eingaben nicht", () => {
    const state = createFlatWalk();
    const path: Cell[] = [{ x: 2, y: 1 }];
    const before = JSON.stringify({ actor: state.actor, path, walls: state.map.walls });
    applyFlatMove(state, path);
    expect(JSON.stringify({ actor: state.actor, path, walls: state.map.walls })).toBe(before);
  });

  it("löst zwei Wege vom selben Stand unabhängig aus", () => {
    const state = createFlatWalk();
    const east = applyFlatMove(state, [{ x: 2, y: 1 }]);
    const north = applyFlatMove(state, [{ x: 1, y: 0 }]);
    expect(east.state.actor).toEqual({ id: "runner", x: 2, y: 1, ap: 7 });
    expect(north.state.actor).toEqual({ id: "runner", x: 1, y: 0, ap: 7 });
    expect(state.actor.ap).toBe(CREW_AP);
  });

  it("wählt bei gleich langem Weg zuerst Norden und umgeht belegte Felder", () => {
    const state = createFlatWalk();
    expect(flatPath(state, { x: 2, y: 0 })).toEqual([
      { x: 1, y: 0 },
      { x: 2, y: 0 },
    ]);
    const around = pathTo(
      { width: 5, height: 5, walls: [], lowCover: [] },
      [{ x: 2, y: 1 }],
      { x: 1, y: 1 },
      { x: 3, y: 1 },
      4,
    );
    expect(around).toEqual([
      { x: 1, y: 0 },
      { x: 2, y: 0 },
      { x: 3, y: 0 },
      { x: 3, y: 1 },
    ]);
    expect(around?.some((cell) => cell.x === 2 && cell.y === 1)).toBe(false);
    expect(pathTo({ width: 4, height: 1, walls: [], lowCover: [] }, [], { x: 0, y: 0 }, { x: 3, y: 0 }, 2)).toBeNull();
  });
});

describe("Regelkern", () => {
  it("importiert keine Ansicht, kein Netzwerk und keinen Zufall", () => {
    const dir = dirname(fileURLToPath(import.meta.url));
    const files = readdirSync(dir).filter((name) => name.endsWith(".ts") && !name.endsWith(".test.ts"));
    const forbidden = /from ["'](?:@babylonjs|phaser|react|react-dom|@colyseus|colyseus|@neon\/bots)/;
    for (const name of files) {
      const source = readFileSync(join(dir, name), "utf8");
      expect(`${name}:${forbidden.test(source)}`).toBe(`${name}:false`);
      expect(`${name}:${/\bDate\.now\s*\(/.test(source)}`).toBe(`${name}:false`);
      expect(`${name}:${/\bMath\.random\s*\(/.test(source)}`).toBe(`${name}:false`);
    }
  });
});

function play(): string {
  let state = createFlatWalk();
  const step = applyFlatMove(state, LONG_PATH);
  expect(step.rejection).toBeNull();
  state = step.state;
  const extra = applyFlatMove(state, [{ x: 7, y: 4 }]);
  expect(extra.rejection).toBe("Zu wenig Aktionspunkte.");
  return flatChecksum(extra.state);
}
