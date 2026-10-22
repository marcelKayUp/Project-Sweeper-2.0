import { useEffect, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import {
  MODULAR_PALETTE_ROLES,
  MODULAR_SLOTS,
  MODULAR_SOURCE_ID,
  MODULAR_SOURCE_IDS,
  createModularCharacterSpec,
  getModularLibrary,
  randomizeModularCharacterSpec,
  validateModularCharacterSpec,
  type ModularCharacterSpec,
  type ModularEquipment,
  type ModularPaletteRole,
  type ModularSlot,
  type ModularSourceId,
  type ModularVariant,
} from "@neon/characters";
import { mountModularCharacterPreview, type ModularView, type ModularPreviewReport } from "./modularPreview.ts";

const MAX_JSON_BYTES = 32 * 1024;
const MAX_SEED = 0xffff_ffff;
const VIEW_LABELS: Record<ModularView, string> = { front: "Front", iso: "Schräg", back: "Rücken", side: "Seite" };
const SLOT_LABELS: Record<ModularSlot, string> = { head: "Kopf", body: "Oberkörper", legs: "Beine", feet: "Schuhe" };
const PALETTE_LABELS: Record<ModularPaletteRole, string> = { skin: "Haut", hair: "Haare", cloth: "Stoff", armor: "Panzerung", accent: "Akzent" };
const EQUIPMENT_LABELS: Record<ModularEquipment, string> = { none: "Ohne", pistol: "Pistole", sword: "Schwert", backpack: "Rucksack" };

type PreviewController = Awaited<ReturnType<typeof mountModularCharacterPreview>>;

function SettingField({ label, children }: { label: string; children: ReactNode }) {
  return <label className="mw-field"><span>{label}</span>{children}</label>;
}

function safeFilename(id: string, extension: string): string {
  return `${id.trim().replace(/[^a-zA-Z0-9_-]+/g, "-") || "runner"}.${extension}`;
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function formatClip(name: string): string {
  const words = name.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/[_-]+/g, " ").trim();
  return words ? words[0]!.toLocaleUpperCase("de-DE") + words.slice(1) : name;
}

function defaultClip(clips: readonly string[]): string {
  return clips.includes("Idle_Neutral") ? "Idle_Neutral" : clips.includes("Idle") ? "Idle" : clips[0] ?? "";
}

function randomUint32(): number {
  const values = new Uint32Array(1);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) crypto.getRandomValues(values);
  else values[0] = Math.floor(Math.random() * (MAX_SEED + 1));
  return values[0]!;
}

