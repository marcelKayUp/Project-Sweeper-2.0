import type { Cell, MissionSpec, VerticalLink } from "@neon/sim";

export const GENERATOR_VERSION = "semantic-building/7";
export const CONTENT_VERSION = "building-catalog/5";
export const STAGE_VERSIONS = { program: 6, floorplan: 5, topology: 5, tactics: 1, encounters: 1, dressing: 2 } as const;
export const CORPORATIONS = ["neutral", "kasane", "concord", "parallax", "verdant"] as const;
export const SITE_ROLES = ["headquarters", "branch", "operations"] as const;
export const DEPARTMENTS = ["mixed", "finance", "legal", "engineering", "service"] as const;
export const STATUS_TIERS = ["executive", "staff", "contractor"] as const;
export const BUILDING_HISTORIES = ["purpose-built", "converted"] as const;
export const CONDITIONS = ["pristine", "worn", "patched"] as const;
export type Corporation = typeof CORPORATIONS[number];
export type Department = typeof DEPARTMENTS[number];
export type WorkplaceRole = "executive" | "manager" | "assistant" | "team" | "support";
export type OfficeForm = "cell" | "group" | "open" | "support";
export type Access = "public" | "staff" | "restricted" | "executive";
export type Surface = "stone" | "timber" | "steel" | "carpet" | "resin" | "rubber";
export interface CorporateConfig {
  readonly corporation: Corporation;
  readonly siteRole: typeof SITE_ROLES[number];
  readonly department: Department;
  readonly statusTier: typeof STATUS_TIERS[number];
  readonly buildingHistory: typeof BUILDING_HISTORIES[number];
  readonly condition: typeof CONDITIONS[number];
}
export interface CorporateIdentity extends CorporateConfig {
  readonly model: "corporate-identity/1";
  readonly name: string;
  readonly origin: string;
  readonly history: string;
  readonly promise: string;
  readonly tension: string;
  readonly signature: string;
  readonly accent: string;
  readonly wall: string;
  readonly pattern: "lines" | "grid" | "circuits" | "leaves";
  readonly officeCapacity: number;
  readonly meetingCapacity: number;
  readonly principles: readonly string[];
}
export interface Appearance {
  readonly surface: Surface;
  readonly color: string;
  readonly accent: string;
  readonly pattern: CorporateIdentity["pattern"];
  readonly lighting: "warm" | "neutral" | "cool";
  readonly wear: CorporateConfig["condition"];
}
export const FAMILIES = ["office", "laboratory", "factory"] as const;
export const SIZES = ["compact", "standard", "large"] as const;
export type Family = typeof FAMILIES[number];
export type Size = typeof SIZES[number];
export type Scope = "building" | "mission-floor";
export interface BusinessProfile {
  readonly occupants: number;
  readonly workplaces: number;
  readonly processUnits: number;
  readonly storageUnits: number;
}
export type Zone = "public" | "staff" | "research" | "secure" | "logistics" | "technical";
export type Service = "power" | "ventilation" | "network" | "security";
export type RoomType = "reception" | "security" | "office" | "restroom" | "breakroom"
  | "mechanical" | "server" | "loading" | "storage" | "meeting" | "records"
  | "corridor" | "laboratory" | "airlock" | "cleanroom" | "production" | "workshop" | "dispatch"
  | "executive" | "manager" | "assistant" | "boardroom" | "focus" | "atrium";

