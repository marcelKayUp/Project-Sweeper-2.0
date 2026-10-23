import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { createMissionState, missionChecksum, projectTeam } from "@neon/sim";
import { ghostFloorSpec } from "@neon/sim/ghost-floor";
import type { MissionSpec } from "@neon/sim";
import { describe, expect, it } from "vitest";
import { missionIntent } from "./missionBot.ts";
import { parseReplay, replayMission, runMission, serializeReplay } from "./replay.ts";

const presets = { kite: "rifle", voss: "sidearm", nera: "rifle", sol: "sidearm" } as const;

describe("missionsorientierter Crewbot", () => {
  it("sieht keine verborgenen Gegner und verändert die Beobachtung nicht", () => {
    const spec = ghostFloorSpec(presets);
    const view = projectTeam(createMissionState(spec, 1), spec);
    expect(view.units.some((unit) => unit.team === "enemy")).toBe(false);
    const before = JSON.stringify(view);
    const command = missionIntent(view);
    expect(JSON.stringify(view)).toBe(before);
    expect(command?.kind === "shoot").toBe(false);
  });

  it("spielt 100 Seeds bis zum Sieg und liest dasselbe Replay aus einer Datei", () => {
    const spec = ghostFloorSpec(presets);
    const directory = mkdtempSync(join(tmpdir(), "neon-replay-"));
    try {
      for (let seed = 1; seed <= 100; seed += 1) {
        const replay = runMission(spec, seed);
        expect(replay.outcome).toBe("sieg");
        expect(replay.rejections).toBe(0);
        expect(replay.reason).toBe("extraktion");
        const repeated = runMission(spec, seed);
        expect(repeated.checkpoints).toEqual(replay.checkpoints);
        const file = join(directory, `${seed}.json`);
        writeFileSync(file, serializeReplay(replay), "utf8");
        const restored = replayMission(spec, parseReplay(readFileSync(file, "utf8")));
        expect(missionChecksum(restored)).toBe(replay.checkpoints[replay.checkpoints.length - 1]);
        expect(restored.botRng).toEqual(createMissionState(spec, seed).botRng);
      }
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  }, 20_000);

  it("verliert am Rundenlimit, wenn kein Weg zum Terminal bekannt ist", () => {
    const replay = runMission(sealed(), 9);
    expect(replay.outcome).toBe("niederlage");
    expect(replay.reason).toBe("rundenlimit");
    expect(replay.round).toBe(24);
    expect(replay.rejections).toBe(0);
  });

  it("lehnt eine fremde Regelversion ab", () => {
    const spec = sealed();
    const replay = runMission(spec, 2);
    expect(() => replayMission(spec, { ...replay, rulesVersion: replay.rulesVersion + 1 })).toThrow(/unbekannt/);
  });

  it("importiert keine Ansicht, kein Netzwerk und keinen Zufall", () => {
    const dir = fileURLToPath(new URL(".", import.meta.url));
    const files = readdirSync(dir).filter((name) => name.endsWith(".ts") && !name.endsWith(".test.ts"));
    const forbidden = /from ["'](?:@babylonjs|phaser|react|react-dom|@colyseus|colyseus|node:|fs)/;
    for (const name of files) {
      const source = readFileSync(join(dir, name), "utf8");
      expect(`${name}:${forbidden.test(source)}`).toBe(`${name}:false`);
      expect(`${name}:${/\bDate\.now\s*\(/.test(source)}`).toBe(`${name}:false`);
      expect(`${name}:${/\bMath\.random\s*\(/.test(source)}`).toBe(`${name}:false`);
    }
  });
});

function sealed(): MissionSpec {
  return {
    id: "sealed",
    hash: "sealed",
    width: 3,
    height: 3,
    walls: [
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 1, y: 2 },
      { x: 2, y: 0 },
      { x: 2, y: 1 },
      { x: 0, y: 2 },
    ],
    lowCover: [],
    terminal: { id: "terminal", x: 2, y: 2 },
    door: { id: "shortcut", x: 2, y: 0 },
    extraction: [{ x: 0, y: 0 }],
    spawns: [{ id: "kite", name: "Kite", team: "crew", weapon: "rifle", x: 0, y: 1, patrol: [] }],
  };
}
