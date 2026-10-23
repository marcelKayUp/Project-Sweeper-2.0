import assert from "node:assert/strict";
import test from "node:test";
import { BODY_HP, createMissionState, freshParts, projectTeam } from "@neon/sim";
import { ghostFloorSpec } from "@neon/sim/ghost-floor";
import {
  actionOffers,
  confirmedPose,
  floorLabel,
  moveWish,
  overviewCells,
  shownFloor,
  poseAfterSkip,
  readTacticalStand,
  remainingSeconds,
  shotPreview,
  stepTargets,
  tacticalBoard,
  type TacticalStand,
  type TacticalUnit,
} from "./tactical.ts";

test("die Karte und die Übersicht enthalten nur die bestätigte Teamsicht", () => {
  const spec = ghostFloorSpec({ kite: "rifle", voss: "sidearm", nera: "rifle", sol: "rifle" });
  const full = createMissionState(spec, 1);
  const hidden = full.units.filter((unit) => unit.team === "enemy").map((unit) => unit.id);
  const view = projectTeam(full, spec);
  const stand = readTacticalStand(payload(view));
  assert.ok(stand);
  const board = tacticalBoard(stand, { selectedId: "kite", targetId: "", showSteps: true });
  const overview = overviewCells(stand);
  const known = new Set(stand.knownCells.map((cell) => `${cell.x},${cell.y}`));
  for (const floor of board.floors) assert.equal(known.has(`${floor.x},${floor.y}`), true);
  for (const cell of overview) assert.equal(known.has(`${cell.x},${cell.y}`), true);
  const drawn = new Set([...board.units.map((unit) => unit.id), ...overview.map((cell) => cell.unitId)]);
  for (const id of hidden) assert.equal(drawn.has(id), false);
  assert.equal(board.units.every((unit) => !("route" in unit)), true);
});

test("ein versteckter Gegner im Payload wird nicht gezeichnet", () => {
  const stand = sample();
  const hidden = unit("wache-haupt", "enemy", 3, 3);
  const parsed = readTacticalStand({
    ...stand,
    units: [...stand.units, hidden],
  });
  assert.ok(parsed);
  assert.equal(parsed.units.some((item) => item.id === "wache-haupt"), false);
  const board = tacticalBoard(parsed, { selectedId: "kite", targetId: "", showSteps: false });
  assert.equal(board.units.some((item) => item.id === "wache-haupt"), false);
  assert.equal(overviewCells(parsed).some((cell) => cell.unitId === "wache-haupt"), false);
});

test("die Vorschau ändert keine Trefferpunkte und der Sprung zeigt den bestätigten Stand", () => {
  const stand = sample();
  const before = confirmedPose(stand);
  const text = shotPreview(stand, "kite", "gegner-nah");
  assert.equal(text.includes("Vorschau"), true);
  assert.equal(text.includes("Prozent"), true);
  assert.deepEqual(confirmedPose(stand), before);
  const skipped = poseAfterSkip(before);
  assert.deepEqual(skipped, before);
  assert.notEqual(skipped[0], before[0]);
  assert.equal(skipped[0]?.hp, BODY_HP);
  assert.equal(skipped[0]?.x, 1);
  const steps = stepTargets(stand, "kite");
  assert.deepEqual(steps, [
    { x: 0, y: 1 },
    { x: 2, y: 1 },
  ]);
  assert.equal(steps.some((cell) => cell.x === 1 && cell.y === 0), false);
  assert.equal(steps.some((cell) => cell.x === 1 && cell.y === 2), false);
  assert.equal(actionOffers(stand, "gegner-nah").shoot, true);
  assert.equal(stand.units[0]?.ap, 8);
});

test("eine fehlende Etagenliste bleibt eine Ebene", () => {
  const spec = ghostFloorSpec({ kite: "rifle", voss: "sidearm", nera: "rifle", sol: "rifle" });
  const stand = readTacticalStand(payload(projectTeam(createMissionState(spec, 1), spec)));
  assert.ok(stand);
  assert.equal(stand.levelCount, 1);
  assert.equal(stand.floors.length, 1);
  assert.equal(floorLabel(stand.levelCount, 0), "eine Ebene");
  assert.equal(floorLabel(2, 1), "Ebene 2 von 2");
});

