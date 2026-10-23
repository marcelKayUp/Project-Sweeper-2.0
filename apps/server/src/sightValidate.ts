import { BODY_PARTS, PROTOCOL_VERSION } from "@neon/sim";
import { z } from "zod";
import type { SightWish } from "./sightSession.ts";

const FAMILIES = ["office", "laboratory", "factory"] as const;
const DIRECTIONS = ["n", "e", "s", "w"] as const;
const commandId = z.string().regex(/^[A-Za-z0-9-]{1,40}$/);
const unitId = z.string().regex(/^[a-z0-9-]{1,24}$/);
const cell = z.strictObject({
  x: z.number().int().min(0).max(31),
  y: z.number().int().min(0).max(31),
});

const sightWishSchema = z.discriminatedUnion("kind", [
  z.strictObject({
    protocol: z.literal(PROTOCOL_VERSION),
    area: z.literal("sicht"),
    commandId,
    kind: z.literal("move"),
    unitId,
    path: z.array(cell).min(1).max(8),
  }),
  z.strictObject({
    protocol: z.literal(PROTOCOL_VERSION),
    area: z.literal("sicht"),
    commandId,
    kind: z.literal("shoot"),
    unitId,
    targetId: unitId,
  }),
  z.strictObject({
    protocol: z.literal(PROTOCOL_VERSION),
    area: z.literal("sicht"),
    commandId,
    kind: z.literal("interact"),
    unitId,
    targetId: unitId,
  }),
  z.strictObject({
    protocol: z.literal(PROTOCOL_VERSION),
    area: z.literal("sicht"),
    commandId,
    kind: z.literal("extract"),
    unitId,
  }),
  z.strictObject({
    protocol: z.literal(PROTOCOL_VERSION),
    area: z.literal("sicht"),
    commandId,
    kind: z.literal("reload"),
    unitId,
  }),
  z.strictObject({
    protocol: z.literal(PROTOCOL_VERSION),
    area: z.literal("sicht"),
    commandId,
    kind: z.literal("aim"),
    unitId,
  }),
  z.strictObject({
    protocol: z.literal(PROTOCOL_VERSION),
    area: z.literal("sicht"),
    commandId,
    kind: z.literal("heal"),
    unitId,
    targetId: unitId,
    part: z.enum(BODY_PARTS),
  }),
  z.strictObject({
    protocol: z.literal(PROTOCOL_VERSION),
    area: z.literal("sicht"),
    commandId,
    kind: z.literal("overwatch"),
    unitId,
    direction: z.enum(DIRECTIONS),
  }),
  z.strictObject({
    protocol: z.literal(PROTOCOL_VERSION),
    area: z.literal("sicht"),
    commandId,
    kind: z.literal("end"),
  }),
  z.strictObject({
    protocol: z.literal(PROTOCOL_VERSION),
    area: z.literal("sicht"),
    commandId,
    kind: z.literal("reset"),
  }),
]);

export type SightFamily = (typeof FAMILIES)[number];

export function readSightOptions(input: unknown): { seed: number; family: SightFamily } {
  const value =
    input !== null && typeof input === "object" && !Array.isArray(input) ? (input as Record<string, unknown>) : {};
  const seed = value.seed === undefined ? 42 : value.seed;
  const family = value.family === undefined ? "office" : value.family;
  if (typeof seed !== "number" || !Number.isInteger(seed) || seed < 0 || seed > 0xffffffff) {
    throw new Error("Seed ist ungültig.");
  }
  if (!isFamily(family)) throw new Error("Gebäudefamilie ist ungültig.");
  return { seed, family };
}

export function readSightWish(
  message: unknown,
): { ok: true; wish: SightWish } | { ok: false; commandId: string; notice: string } {
  const id = commandIdOf(message);
  if (!fits(message)) return { ok: false, commandId: id, notice: "Befehl ist zu groß." };
  const parsed = sightWishSchema.safeParse(message);
  if (!parsed.success) return { ok: false, commandId: id, notice: "Befehl ist ungültig." };
  return { ok: true, wish: parsed.data };
}

function isFamily(value: unknown): value is SightFamily {
  return value === "office" || value === "laboratory" || value === "factory";
}

function commandIdOf(message: unknown): string {
  if (typeof message !== "object" || message === null || !("commandId" in message)) return "";
  const value = message.commandId;
  if (typeof value !== "string" || value.length > 40) return "";
  return /^[A-Za-z0-9-]{1,40}$/.test(value) ? value : "";
}

function fits(payload: unknown): boolean {
  try {
    const encoded = JSON.stringify(payload);
    return typeof encoded === "string" && encoded.length <= 4096;
  } catch {
    return false;
  }
}
