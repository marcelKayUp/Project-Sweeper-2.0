import { describe, expect, it } from "vitest";
import {
  applyMissionResult,
  bookingFromMission,
  createCampaign,
  fieldRejection,
  freezeLoadout,
  gearOffer,
  LOADOUT_MAGAZINES,
  LOADOUT_MEDKITS,
  moveGear,
  readCampaign,
  releaseFreeze,
  RUNNER_IDS,
  type CampaignState,
  type MissionBooking,
  type RunnerReturn,
} from "./campaign.ts";
import { ghostFloorSpec } from "./ghostFloor.ts";
import { applyCommand, createMissionState, RESERVE_MAGAZINES, type WeaponId } from "./mission.ts";
import { RIFLE_MAGAZINE } from "./resolve.ts";

const rifles = RUNNER_IDS.map((runnerId) => ({ runnerId, weapon: "rifle" as const }));

function end(runnerId: string, patch: Partial<RunnerReturn> = {}): RunnerReturn {
  return {
    runnerId,
    weapon: "rifle",
    magazine: RIFLE_MAGAZINE,
    magazineSize: RIFLE_MAGAZINE,
    reserveMagazines: RESERVE_MAGAZINES,
    overwatch: false,
    medkits: LOADOUT_MEDKITS,
    ...patch,
  };
}

function booking(resultId: string, runners: readonly RunnerReturn[]): MissionBooking {
  return {
    resultId,
    missionId: "ghost-floor",
    seed: 1,
    outcome: "niederlage",
    reason: "keine-handlungsfaehigen",
    round: 1,
    runners,
  };
}

function defeat(weapon: WeaponId = "rifle"): CampaignState {
  let mission = createMissionState(
    ghostFloorSpec({ kite: weapon, voss: weapon, nera: weapon, sol: weapon }),
    1,
  );
  mission = applyCommand(mission, ghostFloorSpec({ kite: weapon, voss: weapon, nera: weapon, sol: weapon }), {
    kind: "move",
    unitId: "kite",
    x: 0,
    y: 9,
  }).state;
  mission = applyCommand(mission, ghostFloorSpec({ kite: weapon, voss: weapon, nera: weapon, sol: weapon }), {
    kind: "extract",
    unitId: "kite",
  }).state;
  mission = applyCommand(mission, ghostFloorSpec({ kite: weapon, voss: weapon, nera: weapon, sol: weapon }), {
    kind: "extract",
    unitId: "voss",
  }).state;
  mission = applyCommand(mission, ghostFloorSpec({ kite: weapon, voss: weapon, nera: weapon, sol: weapon }), {
    kind: "move",
    unitId: "nera",
    x: 0,
    y: 10,
  }).state;
  mission = applyCommand(mission, ghostFloorSpec({ kite: weapon, voss: weapon, nera: weapon, sol: weapon }), {
    kind: "extract",
    unitId: "nera",
  }).state;
  mission = applyCommand(mission, ghostFloorSpec({ kite: weapon, voss: weapon, nera: weapon, sol: weapon }), {
    kind: "move",
    unitId: "sol",
    x: 0,
    y: 11,
  }).state;
  mission = applyCommand(mission, ghostFloorSpec({ kite: weapon, voss: weapon, nera: weapon, sol: weapon }), {
    kind: "extract",
    unitId: "sol",
  }).state;
  const frozen = freezeLoadout(createCampaign(), RUNNER_IDS.map((runnerId) => ({ runnerId, weapon })), 1);
  if (!frozen.ok || !frozen.state.freeze) throw new Error("Freeze fehlt.");
  const payload = bookingFromMission(mission, frozen.state.freeze.resultId);
  if (!payload || !mission.result) throw new Error("Buchung fehlt.");
  const booked = applyMissionResult(frozen.state, payload);
  if (!booked.ok) throw new Error(booked.rejection);
  return booked.state;
}

