export const RNG_VERSION = 1 as const;

export type RngStream = "combat" | "bot";

export interface RngState {
  readonly version: typeof RNG_VERSION;
  readonly stream: RngStream;
  readonly state: number;
}

const SALT: Readonly<Record<RngStream, number>> = {
  combat: 0xc0ba7001,
  bot: 0xb0700001,
};

const PERCENT_LIMIT = 4_294_967_200;

export function createRng(seed: number, stream: RngStream): RngState {
  if (!Number.isInteger(seed)) throw new Error("Seed muss ganzzahlig sein");
  if (stream !== "combat" && stream !== "bot") throw new Error("RNG-Stream ist ungültig");
  return { version: RNG_VERSION, stream, state: mixSeed(seed, stream) };
}

export function nextUint32(rng: RngState): { readonly value: number; readonly rng: RngState } {
  assertRng(rng);
  const value = step(rng.state);
  return { value, rng: { version: RNG_VERSION, stream: rng.stream, state: value } };
}

export function rollPercent(rng: RngState): { readonly roll: number; readonly rng: RngState } {
  assertRng(rng);
  let current = rng;
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const next = nextUint32(current);
    current = next.rng;
    if (next.value < PERCENT_LIMIT) return { roll: next.value % 100, rng: current };
  }
  throw new Error("Kampf-RNG liefert keinen Prozentwert");
}

function mixSeed(seed: number, stream: RngStream): number {
  let x = (seed + SALT[stream]) >>> 0;
  x = Math.imul(x ^ (x >>> 16), 0x85ebca6b) >>> 0;
  x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35) >>> 0;
  x = (x ^ (x >>> 16)) >>> 0;
  return x === 0 ? 0x6d2b79f5 : x;
}

function step(state: number): number {
  let x = state >>> 0;
  x = (x ^ (x << 13)) >>> 0;
  x = (x ^ (x >>> 17)) >>> 0;
  x = (x ^ (x << 5)) >>> 0;
  return x === 0 ? 0x6d2b79f5 : x;
}

function assertRng(rng: RngState): void {
  if (rng.version !== RNG_VERSION) throw new Error("RNG-Version ist ungültig");
  if (rng.stream !== "combat" && rng.stream !== "bot") throw new Error("RNG-Stream ist ungültig");
  if (!Number.isInteger(rng.state) || rng.state <= 0 || rng.state > 0xffffffff) {
    throw new Error("RNG-Zustand ist ungültig");
  }
}
