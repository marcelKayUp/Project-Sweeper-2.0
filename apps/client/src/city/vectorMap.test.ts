import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { frame, spin, vectorScene } from "./vectorMap.ts";

const places = [
  { id: "nord", name: "Nord", x: 0, y: 0 },
  { id: "sued", name: "Süd", x: 40, y: 20 },
];
const streets = [
  { kind: "fern" as const, points: [{ x: 0, y: 0 }, { x: 40, y: 20 }] },
  { kind: "nah" as const, points: [{ x: 4, y: 2 }, { x: 8, y: 3 }, { x: 9, y: 7 }] },
];
const buildings = [
  { place: "nord", points: [{ x: 2, y: 2 }, { x: 6, y: 2 }, { x: 6, y: 5 }, { x: 2, y: 5 }] },
];

test("die Vektorkarte zeichnet Gebäudeflächen und beide Straßenklassen", () => {
  const source = readFileSync(new URL("./vectorMap.ts", import.meta.url), "utf8");
  assert.equal(source.includes("Math.random"), false);
  const scene = vectorScene(streets, buildings, places);
  assert.equal(scene.streets.length, 2);
  assert.equal(scene.streets.some((street) => street.kind === "nah"), true);
  assert.equal(scene.streets.some((street) => street.kind === "fern"), true);
  assert.equal(scene.paths.nah.startsWith("M "), true);
  assert.equal(scene.paths.fern.startsWith("M "), true);
  assert.equal(scene.buildings.length, 1);
  assert.equal(scene.buildings[0]?.points, "2,2 6,2 6,5 2,5");
  assert.equal(scene.buildings[0]?.fill.startsWith("#"), true);
  assert.equal(scene.buildings[0]?.fill.toLowerCase() === "#ffffff", false);
  assert.equal(scene.labels.map((label) => label.name).join(","), "Nord,Süd");
  assert.equal(scene.fullSpan > 40, true);

  const screen = readFileSync(new URL("./CityScreen.tsx", import.meta.url), "utf8");
  const css = readFileSync(new URL("../styles.css", import.meta.url), "utf8");
  assert.equal(screen.includes("cityCells"), false);
  assert.equal(screen.includes("stadt-cell"), false);
  assert.equal(screen.includes("stadt-building"), true);
  assert.equal(screen.includes('data-kind="nah"'), true);
  assert.equal(screen.includes("Blaue Flächen sind einzelne Gebäude."), true);
  assert.match(css, /\.stadt-street-fern,\s*\.stadt-street-nah \{[^}]*#ffffff/);
  assert.match(css, /\.stadt-street-nah \{[^}]*stroke-width:\s*1\.15/);
  assert.match(css, /\.stadt-street-fern \{[^}]*stroke-width:\s*2\.4/);
  assert.equal(/\.stadt-building \{[^}]*#ffffff/.test(css), false);
});

test("Drehung um die Kartenmitte trifft bei Winkel 0 die Ausgangslage", () => {
  assert.deepEqual(spin(14, 20, 10, 20, 0), { x: 14, y: 20 });
  const quarter = spin(14, 20, 10, 20, Math.PI / 2);
  assert.equal(Math.abs(quarter.x - 10) < 1e-9, true);
  assert.equal(Math.abs(quarter.y - 24) < 1e-9, true);
  const back = spin(quarter.x, quarter.y, 10, 20, -Math.PI / 2);
  assert.equal(Math.abs(back.x - 14) < 1e-9, true);
  assert.equal(Math.abs(back.y - 20) < 1e-9, true);

  const rest = vectorScene(streets, buildings, places);
  assert.equal(vectorScene(streets, buildings, places, 0).buildings[0]?.points, rest.buildings[0]?.points);
  const turned = vectorScene(streets, buildings, places, Math.PI / 2);
  assert.equal(turned.buildings[0]?.points === rest.buildings[0]?.points, false);
  assert.equal(frame(rest.center, 20, 10, 40, 0), `${20 - 20} ${10 - 20} 40 40`);
});