describe("Kampagnenbuchung", () => {
  it("friert nur vorhandene Ausrüstung ein und lässt die Eingabe unverändert", () => {
    const campaign = createCampaign();
    const before = JSON.stringify(campaign);
    const choices = JSON.stringify(rifles);
    const missing = freezeLoadout(campaign, [{ runnerId: "kite", weapon: "rifle" }], 1);
    expect(missing).toMatchObject({ ok: false, rejection: "Einsatz ist ungültig." });
    expect(missing.state).toBe(campaign);

    const frozen = freezeLoadout(campaign, rifles, 1);
    expect(frozen.ok).toBe(true);
    if (!frozen.ok || !frozen.state.freeze) return;
    expect(JSON.stringify(campaign)).toBe(before);
    expect(JSON.stringify(rifles)).toBe(choices);
    expect(frozen.state.revision).toBe(1);
    expect(frozen.state.freeze.resultId).toBe("ghost-floor-1");
    expect(frozen.state.runners.kite).toMatchObject({ rifle: 0, rifleMagazines: 0, medkits: 0, sidearm: 1, sidearmMagazines: LOADOUT_MAGAZINES });
    expect(frozen.state.lager).toBe(campaign.lager);
    expect(frozen.state.progress.bookedResults).toBe(0);
    expect(gearOffer(frozen.state, "kite").rifleReady).toBe(false);
    expect(fieldRejection(frozen.state, "voss", "sidearm")).toBe("Ein Einsatz ist bereits eingefroren.");

    const again = freezeLoadout(frozen.state, rifles, 1);
    expect(again).toMatchObject({ ok: false, rejection: "Ein Einsatz ist bereits eingefroren." });
    expect(again.state).toBe(frozen.state);
  });

  it("verbucht ein Missionsergebnis genau einmal und schreibt Verbrauch plus Fortschritt", () => {
    const campaign = createCampaign();
    const frozen = freezeLoadout(campaign, rifles, 1);
    if (!frozen.ok || !frozen.state.freeze) throw new Error("Freeze fehlt.");
    const payload = booking(frozen.state.freeze.resultId, [
      end("kite", { magazine: 0, reserveMagazines: 1, medkits: 0 }),
      end("voss"),
      end("nera", { magazine: 0, overwatch: true }),
      end("sol", { reserveMagazines: 1 }),
    ]);
    const booked = applyMissionResult(frozen.state, payload);
    expect(booked.ok).toBe(true);
    if (!booked.ok) return;
    expect(booked.state.freeze).toBeNull();
    expect(booked.state.booked).toEqual(["ghost-floor-1"]);
    expect(booked.state.progress).toMatchObject({
      bookedResults: 1,
      lastResultId: "ghost-floor-1",
      lastOutcome: "niederlage",
      lastReason: "keine-handlungsfaehigen",
      lastRound: 1,
    });
    expect(booked.state.runners.kite).toMatchObject({ rifle: 1, rifleMagazines: 1, medkits: 0 });
    expect(booked.state.lager).toBe(frozen.state.lager);
    expect(booked.state.runners.voss).toMatchObject({ rifleMagazines: LOADOUT_MAGAZINES, medkits: 1 });
    expect(booked.state.runners.nera.rifleMagazines).toBe(LOADOUT_MAGAZINES);
    expect(booked.state.runners.sol.rifleMagazines).toBe(LOADOUT_MAGAZINES - 1);
    expect(booked.state.progress.lines.map((line) => [line.runnerId, line.spentMagazines, line.spentMedkits])).toEqual([
      ["kite", 2, 1],
      ["voss", 0, 0],
      ["nera", 0, 0],
      ["sol", 1, 0],
    ]);

    const duplicate = applyMissionResult(booked.state, {
      ...payload,
      outcome: "sieg",
      runners: payload.runners.map((runner) => ({ ...runner, medkits: 1, magazine: RIFLE_MAGAZINE, reserveMagazines: RESERVE_MAGAZINES })),
    });
    expect(duplicate).toMatchObject({ ok: false, rejection: "Ergebnis ist bereits verbucht." });
    expect(duplicate.state).toBe(booked.state);
    expect(booked.state.runners.kite.medkits).toBe(0);
    expect(booked.state.progress.bookedResults).toBe(1);

    const blocked = freezeLoadout(
      booked.state,
      RUNNER_IDS.map((runnerId) => ({ runnerId, weapon: "rifle" as const })),
      1,
    );
    expect(blocked).toMatchObject({ ok: false, rejection: "Ausrüstung fehlt." });
    expect(blocked.state).toBe(booked.state);
    expect(gearOffer(booked.state, "kite")).toMatchObject({ rifleReady: false, sidearmReady: false, medkits: 0 });
    expect(gearOffer(booked.state, "voss").rifleReady).toBe(true);
  });

  it("gibt ein abgebrochenes Freeze vollständig zurück und legt nichts doppelt an", () => {
    const campaign = createCampaign();
    const frozen = freezeLoadout(campaign, rifles, 1);
    if (!frozen.ok) throw new Error("Freeze fehlt.");
    const released = releaseFreeze(frozen.state, "ghost-floor-1");
    expect(released.released).toBe(true);
    expect(released.state.freeze).toBeNull();
    expect(released.state.progress.bookedResults).toBe(0);
    expect(released.state.runners).toEqual(campaign.runners);
    const second = releaseFreeze(released.state, "ghost-floor-1");
    expect(second.released).toBe(false);
    expect(second.state).toBe(released.state);
    const foreign = releaseFreeze(frozen.state, "ghost-floor-2");
    expect(foreign.released).toBe(false);
    expect(foreign.state).toBe(frozen.state);
  });

  it("übernimmt einen echten Einsatzabschluss ohne zusätzlichen Bestand", () => {
    const campaign = createCampaign();
    const booked = defeat("rifle");
    expect(booked.runners).toEqual(campaign.runners);
    expect(booked.progress.bookedResults).toBe(1);
    expect(booked.progress.lastOutcome).toBe("niederlage");
    expect(booked.progress.lines.every((line) => line.spentMagazines === 0 && line.spentMedkits === 0)).toBe(true);
    const repeat = applyMissionResult(booked, {
      resultId: "ghost-floor-1",
      missionId: "ghost-floor",
      seed: 1,
      outcome: "sieg",
      reason: "extraktion",
      round: 2,
      runners: RUNNER_IDS.map((runnerId) => end(runnerId)),
    });
    expect(repeat.ok).toBe(false);
    if (repeat.ok) return;
    expect(repeat.state).toBe(booked);
  });

  it("migriert Version 0 und 1 ohne zusätzlichen Besitz", () => {
    const fresh = createCampaign();
    const runners = fresh.runners;
    const migrated = readCampaign({ version: 0, runners });
    expect(migrated.ok).toBe(true);
    if (!migrated.ok) return;
    expect(migrated.migrated).toBe(true);
    expect(migrated.state.version).toBe(2);
    expect(migrated.state.runners).toEqual(runners);
    expect(migrated.state.lager).toEqual(fresh.lager);
    expect(migrated.state.booked).toEqual([]);
    expect(migrated.state.progress.bookedResults).toBe(0);
    const again = readCampaign(migrated.state);
    expect(again.ok).toBe(true);
    if (!again.ok) return;
    expect(again.migrated).toBe(false);
    expect(again.state.runners.kite).toEqual(runners.kite);

    const versionOne = {
      version: 1,
      id: fresh.id,
      revision: 3,
      runners: {
        ...runners,
        kite: { ...runners.kite, rifle: 4, medkits: 2 },
      },
      freeze: null,
      booked: [],
      progress: fresh.progress,
    };
    const fromOne = readCampaign(versionOne);
    expect(fromOne.ok).toBe(true);
    if (!fromOne.ok) return;
    expect(fromOne.migrated).toBe(true);
    expect(fromOne.state.version).toBe(2);
    expect(fromOne.state.revision).toBe(3);
    expect(fromOne.state.runners.kite).toMatchObject({ rifle: 1, medkits: 1 });
    expect(fromOne.state.lager).toEqual({ rifle: 3, sidearm: 0, rifleMagazines: 0, sidearmMagazines: 0, medkits: 1 });
    expect(readCampaign(fromOne.state).ok).toBe(true);

    const roundtrip = readCampaign(JSON.parse(JSON.stringify(defeat("sidearm"))));
    expect(roundtrip.ok).toBe(true);
    if (!roundtrip.ok) return;
    expect(roundtrip.state.progress.bookedResults).toBe(1);
    expect(roundtrip.state.runners.kite.sidearmMagazines).toBe(LOADOUT_MAGAZINES);

    expect(readCampaign({ version: 0, runners, booked: ["ghost-floor-1"] }).ok).toBe(false);
    expect(readCampaign({ version: 2, runners }).ok).toBe(false);
    expect(readCampaign({ version: 0, runners: { ...runners, kite: { ...runners.kite, medkits: 1.5 } } }).ok).toBe(false);
    const overCap = createCampaign();
    expect(readCampaign({ ...overCap, runners: { ...overCap.runners, kite: { ...overCap.runners.kite, rifle: 2 } } }).ok).toBe(false);
  });

  it("bewegt nur vorhandenen Besitz zwischen Slot und Lager und friert das Lager nicht an", () => {
    const campaign = createCampaign();
    const before = JSON.stringify(campaign);
    const emptyTake = moveGear(campaign, "kite", "rifle", "nehmen");
    expect(emptyTake).toMatchObject({ ok: false, rejection: "Lager reicht nicht." });
    expect(emptyTake.state).toBe(campaign);

    const stored = moveGear(campaign, "kite", "medkits", "legen");
    expect(stored.ok).toBe(true);
    if (!stored.ok) return;
    expect(JSON.stringify(campaign)).toBe(before);
    expect(stored.state.runners.kite.medkits).toBe(0);
    expect(stored.state.lager.medkits).toBe(1);
    const full = moveGear(stored.state, "voss", "medkits", "nehmen");
    expect(full).toMatchObject({ ok: false, rejection: "Slot ist voll." });
    expect(full.state).toBe(stored.state);
    const returned = moveGear(stored.state, "kite", "medkits", "nehmen");
    expect(returned.ok).toBe(true);
    if (!returned.ok) return;
    const duplicate = moveGear(returned.state, "kite", "medkits", "nehmen");
    expect(duplicate).toMatchObject({ ok: false, rejection: "Lager reicht nicht." });
    expect(duplicate.state).toBe(returned.state);
    expect(returned.state.runners.kite.medkits).toBe(1);
    expect(returned.state.lager.medkits).toBe(0);

    const aside = moveGear(campaign, "kite", "rifle", "legen");
    if (!aside.ok) throw new Error(aside.rejection);
    const missing = freezeLoadout(aside.state, rifles, 1);
    expect(missing).toMatchObject({ ok: false, rejection: "Ausrüstung fehlt." });
    expect(missing.state).toBe(aside.state);
    expect(aside.state.lager.rifle).toBe(1);

    const sidearmAside = moveGear(campaign, "kite", "sidearm", "legen");
    if (!sidearmAside.ok) throw new Error(sidearmAside.rejection);
    const frozen = freezeLoadout(sidearmAside.state, rifles, 1);
    expect(frozen.ok).toBe(true);
    if (!frozen.ok) return;
    expect(frozen.state.lager).toBe(sidearmAside.state.lager);
    const during = moveGear(frozen.state, "voss", "sidearm", "legen");
    expect(during).toMatchObject({ ok: false, rejection: "Ein Einsatz ist bereits eingefroren." });
    expect(during.state).toBe(frozen.state);

    const parked = freezeLoadout(campaign, rifles, 1);
    if (!parked.ok) throw new Error(parked.rejection);
    const versionOne = {
      version: 1,
      id: parked.state.id,
      revision: parked.state.revision,
      runners: { ...parked.state.runners, kite: { ...parked.state.runners.kite, rifle: 1 } },
      freeze: parked.state.freeze,
      booked: parked.state.booked,
      progress: parked.state.progress,
    };
    const migrated = readCampaign(versionOne);
    expect(migrated.ok).toBe(true);
    if (!migrated.ok || !migrated.state.freeze) return;
    const released = releaseFreeze(migrated.state, migrated.state.freeze.resultId);
    expect(released.released).toBe(true);
    expect(released.state.runners.kite.rifle).toBe(1);
    expect(released.state.lager.rifle).toBe(1);
    expect(released.state.progress.bookedResults).toBe(0);
  });
});
