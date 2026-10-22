import type { Cell } from "@neon/sim";
import { ROOM_RULES, SIZE_DIMENSIONS } from "../catalog.ts";
import { planDemand } from "../demand.ts";
import { roomAppearance } from "../corporate.ts";
import { center, independentRoomPaths, roomPath, cellKey, neighbors } from "../graph.ts";
import { hallId, sanitaryPath, EXECUTIVE_SANITARY_LIMIT } from "../circulation.ts";
import { random } from "../random.ts";
import type { BuildingPackage, Connection, DemandPlan, GeneratorConfig, LayoutInfo, Room, RoomRequirement } from "../types.ts";
import { sharedPortals, splitRectangle, type Rectangle } from "./bsp.ts";

export const LAYOUT_CANDIDATE_LIMIT = 4;
export class LayoutFailure extends Error {
  readonly rejected: LayoutInfo["rejected"];
  constructor(rejected: LayoutInfo["rejected"]) { super("Kein Grundriss innerhalb des begrenzten Layoutbudgets"); this.rejected = rejected; }
}
export function requiredPairs(plan: DemandPlan): readonly (readonly [number, number])[] {
  return plan.relationships.filter((link) => link.maxDistance === undefined).map((link) => [plan.instances.findIndex((room) => room.id === link.from), plan.instances.findIndex((room) => room.id === link.to)] as const);
}

