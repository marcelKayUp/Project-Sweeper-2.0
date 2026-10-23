import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { RHEIN_RUHR, cityCells } from "@neon/sim";
import { cityPicture } from "./cityPicture.ts";
import { blockHeight, hologram, projectTurned, turnAround } from "./hologram.ts";

test("die Schrägansicht bleibt im Rahmen und hängt nur an der Knoten-ID", () => {
  assert.equal(blockHeight("bonn"), blockHeight("bonn"));
  assert.equal(blockHeight("hamm") >= 36 && blockHeight("hamm") <= 124, true);

  const source = readFileSync(new URL("./hologram.ts", import.meta.url), "utf8");
  assert.equal(source.includes("Math.random"), false);

  const scene = hologram(cityPicture(RHEIN_RUHR.nodes, RHEIN_RUHR.edges));
  assert.equal(scene.blocks.length, 32);
  assert.equal(scene.streets.length, 49);
  const [minX, minY, width, height] = scene.viewBox.split(" ").map(Number);
  const maxX = minX + width;
  const maxY = minY + height;
  const inside = (x: number, y: number) => x >= minX && x <= maxX && y >= minY && y <= maxY;
  for (const block of scene.blocks) {
    for (const face of block.faces) {
      for (const pair of face.points.split(" ")) {
        const [x, y] = pair.split(",").map(Number);
        assert.equal(inside(x, y), true, block.id);
      }
    }
  }
  for (const street of scene.streets) {
    assert.equal(inside(street.x1, street.y1) && inside(street.x2, street.y2), true, street.id);
    assert.equal(street.id.length > 0, true);
  }
  const bonn = scene.blocks.find((block) => block.id === "bonn");
  assert.equal(bonn?.roof.startsWith("#"), true);
  assert.equal(scene.cells.length, 0);
});

