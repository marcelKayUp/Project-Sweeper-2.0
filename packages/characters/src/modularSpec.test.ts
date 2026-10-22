import { describe, expect, it } from "vitest";
import { createModularCharacterSpec, getModularLibrary, MODULAR_FEMALE_SOURCE_ID, MODULAR_SOURCE_ID, MODULAR_SLOTS, MODULAR_VARIANTS, modularPartName, randomizeModularCharacterSpec, validateModularCharacterSpec } from "./modularSpec.ts";

describe("modular source recipes", () => {
  it("preserves original colors by default and round-trips without sharing mutable fields", () => {
    const spec = createModularCharacterSpec(42);
    const checked = validateModularCharacterSpec(spec);
    expect(checked.ok).toBe(true);
    if (!checked.ok) return;
    expect(checked.value).toEqual(spec);
    expect(checked.value.parts).not.toBe(spec.parts);
    expect(checked.value.palette).not.toBe(spec.palette);
    expect(Object.values(spec.palette)).toEqual([null, null, null, null, null]);
    expect(validateModularCharacterSpec(JSON.parse(JSON.stringify(spec)))).toEqual(checked);
  });

  it("keeps artist object names, including the exceptional Farmer pants", () => {
    const names = MODULAR_VARIANTS.flatMap(variant => MODULAR_SLOTS.map(slot => modularPartName(slot, variant)));
    expect(new Set(names).size).toBe(44);
    expect(modularPartName("legs", "Farmer")).toBe("Farmer_Pants");
    expect(modularPartName("head", "Casual2")).toBe("Casual2_Head");
  });

  it("produces deterministic valid mixed outfits for boundary seeds", () => {
    for (const seed of [0, 1, 42, 1234567, 0xffffffff]) {
      const spec = randomizeModularCharacterSpec(seed);
      expect(spec).toEqual(randomizeModularCharacterSpec(seed));
      expect(validateModularCharacterSpec(spec).ok).toBe(true);
    }
    expect(randomizeModularCharacterSpec(1).parts).not.toEqual(randomizeModularCharacterSpec(42).parts);
    expect(() => randomizeModularCharacterSpec(-1)).toThrow();
    expect(() => createModularCharacterSpec(2 ** 32)).toThrow();
  });

  it("rejects foreign assets, malformed nested data and unsafe inputs before replacement", () => {
    const base = createModularCharacterSpec();
    for (const change of [
      { schemaVersion: 1 }, { source: "https://example.org/arbitrary.glb" }, { id: "../outside" },
      { stature: Number.NaN }, { seed: 1.5 }, { equipment: "horse" },
      { parts: { ...base.parts, head: "unknown" } }, { parts: { head: "Casual2" } },
      { parts: { ...base.parts, url: "evil" } },
      { palette: { ...base.palette, skin: "red" } }, { palette: {} }, { assetUrl: "evil" },
    ]) expect(validateModularCharacterSpec({ ...base, ...change }).ok).toBe(false);
    expect(validateModularCharacterSpec(null).ok).toBe(false);
    expect(validateModularCharacterSpec({ ...base, id: "ä".repeat(18000) }).ok).toBe(false);
    const circular: Record<string, unknown> = { ...base }; circular.self = circular;
    expect(validateModularCharacterSpec(circular).ok).toBe(false);
    expect(base.parts.head).toBe("Casual2");
  });

  it("canonicalizes valid palette overrides without altering the submitted recipe", () => {
    const input = { ...createModularCharacterSpec(), palette: { skin: "#aabbcc", hair: null, cloth: null, armor: null, accent: "#123abc" } };
    const result = validateModularCharacterSpec(input);
    expect(result.ok && result.value.palette.skin).toBe("#AABBCC");
    expect(result.ok && result.value.palette.accent).toBe("#123ABC");
    expect(input.palette.skin).toBe("#aabbcc");
  });

  it("keeps existing version-2 male recipes compatible and persists the female source", () => {
    const male = createModularCharacterSpec(42, "Casual2");
    expect(male.source).toBe(MODULAR_SOURCE_ID);
    const female = createModularCharacterSpec(42, undefined, MODULAR_FEMALE_SOURCE_ID);
    expect(female.parts).toEqual({ head: "Casual", body: "Casual", legs: "Casual", feet: "Casual" });
    const roundtrip = validateModularCharacterSpec(JSON.parse(JSON.stringify(female)));
    expect(roundtrip).toEqual({ ok: true, value: female });
    expect(validateModularCharacterSpec(JSON.parse(JSON.stringify(male)))).toEqual({ ok: true, value: male });
    expect(modularPartName("head", "Formal", MODULAR_FEMALE_SOURCE_ID)).toBe("Formad_Head");
  });

  it("rejects cross-library parts and unsupported equipment instead of mixing rigs", () => {
    const female = createModularCharacterSpec(42, "Soldier", MODULAR_FEMALE_SOURCE_ID);
    expect(validateModularCharacterSpec({ ...female, parts: { ...female.parts, head: "King" } }).ok).toBe(false);
    expect(validateModularCharacterSpec({ ...female, equipment: "backpack" }).ok).toBe(false);
    expect(validateModularCharacterSpec({ ...female, equipment: "pistol" }).ok).toBe(true);
    expect(validateModularCharacterSpec({ ...female, source: MODULAR_SOURCE_ID }).ok).toBe(false);
    expect(() => createModularCharacterSpec(42, "Casual2", MODULAR_FEMALE_SOURCE_ID)).toThrow();
    expect(() => createModularCharacterSpec(42, "Witch", MODULAR_SOURCE_ID)).toThrow();
  });

  it("randomizes within the selected source's own available slots", () => {
    const library = getModularLibrary(MODULAR_FEMALE_SOURCE_ID);
    expect(library.variants).toHaveLength(10);
    for (const seed of [0, 1, 42, 0xffffffff]) {
      const spec = randomizeModularCharacterSpec(seed, MODULAR_FEMALE_SOURCE_ID);
      expect(spec).toEqual(randomizeModularCharacterSpec(seed, MODULAR_FEMALE_SOURCE_ID));
      expect(validateModularCharacterSpec(spec).ok).toBe(true);
      expect(Object.values(spec.parts).every(part => library.variants.includes(part))).toBe(true);
    }
  });
});
