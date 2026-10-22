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
    id: "flanker-ost",
    name: "Flanker Ost",
    x: 17,
    y: 14,
    patrol: [
      { x: 17, y: 14 },
      { x: 18, y: 14 },
      { x: 17, y: 14 },
      { x: 18, y: 14 },
    ],
  },
  {
    id: "flanker-sued",
    name: "Flanker Süd",
    x: 5,
    y: 14,
    patrol: [
      { x: 5, y: 14 },
      { x: 6, y: 14 },
      { x: 5, y: 14 },
      { x: 6, y: 14 },
    ],
  },
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
    id: "wache-sued",
    name: "Wache Süd",
    x: 8,
    y: 14,
    patrol: [
      { x: 8, y: 14 },
      { x: 9, y: 14 },
      { x: 10, y: 14 },
      { x: 9, y: 14 },
    ],
  },
  {
    id: "wache-tief",
    name: "Wache Tiefe",
    x: 12,
    y: 14,
    patrol: [
      { x: 12, y: 14 },
      { x: 13, y: 14 },
      { x: 14, y: 14 },
      { x: 13, y: 14 },
    ],
  },
  {
    id: "wache-wartung",
    name: "Wache Wartung",
    x: 15,
    y: 14,
    patrol: [
      { x: 15, y: 14 },
      { x: 16, y: 14 },
      { x: 15, y: 14 },
      { x: 16, y: 14 },
    ],
  },
];
