# Sweepers

Deutsch · [English](README.en.md)

Kooperatives Cyberpunk-Taktikspiel für 4–8 Spieler: ein Runner pro Person, gemeinsame Aufträge, Deckung, Aktionspunkte und langfristig eine persistente Crew.

Dies ist kein kommerzielles Projekt. Es ist die Testwiese eines Vibe-Coders, um seine Grenzen und die der KI auszuloten, und ein Gelegenheitsspiel für ihn und seine Freundesgruppe.

- [Übersicht](#übersicht)
- [Spielkonzept](#spielkonzept)
- [Technisches Konzept](#technisches-konzept)
- [How-to-Runs](#how-to-runs)
- [Agenten](#agenten)
- [Quelle](#quelle)

## Übersicht

**Stand, 23.10.2026.** Regel- und Grafikstücke, ein lokaler Missionsprototyp und ein semantischer Gebäudegenerator mit eigener Werkstatt sind vorhanden. Der Headless-Nachweis der Kernmission liegt in `@neon/sim` und `@neon/bots`: sechs Gegnerrollen, ein missionsorientierter Crewbot und versionierte Replays. Vier-Spieler-Lobby, Reconnect und die menschliche Abnahme sind offen. Die Planungsdokumente bleiben Vorschläge. Siehe [0030](docs/decisions/0030-gegnerpolicies-und-missionsbot.md).

`http://127.0.0.1:5173/` zeigt die Sitemap aus [NAVIGATION.md](docs/NAVIGATION.md) als Prüfliste. Vorhandene Flächen sind verlinkt. Geplante Flächen stehen ohne Sprung. Die Testmission bleibt unter `?stueck=sicht`. Zugang, Lobby und diese Testmission brauchen den Spielserver. Siehe [0039](docs/decisions/0039-testeinstieg-aus-der-sitemap.md).

GitHub zeigt diese Bilder selbst. Die Testmission und der Spielserver laufen dort nicht. Deckung, Schuss und Aktionspunkte brauchen den Spielserver nicht. Auf GitHub liegt jeweils die festgehaltene Ansicht:

- [Deckung](artifacts/pieces/deckung/ours.png)
- [Schuss](artifacts/pieces/schuss/ours.png)
- [Aktionspunkte](artifacts/pieces/aktionspunkte/ours.png)

GitHub zeigt Kontaktbögen und die Terminalvorschau ebenfalls als Bilder. Die dazugehörige HTML-Suche bleibt lokal.

- [Figuren](artifacts/asset-inspection/contact-characters.png), [Waffen](artifacts/asset-inspection/contact-weapons.png), [Bauteile](artifacts/asset-inspection/contact-components.png)
- [Terminals](artifacts/terminals/contact-sheet.png), [Werkstattbild](artifacts/terminals/workshop.png)

## Spielkonzept

**v0.1 „Sweepers – Kernmission“:** vier Runner auf einer 20 × 20 Karte, gemeinsamer Teamzug, AP, Deckung, Sicht, Schießen, Overwatch, Hacken, Extraktion und Reconnect. Zwei Waffen, zwei Gegnertypen, Bots und einfache Platzhalter. Die handgebaute Referenzmission in den Plandokumenten heißt dort Ghost Floor.

**v0.2 „Sweepers – Vergleichstest“:** simultane Planung als zweite Variante, bis zu acht Runner, Scout-Drohne, dritter Gegnertyp, dritte Waffe, Alarm/Löschung, eine einfache Verletzung und Hotjoin durch Botübernahme. Beide Zugmodelle werden mit Menschen verglichen.

Diese Aufteilung ist eine Scope-Empfehlung. Das Ausgangskonzept nennt Drohne, drei Gegnertypen und beide Zugmodelle für seinen Slice. Sie bleiben im Plan und werden nach dem ersten spielbaren Zwischenstand integriert.

- **Zugmodell:** Teamzug zuerst. Die endgültige Wahl folgt dem A/B-Vergleich.
- **Spielerzahl:** vier für den ersten spielbaren Stand. Acht ist der verpflichtende nachfolgende Validierungsschritt.
- **Regelkomplexität:** orthografische 3D-Taktikansicht, vier Bewegungsrichtungen, gemeinsame Teamsicht, kleine Waffen- und Gegnerauswahl. Höhenstufen sind Kartendaten. Ein Höhenbonus ist nicht enthalten.
- **Missionslänge:** erste Kernmission vorläufig 15–30 Minuten. Der vollständige Vergleichstest prüft das Produktziel 30–60 Minuten.
- **Hotjoin:** zuerst vorhandenen Bot-Runner übernehmen. Ein neuer Verstärkungs-Runner am sicheren Einstiegspunkt folgt später.
- **Persistenz:** zuerst Mission und Replays. Charakterentwicklung und Safehouse folgen einem positiven Taktiktest.
- **Generatoren:** zuerst das taktische Problem, danach die Umgebung. Datenraub in einem Gebäude ist die erste Generatorstufe. Straßen, WFC und weitere Missionsfamilien folgen später. Siehe [0008](docs/decisions/0008-hierarchischer-missionsgenerator.md). KI-Text und Bildvorlagen entstehen außerhalb des Laufs.

[MVP.md](docs/MVP.md) definiert den ersten spielbaren Stand v0.1, den durchgehenden Spielerweg und die gemeinsame Abnahme:

- [15 Systemmodule](docs/MVP_MODULE.md)
- [23 Screens/Ansichten](docs/MVP_SCREENS.md)
- [13 Generator-/Werkzeugmodule](docs/MVP_GENERATOREN.md)

Der erste MVP benötigt 13 der geplanten Ansichten plus Einsatzmenü, größtenteils als kleine Panels. Skillliste, Levelaufstieg und Stadtkarte haben einen dokumentierten Mindestumfang und werden damit nicht in v0.1 vorgezogen. „MVP“ meint hier den Vier-Spieler-Taktiktest. Das vollständige 4–8-Spieler-Ziel wird in v0.2 geprüft, die erste persistente Kampagnenschleife folgt in M6. Alle beschriebenen Nachweise sind noch offen.

Die frühe Strecke bleibt Hauptmenü, Lobby, Runner, Ausrüstung, Briefing, Einsatz, Ergebnis. Die [gestufte Charakterentwicklung](docs/CHARAKTERENTWICKLUNG.md) gehört zur späteren M6-Planung. Zahlen und konkrete Regeln bleiben offen.

Die [Organisationslandschaft Version 8](docs/ORGANISATIONEN.md) beschreibt Konkurrenzstrukturen für spätere Geschichten. Der [Katalog](docs/ORGANISATIONSKATALOG.md) liefert 70 Akteursprofile. Konkrete Vorfälle, Personen und Orte entstehen erst aus einer Szenarioinstanz. Siehe [0020](docs/decisions/0020-organisationslandschaft-und-lokale-konflikte.md).

Die Dokumente bleiben außerhalb ausdrücklich getroffener Entscheidungen Entwürfe. Vorhandene Implementierungen und Tests belegen ihren jeweiligen Schnitt.

## Technisches Konzept

Ein TypeScript-Regelkern läuft unabhängig von Grafik und Netzwerk. Der Server führt ihn verbindlich aus. Babylon.js stellt die Taktikansicht dar, React die Bedienoberfläche, Colyseus verbindet die Spieler. Die Kamera ist orthografisch, um 45 Grad geneigt und dreht in 90-Grad-Schritten. Vitest prüft Regeln und Replays, Playwright Browserabläufe. Die Fortsetzung ist die spielbare Fassung von `?stueck=raster` und `?stueck=sicht`. Siehe [0013](docs/decisions/0013-isometrische-fortsetzung.md), [0024](docs/decisions/0024-ein-start-fuer-die-testmission.md) und [0007](docs/decisions/0007-babylon-taktikansicht.md).

Die Pakete heißen weiterhin `@neon/…`. Das ist der Name der Arbeitsbereiche, der Spielname ist Sweepers.

- [`@neon/sim`](packages/sim): deterministische Regeln. Keine Grafik und kein Netzwerk.
- [`@neon/bots`](packages/bots): Crewbots auf der gefilterten Teamsicht. Keine eigene Regelautorität.
- [`@neon/generator`](packages/generator): semantischer Gebäudegenerator.
- [`@neon/characters`](packages/characters): Figurenrezepte und Prüfung, ohne Renderer.
- [`@neon/server`](apps/server): Colyseus-Spielserver.
- [`@neon/client`](apps/client): React-Oberfläche, Babylon-Taktikansicht und die älteren Phaser-Stücke.

Grundlagen:

1. [Technisches Architekturkonzept](docs/ARCHITEKTUR.md)
2. [Priorisierter Entwicklungsplan](docs/ENTWICKLUNGSPLAN.md), Meilensteine M0–M6, optionaler Generatorstrang M7
3. [AGENTS.md](AGENTS.md)
4. [Erster spielbarer Prototyp](docs/PROTOTYP.md)

Zum Prüfen zuerst den Prototypumfang lesen, dann Architektur und Entwicklungsplan. Numerische Regelwerte sind Startannahmen für Tests.

Die Konzepte liegen zusätzlich in vier Planungsdokumenten: [15 Systemmodule](docs/MODULE.md), [23 Ansichten](docs/SCREENS.md), [13 Generatoren](docs/GENERATOREN.md) und [36 Arbeitspakete](docs/ARBEITSPAKETE.md). Die Screenliste unterscheidet Vollbildseiten, Panels und Dialogzustände. Die gekennzeichneten Abschnitte liegen als Tag-Index in `rag/`. Der Abruf steht unter [Agenten](#agenten).

Figuren und Waffen stammen von [Quaternius](https://quaternius.com/) und stehen unter [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/). Das gilt für beide Figurenbibliotheken und für die Waffen in `Models&Animations`. Die männliche Bibliothek ist das Pack [Ultimate Modular Characters](https://quaternius.com/packs/ultimatemodularcharacters.html). Herkunft und Prüfsumme des männlichen Masters stehen in [provenance.json](assets/source/characters/quaternius/provenance.json). Terminals, der Referenz-LKW und andere im Projekt erzeugte Props sind eigene Modelle.

Der Gebäudegenerator, Stand `semantic-building/7`, leitet die Etagenzahl aus Grundfläche und Personal ab, höchstens vier. Platten sind kompakt 28×24, Standard 32×28 und groß 32×32. Empfang, Server, Anlieferung, Geschäftsführung, Vorstand, Archiv und Gemeinschaftsgarten gelten einmal je Gebäude. Die übrigen Funktionen gelten je Etage. Obere Etagen wiederholen die gezeichnete Platte. Ab der zweiten Etage liegen Treppe und familieneigener Aufzug auf dem Flur. Anleitung: [GEBAEUDEGENERATOR.md](docs/GEBAEUDEGENERATOR.md), [0040](docs/decisions/0040-grundflaeche-personal-und-etagen.md), [0038](docs/decisions/0038-etagen-treppen-und-aufzuege.md). Bedarf, Flure und Grundrissverfahren: [0011](docs/decisions/0011-bedarfsbasiertes-raumprogramm.md), [0014](docs/decisions/0014-flurerschliessung-und-sanitaerwege.md), [0010](docs/decisions/0010-bsp-und-graph-grundrisse.md).

Die bisherigen Konzernentwürfe KASANE, CONCORD, PARALLAX und VERDANT sind als Weltgrundlage verworfen, siehe [0019](docs/decisions/0019-bisherige-konzernentwuerfe-verworfen.md). Sie stehen noch im technischen Katalog. WFC und das Laden eines Generatorpakets im normalen Missionsbildschirm sind offen. M7 ist nicht abgeschlossen, siehe [0009](docs/decisions/0009-semantischer-gebaeudegenerator.md).

## How-to-Runs

Node.js 24.14.0 und pnpm 12.14.0 über Corepack. Blender wird für Figurenexport, Terminals und Assetprüfung gebraucht.

### Windows einrichten

Voraussetzung ist Node.js 24.14.0 von [nodejs.org](https://nodejs.org/). Im Projektordner einmal:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File tools/setup-windows.ps1
```

Das Skript prüft Node.js, aktiviert Corepack und pnpm und installiert die Arbeitsbereiche von Spiel, Server, Client und Generatoren. Eine Python-Abhängigkeit wird nur installiert, wenn der Gebäude- oder Missionsgenerator eine Requirements-Datei hat. Fehlt Python, meldet das Skript das und richtet den Rest ein.

### Spiel

In zwei Fenstern, nach `corepack pnpm install` im Projektordner:

```powershell
corepack pnpm --filter @neon/server start
corepack pnpm --filter @neon/client dev
```

Dieselbe Kombination startet `corepack pnpm dev` und öffnet [http://127.0.0.1:5173/](http://127.0.0.1:5173/). Ohne Parameter ist das die Einstiegsseite. Die Testmission bleibt `?stueck=sicht`. `?stueck=deckung` behält die ältere Phaser-Ansicht. Das 8×8-Raster bleibt unter `?stueck=raster`.

`corepack pnpm test` prüft Simulation, Crewbots, Generator, Figuren und Server. `corepack pnpm typecheck` prüft zusätzlich den Client.

### Gebäudegenerator

`corepack pnpm dev:generator` öffnet die Werkstatt unter [http://127.0.0.1:5174/generator.html](http://127.0.0.1:5174/generator.html): Konzernbüro, Forschungslabor oder Fabrik/Lager, Bedarfsbericht, Grundriss, 3D und JSON-Export. Etage hoch und Etage runter schalten die gezeichnete Platte. Der Spielserver ist dafür nicht nötig.

### Figuren

`corepack pnpm dev:characters` öffnet den Character-Creator unter [http://127.0.0.1:5175/characters.html](http://127.0.0.1:5175/characters.html). Männliche und weibliche Figuren haben jeweils ein eigenes Rig. Anleitung: [CHARACTER_MODULAR.md](docs/CHARACTER_MODULAR.md), [0017](docs/decisions/0017-quaternius-figurenbibliothek.md), [0018](docs/decisions/0018-getrennte-figurenbibliotheken.md). Der prozedurale Pilot bleibt unter `?quelle=prozedural`.

Ohne Browser: `corepack pnpm generate:character --seed 42`. Die Testmission zeigt diese Figuren. Crouch und Reload fehlen in der Quellbibliothek. Siehe [0021](docs/decisions/0021-cc0-figuren-in-der-testmission.md).

### Assets

- `corepack pnpm dev:terminals` öffnet die [Terminalvorschau](http://127.0.0.1:5176/terminals.html). Produktion: `corepack pnpm generate:terminals`. Anleitung: [TERMINAL_PILOT.md](docs/TERMINAL_PILOT.md).
- `corepack pnpm inspect:assets` untersucht `../Models&Animations`. Ergebnisse stehen unter `artifacts/asset-inspection`. Anleitung: [ASSET_INSPECTION.md](docs/ASSET_INSPECTION.md).
- `corepack pnpm generate:reference-vehicle` baut den [Bildreferenz-Piloten](docs/IMAGE_REFERENCE_PILOT.md). `corepack pnpm generate:tracked-drone` baut die Ketten-Drohne aus [ASSET_PARTS.md](docs/ASSET_PARTS.md).
- `corepack pnpm setup:reference-analysis`, danach `corepack pnpm analyze:reference`. Anleitung: [IMAGE_REFERENCE_ANALYSIS.md](docs/IMAGE_REFERENCE_ANALYSIS.md).
- `corepack pnpm check:asset-parts` und `corepack pnpm audit:asset` prüfen Teile und Bewegungsstellungen. Vertrag: [ASSET_QUALITY.md](docs/ASSET_QUALITY.md).
- Familienvertrag: [ASSET_FAMILIES.md](docs/ASSET_FAMILIES.md) und [Skill `asset-families`](.agents/skills/asset-families/SKILL.md). Pipeline-Vorschlag: [ASSET_PIPELINE.md](docs/ASSET_PIPELINE.md), [0015](docs/decisions/0015-agentengesteuerte-asset-pipeline.md).

## Agenten

Regeln stehen in [AGENTS.md](AGENTS.md). Für reine Offline-Assetaufträge genügen diese Regeln, [ASSET_START.md](docs/ASSET_START.md) und der Asset-Skill. Für andere Aufgaben diese README, [ARCHITEKTUR.md](docs/ARCHITEKTUR.md), [PROTOTYP.md](docs/PROTOTYP.md) und den betroffenen Meilenstein in [ENTWICKLUNGSPLAN.md](docs/ENTWICKLUNGSPLAN.md) lesen.

```powershell
corepack pnpm asset execute --job assets/jobs/cabinet-base.json
```

Eine begrenzte Änderung wird mit `--field` und `--value` übergeben. Bekannte Farbserien laufen mit `asset batch`. Für den vorhandenen Referenz-LKW gibt es `init --template reference-truck-v1 --job assets/jobs/mein-lkw.json`. Technische Lieferung, mechanische Bewertung und künstlerische Freigabe bleiben getrennt.

Optionale Bildsegmentierung: `corepack pnpm setup:sam2 --device cpu`, danach `corepack pnpm generate:reference-vehicle --sam2 --analysis-only`. Anleitung: [SAM2_SEGMENTATION.md](docs/SAM2_SEGMENTATION.md).

Der Tag-Index liegt in `rag/`. Kennungen sind `MOD-01`–`MOD-15`, `S01`–`S23`, `GEN-00`–`GEN-12` samt Teilkennungen wie `GEN-02A`, `AP-01`–`AP-36`, `M0`–`M7` und Entscheidungen als `DEC-` plus Dateinummer, zum Beispiel `DEC-0024`.

```powershell
powershell -NoProfile -File tools/rag/NeonRag.ps1 -Tag MOD-03
powershell -NoProfile -File tools/rag/NeonRag.ps1 -Build
```

Mehrere Kennungen gehen in denselben Aufruf: `-Tag MOD-03,AP-05` oder `-Tag S01-S04`. Freitext sucht `-Query Deckung`, `-List` zeigt die Kennungen. `corepack pnpm rag` startet dasselbe Skript. Der Treffer enthält Planabschnitt, MVP-Mindestvertrag und Verweise. Spätere Stufen erweitern v0.1 nicht automatisch. Weicht der Index vom Quelldokument ab, gilt das Quelldokument.

## Quelle

[NEON_CONTRACT_Konzept.md](NEON_CONTRACT_Konzept.md) wurde vollständig gelesen und unverändert aus `C:\Users\kaup\Downloads\NEON_CONTRACT_Konzept.md` übernommen. Die dort ebenfalls vorhandene Datei `NEON_CONTRACT_Konzept (1).md` ist bytegleich. Das Spiel heißt Sweepers. Der Dateiname der Quelle bleibt.

SHA-256 der Ausgangsdatei und der Projektkopie:

`EA3D29DA68580144AC1F49BF90AEB60ABBF53CF2DAFF7203AFA2E340F352B38F`

Das Original beschreibt sich selbst als Konzept zur Diskussion. Die neueren Dokumente trennen Produktziele von vorgeschlagenen technischen Entscheidungen und Testwerten. Geprüfte offizielle Stack-Quellen stehen am Ende des Architekturkonzepts.
