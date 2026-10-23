import { BODY_PARTS, type BodyPartId, type PartState, type WoundKind } from "@neon/sim";

const WOUNDS = ["graze", "bleed", "fracture"] as const;

export function partLabel(id: BodyPartId): string {
  if (id === "head") return "Kopf";
  if (id === "torso") return "Torso";
  if (id === "arm-l") return "Arm links";
  if (id === "arm-r") return "Arm rechts";
  if (id === "leg-l") return "Bein links";
  return "Bein rechts";
}

export function WoundList({ parts }: { readonly parts: readonly PartState[] }) {
  const hurt = parts.filter((part) => part.wound !== null || part.hp < part.maxHp);
  if (hurt.length === 0) return null;
  return (
    <p data-wounds="offen">
      {hurt
        .map((part) => {
          const kind = woundLabel(part.wound);
          return kind.length > 0 ? `${partLabel(part.id)} ${kind} ${part.hp}/${part.maxHp}` : `${partLabel(part.id)} ${part.hp}/${part.maxHp}`;
        })
        .join(" · ")}
    </p>
  );
}

export function readParts(value: unknown): PartState[] | null {
  if (!Array.isArray(value) || value.length !== BODY_PARTS.length) return null;
  const seen = new Set<string>();
  const parts: PartState[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== "object") return null;
    const record = entry as Record<string, unknown>;
    if (typeof record.id !== "string" || !isPart(record.id) || seen.has(record.id)) return null;
    const maxHp = bounded(record.maxHp, 1, 9);
    const hp = bounded(record.hp, 0, 9);
    if (maxHp === null || hp === null || hp > maxHp) return null;
    if (record.wound !== null && (typeof record.wound !== "string" || !isWound(record.wound))) return null;
    seen.add(record.id);
    parts.push({ id: record.id, hp, maxHp, wound: record.wound });
  }
  return seen.size === BODY_PARTS.length ? parts : null;
}

function woundLabel(wound: WoundKind | null): string {
  if (wound === "graze") return "Kratzer";
  if (wound === "bleed") return "Blutung";
  if (wound === "fracture") return "Bruch";
  return "";
}

function isPart(value: string): value is BodyPartId {
  return (BODY_PARTS as readonly string[]).includes(value);
}

function isWound(value: string): value is WoundKind {
  return (WOUNDS as readonly string[]).includes(value);
}

function bounded(value: unknown, min: number, max: number): number | null {
  if (typeof value !== "number" || !Number.isInteger(value) || value < min || value > max) return null;
  return value;
}
