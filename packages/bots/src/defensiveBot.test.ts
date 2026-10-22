import { createMissionState, projectTeam } from "@neon/sim";
import { ghostFloorSpec } from "@neon/sim/ghost-floor";
import { describe, expect, it } from "vitest";
import { DEFENSIVE_POLICY, defensiveIntent } from "./defensiveBot.ts";

const presets = { kite: "rifle", voss: "rifle", nera: "rifle", sol: "rifle" } as const;

describe("defensiver Ausfallbot", () => {
  it("heilt nur unter der Hälfte und meldet sonst Bereit, ohne die Sicht zu verändern", () => {
    const view = projectTeam(createMissionState(ghostFloorSpec(presets), 1), ghostFloorSpec(presets));
    const before = JSON.stringify(view);
    expect(DEFENSIVE_POLICY).toBe("defensive-v1");
    expect(defensiveIntent(view, "kite")).toEqual({ kind: "ready", unitId: "kite" });
    expect(defensiveIntent(view, "unbekannt")).toBeNull();
    expect(JSON.stringify(view)).toBe(before);

    const hurt = structuredClone(view);
    const kite = hurt.units.find((unit) => unit.id === "kite");
    if (!kite) throw new Error("kite fehlt");
    kite.hp = 1;
    expect(defensiveIntent(hurt, "kite")).toEqual({ kind: "heal", unitId: "kite", targetId: "kite" });
    kite.hp = Math.ceil(kite.maxHp / 2);
    expect(defensiveIntent(hurt, "kite")?.kind).toBe("ready");
    kite.hp = 1;
    kite.medkits = 0;
    expect(defensiveIntent(hurt, "kite")?.kind).toBe("ready");
    kite.medkits = 1;
    kite.ready = true;
    expect(defensiveIntent(hurt, "kite")).toBeNull();
    kite.ready = false;
    kite.status = "down";
    expect(defensiveIntent(hurt, "kite")).toBeNull();
  });

  it("schießt nicht und nennt keinen verborgenen Gegner", () => {
    const view = projectTeam(createMissionState(ghostFloorSpec(presets), 4), ghostFloorSpec(presets));
    const hiddenId = "wache-haupt";
    expect(view.units.some((unit) => unit.id === hiddenId)).toBe(false);
    const withHidden = structuredClone(view);
    const kite = withHidden.units.find((unit) => unit.id === "kite");
    if (!kite) throw new Error("kite fehlt");
    withHidden.units.push({ ...kite, id: hiddenId, team: "enemy", name: "Verborgen" });
    withHidden.knownCells = [];
    const command = defensiveIntent(withHidden, "kite");
    expect(command?.kind).toBe("ready");
    expect(JSON.stringify(command).includes(hiddenId)).toBe(false);
    expect(defensiveIntent(withHidden, "kite")).toEqual(command);
  });
});
