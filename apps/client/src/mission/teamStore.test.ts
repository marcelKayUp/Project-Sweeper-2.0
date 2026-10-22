import assert from "node:assert/strict";
import test from "node:test";
import { createTeamFeed, takeBatch, takeSnapshot } from "./teamStore.ts";

const crew = [
  { id: "kite", hp: 6 },
  { id: "voss", hp: 6 },
];

test("zwei Stände behalten den Runner und ersetzen nur die erlaubte Sicht", () => {
  const first = takeSnapshot(createTeamFeed(), { revision: 1, lastEventId: 0, ownRunnerId: "kite", units: crew });
  const moved = takeSnapshot(first, {
    revision: 2,
    lastEventId: 1,
    ownRunnerId: "kite",
    units: [{ id: "kite", hp: 6 }, { id: "voss", hp: 4 }],
  });
  assert.equal(moved.ownRunnerId, "kite");
  assert.equal(moved.units[1]?.hp, 4);
  assert.equal(moved.gap, false);
  assert.deepEqual(moved.animations, []);
});

test("eine Lücke wird erkannt und der Snapshot korrigiert die Anzeige ohne die Ereignisse anzuwenden", () => {
  let feed = takeSnapshot(createTeamFeed(), { revision: 1, lastEventId: 1, ownRunnerId: "kite", units: crew });
  feed = takeBatch(feed, { fromId: 2, toId: 2, targetRevision: 2, events: [{ id: 2 }] });
  assert.equal(feed.gap, false);
  assert.deepEqual(feed.animations.map((event) => event.id), [2]);
  assert.equal(feed.units[1]?.hp, 6);

  const duplicate = takeBatch(feed, { fromId: 2, toId: 2, targetRevision: 2, events: [{ id: 2 }] });
  assert.equal(duplicate.animations.length, 1);
  assert.equal(duplicate.lastEventId, 2);

  const gapped = takeBatch(feed, { fromId: 4, toId: 4, targetRevision: 4, events: [{ id: 4 }] });
  assert.equal(gapped.gap, true);
  assert.equal(gapped.lastEventId, 2);
  assert.deepEqual(gapped.animations, []);
  assert.equal(gapped.units, feed.units);

  const repaired = takeSnapshot(gapped, {
    revision: 4,
    lastEventId: 4,
    ownRunnerId: "kite",
    units: [{ id: "kite", hp: 6 }, { id: "voss", hp: 2 }],
  });
  assert.equal(repaired.gap, false);
  assert.equal(repaired.ownRunnerId, "kite");
  assert.equal(repaired.lastEventId, 4);
  assert.equal(repaired.units[1]?.hp, 2);
  assert.deepEqual(repaired.animations, []);
});
