import type { ApBattle, ApMark, Cell, Direction, MovePreview } from "@neon/sim";
import Phaser from "phaser";
import { CELL, cellCenter, coverSprite, type CoverSprite } from "../battle/layout.ts";

const WALL_LIFT = Math.round(CELL * 0.34);
const U = CELL / 82;

export function paintAp(scene: Phaser.Scene, battle: ApBattle): void {
  const g = scene.add.graphics();
  g.setDepth(0);
  const cover = battle.map.lowCover.find((item) => item.x === battle.runner.x && item.y === battle.runner.y);
  const sprite = cover ? coverSprite(cover, cover.protects) : null;
  const runner = sprite
    ? { x: sprite.x + sprite.w * 0.46, y: sprite.y + sprite.h * 0.56 }
    : cellCenter(battle.runner);
  const enemy = cellCenter(battle.enemy);
  const nix = cellCenter(battle.nix);

  drawFloor(g);
  drawReachable(g, battle.preview.reachable, battle.preview.path);
  drawRoute(g, battle.runner, battle.preview.path);
  drawWalls(g, battle.map.walls);
  drawPlant(g, 86, 900);
  drawHatch(g, 1688, 860);

  drawCrouchedCrew(g, runner.x, runner.y);
  drawStanding(g, enemy.x, enemy.y, -1, "hostile");
  drawStanding(g, nix.x, nix.y, 1, "crew");
  drawRifle(g, enemy.x - 8 * U, enemy.y - 4 * U, enemy.x - 58 * U, enemy.y - 8 * U);
  drawRifle(g, nix.x + 8 * U, nix.y - 2 * U, nix.x + 54 * U, nix.y - 6 * U);
  if (sprite) {
    drawLowCover(g, sprite);
    drawRifle(g, sprite.x + sprite.w - 16, runner.y - 8 * U, sprite.x + sprite.w + 92, runner.y - 12 * U);
    drawCoverPeek(g, sprite.x + 2, runner.y);
  }

  const coverTop = sprite ? sprite.y - 12 : runner.y - 160;
  drawCurrentAp(scene, g, runner.x, coverTop - 26, battle.preview.markersNow);
  drawPathCost(scene, g, battle.preview);

  drawDiamond(g, enemy.x - 46, enemy.y - 78, 8);
  write(scene, enemy.x - 30, enemy.y - 90, labelOf(battle.enemy.id), 22);
  g.lineStyle(3, 0xd9fbff, 1);
  g.strokeCircle(nix.x - 36, nix.y - 70, 8);
  write(scene, nix.x - 20, nix.y - 84, labelOf(battle.nix.id), 22);
  write(scene, 1508, 3 * CELL + 8, "Datenraum", 18);
}

function drawCurrentAp(
  scene: Phaser.Scene,
  g: Phaser.GameObjects.Graphics,
  anchorX: number,
  plateBottom: number,
  marks: readonly ApMark[],
): void {
  const pitch = 62;
  const radius = 23;
  const count = marks.length;
  const rowW = Math.max(0, count - 1) * pitch;
  const plateW = rowW + radius * 2 + 52;
  const plateH = 124;
  const plateX = anchorX - plateW / 2;
  const plateY = plateBottom - plateH;
  plate(g, plateX, plateY, plateW, plateH);
  g.fillStyle(0xd8fbff, 1);
  g.fillRect(plateX, plateY, 6, plateH);
  fillPoly(g, [
    [anchorX - 14, plateBottom - 2],
    [anchorX + 14, plateBottom - 2],
    [anchorX, plateBottom + 16],
  ], 0x0c1016);
  write(scene, plateX + 20, plateY + 12, "Kite", 26);
  mono(scene, plateX + plateW - 58, plateY + 16, "AP", 18, "#ffe08a");
  const rowY = plateY + 84;
  const startX = anchorX - rowW / 2;
  for (let index = 0; index < marks.length; index += 1) {
    const mark = marks[index];
    const x = startX + index * pitch;
    if (mark === "full") drawHex(g, x, rowY, radius);
    else drawSpent(g, x, rowY, radius - 2);
  }
}

