import { actionAp, type CrewCommand, type TeamView } from "@neon/sim";

export const DEFENSIVE_POLICY = "defensive-v1";

export function defensiveIntent(view: TeamView, unitId: string): CrewCommand | null {
  const unit = view.units.find((item) => item.id === unitId);
  if (!unit || unit.team !== "crew" || unit.status !== "active" || unit.ready) return null;
  if (unit.medkits > 0 && unit.hp * 2 < unit.maxHp && unit.ap >= actionAp("heal")) {
    return { kind: "heal", unitId, targetId: unitId };
  }
  return { kind: "ready", unitId };
}
