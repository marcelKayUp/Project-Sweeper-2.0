import { actionAp, treatmentTarget, type CrewCommand, type TeamView } from "@neon/sim";

export const DEFENSIVE_POLICY = "defensive-v1";

export function defensiveIntent(view: TeamView, unitId: string): CrewCommand | null {
  const unit = view.units.find((item) => item.id === unitId);
  if (!unit || unit.team !== "crew" || unit.status !== "active" || unit.ready) return null;
  const part = treatmentTarget(unit.parts);
  const bleeding = unit.parts.some((item) => item.wound === "bleed");
  if (part && unit.medkits > 0 && unit.ap >= actionAp("heal") && (bleeding || unit.hp * 2 < unit.maxHp)) {
    return { kind: "heal", unitId, targetId: unitId, part };
  }
  return { kind: "ready", unitId };
}
