import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const file = fileURLToPath(new URL("../../assets/specs/weapons/classification.json", import.meta.url));
const data = JSON.parse(await readFile(file, "utf8"));

assert.equal(data.schemaVersion, 1);
assert.equal(data.id, "waffen-klassifikation");
assert.equal(data.grenzen.aendertKampfwerte, false);
assert.deepEqual(data.laengen, ["kurz", "lang"]);
assert.ok(data.quellen.some((source) => source.art === "wiki" && source.giltAlsRegel === false));

const slotIds = data.slots.map((slot) => slot.id);
assert.equal(new Set(slotIds).size, slotIds.length);
const slotById = new Map(data.slots.map((slot) => [slot.id, slot]));

const partIds = data.teilfamilien.map((part) => part.id);
assert.equal(new Set(partIds).size, partIds.length);
const partById = new Map(data.teilfamilien.map((part) => [part.id, part]));

const familyIds = data.familien.map((family) => family.id);
assert.equal(new Set(familyIds).size, familyIds.length);
const familyById = new Map(data.familien.map((family) => [family.id, family]));

const referenced = new Map(partIds.map((id) => [id, new Set()]));
const fertigPrefixes = [];

for (const family of data.familien) {
  assert.ok(["sidearm", "rifle", "keine"].includes(family.kampfIdHeute), family.id);
  assert.ok(data.laengen.includes(family.laenge), family.id);
  assert.ok(data.kaliberklassen.includes(family.kaliberklasse), family.id);
  assert.equal(family.kampfIdHeute === "rifle" || family.kampfIdHeute === "sidearm" || family.kampfIdHeute === "keine", true);
  const used = new Set();
  let munition = null;
  const accepted = new Set();
  for (const use of family.slots) {
    assert.ok(slotById.has(use.id), `${family.id} referenziert unbekannten Slot ${use.id}`);
    assert.equal(used.has(use.id), false, `${family.id} doppelt ${use.id}`);
    used.add(use.id);
    assert.ok(use.teilfamilien.length > 0);
    for (const partId of use.teilfamilien) {
      assert.equal(accepted.has(partId), false);
      accepted.add(partId);
      const part = partById.get(partId);
      assert.ok(part, `${family.id} referenziert unbekannte Teilfamilie ${partId}`);
      assert.equal(part.slot, use.id);
      assert.ok(slotById.get(use.id).teilfamilien.includes(partId));
      referenced.get(partId).add(family.id);
    }
    if (use.id === "munition") munition = use;
  }
  assert.ok(munition, `${family.id} hat keine Munitionsart`);
  assert.deepEqual(munition.teilfamilien, [family.munition]);
  const ammo = partById.get(family.munition);
  assert.equal(ammo.slot, "munition");
  assert.equal(ammo.kaliberklasse, family.kaliberklasse);

  if (family.laenge === "kurz") {
    const unterlauf = family.slots.find((slot) => slot.id === "unterlauf");
    for (const partId of unterlauf?.teilfamilien ?? []) assert.equal(partById.get(partId).laenge, "kurz");
  }

  assert.deepEqual(Object.keys(family.fertigBeispiele).sort(), [...family.fertigPraefixe].sort());
  for (const prefix of family.fertigPraefixe) {
    fertigPrefixes.push(prefix);
    const names = family.fertigBeispiele[prefix];
    assert.ok(names.length >= 1 && names.length <= 3);
    for (const name of names) {
      const stem = name.replace(/\.blend$/, "");
      const matches = Object.keys(data.dateifund.fertig).filter((key) => stem.startsWith(key));
      const longest = matches.sort((left, right) => right.length - left.length)[0];
      assert.equal(longest, prefix, name);
    }
  }

  for (const variant of family.varianten ?? []) {
    assert.ok(data.laengen.includes(variant.laenge));
    for (const name of variant.beispiele) {
      assert.ok(family.fertigPraefixe.some((prefix) => name.startsWith(prefix)));
    }
    for (const partId of variant.ohneTeilfamilien ?? []) assert.ok(accepted.has(partId));
    if (variant.laenge === "kurz" && used.has("unterlauf")) {
      assert.deepEqual(variant.erlaubteUnterlaufLaengen, ["kurz"]);
    }
  }
}

