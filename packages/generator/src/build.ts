import type { Cell, LowCover, MissionSpec, VerticalLink } from "@neon/sim";
import { ROOM_RULES, SIZE_DIMENSIONS } from "./catalog.ts";
import { cellKey, center, roomPath } from "./graph.ts";
import { createLayout } from "./layout/index.ts";
import { random } from "./random.ts";
import { planDemand } from "./demand.ts";
import type { Building, BuildingPackage, Connection, Dressing, GeneratorConfig, Room, Service, ServiceGraph } from "./types.ts";

export function buildCandidate(config: GeneratorConfig, seeds: BuildingPackage["seeds"]): { building: Building; mission: MissionSpec } {
  const dimensions = SIZE_DIMENSIONS[config.size];
  const layout = createLayout(config, seeds);
  const { rooms, connections, entries, circulation } = layout;
  const demand = planDemand(config);
  const open = new Set<string>();
  for (const cell of circulation) open.add(cellKey(cell));
  for (const room of rooms) for (let yy = room.y; yy < room.y + room.height; yy += 1) {
    for (let xx = room.x; xx < room.x + room.width; xx += 1) open.add(cellKey({ x: xx, y: yy }));
  }
  for (const link of connections) open.add(cellKey(link.portal));
  for (const entry of entries) open.add(cellKey(entry.cell));
  const walls: Cell[] = [];
  for (let yy = 0; yy < dimensions.height; yy += 1) for (let xx = 0; xx < dimensions.width; xx += 1) {
    if (!open.has(cellKey({ x: xx, y: yy }))) walls.push({ x: xx, y: yy });
  }
  const start = rooms.find((room) => room.id === demand.entryRoomId)!;
  const target = rooms.find((room) => room.type === "server")!;
  const terminal = { id: "terminal", ...center(target) };
  const door = { id: "shortcut", ...connections.find((link) => link.kind === "shortcut")!.portal };
  const extraction = [0, 1, 2, 3].map((index) => ({ x: start.x + index % 2, y: start.y + Math.floor(index / 2) }));
  const crew = ["kite", "voss", "nera", "sol"].map((id, index) => ({
    id, name: id[0]!.toUpperCase() + id.slice(1), team: "crew" as const,
    weapon: index % 2 ? "sidearm" as const : "rifle" as const, ...extraction[index]!, patrol: [],
  }));
  const encounterRng = random(seeds.encounters);
  const encounterRooms = encounterRng.shuffle(rooms.filter((room) => room.id !== start.id && !["reception", "restroom", "airlock", "cleanroom"].includes(room.type)));
  const enemies = encounterRooms.slice(0, 6).map((room, index) => {
    const position = { x: room.x + room.width - 1, y: room.y + room.height - 1 };
    return { id: `enemy-${index}`, name: `${index < 4 ? "Wache" : "Flanker"} ${index + 1}`, team: "enemy" as const, weapon: "rifle" as const, ...position, patrol: [position, { x: position.x - 1, y: position.y }] };
  });
  const reserved = new Set([terminal, door, ...extraction, ...enemies.flatMap((enemy) => enemy.patrol), ...connections.map((link) => link.portal)].map(cellKey));
  const tacticalRng = random(seeds.tactics);
  const lowCover: LowCover[] = [];
  for (const room of rooms) {
    if (["reception", "airlock", "restroom", "corridor"].includes(room.type)) continue;
    const position = { x: room.x + 1, y: room.y + 1 };
    if (!reserved.has(cellKey(position))) {
      lowCover.push({ id: `cover-${room.id}`, ...position, protects: tacticalRng.int(2) ? "w" : "e" });
      reserved.add(cellKey(position));
    }
  }
  const linkBlocked = new Set<string>([
    cellKey(terminal),
    cellKey(door),
    ...crew.map((spawn) => cellKey(spawn)),
    ...enemies.flatMap((enemy) => enemy.patrol.map((cell) => cellKey(cell))),
    ...lowCover.map((cover) => cellKey(cover)),
  ]);
  const links = placeVerticalLinks(config.family, circulation, linkBlocked);
  for (const link of links) reserved.add(cellKey({ x: link.fromX, y: link.fromY }));
  const dressingRng = random(seeds.dressing);
  const dressing: Dressing[] = [];
  for (const room of rooms) {
    if (room.type === "corridor") continue;
    if (room.workplaceRole !== "support") {
      const cells: Cell[] = [];
      for (let yy = room.y; yy < room.y + room.height; yy += 1) for (let xx = room.x; xx < room.x + room.width; xx += 1) if (!reserved.has(cellKey({ x: xx, y: yy }))) cells.push({ x: xx, y: yy });
      const ordered = dressingRng.shuffle(cells).sort((a, b) => (a.x + a.y) % 2 - (b.x + b.y) % 2 || a.y - b.y || a.x - b.x);
      for (const [index, position] of ordered.slice(0, room.assignedDemand).entries()) {
        dressing.push({ id: `desk-${room.id}-${index}`, roomId: room.id, ...position, module: "desk" });
        reserved.add(cellKey(position));
      }
      continue;
    }
    const position = { x: room.x + dressingRng.int(room.width), y: room.y + dressingRng.int(room.height) };
    if (reserved.has(cellKey(position))) continue;
    dressing.push({ id: `decoration-${room.id}`, roomId: room.id, ...position,
      module: room.type === "meeting" || room.type === "boardroom" || room.type === "focus" ? "table" : room.type === "atrium" ? "planter" : room.type === "laboratory" ? "bench" : room.type === "production" ? "machine" : "cabinet" });
    reserved.add(cellKey(position));
  }
  const missionGraph = {
    entryRoom: start.id, secondaryEntryRoom: demand.secondaryEntryRoomId, targetRoom: target.id,
    objectives: [
      { id: "infiltrate", roomId: start.id, action: "enter" as const, requires: [] },
      { id: "copy", roomId: target.id, action: "copy-twice" as const, requires: ["infiltrate"] },
      { id: "extract", roomId: start.id, action: "extract" as const, requires: ["copy"] },
    ],
    routes: layout.routes,
  };
  const levels = [
    { z: 0, walls, lowCover },
    { z: 1, walls: walls.map((cell) => ({ x: cell.x, y: cell.y })), lowCover: [] },
  ];
  const building: Building = { identity: demand.identity, relationships: demand.relationships, demand: demand.summary, layout: layout.info, rooms, circulation, program: demand.program, connections, entries, infrastructure: buildServices(rooms, connections), missionGraph, dressing, links };
  const mission: MissionSpec = { id: `generated-${config.instanceId}`, hash: "", ...dimensions, walls, lowCover, terminal, door, extraction, spawns: [...crew, ...enemies], levels, links };
  return { building, mission };
}

