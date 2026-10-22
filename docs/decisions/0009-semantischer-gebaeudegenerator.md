# 0009 – Semantischer Gebäudegenerator als lokales Werkzeug

Status: entschieden für den beauftragten Umsetzungsschnitt  
Datum: 21.10.2026

**Fortschreibung:** Die feste 4×3-Einbettung dieser ersten Fassung wurde durch [0010](0010-bsp-und-graph-grundrisse.md) ersetzt: variable rekursive BSP-Grundrisse und vorgegebene Raumgraphen mit begrenzter Einbettungssuche. Die übrigen Umfangsgrenzen bleiben bestehen.

## Anlass und Umfang

Der Nutzer hat die Umsetzung des eingefügten Vorschlags zum hierarchischen Gebäude-Generator beauftragt. Dieser Auftrag erlaubt die Implementierung dieses Werkzeugs. Er gibt weder den gesamten Entwicklungsplan frei noch belegt er den Abschluss von M5. [0008](0008-hierarchischer-missionsgenerator.md) bleibt Grundlage: zuerst das taktische Problem, anschließend eine passende Architektur. Die handgebaute Mission wird nicht ersetzt.

## Entscheidung

`packages/generator` erzeugt offline ein Gebäude mit Datenraubziel, vier Runnern und einem Geschoss. Die Pipeline prüft zunächst Parameter und Missionsmuster, bildet ein Raumprogramm aus einem Basisarchetyp und familienspezifischen Ergänzungen, bettet es geometrisch ein, setzt Missionsanker/Deckung/Gegner, ergänzt Versorgungsgraphen und kosmetische Ausstattung und validiert das Ergebnis unabhängig. `sim` importiert den Generator nicht.

Die Einbettung ist eine eingeschränkte rechteckige Slicing-/BSP-Vorlage mit 4×3 Räumen, kein allgemeiner Floorplan-Solver. Harte Anforderungen entscheiden über die Annahme. Ein ganzzahliger Präferenzwert beschreibt Außenlage des Büros und kurze Sanitär-/Logistikbeziehungen; er wird noch nicht zur Optimierung gültiger Lösungen verwendet. Taktische Fairness wird damit nicht behauptet.

Es gibt drei deklarative, JSON-kompatible Gebäudefamilien: Konzernbüro, Forschungslabor und Fabrik/Lager. Sie erben die gemeinsamen Basisfunktionen. Der Katalog enthält 18 Raumtypen; jede Ausgabe zwölf Räume. Das Labor hat vorerst ein Labor und einen Reinraum mit Schleuse. Freie YAML-/JSON-Regeln und ausführbare Regel-DSLs werden nicht importiert.

**Bewusste Abweichungen vom M7-Plan:** Der ausdrückliche Gebäudeauftrag zieht einen lokalen Prototyp vor die vollständige M5-Abnahme. Drei Familien statt nur Konzernbüro sowie optionale Größen 28×24 und 32×28 neben 20×20 entsprechen diesem Auftrag. Das erweitert weder v0.1 noch die Crewgröße. Verschiedene Gebäude entstehen innerhalb einer gemeinsamen Topologievorlage, nicht aus beliebigen Raumzahlen oder Gebäudehüllen.

## Semantik, Architektur und Mission

Der Gebäudegraph beschreibt reguläre Raumverbindungen, Zonenwechsel, Schleusen und Versorgungswege. Der separate Missionsgraph bindet Einstieg, zweimaliges Kopieren und Extraktion an passende Räume. Zwei kantenunabhängige Übergangsfolgen führen zum Ziel; die hackbare Abkürzung gehört nicht zu den Pflichtwegen.

Der Reinraum besitzt nur einen Übergang zur Schleuse. Unmodellierte Öffnungen werden auch auf dem Raster erkannt. Personal erreicht Sanitärbereiche ohne Reinraumdurchquerung. Pflichtfunktionen und Terminalzugänge sind bei geschlossener Abkürzung erreichbar. Diese Prüfungen sind keine bau- oder sicherheitsrechtliche Planung.

Zonenwechsel beschreiben den regulären Gebäudebetrieb; sie führen keine zweite Badge-/Türregel in der Mission ein. Zur Laufzeit gibt es genau die vorhandene hackbare Abkürzung. Strom, Lüftung, Netzwerk und Sicherheit werden als gerichtete Versorgungsgraphen über räumliche Nachbarschaften modelliert. Physische Leitungen, Schächte und Sabotage werden noch nicht simuliert.

## Determinismus und Export

Die Eingabe enthält uint32-Seed, Familie, Größe, Instanz-ID und maximal zehn Versuche. Programm, Geometrie, Topologie, Taktik, Begegnungen und Dekoration verwenden separat über FNV-1a abgeleitete Xorshift32-Ströme. Jeder Strom besitzt eine eigene Stufenversion. Globale Metadatenversionen und Versuchsbudget gehen nicht in die Ableitung ein; eine neue Dekorationsversion verschiebt keine Geometrie oder Gegner.

Kanonische Serialisierung sortiert Objektschlüssel; Arrays besitzen eine feste Erzeugungsreihenfolge. Missionsdaten und vollständiges Paket erhalten jeweils SHA-256. Das Paket enthält Parameter, Versionen, Unter-Seeds, Versuche, Graphen, Geometrie und Prüfbericht. Akzeptierte Ergebnisse werden rekursiv eingefroren. Nach ausgeschöpftem Budget folgt ein erklärter Fehler; es gibt keinen versteckten Rückfall.

Die Missionsausgabe ist ein vorhandenes `MissionSpec`. Die bestehende Server-/Client-Kartenquelle bleibt Ghost Floor. Die Integration eines geprüften Paketloaders in diesen Netzwerkpfad ist offen; Reconnect und laufende Räume generieren nichts neu. Das Werkzeug importiert keine fremden JSON-Pakete.

## Darstellung und Grenzen

`apps/client/generator.html` ist ein separater Einstieg. Der normale Spielbuild importiert die Werkstatt nicht; `build:generator` schreibt einen eigenen Build. Die Vorschau zeigt Grundriss, Zugangsgraph, einzelne Versorgungsnetze, Raumdetails und eine orthografische Babylon.js-Ansicht mit 45° Neigung, 90° Drehung und Zoom. Paket und Missionsdaten lassen sich exportieren.

Alle 3D-Objekte sind primitive Platzhalter aus eigenem Code. Es wurden keine externen Assets oder GLB-Dateien übernommen. Transparente kosmetische Ausstattung ist nicht blockierend; verbindliche Wände und Deckung stammen ausschließlich aus den Missionsdaten. WFC bleibt ein späteres optionales Ausstattungsverfahren und erzeugt keine Deckung oder Sichtblocker.

Mehrere spielbare Geschosse, physische Leitungsführung, Sabotage, weitere Missionstypen, freie Raumanzahl, allgemeine Floorplan-Optimierung und Laden im normalen Missionsbildschirm sind offen. Botläufe und menschliche Partien fehlen. M7 und AP-36 sind daher nicht abgeschlossen. Start und tatsächliche Nachweise: [GEBAEUDEGENERATOR.md](../GEBAEUDEGENERATOR.md).
