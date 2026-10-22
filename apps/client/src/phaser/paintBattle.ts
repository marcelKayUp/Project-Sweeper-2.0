import type { Cell } from "@neon/sim";
import Phaser from "phaser";
import type { DeckungFrame } from "../battle/frame.ts";
import { CELL, cellCenter, coverSprite, milliToPixel, type CoverSprite } from "../battle/layout.ts";

const WALL_LIFT = Math.round(CELL * 0.34);
const U = CELL / 82;

export function paintBattle(scene: Phaser.Scene, frame: DeckungFrame): void {
  const g = scene.add.graphics();
  g.setDepth(0);
  const cover = frame.map.lowCover.find((item) => item.x === frame.runner.x && item.y === frame.runner.y);
  const sprite = cover ? coverSprite(cover, cover.protects) : null;
  const enemy = cellCenter(frame.enemy);
  const nix = cellCenter(frame.nix);
  const runner = sprite
    ? { x: sprite.x + sprite.w * 0.46, y: sprite.y + sprite.h * 0.56 }
    : cellCenter(frame.runner);

  drawFloor(g);
  drawWalls(g, frame.map.walls);
  drawPlant(g, 86, 900);
  drawHatch(g, 1688, 860);

  drawCrouchedCrew(g, runner.x, runner.y);
  drawStanding(g, enemy.x, enemy.y, -1, "hostile");
  drawStanding(g, nix.x, nix.y, 1, "crew");
  if (sprite) drawLowCover(g, sprite);

  const enemyMuzzle = { x: enemy.x - 58 * U, y: enemy.y - 8 * U };
  const runnerBody = { x: runner.x - 46 * U, y: runner.y + 2 * U };
  const nixMuzzle = { x: nix.x + 54 * U, y: nix.y - 6 * U };
  drawRifle(g, enemy.x - 8 * U, enemy.y - 4 * U, enemyMuzzle.x, enemyMuzzle.y);
  drawRifle(g, nix.x + 8 * U, nix.y - 2 * U, nixMuzzle.x, nixMuzzle.y);
  if (sprite) {
    drawRifle(g, sprite.x + sprite.w - 16, runner.y - 8 * U, sprite.x + sprite.w + 92, runner.y - 12 * U);
    drawCoverPeek(g, sprite.x + 2, runner.y);
  }

  if (!frame.incoming.blocked) drawPenaltyShot(g, enemyMuzzle, runnerBody);
  if (frame.blocked.blocked) {
    drawBlockedShot(g, nixMuzzle, {
      x: milliToPixel(frame.blocked.impact.xMilli),
      y: milliToPixel(frame.blocked.impact.yMilli),
    });
  }
  drawReadout(scene, g, frame, runner, sprite);
}

function drawFloor(g: Phaser.GameObjects.Graphics): void {
  g.fillStyle(0x12161c, 1);
  g.fillRect(0, 0, 1920, 1080);
  const cols = Math.ceil(1920 / CELL);
  const rows = Math.ceil(1080 / CELL);
  for (let y = 0; y < rows; y += 2) {
    for (let x = 0; x < cols; x += 2) {
      g.lineStyle(1, 0x2c3544, 0.28);
      g.strokeRect(x * CELL + 22, y * CELL + 22, CELL * 2 - 44, CELL * 2 - 44);
    }
  }
}

function drawWalls(g: Phaser.GameObjects.Graphics, walls: readonly Cell[]): void {
  if (walls.length === 0) return;
  let minX = walls[0]?.x ?? 0;
  let minY = walls[0]?.y ?? 0;
  let maxX = minX;
  let maxY = minY;
  for (const wall of walls) {
    if (wall.x < minX) minX = wall.x;
    if (wall.y < minY) minY = wall.y;
    if (wall.x > maxX) maxX = wall.x;
    if (wall.y > maxY) maxY = wall.y;
  }
  const left = minX * CELL;
  const right = (maxX + 1) * CELL;
  const top = minY * CELL - WALL_LIFT;
  const foot = (maxY + 1) * CELL;

  g.fillStyle(0x000000, 0.5);
  g.fillRect(left + 28, foot - 6, right - left + 10, 52);
  g.fillStyle(0x667384, 1);
  g.fillRect(left, top, right - left, foot - top - 4);
  g.fillStyle(0x1e252f, 1);
  g.fillRect(left, foot - 18, right - left, WALL_LIFT + 8);
  g.fillStyle(0x151b24, 1);
  g.fillRect(left, top, 38, foot - top + 10);
  g.fillStyle(0xf7f9fc, 1);
  g.fillRect(left, top + 10, 6, foot - top - 12);
  for (let y = top + 78; y < foot - WALL_LIFT; y += 78) {
    strokeLine(g, left + 52, y, right - 18, y, 2, 0x3c4656, 0.9);
  }
  strokeLine(g, left + 26, top + 3, right - 8, top + 3, 3, 0xc5d0dc, 0.85);
}

