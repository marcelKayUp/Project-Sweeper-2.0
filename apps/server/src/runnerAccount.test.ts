import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createModularCharacterSpec } from "@neon/characters";
import { balancedSheet, carriedGear, createCampaign } from "@neon/sim";
import { afterEach, describe, expect, it } from "vitest";
import { createMemoryCampaignStore } from "./campaignStore.ts";
import { createMissionAuthority } from "./missionAuthority.ts";
import {
  RUNNER_LOGIN_REJECTED,
  RUNNER_NAME_TAKEN,
  RUNNER_PASSWORD_SHORT,
  RUNNER_POINTS_INVALID,
  answerRunner,
  createRunner,
  openRunner,
  saveGear,
} from "./runnerAccount.ts";
import { createFileRunnerStore, createMemoryRunnerStore } from "./runnerStore.ts";

const SECRET = "nachtmarkt-8";
const WRONG = "falsches-tor-9";
const directories: string[] = [];

afterEach(() => {
  for (const directory of directories.splice(0)) rmSync(directory, { recursive: true, force: true });
});

describe("Runner-Einträge", () => {
  it("legt einen Eintrag an, lehnt den gleichen Namen und ein falsches Passwort ab und findet ihn nach dem Neuladen", () => {
    const directory = mkdtempSync(join(tmpdir(), "neon-runners-"));
    directories.push(directory);
    const file = join(directory, "runners.json");
    expect(file.includes(SECRET)).toBe(false);
    const store = createFileRunnerStore(file);

    const created = createRunner(store.read(), "Mira", SECRET);
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    store.write(created.file);
    expect(created.key).toBe("mira");
    const account = created.file.runners.mira;
    expect(account?.name).toBe("Mira");
    expect(account?.body.hands).toEqual({ left: "rifle", right: "rifle" });
    expect(account?.body.belt).toBe("medkit");
    expect(account?.body.pack.filter((cell) => cell === "sidearm")).toEqual(["sidearm"]);
    expect(account?.body.pack.filter((cell) => cell === "rifleMagazine")).toHaveLength(3);
    expect(account?.body.pack.filter((cell) => cell === "sidearmMagazine")).toHaveLength(3);
    expect(account?.lager).toEqual({ rifle: 0, sidearm: 0, rifleMagazines: 0, sidearmMagazines: 0, medkits: 0 });
    expect(account?.progress.bookedResults).toBe(0);
    expect(account?.progress.lines).toEqual([]);
    expect(account?.hold).toBeNull();
    expect(account ? carriedGear(account.body) : null).toEqual({ rifle: 1, sidearm: 1, rifleMagazines: 3, sidearmMagazines: 3, medkits: 1 });

    expect(createRunner(store.read(), "mira", WRONG)).toEqual({ ok: false, rejection: RUNNER_NAME_TAKEN });
    expect(createRunner(store.read(), "MIRA", "kurz")).toEqual({ ok: false, rejection: RUNNER_PASSWORD_SHORT });
    expect(openRunner(store.read(), "MIRA", WRONG)).toEqual({ ok: false, rejection: RUNNER_LOGIN_REJECTED });
    expect(openRunner(store.read(), "Niemand", WRONG)).toEqual({ ok: false, rejection: RUNNER_LOGIN_REJECTED });
    expect(openRunner(store.read(), "MIRA", SECRET)).toEqual({ ok: true, key: "mira", name: "Mira" });

    const text = readFileSync(file, "utf8");
    expect(text.includes(SECRET)).toBe(false);
    expect(text.includes(WRONG)).toBe(false);
    const answered = answerRunner(createMemoryRunnerStore(), { absicht: "anlegen", name: "Nova", password: SECRET });
    expect(JSON.stringify(answered).includes(SECRET)).toBe(false);

    const reloaded = createFileRunnerStore(file);
    expect(openRunner(reloaded.read(), "mira", SECRET)).toEqual({ ok: true, key: "mira", name: "Mira" });
    expect(reloaded.read().runners.mira?.body.hands).toEqual({ left: "rifle", right: "rifle" });
  });

  it("belegt einen freien Slot mit dem eigenen Bestand und lässt den Crew-Topf stehen", () => {
    const accounts = createMemoryRunnerStore();
    const created = createRunner(accounts.read(), "Nova", SECRET);
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    accounts.write(created.file);
    const campaign = createMemoryCampaignStore();
    const before = campaign.read();
    const authority = createMissionAuthority({ now: () => 1_000 }, 1, campaign, accounts);
    expect(authority.join("s-nova", "egal", created.key).ok).toBe(true);
    const stand = authority.stand("s-nova");
    expect(stand.ownRunnerId).toBe("kite");
    expect(stand.slots[0]?.account).toBe(true);
    expect(stand.slots[0]?.name).toBe("Nova");
    expect(stand.slots[0]?.gear.body?.hands).toEqual({ left: "rifle", right: "rifle" });
    expect(stand.lager).toEqual({ rifle: 0, sidearm: 0, rifleMagazines: 0, sidearmMagazines: 0, medkits: 0 });
    expect(stand.bookedResults).toBe(0);

    authority.submit([{ kind: "lobby", sessionId: "s-nova", payload: { kind: "ziehen", von: { area: "hands" }, nach: { area: "hand", hand: "left" } } }]);
    expect(authority.stand("s-nova").notice).toBe("Ziel passt nicht.");
    expect(accounts.read().runners.nova?.body.hands).toEqual({ left: "rifle", right: "rifle" });

    const packIndex = accounts.read().runners.nova?.body.pack.indexOf("rifleMagazine") ?? -1;
    expect(packIndex).toBeGreaterThanOrEqual(0);
    authority.submit([{
      kind: "lobby",
      sessionId: "s-nova",
      payload: { kind: "ziehen", von: { area: "pack", index: packIndex }, nach: { area: "stash", post: "rifleMagazines" } },
    }]);
    expect(authority.stand("s-nova").notice).toBe("");
    expect(accounts.read().runners.nova?.lager.rifleMagazines).toBe(1);
    expect(accounts.read().runners.nova?.body.pack[packIndex]).toBe("empty");
    expect(campaign.read().runners).toEqual(before.runners);
    expect(campaign.read().lager).toEqual(before.lager);
    expect(campaign.read().revision).toBe(before.revision);
    expect(authority.join("s-doppelt", "Nova", created.key)).toEqual({ ok: false, rejection: "Dieser Runner ist bereits im Raum." });
    expect(authority.join("s-fremd", "Fremd", "fehlt")).toEqual({ ok: false, rejection: "Anmeldung abgelehnt." });
  });

  it("speichert Spec und Punkte, lehnt zu viele Punkte ab und legt beim Anmelden keinen zweiten Körper an", () => {
    const directory = mkdtempSync(join(tmpdir(), "neon-runners-"));
    directories.push(directory);
    const file = join(directory, "runners.json");
    const look = {
      ...createModularCharacterSpec(42, "Punk"),
      stature: 1.05,
      equipment: "backpack" as const,
      palette: { skin: "#C68642", hair: null, cloth: "#1F4B99", armor: null, accent: null },
    };
    const sheet = {
      attribute: { physisch: 5, sozial: 2, mental: 2 },
      fertigkeiten: { "fertigkeit-1": 0, "fertigkeit-2": 0, "fertigkeit-3": 3 },
    };
    const store = createFileRunnerStore(file);
    const created = createRunner(store.read(), "Lumen", SECRET, { look, sheet });
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    store.write(created.file);
    const text = readFileSync(file, "utf8");
    expect(text.includes(SECRET)).toBe(false);
    expect(text.includes('"password":')).toBe(false);
    expect(text.includes("Punk")).toBe(true);
    expect(text.includes('"physisch": 5')).toBe(true);

    const reloaded = createFileRunnerStore(file);
    const account = reloaded.read().runners.lumen;
    expect(account?.look.parts).toEqual({ head: "Punk", body: "Punk", legs: "Punk", feet: "Punk" });
    expect(account?.look.stature).toBe(1.05);
    expect(account?.look.palette.skin).toBe("#C68642");
    expect(account?.look.palette.cloth).toBe("#1F4B99");
    expect(account?.sheet).toEqual(sheet);
    expect(account?.body.hands).toEqual({ left: "rifle", right: "rifle" });
    expect(account?.body.belt).toBe("medkit");
    const kept = account ? saveGear(reloaded.read(), "lumen", { ...account.body, belt: "empty" }, account.lager) : null;
    expect(kept?.runners.lumen?.look.parts.body).toBe("Punk");
    expect(kept?.runners.lumen?.sheet.attribute.physisch).toBe(5);
    expect(kept?.runners.lumen?.body.belt).toBe("empty");

    const over = { attribute: { physisch: 5, sozial: 3, mental: 2 }, fertigkeiten: sheet.fertigkeiten };
    const memory = createMemoryRunnerStore();
    const rejected = answerRunner(memory, { absicht: "anlegen", name: "Lumen", password: SECRET, aussehen: look, punkte: over });
    expect(rejected).toEqual({ status: 400, body: { ok: false, rejection: RUNNER_POINTS_INVALID } });
    expect(memory.read().runners).toEqual({});
    expect(JSON.stringify(rejected).includes(SECRET)).toBe(false);

    let writes = 0;
    const frozen = created.file;
    const watching = {
      read: () => frozen,
      write() {
        writes += 1;
      },
    };
    const login = answerRunner(watching, {
      absicht: "anmelden",
      name: "Lumen",
      password: SECRET,
      aussehen: createModularCharacterSpec(7, "Suit"),
      punkte: { attribute: { physisch: 5, sozial: 5, mental: 5 }, fertigkeiten: balancedSheet().fertigkeiten },
    });
    expect(login.status).toBe(200);
    expect(writes).toBe(0);
    expect(Object.keys(frozen.runners)).toEqual(["lumen"]);
    expect(frozen.runners.lumen?.look.parts.body).toBe("Punk");
    expect(openRunner(frozen, "Lumen", SECRET)).toEqual({ ok: true, key: "lumen", name: "Lumen" });

    const campaign = createMemoryCampaignStore();
    const authority = createMissionAuthority({ now: () => 2_000 }, 1, campaign, createMemoryRunnerStore(frozen));
    expect(authority.join("s-lumen", "egal", "lumen").ok).toBe(true);
    const stand = JSON.stringify(authority.stand("s-lumen"));
    expect(stand.includes("physisch")).toBe(false);
    expect(stand.includes("fertigkeit")).toBe(false);
  });

  it("lädt einen alten Eintrag ohne Aussehen und Punkte als Standard", () => {
    const directory = mkdtempSync(join(tmpdir(), "neon-runners-"));
    directories.push(directory);
    const file = join(directory, "runners.json");
    const created = createRunner(createMemoryRunnerStore().read(), "Alt", SECRET);
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    const raw = JSON.parse(JSON.stringify(created.file)) as { version: number; runners: { alt: Record<string, unknown> } };
    delete raw.runners.alt.look;
    delete raw.runners.alt.sheet;
    const text = `${JSON.stringify(raw, null, 2)}\n`;
    writeFileSync(file, text, "utf8");
    const loaded = createFileRunnerStore(file);
    expect(readFileSync(file, "utf8")).toBe(text);
    expect(text.includes(SECRET)).toBe(false);
    expect(text.includes('"look"')).toBe(false);
    expect(text.includes('"sheet"')).toBe(false);
    expect(loaded.read().runners.alt?.look).toEqual(createModularCharacterSpec(42));
    expect(loaded.read().runners.alt?.sheet).toEqual(balancedSheet());
    expect(loaded.read().runners.alt?.body.hands).toEqual({ left: "rifle", right: "rifle" });
    expect(loaded.read().runners.alt?.body.belt).toBe("medkit");
    expect(openRunner(loaded.read(), "Alt", SECRET)).toEqual({ ok: true, key: "alt", name: "Alt" });
  });
});
