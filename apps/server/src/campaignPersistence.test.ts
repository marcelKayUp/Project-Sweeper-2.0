import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { MISSION_ID, PROTOCOL_VERSION, applyMissionResult, carriedGear, createCampaign, freezeLoadout, moveGear, RUNNER_IDS, type CampaignState } from "@neon/sim";
import { afterEach, describe, expect, it } from "vitest";
import { createFileCampaignStore, createMemoryCampaignStore, recoverUnbooked, type CampaignStore } from "./campaignStore.ts";
import { createMissionAuthority, type AuthorityStand } from "./missionAuthority.ts";

const directories: string[] = [];

afterEach(() => {
  for (const directory of directories.splice(0)) rmSync(directory, { recursive: true, force: true });
});

function wish(commandId: string, unitId: string, action: Record<string, unknown>) {
  return {
    protocol: PROTOCOL_VERSION,
    missionId: MISSION_ID,
    commandId,
    round: 1,
    phase: "crew" as const,
    epoch: 1,
    unitId,
    action,
  };
}

function room(store: CampaignStore, start = 5_000) {
  let now = start;
  const authority = createMissionAuthority({ now: () => now }, 1, store);
  const ids = ["s-kite", "s-voss", "s-nera", "s-sol"] as const;
  return {
    authority,
    ids,
    now,
    lobby(sessionId: string, payload: unknown) {
      authority.submit([{ kind: "lobby", sessionId, payload }]);
    },
    command(sessionId: string, payload: unknown) {
      authority.submit([{ kind: "command", sessionId, payload }]);
    },
    joinAll() {
      for (const id of ids) expect(authority.join(id, id).ok).toBe(true);
    },
    prepare(preset: "rifle" | "sidearm" = "rifle") {
      this.joinAll();
      for (const id of ids) {
        this.lobby(id, { kind: "preset", preset });
        this.lobby(id, { kind: "bereit", ready: true });
      }
    },
    start() {
      this.prepare();
      this.lobby(ids[0], { kind: "start" });
    },
    defeat() {
      this.command(ids[0], wish("k1", "kite", { kind: "move", x: 0, y: 9 }));
      this.command(ids[0], wish("k2", "kite", { kind: "extract" }));
      this.command(ids[1], wish("v1", "voss", { kind: "extract" }));
      this.command(ids[2], wish("n1", "nera", { kind: "move", x: 0, y: 10 }));
      this.command(ids[2], wish("n2", "nera", { kind: "extract" }));
      this.command(ids[3], wish("s1", "sol", { kind: "move", x: 0, y: 11 }));
      this.command(ids[3], wish("s2", "sol", { kind: "extract" }));
    },
  };
}

function gear(stand: AuthorityStand, runnerId: string) {
  return stand.slots.find((slot) => slot.runnerId === runnerId)?.gear;
}

function carried(state: CampaignState, runnerId: "kite" | "voss" | "nera" | "sol") {
  return carriedGear(state.runners[runnerId]);
}

function countRunners(state: CampaignState) {
  return {
    kite: carried(state, "kite"),
    voss: carried(state, "voss"),
    nera: carried(state, "nera"),
    sol: carried(state, "sol"),
  };
}

