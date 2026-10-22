import {
  type AccessoryType,
  type BodyType,
  type CharacterPalette,
  type CharacterSpec,
  type HairType,
  type OutfitType,
  type SpecValidation,
} from "./types.ts";

export const BODY_TYPES = ["lean", "standard", "heavy"] as const satisfies readonly BodyType[];
export const HAIR_TYPES = ["none", "crop", "mohawk", "bob"] as const satisfies readonly HairType[];
export const OUTFIT_TYPES = ["runner", "guard", "tech"] as const satisfies readonly OutfitType[];
export const ACCESSORY_TYPES = ["none", "visor", "goggles", "headset"] as const satisfies readonly AccessoryType[];
const paletteKeys = ["skin", "hair", "cloth", "armor", "accent"] as const;
const colorPattern = /^#[0-9A-Fa-f]{6}$/;
const idPattern = /^[a-z0-9][a-z0-9._-]{0,63}$/;
const MAX_JSON_BYTES = 32 * 1024;

function utf8Length(value: string): number {
  let bytes = 0;
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code < 0x80) bytes += 1;
    else if (code < 0x800) bytes += 2;
    else if (code >= 0xd800 && code <= 0xdbff && index + 1 < value.length && value.charCodeAt(index + 1) >= 0xdc00 && value.charCodeAt(index + 1) <= 0xdfff) {
      bytes += 4;
      index += 1;
    } else bytes += 3;
  }
  return bytes;
}

const palettes: readonly CharacterPalette[] = [
  { skin: "#D7A27D", hair: "#17202D", cloth: "#24364A", armor: "#637B8C", accent: "#FF4D8D" },
  { skin: "#8B5E45", hair: "#E7C65A", cloth: "#253B35", armor: "#95A884", accent: "#52E0D0" },
  { skin: "#E0B99A", hair: "#392B46", cloth: "#312D48", armor: "#A6A2B8", accent: "#F2A344" },
  { skin: "#B87558", hair: "#151719", cloth: "#3A3030", armor: "#8C554A", accent: "#C3EF54" },
  { skin: "#C99068", hair: "#F04C4C", cloth: "#223A55", armor: "#658BB1", accent: "#F2D65C" },
];

/** Small deterministic generator used only for cosmetic choices. */
export function createCosmeticRandom(seed: number): () => number {
  if (!isUint32(seed)) throw new RangeError("seed must be an unsigned 32-bit integer");
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  };
}

function isUint32(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 0xffff_ffff;
}

function pick<T>(items: readonly T[], random: () => number): T {
  return items[Math.floor(random() * items.length)]!;
}

export function createCharacterSpec(seed = 42): CharacterSpec {
  if (!isUint32(seed)) throw new RangeError("seed must be an unsigned 32-bit integer");
  return {
    schemaVersion: 1,
    id: `runner-${seed.toString(36)}`,
    seed,
    body: "standard",
    stature: 1,
    hair: "crop",
    outfit: "guard",
    accessory: "visor",
    palette: { ...palettes[0]! },
  };
}

export function randomizeCharacterSpec(seed: number): CharacterSpec {
  if (!isUint32(seed)) throw new RangeError("seed must be an unsigned 32-bit integer");
  const random = createCosmeticRandom(seed);
  return {
    schemaVersion: 1,
    id: `runner-${seed.toString(36)}`,
    seed,
    body: pick(BODY_TYPES, random),
    stature: Math.round((0.96 + random() * 0.08) * 1000) / 1000,
    hair: pick(HAIR_TYPES, random),
    outfit: pick(OUTFIT_TYPES, random),
    accessory: pick(ACCESSORY_TYPES, random),
    palette: { ...pick(palettes, random) },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function unknownFields(value: Record<string, unknown>, allowed: readonly string[], path: string, errors: string[]): void {
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key)) errors.push(`${path}.${key}: unknown field`);
  }
}

function enumValue<T extends string>(value: unknown, options: readonly T[], path: string, errors: string[]): value is T {
  if (typeof value !== "string" || !options.includes(value as T)) {
    errors.push(`${path}: expected one of ${options.join(", ")}`);
    return false;
  }
  return true;
}

export function validateCharacterSpec(input: unknown): SpecValidation {
  const errors: string[] = [];
  let encoded: string;
  try {
    encoded = JSON.stringify(input);
  } catch {
    return { ok: false, errors: ["spec: value must be JSON-serializable"] };
  }
  if (encoded === undefined || utf8Length(encoded) > MAX_JSON_BYTES) {
    return { ok: false, errors: ["spec: exceeds maximum size of 32768 UTF-8 bytes"] };
  }
  if (!isRecord(input)) return { ok: false, errors: ["spec: expected an object"] };

  const specFields = ["schemaVersion", "id", "seed", "body", "stature", "hair", "outfit", "accessory", "palette"];
  unknownFields(input, specFields, "spec", errors);
  if (input.schemaVersion !== 1) errors.push("schemaVersion: expected 1");
  const id = typeof input.id === "string" && idPattern.test(input.id);
  if (!id) errors.push("id: expected 1–64 lowercase letters, digits, dots, underscores or hyphens; first character must be a letter or digit");
  const seed = isUint32(input.seed);
  if (!seed) errors.push("seed: expected an unsigned 32-bit integer");
  const body = enumValue(input.body, BODY_TYPES, "body", errors);
  const stature = typeof input.stature === "number" && Number.isFinite(input.stature) && input.stature >= 0.9 && input.stature <= 1.15;
  if (!stature) errors.push("stature: expected a finite number from 0.9 to 1.15");
  const hair = enumValue(input.hair, HAIR_TYPES, "hair", errors);
  const outfit = enumValue(input.outfit, OUTFIT_TYPES, "outfit", errors);
  const accessory = enumValue(input.accessory, ACCESSORY_TYPES, "accessory", errors);

  const paletteInput = input.palette;
  let palette: CharacterPalette | undefined;
  if (!isRecord(paletteInput)) {
    errors.push("palette: expected an object");
  } else {
    unknownFields(paletteInput, paletteKeys, "palette", errors);
    const colors = {} as Record<(typeof paletteKeys)[number], string>;
    for (const key of paletteKeys) {
      const color = paletteInput[key];
      if (typeof color !== "string" || !colorPattern.test(color)) errors.push(`palette.${key}: expected #RRGGBB`);
      else colors[key] = color.toUpperCase();
    }
    if (paletteKeys.every((key) => typeof colors[key] === "string")) palette = colors;
  }

  if (errors.length > 0 || !id || !seed || !body || !stature || !hair || !outfit || !accessory || !palette) {
    return { ok: false, errors };
  }
  return {
    ok: true,
    value: {
      schemaVersion: 1,
      id: input.id as string,
      seed: input.seed as number,
      body: input.body as BodyType,
      stature: Math.round((input.stature as number) * 1000) / 1000,
      hair: input.hair as HairType,
      outfit: input.outfit as OutfitType,
      accessory: input.accessory as AccessoryType,
      palette,
    },
  };
}