test("Voronoi-Zellen liegen in der Schrägansicht und bleiben im Rahmen", () => {
  const scene = hologram(cityPicture(RHEIN_RUHR.nodes, RHEIN_RUHR.edges), cityCells(RHEIN_RUHR.nodes));
  assert.equal(scene.blocks.length, 32);
  assert.equal(scene.streets.length, 49);
  assert.equal(scene.cells.length, 32);
  assert.equal(scene.cells.some((cell) => cell.id === "bonn"), true);
  assert.equal(new Set(scene.cells.map((cell) => cell.fill)).size > 8, true);
  assert.equal(scene.cells.some((cell) => cell.fill.toLowerCase() === "#ffffff"), false);
  assert.equal(sourceIncludesProjection(), true);

  const [minX, minY, width, height] = scene.viewBox.split(" ").map(Number);
  const maxX = minX + width;
  const maxY = minY + height;
  const inside = (x: number, y: number) => x >= minX && x <= maxX && y >= minY && y <= maxY;
  for (const cell of scene.cells) {
    assert.equal(cell.d.length > 0, true, cell.id);
    for (const token of cell.d.split(" ")) {
      if (token === "M" || token === "Z") continue;
      const [x, y] = token.split(",").map(Number);
      assert.equal(inside(x, y), true, cell.id);
    }
  }

  const screen = readFileSync(new URL("./CityScreen.tsx", import.meta.url), "utf8");
  const css = readFileSync(new URL("../styles.css", import.meta.url), "utf8");
  assert.equal(screen.includes("Straßenabfrage nicht bestätigt."), true);
  assert.equal(screen.includes("cityPicture(RHEIN_RUHR.nodes, RHEIN_RUHR.edges)"), true);
  const cellsAt = screen.indexOf('className="stadt-cells"');
  const streetsAt = screen.indexOf("data-edge={street.id}");
  const blocksAt = screen.indexOf('className="stadt-block"');
  assert.equal(cellsAt >= 0 && cellsAt < streetsAt && streetsAt < blocksAt, true);
  assert.match(css, /\.stadt line \{[^}]*#ffffff/);
  assert.match(css, /\.stadt-cell \{/);
  assert.equal(/\.stadt-cell \{[^}]*#ffffff/.test(css), false);
  assert.match(css, /place-items:\s*center/);
});

test("Drehung um die Kartenmitte trifft bei Winkel 0 die Ausgangslage", () => {
  assert.deepEqual(turnAround(14, 20, 10, 20, 0), { x: 14, y: 20 });
  const quarter = turnAround(14, 20, 10, 20, Math.PI / 2);
  assert.equal(Math.abs(quarter.x - 10) < 1e-9, true);
  assert.equal(Math.abs(quarter.y - 24) < 1e-9, true);

  const picture = cityPicture(RHEIN_RUHR.nodes, RHEIN_RUHR.edges);
  const cells = cityCells(RHEIN_RUHR.nodes);
  const rest = hologram(picture, cells);
  assert.deepEqual(hologram(picture, cells, 0), rest);

  const turned = hologram(picture, cells, Math.PI / 2);
  assert.equal(turned.blocks.length, 32);
  assert.equal(turned.streets.length, 49);
  assert.equal(turned.cells.length, 32);
  assert.equal(Math.abs(viewCenter(turned.viewBox).x - viewCenter(rest.viewBox).x) < 0.2, true);
  assert.equal(Math.abs(viewCenter(turned.viewBox).y - viewCenter(rest.viewBox).y) < 0.2, true);
  const restingRoof = rest.blocks.find((block) => block.id === "bonn")?.faces.find((face) => face.kind === "roof")?.points;
  const turnedRoof = turned.blocks.find((block) => block.id === "bonn")?.faces.find((face) => face.kind === "roof")?.points;
  assert.equal(turnedRoof !== restingRoof, true);
  assert.equal(insideView(turned, turnedRoof), true);
  assert.equal(wallsStand(turned), true);
});

test("ein Bodenpunkt dreht vor der Projektion und die Hochachse bleibt senkrecht", () => {
  const turn = Math.PI / 5;
  const foot = projectTurned(14, 23, 0, 10, 20, turn);
  const top = projectTurned(14, 23, 48, 10, 20, turn);
  assert.equal(foot.x, top.x);
  assert.equal(top.y, foot.y - 48);

  const spun = turnAround(14, 23, 10, 20, turn);
  assert.deepEqual(projectTurned(spun.x, spun.y, 0, 0, 0, 0), foot);
  assert.deepEqual(projectTurned(14, 23, 0, 10, 20, 0), projectTurned(14, 23, 0, 0, 0, 0));

  const origin = projectTurned(10, 20, 0, 10, 20, 0);
  const raised = projectTurned(14, 23, 48, 10, 20, 0);
  const tipped = turnAround(raised.x, raised.y, origin.x, origin.y, turn);
  assert.equal(Math.abs(tipped.x - top.x) > 0.5, true);
});

function viewCenter(viewBox: string): { x: number; y: number } {
  const [minX, minY, width, height] = viewBox.split(" ").map(Number);
  return { x: minX + width / 2, y: minY + height / 2 };
}

function wallsStand(scene: { blocks: readonly { faces: readonly { kind: string; points: string }[] }[] }): boolean {
  for (const block of scene.blocks) {
    for (const face of block.faces) {
      if (face.kind === "roof") continue;
      const points = face.points.split(" ").map((pair) => pair.split(",").map(Number));
      const groundA = points[0];
      const groundB = points[1];
      const roofB = points[2];
      const roofA = points[3];
      if (!groundA || !groundB || !roofB || !roofA) return false;
      if (groundA[0] !== roofA[0] || groundB[0] !== roofB[0]) return false;
      if (!(roofA[1] < groundA[1] && roofB[1] < groundB[1])) return false;
    }
  }
  return true;
}

function insideView(scene: { viewBox: string }, points: string | undefined): boolean {
  if (!points) return false;
  const [minX, minY, width, height] = scene.viewBox.split(" ").map(Number);
  const maxX = minX + width;
  const maxY = minY + height;
  for (const pair of points.split(" ")) {
    const [x, y] = pair.split(",").map(Number);
    if (x < minX || x > maxX || y < minY || y > maxY) return false;
  }
  return true;
}

function sourceIncludesProjection(): boolean {
  const source = readFileSync(new URL("./hologram.ts", import.meta.url), "utf8");
  return source.includes("project(point.x, point.y, 0)") && !source.includes("Math.random");
}
