import { useState } from "react";
import type { ModularCharacterSpec } from "@neon/characters";
import type { RunnerSheet } from "@neon/sim";
import { CharacterCreate } from "./CharacterCreate.tsx";
import { preferenceMarks, type UiPreferences } from "./preferences.ts";
import "./runnerGate.css";

export function RunnerGate({
  prefs,
  name,
  code,
  busy,
  error,
  pending,
  canResume,
  onName,
  onCode,
  onCreate,
  onLogin,
  onResume,
  onSettings,
  onHelp,
  onReset,
}: {
  prefs: UiPreferences;
  name: string;
  code: string;
  busy: boolean;
  error: string;
  pending: boolean;
  canResume: boolean;
  onName: (value: string) => void;
  onCode: (value: string) => void;
  onCreate: (password: string, look: ModularCharacterSpec, sheet: RunnerSheet) => void;
  onLogin: (password: string) => void;
  onResume: () => void;
  onSettings: () => void;
  onHelp: () => void;
  onReset: () => void;
}) {
  const [password, setPassword] = useState("");
  const [creating, setCreating] = useState(false);
  const blocked = busy || pending;
  const ready = name.trim().length > 0 && [...password].length >= 8;
  if (creating) {
    return (
      <CharacterCreate
        prefs={prefs}
        name={name.trim()}
        busy={blocked}
        error={error}
        pending={pending}
        onBack={() => {
          if (blocked) return;
          setCreating(false);
          onReset();
        }}
        onConfirm={(look, sheet) => onCreate(password, look, sheet)}
      />
    );
  }
  return (
    <main className="mission mission-gate" data-menu="1" {...preferenceMarks(prefs)}>
      <form
        className="mission-card runner-gate"
        data-screen="zugang"
        onSubmit={(event) => {
          event.preventDefault();
          if (!ready || blocked) return;
          onReset();
          setCreating(true);
        }}
      >
        <p className="kicker">Neon Contract</p>
        <h1>Ghost Floor</h1>
        <label>
          Runner
          <input data-field="runner" value={name} maxLength={16} autoComplete="username" onChange={(event) => onName(event.target.value)} />
        </label>
        <label>
          Passwort
          <input
            data-field="password"
            type="password"
            value={password}
            maxLength={128}
            autoComplete="current-password"
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>
        <label>
          Einladungscode
          <input data-field="code" value={code} autoComplete="off" onChange={(event) => onCode(event.target.value)} />
        </label>
        <div className="mission-actions">
          <button type="submit" data-action="anlegen" disabled={!ready || blocked}>
            Runner anlegen
          </button>
          <button
            type="button"
            data-action="anmelden"
            disabled={!ready || blocked}
            onClick={() => onLogin(password)}
          >
            Anmelden
          </button>
          {canResume ? (
            <button type="button" data-action="erneut" disabled={blocked} onClick={onResume}>
              Wieder aufnehmen
            </button>
          ) : null}
          <button type="button" data-action="einstellungen" onClick={onSettings}>
            Einstellungen
          </button>
          <button type="button" data-action="hilfe" onClick={onHelp}>
            Hilfe
          </button>
        </div>
        <p data-error={error ? "1" : "0"}>{error || (pending ? "Verbinden …" : "Privater Raum, vier Plätze.")}</p>
      </form>
    </main>
  );
}
