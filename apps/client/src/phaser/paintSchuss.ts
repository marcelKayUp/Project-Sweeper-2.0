import type { SchussView, ShotResolution } from "@neon/sim";
import Phaser from "phaser";

const CELL = 300;
const CAM_X = -0.1;
const CAM_Y = 1.7;
const U = 3.15;

interface Pt {
  readonly x: number;
  readonly y: number;
}

interface Box {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

export function paintSchuss(scene: Phaser.Scene, view: SchussView): void {
  const g = scene.add.graphics();
  g.setDepth(0);
  const shot = view.resolution;
  const preview = shot.preview;
  const kite = cellCenter(view.target.x, view.target.y);
  const wache = cellCenter(view.shooter.x, view.shooter.y);
  const cover = coverBox(view.target.x, view.target.y);
  const body: Pt = { x: worldX(view.target.x) + 28, y: kite.y + 6 };
  const muzzle: Pt = { x: wache.x - 188, y: wache.y - 18 };
  const arrived = shot.status === "hit";
  const impact: Pt = arrived ? { x: body.x + 8, y: body.y - 2 } : { x: body.x - 6, y: body.y - 168 };
  const faceX = cover.x + cover.w - 10;
  const face: Pt = { x: faceX, y: lineY(muzzle, impact, faceX) };
  const midX = (face.x + muzzle.x) / 2;
  const mid: Pt = { x: midX, y: lineY(muzzle, impact, midX) };

  drawFloor(g, view.map.width, view.map.height);
  drawPlant(g, 128, 118);
  drawHatch(g, 86, 848);
  drawLowCover(g, cover);
  drawCrouchedCrew(g, body.x, body.y);
  drawStanding(g, wache.x, wache.y, -1, "hostile");
  drawRifle(g, wache.x - 18, wache.y - 8, muzzle.x, muzzle.y);

  if (shot.status !== "blocked") drawReticle(g, body.x, body.y, 118);
  if (shot.status === "blocked") {
    const end = impactPoint(shot);
    drawTracer(g, muzzle, end);
    drawStop(g, end);
  } else if (shot.status === "miss") {
    const bend: Pt = { x: muzzle.x - (muzzle.x - body.x) * 0.55, y: body.y - 70 };
    drawTracer(g, muzzle, bend);
    drawTracer(g, bend, impact);
    drawChevrons(g, muzzle, bend, 2);
    drawMissMark(g, impact.x, impact.y);
  } else {
    drawTracer(g, muzzle, impact);
    drawChevrons(g, muzzle, face, 3);
    if (preview.coverPenalty > 0) drawShield(g, face.x, face.y, 26, 0xf7f9fc, 0x10141a);
    if (arrived) drawHitBurst(g, impact.x, impact.y);
  }
  if (shot.ammoSpent === 1) {
    drawMuzzle(g, muzzle);
    drawCasing(g, muzzle.x + 36, muzzle.y + 34);
  }

  drawPlates(scene, g, view, shot, body, muzzle, face, mid, wache);
}

function drawPlates(
  scene: Phaser.Scene,
  g: Phaser.GameObjects.Graphics,
  view: SchussView,
  shot: ShotResolution,
  body: Pt,
  muzzle: Pt,
  face: Pt,
  mid: Pt,
  wache: Pt,
): void {
  const preview = shot.preview;
  const chance = preview.chance;
  if (chance !== null && preview.coverPenalty > 0) {
    const chancePlate = { x: mid.x - 150, y: mid.y - 214, w: 300, h: 132 };
    plate(g, chancePlate.x, chancePlate.y, chancePlate.w, chancePlate.h);
    leader(g, mid.x, chancePlate.y + chancePlate.h, mid.x, mid.y);
    mono(scene, chancePlate.x + 28, chancePlate.y + 12, `${chance} %`, 64, "#fff6d4");
    const formula =
      preview.aimBonus > 0
        ? `${preview.base} + ${preview.aimBonus} − ${preview.distancePenalty} − ${preview.coverPenalty}`
        : `${preview.base} − ${preview.distancePenalty} − ${preview.coverPenalty}`;
    mono(scene, chancePlate.x + 28, chancePlate.y + 88, formula, 22, "#d5deea");

    const coverPlate = { x: face.x - 118, y: face.y - 230, w: 236, h: 108 };
    plate(g, coverPlate.x, coverPlate.y, coverPlate.w, coverPlate.h);
    leader(g, face.x, coverPlate.y + coverPlate.h, face.x, face.y, 5);
    drawShield(g, coverPlate.x + 36, coverPlate.y + 54, 22, 0xf4f7fb, 0x10141a);
    mono(scene, coverPlate.x + 68, coverPlate.y + 14, `−${preview.coverPenalty}`, 48, "#fff6d4");
    write(scene, coverPlate.x + 68, coverPlate.y + 68, "Deckung", 22, "#d5deea");
  }

  if (shot.apSpent > 0) {
    const cost = { x: muzzle.x - 8, y: muzzle.y - 246, w: 210, h: 84 };
    plate(g, cost.x, cost.y, cost.w, cost.h);
    leader(g, muzzle.x + 24, cost.y + cost.h, muzzle.x, muzzle.y - 30);
    mono(scene, cost.x + 16, cost.y + 8, `−${shot.apSpent} AP`, 28, "#ffe08a");
    mono(scene, cost.x + 16, cost.y + 44, `−${shot.ammoSpent} Patrone`, 22, "#f7f4ee");
  }

  const result = resultPlate(shot);
  const card = { x: Math.max(28, body.x - 150), y: body.y + 188, w: 430, h: 184 };
  plate(g, card.x, card.y, card.w, card.h);
  leader(g, body.x, body.y + 124, card.x + 56, card.y);
  if (shot.status === "hit") drawStar(g, card.x + 36, card.y + 46, 16, 7, 0xfff6d4);
  if (shot.status === "miss") drawMissIcon(g, card.x + 36, card.y + 46);
  if (shot.status === "blocked") drawStop(g, { x: card.x + 36, y: card.y + 46 });
  write(scene, card.x + 64, card.y + 16, "Kite", 22, "#9eabbd");
  write(scene, card.x + 64, card.y + 42, result.title, 36, "#f7f4ee");
  mono(scene, card.x + 330, card.y + 48, `${shot.targetHp}/${view.targetMaxHp}`, 32, "#f7f4ee");
  mono(scene, card.x + 20, card.y + 118, result.detail, 28, result.detailColor);
  drawHpRow(g, card.x + 168, card.y + 124, view.targetMaxHp, shot.targetHp);

  const tag = { x: wache.x + 54, y: wache.y - 86, w: 168, h: 64 };
  plate(g, tag.x, tag.y, tag.w, tag.h);
  drawDiamond(g, tag.x + 28, tag.y + 32, 10);
  write(scene, tag.x + 48, tag.y + 16, "Wache", 28, "#f7f4ee");

  drawStatus(scene, g, view, shot, result.title);
}

function resultPlate(shot: ShotResolution): { readonly title: string; readonly detail: string; readonly detailColor: string } {
  if (shot.status === "hit") return { title: "Treffer", detail: `−${shot.damage} HP`, detailColor: "#ffb59a" };
  if (shot.status === "miss") return { title: "Fehlschuss", detail: "vorbei", detailColor: "#d5deea" };
  if (shot.status === "blocked") return { title: "blockiert", detail: "Wand", detailColor: "#d5deea" };
  return { title: "ungültig", detail: "keine Wirkung", detailColor: "#d5deea" };
}

function drawStatus(
  scene: Phaser.Scene,
  g: Phaser.GameObjects.Graphics,
  view: SchussView,
  shot: ShotResolution,
  title: string,
): void {
  plate(g, 24, 988, 1872, 72);
  drawDiamond(g, 58, 1024, 9);
  write(scene, 78, 1004, "Wache", 22, "#f7f4ee");
  mono(scene, 176, 1000, `${shot.shooterAp}/${view.maxAp} AP`, 26, "#ffe08a");
  mono(scene, 360, 1000, `${shot.shooterMagazine}/${view.magazineSize}`, 26, "#f7f4ee");
  write(scene, 458, 1006, "Patronen", 20, "#d5deea");
  write(scene, 760, 1004, "Schuss", 22, "#9eabbd");
  mono(scene, 860, 1000, shot.apSpent > 0 ? `−${shot.apSpent} AP` : "0 AP", 26, "#ffe08a");
  mono(scene, 990, 1000, shot.ammoSpent > 0 ? `−${shot.ammoSpent} Patrone` : "0 Patronen", 22, "#f7f4ee");
  g.lineStyle(3, 0xd9fbff, 1);
  g.strokeCircle(1188, 1024, 9);
  write(scene, 1210, 1004, "Kite", 22, "#f7f4ee");
  write(scene, 1290, 1004, title, 22, "#f7f4ee");
  mono(scene, 1500, 1000, `${shot.targetHp}/${view.targetMaxHp} HP`, 26, "#f7f4ee");
  write(scene, 1688, 1004, weaponName(view.weapon), 22, "#d5deea");
}

function weaponName(weapon: SchussView["weapon"]): string {
  return weapon === "rifle" ? "Sturmgewehr" : weapon;
}

function drawFloor(g: Phaser.GameObjects.Graphics, width: number, height: number): void {
  g.fillStyle(0x12161c, 1);
  g.fillRect(0, 0, 1920, 1080);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const sx = worldX(x);
      const sy = worldY(y);
      if (sx > 1920 || sy > 1080 || sx + CELL < 0 || sy + CELL < 0) continue;
      if ((x + y) % 2 === 0) {
        g.lineStyle(1, 0x2c3544, 0.35);
        g.strokeRect(sx + 18, sy + 18, CELL - 36, CELL - 36);
      }
    }
  }
}