test("die Übersicht unterscheidet Treppe und beide Aufzüge, der Klick sendet Bewegung", () => {
  const base = sample();
  const links = [
    { id: "stair", kind: "stair" as const, x: 1, y: 1, toZ: 1, toX: 1, toY: 1 },
    { id: "passenger", kind: "passenger" as const, x: 0, y: 1, toZ: 1, toX: 0, toY: 1 },
    { id: "freight", kind: "freight" as const, x: 2, y: 1, toZ: 1, toX: 2, toY: 1 },
  ];
  const upperKnown = [
    { x: 1, y: 1 },
    { x: 2, y: 1 },
  ];
  const stand = {
    ...base,
    levelCount: 2,
    links,
    floors: [
      { ...base.floors[0]!, links },
      { z: 1, knownCells: upperKnown, visibleCells: upperKnown, walls: [], lowCover: [], links },
    ],
    units: [...base.units, unit("voss", "crew", 2, 1, 1)],
  };
  const kinds = new Set(overviewCells(shownFloor(stand, 0)).map((cell) => cell.kind));
  assert.equal(kinds.has("passenger"), true);
  assert.equal(kinds.has("freight"), true);
  assert.equal(kinds.has("stair"), false);
  const upstairs = shownFloor(stand, 1);
  assert.equal(upstairs.units.every((item) => item.z === 1), true);
  assert.equal(new Set(overviewCells(upstairs).map((cell) => cell.kind)).has("stair"), true);
  assert.deepEqual(links.map((link) => link.kind).sort(), ["freight", "passenger", "stair"]);
  assert.deepEqual(moveWish(stand, "kite", { x: 1, y: 1 }), { kind: "move", x: 1, y: 1, z: 1 });
  assert.deepEqual(moveWish(stand, "kite", { x: 0, y: 1 }), { kind: "move", x: 0, y: 1 });
  assert.equal(moveWish(stand, "kite", { x: 3, y: 3 }), null);
});

test("die Restzeit kommt nur aus der gesetzten Frist", () => {
  assert.equal(remainingSeconds(5_000, 3_200), 2);
  assert.equal(remainingSeconds(5_000, 5_000), 0);
  assert.equal(remainingSeconds(0, 5_000), null);
  assert.equal(remainingSeconds(5_000, 5.5), null);
});

function payload(view: ReturnType<typeof projectTeam>) {
  return {
    ownRunnerId: "kite",
    round: view.round,
    phase: view.phase,
    copies: view.copies,
    doorOpen: view.doorOpen,
    phaseSeconds: 90,
    deadlineAt: 0,
    width: view.width,
    height: view.height,
    knownCells: view.knownCells,
    visibleCells: view.visibleCells,
    walls: view.walls,
    lowCover: view.lowCover,
    terminal: view.terminal,
    door: view.door,
    extraction: view.extraction,
    units: view.units,
    levelCount: view.levelCount,
    floors: view.floors,
  };
}

function sample(): TacticalStand {
  const known = [
    { x: 0, y: 1 },
    { x: 1, y: 1 },
    { x: 2, y: 1 },
    { x: 1, y: 0 },
    { x: 1, y: 2 },
  ];
  return {
    ownRunnerId: "kite",
    round: 1,
    phase: "crew",
    copies: 0,
    doorOpen: false,
    phaseSeconds: 90,
    deadlineAt: 10_000,
    width: 4,
    height: 4,
    knownCells: known,
    visibleCells: known,
    walls: [{ x: 1, y: 0 }],
    lowCover: [],
    terminal: null,
    door: null,
    extraction: [],
    units: [unit("kite", "crew", 1, 1), unit("gegner-nah", "enemy", 1, 2)],
    levelCount: 1,
    floors: [{ z: 0, knownCells: known, visibleCells: known, walls: [{ x: 1, y: 0 }], lowCover: [], links: [] }],
    links: [],
  };
}

function unit(id: string, team: "crew" | "enemy", x: number, y: number, z = 0): TacticalUnit {
  return {
    id,
    name: id === "kite" ? "Kite" : "Gegner Nah",
    team,
    weapon: "rifle",
    x,
    y,
    z,
    hp: BODY_HP,
    maxHp: BODY_HP,
    parts: freshParts(),
    ap: 8,
    range: 10,
    magazine: 6,
    magazineSize: 6,
    reserveMagazines: 2,
    status: "active",
    ready: false,
    aiming: false,
    medkits: team === "crew" ? 1 : 0,
    overwatch: null,
  };
}
