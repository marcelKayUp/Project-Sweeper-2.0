# NEON CONTRACT

Kooperatives Cyberpunk-Taktikspiel für 4–8 Spieler: ein Runner pro Person, gemeinsame Aufträge, Deckung, Aktionspunkte und langfristig eine persistente Crew.

**Projektstand, 21.10.2026:** Regel-/Grafikstücke und ein lokaler Missionsprototyp sind vorhanden. Neu ist ein semantischer Gebäudegenerator mit separater Werkstatt. Die übrigen Planungsdokumente bleiben Vorschläge; eine vollständige menschliche MVP-Abnahme ist damit nicht belegt.

Version 5 ergänzt ein echtes Flurnetz mit eigenen Raumtüren und kurzen, geometrisch geprüften Sanitärwegen: CEO höchstens 16 Raster-Schritte über Assistenz/Flur. Die Werkstatt zeichnet den ausgewählten WC-Weg. Flächenstufen: 28×24, 32×28 und 32×32; Belegung bleibt unverändert. Siehe [0014](docs/decisions/0014-flurerschliessung-und-sanitaerwege.md).

## Figuren-Werkstatt starten

`corepack pnpm dev:characters` öffnet den separat beauftragten Low-Poly-Character-Creator unter `http://127.0.0.1:5175/characters.html`. Unter „Körpermodell“ sind männliche und weibliche Figuren mit jeweils eigenem Rig auswählbar: elf bzw. zehn Sets, vier kombinierbare Teile, Zubehör, optionale Farben, 62 Knochen und 24 native Animationen. JSON und geriggte GLBs bewahren die Modellquelle. Anleitung und Quellenentscheidungen: [CHARACTER_MODULAR.md](docs/CHARACTER_MODULAR.md), [0017](docs/decisions/0017-quaternius-figurenbibliothek.md), [0018](docs/decisions/0018-getrennte-figurenbibliotheken.md). Der bisherige prozedurale Pilot bleibt unter `?quelle=prozedural` erreichbar.

Agenten können dieselbe Produktion ohne Browser mit `corepack pnpm generate:character --seed 42` ausführen. Das Werkzeug kombiniert lokale CC0-Modellteile anhand validierter TypeScript-/JSON-Rezepte und verwendet keine Modell-API oder zusätzliche Subscription. Die Testmission `?stueck=sicht` zeigt diese Figuren; Crouch und Reload fehlen in der Quellbibliothek. Siehe [0021](docs/decisions/0021-cc0-figuren-in-der-testmission.md).

## Lokale Assets prüfen

**Fahrzeug aus Bildreferenz:** `corepack pnpm generate:reference-vehicle` baut den lokalen [Bildreferenz-Piloten](docs/IMAGE_REFERENCE_PILOT.md): annotierte Konturen, berechnete Bildkanten/Kameranäherung und ein parametrisches Blender-/GLB-Modell. Perspektive, Maßstab und verdeckte Form sind Annahmen; Vergleich und Nachweise stehen in der Anleitung.

**Wiederverwendbare Assetfamilien:** Der projektlokale [Skill `asset-families`](.agents/skills/asset-families/SKILL.md) und der [Familienvertrag](docs/ASSET_FAMILIES.md) trennen Geometrie, Materialien/Texturen und Instanzskalierung. Codex und Cursor verwenden den gemeinsamen Einstieg, Claude Code einen kurzen Verweis darauf. Die Umstellung des Terminalgenerators und seines Loaders steht noch aus.