function drawLowCover(g: Phaser.GameObjects.Graphics, sprite: Box): void {
  const faceW = 52;
  g.fillStyle(0x000000, 0.4);
  g.fillRect(sprite.x + 14, sprite.y + 28, sprite.w - 8, 22);
  g.fillStyle(0x6d6558, 1);
  g.fillRect(sprite.x, sprite.y + sprite.h - 8, sprite.w, 16);
  g.fillStyle(0xa39886, 1);
  g.fillRect(sprite.x, sprite.y - 16, sprite.w - faceW, sprite.h);
  for (let slot = 0; slot < 4; slot += 1) {
    const y = sprite.y + 22 + slot * ((sprite.h - 48) / 3);
    g.fillStyle(0x6f675c, 1);
    g.fillRect(sprite.x + 22, y, sprite.w - faceW - 36, 7);
  }
  g.fillStyle(0x12171d, 1);
  g.fillRect(sprite.x + sprite.w - faceW, sprite.y - 22, faceW + 10, sprite.h + 16);
  const faceX = sprite.x + sprite.w - faceW + 8;
  for (const slot of [0.16, 0.38, 0.62, 0.84]) {
    const cy = sprite.y + sprite.h * slot;
    fillPoly(g, [
      [faceX, cy - 16],
      [faceX + 30, cy],
      [faceX, cy + 16],
    ], 0xf7f9fc);
  }
  drawShield(g, sprite.x + sprite.w - 24, sprite.y + sprite.h * 0.5, 22, 0xe7eef6, 0x10141a);
}

