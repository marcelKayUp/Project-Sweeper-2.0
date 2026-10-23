import { useEffect, useRef, useState } from "react";
import {
  MODULAR_PALETTE_ROLES,
  MODULAR_SLOTS,
  MODULAR_SOURCE_IDS,
  createModularCharacterSpec,
  getModularLibrary,
  validateModularCharacterSpec,
  type ModularCharacterSpec,
  type ModularEquipment,
  type ModularPaletteRole,
  type ModularSlot,
  type ModularSourceId,
  type ModularVariant,
} from "@neon/characters";
import {
  ATTRIBUTE_IDS,
  ATTRIBUTE_MAX,
  ATTRIBUTE_MIN,
  ATTRIBUTE_POOL,
  SKILL_IDS,
  SKILL_MAX,
  SKILL_MIN,
  SKILL_POOL,
  balancedSheet,
  validateRunnerSheet,
  type AttributeId,
  type RunnerSheet,
  type SkillId,
} from "@neon/sim";
import { mountModularCharacterPreview, type ModularCharacterPreview } from "../characters/modularPreview.ts";
import { preferenceMarks, type UiPreferences } from "./preferences.ts";

const PLACEHOLDER = "Beschreibung folgt";
const ATTRIBUTE_LABELS: Readonly<Record<AttributeId, string>> = { physisch: "Physisch", sozial: "Sozial", mental: "Mental" };
const SKILL_LABELS: Readonly<Record<SkillId, string>> = {
  "fertigkeit-1": "Fertigkeit 1",
  "fertigkeit-2": "Fertigkeit 2",
  "fertigkeit-3": "Fertigkeit 3",
};
const SLOT_LABELS: Readonly<Record<ModularSlot, string>> = { head: "Kopf", body: "Oberkörper", legs: "Beine", feet: "Schuhe" };
const PALETTE_LABELS: Readonly<Record<ModularPaletteRole, string>> = { skin: "Haut", hair: "Haare", cloth: "Stoff", armor: "Panzerung", accent: "Akzent" };
const EQUIPMENT_LABELS: Readonly<Record<ModularEquipment, string>> = { none: "Ohne", pistol: "Pistole", sword: "Schwert", backpack: "Rucksack" };
const COLOR_START: Readonly<Record<ModularPaletteRole, string>> = {
  skin: "#C68642",
  hair: "#1B1B1B",
  cloth: "#1F4B99",
  armor: "#4A5568",
  accent: "#E11D48",
};