function drawPlant(g: Phaser.GameObjects.Graphics, x: number, y: number): void {
  g.fillStyle(0x000000, 0.35);
  g.fillCircle(x, y + 14, 26);
  g.fillStyle(0x5a4036, 1);
  g.fillRect(x - 16, y + 2, 32, 22);
  g.fillStyle(0x1c5848, 1);
  g.fillCircle(x, y - 12, 22);
  g.fillCircle(x - 16, y - 2, 14);
  g.fillCircle(x + 16, y - 6, 15);
}

function drawHatch(g: Phaser.GameObjects.Graphics, x: number, y: number): void {
  g.lineStyle(2, 0x3a4454, 0.9);
  g.strokeRect(x, y, 70, 46);
  strokeLine(g, x + 10, y + 12, x + 60, y + 12, 2, 0x3a4454, 0.9);
  strokeLine(g, x + 10, y + 24, x + 60, y + 24, 2, 0x3a4454, 0.9);
  strokeLine(g, x + 10, y + 36, x + 60, y + 36, 2, 0x3a4454, 0.9);
}

function drawCrouchedCrew(g: Phaser.GameObjects.Graphics, x: number, y: number): void {
  g.fillStyle(0x000000, 0.48);
  g.fillCircle(x - 8 * U, y + 14 * U, 24 * U);
  fillPoly(g, [
    [x - 8 * U, y + 6 * U],
    [x - 58 * U, y + 26 * U],
    [x - 46 * U, y + 38 * U],
    [x + 2 * U, y + 16 * U],
  ], 0x143e4e);
  fillPoly(g, [
    [x - 2 * U, y - 8 * U],
    [x - 52 * U, y - 22 * U],
    [x - 38 * U, y - 34 * U],
    [x + 6 * U, y - 12 * U],
  ], 0x185868);
  fillPoly(g, [
    [x - 42 * U, y - 16 * U],
    [x + 28 * U, y - 18 * U],
    [x + 32 * U, y + 16 * U],
    [x - 36 * U, y + 18 * U],
  ], 0x1d6d82);
  g.fillStyle(0x9af2ff, 1);
  g.fillRect(x - 34 * U, y - 4 * U, 24 * U, 5 * U);
  g.fillStyle(0x102830, 1);
  g.fillCircle(x + 30 * U, y - 8 * U, 16 * U);
  g.fillStyle(0xd8fbff, 1);
  g.fillRect(x + 20 * U, y - 12 * U, 18 * U, 5 * U);
  g.lineStyle(3, 0xe7fdff, 1);
  g.strokeCircle(x - 22 * U, y - 2 * U, 7 * U);
}

function drawStanding(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  facing: 1 | -1,
  kind: "crew" | "hostile",
): void {
  const cloth = kind === "crew" ? 0x1d6d82 : 0x8a3144;
  const deep = kind === "crew" ? 0x143e4e : 0x541f2c;
  const visor = kind === "crew" ? 0xd8fbff : 0xffd0da;
  g.fillStyle(0x000000, 0.42);
  g.fillCircle(x, y + 18 * U, 22 * U);
  g.fillStyle(deep, 1);
  g.fillRect(x - 16 * U, y + 4 * U, 12 * U, 36 * U);
  g.fillRect(x + 6 * U, y + 6 * U, 12 * U, 34 * U);
  g.fillStyle(0x2a211c, 1);
  g.fillRect(x - 20 * U, y + 36 * U, 18 * U, 10 * U);
  g.fillRect(x + 4 * U, y + 36 * U, 18 * U, 10 * U);
  fillPoly(g, [
    [x - 24 * U, y - 16 * U],
    [x + 24 * U, y - 18 * U],
    [x + 20 * U, y + 20 * U],
    [x - 20 * U, y + 18 * U],
  ], cloth);
  g.fillStyle(0x121820, 1);
  g.fillCircle(x + facing * 22 * U, y - 24 * U, 15 * U);
  if (kind === "crew") {
    g.fillStyle(visor, 1);
    g.fillRect(x + facing * 12 * U, y - 28 * U, 18 * U, 5 * U);
    g.lineStyle(3, 0xe7fdff, 1);
    g.strokeCircle(x - facing * 4 * U, y - 2 * U, 7 * U);
  } else {
    fillPoly(g, [
      [x + facing * 22 * U, y - 36 * U],
      [x + facing * 34 * U, y - 24 * U],
      [x + facing * 22 * U, y - 12 * U],
      [x + facing * 10 * U, y - 24 * U],
    ], visor);
    fillPoly(g, [
      [x, y - 10 * U],
      [x + 9 * U, y],
      [x, y + 10 * U],
      [x - 9 * U, y],
    ], 0xf6d5dc);
  }
}

