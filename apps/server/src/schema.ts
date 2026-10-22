import { schema, t, type SchemaType } from "@colyseus/schema";

export const MissionSync = schema(
  {
    roomPhase: t.string().default("lobby"),
    round: t.number().default(1),
    phase: t.string().default("crew"),
    revision: t.number().default(0),
    copies: t.number().default(0),
    doorOpen: t.boolean().default(false),
    outcome: t.string().default(""),
    reason: t.string().default(""),
    resultRound: t.number().default(0),
    notice: t.string().default(""),
    ack: t.number().default(0),
    phaseSeconds: t.number().default(90),
    configRevision: t.number().default(1),
  },
  "MissionSync",
);

export type MissionSync = SchemaType<typeof MissionSync>;

export const RasterSync = schema(
  {
    revision: t.number().default(0),
    x: t.number().default(1),
    y: t.number().default(1),
    ap: t.number().default(8),
    round: t.number().default(1),
    notice: t.string().default(""),
    ack: t.number().default(0),
  },
  "RasterSync",
);

export type RasterSync = SchemaType<typeof RasterSync>;

export const SichtSync = schema(
  {
    revision: t.number().default(0),
    round: t.number().default(1),
    phase: t.string().default("crew"),
    copies: t.number().default(0),
    outcome: t.string().default(""),
    notice: t.string().default(""),
    ack: t.number().default(0),
  },
  "SichtSync",
);

export type SichtSync = SchemaType<typeof SichtSync>;
