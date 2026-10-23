import { floorsOf, linksOf, type Cell, type MissionSpec } from "@neon/sim";
import { ROOM_RULES, SIZE_DIMENSIONS } from "./catalog.ts";
import { cellKey, contains, flood, independentRoomRoutes, neighbors, roomPath, sameCell } from "./graph.ts";
import { preferenceScore } from "./build.ts";
import type { Building, Finding, GeneratorConfig, ValidationReport } from "./types.ts";
import { architecturalNodes, hallId, sanitaryPath, EXECUTIVE_SANITARY_LIMIT } from "./circulation.ts";
import { planDemand } from "./demand.ts";
import { canonical } from "./random.ts";
import { requiredPairs } from "./layout/index.ts";
import { roomAppearance, roomSemantics } from "./corporate.ts";

export function validateBuilding(building: Building, mission: MissionSpec, config: GeneratorConfig): ValidationReport {
  const errors: Finding[] = [];
  const warnings: Finding[] = [];
  const fail = (code: string, message: string, ...ids: string[]): void => { errors.push({ code, message, ids }); };
  const bounds = (cell: Cell): boolean => Number.isInteger(cell.x) && Number.isInteger(cell.y) && cell.x >= 0 && cell.y >= 0 && cell.x < mission.width && cell.y < mission.height;
  const unique = (items: readonly string[], code: string): void => {
    const seen = new Set<string>();
    for (const item of items) { if (seen.has(item)) fail(code, "Doppelte ID oder Koordinate", item); seen.add(item); }
  };
  const dimensions = SIZE_DIMENSIONS[config.size];
  const demand = planDemand(config);
  for (const error of demand.errors) errors.push(error);
  if (mission.width !== dimensions.width || mission.height !== dimensions.height) fail("dimensions", "Kartengröße passt nicht zur Konfiguration");
  // Bound traversal work even for malformed internal candidates.
  if (!Number.isInteger(mission.width) || !Number.isInteger(mission.height) || mission.width < 1 || mission.height < 1 || mission.width > 32 || mission.height > 32) {
    return { errors: [{ code: "dimensions", message: "Ungültige Kartengrenzen", ids: [] }], warnings: [], metrics: { roomCount: 0, walkableCells: 0, targetDistance: -1, independentRoutes: 0, coverCount: 0, preferenceScore: 0, corridorCells: 0, executiveSanitaryDistance: null } };
  }
  const layout = building.layout;
  if (layout.method !== "circulation" || layout.templateId !== "double-loaded-loop/1") fail("layout-method", "Grundriss benötigt eine eigene Flurerschließung");
  if (!Number.isInteger(layout.candidate) || layout.candidate < 1 || layout.candidate > 4 || layout.rejected.length !== layout.candidate - 1 || !Number.isInteger(layout.searchNodes) || layout.searchNodes < 1 || layout.searchNodes > 12000 || !Number.isInteger(layout.backtracks) || layout.backtracks < 0 || layout.backtracks > layout.searchNodes) fail("layout-budget", "Ungültiger oder überschrittener Layout-Suchbericht");
  const rectangleKey = (rect: { x: number; y: number; width: number; height: number }) => `${rect.x}/${rect.y}/${rect.width}/${rect.height}`;
  const occupiedRows = new Set(building.rooms.map((room) => room.y));
  if (layout.partitions.length !== building.rooms.length - occupiedRows.size || new Set(layout.partitions.map((part) => part.id)).size !== layout.partitions.length) fail("partition-tree", "Streifenteilungen passen nicht zur Raumzahl");
  for (const part of layout.partitions) {
    const left = { ...part.bounds, width: part.offset };
    if (part.axis !== "x" || !Number.isInteger(part.offset) || part.offset < 3 || part.offset >= part.bounds.width - 1 || !building.rooms.some((room) => rectangleKey(room) === rectangleKey(left))) fail("partition-tree", "Streifenschnitt passt nicht zu seiner Raumfläche", part.id);
  }
  unique(building.rooms.map((room) => room.id), "room-id");
  unique(building.connections.map((link) => link.id), "connection-id");
  unique(building.connections.map((link) => [link.from, link.to].sort().join("/")), "duplicate-link");
  unique(mission.walls.map(cellKey), "duplicate-wall");
  unique(mission.spawns.map((spawn) => spawn.id).concat(mission.terminal.id, mission.door.id, mission.lowCover.map((cover) => cover.id)), "object-id");
  if (canonical(building.demand) !== canonical(demand.summary)) fail("demand-summary", "Belegung, Außenbedarf oder Flächenbilanz stimmt nicht mit dem Betriebsprofil überein");
  if (canonical(building.identity) !== canonical(demand.identity)) fail("corporate-identity", "Konzernidentität oder abgeleitete Architekturparameter stimmen nicht mit der Konfiguration überein");
  if (canonical(building.relationships) !== canonical(demand.relationships)) fail("corporate-relationships", "Deklarierte Raumbeziehungen wurden verändert");
  if (canonical(building.program) !== canonical(demand.program)) fail("program-declaration", "Raumprogramm oder Kapazitäten stimmen nicht mit dem abgeleiteten Bedarf überein");
  for (const row of demand.program) {
    if (building.rooms.filter((room) => room.type === row.type).length !== row.count) fail("room-program", `Bedarf ${row.type}: ${row.count} örtliche Räume erforderlich`, row.type);
  }
  if (building.rooms.length !== demand.instances.length) fail("room-program", "Raumanzahl weicht vom Bedarfsprogramm ab");
  for (const required of demand.instances) {
    const actual = building.rooms.find((room) => room.id === required.id);
    if (!actual || actual.type !== required.type || actual.minArea !== required.minArea || actual.capacity !== required.capacity || actual.assignedDemand !== required.assignedDemand) fail("room-capacity", "Raum fehlt oder deckt seine deklarierte Bedarfseinheit nicht", required.id);
    if (actual) {
      const semantics = roomSemantics(config, required.type, required.capacity);
      if (Object.entries(semantics).some(([key, value]) => actual[key as keyof typeof semantics] !== value)) fail("office-semantics", "Arbeitsrolle, Büroform, Abteilung oder Zugang weicht vom Programm ab", required.id);
      if (canonical(actual.appearance) !== canonical(roomAppearance(config, required))) fail("room-appearance", "Material, Signatur oder Erhaltungszustand weicht vom Konzernprofil ab", required.id);
    }
  }
  for (const [field, required] of [["required", demand.summary.local.workplaces], ["outsideRequired", demand.summary.outside.workplaces]] as const) {
    const assigned = building.program.filter((row) => ["office", "executive", "manager", "assistant"].includes(row.type)).reduce((sum, row) => sum + row[field], 0);
    if (assigned !== required) fail("workplace-conservation", "Leitungs-, Assistenz- und Teamplätze decken die Belegung nicht exakt");
  }
  const rooms = architecturalNodes(building);
  const interiors = new Set<string>();
  const walls = new Set(mission.walls.map(cellKey));
  for (const wall of mission.walls) if (!bounds(wall)) fail("wall-bounds", "Wand außerhalb der Karte", cellKey(wall));
  for (const room of building.rooms) {
    const rule = ROOM_RULES[room.type];
    if (!rule) { fail("room-type", "Unbekannte Raumfunktion", room.id); continue; }
    if (room.zone !== rule.zone || room.minArea < rule.minArea) fail("room-semantics", "Raumzone oder Mindestfläche widerspricht dem Katalog", room.id);
    if (!bounds(room) || !Number.isInteger(room.width) || !Number.isInteger(room.height) || room.width < 3 || room.height < 3 || !bounds({ x: room.x + room.width - 1, y: room.y + room.height - 1 })) {
      fail("room-bounds", "Ungültige Raumabmessungen", room.id); continue;
    }
    if (room.width * room.height < room.minArea) fail("room-area", "Bedarfsabhängige Mindestfläche unterschritten", room.id);
    for (let y = room.y; y < room.y + room.height; y += 1) for (let x = room.x; x < room.x + room.width; x += 1) {
      const key = cellKey({ x, y });
      if (interiors.has(key)) fail("overlap", "Raumflächen überschneiden sich", room.id, key);
      if (walls.has(key)) fail("interior-wall", "Wand innerhalb eines Raums", room.id, key);
      interiors.add(key);
    }
  }
  const portals = new Set<string>();
  const hallCells = new Set(building.circulation.map(cellKey));
  const hallNodes = new Set(building.circulation.map(hallId));
  unique(building.circulation.map(cellKey), "corridor-duplicate");
  if (!hallCells.size) fail("corridor-missing", "Begehbare Flure fehlen");
  for (const cell of building.circulation) {
    if (!bounds(cell) || cell.x === 0 || cell.y === 0 || cell.x === mission.width - 1 || cell.y === mission.height - 1 || walls.has(cellKey(cell)) || interiors.has(cellKey(cell))) fail("corridor-geometry", "Flur überlappt Wand, Außenfläche oder Nutzraum", cellKey(cell));
    for (const next of neighbors(cell)) if (hallCells.has(cellKey(next)) && !building.connections.some((link) => link.kind === "passage" && (link.from === hallId(cell) && link.to === hallId(next) || link.to === hallId(cell) && link.from === hallId(next)))) fail("corridor-edge", "Flurabschnitt fehlt im Zugangsgraphen", cellKey(cell));
  }
  if (building.circulation.some((cell) => !roomPath(building.connections.filter((link) => link.kind === "passage"), hallId(building.circulation[0]!), hallId(cell)).length)) fail("corridor-disconnected", "Flurnetz ist unterbrochen");
  if (demand.relationships.length) {
    const pairKey = (a: string, b: string) => [a, b].sort().join("/");
    const expected = requiredPairs(demand).map(([a, b]) => pairKey(demand.instances[a]!.id, demand.instances[b]!.id));
    const actual = building.connections.filter((link) => link.kind !== "shortcut").map((link) => pairKey(link.from, link.to)).sort();
    if (expected.some((pair) => !actual.includes(pair))) fail("graph-template", "Eine verpflichtende Labor- oder Konzernbeziehung fehlt");
    for (const relationship of demand.relationships.filter((rule) => rule.exclusive)) {
      if (building.connections.some((link) => link.from === relationship.from && link.to !== relationship.to || link.to === relationship.from && link.from !== relationship.to)) fail("exclusive-access", "Geschützter Raum umgeht seinen zugeordneten Zugang", relationship.from);
    }
  }
  for (const link of building.connections) {
    const from = rooms.get(link.from);
    const to = rooms.get(link.to);
    if (!from || !to || from.id === to.id) { fail("connection-reference", "Verbindung verweist auf ungültige Räume", link.id); continue; }
    if (link.kind === "passage") {
      if (!hallNodes.has(link.from) || !hallNodes.has(link.to) || Math.abs(from.x - to.x) + Math.abs(from.y - to.y) !== 1 || !sameCell(link.portal, from)) fail("corridor-edge", "Flurkante verbindet keine benachbarten Flurfelder", link.id);
      continue;
    }
    if (!bounds(link.portal) || walls.has(cellKey(link.portal)) || interiors.has(cellKey(link.portal)) || !neighbors(link.portal).some((cell) => contains(from, cell)) || !neighbors(link.portal).some((cell) => contains(to, cell))) {
      fail("portal", "Durchgang verbindet seine beiden Räume geometrisch nicht", link.id);
    }
    if (portals.has(cellKey(link.portal))) fail("duplicate-portal", "Mehrere Verbindungen verwenden denselben Durchgang", link.id);
    portals.add(cellKey(link.portal));
    if (from.zone === "public" && to.zone === "secure" || to.zone === "public" && from.zone === "secure") fail("public-secure", "Direkter Zugang von öffentlich zu Hochsicherheit", link.id);
    if (from.access === "public" && ["restricted", "executive"].includes(to.access) || to.access === "public" && ["restricted", "executive"].includes(from.access)) fail("public-restricted", "Öffentlicher Bereich führt direkt in einen geschützten Konzernbereich", link.id);
    if (from.type === "cleanroom" || to.type === "cleanroom") {
      const other = from.type === "cleanroom" ? to : from;
      const clean = from.type === "cleanroom" ? from : to;
      if (other.id !== clean.id.replace("cleanroom", "airlock") || link.kind !== "airlock") fail("cleanroom-airlock", "Reinraumzugang umgeht die zugeordnete Schleuse", link.id);
    } else if (link.kind !== "shortcut" && (from.zone !== to.zone || from.access !== to.access) && link.kind !== "controlled") fail("zone-control", "Zonen- oder Berechtigungswechsel ohne Zugangskontrolle", link.id);
  }
  if (building.entries.length !== 2) fail("entries", "Zwei Gebäudezugänge erforderlich");
  unique(building.entries.map((entry) => cellKey(entry.cell)), "entry-overlap");
  for (const entry of building.entries) {
    const room = rooms.get(entry.roomId);
    if (!room || !bounds(entry.cell) || walls.has(cellKey(entry.cell)) || !neighbors(entry.cell).some((cell) => contains(room, cell))) fail("entry", "Zugang ist nicht mit seinem Raum verbunden", entry.roomId);
    portals.add(cellKey(entry.cell));
  }
  // Every open cell must be accounted for: catches accidental extra doors and breaches.
  for (let y = 0; y < mission.height; y += 1) for (let x = 0; x < mission.width; x += 1) {
    const key = cellKey({ x, y });
    if (!walls.has(key) && !interiors.has(key) && !portals.has(key) && !hallCells.has(key)) fail("unmodeled-opening", "Offene Zelle fehlt im Architekturgraphen", key);
  }
  // A room must be separated from halls and other rooms by a wall and a
  // declared door; listing an extra hall cell cannot silently remove that wall.
  for (const room of building.rooms) for (let y = room.y; y < room.y + room.height; y++) for (let x = room.x; x < room.x + room.width; x++) for (const next of neighbors({ x, y })) {
    if (!contains(room, next) && !walls.has(cellKey(next)) && !building.connections.some((link) => link.kind !== "passage" && (link.from === room.id || link.to === room.id) && sameCell(link.portal, next)) && !building.entries.some((entry) => entry.roomId === room.id && sameCell(entry.cell, next))) fail("unmodeled-opening", "Raumwand besitzt einen undeklarierten Durchbruch", room.id, cellKey(next));
  }
  const graph = building.missionGraph;
  const entryRoom = rooms.get(graph.entryRoom);
  const targetRoom = rooms.get(graph.targetRoom);
  if (entryRoom?.id !== demand.entryRoomId || graph.secondaryEntryRoom !== demand.secondaryEntryRoomId || targetRoom?.id !== demand.targetRoomId || !targetRoom || !contains(targetRoom, mission.terminal)) fail("mission-binding", "Missionsanker passen nicht zum Bedarfsprogramm und Ausschnitt");
  if (!building.entries.some((entry) => entry.roomId === graph.entryRoom) || !building.entries.some((entry) => entry.roomId === graph.secondaryEntryRoom && entry.roomId !== graph.entryRoom)) fail("mission-entry", "Missionszugänge fehlen im Gebäudegraphen");
  let executiveSanitaryDistance: number | null = null;
  for (const room of building.rooms) {
    if (!roomPath(building.connections, graph.entryRoom, room.id).length) fail("room-unreachable", "Pflichtraum ohne regulären Zugang", room.id);
    if (!demand.relationships.some((rule) => rule.exclusive && rule.from === room.id) && !building.connections.some((link) => link.kind !== "shortcut" && (link.from === room.id && hallNodes.has(link.to) || link.to === room.id && hallNodes.has(link.from)))) fail("corridor-access", "Nutzraum besitzt keinen eigenen Flurzugang", room.id);
    if (["office", "executive", "manager", "assistant", "breakroom", "security", "laboratory", "production", "workshop"].includes(room.type)) {
      const path = sanitaryPath(building, room, mission);
      if (!path.length) fail("staff-sanitation", "Sanitärweg benötigt ein fremdes Büro oder einen gesperrten Raum", room.id);
      if (room.type === "executive") {
        executiveSanitaryDistance = path.length ? path.length - 1 : -1;
        if (!path.length || executiveSanitaryDistance > EXECUTIVE_SANITARY_LIMIT) fail("executive-sanitation", `Sanitärweg der Geschäftsführung überschreitet ${EXECUTIVE_SANITARY_LIMIT} Gehfelder`, room.id);
      }
    }
    if (room.type === "restroom" && building.connections.filter((link) => link.from === room.id || link.to === room.id).length !== 1) fail("sanitary-transit", "Sanitärraum darf kein Durchgangsraum sein", room.id);
    if (room.type === "focus" && building.connections.filter((link) => link.from === room.id || link.to === room.id).length !== 1) fail("focus-transit", "Vertraulicher Gesprächsraum darf kein Durchgangsraum sein", room.id);
  }
  for (const rule of demand.relationships.filter((rule) => rule.maxDistance !== undefined)) {
    const source = building.rooms.find((room) => room.id === rule.from); const destination = building.rooms.find((room) => room.id === rule.to);
    const path = source && destination ? sanitaryPath(building, source, mission, destination) : [];
    if (!path.length || path.length - 1 > rule.maxDistance!) fail("support-distance", "Kurzer Weg zwischen zugeordneten Unterstützungsräumen fehlt", rule.from, rule.to);
  }
  const loadingRooms = building.rooms.filter((room) => room.type === "loading");
  const storageRooms = building.rooms.filter((room) => room.type === "storage");
  const logisticsLinks = building.connections.filter((link) => rooms.get(link.from)?.zone !== "secure" && rooms.get(link.to)?.zone !== "secure");
  for (const loadingRoom of loadingRooms) if (!storageRooms.some((storageRoom) => roomPath(logisticsLinks, loadingRoom.id, storageRoom.id).length)) fail("logistics-route", "Anlieferung erreicht das Lager nicht ohne Hochsicherheitsdurchquerung", loadingRoom.id);
  const routeCount = independentRoomRoutes(building.connections, graph.entryRoom, graph.targetRoom);
  if (routeCount < 2) fail("alternate-route", "Zwei kantenunabhängige Wege zum Ziel fehlen");
  const usedRouteLinks = new Set<string>();
  if (graph.routes.length !== 2) fail("route-declaration", "Genau zwei Missionsrouten erforderlich");
  for (const route of graph.routes) {
    if (route.length < 2 || route[0] !== graph.entryRoom || route[route.length - 1] !== graph.targetRoom || new Set(route).size !== route.length) fail("route-declaration", "Missionsroute besitzt falsche Anker oder eine Schleife");
    for (let i = 1; i < route.length; i += 1) {
      const link = building.connections.find((edge) => edge.kind !== "shortcut" && (edge.from === route[i - 1] && edge.to === route[i] || edge.to === route[i - 1] && edge.from === route[i]));
      if (!link || usedRouteLinks.has(link.id)) fail("route-declaration", "Missionsrouten fehlen im Graphen oder teilen einen Übergang");
      if (link) usedRouteLinks.add(link.id);
    }
  }
  const expectedObjectives = [
    { id: "infiltrate", roomId: graph.entryRoom, action: "enter", requires: [] },
    { id: "copy", roomId: graph.targetRoom, action: "copy-twice", requires: ["infiltrate"] },
    { id: "extract", roomId: graph.entryRoom, action: "extract", requires: ["copy"] },
  ];
  if (JSON.stringify(graph.objectives) !== JSON.stringify(expectedObjectives)) fail("objectives", "Unbekannte oder zyklische Missionsabhängigkeiten");
  for (const kind of ["power", "ventilation", "network", "security"] as const) {
    const services = building.infrastructure.filter((service) => service.kind === kind);
    if (services.length !== 1) { fail("infrastructure", "Versorgungsgraph fehlt oder ist doppelt", kind); continue; }
    const service = services[0]!;
    const sourceType = kind === "network" ? "server" : kind === "security" ? "security" : "mechanical";
    if (rooms.get(service.source)?.type !== sourceType) fail("service-source", "Ungültige Versorgungsquelle", kind);
    unique(service.nodes, "service-node");
    const reached = new Set([service.source]);
    for (const edge of service.edges) {
      if (!service.nodes.includes(edge.from) || !service.nodes.includes(edge.to) || !building.connections.some((link) => link.from === edge.from && link.to === edge.to || link.to === edge.from && link.from === edge.to)) fail("service-edge", "Versorgungskante ohne räumlichen Anschluss", kind, edge.from, edge.to);
    }
    for (let i = 0; i < service.nodes.length; i += 1) for (const edge of service.edges) if (reached.has(edge.from)) reached.add(edge.to);
    for (const node of service.nodes) if (!rooms.has(node) || !reached.has(node)) fail("service-unreachable", "Versorgungszweig ist unterbrochen", kind, node);
    for (const room of building.rooms) if (ROOM_RULES[room.type]?.services.includes(kind) && !reached.has(room.id)) fail("service-required", "Pflichtraum wird nicht versorgt", kind, room.id);
  }
  if (building.infrastructure.length !== 4) fail("infrastructure", "Genau vier Versorgungssysteme erforderlich");
  const shortcut = building.connections.filter((link) => link.kind === "shortcut");
  if (shortcut.length !== 1 || !sameCell(shortcut[0]!.portal, mission.door)) fail("shortcut", "Hackbare Tür passt nicht zum Graphen");
  const crew = mission.spawns.filter((spawn) => spawn.team === "crew");
  const enemies = mission.spawns.filter((spawn) => spawn.team === "enemy");
  if (crew.length !== 4 || enemies.length !== 6) fail("spawn-budget", "Konfiguration benötigt vier Runner und sechs Gegner");
  unique(mission.spawns.map(cellKey), "spawn-overlap");
  const blocked = new Set([...walls, cellKey(mission.door), cellKey(mission.terminal)]);
  for (const object of [mission.terminal, mission.door]) if (!bounds(object) || walls.has(cellKey(object))) fail("object-position", "Interaktionsobjekt außerhalb der freien Geometrie", object.id);
  if (sameCell(mission.terminal, mission.door)) fail("object-overlap", "Tür und Terminal überlappen");
  let targetDistance = -1;
  for (const spawn of mission.spawns) {
    if (!bounds(spawn) || blocked.has(cellKey(spawn))) fail("spawn-blocked", "Spawnfeld ist ungültig oder blockiert", spawn.id);
    if (spawn.weapon !== "rifle" && spawn.weapon !== "sidearm") fail("weapon", "Nicht implementierte Waffe", spawn.id);
    if (spawn.team === "crew" && entryRoom && !contains(entryRoom, spawn)) fail("crew-zone", "Runner startet außerhalb des Einstiegs", spawn.id);
    if (spawn.team === "enemy" && (entryRoom && contains(entryRoom, spawn) || building.rooms.some((room) => room.type === "reception" && contains(room, spawn)) || !spawn.patrol.length || !sameCell(spawn.patrol[0]!, spawn))) fail("enemy-zone", "Gegnerspawn oder Patrouillenanfang ungültig", spawn.id);
    for (let i = 0; i < spawn.patrol.length; i += 1) {
      const cell = spawn.patrol[i]!;
      const next = spawn.patrol[(i + 1) % spawn.patrol.length]!;
      if (!bounds(cell) || blocked.has(cellKey(cell)) || Math.abs(cell.x - next.x) + Math.abs(cell.y - next.y) > 1) fail("patrol", "Patrouille ist blockiert oder nicht schrittweise begehbar", spawn.id);
    }
    if (spawn.team !== "crew") continue;
    const distances = flood(mission.width, mission.height, blocked, spawn);
    const approach = neighbors(mission.terminal).map((cell) => distances.get(cellKey(cell))).filter((distance): distance is number => distance !== undefined);
    if (!approach.length) fail("target-unreachable", "Terminal bei geschlossener Tür nicht bedienbar", spawn.id);
    else if (targetDistance < 0) targetDistance = Math.min(...approach);
    for (const cell of mission.extraction) if (!distances.has(cellKey(cell))) fail("extraction-unreachable", "Rückweg zur Extraktion blockiert", spawn.id);
    for (const entry of building.entries) if (!distances.has(cellKey(entry.cell))) fail("entry-unreachable", "Zweiter Gebäudezugang ist geometrisch nicht erreichbar", entry.roomId);
  }
  if (mission.extraction.length < 4) fail("extraction", "Zu wenig Extraktionsfelder");
  unique(mission.extraction.map(cellKey), "extraction-overlap");
  for (const cell of mission.extraction) if (!bounds(cell) || blocked.has(cellKey(cell)) || !entryRoom || !contains(entryRoom, cell)) fail("extraction", "Extraktionsfeld außerhalb des freien Einstiegs");
  for (const cover of mission.lowCover) if (!bounds(cover) || blocked.has(cellKey(cover)) || !interiors.has(cellKey(cover)) || !["n", "e", "s", "w"].includes(cover.protects)) fail("cover", "Ungültige gerichtete Deckung", cover.id);
  unique(mission.lowCover.map(cellKey), "cover-overlap");
  for (const item of building.dressing) {
    const room = rooms.get(item.roomId);
    if (!room || !contains(room, item) || blocked.has(cellKey(item)) || mission.spawns.some((spawn) => sameCell(spawn, item))) fail("dressing", "Dekoration belegt einen reservierten Anker", item.id);
  }
  const plates = floorsOf(mission);
  const ground = plates[0];
  const upper = plates[1];
  if (!ground || !upper || !mission.levels || plates.length !== 2 || ground.z !== 0 || upper.z !== 1) fail("levels", "Gebäude braucht genau zwei Ebenen");
  else if (cellSet(ground.walls) !== cellSet(mission.walls) || coverSet(ground.lowCover) !== coverSet(mission.lowCover) || cellSet(upper.walls) !== cellSet(mission.walls) || upper.lowCover.length !== 0) {
    fail("levels", "Ebene 0 bleibt die Geschossplatte, Ebene 1 übernimmt die Wände ohne zusätzliche Deckung");
  }
  const vertical = linksOf(mission);
  const liftKind = config.family === "factory" ? "freight" : "passenger";
  if (vertical.length !== 2 || !vertical.some((link) => link.kind === "stair") || !vertical.some((link) => link.kind === liftKind)) fail("vertical-links", "Treppe oder familieneigener Aufzug fehlt");
  if (vertical.some((link) => link.kind !== "stair" && link.kind !== liftKind)) fail("vertical-links", "Aufzugtyp passt nicht zur Gebäudefamilie");
  if (canonical(building.links) !== canonical(mission.links ?? [])) fail("vertical-links", "Erschließung und Mission nennen verschiedene Übergänge");
  const halls = new Set(building.circulation.map(cellKey));
  const dressed = new Set(building.dressing.map(cellKey));
  for (const link of vertical) {
    const from = cellKey({ x: link.fromX, y: link.fromY });
    const to = cellKey({ x: link.toX, y: link.toY });
    if (link.fromZ !== 0 || link.toZ !== 1 || from !== to || !halls.has(from) || dressed.has(from) || walls.has(from)) fail("vertical-links", "Übergang liegt nicht auf einem freien Flurfeld beider Ebenen", link.id);
  }
  warnings.push({ code: "playtest-open", message: "Geometrie und Semantik geprüft; taktische Fairness, Botlauf und menschliche Spielabnahme offen.", ids: [] });
  warnings.push({ code: "infrastructure-abstract", message: "Versorgung folgt Raumverbindungen; physische Leitungen und Sabotageaktionen sind noch nicht implementiert.", ids: [] });
  warnings.push({ code: "demand-game-model", message: "Kapazitäten und Rasterflächen sind versionierte Spielannahmen, keine baurechtliche oder ASR-konforme Planung. Außenfunktionen sind Kontext, keine begehbaren Räume.", ids: [] });
  return { errors, warnings, metrics: { roomCount: building.rooms.length, walkableCells: mission.width * mission.height - walls.size, targetDistance, independentRoutes: routeCount, coverCount: mission.lowCover.length, preferenceScore: errors.length ? 0 : preferenceScore(building, mission), corridorCells: hallCells.size, executiveSanitaryDistance } };
}

function cellSet(cells: readonly Cell[]): string {
  return cells.map((cell) => `${cell.x},${cell.y}`).sort().join("|");
}

function coverSet(covers: readonly { readonly id: string; readonly x: number; readonly y: number; readonly protects: string }[]): string {
  return covers.map((cover) => `${cover.id}:${cover.x},${cover.y}:${cover.protects}`).sort().join("|");
}