for (const part of data.teilfamilien) {
  assert.ok(slotById.has(part.slot), part.id);
  assert.deepEqual([...referenced.get(part.id)].sort(), [...part.waffenarten].sort(), part.id);
  if (part.slot === "munition") {
    assert.deepEqual(part.praefixe, []);
    assert.ok(data.kaliberklassen.includes(part.kaliberklasse));
    for (const weaponId of part.waffenarten) {
      const family = familyById.get(weaponId);
      assert.equal(family.munition, part.id);
      assert.equal(family.kaliberklasse, part.kaliberklasse);
    }
  } else {
    assert.ok(part.praefixe.length > 0, part.id);
  }
  if (part.slot === "muendung") {
    assert.ok(part.waffenarten.length > 0, `${part.id} ohne Waffenart`);
    assert.ok(part.kaliberklassen.length > 0, `${part.id} ohne Kaliberklasse`);
    const pairedWeapons = part.passung.map((pair) => pair.waffenart);
    assert.equal(new Set(pairedWeapons).size, pairedWeapons.length);
    assert.deepEqual([...pairedWeapons].sort(), [...part.waffenarten].sort());
    for (const pair of part.passung) {
      assert.equal(pair.kaliberklasse, familyById.get(pair.waffenart).kaliberklasse);
      assert.ok(part.kaliberklassen.includes(pair.kaliberklasse));
    }
    assert.deepEqual([...new Set(part.passung.map((pair) => pair.kaliberklasse))].sort(), [...part.kaliberklassen].sort());
  }
  if (part.slot === "unterlauf") {
    assert.ok(part.laenge === "kurz" || part.laenge === "lang", part.id);
    if (part.laenge === "lang") {
      for (const weaponId of part.waffenarten) assert.equal(familyById.get(weaponId).laenge, "lang", part.id);
    }
  }
  for (const prefix of part.praefixe) {
    assert.ok(["fertig", "modular", "zubehoer"].includes(prefix.ordner));
    assert.ok(prefix.beispiele.length >= 1 && prefix.beispiele.length <= 3);
    for (const name of prefix.beispiele) {
      assert.equal(name.endsWith(".blend"), true);
      assert.equal(name.startsWith(prefix.praefix), true, name);
    }
  }
}

for (const slot of data.slots) {
  const found = data.teilfamilien.filter((part) => part.slot === slot.id).map((part) => part.id).sort();
  assert.deepEqual([...slot.teilfamilien].sort(), found, slot.id);
  assert.equal(typeof slot.leerErlaubt, "boolean");
  if (slot.id === "unterlauf") assert.deepEqual(slot.laengen, ["kurz", "lang"]);
}

const ruleIds = data.kompatibilitaet.map((rule) => rule.id);
assert.deepEqual(ruleIds.sort(), ["eine-unterseite", "muendung-nach-art-und-kaliber", "munition-an-familie", "unterlauf-nicht-laenger-als-waffe"]);
for (const rule of data.kompatibilitaet) {
  for (const slotId of rule.slots ?? []) assert.ok(slotById.has(slotId), rule.id);
}

function sum(record) {
  return Object.values(record).reduce((total, count) => total + count, 0);
}
assert.equal(sum(data.dateifund.fertig), 57);
assert.equal(sum(data.dateifund.modular), 58);
assert.equal(sum(data.dateifund.zubehoer), 15);
assert.equal(data.dateifund.lizenzdatei, false);
assert.equal(data.dateifund.nahkampfdatei, false);
assert.deepEqual(fertigPrefixes.sort(), Object.keys(data.dateifund.fertig).sort());
assert.equal(new Set(fertigPrefixes).size, fertigPrefixes.length);

for (const [folder, counts] of [["modular", data.dateifund.modular], ["zubehoer", data.dateifund.zubehoer]]) {
  for (const key of Object.keys(counts)) {
    const hit = data.teilfamilien.some((part) => part.praefixe.some((prefix) => prefix.ordner === folder && prefix.praefix.startsWith(key)));
    assert.equal(hit, true, `${folder}/${key}`);
  }
}

console.log(JSON.stringify({
  ok: true,
  datei: "assets/specs/weapons/classification.json",
  familien: data.familien.map((family) => ({ id: family.id, munition: family.munition, slots: family.slots.map((slot) => slot.id) })),
}, null, 2));
