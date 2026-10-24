import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { cityPicture } from "./cityPicture.ts";

test("die Darstellung übernimmt nur Knoten und Kanten", () => {
  const picture = cityPicture(
    [
      { id: "nord", name: "Nord", x: 0, y: 0 },
      { id: "sued", name: "Süd", x: 10, y: 20 },
    ],
    [
      { id: "kante", from: "nord", to: "sued" },
      { id: "leer", from: "nord", to: "fehlt" },
    ],
  );
  assert.deepEqual(picture.blocks, [
    { id: "nord", name: "Nord", x: 0, y: 0 },
    { id: "sued", name: "Süd", x: 10, y: 20 },
  ]);
  assert.deepEqual(picture.streets, [{ id: "kante", x1: 0, y1: 0, x2: 10, y2: 20 }]);
  assert.equal(picture.viewBox, "-48 -48 106 116");

  const screen = readFileSync(new URL("./CityScreen.tsx", import.meta.url), "utf8");
  assert.equal(/@babylonjs|phaser|colyseus|ghostFloor|mission\.ts/.test(screen), false);
  assert.equal(screen.includes("vectorScene(RHEIN_RUHR_STREETS, RHEIN_RUHR_BUILDINGS, places, turn)"), true);
  assert.equal(screen.includes("RHEIN_RUHR.edges"), false);
});
