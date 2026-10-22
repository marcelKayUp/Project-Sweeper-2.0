import { ROOM_RULES, SIZE_DIMENSIONS } from "./catalog.ts";
import type { BusinessProfile, DemandPlan, Family, GeneratorConfig, ProgramRow, RoomRequirement, RoomType, Size } from "./types.ts";
import { organization, resolveIdentity, roomSemantics } from "./corporate.ts";
import { planRelationships } from "./relationships.ts";

export const MAX_PROGRAM_ROOMS = 32;
export function defaultBusinessProfile(family: Family, size: Size): BusinessProfile {
  const occupants = { compact: 8, standard: 16, large: 24 }[size];
  return { occupants, workplaces: family === "office" ? occupants : Math.ceil(occupants / 4), processUnits: family === "office" ? 0 : occupants / 2, storageUnits: family === "factory" ? occupants : occupants / 2 };
}

export function requirementId(type: RoomType, index = 0): string { return `room-${type}-${String(index + 1).padStart(2, "0")}`; }

// Versioned game assumptions in grid cells, not a building-code calculation.
// Capacities describe business demand; they never create combatants or AP.
export function planDemand(config: GeneratorConfig): DemandPlan {
  const identity = resolveIdentity(config);
  const corporate = config.corporation !== "neutral";
  const building: BusinessProfile = { occupants: config.occupants, workplaces: config.workplaces, processUnits: config.processUnits, storageUnits: config.storageUnits };
  const share = config.scope === "building" ? 100 : config.floorShare;
  const portion = (value: number) => Math.ceil(value * share / 100);
  const local: BusinessProfile = { occupants: portion(building.occupants), workplaces: portion(building.workplaces), processUnits: portion(building.processUnits), storageUnits: portion(building.storageUnits) };
  const outside: BusinessProfile = { occupants: building.occupants - local.occupants, workplaces: building.workplaces - local.workplaces, processUnits: building.processUnits - local.processUnits, storageUnits: building.storageUnits - local.storageUnits };
  const roles = organization(config, local.workplaces);
  const program: ProgramRow[] = [];
  const instances: RoomRequirement[] = [];
  function add(type: RoomType, required: number, outsideRequired: number, capacityPerRoom: number, unit: string, reason: string, area: (amount: number) => number = () => 12): void {
    const count = Math.ceil(required / capacityPerRoom);
    const outsideCount = Math.ceil(outsideRequired / capacityPerRoom);
    if (!count && !outsideCount) return;
    let minimumArea = 0;
    for (let index = 0; index < count; index += 1) {
      const assignedDemand = Math.min(capacityPerRoom, required - index * capacityPerRoom);
      const minArea = Math.max(12, ROOM_RULES[type].minArea, area(assignedDemand));
      minimumArea += minArea;
      instances.push({ id: requirementId(type, index), type, minArea, assignedDemand, capacity: capacityPerRoom, ...roomSemantics(config, type, capacityPerRoom) });
    }
    program.push({ type, count, outsideCount, totalCount: count + outsideCount, required, outsideRequired, capacityPerRoom, capacity: count * capacityPerRoom, unit, minArea: Math.max(12, ROOM_RULES[type].minArea), minimumArea, reason });
  }
  const whole = config.scope === "building";
  add("reception", whole ? 1 : 0, whole ? 0 : 1, 1, "Empfang", "Ein zentraler Empfang; beim Missionsgeschoss außerhalb des Ausschnitts.");
  add("security", local.occupants, outside.occupants, 32, "Beschäftigte", "Ein Sicherheitsposten je angefangenen 32 gleichzeitig Anwesenden pro Bereich.");
  add("executive", roles.local.executive, roles.outside.executive, 1, "Arbeitsplätze", "Ein örtlich vertretener Hauptsitz-CEO; zählt innerhalb der vorgegebenen Arbeitsplätze.", () => 20);
  add("manager", roles.local.manager, roles.outside.manager, 1, "Arbeitsplätze", "Abteilungsleitung je angefangene zwölf, im Betrieb je 16 Arbeitsplätze; Teil der Belegung.", () => config.corporation === "kasane" ? 16 : 12);
  add("assistant", roles.local.assistant, roles.outside.assistant, 1, "Arbeitsplätze", "Assistenz der örtlichen Geschäftsführung; wird von den Teamarbeitsplätzen abgezogen.");
  add("office", roles.local.team, roles.outside.team, identity.officeCapacity, "Arbeitsplätze", `${identity.officeCapacity} Teamarbeitsplätze pro ${identity.officeCapacity <= 2 ? "Zellenbüro" : identity.officeCapacity >= 6 ? "offener Teamfläche" : "Gruppenbüro"}; Leitungs-/Assistenzplätze sind bereits abgezogen.`, (n) => 6 + 2 * n);
  add("restroom", local.occupants, outside.occupants, 24, "Beschäftigte", "Eine Sanitärgruppe je 24 Anwesende; vereinfacht eine Kabine je zwölf. Keine ASR-Bemessung.", (n) => 4 + 4 * Math.ceil(n / 12));
  add("breakroom", Math.ceil(local.occupants / 2), Math.ceil(outside.occupants / 2), 8, "Pausenplätze", "Gleichzeitige Pause für die Hälfte der Belegung; acht Plätze je Personalraum.", (n) => 6 + n);
  add("mechanical", local.occupants + 2 * local.processUnits, outside.occupants + 2 * outside.processUnits, 48, "Lastpunkte", "Lokale Technik/Verteilung je 48 Lastpunkte: eine Person oder ein halber Prozessplatz.");
  add("server", 1, 0, 1, "Datenziel", "Ein lokaler Serverraum als Datenraubziel; die übrige IT des Gebäudes ist nicht modelliert.");
  add("loading", whole ? Math.max(1, building.storageUnits) : 0, whole ? 0 : Math.max(1, building.storageUnits), 16, "Logistikeinheiten", "Zentrale Anlieferung je 16 Lagereinheiten; außerhalb des Missionsgeschosses.");
  add("storage", local.storageUnits, outside.storageUnits, 8, "Lagereinheiten", "Acht abstrakte Lagereinheiten je Lager, abgeleitet aus Bestand/Versorgung.", (n) => 6 + n);
  if (config.family === "office" || corporate) {
    add("meeting", Math.ceil(local.workplaces / 2), Math.ceil(outside.workplaces / 2), identity.meetingCapacity, "Besprechungsplätze", `${identity.meetingCapacity} Plätze je Teambesprechung; zusätzliche Vorstandsgespräche und Rückzugsräume getrennt.`, (n) => 6 + n);
    add("boardroom", roles.local.executive * 8, roles.outside.executive * 8, 8, "Besuchsplätze", "Ein Vorstandssaal je vertretener Geschäftsführung; Besuchsplätze erzeugen keine weiteren Büroarbeitsplätze.", () => 20);
    const retreat = corporate && (identity.officeCapacity >= 6 || config.department === "finance" || config.department === "legal");
    if (retreat) add("focus", Math.ceil(local.workplaces / 12) * 2, Math.ceil(outside.workplaces / 12) * 2, 2, "Gesprächsplätze", "Ein vertraulicher Zweiergesprächsraum je zwölf Arbeitsplätze bei offener oder vertraulicher Arbeit.");
  }
  if (config.family === "office" || corporate && config.department === "legal") {
    add("records", local.workplaces, outside.workplaces, 24, "Arbeitsplätze", "Ein Archiv je 24 Büroarbeitsplätze.");
  }
  if (config.family === "laboratory") {
    add("laboratory", local.processUnits, outside.processUnits, 4, "Laborplätze", "Vier Laborplätze je Labor.", (n) => 8 + 2 * n);
    add("airlock", Math.ceil(local.processUnits / 8), Math.ceil(outside.processUnits / 8), 1, "Reinraumgruppen", "Eine eigene Schleuse pro Reinraumgruppe.");
    add("cleanroom", local.processUnits, outside.processUnits, 8, "Prozessplätze", "Ein Reinraum je acht Prozessplätze; Zugang nur über die zugeordnete Schleuse.", (n) => 8 + n);
  } else if (config.family === "factory") {
    add("production", local.processUnits, outside.processUnits, 4, "Produktionsplätze", "Vier Produktionsplätze je Halle; zusätzlicher Bewegungsraum für Anlagen.", (n) => 8 + 3 * n);
    add("workshop", local.processUnits, outside.processUnits, 8, "Prozessplätze", "Eine Wartungswerkstatt je acht Prozessplätze.");
    add("dispatch", local.storageUnits, outside.storageUnits, 16, "Lagereinheiten", "Ein Versandbereich je 16 Lagereinheiten.");
  }
  if (config.corporation === "verdant") add("atrium", 1, outside.occupants > 0 ? 1 : 0, 1, "Gemeinschaftsbereiche", "Örtlicher Gemeinschaftsgarten als räumlicher Mittelpunkt der Konzernidentität.", () => config.statusTier === "contractor" ? 20 : 24);
  const converted = corporate && config.buildingHistory === "converted" ? 1 : 0;
  add("corridor", (whole ? 1 : 2) + converted, whole || outside.occupants === 0 ? 0 : 1, 1, "Verteiler", (whole ? "Ein lokaler Verkehrsverteiler." : "Zwei örtliche Zugangsverteiler; Empfang und Anlieferung liegen außerhalb.") + (converted ? " Ein zusätzlicher Bestandsverteiler erschließt den Umbau." : ""));
  const minimumArea = instances.reduce((sum, room) => sum + room.minArea, 0);
  // Every BSP separator consumes at least three cells. This is a lower bound,
  // not a promise that any program below it has a feasible embedding.
  const minimumWallArea = Math.max(0, instances.length - 1) * 3;
  const { width, height } = SIZE_DIMENSIONS[config.size];
  const availableArea = (width - 2) * (height - 2);
  const hallCount = instances.length > 26 ? 3 : 2;
  const minimumCirculationArea = hallCount * (width - 2) + 20 * (hallCount - 1);
  const errors: DemandPlan["errors"][number][] = [];
  if (instances.length > MAX_PROGRAM_ROOMS) errors.push({ code: "demand-room-budget", message: `Der Bedarf ergibt ${instances.length} örtliche Räume; das Suchbudget unterstützt höchstens ${MAX_PROGRAM_ROOMS}. Belegung verringern oder einen kleineren Missionsausschnitt wählen.`, ids: [] });
  if (minimumArea + minimumWallArea + minimumCirculationArea > availableArea) errors.push({ code: "demand-area", message: `${instances.length} Räume benötigen mindestens ${minimumArea} Raumfelder, ${minimumWallArea} Trennwandfelder und ${minimumCirculationArea} Flurfelder. Verfügbar sind ${availableArea} Innenfelder. Größere Fläche, geringere Belegung oder kleineren Missionsausschnitt wählen.`, ids: [] });
  const entryRoomId = requirementId(whole ? "reception" : "corridor");
  return { identity, relationships: planRelationships(config, instances, entryRoomId), summary: { model: "business-capacity/1", building, local, outside, minimumArea, minimumWallArea, minimumCirculationArea, availableArea, sanitaryFixtures: Math.ceil(local.occupants / 12), outsideSanitaryFixtures: Math.ceil(outside.occupants / 12) }, program, instances, entryRoomId, secondaryEntryRoomId: requirementId(whole ? "loading" : "corridor", whole ? 0 : 1), targetRoomId: requirementId("server"), errors };
}