function placeVerticalLinks(family: GeneratorConfig["family"], circulation: readonly Cell[], reserved: ReadonlySet<string>): VerticalLink[] {
  const open = circulation.filter((cell) => !reserved.has(cellKey(cell))).sort((a, b) => a.y - b.y || a.x - b.x);
  const stair = open[0];
  const lift = open[1];
  if (!stair || !lift) return [];
  const kind = family === "factory" ? "freight" : "passenger";
  return [
    { id: "stair", kind: "stair", fromZ: 0, fromX: stair.x, fromY: stair.y, toZ: 1, toX: stair.x, toY: stair.y },
    { id: kind, kind, fromZ: 0, fromX: lift.x, fromY: lift.y, toZ: 1, toX: lift.x, toY: lift.y },
  ];
}

function buildServices(rooms: readonly Room[], connections: readonly Connection[]): ServiceGraph[] {
  return (["power", "ventilation", "network", "security"] as const).map((kind: Service) => {
    const source = rooms.find((room) => room.type === (kind === "security" ? "security" : kind === "network" ? "server" : "mechanical"))!;
    // Supply trees follow architectural adjacency, including intermediate distribution rooms.
    const edges: { from: string; to: string }[] = [];
    const nodes = new Set([source.id]);
    for (const room of rooms.filter((room) => ROOM_RULES[room.type].services.includes(kind))) {
      const path = roomPath(connections, source.id, room.id);
      for (let i = 1; i < path.length; i += 1) {
        const next = path[i]!;
        if (!nodes.has(next)) { edges.push({ from: path[i - 1]!, to: next }); nodes.add(next); }
      }
    }
    return { kind, source: source.id, nodes: [...nodes].sort(), edges };
  });
}

export function preferenceScore(building: Building, mission: MissionSpec): number {
  const offices = building.rooms.filter((room) => room.type === "office");
  const exterior = offices.some((office) => office.x === 1 || office.y === 1 || office.x + office.width === mission.width - 1 || office.y + office.height === mission.height - 1);
  const storage = building.rooms.find((room) => room.type === "storage")!;
  const loading = building.rooms.find((room) => room.type === "loading")!;
  const restroom = building.rooms.find((room) => room.type === "restroom")!;
  const mechanical = building.rooms.find((room) => room.type === "mechanical")!;
  const distance = (a: Room | undefined, b: Room | undefined): number => a && b ? roomPath(building.connections, a.id, b.id).length - 1 : 6;
  // Integer quality components; never acceptance criteria or a fairness claim.
  return (exterior ? 40 : 0) + Math.max(0, 30 - 5 * distance(storage, loading)) + Math.max(0, 30 - 5 * distance(restroom, mechanical));
}
