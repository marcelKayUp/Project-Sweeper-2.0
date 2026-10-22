import { z } from "zod";
import { PROTOCOL_VERSION } from "@neon/sim";

const field = z.number().int().min(0).max(19);

export const commandSchema = z.object({
  protocol: z.literal(PROTOCOL_VERSION),
  missionId: z.literal("ghost-floor"),
  commandId: z.string().regex(/^[A-Za-z0-9-]{1,40}$/),
  round: z.number().int().min(1).max(24),
  phase: z.literal("crew"),
  epoch: z.number().int().min(1).max(99),
  unitId: z.string().regex(/^[a-z-]{1,24}$/),
  action: z.discriminatedUnion("kind", [
    z.object({ kind: z.literal("move"), x: field, y: field }),
    z.object({ kind: z.literal("interact"), targetId: z.enum(["terminal", "shortcut"]) }),
    z.object({ kind: z.literal("extract") }),
    z.object({ kind: z.literal("shoot"), targetId: z.string().regex(/^[a-z0-9-]{1,24}$/) }),
    z.object({ kind: z.literal("reload") }),
    z.object({ kind: z.literal("ready") }),
  ]),
});

export const lobbySchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("preset"), preset: z.enum(["rifle", "sidearm"]) }),
  z.object({ kind: z.literal("bereit"), ready: z.boolean() }),
  z.object({ kind: z.literal("start") }),
]);

export type CommandMessage = z.infer<typeof commandSchema>;
export type LobbyMessage = z.infer<typeof lobbySchema>;

export function parseCommand(payload: unknown): { ok: true; command: CommandMessage } | { ok: false; rejection: string } {
  if (!fits(payload)) return { ok: false, rejection: "Befehl ist zu groß." };
  const parsed = commandSchema.safeParse(payload);
  if (!parsed.success) return { ok: false, rejection: "Befehl ist ungültig." };
  return { ok: true, command: parsed.data };
}

export function parseLobby(payload: unknown): { ok: true; message: LobbyMessage } | { ok: false; rejection: string } {
  if (!fits(payload)) return { ok: false, rejection: "Befehl ist zu groß." };
  const parsed = lobbySchema.safeParse(payload);
  if (!parsed.success) return { ok: false, rejection: "Befehl ist ungültig." };
  return { ok: true, message: parsed.data };
}

function fits(payload: unknown): boolean {
  try {
    return JSON.stringify(payload).length <= 2048;
  } catch {
    return false;
  }
}
