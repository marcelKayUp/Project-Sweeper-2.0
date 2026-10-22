import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { generateBuilding, GENERATOR_VERSION, canonical, defaultBusinessProfile } from "../packages/generator/src/index.ts";

const suites = [];
for (const family of ["office", "laboratory", "factory"]) for (const size of ["compact", "standard", "large"]) {
  const summary = { family, size, businessProfile: defaultBusinessProfile(family, size), seeds: { first: 0, last: 99 }, accepted: 0, failed: 0, fallback: 0, retries: 0, discardedLayoutCandidates: 0, nonGridLayouts: 0, minRoomCount: Infinity, maxRoomCount: 0, minTargetDistance: Infinity, maxTargetDistance: 0, errors: [] };
  const missionHashes = new Set();
  const geometries = new Set();
  for (let seed = 0; seed < 100; seed += 1) {
    const result = await generateBuilding({ seed, family, size });
    if (!result.ok) { summary.failed += 1; summary.errors.push({ seed, errors: result.errors, attempts: result.attempts }); continue; }
    const item = result.package;
    assert.equal(item.report.errors.length, 0);
    summary.accepted += 1; summary.retries += item.attempt - 1;
    summary.discardedLayoutCandidates += (item.attempt - 1) * 4 + item.building.layout.candidate - 1;
    const rooms = item.building.rooms;
    summary.minRoomCount = Math.min(summary.minRoomCount, rooms.length);
    summary.maxRoomCount = Math.max(summary.maxRoomCount, rooms.length);
    geometries.add(canonical(rooms.map(({ x, y, width, height }) => ({ x, y, width, height })).sort((a, b) => a.y - b.y || a.x - b.x)));
    summary.nonGridLayouts += Number(new Set(rooms.map((room) => `${room.x}/${room.width}`)).size * new Set(rooms.map((room) => `${room.y}/${room.height}`)).size > rooms.length);
    summary.minTargetDistance = Math.min(summary.minTargetDistance, item.report.metrics.targetDistance);
    summary.maxTargetDistance = Math.max(summary.maxTargetDistance, item.report.metrics.targetDistance);
    missionHashes.add(item.mission.hash);
  }
  summary.distinctMissionHashes = missionHashes.size;
  summary.distinctGeometries = geometries.size;
  suites.push(summary);
}
const report = { generatorVersion: GENERATOR_VERSION, seedCount: 900, accepted: suites.reduce((sum, suite) => sum + suite.accepted, 0), failed: suites.reduce((sum, suite) => sum + suite.failed, 0), fallback: 0, suites, limitations: ["Geometric and semantic validation only", "No full bot mission or human acceptance", "No ordinary multiplayer client import"] };
const folder = fileURLToPath(new URL("../artifacts/generator/", import.meta.url));
await mkdir(folder, { recursive: true });
await writeFile(new URL("../artifacts/generator/seed-suite.json", import.meta.url), JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify(report, null, 2));
if (report.failed > 0) process.exitCode = 1;