export interface GeneratorConfig extends BusinessProfile, CorporateConfig {
  readonly seed: number;
  readonly family: Family;
  readonly size: Size;
  readonly crewSize: 4;
  readonly mission: "data-heist";
  readonly instanceId: string;
  readonly maxAttempts: number;
  readonly scope: Scope;
  readonly floorShare: number;
}
export interface ProgramRow {
  readonly type: RoomType;
  readonly count: number;
  readonly outsideCount: number;
  readonly totalCount: number;
  readonly required: number;
  readonly outsideRequired: number;
  readonly capacityPerRoom: number;
  readonly capacity: number;
  readonly unit: string;
  readonly minArea: number;
  readonly minimumArea: number;
  readonly reason: string;
  readonly extent: "building" | "floor";
}
export interface BuildingScale {
  readonly floors: number;
  readonly plateArea: number;
  readonly totalArea: number;
}
export interface DemandSummary {
  readonly model: "business-capacity/2";
  readonly building: BusinessProfile;
  readonly local: BusinessProfile;
  readonly outside: BusinessProfile;
  readonly scale: BuildingScale;
  readonly minimumArea: number;
  readonly minimumWallArea: number;
  readonly minimumCirculationArea: number;
  readonly availableArea: number;
  readonly sanitaryFixtures: number;
  readonly outsideSanitaryFixtures: number;
}
export interface RoomRequirement {
  readonly id: string;
  readonly type: RoomType;
  readonly minArea: number;
  readonly capacity: number;
  readonly assignedDemand: number;
  readonly workplaceRole: WorkplaceRole;
  readonly officeForm: OfficeForm;
  readonly department: Department;
  readonly access: Access;
}
export interface DemandPlan {
  readonly identity: CorporateIdentity;
  readonly relationships: readonly RoomRelationship[];
  readonly summary: DemandSummary;
  readonly program: readonly ProgramRow[];
  readonly instances: readonly RoomRequirement[];
  readonly entryRoomId: string;
  readonly secondaryEntryRoomId: string;
  readonly targetRoomId: string;
  readonly errors: readonly Finding[];
}
export interface RoomRelationship {
  readonly from: string;
  readonly to: string;
  readonly reason: string;
  readonly exclusive: boolean;
  readonly maxDistance?: number;
}
export interface RoomRule {
  readonly label: string;
  readonly zone: Zone;
  readonly minArea: number;
  readonly services: readonly Service[];
  readonly extent: "building" | "floor";
}
export interface Room extends Cell, RoomRequirement {
  readonly zone: Zone;
  readonly width: number;
  readonly height: number;
  readonly minArea: number;
  readonly capacity: number;
  readonly assignedDemand: number;
  readonly appearance: Appearance;
}
export interface Connection {
  readonly id: string;
  readonly from: string;
  readonly to: string;
  readonly kind: "open" | "controlled" | "airlock" | "shortcut" | "passage";
  readonly portal: Cell;
}
export interface ServiceGraph {
  readonly kind: Service;
  readonly source: string;
  readonly nodes: readonly string[];
  readonly edges: readonly { readonly from: string; readonly to: string }[];
}
export interface MissionGraph {
  readonly entryRoom: string;
  readonly secondaryEntryRoom: string;
  readonly targetRoom: string;
  readonly objectives: readonly { readonly id: string; readonly roomId: string; readonly action: "enter" | "copy-twice" | "extract"; readonly requires: readonly string[] }[];
  readonly routes: readonly (readonly string[])[];
}
export interface Dressing extends Cell {
  readonly id: string;
  readonly roomId: string;
  readonly module: "desk" | "bench" | "machine" | "cabinet" | "table" | "planter";
  // Cosmetic proxies only. Authoritative cover is MissionSpec.lowCover.
}
export interface Building {
  readonly identity: CorporateIdentity;
  readonly relationships: readonly RoomRelationship[];
  readonly demand: DemandSummary;
  readonly layout: LayoutInfo;
  readonly rooms: readonly Room[];
  readonly circulation: readonly Cell[];
  readonly program: readonly ProgramRow[];
  readonly connections: readonly Connection[];
  readonly entries: readonly { readonly roomId: string; readonly cell: Cell }[];
  readonly infrastructure: readonly ServiceGraph[];
  readonly missionGraph: MissionGraph;
  readonly dressing: readonly Dressing[];
  readonly links: readonly VerticalLink[];
}
export interface LayoutInfo {
  readonly method: "bsp" | "graph" | "circulation";
  readonly templateId: string | null;
  readonly candidate: number;
  readonly partitionSeed: number;
  readonly embeddingSeed: number;
  readonly searchNodes: number;
  readonly backtracks: number;
  readonly partitions: readonly { readonly id: string; readonly bounds: Cell & { readonly width: number; readonly height: number }; readonly axis: "x" | "y"; readonly offset: number }[];
  readonly rejected: readonly { readonly candidate: number; readonly reason: string; readonly nodes: number }[];
}
export interface Finding {
  readonly code: string;
  readonly message: string;
  readonly ids: readonly string[];
}
export interface ValidationReport {
  readonly errors: readonly Finding[];
  readonly warnings: readonly Finding[];
  readonly metrics: {
    readonly roomCount: number;
    readonly walkableCells: number;
    readonly targetDistance: number;
    readonly independentRoutes: number;
    readonly coverCount: number;
    readonly preferenceScore: number;
    readonly corridorCells: number;
    readonly executiveSanitaryDistance: number | null;
  };
}
export interface AttemptReport {
  readonly attempt: number;
  readonly errors: readonly Finding[];
}
export interface BuildingPackage {
  readonly formatVersion: 7;
  readonly generatorVersion: typeof GENERATOR_VERSION;
  readonly contentVersion: typeof CONTENT_VERSION;
  readonly stageVersions: typeof STAGE_VERSIONS;
  readonly config: GeneratorConfig;
  readonly attempt: number;
  readonly seeds: Readonly<Record<"program" | "floorplan" | "topology" | "tactics" | "encounters" | "dressing", number>>;
  readonly building: Building;
  readonly mission: MissionSpec;
  readonly report: ValidationReport;
  readonly attempts: readonly AttemptReport[];
  readonly hash: string;
}
export type GenerationResult =
  | { readonly ok: true; readonly package: BuildingPackage }
  | { readonly ok: false; readonly errors: readonly Finding[]; readonly attempts: readonly AttemptReport[]; readonly demand: DemandPlan | null };
