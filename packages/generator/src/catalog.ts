import type { RoomRule, RoomType } from "./types.ts";

export const ROOM_RULES: Readonly<Record<RoomType, RoomRule>> = {
  executive: { label: "Geschäftsführung", zone: "staff", minArea: 20, services: ["power", "network", "security"] },
  manager: { label: "Abteilungsleitung", zone: "staff", minArea: 12, services: ["power", "network"] },
  assistant: { label: "Assistenz", zone: "staff", minArea: 12, services: ["power", "network", "security"] },
  boardroom: { label: "Vorstandssaal", zone: "staff", minArea: 20, services: ["power", "network", "security"] },
  focus: { label: "Vertrauliches Gespräch", zone: "staff", minArea: 12, services: ["power", "network"] },
  atrium: { label: "Gemeinschaftsgarten", zone: "staff", minArea: 20, services: ["power", "ventilation"] },
  reception: { label: "Empfang", zone: "public", minArea: 9, services: ["power", "network", "security"] },
  security: { label: "Sicherheit", zone: "staff", minArea: 9, services: ["power", "network", "security"] },
  office: { label: "Büro", zone: "staff", minArea: 9, services: ["power", "network"] },
  restroom: { label: "Sanitär", zone: "staff", minArea: 9, services: ["power", "ventilation"] },
  breakroom: { label: "Personal", zone: "staff", minArea: 9, services: ["power", "ventilation"] },
  mechanical: { label: "Technik", zone: "technical", minArea: 9, services: ["power", "ventilation", "network"] },
  server: { label: "Server", zone: "secure", minArea: 9, services: ["power", "ventilation", "network", "security"] },
  loading: { label: "Anlieferung", zone: "logistics", minArea: 9, services: ["power", "security"] },
  storage: { label: "Lager", zone: "logistics", minArea: 9, services: ["power", "ventilation"] },
  meeting: { label: "Besprechung", zone: "staff", minArea: 9, services: ["power", "network"] },
  records: { label: "Archiv", zone: "staff", minArea: 9, services: ["power", "security"] },
  corridor: { label: "Zugangshalle", zone: "staff", minArea: 9, services: ["power"] },
  laboratory: { label: "Labor", zone: "research", minArea: 12, services: ["power", "ventilation", "network", "security"] },
  airlock: { label: "Schleuse", zone: "research", minArea: 9, services: ["power", "ventilation", "security"] },
  cleanroom: { label: "Reinraum", zone: "secure", minArea: 12, services: ["power", "ventilation", "network", "security"] },
  production: { label: "Produktion", zone: "logistics", minArea: 12, services: ["power", "ventilation"] },
  workshop: { label: "Werkstatt", zone: "logistics", minArea: 12, services: ["power", "ventilation"] },
  dispatch: { label: "Versand", zone: "logistics", minArea: 9, services: ["power", "network"] },
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

