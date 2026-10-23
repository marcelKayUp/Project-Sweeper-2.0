import { buildCandidate } from "./build.ts";
import { contentHash, deriveSeed, freeze } from "./random.ts";
import { CONTENT_VERSION, FAMILIES, GENERATOR_VERSION, SIZES, STAGE_VERSIONS, type AttemptReport, type BuildingPackage, type Finding, type GenerationResult, type GeneratorConfig } from "./types.ts";
import { validateBuilding } from "./validate.ts";
import { LayoutFailure } from "./layout/index.ts";
import { defaultBusinessProfile, planDemand } from "./demand.ts";
import { BUILDING_HISTORIES, CONDITIONS, CORPORATIONS, DEPARTMENTS, SITE_ROLES, STATUS_TIERS } from "./types.ts";

export { ARCHETYPES, ROOM_RULES, SIZE_DIMENSIONS } from "./catalog.ts";
export { canonical, contentHash } from "./random.ts";
export { validateBuilding } from "./validate.ts";
export { GENERATOR_VERSION, CONTENT_VERSION } from "./types.ts";
export { defaultBusinessProfile, planDemand } from "./demand.ts";
export { CORPORATE_PROFILES, resolveIdentity } from "./corporate.ts";
export { CORPORATIONS, SITE_ROLES, DEPARTMENTS, STATUS_TIERS, BUILDING_HISTORIES, CONDITIONS } from "./types.ts";
export type * from "./types.ts";

export function parseConfig(input: unknown): GeneratorConfig {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("Generatorparameter müssen ein Objekt sein.");
  const value = input as Record<string, unknown>;
  const keys = ["seed", "family", "size", "crewSize", "mission", "instanceId", "maxAttempts", "occupants", "workplaces", "processUnits", "storageUnits", "scope", "floorShare", "corporation", "siteRole", "department", "statusTier", "buildingHistory", "condition"];
  if (Object.keys(value).some((key) => !keys.includes(key))) throw new Error("Unbekannter Generatorparameter.");
  if (typeof value.seed !== "number" || !Number.isSafeInteger(value.seed) || value.seed < 0 || value.seed > 0xffffffff) throw new Error("Seed muss eine Ganzzahl zwischen 0 und 4294967295 sein.");
  if (typeof value.family !== "string" || !(FAMILIES as readonly string[]).includes(value.family)) throw new Error("Unbekannte Gebäudefamilie.");
  const size = value.size === undefined ? "compact" : value.size;
  if (typeof size !== "string" || !(SIZES as readonly string[]).includes(size)) throw new Error("Unbekannte Gebäudegröße.");
  if (value.crewSize !== undefined && value.crewSize !== 4) throw new Error("Diese Generatorversion unterstützt genau vier Runner.");
  if (value.mission !== undefined && value.mission !== "data-heist") throw new Error("Nur der implementierte Datenraub wird unterstützt.");
  const instanceId = value.instanceId === undefined ? "preview" : value.instanceId;
  if (typeof instanceId !== "string" || !/^[a-z0-9][a-z0-9-]{0,47}$/.test(instanceId)) throw new Error("Instanz-ID muss aus 1–48 Kleinbuchstaben, Ziffern oder Bindestrichen bestehen.");
  const maxAttempts = value.maxAttempts === undefined ? 10 : value.maxAttempts;
  if (typeof maxAttempts !== "number" || !Number.isInteger(maxAttempts) || maxAttempts < 1 || maxAttempts > 10) throw new Error("Versuchsbudget muss zwischen 1 und 10 liegen.");
  const family = value.family as GeneratorConfig["family"];
  const defaults = defaultBusinessProfile(family, size as GeneratorConfig["size"]);
  function integer(key: keyof typeof defaults, minimum: number, maximum: number): number {
    const n = value[key] === undefined ? defaults[key] : value[key];
    if (typeof n !== "number" || !Number.isInteger(n) || n < minimum || n > maximum) throw new Error(`${key} muss eine Ganzzahl zwischen ${minimum} und ${maximum} sein.`);
    return n;
  }
  const occupants = integer("occupants", 1, 96);
  const workplaces = integer("workplaces", family === "office" ? 1 : 0, 96);
  const processUnits = integer("processUnits", family === "office" ? 0 : 1, 48);
  const storageUnits = integer("storageUnits", 1, 96);
  if (workplaces > occupants) throw new Error("Büroarbeitsplätze dürfen die gleichzeitig anwesende Belegung nicht überschreiten.");
  if (family === "office" && processUnits !== 0) throw new Error("Das Büroprofil verwendet keine Prozessplätze.");
  const scope = value.scope === undefined ? "building" : value.scope;
  if (scope !== "building" && scope !== "mission-floor") throw new Error("Unbekannter Gebäudeausschnitt.");
  const floorShare = value.floorShare === undefined ? scope === "building" ? 100 : 50 : value.floorShare;
  if (typeof floorShare !== "number" || !Number.isInteger(floorShare) || floorShare < 1 || floorShare > 100 || scope === "building" && floorShare !== 100) throw new Error("Geschossanteil muss zwischen 1 und 100 liegen; beim ganzen Gebäude genau 100.");
  function choice<T extends string>(key: string, allowed: readonly T[], fallback: T): T {
    const selected = value[key] === undefined ? fallback : value[key];
    if (typeof selected !== "string" || !allowed.includes(selected as T)) throw new Error(`Unbekannter Wert für ${key}.`);
    return selected as T;
  }
  return { seed: value.seed, family, size: size as GeneratorConfig["size"], crewSize: 4, mission: "data-heist", instanceId, maxAttempts, occupants, workplaces, processUnits, storageUnits, scope, floorShare,
    corporation: choice("corporation", CORPORATIONS, "neutral"), siteRole: choice("siteRole", SITE_ROLES, "branch"), department: choice("department", DEPARTMENTS, "mixed"), statusTier: choice("statusTier", STATUS_TIERS, "staff"), buildingHistory: choice("buildingHistory", BUILDING_HISTORIES, "purpose-built"), condition: choice("condition", CONDITIONS, "pristine") };
}

