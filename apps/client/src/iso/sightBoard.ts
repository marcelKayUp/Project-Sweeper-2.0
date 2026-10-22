import type { Cell } from "@neon/sim";
import type { IsoBoard } from "./mountIsoBoard.ts";
import { sightReach, sightWatch, type SightStand } from "../sight/sightStand.ts";

export function sightBoard(
  stand: SightStand,
  selectedId: string,
  targetId: string,
  route?: { readonly id: string; readonly cells: readonly Cell[] } | null,
): IsoBoard {
  const visible = new Set(stand.visible.map(key));
  const walls = new Set(stand.walls.map(key));
  const doorClosed = stand.door && !stand.doorOpen ? key(stand.door) : "";
  const terminal = stand.terminal ? key(stand.terminal) : "";
  const floors = stand.known
    .filter((cell) => {
      const id = key(cell);
      return !walls.has(id) && id !== doorClosed && id !== terminal;
    })
    .map((cell) => ({ x: cell.x, y: cell.y, lit: visible.has(key(cell)) }));
  const floorKeys = new Set(floors.map(key));
  return {
    width: stand.width,
    height: stand.height,
    floors,
    walls: stand.walls.map((cell) => ({ x: cell.x, y: cell.y, lit: visible.has(key(cell)) })),
    door: stand.door && !stand.doorOpen ? { x: stand.door.x, y: stand.door.y } : null,
    openDoor: stand.door && stand.doorOpen ? { x: stand.door.x, y: stand.door.y } : null,
    terminal: stand.terminal ? { x: stand.terminal.x, y: stand.terminal.y } : null,
    extraction: stand.extraction
      .filter((cell) => floorKeys.has(key(cell)))
      .map((cell) => ({ x: cell.x, y: cell.y })),
    cover: stand.cover.map((cover) => ({ x: cover.x, y: cover.y, protects: cover.protects })),
    units: stand.units
      .filter((unit) => unit.status !== "extracted")
      .map((unit) => ({
        id: unit.id,
        x: unit.x,
        y: unit.y,
        team: unit.team,
        selected: unit.id === selectedId,
        target: unit.id === targetId,
        down: unit.status === "down",
        route: route && route.id === unit.id && route.cells.length > 0 ? route.cells : undefined,
      })),
    reachable: selectedId ? sightReach(stand, selectedId) : [],
    watch: sightWatch(stand),
  };
}

function key(cell: Cell): string {
  return `${cell.x},${cell.y}`;
}
