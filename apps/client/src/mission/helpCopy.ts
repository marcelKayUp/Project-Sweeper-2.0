export interface HelpSection {
  readonly id: string;
  readonly title: string;
  readonly body: string;
}

export const helpSections: readonly HelpSection[] = [
  {
    id: "steuerung",
    title: "Steuerung",
    body: "Die Karte ist orthografisch und um 45 Grad geneigt. Drehen erfolgt in 90-Grad-Schritten und ändert Norden nicht. Die Ansicht sendet Bewegung, Zielen, Schuss, Nachladen, Overwatch, Medkit, Terminal, Tür, Extraktion und Bereit. Nur der Server verändert HP, AP und den Auftrag. Die Vorschau ist unverbindlich. Animation überspringen zeigt den bestätigten Stand.",
  },
  {
    id: "ziel",
    title: "Ziel",
    body: "Das Terminal braucht zwei Kopien zu je 4 AP, orthogonal daneben. Danach extrahiert sich mindestens ein handlungsfähiger Runner für 1 AP, und kein handlungsfähiger Runner bleibt auf der Karte.",
  },
  {
    id: "ap",
    title: "Aktionspunkte",
    body: "Bewegung kostet 1 AP, Zielen 1, Nachladen 2, Schuss 3, Heilung 3 und Overwatch 3. Ein Medkit heilt 2 HP. Ungenutzte AP verfallen mit der Crewphase.",
  },
  {
    id: "deckung",
    title: "Deckung",
    body: "Die Karte und die Übersicht zeigen nur bekannte Felder aus derselben Teamsicht. Niedrige Deckung erscheint dort als Markierung, sobald das Feld erkundet ist. Die Übersicht hält die Frist nicht an.",
  },
  {
    id: "overwatch",
    title: "Overwatch",
    body: "Overwatch kostet 3 AP und eine Patrone und gilt für Nord, Ost, Süd oder West. Die Richtung ist eine eigene Schaltfläche. Die Kameradrehung ändert diese Richtung nicht.",
  },
  {
    id: "frist",
    title: "Bereit und Frist",
    body: "Die Crewfrist ist 60, 90 oder 120 Sekunden. Die Koordination setzt sie vor dem Start und hebt damit alle Bereitmeldungen auf. Bereit beendet die Phase früher. Hilfe und Einstellungen halten die Frist nicht an.",
  },
  {
    id: "verbindung",
    title: "Verbindung",
    body: "Der Server behält den Einsatz. Diese Version nimmt einen geschlossenen Browser noch nicht wieder auf. Schließen der Hilfe verlässt die Sitzung nicht.",
  },
];

export function timeWish(seconds: 60 | 90 | 120): { readonly kind: "zeit"; readonly seconds: 60 | 90 | 120 } {
  return { kind: "zeit", seconds };
}
