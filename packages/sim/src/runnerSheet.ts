export const ATTRIBUTE_IDS = ["physisch", "sozial", "mental"] as const;
export type AttributeId = (typeof ATTRIBUTE_IDS)[number];
export const SKILL_IDS = ["fertigkeit-1", "fertigkeit-2", "fertigkeit-3"] as const;
export type SkillId = (typeof SKILL_IDS)[number];

export const ATTRIBUTE_POOL = 9;
export const ATTRIBUTE_MIN = 1;
export const ATTRIBUTE_MAX = 5;
export const SKILL_POOL = 3;
export const SKILL_MIN = 0;
export const SKILL_MAX = 3;

export interface RunnerSheet {
  readonly attribute: Readonly<Record<AttributeId, number>>;
  readonly fertigkeiten: Readonly<Record<SkillId, number>>;
}

export function balancedSheet(): RunnerSheet {
  return {
    attribute: { physisch: 3, sozial: 3, mental: 3 },
    fertigkeiten: { "fertigkeit-1": 1, "fertigkeit-2": 1, "fertigkeit-3": 1 },
  };
}

export function validateRunnerSheet(input: unknown): { readonly ok: true; readonly value: RunnerSheet } | { readonly ok: false } {
  const body = record(input);
  if (!body || !exactKeys(body, ["attribute", "fertigkeiten"])) return { ok: false };
  const attribute = readGroup(body.attribute, ATTRIBUTE_IDS, ATTRIBUTE_MIN, ATTRIBUTE_MAX, ATTRIBUTE_POOL);
  const fertigkeiten = readGroup(body.fertigkeiten, SKILL_IDS, SKILL_MIN, SKILL_MAX, SKILL_POOL);
  if (!attribute || !fertigkeiten) return { ok: false };
  return { ok: true, value: { attribute, fertigkeiten } };
}

function readGroup<T extends string>(value: unknown, ids: readonly T[], min: number, max: number, pool: number): Readonly<Record<T, number>> | null {
  const body = record(value);
  if (!body || !exactKeys(body, ids)) return null;
  const next = {} as Record<T, number>;
  let sum = 0;
  for (const id of ids) {
    const amount = body[id];
    if (typeof amount !== "number" || !Number.isInteger(amount) || amount < min || amount > max) return null;
    next[id] = amount;
    sum += amount;
  }
  if (sum !== pool) return null;
  return next;
}

function record(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function exactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const own = Object.keys(value);
  if (own.length !== keys.length) return false;
  return keys.every((key) => Object.prototype.hasOwnProperty.call(value, key));
}
