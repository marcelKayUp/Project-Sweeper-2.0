import assert from "node:assert/strict";
import test from "node:test";
import { entryHrefAllowed, entryStops, playerStops, techStops } from "./sitemap.ts";

test("jede vorhandene Fläche hat einen erlaubten Sprung, geplante haben keinen", () => {
  for (const stop of entryStops()) {
    if (stop.mark === "vorhanden") {
      assert.equal(typeof stop.href, "string");
      assert.equal(entryHrefAllowed(stop.href ?? ""), true);
    } else {
      assert.equal(stop.href, undefined);
    }
  }
});

test("der Spielerweg folgt der Sitemap und die Technikstücke bleiben daneben", () => {
  assert.deepEqual(
    playerStops.map((stop) => stop.id),
    ["zugang", "editor", "stadt", "auswahl", "lobby", "inventar", "level", "mission", "erfolg", "abbruch", "fehlschlag", "auswertung", "einstellungen"],
  );
  assert.deepEqual(
    techStops.map((stop) => stop.id),
    ["sicht", "raster", "deckung", "aktionspunkte", "schuss", "figuren", "generator", "terminals"],
  );
});
