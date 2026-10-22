import { PROTOCOL_VERSION } from "@neon/sim";
import { z } from "zod";
import type { RasterWish } from "./rasterSession.ts";

const commandId = z.string().regex(/^[A-Za-z0-9-]{1,40}$/);
const cell = z.strictObject({
  x: z.number().int().min(-1).max(8),
  y: z.number().int().min(-1).max(8),
});

// Ein Sitz, keine Missionsphase: die Verbindung besitzt den einzigen Runner.
const rasterWishSchema = z.discriminatedUnion("kind", [
  z.strictObject({
    protocol: z.literal(PROTOCOL_VERSION),
    area: z.literal("raster"),
    commandId,
    kind: z.literal("move"),
    path: z.array(cell).min(1).max(16),
  }),
  z.strictObject({
    protocol: z.literal(PROTOCOL_VERSION),
    area: z.literal("raster"),
    commandId,
    kind: z.literal("reset"),
  }),
  z.strictObject({
    protocol: z.literal(PROTOCOL_VERSION),
    area: z.literal("raster"),
    commandId,
    kind: z.literal("end"),
  }),
]);

export function readRasterWish(
  message: unknown,
): { ok: true; wish: RasterWish } | { ok: false; commandId: string; notice: string } {
  const id = commandIdOf(message);
  if (!fits(message)) return { ok: false, commandId: id, notice: "Befehl ist zu groß." };
  const parsed = rasterWishSchema.safeParse(message);
  if (!parsed.success) return { ok: false, commandId: id, notice: "Befehl ist ungültig." };
  return { ok: true, wish: parsed.data };
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
    return typeof encoded === "string" && encoded.length <= 2048;
  } catch {
    return false;
  }
}
