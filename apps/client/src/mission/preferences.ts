export const PREFERENCE_KEY = "neon-ui";

export interface UiPreferences {
  readonly scale: 100 | 115 | 125;
  readonly contrast: boolean;
  readonly reduceMotion: boolean;
}

export const defaultPreferences: UiPreferences = {
  scale: 100,
  contrast: false,
  reduceMotion: false,
};

export interface PreferenceStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export function readPreferences(store: PreferenceStore): UiPreferences {
  const raw = store.getItem(PREFERENCE_KEY);
  if (!raw) return defaultPreferences;
  try {
    return sanitize(JSON.parse(raw));
  } catch {
    return defaultPreferences;
  }
}

export function writePreferences(store: PreferenceStore, value: UiPreferences): UiPreferences {
  const safe = sanitize(value);
  store.setItem(PREFERENCE_KEY, JSON.stringify(safe));
  return safe;
}

export function preferenceMarks(prefs: UiPreferences): {
  "data-scale": "100" | "115" | "125";
  "data-contrast": "0" | "1";
  "data-motion": "full" | "reduce";
} {
  const safe = sanitize(prefs);
  return {
    "data-scale": safe.scale === 115 ? "115" : safe.scale === 125 ? "125" : "100",
    "data-contrast": safe.contrast ? "1" : "0",
    "data-motion": safe.reduceMotion ? "reduce" : "full",
  };
}

function sanitize(value: unknown): UiPreferences {
  if (!value || typeof value !== "object") return defaultPreferences;
  const raw = value as Partial<UiPreferences>;
  return {
    scale: raw.scale === 115 || raw.scale === 125 ? raw.scale : 100,
    contrast: raw.contrast === true,
    reduceMotion: raw.reduceMotion === true,
  };
}
