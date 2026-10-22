import { GHOST_ENEMIES } from "./ghostFloorEnemies.ts";
import {
  GHOST_DOOR,
  GHOST_EXTRACTION,
  GHOST_HEIGHT,
  GHOST_LOW_COVER,
  GHOST_RUNNERS,
  GHOST_TERMINAL,
  GHOST_WALLS,
  GHOST_WIDTH,
} from "./ghostFloorLayout.ts";
import { MISSION_ID, stableHash, type MissionSpec, type WeaponId } from "./mission.ts";

const CONTENT_HASH = stableHash(
  JSON.stringify({
    door: GHOST_DOOR,
    enemies: GHOST_ENEMIES,
    extraction: GHOST_EXTRACTION,
    height: GHOST_HEIGHT,
    lowCover: GHOST_LOW_COVER,
    runners: GHOST_RUNNERS,
    terminal: GHOST_TERMINAL,
    walls: GHOST_WALLS,
    width: GHOST_WIDTH,
  }),
);

export function ghostFloorSpec(presets: Readonly<Record<string, WeaponId>>): MissionSpec {
  return {
    id: MISSION_ID,
    hash: CONTENT_HASH,
    width: GHOST_WIDTH,
    height: GHOST_HEIGHT,
    walls: GHOST_WALLS,
    lowCover: GHOST_LOW_COVER,
    terminal: GHOST_TERMINAL,
    door: GHOST_DOOR,
    extraction: GHOST_EXTRACTION,
    spawns: [
      ...GHOST_RUNNERS.map((runner) => ({
        id: runner.id,
        name: runner.name,
        team: "crew" as const,
        weapon: presets[runner.id] ?? "rifle",
        x: runner.x,
        y: runner.y,
        patrol: [],
      })),
      ...GHOST_ENEMIES.map((enemy) => ({
        id: enemy.id,
        name: enemy.name,
        team: "enemy" as const,
        weapon: "rifle" as const,
        x: enemy.x,
        y: enemy.y,
        patrol: enemy.patrol,
      })),
    ],
  };
}
