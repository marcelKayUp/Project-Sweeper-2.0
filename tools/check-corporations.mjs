import { mkdir, writeFile } from "node:fs/promises";
import { generateBuilding, GENERATOR_VERSION } from "../packages/generator/src/index.ts";

const suites = [];
for (const corporation of ["kasane", "concord", "parallax", "verdant"]) for (const family of ["office", "laboratory", "factory"]) {
  const config = { corporation, family, size: "standard", siteRole: "headquarters" };
  const suite = { config, seeds: { first: 0, last: 24 }, accepted: 0, failed: 0, retries: 0, discardedLayouts: 0, minRooms: Infinity, maxRooms: 0, minCorridorCells: Infinity, minExecutiveSanitaryDistance: null, maxExecutiveSanitaryDistance: null, errors: [] };
  for (let seed = 0; seed < 25; seed += 1) {
    const result = await generateBuilding({ ...config, seed });
    if (!result.ok) { suite.failed += 1; suite.errors.push({ seed, errors: result.errors }); continue; }
    const item = result.package;
    suite.accepted += 1; suite.retries += item.attempt - 1;
    suite.discardedLayouts += (item.attempt - 1) * 4 + item.building.layout.candidate - 1;
    suite.minRooms = Math.min(suite.minRooms, item.building.rooms.length);
    suite.maxRooms = Math.max(suite.maxRooms, item.building.rooms.length);
    suite.minCorridorCells = Math.min(suite.minCorridorCells, item.report.metrics.corridorCells);
    const distance = item.report.metrics.executiveSanitaryDistance;
    if (distance !== null) { suite.minExecutiveSanitaryDistance = Math.min(suite.minExecutiveSanitaryDistance ?? distance, distance); suite.maxExecutiveSanitaryDistance = Math.max(suite.maxExecutiveSanitaryDistance ?? distance, distance); }
  }
  suites.push(suite);
}
const variants = [];
for (const corporation of ["kasane", "concord", "parallax", "verdant"]) for (const variant of [
  { siteRole: "branch", department: "legal" },
  { siteRole: "operations", department: "finance", statusTier: "contractor" },
  { siteRole: "headquarters", scope: "mission-floor", floorShare: 50, statusTier: "staff" },
  { siteRole: "headquarters", scope: "mission-floor", floorShare: 50, statusTier: "executive" },
  { siteRole: "branch", department: "engineering", buildingHistory: "converted", condition: "patched" },
]) {
  const config = { seed: 42, family: "office", size: "large", occupants: 24, workplaces: 24, corporation, ...variant };
  const result = await generateBuilding(config);
  variants.push({ config, ok: result.ok, rooms: result.ok ? result.package.building.rooms.length : null, errors: result.ok ? [] : result.errors });
}
const report = { generatorVersion: GENERATOR_VERSION, seeds: 300, accepted: suites.reduce((sum, suite) => sum + suite.accepted, 0), failed: suites.reduce((sum, suite) => sum + suite.failed, 0), fallback: 0, suites, variants, limitations: ["Geometric, capacity and identity validation", "No full bot mission or human playtest", "Existing single-floor MissionSpec only"] };
await mkdir(new URL("../artifacts/generator/", import.meta.url), { recursive: true });
await writeFile(new URL("../artifacts/generator/corporate-suite.json", import.meta.url), JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify({ generatorVersion: report.generatorVersion, seeds: report.seeds, accepted: report.accepted, failed: report.failed, variants: variants.length, failedVariants: variants.filter((variant) => !variant.ok), suites }, null, 2));
if (report.failed || variants.some((variant) => !variant.ok)) process.exitCode = 1;