function drawCrouchedCrew(g: Phaser.GameObjects.Graphics, x: number, y: number): void {
  g.fillStyle(0x000000, 0.48);
  g.fillEllipse(x - 6 * U, y + 16 * U, 52 * U, 22 * U);
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
  g.lineStyle(4, 0xe7fdff, 1);
  g.strokeCircle(x - 22 * U, y - 2 * U, 8 * U);
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
  g.fillEllipse(x, y + 22 * U, 48 * U, 18 * U);
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

function drawRifle(g: Phaser.GameObjects.Graphics, x1: number, y1: number, x2: number, y2: number): void {
  strokeLine(g, x1, y1, x2, y2, 10, 0x12161c, 1);
  strokeLine(g, x1, y1, x2, y2, 4, 0xb7c2ce, 1);
  g.fillStyle(0xe7eef5, 1);
  g.fillCircle(x2, y2, 5);
}

function drawReticle(g: Phaser.GameObjects.Graphics, x: number, y: number, radius: number): void {
  g.lineStyle(8, 0x10151c, 0.9);
  g.strokeCircle(x, y, radius);
  g.lineStyle(4, 0xf7f4ee, 1);
  g.strokeCircle(x, y, radius);
  const tick = 22;
  strokeLine(g, x - radius, y, x - radius + tick, y, 4, 0xf7f4ee);
  strokeLine(g, x + radius, y, x + radius - tick, y, 4, 0xf7f4ee);
  strokeLine(g, x, y - radius, x, y - radius + tick, 4, 0xf7f4ee);
  strokeLine(g, x, y + radius, x, y + radius - tick, 4, 0xf7f4ee);
}

function drawTracer(g: Phaser.GameObjects.Graphics, from: Pt, to: Pt): void {
  strokeLine(g, from.x, from.y, to.x, to.y, 18, 0x1a1208, 0.95);
  strokeLine(g, from.x, from.y, to.x, to.y, 8, 0xffc44d, 1);
  strokeLine(g, from.x, from.y, to.x, to.y, 3, 0xfffaf0, 1);
}

function drawChevrons(g: Phaser.GameObjects.Graphics, from: Pt, to: Pt, count: number): void {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const sign = dx < 0 ? -1 : 1;
  for (let index = 1; index <= count; index += 1) {
    const t = index / (count + 1);
    const x = from.x + dx * t;
    const y = from.y + dy * t;
    fillPoly(g, [
      [x + sign * 22, y],
      [x - sign * 10, y - 13],
      [x - sign * 10, y + 13],
    ], 0xfffaf0);
    strokePoly(g, [
      [x + sign * 22, y],
      [x - sign * 10, y - 13],
      [x - sign * 10, y + 13],
    ], 0x1a1208, 3);
  }
}

function drawMuzzle(g: Phaser.GameObjects.Graphics, at: Pt): void {
  const sparks: ReadonlyArray<readonly [number, number]> = [
    [22, -16],
    [18, 14],
    [-16, 18],
    [-20, -12],
    [8, -26],
    [-6, 24],
    [28, 2],
    [-24, 4],
  ];
  g.fillStyle(0xff7a2a, 1);
  g.fillCircle(at.x, at.y, 26);
  for (const spark of sparks) {
    strokeLine(g, at.x, at.y, at.x + spark[0], at.y + spark[1], 5, 0xffb15a);
  }
  g.fillStyle(0xfffaf0, 1);
  g.fillCircle(at.x, at.y, 12);
}

function drawHitBurst(g: Phaser.GameObjects.Graphics, x: number, y: number): void {
  drawStar(g, x, y, 64, 24, 0xfff3cf);
  drawStar(g, x, y, 36, 12, 0xff8a3d);
  g.fillStyle(0x1a100c, 1);
  g.fillCircle(x, y, 14);
  g.lineStyle(4, 0xfffaf0, 1);
  g.strokeCircle(x, y, 14);
  g.fillStyle(0xfffaf0, 1);
  g.fillCircle(x, y, 5);
}

function drawMissMark(g: Phaser.GameObjects.Graphics, x: number, y: number): void {
  g.lineStyle(10, 0x10151c, 1);
  g.beginPath();
  g.arc(x, y, 40, 0.7, Math.PI * 1.85, false);
  g.strokePath();
  g.lineStyle(6, 0xf7f4ee, 1);
  g.beginPath();
  g.arc(x, y, 40, 0.7, Math.PI * 1.85, false);
  g.strokePath();
  strokeLine(g, x - 26, y - 26, x + 26, y + 26, 8, 0xf7f4ee);
  strokeLine(g, x - 22, y - 58, x + 14, y - 78, 8, 0xffe08a);
  strokeLine(g, x + 14, y - 78, x - 22, y - 98, 8, 0xffe08a);
}

function drawMissIcon(g: Phaser.GameObjects.Graphics, x: number, y: number): void {
  g.lineStyle(4, 0xf7f4ee, 1);
  g.beginPath();
  g.arc(x, y, 14, 0.6, Math.PI * 1.8, false);
  g.strokePath();
  strokeLine(g, x - 10, y - 10, x + 10, y + 10, 4, 0xf7f4ee);
}

function drawStop(g: Phaser.GameObjects.Graphics, at: Pt): void {
  strokeLine(g, at.x, at.y - 36, at.x, at.y + 36, 14, 0x10151c);
  strokeLine(g, at.x, at.y - 36, at.x, at.y + 36, 6, 0xf7f4ee);
}

function drawCasing(g: Phaser.GameObjects.Graphics, x: number, y: number): void {
  g.fillStyle(0xd7a15a, 1);
  g.fillRect(x, y, 18, 8);
  g.fillStyle(0xf2d7a2, 1);
  g.fillRect(x, y, 5, 8);
}

function drawHpRow(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  max: number,
  current: number,
): void {
  for (let index = 0; index < max; index += 1) {
    const px = x + index * 28;
    if (index < current) {
      g.fillStyle(0x7ee0c8, 1);
      g.fillRoundedRect(px, y, 20, 20, 4);
    } else {
      g.lineStyle(3, 0xf7f4ee, 1);
      g.strokeCircle(px + 10, y + 10, 10);
      strokeLine(g, px + 3, y + 3, px + 17, y + 17, 3, 0xffb59a);
      strokeLine(g, px + 17, y + 3, px + 3, y + 17, 3, 0xffb59a);
    }
  }
}

function drawPlant(g: Phaser.GameObjects.Graphics, x: number, y: number): void {
  g.fillStyle(0x000000, 0.35);
  g.fillCircle(x, y + 18, 28);
  g.fillStyle(0x5a4036, 1);
  g.fillRect(x - 18, y + 2, 36, 24);
  g.fillStyle(0x1c5848, 1);
  g.fillCircle(x, y - 16, 24);
  g.fillCircle(x - 18, y - 4, 16);
  g.fillCircle(x + 18, y - 8, 16);
}

function drawHatch(g: Phaser.GameObjects.Graphics, x: number, y: number): void {
  g.lineStyle(2, 0x3a4454, 0.9);
  g.strokeRect(x, y, 78, 50);
  strokeLine(g, x + 12, y + 14, x + 66, y + 14, 2, 0x3a4454, 0.9);
  strokeLine(g, x + 12, y + 26, x + 66, y + 26, 2, 0x3a4454, 0.9);
  strokeLine(g, x + 12, y + 38, x + 66, y + 38, 2, 0x3a4454, 0.9);
}

function plate(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number): void {
  g.fillStyle(0x0c1016, 0.94);
  g.fillRoundedRect(x, y, w, h, 8);
  g.lineStyle(2, 0xa8b6c8, 1);
  g.strokeRoundedRect(x, y, w, h, 8);
}

function leader(
  g: Phaser.GameObjects.Graphics,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  width = 3,
): void {
  strokeLine(g, x1, y1, x2, y2, width, 0xf7f4ee, 0.95);
  g.fillStyle(0xfff6d4, 1);
  g.fillCircle(x2, y2, 5);
}

function write(
  scene: Phaser.Scene,
  x: number,
  y: number,
  value: string,
  size: number,
  color: string,
): void {
  const label = scene.add.text(x, y, value, {
    fontFamily: "Segoe UI, Arial, sans-serif",
    fontSize: `${size}px`,
    color,
    fontStyle: "700",
  });
  label.setDepth(8);
}

function mono(
  scene: Phaser.Scene,
  x: number,
  y: number,
  value: string,
  size: number,
  color: string,
): void {
  const label = scene.add.text(x, y, value, {
    fontFamily: "Consolas, Cascadia Mono, monospace",
    fontSize: `${size}px`,
    color,
    fontStyle: "700",
  });
  label.setDepth(8);
}

function drawShield(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  scale: number,
  fill: number,
  stroke: number,
): void {
  const points = [
    [x, y - scale],
    [x + scale * 0.82, y - scale * 0.48],
    [x + scale * 0.82, y + scale * 0.18],
    [x, y + scale],
    [x - scale * 0.82, y + scale * 0.18],
    [x - scale * 0.82, y - scale * 0.48],
  ] as const;
  fillPoly(g, points, fill);
  strokePoly(g, points, stroke, 2);
}

function drawDiamond(g: Phaser.GameObjects.Graphics, x: number, y: number, radius: number): void {
  fillPoly(g, [
    [x, y - radius],
    [x + radius, y],
    [x, y + radius],
    [x - radius, y],
  ], 0xf0d5dc);
}

function drawStar(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  outer: number,
  inner: number,
  color: number,
): void {
  const points: Array<[number, number]> = [];
  const count = 10;
  for (let index = 0; index < count; index += 1) {
    const radius = index % 2 === 0 ? outer : inner;
    const angle = -Math.PI / 2 + (index * Math.PI) / (count / 2);
    points.push([x + Math.cos(angle) * radius, y + Math.sin(angle) * radius]);
  }
  fillPoly(g, points, color);
}

function worldX(x: number): number {
  return (x - CAM_X) * CELL;
}

function worldY(y: number): number {
  return (y - CAM_Y) * CELL;
}

function cellCenter(x: number, y: number): Pt {
  return { x: worldX(x) + CELL / 2, y: worldY(y) + CELL / 2 };
}

function coverBox(x: number, y: number): Box {
  const left = worldX(x);
  const top = worldY(y);
  const along = Math.round(CELL * 0.9);
  const thick = Math.round(CELL * 0.78);
  const inset = Math.round((CELL - along) / 2);
  return {
    x: left + CELL - Math.round(thick * 0.62),
    y: top + inset,
    w: thick,
    h: along,
  };
}

function lineY(from: Pt, to: Pt, x: number): number {
  const dx = to.x - from.x;
  if (dx === 0) return from.y;
  return from.y + ((to.y - from.y) * (x - from.x)) / dx;
}

function impactPoint(shot: ShotResolution): Pt {
  return {
    x: (shot.preview.impact.xMilli / 1000 - CAM_X) * CELL,
    y: (shot.preview.impact.yMilli / 1000 - CAM_Y) * CELL,
  };
}

function fillPoly(
  g: Phaser.GameObjects.Graphics,
  points: ReadonlyArray<readonly [number, number]>,
  color: number,
): void {
  const first = points[0];
  if (!first) return;
  g.fillStyle(color, 1);
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
