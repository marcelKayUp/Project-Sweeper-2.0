import { useEffect, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import {
  CLIP_NAMES,
  createCharacterSpec,
  randomizeCharacterSpec,
  validateCharacterSpec,
  type AccessoryType,
  type BodyType,
  type CharacterPalette,
  type CharacterSpec,
  type ClipName,
  type HairType,
  type OutfitType,
  type PaletteRole,
} from "@neon/characters";
import { mountCharacterPreview, type CharacterView } from "./preview.ts";

const MAX_JSON_BYTES = 32 * 1024;
const MAX_SEED = 0xffff_ffff;

const CLIP_LABELS: Record<ClipName, string> = {
  idle: "Leerlauf",
  walk: "Gehen",
  crouch: "Ducken",
  shoot: "Schießen",
  reload: "Nachladen",
  hit: "Treffer",
  death: "Zu Boden",
};

const VIEW_LABELS: Record<CharacterView, string> = {
  front: "Front",
  iso: "Iso",
  back: "Rückseite",
  side: "Seite",
};

const BODY_OPTIONS: readonly [BodyType, string][] = [
  ["lean", "Schlank"], ["standard", "Standard"], ["heavy", "Kräftig"],
];
const HAIR_OPTIONS: readonly [HairType, string][] = [
  ["none", "Keine"], ["crop", "Kurz"], ["mohawk", "Irokese"], ["bob", "Bob"],
];
const OUTFIT_OPTIONS: readonly [OutfitType, string][] = [
  ["runner", "Runner"], ["guard", "Wache"], ["tech", "Techniker"],
];
const ACCESSORY_OPTIONS: readonly [AccessoryType, string][] = [
  ["none", "Ohne"], ["visor", "Visier"], ["goggles", "Schutzbrille"], ["headset", "Headset"],
];

const PALETTE_LABELS: Record<PaletteRole, string> = {
  skin: "Haut",
  hair: "Haare",
  cloth: "Stoff",
  armor: "Panzerung",
  accent: "Akzent",
};

const PRESETS: Record<"runner" | "guard" | "tech", Partial<CharacterSpec>> = {
  runner: {
    body: "lean", hair: "crop", outfit: "runner", accessory: "visor",
    palette: { skin: "#d9a27f", hair: "#1c2531", cloth: "#1c3444", armor: "#314b59", accent: "#ff4f9a" },
  },
  guard: {
    body: "heavy", hair: "none", outfit: "guard", accessory: "goggles",
    palette: { skin: "#bd8968", hair: "#222329", cloth: "#292e34", armor: "#53636c", accent: "#63d9c5" },
  },
  tech: {
    body: "standard", hair: "bob", outfit: "tech", accessory: "headset",
    palette: { skin: "#e0b28e", hair: "#7e577c", cloth: "#253344", armor: "#516b70", accent: "#b7f06d" },
  },
};

type PreviewController = ReturnType<typeof mountCharacterPreview>;
type PreviewReport = ReturnType<PreviewController["getReport"]>;

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function downloadJson(spec: CharacterSpec): void {
  const safeId = spec.id.trim().replace(/[^a-zA-Z0-9_-]+/g, "-") || "runner";
  downloadBlob(new Blob([`${JSON.stringify(spec, null, 2)}\n`], { type: "application/json" }), `${safeId}.json`);
}

function SettingField({ label, children }: { label: string; children: ReactNode }) {
  return <label className="cw-field"><span>{label}</span>{children}</label>;
}

export function CharacterWorkshop() {
  const [spec, setSpec] = useState<CharacterSpec>(() => createCharacterSpec(42));
  const [idDraft, setIdDraft] = useState(() => createCharacterSpec(42).id);
  const [seedDraft, setSeedDraft] = useState("42");
  const [clip, setClip] = useState<ClipName>("idle");
  const [playing, setPlaying] = useState(true);
  const [view, setView] = useState<CharacterView>("iso");
  const [report, setReport] = useState<PreviewReport | null>(null);
  const [previewError, setPreviewError] = useState(false);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [editErrors, setEditErrors] = useState<string[]>([]);
  const [status, setStatus] = useState("Entwurf geladen");
  const [exporting, setExporting] = useState(false);
  const previewHost = useRef<HTMLDivElement>(null);
  const preview = useRef<PreviewController | null>(null);
  const appliedSpec = useRef<CharacterSpec | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!previewHost.current) return;
    let controller: PreviewController;
    try {
      controller = mountCharacterPreview(previewHost.current, spec);
      preview.current = controller;
      appliedSpec.current = spec;
      setReport(controller.getReport());
      setPreviewError(false);
    } catch {
      setPreviewError(true);
      return;
    }
    return () => {
      if (preview.current === controller) preview.current = null;
      controller.dispose();
    };
    // The viewer owns its lifetime. Spec and controls are applied by the effects below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const controller = preview.current;
    if (!controller || appliedSpec.current === spec) return;
    try {
      appliedSpec.current = spec;
      controller.setSpec(spec);
      setReport(controller.getReport());
      setPreviewError(false);
    } catch {
      setPreviewError(true);
    }
  }, [spec]);

  useEffect(() => {
    const controller = preview.current;
    if (!controller) return;
    try {
      controller.setClip(clip);
    } catch {
      setPreviewError(true);
    }
  }, [clip]);

  useEffect(() => {
    const controller = preview.current;
    if (!controller) return;
    try {
      controller.setPlaying(playing);
    } catch {
      setPreviewError(true);
    }
  }, [playing]);

  useEffect(() => {
    const controller = preview.current;
    if (!controller) return;
    try {
      controller.setView(view);
    } catch {
      setPreviewError(true);
    }
  }, [view]);

  function update<K extends keyof CharacterSpec>(key: K, value: CharacterSpec[K]): void {
    const result = validateCharacterSpec({ ...spec, [key]: value });
    if (!result.ok) {
      setEditErrors([...result.errors]);
      setStatus("Eingabe ungültig; letzter gültiger Entwurf bleibt erhalten");
      return;
    }
    setSpec(result.value);
    const seedValue = /^\d+$/.test(seedDraft) && Number.isSafeInteger(Number(seedDraft)) && Number(seedDraft) <= MAX_SEED
      ? Number(seedDraft)
      : Number.NaN;
    const identityCheck = validateCharacterSpec({ ...result.value, id: idDraft, seed: seedValue });
    setEditErrors(identityCheck.ok ? [] : identityCheck.errors.filter((error) => error.startsWith("id:") || error.startsWith("seed:")));
    setStatus("Entwurf geändert");
  }

  function changeId(value: string): void {
    setIdDraft(value);
    applyIdentityDraft(value, seedDraft);
  }

  function changeSeed(value: string): void {
    setSeedDraft(value);
    applyIdentityDraft(idDraft, value);
  }

  function applyIdentityDraft(idValue: string, seedValue: string): void {
    const candidateSeed = /^\d+$/.test(seedValue) && Number.isSafeInteger(Number(seedValue)) && Number(seedValue) <= MAX_SEED
      ? Number(seedValue)
      : Number.NaN;
    const result = validateCharacterSpec({ ...spec, id: idValue, seed: candidateSeed });
    if (!result.ok) {
      setEditErrors([...result.errors]);
      setStatus("Eingabe ungültig; letzter gültiger Entwurf bleibt erhalten");
      return;
    }
    setSpec(result.value);
    setEditErrors([]);
    setStatus("Entwurf geändert");
  }

  function applyPreset(name: "runner" | "guard" | "tech"): void {
    const preset = PRESETS[name];
    const next = { ...spec, ...preset, palette: preset.palette as CharacterPalette };
    const result = validateCharacterSpec(next);
    if (!result.ok) return;
    setSpec(result.value);
    setIdDraft(result.value.id);
    setSeedDraft(String(result.value.seed));
    setEditErrors([]);
    setStatus(`${name === "runner" ? "Runner" : name === "guard" ? "Wache" : "Techniker"}-Vorlage geladen`);
  }

  function makeVariant(): void {
    const nextSeed = spec.seed >= MAX_SEED ? 0 : spec.seed + 1;
    const varied = randomizeCharacterSpec(nextSeed);
    setSpec({ ...varied, id: spec.id });
    setIdDraft(spec.id);
    setSeedDraft(String(nextSeed));
    setEditErrors([]);
    setStatus(`Seed-Variante ${nextSeed} geladen`);
  }

  async function importFile(event: ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;
    if (file.size > MAX_JSON_BYTES) {
      setImportErrors(["Die JSON-Datei ist größer als 32 KiB und wurde nicht geladen."]);
      setStatus("Import abgewiesen; der aktuelle Entwurf bleibt erhalten");
      return;
    }
    try {
      const parsed: unknown = JSON.parse(await file.text());
      const result = validateCharacterSpec(parsed);
      if (!result.ok) {
        setImportErrors([...result.errors]);
        setStatus("Import abgewiesen; der aktuelle Entwurf bleibt erhalten");
        return;
      }
      setSpec(result.value);
      setIdDraft(result.value.id);
      setSeedDraft(String(result.value.seed));
      setEditErrors([]);
      setImportErrors([]);
      setStatus(`„${file.name}“ geladen`);
    } catch {
      setImportErrors(["Die Datei enthält kein lesbares JSON."]);
      setStatus("Import abgewiesen; der aktuelle Entwurf bleibt erhalten");
    }
  }

  async function exportGlb(): Promise<void> {
    const controller = preview.current;
    if (!controller || exporting) return;
    setExporting(true);
    setStatus("GLB wird vorbereitet …");
    const exportSpec = spec;
    try {
      const blob = await controller.exportGlb();
      const safeId = exportSpec.id.trim().replace(/[^a-zA-Z0-9_-]+/g, "-") || "runner";
      downloadBlob(blob, `${safeId}.glb`);
      setStatus("GLB-Datei heruntergeladen");
    } catch {
      setStatus("GLB-Export fehlgeschlagen. Bitte erneut versuchen.");
    } finally {
      setExporting(false);
    }
  }

  function reset(): void {
    const initial = createCharacterSpec(42);
    setSpec(initial);
    setIdDraft(initial.id);
    setSeedDraft(String(initial.seed));
    setClip("idle");
    setPlaying(true);
    setView("iso");
    setImportErrors([]);
    setEditErrors([]);
    setStatus("Werkstatt zurückgesetzt");
  }

  return (
    <main className="character-workshop" data-screen="character-workshop">
      <header className="cw-header">
        <div className="cw-brand" aria-label="Neon Contract">
          <span className="cw-brand-mark" aria-hidden="true">NC</span>
          <span><strong>NEON CONTRACT</strong><small>LOCAL ASSET LAB · 01</small></span>
        </div>
        <div className="cw-heading"><span className="cw-eyebrow">PRODUKTIONSWERKZEUG</span><h1>Figuren-Werkstatt</h1></div>
        <div className="cw-header-state"><i aria-hidden="true" /> LOKALER ENTWURF</div>
      </header>

      <div className="cw-layout">
        <aside className="cw-rail" aria-label="Figurenentwurf">
          <section className="cw-block cw-identity">
            <div className="cw-section-title"><span>01 / IDENTITÄT</span><span className="cw-dot" /></div>
            <SettingField label="Figuren-ID">
              <input aria-label="Figuren-ID" value={idDraft} maxLength={64} onChange={(event) => changeId(event.target.value)} />
            </SettingField>
            <SettingField label="Seed · 0 bis 4.294.967.295">
              <input aria-label="Seed" type="text" inputMode="numeric" value={seedDraft} onChange={(event) => changeSeed(event.target.value)} />
            </SettingField>
            {editErrors.length > 0 && <div className="cw-import-errors" role="alert" aria-label="Ungültige Eingabe">
              <strong>Eingabe nicht übernommen</strong>
              <ul>{editErrors.map((error, index) => <li key={`${index}-${error}`}>{error}</li>)}</ul>
              <span>Der zuletzt gültige Entwurf bleibt erhalten.</span>
            </div>}
            <button className="cw-button cw-button-subtle cw-full" type="button" onClick={makeVariant}>↻ <span>Seed-Variante</span></button>
          </section>

          <section className="cw-block">
            <div className="cw-section-title"><span>02 / STARTPUNKT</span></div>
            <div className="cw-presets" aria-label="Vorlagen">
              <button type="button" className="cw-preset preset-runner" onClick={() => applyPreset("runner")}><span className="cw-preset-icon">01</span><span><strong>Runner</strong><small>Leicht · flexibel</small></span></button>
              <button type="button" className="cw-preset preset-guard" onClick={() => applyPreset("guard")}><span className="cw-preset-icon">02</span><span><strong>Wache</strong><small>Robust · gepanzert</small></span></button>
              <button type="button" className="cw-preset preset-tech" onClick={() => applyPreset("tech")}><span className="cw-preset-icon">03</span><span><strong>Techniker</strong><small>Werkzeug · Signal</small></span></button>
            </div>
          </section>

          <section className="cw-block cw-file-tools">
            <div className="cw-section-title"><span>03 / SPEZIFIKATION</span></div>
            <input ref={fileInput} className="cw-file-input" type="file" accept="application/json,.json" aria-label="JSON-Spezifikation importieren" onChange={importFile} />
            <button className="cw-button cw-full" type="button" onClick={() => fileInput.current?.click()}>JSON importieren</button>
            {importErrors.length > 0 && <div className="cw-import-errors" role="alert" aria-label="Importfehler">
              <strong>Import nicht übernommen</strong>
              <ul>{importErrors.map((error, index) => <li key={`${index}-${error}`}>{error}</li>)}</ul>
              <span>Der bisherige Entwurf ist erhalten.</span>
            </div>}
            <button className="cw-button cw-button-subtle cw-full" type="button" onClick={() => { downloadJson(spec); setStatus("JSON-Spezifikation heruntergeladen"); }}>JSON herunterladen</button>
            <button className="cw-button cw-button-reset cw-full" type="button" onClick={reset}>Auf Anfangswerte setzen</button>
          </section>

          <section className="cw-export">
            <div className="cw-export-glow" aria-hidden="true" />
            <span className="cw-section-title">AUSGABE</span>
            <h2>GLB-Ausgabe</h2>
            <p>Speichert die aktuelle Figur mit Rig und sieben Clips als GLB-Datei.</p>
            <button className="cw-button cw-button-export cw-full" type="button" onClick={exportGlb} disabled={exporting || previewError}>
              {exporting ? <><span className="cw-spinner" aria-hidden="true" /> Export läuft …</> : <>GLB exportieren <span aria-hidden="true">↗</span></>}
            </button>
          </section>
        </aside>

        <section className="cw-stage-column" aria-label="3D-Vorschau">
          <div className="cw-stage-topline"><span><i className="cw-live-dot" /> VORSCHAU · 3D</span><span>Y ↑ &nbsp; / &nbsp; +Z</span></div>
          <div className="cw-stage" data-testid="character-preview">
            <div className="cw-stage-grid" aria-hidden="true" />
            <div className="cw-stage-rings" aria-hidden="true"><span /><span /><span /></div>
            <div className="cw-preview-host" ref={previewHost} />
            <div className="cw-stage-label"><span className="cw-stage-number">NC / 01</span><span>{spec.id || "UNBENANNT"}</span></div>
            {previewError && <div className="cw-preview-message" role="status">3D-Vorschau gerade nicht verfügbar.</div>}
            <div className="cw-axis" aria-hidden="true"><span>Y</span><i /><small>+Z</small></div>
          </div>
          <div className="cw-camera-bar">
            <span className="cw-control-caption">KAMERA</span>
            <div className="cw-segmented" aria-label="Kamerawinkel">
              {(["front", "iso", "back", "side"] as const).map((camera) => <button key={camera} type="button" aria-pressed={view === camera} onClick={() => setView(camera)}>{VIEW_LABELS[camera]}</button>)}
            </div>
            <span className="cw-camera-note">ORTHOGRAFISCH · STUDIO 01</span>
          </div>
          <div className="cw-playback">
            <div className="cw-playback-title"><span className="cw-control-caption">BEWEGUNG</span><span className="cw-clip-source">Pilotanimationen</span></div>
            <div className="cw-playback-row">
              <label className="cw-clip-select"><span className="sr-only">Bewegungsclip</span>
                <select aria-label="Bewegungsclip" value={clip} onChange={(event) => setClip(event.target.value as ClipName)}>
                  {CLIP_NAMES.map((name) => <option key={name} value={name}>{CLIP_LABELS[name]}</option>)}
                </select>
              </label>
              <button className="cw-play-button" type="button" aria-label={playing ? "Animation pausieren" : "Animation abspielen"} onClick={() => setPlaying((value) => !value)}>{playing ? "Ⅱ" : "▶"}</button>
              <span className="cw-play-label">{playing ? "ABSPIELEN" : "PAUSIERT"}</span>
            </div>
          </div>
          <div className="cw-stats" aria-label="Figurenbericht">
            <div><span>DREIECKE</span><strong>{report?.triangles.toLocaleString("de-DE") ?? "—"}</strong></div>
            <div><span>MATERIALIEN</span><strong>{report?.materials ?? "—"}<small> / 5</small></strong></div>
            <div><span>GELENKE</span><strong>{report?.bones ?? "—"}</strong></div>
            <div><span>CLIPS</span><strong>{report?.clips.length ?? "—"}<small> / 7</small></strong></div>
          </div>
          <div className="cw-status" role="status" aria-live="polite"><span className="cw-status-icon" aria-hidden="true">·</span>{exporting ? "GLB wird vorbereitet …" : status}</div>
        </section>

        <aside className="cw-controls" aria-label="Figur anpassen">
          <div className="cw-controls-heading"><div><span className="cw-eyebrow">CHARACTER BUILD</span><h2>Figur anpassen</h2></div><span className="cw-step-mark">04</span></div>
          <section className="cw-control-group">
            <div className="cw-section-title"><span>KÖRPER</span><span className="cw-control-index">A</span></div>
            <SettingField label="Körperform"><select aria-label="Körperform" value={spec.body} onChange={(event) => update("body", event.target.value as BodyType)}>{BODY_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></SettingField>
            <SettingField label="Größe"><span className="cw-range-row"><input aria-label="Größe" type="range" min="0.9" max="1.15" step="0.01" value={spec.stature} onChange={(event) => update("stature", Number(event.target.value))} /><output>{spec.stature.toFixed(2)}</output></span></SettingField>
          </section>
          <section className="cw-control-group">
            <div className="cw-section-title"><span>ERSCHEINUNG</span><span className="cw-control-index">B</span></div>
            <SettingField label="Frisur"><select aria-label="Frisur" value={spec.hair} onChange={(event) => update("hair", event.target.value as HairType)}>{HAIR_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></SettingField>
            <SettingField label="Outfit"><select aria-label="Outfit" value={spec.outfit} onChange={(event) => update("outfit", event.target.value as OutfitType)}>{OUTFIT_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></SettingField>
            <SettingField label="Zubehör"><select aria-label="Zubehör" value={spec.accessory} onChange={(event) => update("accessory", event.target.value as AccessoryType)}>{ACCESSORY_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></SettingField>
          </section>
          <section className="cw-control-group cw-palette-group">
            <div className="cw-section-title"><span>FARBPALETTE</span><span className="cw-control-index">C</span></div>
            {(Object.keys(PALETTE_LABELS) as PaletteRole[]).map((role) => <label className="cw-color-row" key={role}>
              <span className={`cw-color-swatch swatch-${role}`}><input aria-label={`Farbe ${PALETTE_LABELS[role]}`} type="color" value={spec.palette[role]} onChange={(event) => update("palette", { ...spec.palette, [role]: event.target.value })} /></span>
              <span>{PALETTE_LABELS[role]}</span><code>{spec.palette[role].toUpperCase()}</code>
            </label>)}
          </section>
          <div className="cw-controls-footer"><span>VORLÄUFIGE KOSMETISCHE VARIANTE</span><span>SCHEMA 1.0</span></div>
        </aside>
      </div>
    </main>
  );
}
