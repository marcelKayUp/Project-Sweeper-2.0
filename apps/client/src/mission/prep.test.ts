import assert from "node:assert/strict";
import test from "node:test";
import { helpSections, timeWish } from "./helpCopy.ts";
import { defaultPreferences, preferenceMarks, readPreferences, writePreferences, type PreferenceStore } from "./preferences.ts";

function memory(): PreferenceStore & { readonly saved: Map<string, string> } {
  const saved = new Map<string, string>();
  return {
    saved,
    getItem: (key) => saved.get(key) ?? null,
    setItem: (key, value) => {
      saved.set(key, value);
    },
  };
}

test("Skalierung bleibt im Speicher und wirkt nicht auf AP oder Frist", () => {
  const store = memory();
  const written = writePreferences(store, { scale: 125, contrast: true, reduceMotion: true });
  assert.deepEqual(readPreferences(store), written);
  assert.deepEqual(preferenceMarks(written), { "data-scale": "125", "data-contrast": "1", "data-motion": "reduce" });
  const raw = store.saved.get("neon-ui") ?? "";
  assert.equal(raw.includes("ap"), false);
  assert.equal(raw.includes("phase"), false);
  assert.deepEqual(readPreferences(memory()), defaultPreferences);
  assert.deepEqual(readPreferences({ getItem: () => "{", setItem: () => undefined }), defaultPreferences);
  assert.equal(preferenceMarks(defaultPreferences)["data-scale"], "100");
});

test("Hilfe nennt den Siegweg und keine versteckte Gegnerkarte", () => {
  const text = helpSections.map((section) => `${section.title} ${section.body}`).join(" ");
  assert.equal(text.includes("Terminal"), true);
  assert.equal(text.includes("4 AP"), true);
  assert.equal(text.includes("halten die Frist nicht an"), true);
  assert.equal(text.includes("wache"), false);
  assert.equal(text.toLowerCase().includes("seed"), false);
  assert.deepEqual(timeWish(60), { kind: "zeit", seconds: 60 });
  assert.deepEqual([timeWish(90).seconds, timeWish(120).seconds], [90, 120]);
});
