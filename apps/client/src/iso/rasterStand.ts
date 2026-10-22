import {
  CREW_AP,
  FLAT_RULES_VERSION,
  PROTOCOL_VERSION,
  type Cell,
  type FlatWalk,
} from "@neon/sim";

const COMMAND_ID = /^[A-Za-z0-9-]{1,40}$/;

export interface RasterStand {
  readonly ack: number;
  readonly commandId: string;
  readonly revision: number;
  readonly rulesVersion: number;
  readonly width: number;
  readonly height: number;
  readonly walls: readonly Cell[];
  readonly x: number;
  readonly y: number;
  readonly ap: number;
  readonly round: number;
  readonly notice: string;
}

export interface RasterMoveBody {
  readonly protocol: typeof PROTOCOL_VERSION;
  readonly area: "raster";
  readonly commandId: string;
  readonly kind: "move";
  readonly path: readonly Cell[];
}

export interface RasterResetBody {
  readonly protocol: typeof PROTOCOL_VERSION;
  readonly area: "raster";
  readonly commandId: string;
  readonly kind: "reset";
}

export interface RasterEndBody {
  readonly protocol: typeof PROTOCOL_VERSION;
  readonly area: "raster";
  readonly commandId: string;
  readonly kind: "end";
}

export type RasterWishBody = RasterMoveBody | RasterResetBody | RasterEndBody;

export function rasterMove(commandId: string, path: readonly Cell[]): RasterMoveBody {
  return {
    protocol: PROTOCOL_VERSION,
    area: "raster",
    commandId,
    kind: "move",
    path: path.map((cell) => ({ x: cell.x, y: cell.y })),
  };
}

export function rasterReset(commandId: string): RasterResetBody {
  return {
    protocol: PROTOCOL_VERSION,
    area: "raster",
    commandId,
    kind: "reset",
  };
}

export function rasterEnd(commandId: string): RasterEndBody {
  return {
    protocol: PROTOCOL_VERSION,
    area: "raster",
    commandId,
    kind: "end",
  };
}

export function readRasterStand(payload: unknown): RasterStand | null {
  if (!payload || typeof payload !== "object") return null;
  const value = payload as Record<string, unknown>;
  const width = bounded(value.width, 1, 16);
  const height = bounded(value.height, 1, 16);
  const ack = bounded(value.ack, 0, Number.MAX_SAFE_INTEGER);
  const revision = bounded(value.revision, 0, Number.MAX_SAFE_INTEGER);
  const x = width === null ? null : bounded(value.x, 0, width - 1);
  const y = height === null ? null : bounded(value.y, 0, height - 1);
  const ap = bounded(value.ap, 0, CREW_AP);
  const round = bounded(value.round, 1, Number.MAX_SAFE_INTEGER);
  const commandId = value.commandId;
  const notice = value.notice;
  if (
    width === null ||
    height === null ||
    ack === null ||
    revision === null ||
    x === null ||
    y === null ||
    ap === null ||
    round === null ||
    value.rulesVersion !== FLAT_RULES_VERSION ||
    !commandIdOk(commandId) ||
    !noticeOk(notice)
  ) {
    return null;
  }
  const walls = wallsOf(value.walls, width, height);
  if (!walls) return null;
  return { ack, commandId, revision, rulesVersion: FLAT_RULES_VERSION, width, height, walls, x, y, ap, round, notice };
}

export function walkFromStand(stand: RasterStand): FlatWalk {
  return {
    rulesVersion: FLAT_RULES_VERSION,
    map: {
      width: stand.width,
      height: stand.height,
      walls: stand.walls.map((cell) => ({ x: cell.x, y: cell.y })),
      lowCover: [],
    },
    actor: { id: "runner", x: stand.x, y: stand.y, ap: stand.ap },
    round: stand.round,
    revision: stand.revision,
  };
}

function bounded(value: unknown, min: number, max: number): number | null {
  if (typeof value !== "number" || !Number.isInteger(value) || value < min || value > max) return null;
  return value;
}

function commandIdOk(value: unknown): value is string {
  return typeof value === "string" && (value === "" || COMMAND_ID.test(value));
}

function noticeOk(value: unknown): value is string {
  return typeof value === "string" && value.length <= 200 && !/[\u0000-\u001F]/.test(value);
}

function wallsOf(value: unknown, width: number, height: number): readonly Cell[] | null {
  if (!Array.isArray(value) || value.length > 64) return null;
  const walls: Cell[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== "object") return null;
    const cell = entry as { x?: unknown; y?: unknown };
    const x = bounded(cell.x, 0, width - 1);
    const y = bounded(cell.y, 0, height - 1);
    if (x === null || y === null) return null;
    walls.push({ x, y });
  }
  return walls;
}
