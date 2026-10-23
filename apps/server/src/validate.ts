import { z } from "zod";
import { BODY_PARTS, PACK_CELLS, PROTOCOL_VERSION } from "@neon/sim";

const field = z.number().int().min(0).max(19);

const commandId = z.string().regex(/^[A-Za-z0-9-]{1,40}$/);
const targetId = z.string().regex(/^[a-z0-9-]{1,24}$/);

export const commandSchema = z.object({
  protocol: z.literal(PROTOCOL_VERSION),
  missionId: z.literal("ghost-floor"),
  commandId,
  round: z.number().int().min(1).max(24),
  phase: z.literal("crew"),
  epoch: z.number().int().min(1).max(99),
  unitId: z.string().regex(/^[a-z-]{1,24}$/),
  action: z.discriminatedUnion("kind", [
    z.object({ kind: z.literal("move"), x: field, y: field, z: z.number().int().min(0).max(7).optional() }),
    z.object({ kind: z.literal("interact"), targetId: z.enum(["terminal", "shortcut"]) }),
    z.object({ kind: z.literal("extract") }),
    z.object({ kind: z.literal("shoot"), targetId }),
    z.object({ kind: z.literal("reload") }),
    z.object({ kind: z.literal("aim") }),
    z.object({ kind: z.literal("heal"), targetId, part: z.enum(BODY_PARTS) }),
    z.object({ kind: z.literal("overwatch"), direction: z.enum(["n", "e", "s", "w"]) }),
    z.object({ kind: z.literal("ready") }),
  ]),
});

const inventoryPlace = z.discriminatedUnion("area", [
  z.object({ area: z.literal("hands") }),
  z.object({ area: z.literal("hand"), hand: z.enum(["left", "right"]) }),
  z.object({ area: z.literal("belt") }),
  z.object({ area: z.literal("pack"), index: z.number().int().min(0).max(PACK_CELLS - 1) }),
  z.object({
    area: z.literal("stash"),
    post: z.enum(["rifle", "sidearm", "rifleMagazines", "sidearmMagazines", "medkits"]),
  }),
]);

export const lobbySchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("preset"), preset: z.enum(["rifle", "sidearm"]) }),
  z.object({ kind: z.literal("bereit"), ready: z.boolean() }),
  z.object({ kind: z.literal("start") }),
  z.object({ kind: z.literal("bot") }),
  z.object({ kind: z.literal("zeit"), seconds: z.union([z.literal(60), z.literal(90), z.literal(120)]) }),
  z.object({
    kind: z.literal("lager"),
    richtung: z.enum(["nehmen", "legen"]),
    posten: z.enum(["rifle", "sidearm", "rifleMagazines", "sidearmMagazines", "medkits"]),
  }),
  z.object({
    kind: z.literal("ziehen"),
    von: inventoryPlace,
    nach: inventoryPlace,
  }),
]);

export type CommandMessage = z.infer<typeof commandSchema>;
export type LobbyMessage = z.infer<typeof lobbySchema>;

export function parseCommand(
  payload: unknown,
): { ok: true; command: CommandMessage } | { ok: false; commandId: string; rejection: string } {
  const id = commandIdOf(payload);
  if (!fits(payload)) return { ok: false, commandId: id, rejection: "Befehl ist zu groß." };
  const parsed = commandSchema.safeParse(payload);
  if (!parsed.success) return { ok: false, commandId: id, rejection: "Befehl ist ungültig." };
  return { ok: true, command: parsed.data };
}

export function parseLobby(payload: unknown): { ok: true; message: LobbyMessage } | { ok: false; rejection: string } {
  if (!fits(payload)) return { ok: false, rejection: "Befehl ist zu groß." };
  const parsed = lobbySchema.safeParse(payload);
  if (!parsed.success) return { ok: false, rejection: "Befehl ist ungültig." };
  return { ok: true, message: parsed.data };
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