function drawPathCost(scene: Phaser.Scene, g: Phaser.GameObjects.Graphics, preview: MovePreview): void {
  const end = preview.path[preview.path.length - 1];
  if (!end) return;
  const remaining: ApMark[] = [];
  for (const mark of preview.markersAfter) {
    if (mark === "full") remaining.push(mark);
  }
  const originX = end.x * CELL;
  const originY = end.y * CELL;
  const plateW = 240;
  const plateH = 124;
  const plateX = originX + 88;
  const plateY = originY - plateH - 156;
  plate(g, plateX, plateY, plateW, plateH);
  const tipX = originX + CELL / 2;
  const tipY = originY + 12;
  strokeLine(g, plateX + 28, plateY + plateH, tipX, tipY, 4, 0xf7f4ee);
  fillPoly(g, [
    [tipX - 10, tipY - 2],
    [tipX + 10, tipY - 2],
    [tipX, tipY + 16],
  ], 0xf7f4ee);
  write(scene, plateX + 16, plateY + 8, "Weg", 16, "#c5d0dc");
  mono(scene, plateX + 16, plateY + 28, `${preview.cost} AP`, 44, "#ffe08a");
  write(scene, plateX + 16, plateY + 86, "danach", 22);
  for (let index = 0; index < remaining.length; index += 1) {
    drawHex(g, plateX + 148 + index * 44, plateY + 98, 18);
  }
  drawReticle(g, originX, originY, CELL, CELL);
}

function drawReachable(
  g: Phaser.GameObjects.Graphics,
  reachable: MovePreview["reachable"],
  path: readonly Cell[],
): void {
  const chosen = new Set(path.map(key));
  for (const tile of reachable) {
    if (!onScreen(tile) || chosen.has(key(tile))) continue;
    hatch(g, tile.x * CELL + 12, tile.y * CELL + 12, CELL - 24, CELL - 24, 20, 0x7eb4cc, 0.32, 2);
  }
  for (const tile of path) {
    const x = tile.x * CELL;
    const y = tile.y * CELL;
    g.fillStyle(0x14586e, 0.82);
    g.fillRect(x + 6, y + 6, CELL - 12, CELL - 12);
    hatch(g, x + 14, y + 14, CELL - 28, CELL - 28, 14, 0xe7fdff, 0.92, 4);
    g.lineStyle(4, 0xf7f4ee, 1);
    g.strokeRect(x + 6, y + 6, CELL - 12, CELL - 12);
  }
}

function drawRoute(g: Phaser.GameObjects.Graphics, from: Cell, path: readonly Cell[]): void {
  const first = path[0];
  if (!first) return;
  const points: Array<{ readonly x: number; readonly y: number }> = [entryPoint(from, first)];
  const arrows: Array<{ readonly x: number; readonly y: number; readonly dir: Direction }> = [];
  let prev = from;
  for (const step of path) {
    points.push(cellCenter(step));
    const dir = travel(prev, step);
    if (dir) {
      const center = cellCenter(step);
      const nudge = dir === "n" || dir === "s" ? 34 : 24;
      const x = dir === "e" ? center.x - nudge : dir === "w" ? center.x + nudge : center.x;
      const y = dir === "s" ? center.y - nudge : dir === "n" ? center.y + nudge : center.y;
      arrows.push({ x, y, dir });
    }
    prev = step;
  }
  strokeChain(g, points, 16, 0x071014);
  strokeChain(g, points, 6, 0xf7f4ee);
  for (const arrow of arrows) drawArrow(g, arrow.x, arrow.y, arrow.dir);
}

function drawReticle(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number): void {
  const inset = 14;
  const arm = 34;
  const left = x + inset;
  const top = y + inset;
  const right = x + w - inset;
  const bottom = y + h - inset;
  strokeLine(g, left, top, left + arm, top, 5, 0xf7f4ee);
  strokeLine(g, left, top, left, top + arm, 5, 0xf7f4ee);
  strokeLine(g, right, top, right - arm, top, 5, 0xf7f4ee);
  strokeLine(g, right, top, right, top + arm, 5, 0xf7f4ee);
  strokeLine(g, left, bottom, left + arm, bottom, 5, 0xf7f4ee);
  strokeLine(g, left, bottom, left, bottom - arm, 5, 0xf7f4ee);
  strokeLine(g, right, bottom, right - arm, bottom, 5, 0xf7f4ee);
  strokeLine(g, right, bottom, right, bottom - arm, 5, 0xf7f4ee);
}

function drawArrow(g: Phaser.GameObjects.Graphics, x: number, y: number, dir: Direction): void {
  const tip = 20;
  const back = 14;
  const side = 13;
  const points: ReadonlyArray<readonly [number, number]> =
    dir === "s"
      ? [[x, y + tip], [x - side, y - back], [x + side, y - back]]
      : dir === "n"
        ? [[x, y - tip], [x - side, y + back], [x + side, y + back]]
        : dir === "e"
          ? [[x + tip, y], [x - back, y - side], [x - back, y + side]]
          : [[x - tip, y], [x + back, y - side], [x + back, y + side]];
  fillPoly(g, points, 0xf7f4ee);
  strokePoly(g, points, 0x102028, 3);
}