// Double-loaded corridors: wall / hall / wall between paired room strips,
// shared walls within each pair. Two side returns close the circulation loop.
export function createLayout(config: GeneratorConfig, seeds: BuildingPackage["seeds"]) {
  const { width, height } = SIZE_DIMENSIONS[config.size]; const plan = planDemand(config);
  const rejected: { candidate: number; reason: string; nodes: number }[] = [];
  for (let candidate = 1; candidate <= LAYOUT_CANDIDATE_LIMIT; candidate++) {
    const partitionSeed = (seeds.floorplan ^ Math.imul(candidate, 0x9e3779b9)) >>> 0;
    const embeddingSeed = (seeds.program ^ Math.imul(candidate, 0x85ebca6b)) >>> 0;
    const rng = random(partitionSeed); const orderRng = random(embeddingSeed);
    const rowCount = plan.instances.length > 26 ? 6 : 4;
    const gapTotal = rowCount / 2 * 3 + (rowCount / 2 - 1);
    if (height - 2 < gapTotal + rowCount * 3) { rejected.push({ candidate, reason: "Zu wenig Gebäudetiefe für Raumstreifen, Flure und Trennwände", nodes: 0 }); continue; }
    const topologyRng = random(seeds.topology ^ candidate);
    const heights = Array<number>(rowCount).fill(3);
    for (let extra = height - 2 - gapTotal - rowCount * 3; extra > 0; extra--) heights[rng.int(rowCount)]!++;
    const rows: { bounds: Rectangle; hallY: number; groups: RoomRequirement[][] }[] = []; const hallYs: number[] = [];
    let y = 1;
    for (let row = 0; row < rowCount; row++) {
      const outer = row === 0 || row === rowCount - 1;
      const hallY = row % 2 === 0 ? y + heights[row]! + 1 : hallYs[hallYs.length - 1]!;
      rows.push({ bounds: { x: outer ? 1 : 3, y, width: width - (outer ? 2 : 6), height: heights[row]! }, hallY, groups: [] });
      y += heights[row]!;
      if (row < rowCount - 1) { if (row % 2 === 0) { hallYs.push(y + 1); y += 3; } else y++; }
    }
    const cellMap = new Map<string, Cell>();
    for (const hallY of hallYs) for (let x = 1; x < width - 1; x++) cellMap.set(`${x},${hallY}`, { x, y: hallY });
    for (const x of [1, width - 2]) for (let yy = hallYs[0]!; yy <= hallYs[hallYs.length - 1]!; yy++) cellMap.set(`${x},${yy}`, { x, y: yy });
    const circulation = [...cellMap.values()].sort((a, b) => a.y - b.y || a.x - b.x);
    const pending = new Set(plan.instances.map((room) => room.id)); const groups: RoomRequirement[][] = [];
    while (pending.size) {
      const group = [plan.instances.find((room) => room.id === [...pending][0])!]; pending.delete(group[0]!.id);
      for (let i = 0; i < group.length; i++) for (const link of plan.relationships) {
        const next = link.from === group[i]!.id ? link.to : link.to === group[i]!.id ? link.from : "";
        if (pending.delete(next)) group.push(plan.instances.find((room) => room.id === next)!);
      }
      const direct = plan.relationships.filter((link) => link.maxDistance === undefined && group.some((room) => room.id === link.from));
      const degree = (room: RoomRequirement) => direct.filter((link) => link.from === room.id || link.to === room.id).length;
      const first = group.find((room) => room.type === "executive") ?? group.find((room) => degree(room) === 1) ?? group[0]!;
      const ordered = [first];
      while (ordered.length < group.length) {
        const last = ordered[ordered.length - 1]!;
        const next = group.find((room) => !ordered.includes(room) && direct.some((link) => link.from === last.id && link.to === room.id || link.to === last.id && link.from === room.id)) ?? group.find((room) => room.type === "restroom" && !ordered.includes(room)) ?? group.find((room) => !ordered.includes(room))!;
        ordered.push(next);
      }
      groups.push(ordered);
    }
    const minWidth = (room: RoomRequirement, row: typeof rows[number]) => Math.max(3, Math.ceil(room.minArea / row.bounds.height));
    const groupWidth = (group: RoomRequirement[], row: typeof rows[number]) => group.reduce((sum, room) => sum + minWidth(room, row) + 1, 0);
    const priority = orderRng.shuffle(groups).sort((a, b) => Number(b.some((room) => room.id === plan.entryRoomId || room.id === plan.secondaryEntryRoomId)) - Number(a.some((room) => room.id === plan.entryRoomId || room.id === plan.secondaryEntryRoomId)) || b.length - a.length);
    const rowOrder = orderRng.shuffle(rows.map((_, i) => i)); let nodes = 0; let backtracks = 0;
    function pack(index: number): boolean {
      if (index === priority.length) return true;
      const group = priority[index]!;
      const fixed = group.some((room) => room.id === plan.entryRoomId) ? 0 : group.some((room) => room.id === plan.secondaryEntryRoomId) ? rows.length - 1 : null;
      for (const ri of fixed === null ? rowOrder : [fixed]) {
        if (nodes++ >= 12000) return false;
        const row = rows[ri]!;
        if (row.groups.reduce((sum, placed) => sum + groupWidth(placed, row), 0) + groupWidth(group, row) > row.bounds.width + 1) continue;
        row.groups.push(group);
        if (pack(index + 1)) return true;
        row.groups.pop(); backtracks++;
      }
      return false;
    }
    if (!pack(0)) { rejected.push({ candidate, reason: "Raumgruppen passen nicht neben die reservierten Flure und Wände", nodes: Math.min(nodes, 12000) }); continue; }
    const rooms: Room[] = []; const partitions: LayoutInfo["partitions"][number][] = [];
    for (const [ri, row] of rows.entries()) {
      const instances = row.groups.flat(); if (!instances.length) continue;
      const widths = instances.map((room) => minWidth(room, row));
      let spare = row.bounds.width - widths.reduce((a, b) => a + b, 0) - instances.length + 1;
      for (const i of rng.shuffle(instances.map((_, index) => index))) { const add = Math.min(spare, rng.int(3)); widths[i]! += add; spare -= add; }
      let remainder = row.bounds;
      for (const [index, instance] of instances.entries()) {
        const rw = widths[index]!; const rect = { ...remainder, width: rw };
        rooms.push({ ...instance, zone: ROOM_RULES[instance.type].zone, appearance: roomAppearance(config, instance), ...rect });
        if (index < instances.length - 1) { partitions.push({ id: `strip-${ri}-${index}`, bounds: remainder, axis: "x", offset: rw }); remainder = splitRectangle(remainder, "x", rw)[1]; }
      }
    }
    rooms.sort((a, b) => plan.instances.findIndex((room) => room.id === a.id) - plan.instances.findIndex((room) => room.id === b.id));
    let connections: Connection[] = []; const cells = new Set(circulation.map(cellKey));
    for (const cell of circulation) for (const next of neighbors(cell)) if (cells.has(cellKey(next)) && (next.y > cell.y || next.y === cell.y && next.x > cell.x)) connections.push({ id: `passage-${hallId(cell)}-${hallId(next)}`, from: hallId(cell), to: hallId(next), kind: "passage", portal: cell });
    for (const room of rooms) {
      if (plan.relationships.some((rule) => rule.exclusive && rule.from === room.id)) continue;
      const row = rows.find((row) => row.bounds.y === room.y)!;
      const xs = room.id === plan.entryRoomId || room.id === plan.targetRoomId ? [room.x, room.x + room.width - 1] : [center(room).x];
      const py = row.hallY < room.y ? room.y - 1 : room.y + room.height;
      for (const x of xs) connections.push({ id: `door-${room.id}-${x}`, from: room.id, to: hallId({ x, y: row.hallY }), kind: room.zone !== "staff" || room.access !== "staff" ? "controlled" : "open", portal: { x, y: py } });
    }
    let valid = true;
    for (const rule of plan.relationships.filter((rule) => rule.maxDistance === undefined)) {
      const from = rooms.find((room) => room.id === rule.from)!; const to = rooms.find((room) => room.id === rule.to)!; const portals = sharedPortals(from, to);
      if (!portals.length) { valid = false; break; }
      connections.push({ id: `neighbor-${from.id}-${to.id}`, from: from.id, to: to.id, kind: from.type === "cleanroom" || to.type === "cleanroom" ? "airlock" : from.zone !== to.zone || from.access !== to.access ? "controlled" : "open", portal: portals[Math.floor(portals.length / 2)]! });
    }
    const shape = { rooms, connections, circulation };
    for (const rule of plan.relationships.filter((rule) => rule.maxDistance !== undefined)) {
      const path = sanitaryPath(shape, rooms.find((room) => room.id === rule.from)!, undefined, rooms.find((room) => room.id === rule.to)!);
      if (!path.length || path.length - 1 > rule.maxDistance!) valid = false;
    }
    const ceo = rooms.find((room) => room.type === "executive"); const ceoPath = ceo ? sanitaryPath(shape, ceo) : [];
    if (ceo && (!ceoPath.length || ceoPath.length - 1 > EXECUTIVE_SANITARY_LIMIT)) valid = false;
    const shortcutOptions: Connection[] = [];
    for (let a = 0; a < rooms.length; a++) for (let b = a + 1; b < rooms.length; b++) {
      const from = rooms[a]!; const to = rooms[b]!; const options = sharedPortals(from, to);
      if (!options.length || [from, to].some((room) => ["restroom", "focus", "executive", "cleanroom", "airlock", "reception"].includes(room.type)) || connections.some((link) => link.from === from.id && link.to === to.id || link.to === from.id && link.from === to.id)) continue;
      shortcutOptions.push({ id: "shortcut", from: from.id, to: to.id, kind: "shortcut", portal: options[topologyRng.int(options.length)]! });
    }
    if (!valid || !shortcutOptions.length || rooms.some((room) => !roomPath(connections, plan.entryRoomId, room.id).length)) { rejected.push({ candidate, reason: "Geschützte Zugänge oder kurze Sanitärwege sind in diesem Entwurf nicht erfüllt", nodes }); continue; }
    connections = [...connections, shortcutOptions[topologyRng.int(shortcutOptions.length)]!];
    const routes = independentRoomPaths(connections, plan.entryRoomId, plan.targetRoomId);
    if (routes.length !== 2) { rejected.push({ candidate, reason: "Zwei reguläre Missionswege fehlen im Flurnetz", nodes }); continue; }
    const entries = [plan.entryRoomId, plan.secondaryEntryRoomId].map((roomId) => { const room = rooms.find((room) => room.id === roomId)!; return { roomId, cell: { x: center(room).x, y: room.y === 1 ? 0 : height - 1 } }; });
    return { rooms, circulation, connections, entries, routes, info: { method: "circulation" as const, templateId: "double-loaded-loop/1", candidate, partitionSeed, embeddingSeed, searchNodes: Math.max(1, nodes), backtracks, partitions, rejected } };
  }
  throw new LayoutFailure(rejected);
}
