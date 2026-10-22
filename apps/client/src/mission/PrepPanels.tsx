import { helpSections } from "./helpCopy.ts";
import { defaultPreferences, preferenceMarks, type UiPreferences } from "./preferences.ts";

export function SettingsPanel({
  prefs,
  onChange,
  onBack,
}: {
  prefs: UiPreferences;
  onChange: (next: UiPreferences) => void;
  onBack: () => void;
}) {
  return (
    <main className="mission mission-gate" data-screen="einstellungen" {...preferenceMarks(prefs)}>
      <section className="mission-card">
        <p className="kicker">Lokal</p>
        <h1>Einstellungen</h1>
        <p>Diese Wahl bleibt auf diesem Gerät. Sie ändert weder AP noch die Crewfrist.</p>
        <div className="mission-actions">
          {([100, 115, 125] as const).map((scale) => (
            <button key={scale} type="button" data-scale-choice={scale} aria-pressed={prefs.scale === scale} onClick={() => onChange({ ...prefs, scale })}>
              {scale}%
            </button>
          ))}
        </div>
        <div className="mission-actions">
          <button type="button" data-contrast-choice="1" aria-pressed={prefs.contrast} onClick={() => onChange({ ...prefs, contrast: !prefs.contrast })}>
            Kontrastmarken
          </button>
          <button type="button" data-motion-choice="reduce" aria-pressed={prefs.reduceMotion} onClick={() => onChange({ ...prefs, reduceMotion: !prefs.reduceMotion })}>
            Weniger Bewegung
          </button>
          <button type="button" data-action="standard" onClick={() => onChange(defaultPreferences)}>
            Standard wiederherstellen
          </button>
        </div>
        <button type="button" data-action="zurueck" onClick={onBack}>
          Zurück
        </button>
      </section>
    </main>
  );
}

export function HelpPanel({ prefs, onBack }: { prefs: UiPreferences; onBack: () => void }) {
  return (
    <main className="mission mission-gate" data-screen="hilfe" {...preferenceMarks(prefs)}>
      <section className="mission-card">
        <p className="kicker">Ghost Floor</p>
        <h1>Hilfe</h1>
        {helpSections.map((section) => (
          <p key={section.id} data-help={section.id}>
            <strong>{section.title}. </strong>
            {section.body}
          </p>
        ))}
        <button type="button" data-action="zurueck" onClick={onBack}>
          Zurück
        </button>
      </section>
    </main>
  );
}