function entryPoint(from: Cell, to: Cell): { readonly x: number; readonly y: number } {
  const center = cellCenter(to);
  const dir = travel(from, to);
  if (dir === "s") return { x: center.x, y: center.y - CELL / 2 + 18 };
  if (dir === "n") return { x: center.x, y: center.y + CELL / 2 - 18 };
  if (dir === "e") return { x: center.x - CELL / 2 + 18, y: center.y };
  if (dir === "w") return { x: center.x + CELL / 2 - 18, y: center.y };
  return center;
}

function travel(from: Cell, to: Cell): Direction | null {
  if (to.x === from.x && to.y === from.y + 1) return "s";
  if (to.x === from.x && to.y === from.y - 1) return "n";
  if (to.x === from.x + 1 && to.y === from.y) return "e";
  if (to.x === from.x - 1 && to.y === from.y) return "w";
  return null;
}

function drawHex(g: Phaser.GameObjects.Graphics, x: number, y: number, radius: number): void {
  const points = hexPoints(x, y, radius);
  fillPoly(g, points, 0xffd56a);
  strokePoly(g, points, 0x1a1408, 4);
}

function drawSpent(g: Phaser.GameObjects.Graphics, x: number, y: number, radius: number): void {
  g.fillStyle(0x0c1016, 1);
  g.fillCircle(x, y, radius);
  g.lineStyle(6, 0xf7f4ee, 1);
  g.strokeCircle(x, y, radius - 3);
}

function hexPoints(x: number, y: number, radius: number): ReadonlyArray<readonly [number, number]> {
  const dx = Math.round((radius * 866) / 1000);
  const dy = Math.round(radius / 2);
  return [
    [x, y - radius],
    [x + dx, y - dy],
    [x + dx, y + dy],
    [x, y + radius],
    [x - dx, y + dy],
    [x - dx, y - dy],
  ];
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
  const shield = shieldPoints(sprite.x + sprite.w - 18, sprite.y + sprite.h * 0.5, 18);
  fillPoly(g, shield, 0xe7eef6);
  strokePoly(g, shield, 0x10141a, 2);
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

function plate(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number): void {
  g.fillStyle(0x0c1016, 0.96);
  g.fillRect(x, y, w, h);
  g.lineStyle(2, 0xa8b6c8, 1);
  g.strokeRect(x, y, w, h);
}

function write(
  scene: Phaser.Scene,
  x: number,
  y: number,
  text: string,
  size: number,
  color = "#f7f4ee",
): void {
  const label = scene.add.text(x, y, text, {
    fontFamily: "Segoe UI, Arial, sans-serif",
    fontSize: `${size}px`,
    color,
    fontStyle: "700",
  });
  label.setDepth(6);
}

function mono(
  scene: Phaser.Scene,
  x: number,
  y: number,
  text: string,
  size: number,
  color: string,
): void {
  const label = scene.add.text(x, y, text, {
    fontFamily: "Consolas, Cascadia Mono, monospace",
    fontSize: `${size}px`,
    color,
    fontStyle: "700",
  });
  label.setDepth(6);
}

function labelOf(id: string): string {
  const first = id.charAt(0).toUpperCase();
  return `${first}${id.slice(1)}`;
}

function drawDiamond(g: Phaser.GameObjects.Graphics, x: number, y: number, radius: number): void {
  fillPoly(g, [
    [x, y - radius],
    [x + radius, y],
    [x, y + radius],
    [x - radius, y],
  ], 0xf0d5dc);
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
  for (let index = 1; index < points.length; index += 1) {
    const point = points[index];
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
  for (let index = 1; index < points.length; index += 1) {
    const point = points[index];
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

function strokeChain(
  g: Phaser.GameObjects.Graphics,
  points: ReadonlyArray<{ readonly x: number; readonly y: number }>,
  width: number,
  color: number,
): void {
  const first = points[0];
  if (!first) return;
  g.lineStyle(width, color, 1);
  g.beginPath();
  g.moveTo(first.x, first.y);
  for (let index = 1; index < points.length; index += 1) {
    const point = points[index];
    if (!point) continue;
    g.lineTo(point.x, point.y);
  }
  g.strokePath();
}

function hatch(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  w: number,
  h: number,
  gap: number,
  color: number,
  alpha: number,
  width: number,
): void {
  g.lineStyle(width, color, alpha);
  for (let sum = gap; sum < w + h; sum += gap) {
    g.beginPath();
    g.moveTo(x + Math.min(sum, w), y + Math.max(0, sum - w));
    g.lineTo(x + Math.max(0, sum - h), y + Math.min(sum, h));
    g.strokePath();
  }
}

function onScreen(cell: Cell): boolean {
  const x = cell.x * CELL;
  const y = cell.y * CELL;
  return x < 1920 && y < 1080 && x + CELL > 0 && y + CELL > 0;
}

function key(cell: Cell): string {
  return `${cell.x},${cell.y}`;
}