function drawRifle(
  g: Phaser.GameObjects.Graphics,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): void {
  strokeLine(g, x1, y1, x2, y2, 8 * U, 0x12161c, 1);
  strokeLine(g, x1, y1, x2, y2, 3 * U, 0xb7c2ce, 1);
  g.fillStyle(0xe7eef5, 1);
  g.fillCircle(x2, y2, 4 * U);
}

function drawLowCover(g: Phaser.GameObjects.Graphics, sprite: CoverSprite): void {
  g.fillStyle(0x000000, 0.38);
  g.fillRect(sprite.x + 10, sprite.y + 18, sprite.w - 4, 16);
  g.fillStyle(0x6d6558, 1);
  g.fillRect(sprite.x, sprite.y + sprite.h - 6, sprite.w, 12);
  g.fillStyle(0xa39886, 1);
  g.fillRect(sprite.x, sprite.y - 12, sprite.w - 28, sprite.h);
  for (let slot = 0; slot < 4; slot += 1) {
    const y = sprite.y + 16 + slot * ((sprite.h - 36) / 3);
    g.fillStyle(0x6f675c, 1);
    g.fillRect(sprite.x + 16, y, sprite.w - 64, 5);
  }
  const faceW = 40;
  g.fillStyle(0x12171d, 1);
  g.fillRect(sprite.x + sprite.w - faceW, sprite.y - 16, faceW + 8, sprite.h + 10);
  const faceX = sprite.x + sprite.w - faceW + 6;
  for (const slot of [0.16, 0.32, 0.68, 0.84]) {
    const cy = sprite.y + sprite.h * slot;
    fillPoly(g, [
      [faceX, cy - 11],
      [faceX + 24, cy],
      [faceX, cy + 11],
    ], 0xf7f9fc);
  }
  drawShield(g, sprite.x + sprite.w - 18, sprite.y + sprite.h * 0.5, 18, 0xe7eef6, 0x10141a);
}

function drawCoverPeek(g: Phaser.GameObjects.Graphics, x: number, y: number): void {
  g.fillStyle(0x1d6d82, 1);
  g.fillCircle(x + 8, y + 2, 16);
  g.fillStyle(0x102830, 1);
  g.fillCircle(x + 14, y - 18, 12);
  g.fillStyle(0xd8fbff, 1);
  g.fillRect(x + 8, y - 22, 14, 4);
  g.lineStyle(3, 0xe7fdff, 1);
  g.strokeCircle(x + 4, y + 2, 7);
}

function drawPenaltyShot(
  g: Phaser.GameObjects.Graphics,
  from: { x: number; y: number },
  to: { x: number; y: number },
): void {
  strokeLine(g, from.x, from.y, to.x, to.y, 10, 0x2c2412, 0.95);
  strokeLine(g, from.x, from.y, to.x, to.y, 4, 0xf2c14e, 1);
  fillPoly(g, [
    [to.x, to.y],
    [to.x + 22, to.y - 10],
    [to.x + 22, to.y + 10],
  ], 0xf2c14e);
}

function drawBlockedShot(
  g: Phaser.GameObjects.Graphics,
  from: { x: number; y: number },
  to: { x: number; y: number },
): void {
  strokeLine(g, from.x, from.y, to.x, to.y, 10, 0x10151c, 0.95);
  strokeLine(g, from.x, from.y, to.x, to.y, 4, 0xf7f8fb, 1);
  strokeLine(g, to.x, to.y - 36, to.x, to.y + 36, 12, 0x10151c, 1);
  strokeLine(g, to.x, to.y - 36, to.x, to.y + 36, 5, 0xf7f4ee, 1);
  strokeLine(g, to.x + 2, to.y, to.x + 22, to.y - 14, 3, 0xffd7ad, 1);
  strokeLine(g, to.x + 2, to.y, to.x + 26, to.y + 8, 3, 0xffd7ad, 1);
  strokeLine(g, to.x + 4, to.y, to.x + 16, to.y + 18, 3, 0xffedd2, 1);
}