describe("Persistenter Einsatz", () => {
  it("verbucht einen Abschluss einmal, behält ihn beim Neuladen und weist einen zweiten Abschluss ab", () => {
    const directory = mkdtempSync(join(tmpdir(), "neon-campaign-"));
    directories.push(directory);
    const file = join(directory, "campaign.json");
    const store = createFileCampaignStore(file);
    const first = room(store);
    const before = store.read().revision;
    first.start();
    expect(first.authority.stand(first.ids[0]).roomPhase).toBe("mission");
    expect(store.read().freeze?.resultId).toBe("ghost-floor-1");
    expect(carried(store.read(), "kite").rifle).toBe(0);
    expect(store.read().revision).toBe(before + 1);

    first.authority.submit([{ kind: "leave", sessionId: first.ids[0] }]);
    first.authority.submit([{ kind: "resume", sessionId: first.ids[0], now: first.now }]);
    expect(store.read().revision).toBe(before + 1);
    expect(store.read().progress.bookedResults).toBe(0);
    expect(first.authority.join("s-zweit", "Zweit")).toEqual({ ok: false, rejection: "Die Mission läuft bereits." });
    expect(carried(store.read(), "kite").rifle).toBe(0);

    const second = room(store);
    second.joinAll();
    second.lobby(second.ids[0], { kind: "preset", preset: "rifle" });
    expect(second.authority.stand(second.ids[0]).notice).toBe("Ein Einsatz ist bereits eingefroren.");
    expect(carried(store.read(), "kite").rifle).toBe(0);
    expect(store.read().progress.bookedResults).toBe(0);

    first.defeat();
    const stand = first.authority.stand(first.ids[0]);
    expect(stand.outcome).toBe("niederlage");
    expect(stand.bookedResults).toBe(1);
    expect(stand.booking.map((line) => line.spentMagazines + line.spentMedkits)).toEqual([0, 0, 0, 0]);
    expect(store.read().runners).toEqual(createCampaign().runners);
    const booked = store.read();

    first.command(first.ids[0], wish("danach", "kite", { kind: "ready" }));
    expect(store.read()).toBe(booked);
    first.authority.abort();
    expect(store.read()).toBe(booked);

    const duplicate = applyMissionResult(store.read(), {
      resultId: "ghost-floor-1",
      missionId: "ghost-floor",
      seed: 1,
      outcome: "sieg",
      reason: "extraktion",
      round: 1,
      runners: RUNNER_IDS.map((runnerId) => ({
        runnerId,
        weapon: "rifle" as const,
        magazine: 6,
        magazineSize: 6,
        reserveMagazines: 2,
        overwatch: false,
        medkits: 1,
      })),
    });
    expect(duplicate.ok).toBe(false);
    expect(store.read()).toBe(booked);

    const reloaded = createFileCampaignStore(file);
    expect(reloaded.read()).toEqual(booked);
    expect(reloaded.read().progress.bookedResults).toBe(1);
    const again = room(reloaded);
    again.joinAll();
    expect(again.authority.stand(again.ids[0]).bookedResults).toBe(1);
    expect(gear(again.authority.stand(again.ids[0]), "kite")).toMatchObject({ rifle: 1, medkits: 1, rifleReady: true });
  });

  it("gibt ein abgebrochenes Freeze beim Laden einmal zurück und sperrt fehlende Ausrüstung", () => {
    const directory = mkdtempSync(join(tmpdir(), "neon-campaign-"));
    directories.push(directory);
    const file = join(directory, "campaign.json");
    const store = createFileCampaignStore(file);
    const frozen = freezeLoadout(
      createCampaign(),
      RUNNER_IDS.map((runnerId) => ({ runnerId, weapon: "rifle" as const })),
      1,
    );
    if (!frozen.ok) throw new Error(frozen.rejection);
    store.write(frozen.state);
    const recovered = recoverUnbooked(createFileCampaignStore(file));
    expect(recovered.read().freeze).toBeNull();
    expect(carried(recovered.read(), "kite").rifle).toBe(1);
    expect(recovered.read().progress.bookedResults).toBe(0);
    const twice = recoverUnbooked(createFileCampaignStore(file));
    expect(twice.read().runners).toEqual(recovered.read().runners);

    const spent = applyMissionResult(frozen.state, {
      resultId: "ghost-floor-1",
      missionId: "ghost-floor",
      seed: 1,
      outcome: "niederlage",
      reason: "keine-handlungsfaehigen",
      round: 1,
      runners: RUNNER_IDS.map((runnerId) => ({
        runnerId,
        weapon: "rifle" as const,
        magazine: runnerId === "kite" ? 0 : 6,
        magazineSize: 6,
        reserveMagazines: runnerId === "kite" ? 1 : 2,
        overwatch: false,
        medkits: runnerId === "kite" ? 0 : 1,
      })),
    });
    if (!spent.ok) throw new Error(spent.rejection);
    const memory = createMemoryCampaignStore(spent.state);
    const blocked = room(memory);
    blocked.joinAll();
    blocked.lobby(blocked.ids[0], { kind: "preset", preset: "rifle" });
    expect(blocked.authority.stand(blocked.ids[0]).notice).toBe("Ausrüstung fehlt.");
    expect(gear(blocked.authority.stand(blocked.ids[0]), "kite")).toMatchObject({ rifleReady: false, sidearmReady: false, medkits: 0 });
    expect(carried(memory.read(), "kite").medkits).toBe(0);
    blocked.lobby(blocked.ids[1], { kind: "preset", preset: "sidearm" });
    expect(blocked.authority.stand(blocked.ids[1]).notice).toBe("");
    expect(gear(blocked.authority.stand(blocked.ids[1]), "voss")?.sidearmReady).toBe(true);
  });

  it("migriert alte Saves und lässt eine zweite Entnahme leer ausgehen", () => {
    const directory = mkdtempSync(join(tmpdir(), "neon-campaign-"));
    directories.push(directory);
    const file = join(directory, "campaign.json");
    const fresh = createCampaign();
    writeFileSync(file, JSON.stringify({ version: 0, runners: countRunners(fresh) }));
    const migrated = createFileCampaignStore(file);
    expect(migrated.read().version).toBe(3);
    expect(migrated.read().lager).toEqual(fresh.lager);
    expect(migrated.read().runners).toEqual(fresh.runners);
    const disk = JSON.parse(readFileSync(file, "utf8")) as { version: number; lager: { rifle: number } };
    expect(disk.version).toBe(3);
    expect(disk.lager.rifle).toBe(0);

    const versionOne = join(directory, "alt.json");
    writeFileSync(
      versionOne,
      JSON.stringify({
        version: 1,
        id: fresh.id,
        revision: 4,
        runners: { ...countRunners(fresh), kite: { ...countRunners(fresh).kite, rifle: 4 } },
        freeze: null,
        booked: [],
        progress: fresh.progress,
      }),
    );
    const fromOne = createFileCampaignStore(versionOne);
    expect(fromOne.read().version).toBe(3);
    expect(carried(fromOne.read(), "kite").rifle).toBe(1);
    expect(fromOne.read().lager.rifle).toBe(3);
    expect(JSON.parse(readFileSync(versionOne, "utf8")).version).toBe(3);

    const moved = moveGear(createCampaign(), "kite", "medkits", "legen");
    if (!moved.ok) throw new Error(moved.rejection);
    const shared = createMemoryCampaignStore(moved.state);
    const first = room(shared);
    const second = room(shared);
    first.joinAll();
    second.joinAll();
    first.lobby(first.ids[0], { kind: "preset", preset: "rifle" });
    first.lobby(first.ids[0], { kind: "bereit", ready: true });
    first.lobby(first.ids[0], { kind: "lager", richtung: "nehmen", posten: "medkits" });
    expect(first.authority.stand(first.ids[0]).notice).toBe("");
    expect(carried(shared.read(), "kite").medkits).toBe(1);
    expect(shared.read().lager.medkits).toBe(0);
    expect(first.authority.stand(first.ids[0]).slots.find((slot) => slot.runnerId === "kite")?.ready).toBe(false);
    second.lobby(second.ids[0], { kind: "lager", richtung: "nehmen", posten: "medkits" });
    expect(second.authority.stand(second.ids[0]).notice).toBe("Lager reicht nicht.");
    expect(shared.read().lager.medkits).toBe(0);
    expect(carried(shared.read(), "kite").medkits).toBe(1);

    const reloaded = createFileCampaignStore(file);
    expect(reloaded.read().lager).toEqual(fresh.lager);
    const parked = moveGear(reloaded.read(), "kite", "rifle", "legen");
    if (!parked.ok) throw new Error(parked.rejection);
    reloaded.write(parked.state);
    const again = room(reloaded);
    again.joinAll();
    again.lobby(again.ids[0], { kind: "preset", preset: "rifle" });
    expect(again.authority.stand(again.ids[0]).notice).toBe("Ausrüstung fehlt.");
    expect(again.authority.stand(again.ids[0]).slots.find((slot) => slot.runnerId === "kite")?.preset).toBe("");
    again.lobby(again.ids[0], { kind: "preset", preset: "sidearm" });
    expect(again.authority.stand(again.ids[0]).slots.find((slot) => slot.runnerId === "kite")?.preset).toBe("sidearm");
    again.lobby(again.ids[0], { kind: "lager", richtung: "legen", posten: "sidearm" });
    expect(again.authority.stand(again.ids[0]).slots.find((slot) => slot.runnerId === "kite")?.preset).toBe("");
    expect(reloaded.read().lager.sidearm).toBe(1);
    again.lobby(again.ids[0], { kind: "lager", richtung: "nehmen", posten: "rifle" });
    expect(carried(reloaded.read(), "kite").rifle).toBe(1);
    expect(reloaded.read().lager.rifle).toBe(0);
    const kept = reloaded.read();
    const resumed = room(createFileCampaignStore(file));
    resumed.joinAll();
    expect(resumed.authority.stand(resumed.ids[0]).lager).toEqual(kept.lager);
    expect(resumed.authority.stand(resumed.ids[0]).bookedResults).toBe(0);
    expect(createFileCampaignStore(file).read()).toEqual(kept);
  });

  it("prüft einen Zieh-Wunsch und erzeugt dabei kein zweites Stück", () => {
    const shared = createMemoryCampaignStore();
    const first = room(shared);
    const second = room(shared);
    first.joinAll();
    second.joinAll();
    first.lobby(first.ids[0], { kind: "ziehen", von: { area: "hands" }, nach: { area: "stash", post: "rifle" } });
    expect(first.authority.stand(first.ids[0]).notice).toBe("");
    expect(shared.read().lager.rifle).toBe(1);
    expect(carried(shared.read(), "kite").rifle).toBe(0);
    first.lobby(first.ids[0], { kind: "ziehen", von: { area: "stash", post: "rifle" }, nach: { area: "belt" } });
    expect(first.authority.stand(first.ids[0]).notice).toBe("Ziel passt nicht.");
    expect(shared.read().lager.rifle).toBe(1);
    second.lobby(second.ids[0], { kind: "ziehen", von: { area: "stash", post: "rifle" }, nach: { area: "hands" } });
    expect(second.authority.stand(second.ids[0]).notice).toBe("");
    expect(shared.read().lager.rifle).toBe(0);
    expect(carried(shared.read(), "kite").rifle).toBe(1);
    expect(shared.read().runners.kite.hands).toEqual({ left: "rifle", right: "rifle" });
    first.lobby(first.ids[0], { kind: "ziehen", von: { area: "stash", post: "rifle" }, nach: { area: "hands" } });
    expect(first.authority.stand(first.ids[0]).notice).toBe("Lager reicht nicht.");
    expect(carried(shared.read(), "kite").rifle).toBe(1);
    expect(shared.read().lager.rifle).toBe(0);
  });
});
