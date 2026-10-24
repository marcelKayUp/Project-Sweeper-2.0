export type EntryMark = "vorhanden" | "geplant";

export interface EntryStop {
  readonly id: string;
  readonly title: string;
  readonly mark: EntryMark;
  readonly note: string;
  readonly href?: string;
}

export const playerStops: readonly EntryStop[] = [
  {
    id: "zugang",
    title: "Zugang",
    mark: "vorhanden",
    note: "Prüft Anlegen, Anmelden und Wiederaufnehmen am Missionseingang.",
    href: "/?stueck=mission",
  },
  {
    id: "editor",
    title: "Charaktereditor",
    mark: "vorhanden",
    note: "Prüft die Charaktererstellung, die sich über „Runner anlegen“ öffnet.",
    href: "/?stueck=mission",
  },
  {
    id: "stadt",
    title: "Stadtkarte",
    mark: "vorhanden",
    note: "Prüft die Vektorkarte aus Gebäuden und Straßen, ohne Deckung und ohne Mission.",
    href: "/?stueck=stadt",
  },
  {
    id: "auswahl",
    title: "Missionsauswahl",
    mark: "geplant",
    note: "Die Stadtkarte nimmt noch keinen Auftrag an.",
  },
  {
    id: "lobby",
    title: "Lobby",
    mark: "vorhanden",
    note: "Prüft nach der Anmeldung Slots, Bereit, Frist und den Missionsstart.",
    href: "/?stueck=mission",
  },
  {
    id: "inventar",
    title: "Inventar",
    mark: "vorhanden",
    note: "Prüft die Papierpuppe und das Lager in der Lobby.",
    href: "/?stueck=mission",
  },
  {
    id: "level",
    title: "Level-Up",
    mark: "geplant",
    note: "Nur nach einem Aufstieg, danach zurück zur Stadtkarte.",
  },
  {
    id: "mission",
    title: "Mission",
    mark: "vorhanden",
    note: "Prüft die Taktikansicht, nachdem die Lobby die Mission gestartet hat.",
    href: "/?stueck=mission",
  },
  {
    id: "erfolg",
    title: "Erfolg",
    mark: "geplant",
    note: "Eigener Ausgang. Heute zeigt der Ergebnis-Screen bei Sieg „Erfolg“.",
  },
  {
    id: "abbruch",
    title: "Abbruch",
    mark: "geplant",
    note: "Eigener Ausgang. Abmelden in der Lobby löst nur die eigene Sitzung.",
  },
  {
    id: "fehlschlag",
    title: "Fehlschlag",
    mark: "geplant",
    note: "Eigener Ausgang. Heute heißt der verlorene Einsatz „Niederlage“.",
  },
  {
    id: "auswertung",
    title: "Auswertung",
    mark: "geplant",
    note: "Gemeinsame Station nach den drei Ausgängen. Heute schließt das Ergebnis mit „Zum Zugang“.",
  },
  {
    id: "einstellungen",
    title: "Einstellungen und Hilfe",
    mark: "vorhanden",
    note: "Auf Zugang, Lobby, Mission und Ergebnis. Stadtkarte und Editor haben den Einstieg noch nicht.",
    href: "/?stueck=mission",
  },
];

export const techStops: readonly EntryStop[] = [
  {
    id: "sicht",
    title: "Sicht-Stück",
    mark: "vorhanden",
    note: "Prüft bekannte Felder, Sicht, gerichtete Deckung und bestätigte Züge.",
    href: "/?stueck=sicht",
  },
  {
    id: "raster",
    title: "Raster",
    mark: "vorhanden",
    note: "Prüft das 8×8-Laufstück. Der Server bestätigt jeden Schritt.",
    href: "/?stueck=raster",
  },
  {
    id: "deckung",
    title: "Deckung",
    mark: "vorhanden",
    note: "Prüft die ältere Phaser-Ansicht für Deckung und Trefferchance.",
    href: "/?stueck=deckung",
  },
  {
    id: "aktionspunkte",
    title: "Aktionspunkte",
    mark: "vorhanden",
    note: "Prüft Wege und Aktionspunkte in der Phaser-Ansicht, ohne Spielserver.",
    href: "/?stueck=aktionspunkte",
  },
  {
    id: "schuss",
    title: "Schuss",
    mark: "vorhanden",
    note: "Prüft die Schussauflösung in der Phaser-Ansicht, ohne Spielserver.",
    href: "/?stueck=schuss",
  },
  {
    id: "figuren",
    title: "Figuren-Werkstatt",
    mark: "vorhanden",
    note: "Prüft die modularen Figuren. Die prozedurale Quelle hängt an ?quelle=prozedural.",
    href: "/characters.html",
  },
  {
    id: "generator",
    title: "Gebäude-Werkstatt",
    mark: "vorhanden",
    note: "Prüft Grundriss, Bedarf und die 3D-Vorschau des Gebäudegenerators.",
    href: "/generator.html",
  },
  {
    id: "terminals",
    title: "Terminal-Familie",
    mark: "vorhanden",
    note: "Prüft die 3D-Vorschau der lokal erzeugten Terminal-Familie.",
    href: "/terminals.html",
  },
];

const openHrefs = new Set([
  "/?stueck=mission",
  "/?stueck=stadt",
  "/?stueck=sicht",
  "/?stueck=raster",
  "/?stueck=deckung",
  "/?stueck=aktionspunkte",
  "/?stueck=schuss",
  "/characters.html",
  "/generator.html",
  "/terminals.html",
]);

export function entryStops(): readonly EntryStop[] {
  return [...playerStops, ...techStops];
}

export function entryHrefAllowed(href: string): boolean {
  return openHrefs.has(href);
}
