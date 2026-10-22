import { createCosmeticRandom } from "./spec.ts";

export const MODULAR_SOURCE_ID = "quaternius-modular-men-v1";
export const MODULAR_FEMALE_SOURCE_ID = "modular-women-v1";
export const MODULAR_SOURCE_IDS = [MODULAR_SOURCE_ID, MODULAR_FEMALE_SOURCE_ID] as const;
export type ModularSourceId = typeof MODULAR_SOURCE_IDS[number];
export const MODULAR_VARIANTS = ["Adventurer", "Beach", "Casual", "Casual2", "Farmer", "King", "Punk", "SpaceSuit", "Suit", "Swat", "Worker"] as const;
export const MODULAR_FEMALE_VARIANTS = ["Adventurer", "Casual", "Formal", "Medieval", "Punk", "SciFi", "Soldier", "Suit", "Witch", "Worker"] as const;
export const MODULAR_SLOTS = ["head", "body", "legs", "feet"] as const;
export const MODULAR_EQUIPMENT = ["none", "pistol", "sword", "backpack"] as const;
export const MODULAR_PALETTE_ROLES = ["skin", "hair", "cloth", "armor", "accent"] as const;
export type ModularVariant = typeof MODULAR_VARIANTS[number] | typeof MODULAR_FEMALE_VARIANTS[number];
export type ModularSlot = typeof MODULAR_SLOTS[number];
export type ModularEquipment = typeof MODULAR_EQUIPMENT[number];
export type ModularPaletteRole = typeof MODULAR_PALETTE_ROLES[number];
export interface ModularLibrary {
  readonly label: string;
  readonly variants: readonly ModularVariant[];
  readonly equipment: readonly ModularEquipment[];
  readonly defaultVariant: ModularVariant;
}
export const MODULAR_LIBRARIES: Readonly<Record<ModularSourceId, ModularLibrary>> = {
  [MODULAR_SOURCE_ID]: { label: "Männlich", variants: MODULAR_VARIANTS, equipment: MODULAR_EQUIPMENT, defaultVariant: "Casual2" },
  [MODULAR_FEMALE_SOURCE_ID]: { label: "Weiblich", variants: MODULAR_FEMALE_VARIANTS, equipment: ["none", "pistol", "sword"], defaultVariant: "Casual" },
};
export function getModularLibrary(source: ModularSourceId): ModularLibrary { return MODULAR_LIBRARIES[source]; }
export interface ModularCharacterSpec {
  readonly schemaVersion: 2;
  readonly source: ModularSourceId;
  readonly id: string;
  readonly seed: number;
  readonly stature: number;
  readonly parts: Readonly<Record<ModularSlot, ModularVariant>>;
  readonly equipment: ModularEquipment;
  /** null preserves the artist's original material colors. */
  readonly palette: Readonly<Record<ModularPaletteRole, string | null>>;
}
export type ModularValidation = { readonly ok: true; readonly value: ModularCharacterSpec } | { readonly ok: false; readonly errors: readonly string[] };
export interface ModularCatalog {
  readonly schemaVersion: 1;
  readonly sourceId: ModularSourceId;
  readonly assetFile: string;
  readonly assetSha256: string;
  readonly sourceBlendSha256: string;
  readonly author: string;
  readonly license: string;
  readonly sourceUrl: string;
  readonly variants: readonly ModularVariant[];
  readonly slots: Readonly<Record<ModularSlot, Readonly<Partial<Record<ModularVariant, string>>>>>;
  readonly equipment: Readonly<Record<ModularEquipment, string | null>>;
  readonly clips: readonly string[];
  readonly rig: { readonly name: string; readonly bones: number };
  readonly height: number;
}

export function modularPartName(slot: ModularSlot, variant: ModularVariant, source: ModularSourceId = MODULAR_SOURCE_ID): string {
  if (source === MODULAR_FEMALE_SOURCE_ID && slot === "head" && variant === "Formal") return "Formad_Head";
  const suffix = slot === "head" ? "Head" : slot === "body" ? "Body" : slot === "feet" ? "Feet" : variant === "Farmer" ? "Pants" : "Legs";
  return `${variant}_${suffix}`;
}

export function createModularCharacterSpec(seed = 42, variant?: ModularVariant, source: ModularSourceId = MODULAR_SOURCE_ID): ModularCharacterSpec {
  if (!Number.isInteger(seed) || seed < 0 || seed > 0xffff_ffff) throw new RangeError("Seed muss ein uint32 sein.");
  if (!MODULAR_SOURCE_IDS.includes(source)) throw new RangeError("Unbekannte Modellbibliothek.");
  const library = getModularLibrary(source);
  variant ??= library.defaultVariant;
  if (!library.variants.includes(variant)) throw new RangeError("Unbekannte Modellvariante für diese Bibliothek.");
  return { schemaVersion: 2, source, id: `${source === MODULAR_SOURCE_ID ? "quaternius" : "woman"}-${seed.toString(36)}`, seed, stature: 1,
    parts: { head: variant, body: variant, legs: variant, feet: variant }, equipment: "none",
    palette: { skin: null, hair: null, cloth: null, armor: null, accent: null } };
}

