import type { Appearance, CorporateIdentity, Corporation, GeneratorConfig, RoomRequirement, Surface } from "./types.ts";

// Original fictional companies. Heritage describes their founding history,
// not an architectural rule assigned to real nationalities.
export const CORPORATE_PROFILES = {
  neutral: { name: "Unabhängiger Betrieb", origin: "Ohne Konzernzuordnung", history: "Referenzprogramm ohne Konzernhierarchie.", promise: "Funktion und Kapazität", tension: "Keine zusätzliche Konzernfiktion.", signature: "NC", accent: "#9bdcc8", wall: "#435367", pattern: "grid", officeCapacity: 4, meetingCapacity: 8, floor: "#6b8394" },
  kasane: { name: "KASANE GROUP", origin: "Osaka / Singapur", history: "Familienkontrollierter Verbund aus Robotik und Infrastruktur.", promise: "Beständigkeit durch Präzision", tension: "Sorgfältige Fürsorge nach Rang und Zugehörigkeit.", signature: "KG", accent: "#e2b681", wall: "#4e514e", pattern: "lines", officeCapacity: 3, meetingCapacity: 4, floor: "#a89b82" },
  concord: { name: "CONCORD SYSTEMS", origin: "Rhein / Benelux", history: "Industriekonsortium für Energie, Automatisierung und öffentliche Netze.", promise: "Verlässlichkeit durch Standards", tension: "Lückenlose Erfassung von Leistung und Berechtigungen.", signature: "CS", accent: "#8bbdcf", wall: "#455966", pattern: "grid", officeCapacity: 4, meetingCapacity: 8, floor: "#7b929e" },
  parallax: { name: "PARALLAX NETWORK", origin: "Kalifornien / Seoul", history: "Aus Medien- und Identitätsplattformen zusammengewachsen.", promise: "Offenheit und Teilhabe", tension: "Öffentliche Bühne vor abgeschirmter Datenmacht.", signature: "PX", accent: "#d5a4f3", wall: "#53536c", pattern: "circuits", officeCapacity: 8, meetingCapacity: 6, floor: "#8e82ab" },
  verdant: { name: "VERDANT COMMONS", origin: "Nairobi / São Paulo / Stockholm", history: "Biotechnologieverbund für Gesundheit und ökologische Wiederherstellung.", promise: "Fürsorge und Regeneration", tension: "Zugang zu Natur und Gesundheit folgt wirtschaftlichem Status.", signature: "VC", accent: "#b6d99a", wall: "#4a5e50", pattern: "leaves", officeCapacity: 6, meetingCapacity: 4, floor: "#879c77" },
} as const satisfies Record<Corporation, Omit<CorporateIdentity, "model" | "corporation" | "siteRole" | "department" | "statusTier" | "buildingHistory" | "condition" | "principles"> & { readonly floor: string }>;

export function resolveIdentity(config: GeneratorConfig): CorporateIdentity {
  const profile = CORPORATE_PROFILES[config.corporation];
  const active = config.corporation !== "neutral";
  let officeCapacity: number = profile.officeCapacity;
  if (active && config.department === "legal") officeCapacity = 2;
  if (active && config.department === "finance") officeCapacity = Math.min(3, officeCapacity);
  if (active && config.statusTier === "contractor" && config.department !== "legal" && config.department !== "finance") officeCapacity += 2;
  if (active && config.statusTier === "executive") officeCapacity = Math.min(officeCapacity, 3);
  const principles = !active ? ["Neutrales Kapazitätsprogramm"] : [
    config.corporation === "kasane" ? "Empfang grenzt an Sicherheit; Geschäftsführung nur über Assistenz" :
      config.corporation === "concord" ? "Technik grenzt an den Verkehrsverteiler" :
      config.corporation === "parallax" ? "Besprechung als öffentliche Bühne am Einstieg; offene Teamflächen" : "Gemeinschaftsgarten am Verkehrsverteiler",
    `${officeCapacity} Teamarbeitsplätze je Büro; ${profile.meetingCapacity} Plätze je Teambesprechung`,
    config.siteRole === "headquarters" ? "Geschäftsführung nur bei örtlich vertretenem Hauptsitzbedarf" : "Niederlassung/Betriebsstandort ohne CEO-Büro",
    config.department === "finance" || config.department === "legal" ? "Kleinere Büroeinheiten und zusätzliche vertrauliche Gesprächsräume" : "Teamflächen mit ergänzendem Rückzug bei offenen Büroformen",
    config.buildingHistory === "converted" ? "Zusätzlicher Verteiler aus der Bestandserschließung" : "Zweckbau mit kompaktem Erschließungsprogramm",
  ];
  return { model: "corporate-identity/1", corporation: config.corporation, siteRole: config.siteRole, department: config.department, statusTier: config.statusTier, buildingHistory: config.buildingHistory, condition: config.condition,
    name: profile.name, origin: profile.origin, history: profile.history, promise: profile.promise, tension: profile.tension, signature: profile.signature, accent: profile.accent, wall: profile.wall, pattern: profile.pattern, officeCapacity, meetingCapacity: profile.meetingCapacity, principles };
}