export function ModularCharacterWorkshop() {
  const initial = useRef(createModularCharacterSpec(42, "Casual2"));
  const draftsRef = useRef<Partial<Record<ModularSourceId, ModularCharacterSpec>>>({ [initial.current.source]: initial.current });
  const [spec, setSpec] = useState<ModularCharacterSpec>(initial.current);
  const [idDraft, setIdDraft] = useState(initial.current.id);
  const [seedDraft, setSeedDraft] = useState(String(initial.current.seed));
  const [jsonDraft, setJsonDraft] = useState(() => JSON.stringify(initial.current, null, 2));
  const [jsonErrors, setJsonErrors] = useState<string[]>([]);
  const [editErrors, setEditErrors] = useState<string[]>([]);
  const [status, setStatus] = useState("Casual2 geladen · Originalfarben erhalten");
  const [clip, setClip] = useState("");
  const [playing, setPlaying] = useState(true);
  const [view, setView] = useState<ModularView>("iso");
  const [report, setReport] = useState<ModularPreviewReport | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [mountAttempt, setMountAttempt] = useState(0);
  const [exporting, setExporting] = useState(false);
  const hostRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<PreviewController | null>(null);
  const previewSourceRef = useRef<ModularSourceId | null>(null);
  const specRef = useRef(spec);
  const clipRef = useRef(clip);
  const playingRef = useRef(playing);
  const viewRef = useRef(view);

  useEffect(() => { specRef.current = spec; }, [spec]);
  useEffect(() => { clipRef.current = clip; }, [clip]);
  useEffect(() => { playingRef.current = playing; }, [playing]);
  useEffect(() => { viewRef.current = view; }, [view]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const source = spec.source;
    let cancelled = false;
    let controller: PreviewController | null = null;
    previewRef.current = null;
    previewSourceRef.current = null;
    setReport(null);
    setPreviewError(null);
    const initialForSource = specRef.current.source === source ? specRef.current : draftsRef.current[source] ?? createModularCharacterSpec(42, undefined, source);
    void mountModularCharacterPreview(host, initialForSource).then((mounted) => {
      if (cancelled) {
        mounted.dispose();
        return;
      }
      if (specRef.current.source !== source) {
        mounted.dispose();
        return;
      }
      controller = mounted;
      previewRef.current = mounted;
      previewSourceRef.current = source;
      try {
        const latest = specRef.current;
        if (latest.source !== source) throw new Error("Die Modellquelle hat während des Ladens gewechselt.");
        mounted.setSpec(latest);
        const nextReport = mounted.getReport();
        setReport(nextReport);
        const nextClip = nextReport.clips.includes(clipRef.current) ? clipRef.current : defaultClip(nextReport.clips);
        clipRef.current = nextClip;
        setClip(nextClip);
        if (nextClip) mounted.setClip(nextClip);
        mounted.setPlaying(playingRef.current);
        mounted.setView(viewRef.current);
        setPreviewError(null);
      } catch (error) {
        setPreviewError(error instanceof Error ? error.message : "Die Vorschau konnte nicht eingerichtet werden.");
      }
    }).catch((error: unknown) => {
      if (cancelled) return;
      setPreviewError(error instanceof Error ? error.message : "Die 3D-Vorschau konnte nicht geladen werden.");
    });
    return () => {
      cancelled = true;
      if (controller) {
        if (previewRef.current === controller) {
          previewRef.current = null;
          previewSourceRef.current = null;
        }
        controller.dispose();
      }
    };
  }, [spec.source, mountAttempt]);

  useEffect(() => {
    const preview = previewRef.current;
    if (!preview) return;
    try {
      preview.setSpec(spec);
      const nextReport = preview.getReport();
      setReport(nextReport);
      if (clip && !nextReport.clips.includes(clip)) {
        const fallback = defaultClip(nextReport.clips);
        setClip(fallback);
        clipRef.current = fallback;
        if (fallback) preview.setClip(fallback);
      }
      setPreviewError(null);
    } catch (error) {
      setPreviewError(error instanceof Error ? error.message : "Die Figur konnte nicht aktualisiert werden.");
    }
  }, [spec]);

  useEffect(() => {
    const preview = previewRef.current;
    if (!preview || !clip) return;
    try { preview.setClip(clip); setPreviewError(null); }
    catch (error) { setPreviewError(error instanceof Error ? error.message : "Der Clip konnte nicht abgespielt werden."); }
  }, [clip]);

  useEffect(() => {
    const preview = previewRef.current;
    if (!preview) return;
    try { preview.setPlaying(playing); setPreviewError(null); }
    catch (error) { setPreviewError(error instanceof Error ? error.message : "Die Wiedergabe konnte nicht geändert werden."); }
  }, [playing]);

  useEffect(() => {
    const preview = previewRef.current;
    if (!preview) return;
    try { preview.setView(view); setPreviewError(null); }
    catch (error) { setPreviewError(error instanceof Error ? error.message : "Die Ansicht konnte nicht geändert werden."); }
  }, [view]);

  function commit(candidate: unknown, successMessage = "Figur aktualisiert"): boolean {
    const result = validateModularCharacterSpec(candidate);
    if (!result.ok) {
      setEditErrors([...result.errors]);
      setStatus("Eingabe ungültig · letzter gültiger Entwurf bleibt erhalten");
      return false;
    }
    if (specRef.current.source !== result.value.source) draftsRef.current[specRef.current.source] = specRef.current;
    if (specRef.current.source !== result.value.source) {
      previewRef.current = null;
      previewSourceRef.current = null;
      setReport(null);
      setPreviewError(null);
    }
    draftsRef.current[result.value.source] = result.value;
    specRef.current = result.value;
    setSpec(result.value);
    setIdDraft(result.value.id);
    setSeedDraft(String(result.value.seed));
    setJsonDraft(JSON.stringify(result.value, null, 2));
    setEditErrors([]);
    setStatus(successMessage);
    return true;
  }

  function update<K extends keyof ModularCharacterSpec>(key: K, value: ModularCharacterSpec[K]): void {
    commit({ ...spec, [key]: value });
  }

  function updateIdentity(id: string, seedText: string): void {
    setIdDraft(id);
    setSeedDraft(seedText);
    const seed = /^\d+$/.test(seedText) && Number.isSafeInteger(Number(seedText)) && Number(seedText) <= MAX_SEED ? Number(seedText) : Number.NaN;
    const result = validateModularCharacterSpec({ ...spec, id, seed });
    if (!result.ok) {
      setEditErrors(result.errors.filter((error) => error.startsWith("id:") || error.startsWith("seed:")));
      setStatus("ID oder Seed ungültig · letzter gültiger Entwurf bleibt erhalten");
      return;
    }
    draftsRef.current[result.value.source] = result.value;
    specRef.current = result.value;
    setSpec(result.value);
    setJsonDraft(JSON.stringify(result.value, null, 2));
    setEditErrors([]);
    setStatus("Identität geändert");
  }

  function applyPreset(variant: ModularVariant): void {
    commit({ ...spec, parts: { head: variant, body: variant, legs: variant, feet: variant } }, `${variant} · alle vier Originalteile geladen`);
  }

  function randomize(): void {
    const seed = /^\d+$/.test(seedDraft) && Number.isSafeInteger(Number(seedDraft)) && Number(seedDraft) <= MAX_SEED
      ? Number(seedDraft)
      : Number.NaN;
    if (!Number.isInteger(seed) || seed < 0 || seed > MAX_SEED) {
      setEditErrors(["seed: erwartet wird ein uint32."]);
      setStatus("Seed ungültig · gültigen uint32 eingeben");
      return;
    }
    const varied = randomizeModularCharacterSpec(seed, spec.source);
    commit({ ...varied, id: spec.id }, `Deterministische Seed-Variante ${seed} geladen`);
  }

  function randomizeNewSeed(): void {
    const seed = randomUint32();
    const varied = randomizeModularCharacterSpec(seed, spec.source);
    commit({ ...varied, id: spec.id }, `Neue Seed-Variante ${seed} geladen`);
  }

  function applyJson(): void {
    const bytes = new TextEncoder().encode(jsonDraft).byteLength;
    if (bytes > MAX_JSON_BYTES) {
      setJsonErrors(["Die JSON-Spezifikation ist größer als 32 KiB."]);
      setStatus("Import abgewiesen · aktueller Entwurf bleibt erhalten");
      return;
    }
    try {
      const parsed: unknown = JSON.parse(jsonDraft);
      const result = validateModularCharacterSpec(parsed);
      if (!result.ok) {
        setJsonErrors([...result.errors]);
        setStatus("Import abgewiesen · aktueller Entwurf bleibt erhalten");
        return;
      }
      setJsonErrors([]);
      commit(result.value, "JSON geprüft und übernommen");
    } catch {
      setJsonErrors(["Der Text enthält kein gültiges JSON."]);
      setStatus("Import abgewiesen · aktueller Entwurf bleibt erhalten");
    }
  }

  async function importFile(event: ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;
    if (file.size > MAX_JSON_BYTES) {
      setJsonErrors(["Die JSON-Datei ist größer als 32 KiB."]);
      setStatus("Import abgewiesen · aktueller Entwurf bleibt erhalten");
      return;
    }
    try {
      const text = await file.text();
      setJsonDraft(text);
      try {
        const result = validateModularCharacterSpec(JSON.parse(text) as unknown);
        if (!result.ok) { setJsonErrors([...result.errors]); setStatus("Import abgewiesen · aktueller Entwurf bleibt erhalten"); return; }
        setJsonErrors([]);
        commit(result.value, `„${file.name}“ geprüft und übernommen`);
      } catch {
        setJsonErrors(["Die Datei enthält kein gültiges JSON."]);
        setStatus("Import abgewiesen · aktueller Entwurf bleibt erhalten");
      }
    } catch {
      setJsonErrors(["Die Datei konnte nicht gelesen werden."]);
    }
  }

  async function exportGlb(): Promise<void> {
    const preview = previewRef.current;
    const source = spec.source;
    if (!preview || previewSourceRef.current !== source || exporting) return;
    const snapshot = spec;
    if (snapshot.source !== source) return;
    setExporting(true);
    setStatus("GLB-Export wird vorbereitet …");
    try {
      preview.setSpec(snapshot);
      const blob = await preview.exportGlb();
      downloadBlob(blob, safeFilename(snapshot.id, "glb"));
      setStatus("GLB-Datei heruntergeladen");
    } catch (error) {
      setStatus(`GLB-Export fehlgeschlagen: ${error instanceof Error ? error.message : "Bitte erneut versuchen."}`);
    } finally {
      setExporting(false);
    }
  }

  const fileInput = useRef<HTMLInputElement>(null);
  const library = getModularLibrary(spec.source);
  const variants = library.variants;
  const equipment = library.equipment;
  const previewReady = report !== null && previewError === null && previewSourceRef.current === spec.source;

  function changeSource(source: ModularSourceId): void {
    const current = specRef.current;
    if (source === current.source) return;
    draftsRef.current[current.source] = current;
    const next = draftsRef.current[source] ?? createModularCharacterSpec(42, undefined, source);
    draftsRef.current[source] = next;
    previewRef.current = null;
    previewSourceRef.current = null;
    specRef.current = next;
    setReport(null);
    setPreviewError(null);
    setSpec(next);
    setIdDraft(next.id);
    setSeedDraft(String(next.seed));
    setJsonDraft(JSON.stringify(next, null, 2));
    setEditErrors([]);
    setJsonErrors([]);
    setStatus(`${getModularLibrary(source).label} · Entwurf geladen`);
  }

  return <main className="modular-workshop" data-screen="modular-character-workshop">
    <header className="mw-header">
      <a className="mw-brand" href="/characters.html" aria-label="Zur Figuren-Werkstatt">
        <span className="mw-brand-mark" aria-hidden="true">NC</span><span><strong>NEON CONTRACT</strong><small>MODULARE FIGUREN</small></span>
      </a>
      <div className="mw-heading"><span className="mw-eyebrow">NATIVE MODELLBIBLIOTHEKEN</span><h1>Figuren-Werkstatt</h1></div>
      <a className="mw-legacy-link" href="?quelle=prozedural">Zur prozeduralen Werkstatt</a>
    </header>

    <div className="mw-layout">
      <aside className="mw-side mw-left" aria-label="Identität und Modellvorlage">
        <section className="mw-panel">
          <div className="mw-title"><span>IDENTITÄT</span><span className="mw-index">01</span></div>
          <SettingField label="Körpermodell"><select aria-label="Körpermodell" value={spec.source} onChange={(event) => changeSource(event.target.value as ModularSourceId)}>{MODULAR_SOURCE_IDS.map((source) => <option value={source} key={source}>{getModularLibrary(source).label}</option>)}</select></SettingField>
          <SettingField label="Figuren-ID"><input aria-label="Figuren-ID" value={idDraft} maxLength={64} onChange={(event) => updateIdentity(event.target.value, seedDraft)} /></SettingField>
          <SettingField label="Seed · uint32"><span className="mw-inline"><input aria-label="Seed" inputMode="numeric" value={seedDraft} onChange={(event) => updateIdentity(idDraft, event.target.value)} /><button type="button" className="mw-button mw-icon-button" onClick={randomize} aria-label="Deterministische Variante aus dem sichtbaren Seed erzeugen">↻</button></span></SettingField>
          <button type="button" className="mw-button mw-new-seed" onClick={randomizeNewSeed}>Neuen Zufalls-Seed erzeugen</button>
          {editErrors.length > 0 && <div className="mw-errors" role="alert"><strong>Eingabe nicht übernommen</strong><ul>{editErrors.map((error) => <li key={error}>{error}</li>)}</ul></div>}
        </section>

        <section className="mw-panel">
          <div className="mw-title"><span>NATIVE VORLAGEN</span><span className="mw-index">{variants.length}</span></div>
          <SettingField label="Komplettes Set"><select aria-label="Modellvorlage" value={variants.find((variant) => Object.values(spec.parts).every((part) => part === variant)) ?? ""} onChange={(event) => { if (event.target.value) applyPreset(event.target.value as ModularVariant); }}><option value="" disabled>Vier Teile einzeln gemischt</option>{variants.map((variant) => <option value={variant} key={variant}>{variant}</option>)}</select></SettingField>
          <p className="mw-note">Jede Vorlage setzt Kopf, Oberkörper, Beine und Schuhe als zusammengehöriges Originalset.</p>
        </section>

        <section className="mw-panel mw-source-panel">
          <div className="mw-title"><span>QUELLE &amp; RECHT</span><span className="mw-source-dot" /></div>
          {spec.source === MODULAR_SOURCE_ID ? <>
            <p>Quaternius · Ultimate Modular Characters</p>
            <a href="https://quaternius.com/packs/ultimatemodularcharacters.html" target="_blank" rel="noreferrer">CC0-Quelle ansehen ↗</a>
            <small>CC0 1.0 · 11 native Varianten · 4 kombinierbare Slots</small>
          </> : <>
            <p>Modulare Frauenbibliothek</p>
            <small>Nutzerquelle · Herkunftsbeleg offen</small>
            <small>10 native Varianten · 4 kombinierbare Slots · Lizenz ungeprüft</small>
          </>}
        </section>
      </aside>

      <section className="mw-stage-column" aria-label="Echte 3D-Figur">
        <div className="mw-stage-head"><span><i className="mw-live-dot" /> LIVE-VORSCHAU</span><span>{spec.id || "UNBENANNT"}</span></div>
        <div className="mw-stage" data-testid="modular-character-preview">
          <div className="mw-stage-grid" aria-hidden="true" />
          <div className="mw-preview-host" ref={hostRef} />
          {previewError && <div className="mw-preview-error" role="alert"><strong>3D-Vorschau nicht verfügbar</strong><span>{previewError}</span><button type="button" className="mw-button" onClick={() => { setReport(null); setMountAttempt((attempt) => attempt + 1); }}>Vorschau erneut laden</button></div>}
          {!report && !previewError && <div className="mw-loading" role="status">{library.label}es Modell wird geladen …</div>}
          <div className="mw-stage-tag"><span>GLB · {library.label.toLocaleUpperCase("de-DE")}</span><strong>{spec.parts.body}</strong></div>
        </div>
        <div className="mw-view-bar"><span className="mw-caption">ANSICHT</span><div className="mw-segmented" role="group" aria-label="Kameraansicht">{(Object.keys(VIEW_LABELS) as ModularView[]).map((item) => <button type="button" key={item} aria-pressed={view === item} onClick={() => setView(item)}>{VIEW_LABELS[item]}</button>)}</div><span className="mw-camera-note">ORTHOGRAFISCH · STUDIO</span></div>
        <div className="mw-motion-bar">
          <label><span className="mw-caption">NATIVE ANIMATION</span><select aria-label="Native Animation" value={clip} onChange={(event) => setClip(event.target.value)} disabled={!report?.clips.length}>{(report?.clips ?? []).map((name) => <option value={name} key={name}>{formatClip(name)}</option>)}</select></label>
          <button type="button" className="mw-play" aria-label={playing ? "Animation pausieren" : "Animation abspielen"} onClick={() => setPlaying((value) => !value)} disabled={!previewReady}>{playing ? "Ⅱ" : "▶"}</button>
          <span className="mw-playing-label">{playing ? "ABSPIELEN" : "PAUSIERT"}</span>
        </div>
        <div className="mw-stats" aria-label="Messwerte der geladenen Figur">
          <div><span>DREIECKE</span><strong>{report?.triangles.toLocaleString("de-DE") ?? "—"}</strong></div>
          <div><span>VERTICES</span><strong>{report?.vertices.toLocaleString("de-DE") ?? "—"}</strong></div>
          <div><span>MATERIALIEN</span><strong>{report?.materials ?? "—"}</strong></div>
          <div><span>KNOCHEN</span><strong>{report?.bones ?? "—"}<small> / 62</small></strong></div>
        </div>
        {report && <div className="mw-report-line"><span>Figurenhöhe {report.height.toFixed(2)} u</span><span>{report.clips.length} native Clips</span><span className="mw-clip-list">{report.clips.map(formatClip).join(" · ")}</span></div>}
        <div className="mw-status" role="status" aria-live="polite"><span aria-hidden="true">●</span>{exporting ? "GLB wird exportiert …" : status}</div>
      </section>

      <aside className="mw-side mw-right" aria-label="Modulare Anpassungen und Export">
        <section className="mw-panel mw-parts-panel">
          <div className="mw-panel-heading"><div><span className="mw-eyebrow">TEILE AUS ORIGINAL-ASSET</span><h2>Figur mischen</h2></div><span className="mw-index">04</span></div>
          {MODULAR_SLOTS.map((slot) => <SettingField key={slot} label={SLOT_LABELS[slot]}><select aria-label={SLOT_LABELS[slot]} value={spec.parts[slot]} onChange={(event) => update("parts", { ...spec.parts, [slot]: event.target.value as ModularVariant })}>{variants.map((variant) => <option key={variant} value={variant}>{variant}</option>)}</select></SettingField>)}
          <SettingField label="Ausrüstung"><select aria-label="Ausrüstung" value={spec.equipment} onChange={(event) => update("equipment", event.target.value as ModularEquipment)}>{equipment.map((item) => <option key={item} value={item}>{EQUIPMENT_LABELS[item]}</option>)}</select></SettingField>
          <SettingField label="Körpergröße · uniforme Skalierung"><span className="mw-range"><input aria-label="Körpergröße" type="range" min="0.9" max="1.15" step="0.01" value={spec.stature} onChange={(event) => update("stature", Number(event.target.value))} /><output>{spec.stature.toFixed(2)}</output></span></SettingField>
        </section>

        <section className="mw-panel mw-palette-panel">
          <div className="mw-title"><span>FARBÜBERSCHREIBUNGEN</span><span className="mw-index">OPTIONAL</span></div>
          {MODULAR_PALETTE_ROLES.map((role) => <label className="mw-color-row" key={role}>
            <input aria-label={`${PALETTE_LABELS[role]}-Farbe überschreiben`} type="checkbox" checked={spec.palette[role] !== null} onChange={(event) => update("palette", { ...spec.palette, [role]: event.target.checked ? "#FFFFFF" : null })} />
            <span>{PALETTE_LABELS[role]}</span>
            <input aria-label={`Farbe ${PALETTE_LABELS[role]}`} type="color" value={spec.palette[role] ?? "#ffffff"} disabled={spec.palette[role] === null} onChange={(event) => update("palette", { ...spec.palette, [role]: event.target.value })} />
            <button className="mw-original" type="button" onClick={() => update("palette", { ...spec.palette, [role]: null })}>Original</button>
          </label>)}
          <p className="mw-note">Originalfarben der Quelle bleiben erhalten, solange kein Feld aktiviert ist.</p>
        </section>

        <section className="mw-panel mw-json-panel">
          <div className="mw-title"><label htmlFor="mw-json">JSON-SPEZIFIKATION</label><span className="mw-index">MAX. 32 KiB</span></div>
          <textarea id="mw-json" aria-label="Figuren-JSON bearbeiten" spellCheck={false} value={jsonDraft} onChange={(event) => { setJsonDraft(event.target.value); setJsonErrors([]); }} />
          {jsonErrors.length > 0 && <div className="mw-errors" role="alert"><strong>JSON nicht übernommen</strong><ul>{jsonErrors.map((error) => <li key={error}>{error}</li>)}</ul><span>Die aktuelle Vorschau bleibt erhalten.</span></div>}
          <input ref={fileInput} className="mw-file-input" type="file" accept="application/json,.json" aria-label="JSON-Datei auswählen" onChange={importFile} />
          <div className="mw-json-actions"><button type="button" className="mw-button" onClick={() => fileInput.current?.click()}>Datei laden</button><button type="button" className="mw-button" onClick={applyJson}>JSON prüfen &amp; übernehmen</button><button type="button" className="mw-button mw-subtle" onClick={() => { downloadBlob(new Blob([`${JSON.stringify(spec, null, 2)}\n`], { type: "application/json" }), safeFilename(spec.id, "json")); setStatus("JSON-Spezifikation heruntergeladen"); }}>JSON herunterladen</button></div>
        </section>

        <section className="mw-export-panel">
          <div><span className="mw-eyebrow">AUSGABE</span><h2>Modell exportieren</h2><p>Native {library.label.toLocaleLowerCase("de-DE")}‑Teile, Rig und Animationen als GLB.</p></div>
          <button type="button" className="mw-button mw-export-button" onClick={exportGlb} disabled={!previewReady || exporting}>{exporting ? "Export läuft …" : "GLB exportieren ↗"}</button>
          <small>{spec.source === MODULAR_SOURCE_ID ? "Quelle: CC0" : "Quelle: Herkunftsbeleg offen · Lizenz ungeprüft"} · {report?.bones ?? 62} Knochen · {report?.materials ?? "—"} Materialien</small>
        </section>
      </aside>
    </div>
    <footer className="mw-footer"><span>{library.label} · Originalmesh und Originalfarben</span><span>Crouch und Reload fehlen in beiden Bibliotheken.</span></footer>
  </main>;
}
