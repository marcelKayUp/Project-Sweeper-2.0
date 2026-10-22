import type { Cell } from "./types.ts";

export interface EnemySpawn {
  readonly id: string;
  readonly name: string;
  readonly x: number;
  readonly y: number;
  readonly patrol: readonly Cell[];
}

export const GHOST_ENEMIES: readonly EnemySpawn[] = [
  {
    id: "wache-haupt",
    name: "Wache Hauptweg",
    x: 17,
    y: 7,
    patrol: [
      { x: 17, y: 7 },
      { x: 16, y: 7 },
      { x: 15, y: 7 },
      { x: 16, y: 7 },
    ],
  },
  {
    id: "wache-wartung",
    name: "Wache Wartung",
    x: 17,
    y: 14,
    patrol: [
      { x: 17, y: 14 },
      { x: 16, y: 14 },
      { x: 15, y: 14 },
      { x: 16, y: 14 },
    ],
  },
];
