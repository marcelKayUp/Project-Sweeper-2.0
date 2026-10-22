export const CHARACTER_VERSION = "1.2.0";
export const CLIP_NAMES = ["idle", "walk", "crouch", "shoot", "reload", "hit", "death"] as const;
export type ClipName = (typeof CLIP_NAMES)[number];
export type BodyType = "lean" | "standard" | "heavy";
export type HairType = "none" | "crop" | "mohawk" | "bob";
export type OutfitType = "runner" | "guard" | "tech";
export type AccessoryType = "none" | "visor" | "goggles" | "headset";
export interface CharacterPalette {
  readonly skin: string;
  readonly hair: string;
  readonly cloth: string;
  readonly armor: string;
  readonly accent: string;
}
export type PaletteRole = keyof CharacterPalette;
export interface CharacterSpec {
  readonly schemaVersion: 1;
  readonly id: string;
  readonly seed: number;
  readonly body: BodyType;
  readonly stature: number;
  readonly hair: HairType;
  readonly outfit: OutfitType;
  readonly accessory: AccessoryType;
  readonly palette: CharacterPalette;
}
export type SpecValidation = { readonly ok: true; readonly value: CharacterSpec } | { readonly ok: false; readonly errors: readonly string[] };
export type Vec3Tuple = readonly [number, number, number];
export interface RigJoint {
  readonly id: string;
  readonly parentIndex: number | null;
  /** Local bind translation relative to parent. */
  readonly position: Vec3Tuple;
}
export interface CharacterPart {
  readonly id: string;
  readonly material: PaletteRole;
  readonly positions: readonly number[];
  readonly normals: readonly number[];
  readonly indices: readonly number[];
  /** Four indices and normalized weights per vertex. */
  readonly joints: readonly number[];
  readonly weights: readonly number[];
}
export interface CharacterStats {
  readonly triangles: number;
  readonly vertices: number;
  readonly materials: number;
  readonly bones: number;
  readonly height: number;
}
export interface CharacterGeometry {
  readonly spec: CharacterSpec;
  readonly joints: readonly RigJoint[];
  readonly parts: readonly CharacterPart[];
  readonly stats: CharacterStats;
}