export function CharacterCreate({
  prefs,
  name,
  busy,
  error,
  pending,
  onBack,
  onConfirm,
}: {
  prefs: UiPreferences;
  name: string;
  busy: boolean;
  error: string;
  pending: boolean;
  onBack: () => void;
  onConfirm: (look: ModularCharacterSpec, sheet: RunnerSheet) => void;
}) {
  const [spec, setSpec] = useState<ModularCharacterSpec>(() => createModularCharacterSpec(42));
  const [sheet, setSheet] = useState<RunnerSheet>(() => balancedSheet());
  const library = getModularLibrary(spec.source);
  const attributeLeft = ATTRIBUTE_POOL - sum(sheet.attribute);
  const skillLeft = SKILL_POOL - sum(sheet.fertigkeiten);
  const ready = attributeLeft === 0 && skillLeft === 0 && validateModularCharacterSpec(spec).ok && validateRunnerSheet(sheet).ok;
  const uniform = library.variants.find((variant) => MODULAR_SLOTS.every((slot) => spec.parts[slot] === variant)) ?? "";

  return (
    <main className="mission mission-create" data-menu="1" data-screen="erstellung" data-runner={name} {...preferenceMarks(prefs)}>
      <form
        className="create-board"
        onSubmit={(event) => {
          event.preventDefault();
          if (!ready || busy) return;
          const parsed = validateModularCharacterSpec(spec);
          const points = validateRunnerSheet(sheet);
          if (!parsed.ok || !points.ok) return;
          onConfirm(parsed.value, points.value);
        }}
      >
        <header className="create-head">
          <p className="kicker">Neon Contract</p>
          <h1>Charaktererstellung</h1>
          <p>
            Runner <strong>{name}</strong>
          </p>
        </header>
        <div className="create-columns">
          <section className="create-column" aria-label="Aussehen" data-panel="aussehen">
            <h2>Aussehen</h2>
            <label>
              Körpermodell
              <select aria-label="Körpermodell" data-field="source" value={spec.source} onChange={(event) => setSpec((current) => applySource(current, event.target.value))}>
                {MODULAR_SOURCE_IDS.map((source) => (
                  <option key={source} value={source}>
                    {getModularLibrary(source).label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Komplettes Set
              <select aria-label="Komplettes Set" data-field="set" value={uniform} onChange={(event) => setSpec((current) => applySet(current, event.target.value))}>
                <option value="" disabled>
                  Teile gemischt
                </option>
                {library.variants.map((variant) => (
                  <option key={variant} value={variant}>
                    {variant}
                  </option>
                ))}
              </select>
            </label>
            {MODULAR_SLOTS.map((slot) => (
              <label key={slot}>
                {SLOT_LABELS[slot]}
                <select aria-label={SLOT_LABELS[slot]} data-field={slot} value={spec.parts[slot]} onChange={(event) => setSpec((current) => applyPart(current, slot, event.target.value))}>
                  {library.variants.map((variant) => (
                    <option key={variant} value={variant}>
                      {variant}
                    </option>
                  ))}
                </select>
              </label>
            ))}
            <label>
              Körpergröße
              <span className="create-range">
                <input
                  aria-label="Körpergröße"
                  data-field="stature"
                  type="range"
                  min="0.9"
                  max="1.15"
                  step="0.01"
                  value={spec.stature}
                  onChange={(event) => setSpec((current) => ({ ...current, stature: roundHundredth(Number(event.target.value)) }))}
                />
                <output>{spec.stature.toFixed(2)}</output>
              </span>
            </label>
            <label>
              Zubehör
              <select aria-label="Zubehör" data-field="equipment" value={spec.equipment} onChange={(event) => setSpec((current) => applyEquipment(current, event.target.value))}>
                {library.equipment.map((item) => (
                  <option key={item} value={item}>
                    {EQUIPMENT_LABELS[item]}
                  </option>
                ))}
              </select>
            </label>
            <div className="create-colors">
              {MODULAR_PALETTE_ROLES.map((role) => (
                <label key={role} className="create-color">
                  <input
                    aria-label={`${PALETTE_LABELS[role]} eigene Farbe`}
                    data-field={`${role}-aktiv`}
                    type="checkbox"
                    checked={spec.palette[role] !== null}
                    onChange={(event) => setSpec((current) => applyColor(current, role, event.target.checked ? COLOR_START[role] : null))}
                  />
                  <span>{PALETTE_LABELS[role]}</span>
                  <input
                    aria-label={`Farbe ${PALETTE_LABELS[role]}`}
                    data-field={role}
                    type="color"
                    value={spec.palette[role] ?? COLOR_START[role]}
                    disabled={spec.palette[role] === null}
                    onChange={(event) => setSpec((current) => applyColor(current, role, event.target.value))}
                  />
                </label>
              ))}
            </div>
            <p className="create-note">Zubehör gehört zur Figur und ist nicht die Einsatzwaffe.</p>
          </section>
          <section className="create-column create-stage-column" aria-label="Vorschau" data-panel="vorschau">
            <h2>Vorschau</h2>
            <FigurePreview spec={spec} />
            <p data-look-summary="1">
              {library.label} · Kopf {spec.parts.head} · Oberkörper {spec.parts.body} · Beine {spec.parts.legs} · Schuhe {spec.parts.feet}
              {spec.palette.cloth ? ` · Stoff ${spec.palette.cloth}` : ""}
            </p>
          </section>
          <section className="create-column" aria-label="Punkte" data-panel="punkte">
            <h2>Attribute</h2>
            <p data-remaining="attribute">Punkte übrig {attributeLeft}</p>
            {ATTRIBUTE_IDS.map((id) => (
              <PointRow
                key={id}
                id={id}
                label={ATTRIBUTE_LABELS[id]}
                value={sheet.attribute[id]}
                min={ATTRIBUTE_MIN}
                max={ATTRIBUTE_MAX}
                remaining={attributeLeft}
                onChange={(delta) => setSheet((current) => shiftAttribute(current, id, delta))}
              />
            ))}
            <h2>Fertigkeiten</h2>
            <p data-remaining="fertigkeiten">Punkte übrig {skillLeft}</p>
            {SKILL_IDS.map((id) => (
              <PointRow
                key={id}
                id={id}
                label={SKILL_LABELS[id]}
                value={sheet.fertigkeiten[id]}
                min={SKILL_MIN}
                max={SKILL_MAX}
                remaining={skillLeft}
                onChange={(delta) => setSheet((current) => shiftSkill(current, id, delta))}
              />
            ))}
            <p className="create-note">Diese Punkte ändern den Einsatz nicht.</p>
          </section>
        </div>
        <footer className="create-foot">
          <p>Zurück verwirft diesen Entwurf.</p>
          <div className="mission-actions">
            <button type="button" data-action="zurueck" disabled={busy} onClick={onBack}>
              Zurück
            </button>
            <button type="submit" data-action="bestaetigen" disabled={!ready || busy}>
              Bestätigen
            </button>
          </div>
          <p data-error={error ? "1" : "0"}>{error || (pending ? "Verbinden …" : "Der Eintrag entsteht erst mit Bestätigen.")}</p>
        </footer>
      </form>
    </main>
  );
}

function PointRow({
  id,
  label,
  value,
  min,
  max,
  remaining,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  remaining: number;
  onChange: (delta: number) => void;
}) {
  return (
    <div className="create-point" data-stat={id}>
      <span>{label}</span>
      <span className="create-stepper">
        <button type="button" aria-label={`${label} senken`} data-action={`${id}-weniger`} disabled={value <= min} onClick={() => onChange(-1)}>
          −
        </button>
        <strong data-value={value}>{value}</strong>
        <button type="button" aria-label={`${label} erhöhen`} data-action={`${id}-mehr`} disabled={value >= max || remaining <= 0} onClick={() => onChange(1)}>
          +
        </button>
      </span>
      <small>{PLACEHOLDER}</small>
    </div>
  );
}

function FigurePreview({ spec }: { spec: ModularCharacterSpec }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<ModularCharacterPreview | null>(null);
  const specRef = useRef(spec);
  const [ready, setReady] = useState(false);
  const [previewError, setPreviewError] = useState("");
  specRef.current = spec;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const source = spec.source;
    let cancelled = false;
    let mounted: ModularCharacterPreview | null = null;
    previewRef.current = null;
    setReady(false);
    setPreviewError("");
    void mountModularCharacterPreview(host, specRef.current)
      .then((preview) => {
        if (cancelled || specRef.current.source !== source) {
          preview.dispose();
          return;
        }
        mounted = preview;
        previewRef.current = preview;
        preview.setView("iso");
        preview.setSpec(specRef.current);
        setReady(true);
      })
      .catch((caught: unknown) => {
        if (cancelled) return;
        setPreviewError(caught instanceof Error ? caught.message : "Die 3D-Vorschau konnte nicht geladen werden.");
      });
    return () => {
      cancelled = true;
      if (previewRef.current === mounted) previewRef.current = null;
      mounted?.dispose();
    };
  }, [spec.source]);

  useEffect(() => {
    const preview = previewRef.current;
    if (!preview || !ready) return;
    try {
      preview.setSpec(spec);
      setPreviewError("");
    } catch (caught) {
      setPreviewError(caught instanceof Error ? caught.message : "Die Figur konnte nicht aktualisiert werden.");
    }
  }, [spec, ready]);

  return (
    <div className="create-stage" data-preview={previewError ? "fehler" : ready ? "bereit" : "laden"}>
      <div className="create-preview" ref={hostRef} />
      {previewError ? (
        <p className="create-preview-note" data-preview-error="1">
          {previewError}
        </p>
      ) : null}
      {!ready && !previewError ? <p className="create-preview-note">Figur wird geladen …</p> : null}
    </div>
  );
}

function shiftAttribute(sheet: RunnerSheet, id: AttributeId, delta: number): RunnerSheet {
  const next = sheet.attribute[id] + delta;
  if (!fits(sheet.attribute, id, next, ATTRIBUTE_MIN, ATTRIBUTE_MAX, ATTRIBUTE_POOL)) return sheet;
  return { ...sheet, attribute: { ...sheet.attribute, [id]: next } };
}

function shiftSkill(sheet: RunnerSheet, id: SkillId, delta: number): RunnerSheet {
  const next = sheet.fertigkeiten[id] + delta;
  if (!fits(sheet.fertigkeiten, id, next, SKILL_MIN, SKILL_MAX, SKILL_POOL)) return sheet;
  return { ...sheet, fertigkeiten: { ...sheet.fertigkeiten, [id]: next } };
}

function fits(values: Readonly<Record<string, number>>, id: string, next: number, min: number, max: number, pool: number): boolean {
  if (!Number.isInteger(next) || next < min || next > max) return false;
  const total = Object.entries(values).reduce((sum, [key, value]) => sum + (key === id ? next : value), 0);
  return total <= pool;
}

function sum(values: Readonly<Record<string, number>>): number {
  return Object.values(values).reduce((total, value) => total + value, 0);
}

function applySource(current: ModularCharacterSpec, value: string): ModularCharacterSpec {
  if (!isSource(value) || value === current.source) return current;
  const library = getModularLibrary(value);
  const base = createModularCharacterSpec(current.seed, library.defaultVariant, value);
  return {
    ...base,
    stature: current.stature,
    equipment: library.equipment.includes(current.equipment) ? current.equipment : "none",
    palette: { ...current.palette },
  };
}

function applySet(current: ModularCharacterSpec, value: string): ModularCharacterSpec {
  if (!isVariant(value, getModularLibrary(current.source).variants)) return current;
  return { ...current, parts: { head: value, body: value, legs: value, feet: value } };
}

function applyPart(current: ModularCharacterSpec, slot: ModularSlot, value: string): ModularCharacterSpec {
  if (!isVariant(value, getModularLibrary(current.source).variants)) return current;
  return { ...current, parts: { ...current.parts, [slot]: value } };
}

function applyEquipment(current: ModularCharacterSpec, value: string): ModularCharacterSpec {
  if (!isEquipment(value, getModularLibrary(current.source).equipment)) return current;
  return { ...current, equipment: value };
}

function applyColor(current: ModularCharacterSpec, role: ModularPaletteRole, value: string | null): ModularCharacterSpec {
  const color = value === null ? null : value.toUpperCase();
  return { ...current, palette: { ...current.palette, [role]: color } };
}

function roundHundredth(value: number): number {
  if (!Number.isFinite(value)) return 1;
  return Math.round(value * 100) / 100;
}

function isSource(value: string): value is ModularSourceId {
  return MODULAR_SOURCE_IDS.some((source) => source === value);
}

function isVariant(value: string, variants: readonly ModularVariant[]): value is ModularVariant {
  return variants.some((variant) => variant === value);
}

function isEquipment(value: string, equipment: readonly ModularEquipment[]): value is ModularEquipment {
  return equipment.some((item) => item === value);
}
