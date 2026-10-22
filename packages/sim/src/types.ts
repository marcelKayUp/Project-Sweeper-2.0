export const DIRECTIONS = ["n", "e", "s", "w"] as const;

export type Direction = (typeof DIRECTIONS)[number];

export interface Cell {
  readonly x: number;
  readonly y: number;
}

export interface LowCover {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly protects: Direction;
}

export interface BattleMap {
  readonly width: number;
  readonly height: number;
  readonly walls: readonly Cell[];
  readonly lowCover: readonly LowCover[];
}

export type Impact =
  | { readonly kind: "target"; readonly xMilli: number; readonly yMilli: number }
  | {
      readonly kind: "edge";
      readonly cell: Cell;
      readonly edge: Direction;
      readonly xMilli: number;
      readonly yMilli: number;
    }
  | {
      readonly kind: "corner";
      readonly cell: Cell;
      readonly xMilli: number;
      readonly yMilli: number;
    };

export interface ShotPreview {
  readonly from: Cell;
  readonly to: Cell;
  readonly distance: number;
  readonly aimBonus: number;
  readonly base: number;
  readonly distancePenalty: number;
  readonly coverPenalty: number;
  readonly raw: number | null;
  readonly chance: number | null;
  readonly clamped: boolean;
  readonly blocked: boolean;
  readonly blocker: Cell | null;
  readonly impact: Impact;
  readonly protectedEdgeCrossed: boolean;
}