export async function generateBuilding(input: unknown): Promise<GenerationResult> {
  let config: GeneratorConfig;
  try { config = parseConfig(input); }
  catch (error) { return { ok: false, errors: [{ code: "config", message: error instanceof Error ? error.message : "Ungültige Konfiguration", ids: [] }], attempts: [], demand: null }; }
  const demand = planDemand(config);
  if (demand.errors.length) return freeze({ ok: false, errors: demand.errors, attempts: [], demand });
  const attempts: AttemptReport[] = [];
  for (let attempt = 1; attempt <= config.maxAttempts; attempt += 1) {
    const stages = ["program", "floorplan", "topology", "tactics", "encounters", "dressing"] as const;
    const seeds = Object.fromEntries(stages.map((stage) => [stage, deriveSeed(config, stage, attempt)])) as unknown as BuildingPackage["seeds"];
    let candidate: ReturnType<typeof buildCandidate>;
    try { candidate = buildCandidate(config, seeds); }
    catch (error) {
      if (!(error instanceof LayoutFailure)) throw error;
      attempts.push({ attempt, errors: error.rejected.map((rejected) => ({ code: "layout-embedding", message: `Layout ${rejected.candidate}: ${rejected.reason} (${rejected.nodes} Suchknoten)`, ids: [] })) });
      continue;
    }
    const report = validateBuilding(candidate.building, candidate.mission, config);
    attempts.push({ attempt, errors: report.errors });
    if (report.errors.length) continue;
    const { hash: _unused, ...missionBody } = candidate.mission;
    const mission = { ...missionBody, hash: await contentHash(missionBody) };
    const body: Omit<BuildingPackage, "hash"> = { formatVersion: 6, generatorVersion: GENERATOR_VERSION, contentVersion: CONTENT_VERSION, stageVersions: STAGE_VERSIONS, config, attempt, seeds, building: candidate.building, mission, report, attempts };
    return { ok: true, package: freeze({ ...body, hash: await contentHash(body) }) };
  }
  const errors: Finding[] = [{ code: "attempt-budget", message: `${demand.instances.length} Räume mit mindestens ${demand.summary.minimumArea} Raumfeldern konnten nach ${config.maxAttempts} Versuchen nicht gültig angeordnet werden (${demand.summary.availableArea} Innenfelder). Größere Fläche oder kleineren Bedarf/Ausschnitt wählen. Kein Rückfall und kein halbfertiger Export.`, ids: [] }];
  return freeze({ ok: false, errors, attempts, demand });
}

export { architecturalNodes, sanitaryPath, EXECUTIVE_SANITARY_LIMIT } from "./circulation.ts";