**Terminal-Familie:** `corepack pnpm dev:terminals` öffnet die [3D-Vorschau](http://127.0.0.1:5176/terminals.html) für 18 lokal erzeugte Props: drei Bauformen, zwei Größen und drei Organisationsfarben. Produktion mit `corepack pnpm generate:terminals`; Anleitung, GLB-/Blend-Lieferungen und Prüfungen: [TERMINAL_PILOT.md](docs/TERMINAL_PILOT.md). Der Pilot nutzt vorhandenes Blender/Python/NumPy ohne neue Abhängigkeiten und verändert keine Missionsregeln.

`corepack pnpm inspect:assets` untersucht den beauftragten Ordner `../Models&Animations` in einem separaten Blender-Prozess. Hash-Cache, Rig-/Clipvergleich und Kontaktbögen sparen wiederholte Einzelanalysen. Quellen bleiben unverändert; Ergebnisse stehen unter `artifacts/asset-inspection`. Andere Quellpfade lassen sich direkt an die Node-CLI übergeben. Anleitung, Befunde und Prüfungen: [ASSET_INSPECTION.md](docs/ASSET_INSPECTION.md).

## Gebäudegenerator starten

Die bisherigen Konzernentwürfe KASANE, CONCORD, PARALLAX und VERDANT sind auf Nutzeranweisung als Weltgrundlage verworfen; siehe [0019](docs/decisions/0019-bisherige-konzernentwuerfe-verworfen.md). Sie stehen noch im bisherigen technischen Katalog, dessen Ablösung durch die neue Organisationslandschaft einen Integrationsschritt benötigt. Standortrolle, Abteilung, Ausstattungsniveau, Baugeschichte und Erhaltungszustand beeinflussen weiterhin Büroformen, Hierarchie, Pflichtnachbarschaften und die 2D-/3D-Ausstattung. Leitungs- und Assistenzplätze bleiben Teil der vorhandenen Belegung. Technischer Bestand und historische Nachweise: [0012](docs/decisions/0012-konzernidentitaet-und-bueroorganisation.md).

`corepack pnpm dev:generator` öffnet die Werkstatt unter `http://127.0.0.1:5174/generator.html`: Konzernbüro, Forschungslabor oder Fabrik/Lager mit bedarfsabhängigen Raumzahlen, vier Runnern, Datenraubziel, harten Prüfungen, Graph-/3D-Vorschau und JSON-Export. Anleitung und Nachweise: [GEBAEUDEGENERATOR.md](docs/GEBAEUDEGENERATOR.md). Mehrere spielbare Stockwerke, WFC und Laden im normalen Missionsbildschirm sind noch offen.

`corepack pnpm dev` startet Spielserver und Client und öffnet `http://127.0.0.1:5173/`. Das ist dieselbe Testmission wie `?stueck=sicht`: der Server erzeugt die kompakte Karte mit `generateBuilding` und sendet nur bekanntes Gelände, sichtbare Gegner und gerichtete Deckung. `?stueck=deckung` behält die ältere Phaser-Ansicht. Das 8×8-Raster bleibt unter `?stueck=raster`. Siehe [0024](docs/decisions/0024-ein-start-fuer-die-testmission.md).

Version 3 leitet Raumzahlen und Mindestflächen aus Belegung, Arbeitsplätzen, Prozessplätzen und Lagerbedarf ab. Der Bericht erklärt Kapazitäten und trennt örtliche Funktionen vom übrigen Gebäude. Beispiel: 24 Büroarbeitsplätze ergeben sechs Büros; ein Missionsgeschoss kann Empfang/Anlieferung außerhalb ausweisen. Das sind versionierte Spielannahmen in Rasterfeldern, keine baurechtliche Planung. Siehe [0011](docs/decisions/0011-bedarfsbasiertes-raumprogramm.md). Variable BSP-Grundrisse, Graph-Einbettung und MIT-Herkunft bestehen fort; siehe [0010](docs/decisions/0010-bsp-und-graph-grundrisse.md).

## Grundlagen

Die [Organisationslandschaft Version 8](docs/ORGANISATIONEN.md) beschreibt Konkurrenzstrukturen für HTN-getriebene Geschichten: Ressourcen, Abhängigkeiten, Interessen, sechs Kooperationsgebilde und gemeinsame Aufgaben-/Methodenfamilien. Der [Katalog](docs/ORGANISATIONSKATALOG.md) liefert 70 Akteursprofile. Konkrete Vorfälle, Personen und Orte entstehen erst aus einer Szenarioinstanz. Technische Katalogablösung und Planner-Umsetzung bleiben offen. Quellen- und Umfangsentscheidung: [0020](docs/decisions/0020-organisationslandschaft-und-lokale-konflikte.md).

1. [Technisches Architekturkonzept](docs/ARCHITEKTUR.md): unabhängige Simulation, Serverautorität, beide Zugmodelle, Multiplayer, Sichtschutz, Replays, Bots und spätere Speicherung.
2. [Priorisierter Entwicklungsplan](docs/ENTWICKLUNGSPLAN.md): Meilensteine M0–M6, optionaler Generatorstrang M7, Abhängigkeiten und überprüfbare Abnahme.
3. [AGENTS.md](AGENTS.md): projektweite Arbeitsregeln für Coding-Agenten.
4. [Definition des ersten spielbaren Prototyps](docs/PROTOTYP.md): konkrete Mission, Startregeln, Funktionsumfang und Grenzen.

Zum Prüfen zuerst den Prototypumfang lesen, dann Architektur und Entwicklungsplan. Numerische Regelwerte sind Startannahmen für Tests.

## Konkreter MVP-Mindestumfang

[MVP.md](docs/MVP.md) definiert den ersten spielbaren Stand v0.1, den durchgehenden Spielerweg und die gemeinsame Abnahme. Für jeden Bereich ist beschrieben, was mindestens funktionieren muss:

- [15 Systemmodule](docs/MVP_MODULE.md): Pflichtfunktionen, Daten, Fehlerfälle, konkreter Nachweis und spätere Erweiterungen.
- [23 Screens/Ansichten](docs/MVP_SCREENS.md): sichtbare Elemente, Bedienung, Zustände, Datenbezug und Abnahme.
- [13 Generator-/Werkzeugmodule](docs/MVP_GENERATOREN.md): erforderliche Vorlagen/Prüfungen für v0.1 und kleinste brauchbare Generatorversion bei späterer Einführung.

Der erste MVP benötigt 13 der geplanten Ansichten plus Einsatzmenü, größtenteils als kleine Panels. Skillliste, Levelaufstieg, Stadtkarte und andere spätere Funktionen haben ebenfalls einen dokumentierten Mindestumfang; sie werden damit nicht automatisch in v0.1 vorgezogen.

Die Arbeitsdefinition „MVP“ bezeichnet den Vier-Spieler-Taktiktest. Das vollständige 4–8-Spieler-Ziel wird in v0.2 geprüft, die erste persistente Kampagnenschleife folgt in M6. Alle beschriebenen Nachweise sind noch offen.

## Modulare Planung

Die [agentengesteuerte Low-Poly-Asset-Pipeline](docs/ASSET_PIPELINE.md) untersucht zehn vorhandene Repos und schlägt lokale Blender-Rezepte, optionale MCP-Steuerung, GLB-Prüfung und einen kleinen Produktionspilot vor. Codex, Claude Code oder Cursor sollen ohne zusätzliche Abos nutzbar sein. Die umfassende Prop-/Umgebungspipeline bleibt ein Planungsvorschlag [0015](docs/decisions/0015-agentengesteuerte-asset-pipeline.md); der separat beauftragte Figurenpilot wird durch die oben beschriebene Werkstatt umgesetzt.

Die Konzepte sind zusätzlich in vier zusammenhängende Planungsdokumente zerlegt:

1. [Modulplan](docs/MODULE.md): **15 Systemmodule** mit Zuständigkeiten, Datenverträgen, Abhängigkeiten und Abnahme.
2. [Screens und Spielerabläufe](docs/SCREENS.md): **23 Ansichten**, darunter Hauptmenü, Lobby, Charakterauswahl/-erstellung, Ausrüstung, Spielansicht, taktische und strategische Übersichtskarte, Skillliste, Levelaufstieg und Settings.
3. [Generatoren](docs/GENERATOREN.md): **13 Generator-/Werkzeugmodule**, einschließlich Levelstruktur, NPCs, Encounter, Ausrüstung, Beute und Qualitätsprüfung. Level und NPCs sind nochmals in Teilmodule zerlegt.
4. [Arbeitspakete](docs/ARBEITSPAKETE.md): **36 einzeln planbare Pakete**, mit Umfang, Mindestabhängigkeiten, Größenklasse und prüfbarem Ergebnis.

Die gekennzeichneten Abschnitte liegen zusätzlich als Tag-Index in `rag/`. Abruf: `powershell -NoProfile -File tools/rag/NeonRag.ps1 -Tag MOD-03`. Neu erzeugen: derselbe Aufruf mit `-Build`. Bei Abweichungen gilt das Quelldokument.

Für die gemeinsame Prüfung zuerst Screens/Spielerwege ansehen, danach Module und Arbeitspakete. Die Screenliste unterscheidet Vollbildseiten, Panels und Dialogzustände; sie bedeutet nicht 23 getrennt zu bauende Vollbildanwendungen.

Die frühe Strecke bleibt Hauptmenü → Lobby/Runner/Ausrüstung/Briefing → Einsatz → Ergebnis. Skillentwicklung und Kampagnenscreens folgen später. Die Referenzmission bleibt handgebaut. Der separat beauftragte Gebäude-Prototyp zieht den lokalen Generatorstrang vor; M7 und seine Spielabnahme sind offen. Siehe [0009](docs/decisions/0009-semantischer-gebaeudegenerator.md).

Die [gestufte Charakterentwicklung](docs/CHARAKTERENTWICKLUNG.md) dokumentiert Physisch/Sozial/Mental, günstigere Spezialisierungen ab Wertschwellen sowie Vorschläge zur Verbindung mit XP/Stufen und Ausrüstungsaktionen. Sie gehört zur späteren M6-Planung; Zahlen und konkrete Regeln bleiben zur Prüfung offen.

## Empfohlene Richtung

Ein TypeScript-Regelkern läuft unabhängig von Grafik und Netzwerk. Der Server führt ihn verbindlich aus. Babylon.js stellt die Taktikansicht dar, React die Bedienoberfläche, Colyseus verbindet die Spieler. Die Kamera ist orthografisch, um 45 Grad geneigt und dreht in 90-Grad-Schritten. Vitest prüft Regeln und Replays, Playwright Browserabläufe. Die Fortsetzung ist die spielbare Fassung von `?stueck=raster` und `?stueck=sicht`. `corepack pnpm dev` öffnet sie direkt, siehe [Entscheidung 0013](docs/decisions/0013-isometrische-fortsetzung.md), [0024](docs/decisions/0024-ein-start-fuer-die-testmission.md) und [0007](docs/decisions/0007-babylon-taktikansicht.md).

**v0.1 „Ghost Floor – Kernmission“:** vier Runner auf einer 20 × 20 Karte, gemeinsamer Teamzug, AP, Deckung, Sicht, Schießen, Overwatch, Hacken, Extraktion und Reconnect. Zwei Waffen, zwei Gegnertypen, Bots und einfache Platzhalter.

**v0.2 „Ghost Floor – Vergleichstest“:** simultane Planung als zweite Variante, bis zu acht Runner, Scout-Drohne, dritter Gegnertyp, dritte Waffe, Alarm/Löschung, eine einfache Verletzung und Hotjoin durch Botübernahme. Beide Zugmodelle werden mit Menschen verglichen.

Diese Aufteilung ist eine neue Scope-Empfehlung. Das Originalkonzept nennt bereits Drohne, drei Gegnertypen und beide Zugmodelle für seinen Slice. Sie bleiben im Plan, werden aber nach dem ersten spielbaren Zwischenstand integriert.

## Entscheidungen für unsere Prüfung

- **Zugmodell:** Teamzug zuerst entwickeln, endgültige Wahl erst nach dem A/B-Vergleich.
- **Spielerzahl:** vier für den ersten spielbaren Stand; acht als verpflichtender nachfolgender Validierungsschritt.
- **Regelkomplexität:** orthografische 3D-Taktikansicht, vier Bewegungsrichtungen, gemeinsame Teamsicht, kleine Waffen- und Gegnerauswahl. Höhenstufen sind Kartendaten; ein Höhenbonus ist nicht enthalten.
- **Missionslänge:** erste Kernmission vorläufig 15–30 Minuten; vollständiger Vergleichstest prüft das Produktziel 30–60 Minuten.
- **Hotjoin:** zuerst vorhandenen Bot-Runner übernehmen; neuer Verstärkungs-Runner am sicheren Einstiegspunkt folgt später.
- **Persistenz:** zuerst Mission und Replays; Charakterentwicklung und Safehouse nach positivem Taktiktest.
- **Generatoren:** zuerst das taktische Problem, danach die Umgebung. Datenraub in einem Gebäude ist die erste Generatorstufe; Straßen, WFC und weitere Missionsfamilien folgen später. Siehe [Entscheidung 0008](docs/decisions/0008-hierarchischer-missionsgenerator.md). KI-Text und Bildvorlagen entstehen außerhalb des Laufs.

Die Dokumente bleiben außerhalb ausdrücklich getroffener Entscheidungen Entwürfe. Vorhandene Implementierungen und Tests belegen ihren jeweiligen Schnitt, keine pauschale Freigabe oder abgeschlossene Meilensteinabnahme.

## Quelle und Herkunft

[NEON_CONTRACT_Konzept.md](NEON_CONTRACT_Konzept.md) wurde vollständig gelesen und unverändert aus `C:\Users\kaup\Downloads\NEON_CONTRACT_Konzept.md` übernommen. Die dort ebenfalls vorhandene Datei `NEON_CONTRACT_Konzept (1).md` ist bytegleich.

SHA-256 der Ausgangsdatei und Projektkopie:

`EA3D29DA68580144AC1F49BF90AEB60ABBF53CF2DAFF7203AFA2E340F352B38F`

Das Original beschreibt sich selbst als Konzept zur Diskussion. Die neuen Dokumente unterscheiden deshalb Produktziele von vorgeschlagenen technischen Entscheidungen und Testwerten. Geprüfte offizielle Stack-Quellen stehen am Ende des Architekturkonzepts.
