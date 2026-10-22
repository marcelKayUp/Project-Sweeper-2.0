import {
  MODULAR_FEMALE_SOURCE_ID,
  MODULAR_SOURCE_ID,
  createModularCharacterSpec,
} from "@neon/characters";
import type { ModularCharacterSpec, ModularEquipment, ModularSourceId, ModularVariant } from "@neon/characters";

export interface MissionLook {
  readonly source: ModularSourceId;
  readonly spec: ModularCharacterSpec;
}

interface Assignment {
  readonly source: ModularSourceId;
  readonly variant: ModularVariant;
}

const CREW: Readonly<Record<string, Assignment>> = {
  kite: { source: MODULAR_SOURCE_ID, variant: "Suit" },
  voss: { source: MODULAR_SOURCE_ID, variant: "Casual2" },
  nera: { source: MODULAR_FEMALE_SOURCE_ID, variant: "SciFi" },
  sol: { source: MODULAR_SOURCE_ID, variant: "Punk" },
};

function look(id: string, source: ModularSourceId, variant: ModularVariant, equipment: ModularEquipment): MissionLook {
  const spec = createModularCharacterSpec(1, variant, source);
  return { source, spec: { ...spec, id, equipment } };
}

export function missionLook(id: string, team: "crew" | "enemy"): MissionLook {
  const crew = team === "crew" ? CREW[id] : undefined;
  if (crew) return look(id, crew.source, crew.variant, "pistol");
  if (team === "crew") return look(id, MODULAR_SOURCE_ID, "Worker", "pistol");
  return look(id, MODULAR_SOURCE_ID, "Swat", "pistol");
}

export function maleStandIn(id: string): MissionLook {
  return look(id, MODULAR_SOURCE_ID, "Worker", "pistol");
}