export function roomSemantics(config: GeneratorConfig, type: RoomRequirement["type"], capacity: number): Pick<RoomRequirement, "workplaceRole" | "officeForm" | "department" | "access"> {
  const workplaceRole = type === "executive" || type === "manager" || type === "assistant" ? type : type === "office" ? "team" : "support";
  const officeForm = type === "office" ? capacity <= 2 ? "cell" : capacity >= 6 ? "open" : "group" : workplaceRole !== "support" ? "cell" : "support";
  const access = type === "reception" ? "public" : type === "executive" || type === "boardroom" ? "executive" : ["server", "cleanroom", "records"].includes(type) ? "restricted" : "staff";
  return { workplaceRole, officeForm, department: workplaceRole === "support" ? "mixed" : config.department, access };
}

export function roomAppearance(config: GeneratorConfig, room: RoomRequirement): Appearance {
  const profile = CORPORATE_PROFILES[config.corporation];
  const premium = room.type === "executive" || room.type === "boardroom" || config.statusTier === "executive";
  const utility = ["mechanical", "loading", "storage", "production", "workshop"].includes(room.type);
  let surface: Surface = utility ? "steel" : config.corporation === "kasane" ? premium ? "timber" : "stone" : config.corporation === "verdant" ? "timber" : config.corporation === "parallax" ? "resin" : "carpet";
  if (config.statusTier === "contractor" && !premium && !utility) surface = "rubber";
  const color = utility ? "#657583" : surface === "rubber" ? "#6e777b" : premium ? config.corporation === "parallax" ? "#b0a0bd" : "#b49b78" : profile.floor;
  return { surface, color, accent: profile.accent, pattern: profile.pattern, lighting: config.corporation === "kasane" || config.corporation === "verdant" ? "warm" : utility ? "cool" : "neutral", wear: config.condition };
}

export interface Organization { readonly executive: number; readonly manager: number; readonly assistant: number; readonly team: number }
export function organization(config: GeneratorConfig, localWorkplaces: number): { local: Organization; outside: Organization } {
  const total = config.workplaces;
  const outsideWorkplaces = total - localWorkplaces;
  if (config.corporation === "neutral") return { local: { executive: 0, manager: 0, assistant: 0, team: localWorkplaces }, outside: { executive: 0, manager: 0, assistant: 0, team: outsideWorkplaces } };
  const executive = config.siteRole === "headquarters" && total >= 6 && (config.scope === "building" || config.statusTier === "executive" || outsideWorkplaces > 0) ? 1 : 0;
  const localExecutive = executive && (config.scope === "building" || config.statusTier === "executive") ? 1 : 0;
  const manager = total >= 6 ? Math.min(Math.floor((total - executive) / 4), Math.ceil((total - executive) / (config.siteRole === "operations" ? 16 : 12))) : 0;
  const localLeft = localWorkplaces - localExecutive;
  const outsideLeft = outsideWorkplaces - (executive - localExecutive);
  const localManager = Math.min(localLeft, manager, Math.max(manager - outsideLeft, Math.ceil(localLeft * manager / Math.max(1, total - executive))));
  const localAssistant = localExecutive && localLeft - localManager > 0 ? 1 : 0;
  const outsideAssistant = executive - localExecutive && outsideLeft - (manager - localManager) > 0 ? 1 : 0;
  return { local: { executive: localExecutive, manager: localManager, assistant: localAssistant, team: localLeft - localManager - localAssistant }, outside: { executive: executive - localExecutive, manager: manager - localManager, assistant: outsideAssistant, team: outsideLeft - (manager - localManager) - outsideAssistant } };
}
