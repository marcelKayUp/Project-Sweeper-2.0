import type { Access, Department, OfficeForm, Surface, WorkplaceRole } from "@neon/generator";
export const OFFICE_FORMS: Record<OfficeForm, string> = { cell: "Zellenbüro", group: "Gruppenbüro", open: "Offene Teamfläche", support: "Funktionsraum" };
export const ROLES: Record<WorkplaceRole, string> = { executive: "Geschäftsführung", manager: "Abteilungsleitung", assistant: "Assistenz", team: "Team", support: "Unterstützung" };
export const ACCESS: Record<Access, string> = { public: "Öffentlich", staff: "Personal", restricted: "Beschränkt", executive: "Geschäftsführung" };
export const DEPARTMENT_LABELS: Record<Department, string> = { mixed: "Gemischt", finance: "Finance / Controlling", legal: "Legal / Verträge", engineering: "Engineering / Entwicklung", service: "Service / Verwaltung" };
export const SURFACES: Record<Surface, string> = { stone: "Stein", timber: "Holz", steel: "Metall", carpet: "Teppich", resin: "Kunstharz", rubber: "Elastomer" };
export const CONDITION_LABELS = { pristine: "Gepflegt", worn: "Gebraucht", patched: "Geflickt" } as const;
