import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { generateBuilding } from "../packages/generator/src/index.ts";

const args = process.argv.slice(2);
const options = {};
for (let index = 0; index < args.length; index += 2) {
  const key = args[index];
  const value = args[index + 1];
  if (!["--seed", "--family", "--size", "--occupants", "--workplaces", "--processUnits", "--storageUnits", "--scope", "--floorShare", "--corporation", "--siteRole", "--department", "--statusTier", "--buildingHistory", "--condition"].includes(key) || value === undefined) {
    throw new Error("Aufruf: corepack pnpm generate:building --seed 42 --family office --size standard --occupants 24 --workplaces 24 [--scope mission-floor --floorShare 50]");
  }
  options[key.slice(2)] = ["--family", "--size", "--scope", "--corporation", "--siteRole", "--department", "--statusTier", "--buildingHistory", "--condition"].includes(key) ? value : value.trim() ? Number(value) : NaN;
}
const result = await generateBuilding({ seed: 42, family: "laboratory", ...options });
if (!result.ok) {
  console.error(JSON.stringify(result, null, 2));
  process.exitCode = 1;
} else {
  const output = fileURLToPath(new URL("../artifacts/generator/", import.meta.url));
  await mkdir(output, { recursive: true });
  const item = result.package;
  const base = `${item.config.family}-${item.config.size}-${item.config.seed}-${item.hash.slice(0, 8)}`;
  await writeFile(path.join(output, `${base}.building.json`), JSON.stringify(item, null, 2) + "\n");
  await writeFile(path.join(output, `${base}.mission.json`), JSON.stringify(item.mission, null, 2) + "\n");
  console.log(JSON.stringify({ output, files: [`${base}.building.json`, `${base}.mission.json`], hash: item.hash, attempt: item.attempt, corporation: item.building.identity.name, demand: item.building.demand, metrics: item.report.metrics, warnings: item.report.warnings }, null, 2));
}
