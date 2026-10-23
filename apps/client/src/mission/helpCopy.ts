import { FREIGHT_AP, PASSENGER_AP, STAIR_AP } from "@neon/sim";

export interface HelpSection {
  readonly id: string;
  readonly title: string;
  readonly body: string;
}

export const helpSections: readonly HelpSection[] = [
  {
    id: "steuerung",
    title: "Steuerung",
    body: "Die Karte ist orthografisch und um 45 Grad geneigt. Drehen erfolgt in 90-Grad-Schritten und ändert Norden nicht. Etage hoch und Etage runter zeigen nur die bestätigte Ebene. Die Ansicht sendet Bewegung, Zielen, Schuss, Nachladen, Overwatch, Medkit, Terminal, Tür, Extraktion und Bereit. Nur der Server verändert HP, AP und den Auftrag. Die Vorschau ist unverbindlich. Animation überspringen zeigt den bestätigten Stand.",
  },
  {
    id: "ziel",
    title: "Ziel",
    body: "Das Terminal braucht zwei Kopien zu je 4 AP, orthogonal daneben. Danach extrahiert sich mindestens ein handlungsfähiger Runner für 1 AP, und kein handlungsfähiger Runner bleibt auf der Karte.",
  },
  {
    id: "ap",
    title: "Aktionspunkte",
    body: `Ein Schritt kostet 1 AP, mit gebrochenem oder leerem Bein 2. Eine Treppe kostet ${STAIR_AP} AP, ein Personenaufzug ${PASSENGER_AP} AP und ein Lastenaufzug ${FREIGHT_AP} AP. Zielen 1, Nachladen 2, Schuss 3, Heilung 3 und Overwatch 3. Ein Medkit stillt die Blutung an einem Teil und stellt dort 1 Punkt her. Ungenutzte AP verfallen mit der Crewphase.`,
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
    body: "Fällt die Verbindung aus, bleiben AP, HP und Besitz des Runners erhalten. Dieselbe Sitzung kann fünf Minuten lang wieder aufgenommen werden. Ein zweiter Tab übernimmt nicht. Bleibt die Person weg, übernimmt an der nächsten Crewphasengrenze ein defensiver Bot. Er liest nur die Teamsicht, heilt sich unter der Hälfte der HP oder meldet Bereit. Die Rückgabe folgt an der nächsten Grenze. Die Koordination kann freie Lobby-Slots mit einem Bot besetzen. Schließen der Hilfe verlässt die Sitzung nicht.",
  },
];

export function timeWish(seconds: 60 | 90 | 120): { readonly kind: "zeit"; readonly seconds: 60 | 90 | 120 } {
  return { kind: "zeit", seconds };
}
