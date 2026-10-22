---
name: asset-families
description: Plant, erstellt oder erweitert lokale Low-Poly-Propfamilien mit gemeinsamer Geometrie, Materialprofilen und parametrischen Varianten. Verwenden bei neuen Propfamilien, Farbvarianten, Größenvarianten oder doppelten Asset-Exporten im NEON-Projekt.
---

# Assetfamilien

Arbeite vom Projektstamm aus. Lies die geltenden Regeln in `AGENTS.md` und den [Familienvertrag](../../../docs/ASSET_FAMILIES.md). Der Skill verwendet vorhandene lokale Werkzeuge und benötigt weder einen bestimmten Modellanbieter noch einen eigenen MCP-Server.

## Entscheidung vor der Erzeugung

- Farbe, Rauheit, Metallanteil oder Emission: Materialprofil ändern.
- Logo, Beschriftung oder Bildschirminhalt: Texturbindung ändern; Geometrie und UVs möglichst weiterverwenden.
- Reine Größenänderung mit gleichen Proportionen: Instanz skalieren.
- Andere Form, Proportionen, Topologie oder benötigte UV-Aufteilung: vorhandene Basis prüfen, bei Bedarf eigene Geometrie erzeugen.
- Anderes Skelett oder Bind-Pose: Figurenbibliothek getrennt behandeln. Der statische Propvertrag ersetzt keinen Rigvertrag.

Nenne die wiederverwendeten Basen und begründe jede neue Geometrie. Ein Farbwunsch löst keinen vollständigen Blender-Bau aus. Verändert eine Oberflächenoperation tatsächlich Vertexpositionen, ist sie eine Geometrieänderung.

## Vorgehen

1. Suche passende Katalogeinträge, Rezepte, Materialrollen und Quellen im Projekt. Übernimm bestehende IDs und nutze vorhandene Generatoren, bevor du einen neuen Generator anlegst.
2. Beschreibe Geometrie, Erscheinungsbild und Instanz getrennt nach dem Familienvertrag. Halte Quelle/Nutzungsrecht, Maße, Ursprung und konkrete Budgets fest. Die Terminalbudgets sind keine allgemeine Leistungsgrenze.
3. Bei einem Produktionsauftrag: baue nur neue oder geänderte Geometriebasen. Palette und Skalierung bleiben Daten. Nutze den lokalen CLI-Weg für reproduzierbare Produktion; MCP ist für interaktive Arbeit optional. Prüfe Befehle in `package.json` und der Familiendokumentation.
4. Prüfe die tatsächlich exportierten Dateien und deren Darstellung. Geometriegleichheit bei Farbwechsel, gültige Variantenreferenzen und unveränderte Nachbarinstanzen gehören zum Nachweis einer umgestellten Familie. Ein Bild allein belegt keine Ressourcenwiederverwendung.
5. Berichte Basismodelle/Varianten, ausgeführte Prüfungen, Lieferpfade und offene Punkte. Trenne vorhandene Funktionen vom Zielzustand. Eine Skill-Regel ersetzt keine implementierte Prüfung.

## Vorhandene Werkzeugwege

- Bei Bildreferenzen zuerst [Klassifizierung, Symmetrie und Flächen](../../../docs/IMAGE_REFERENCE_ANALYSIS.md) anwenden: Klasse und Bauweise getrennt erfassen; Symmetrie pro Bauteil als begründete Hypothese führen; geometrische Grenzen von Material-/Lichtwechseln unterscheiden. Herkunft von Agentenannahmen und Skriptmessungen ausweisen. Die allgemeine Flächenerkennung ist noch umzusetzen. Wiederverwendbare Analyselogik und Tokenverbrauch pro Folgeasset getrennt von der Werkzeugentwicklung bewerten.
- Objektumriss aus einem Foto: optional SAM 2 über `segment:reference` ([Abschnitt 7](../../../docs/IMAGE_REFERENCE_ANALYSIS.md#7-optionale-objektfreistellung-mit-sam-2)). Die Maske ersetzt nur den Umriss; Flächen, Symmetrie und Grenzfreigaben bleiben Agenteneingaben. Ergebnisse neuronaler Modelle sind eingefrorene Eingaben, nie Lieferassets ([0025](../../../docs/decisions/0025-neuronale-hilfsmodelle-als-eingabe.md)).
- Bildreferenz zu einer neuen Form: [IMAGE_REFERENCE_PILOT.md](../../../docs/IMAGE_REFERENCE_PILOT.md). Der lokale Fahrzeugversuch kombiniert manuelle Bezugspunkte mit berechneten Bildkanten und bedingtem Kamerafit. Seine annotierte Rezeptdatei ist kein universeller Bild-zu-3D-Konverter. Annahmen und verdeckte Geometrie ausdrücklich ausweisen.
- Terminals: [TERMINAL_PILOT.md](../../../docs/TERMINAL_PILOT.md). `generate:terminals` exportiert noch alle Kombinationen; die Umstellung auf gemeinsame Basen ist offen. Bei reinen Farbwünschen diesen Befehl nicht als bereits optimierte Produktion darstellen.
- Figuren: [CHARACTER_MODULAR.md](../../../docs/CHARACTER_MODULAR.md). Bibliotheks- und Rigzugehörigkeit bewahren; männliche und weibliche Quelle nicht allein wegen gleicher Knochennamen mischen.
- Unbekannte Quellassets: [ASSET_INSPECTION.md](../../../docs/ASSET_INSPECTION.md). Vorhandenen Hash-/Analysebericht nutzen und bei Bedarf gezielt aktualisieren.

Ein selbstständiger Einzel-GLB bleibt als benötigter Export möglich. Er wird aus Basis und Variante zusammengesetzt und ist nicht der kanonische Familienbestand. Beauftragt der Nutzer ausdrücklich solche Exporte, führe sie mit dem vorhandenen Werkzeug aus; behaupte dabei keine Laufzeitoptimierung.

## Beispiele

- „Das Pult in Daeyang-Farben“: vorhandenes Pult und dessen Materialrollen verwenden.
- „Dasselbe Terminal 20 Prozent kleiner“: Skalierung `0.8`, gleiche Basis.
- „Wandterminal mit schmalerem Gehäuse und zweitem Display“: Geometrieänderung prüfen und als neue Basis begründen.

Der Skill betrifft visuelle Assets. Kollision, Deckung, Sicht und Interaktionsregeln bleiben explizite Spieldaten.
