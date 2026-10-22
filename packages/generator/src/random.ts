import { STAGE_VERSIONS, type GeneratorConfig } from "./types.ts";

export function canonical(value: unknown): string {
  if (value === null || typeof value === "string" || typeof value === "boolean" || typeof value === "number" && Number.isFinite(value)) return JSON.stringify(value);
  if (typeof value !== "object") throw new Error("Nur endliche JSON-Werte sind kanonisch serialisierbar");
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${canonical(record[key])}`).join(",")}}`;
}

export async function contentHash(value: unknown): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(canonical(value)));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

// FNV-1a seed derivation v1, xorshift32 v1; independent of combat/bot RNG.
export function deriveSeed(config: GeneratorConfig, stage: keyof typeof STAGE_VERSIONS, attempt: number): number {
  const { maxAttempts: _budget, condition, ...structuralInputs } = config;
  const contentInputs = stage === "dressing" ? { ...structuralInputs, condition } : structuralInputs;
  // Global metadata/catalog versions and unrelated stage versions do not perturb this stream.
  const text = canonical(["seed-derivation/1", contentInputs, stage, STAGE_VERSIONS[stage], attempt]);
  let value = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) value = Math.imul(value ^ text.charCodeAt(i), 0x01000193) >>> 0;
  return value || 0x6d2b79f5;
}

export function random(seed: number) {
  let state = seed >>> 0 || 1;
  return {
    int(limit: number): number {
      if (!Number.isInteger(limit) || limit < 1 || limit > 0xffffffff) throw new Error("Ungültiges Zufallsbudget");
      state ^= state << 13;
      state ^= state >>> 17;
      state ^= state << 5;
      // Fixed one-draw bounded choice; slight modulo bias is acceptable for layout variation.
      return (state >>> 0) % limit;
    },
    shuffle<T>(items: readonly T[]): T[] {
      const result = [...items];
      for (let i = result.length - 1; i > 0; i -= 1) {
        const j = this.int(i + 1);
        [result[i], result[j]] = [result[j]!, result[i]!];
      }
      return result;
    },
  };
}

export function freeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    for (const item of Object.values(value)) freeze(item);
    Object.freeze(value);
  }
  return value;
}
