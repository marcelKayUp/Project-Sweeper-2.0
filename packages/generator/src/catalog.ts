import type { RoomRule, RoomType } from "./types.ts";

const building = "building" as const;
const floor = "floor" as const;
export const ROOM_RULES: Readonly<Record<RoomType, RoomRule>> = {
  executive: { label: "Geschäftsführung", zone: "staff", minArea: 20, services: ["power", "network", "security"], extent: building },
  manager: { label: "Abteilungsleitung", zone: "staff", minArea: 12, services: ["power", "network"], extent: floor },
  assistant: { label: "Assistenz", zone: "staff", minArea: 12, services: ["power", "network", "security"], extent: floor },
  boardroom: { label: "Vorstandssaal", zone: "staff", minArea: 20, services: ["power", "network", "security"], extent: building },
  focus: { label: "Vertrauliches Gespräch", zone: "staff", minArea: 12, services: ["power", "network"], extent: floor },
  atrium: { label: "Gemeinschaftsgarten", zone: "staff", minArea: 20, services: ["power", "ventilation"], extent: building },
  reception: { label: "Empfang", zone: "public", minArea: 9, services: ["power", "network", "security"], extent: building },
  security: { label: "Sicherheit", zone: "staff", minArea: 9, services: ["power", "network", "security"], extent: floor },
  office: { label: "Büro", zone: "staff", minArea: 9, services: ["power", "network"], extent: floor },
  restroom: { label: "Sanitär", zone: "staff", minArea: 9, services: ["power", "ventilation"], extent: floor },
  breakroom: { label: "Personal", zone: "staff", minArea: 9, services: ["power", "ventilation"], extent: floor },
  mechanical: { label: "Technik", zone: "technical", minArea: 9, services: ["power", "ventilation", "network"], extent: floor },
  server: { label: "Server", zone: "secure", minArea: 9, services: ["power", "ventilation", "network", "security"], extent: building },
  loading: { label: "Anlieferung", zone: "logistics", minArea: 9, services: ["power", "security"], extent: building },
  storage: { label: "Lager", zone: "logistics", minArea: 9, services: ["power", "ventilation"], extent: floor },
  meeting: { label: "Besprechung", zone: "staff", minArea: 9, services: ["power", "network"], extent: floor },
  records: { label: "Archiv", zone: "staff", minArea: 9, services: ["power", "security"], extent: building },
  corridor: { label: "Zugangshalle", zone: "staff", minArea: 9, services: ["power"], extent: floor },
  laboratory: { label: "Labor", zone: "research", minArea: 12, services: ["power", "ventilation", "network", "security"], extent: floor },
  airlock: { label: "Schleuse", zone: "research", minArea: 9, services: ["power", "ventilation", "security"], extent: floor },
  cleanroom: { label: "Reinraum", zone: "secure", minArea: 12, services: ["power", "ventilation", "network", "security"], extent: floor },
  production: { label: "Produktion", zone: "logistics", minArea: 12, services: ["power", "ventilation"], extent: floor },
  workshop: { label: "Werkstatt", zone: "logistics", minArea: 12, services: ["power", "ventilation"], extent: floor },
  dispatch: { label: "Versand", zone: "logistics", minArea: 9, services: ["power", "network"], extent: floor },
};

// Business requirements live in demand.ts; there are no fixed room slots.
export const ARCHETYPES = {
  base: {
    parent: null,
    preferences: ["offices_at_exterior", "storage_near_logistics", "restrooms_near_technical"],
  },
  office: { parent: "base", label: "Konzernbüro", preferences: [] },
  laboratory: { parent: "base", label: "Forschungslabor", preferences: ["cleanroom_via_airlock"] },
  factory: { parent: "base", label: "Fabrik / Lager", preferences: [] },
} as const;

// Dedicated circulation and its enclosing walls consume real floor area.
export const SIZE_DIMENSIONS = { compact: { width: 28, height: 24 }, standard: { width: 32, height: 28 }, large: { width: 32, height: 32 } } as const;

