import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  actionAp,
  ATTRIBUTE_POOL,
  balancedSheet,
  CREW_AP,
  CREW_HP,
  createRng,
  freshParts,
  previewShot,
  resolveShot,
  RIFLE_MAGAZINE,
  RIFLE_RANGE,
  SKILL_POOL,
  validateRunnerSheet,
} from "./index.ts";
import type { BattleMap } from "./index.ts";

const COMBAT_FILES = ["ap.ts", "resolve.ts", "shot.ts", "wounds.ts", "mission.ts"] as const;

describe("Platzhalterbogen", () => {
  it("verteilt ganze Punkte nur innerhalb des Pools", () => {
    expect(validateRunnerSheet(balancedSheet()).ok).toBe(true);
    expect(ATTRIBUTE_POOL).toBe(9);
    expect(SKILL_POOL).toBe(3);
    const over = {
      attribute: { physisch: 5, sozial: 3, mental: 3 },
      fertigkeiten: balancedSheet().fertigkeiten,
    };
    expect(validateRunnerSheet(over).ok).toBe(false);
    expect(validateRunnerSheet({ attribute: { physisch: 4.5, sozial: 3, mental: 1.5 }, fertigkeiten: balancedSheet().fertigkeiten }).ok).toBe(false);
  });

  it("liest die Punkte nicht in Treffer oder AP", () => {
    const dir = dirname(fileURLToPath(import.meta.url));
    for (const name of COMBAT_FILES) {
      const source = readFileSync(join(dir, name), "utf8");
      expect(source.includes("runnerSheet")).toBe(false);
      expect(source.includes("physisch")).toBe(false);
      expect(source.includes("fertigkeit")).toBe(false);
      expect(source.includes("@neon/characters")).toBe(false);
      expect(source.includes("@babylonjs")).toBe(false);
    }
    const map: BattleMap = { width: 16, height: 16, walls: [], lowCover: [] };
    const from = { x: 1, y: 1 };
    const to = { x: 5, y: 1 };
    const shot = resolveShot(
      map,
      from,
      to,
      0,
      { hp: CREW_HP, ap: CREW_AP, magazine: RIFLE_MAGAZINE, range: RIFLE_RANGE },
      freshParts(),
      createRng(1, "combat"),
    );
    expect(shot.preview.chance).toBe(previewShot(map, from, to, 0).chance);
    expect(shot.apSpent).toBe(actionAp("shot"));
    expect(actionAp("shot")).toBe(3);
    expect(actionAp("move")).toBe(1);
    expect(CREW_AP).toBe(8);
  });
});