function drawReadout(
  scene: Phaser.Scene,
  g: Phaser.GameObjects.Graphics,
  frame: DeckungFrame,
  runner: { x: number; y: number },
  sprite: CoverSprite | null,
): void {
  const chance = frame.incoming.chance;
  const penalty = frame.incoming.coverPenalty;
  plate(g, runner.x - 250, runner.y - 210, 250, 112);
  if (chance !== null) mono(scene, runner.x - 230, runner.y - 196, `${chance} %`, 40);
  if (frame.incoming.protectedEdgeCrossed) {
    drawShield(g, runner.x - 210, runner.y - 124, 16, 0xf4f7fb, 0x10141a);
    write(scene, runner.x - 186, runner.y - 140, "gedeckt", 24);
  }
  if (sprite && penalty > 0) {
    plate(g, sprite.x + sprite.w + 10, sprite.y + sprite.h * 0.5 - 18, 92, 36);
    drawShield(g, sprite.x + sprite.w + 28, sprite.y + sprite.h * 0.5, 11, 0xf4f7fb, 0x10141a);
    mono(scene, sprite.x + sprite.w + 44, sprite.y + sprite.h * 0.5 - 14, `−${penalty}`, 20);
  }

  const enemy = cellCenter(frame.enemy);
  const nix = cellCenter(frame.nix);
  drawDiamond(g, enemy.x - 46, enemy.y - 78, 8);
  write(scene, enemy.x - 30, enemy.y - 90, "Wache", 22);
  g.lineStyle(3, 0xd9fbff, 1);
  g.strokeCircle(nix.x - 36, nix.y - 70, 8);
  write(scene, nix.x - 20, nix.y - 84, "Nix", 22);

  if (frame.blocked.blocked) {
    const x = milliToPixel(frame.blocked.impact.xMilli);
    const y = milliToPixel(frame.blocked.impact.yMilli);
    plate(g, x - 188, y - 78, 168, 40);
    write(scene, x - 170, y - 70, "blockiert", 22);
  }
  write(scene, 1508, 3 * CELL + 8, "Datenraum", 18);
}

function plate(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number): void {
  g.fillStyle(0x0c1016, 0.94);
  g.fillRect(x, y, w, h);
  g.lineStyle(2, 0xa8b6c8, 1);
  g.strokeRect(x, y, w, h);
}

function write(scene: Phaser.Scene, x: number, y: number, text: string, size: number): void {
  const label = scene.add.text(x, y, text, {
    fontFamily: "Segoe UI, Arial, sans-serif",
    fontSize: `${size}px`,
    color: "#f7f4ee",
    fontStyle: "700",
  });
  label.setDepth(5);
}

function mono(scene: Phaser.Scene, x: number, y: number, text: string, size: number): void {
  const label = scene.add.text(x, y, text, {
    fontFamily: "Consolas, Cascadia Mono, monospace",
    fontSize: `${size}px`,
    color: "#f7f4ee",
    fontStyle: "700",
  });
  label.setDepth(5);
}

function drawShield(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  scale: number,
  fill: number,
  stroke: number,
): void {
  const points = shieldPoints(x, y, scale);
  fillPoly(g, points, fill);
  strokePoly(g, points, stroke, 2);
}

function shieldPoints(x: number, y: number, scale: number): ReadonlyArray<readonly [number, number]> {
  return [
    [x, y - scale],
    [x + scale * 0.82, y - scale * 0.48],
    [x + scale * 0.82, y + scale * 0.18],
    [x, y + scale],
    [x - scale * 0.82, y + scale * 0.18],
    [x - scale * 0.82, y - scale * 0.48],
  ];
}

function drawDiamond(g: Phaser.GameObjects.Graphics, x: number, y: number, r: number): void {
  fillPoly(g, [
    [x, y - r],
    [x + r, y],
    [x, y + r],
    [x - r, y],
  ], 0xf0d5dc);
}

function fillPoly(
  g: Phaser.GameObjects.Graphics,
  points: ReadonlyArray<readonly [number, number]>,
  color: number,
  alpha = 1,
): void {
  const first = points[0];
  if (!first) return;
  g.fillStyle(color, alpha);
  g.beginPath();
  g.moveTo(first[0], first[1]);
  for (let i = 1; i < points.length; i += 1) {
    const point = points[i];
    if (!point) continue;
    g.lineTo(point[0], point[1]);
  }
  g.closePath();
  g.fillPath();
}

function strokePoly(
  g: Phaser.GameObjects.Graphics,
  points: ReadonlyArray<readonly [number, number]>,
  color: number,
  width: number,
): void {
  const first = points[0];
  if (!first) return;
  g.lineStyle(width, color, 1);
  g.beginPath();
  g.moveTo(first[0], first[1]);
  for (let i = 1; i < points.length; i += 1) {
    const point = points[i];
    if (!point) continue;
    g.lineTo(point[0], point[1]);
  }
  g.closePath();
  g.strokePath();
}

function strokeLine(
  g: Phaser.GameObjects.Graphics,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  width: number,
  color: number,
  alpha = 1,
): void {
  g.lineStyle(width, color, alpha);
  g.beginPath();
  g.moveTo(x1, y1);
  g.lineTo(x2, y2);
  g.strokePath();
}