export function randomizeModularCharacterSpec(seed: number, source: ModularSourceId = MODULAR_SOURCE_ID): ModularCharacterSpec {
  const base = createModularCharacterSpec(seed, undefined, source);
  const random = createCosmeticRandom(seed);
  const variants = getModularLibrary(source).variants;
  const choose = (): ModularVariant => variants[Math.floor(random() * variants.length)]!;
  return { ...base, parts: { head: choose(), body: choose(), legs: choose(), feet: choose() } };
}

function record(value: unknown): value is Record<string, unknown> { return value !== null && typeof value === "object" && !Array.isArray(value); }
function fields(value: Record<string, unknown>, allowed: readonly string[], prefix: string, errors: string[]): void {
  for (const key of Object.keys(value)) if (!allowed.includes(key)) errors.push(`${prefix}${key}: unbekanntes Feld.`);
}
function utf8Length(value: string): number {
  let bytes = 0;
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code < 0x80) bytes += 1;
    else if (code < 0x800) bytes += 2;
    else if (code >= 0xd800 && code <= 0xdbff && index + 1 < value.length && value.charCodeAt(index + 1) >= 0xdc00 && value.charCodeAt(index + 1) <= 0xdfff) { bytes += 4; index += 1; }
    else bytes += 3;
  }
  return bytes;
}

export function validateModularCharacterSpec(input: unknown): ModularValidation {
  const errors: string[] = [];
  try { const serialized = JSON.stringify(input); if (serialized === undefined || utf8Length(serialized) > 32 * 1024) return { ok: false, errors: ["JSON muss höchstens 32 KiB groß sein."] }; }
  catch { return { ok: false, errors: ["JSON enthält nicht serialisierbare Daten."] }; }
  if (!record(input)) return { ok: false, errors: ["Erwartet wird eine Figuren-Spezifikation als Objekt."] };
  fields(input, ["schemaVersion", "source", "id", "seed", "stature", "parts", "equipment", "palette"], "", errors);
  if (input.schemaVersion !== 2) errors.push("schemaVersion: erwartet wird 2 für den modularen Creator.");
  const library = MODULAR_SOURCE_IDS.includes(input.source as ModularSourceId) ? getModularLibrary(input.source as ModularSourceId) : undefined;
  if (!library) errors.push("source: unbekannte Modellbibliothek.");
  if (typeof input.id !== "string" || !/^[a-z0-9][a-z0-9._-]{0,63}$/.test(input.id)) errors.push("id: 1–64 Kleinbuchstaben/Ziffern/Punkt/Unterstrich/Bindestrich, Beginn mit Buchstabe oder Ziffer.");
  if (typeof input.seed !== "number" || !Number.isInteger(input.seed) || input.seed < 0 || input.seed > 0xffff_ffff) errors.push("seed: erwartet wird ein uint32.");
  if (typeof input.stature !== "number" || !Number.isFinite(input.stature) || input.stature < 0.9 || input.stature > 1.15) errors.push("stature: gültiger Bereich 0.9–1.15.");
  if (!library?.equipment.includes(input.equipment as ModularEquipment)) errors.push("equipment: Zubehör ist in dieser Modellbibliothek nicht verfügbar.");
  if (!record(input.parts)) errors.push("parts: vier Modellteile sind erforderlich.");
  else {
    fields(input.parts, MODULAR_SLOTS, "parts.", errors);
    for (const slot of MODULAR_SLOTS) if (!library?.variants.includes(input.parts[slot] as ModularVariant)) errors.push(`parts.${slot}: unbekannte Modellvariante für diese Bibliothek.`);
  }
  if (!record(input.palette)) errors.push("palette: fünf Farbrollen sind erforderlich.");
  else {
    fields(input.palette, MODULAR_PALETTE_ROLES, "palette.", errors);
    for (const role of MODULAR_PALETTE_ROLES) if (input.palette[role] !== null && (typeof input.palette[role] !== "string" || !/^#[0-9a-fA-F]{6}$/.test(input.palette[role] as string))) errors.push(`palette.${role}: erwartet wird null oder #RRGGBB.`);
  }
  if (errors.length) return { ok: false, errors };
  const parts = input.parts as Record<ModularSlot, ModularVariant>;
  const palette = input.palette as Record<ModularPaletteRole, string | null>;
  return { ok: true, value: { schemaVersion: 2, source: input.source as ModularSourceId, id: input.id as string, seed: input.seed as number, stature: input.stature as number,
    parts: { head: parts.head, body: parts.body, legs: parts.legs, feet: parts.feet }, equipment: input.equipment as ModularEquipment,
    palette: { skin: palette.skin?.toUpperCase() ?? null, hair: palette.hair?.toUpperCase() ?? null, cloth: palette.cloth?.toUpperCase() ?? null, armor: palette.armor?.toUpperCase() ?? null, accent: palette.accent?.toUpperCase() ?? null } } };
}
