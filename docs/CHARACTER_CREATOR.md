# NEON CONTRACT – Character-Creator-Pilot

**Aktuell, 22.10.2026:** Die Standardwerkstatt verwendet jetzt den vom Nutzer bereitgestellten Quaternius-Master mit elf modularen Sets, 62 Knochen und 24 nativen Animationen. Anleitung und Nachweise stehen in [CHARACTER_MODULAR.md](CHARACTER_MODULAR.md), die Quellenentscheidung in [0017](decisions/0017-quaternius-figurenbibliothek.md). Die folgenden Abschnitte dokumentieren den bisherigen eigenen prozeduralen Piloten, der über `?quelle=prozedural` weiter erreichbar ist. Dessen 5.000-Dreiecks-/19-Bone-Vertrag gilt nicht für den neuen Master.

Stand: 21.10.2026. Der Folgeauftrag „plane es und lasse es von luna subagents umsetzen“ autorisiert Planung und Umsetzung dieses begrenzten GEN-10-Piloten. Keine Freigabe einer Kampagne oder Erweiterung der v0.1-Abnahme.

## Ziel und Verfahren

Eine eigene lokale Werkstatt erzeugt stilisierte Low-Poly-Figuren aus einer versionierten JSON-Spezifikation. Ein gemeinsamer humanoider Rig trägt Körper, Haare, Kleidung und Zubehör. Vorschau, sieben Bewegungsclips, deterministische Varianten, JSON-Import/-Export und GLB-Export bilden den ersten durchgehenden Produktionsweg. Eine exportierte Figur wird unabhängig in Blender geöffnet und als bearbeitbare Blend-Quelle gesichert.

Luna-Teilaufgaben arbeiten mit getrennten Dateien: A entwickelt Datenprüfung und Geometrie unter `packages/characters`; B entwickelt Babylon-Vorschau, gemeinsames Skelett, Animation und Export in `apps/client/src/characters/preview.ts`; C entwickelt React-Werkstatt unter `apps/client/src/characters` ohne `preview.ts`. Integration, Werkzeugkonfiguration, Blend-Nachweis und Projektdokumentation liegen beim Hauptagenten. Der gemeinsame Vertrag ist `packages/characters/src/types.ts`.

## Repo-Auswahl

Die vorherige Recherche unterscheidet modulare Editoren und Körpergeneratoren. `msquared-io/avatar-creator` liefert interessante Slot-Verträge, verwendet aber PlayCanvas/MML; `M3-org/CharacterStudio` verwendet Three.js/VRM. Ein zusätzlicher Renderer wird für diesen Piloten nicht eingebaut. `basemeshweb` liefert statische Basismeshes ohne den benötigten Rig. Bei `avatarkit` und `lowpolyrealrigs` wurde keine ausdrückliche Codelizenz gefunden. Deshalb entstehen hier eigene einfache Geometrie und Rezepte auf den bereits verwendeten Babylon-APIs. Es werden keine Dateien dieser Repos kopiert. Quellen der Einordnung: die jeweiligen Repository-READMEs und Exportimplementierungen, recherchiert am 21.10.2026.

## Umfang

- Drei Körperformen, begrenzte Größenvariation, vier Frisuren, drei Outfits, vier Zubehörvarianten und fünf Materialfarben. Kein beliebiges Sculpting und keine versprochene anatomische Realistik.
- Eine ausschließlich kosmetische seedbare Auswahl. Gleiche gültige Spezifikation ergibt dieselbe Geometrie. Keine Verbindung zu Kampf-RNG, AP oder Profilwerten.
- Ein gemeinsamer Deformationsrig; Clips `idle`, `walk`, `crouch`, `shoot`, `reload`, `hit`, `death`. Bewegungen sind einfache überprüfbare Platzhalter, keine menschlich abgenommene finale Animation.
- Unabhängige Werkstatt `characters.html`; bestehende Missionen, Generatorwerkstatt und `?stueck=raster` bleiben unverändert. Keine neuen Servernachrichten oder Profilpersistenz.
- Rezept und JSON ergänzen die bisherige Blend-Quellenregel; die erste Lieferfigur erhält auch eine echte Blend-Datei. GLB bleibt das Spielformat. Siehe Entscheidung 0016.

## Start und Produktion

- `corepack pnpm dev:characters`: Werkstatt auf `http://127.0.0.1:5175/characters.html`.
- `corepack pnpm build:characters`: eigene Produktionsausgabe unter `apps/client/dist-characters`.
- `corepack pnpm check:characters`: Browser-, Import- und GLB-Prüfung gegen diese zuvor gebaute Ausgabe; Ergebnisse unter `artifacts/characters`.
- `corepack pnpm generate:character --seed 42`: browserfreie lokale Produktion einer seedbaren kosmetischen Variante über denselben GLB-Serializer. Liefert GLB, JSON und ein Manifest mit Rezept-/Lieferdatei-Hashes unter `artifacts/characters/cli`.
- `node tools/characters/generate-character.mjs assets/specs/characters/runner.json --out artifacts/characters/agent`: eine eigene validierte Spezifikation bauen. Der Ausgabepfad muss im Projekt bleiben. Ein ungültiger Auftrag scheitert vor dem Schreiben.

Im Editor werden ID/Seed, Slots und Farben eingestellt. „Seed-Variante“ erzeugt reproduzierbare kosmetische Auswahl; Vorlagen setzen Runner/Wache/Techniker. Die Vorschau bietet sieben Clips und vier Kamerawinkel. JSON-Import ersetzt nur nach erfolgreicher Prüfung den letzten gültigen Entwurf. GLB-Export baut eine eigene Produktionsszene, deshalb werden weder die aktuelle Pose noch Bühne oder Kamera in das Bindemesh gebacken. Hand- und Brustanker sind in den GLB-Metadaten benannt. Sidearm bzw. Scanner sind reine visuelle Pilot-Ausrüstung und verändern keine Spielwerte.

Der Agentenauftrag kann damit schlicht lauten: „Erzeuge eine gültige CharacterSpec für einen KASANE-Techniker, baue sie mit generate-character.mjs, prüfe den GLB-Bericht und ändere nur die kosmetischen Parameter.“ Keine Bildgenerierung, zusätzliche Subscription oder weitere LLM-API wird vom Werkzeug aufgerufen.

Unabhängige Blender-Prüfung (PowerShell, Projekt als Arbeitsordner):

```powershell
& 'C:/Program Files/Blender Foundation/Blender 5.2/blender.exe' --background --factory-startup --python-exit-code 1 --python tools/characters/verify_blender.py -- assets/generated/characters/neon-runner.glb --output artifacts/characters/blender-runner
```

Das Skript prüft Armatur, Gewichte, Clips, tatsächliche Vertexdeformation, Maße und Bodenkontakt über 30-fps-Samples, rendert neutrale Ansichten und speichert `assets/source/characters/neon-runner.blend`. Blender erzeugt beim glTF-Import ein eigenes Knochendarstellungsmesh in `glTF_not_exported`; dieses Hilfsmesh gehört nicht zum gelieferten Asset. Präsentationsboden, Lichter und Kamera liegen in einer separaten Review-Collection der Blend-Datei, nicht im Liefer-GLB.

## Technischer Vertrag

Das reine Paket `@neon/characters` enthält keine Renderer-, DOM-, IO- oder Simulationsimports. Es exportiert Spezifikationsprüfung, Standard-/Zufallsspezifikationen und `buildCharacter`. Geometrie enthält benannte Teile mit Positionen, Normalen, Dreiecksindizes, vier Gelenkindizes/-gewichten je Vertex und einer Palettenrolle. Gelenke stehen in stabiler Eltern-vor-Kind-Reihenfolge; Gelenkpositionen sind lokale Bindepositionen relativ zum Elternteil. Geometriekoordinaten sind im vollständigen Modellraum. Y zeigt nach oben, die Figur nach +Z, die Füße stehen auf Y=0. Referenzhöhe ist etwa 1,05 Welteinheiten, passend zur bestehenden Taktikansicht.

GLB enthält ein echtes Skin-Skelett und alle sieben Clips. Exportiert wird eine isolierte Produktionshierarchie ohne Boden, Kamera, Vorschauhilfen oder Lichter. Export während einer laufenden Animation verändert die Vorschau nicht dauerhaft. Materialbudget: fünf Palettenmaterialien; Geometriebudget: maximal 5.000 Dreiecke pro Figur. Exporter-/Loader-Versionen entsprechen dem installierten Babylon-Core 9.31.2.

Importierte JSON-Dateien werden nach Größe, Form, Version, zulässigen Feldern, IDs, Zahlen, Enumwerten und Farbformat geprüft. Ein Fehler lässt den letzten gültigen Entwurf bestehen. Clip- und Rigkompatibilität bleibt unabhängig vom gewählten Outfit. GLB erhält Herkunftsmetadaten und die Spezifikation; ausgelieferte Dateien werden gehasht.

## Abnahme

1. Reproduzierbare Geometrie für gleiche Eingaben; abweichende Seeds verändern kosmetische Auswahl; ungültige Eingaben werden erklärt abgewiesen.
2. Alle Slot-Kombinationen bauen innerhalb der Budgets; Gewichte sind normiert und referenzieren vorhandene Gelenke; alle Koordinaten sind endlich.
3. Browserprüfung bei 1366×768 und 1920×1080: echte 3D-Vorschau, Variantenwechsel, Clipwechsel, Pause, JSON-Rundlauf und GLB-Download; keine ungefangenen Fehler. Zwei Werkstatt-Sitzungen beeinflussen sich nicht.
4. Export enthält Skin und sieben nichtleere Animationen. Ein unabhängiger Blender-Import prüft Mesh, Armatur, Clips und sichtbare Pose; Blend-Quelle und Vorschauen werden gesichert. Ein Bildvergleich aus mehreren Winkeln dokumentiert Lesbarkeit.
5. Typecheck, gezielte Pakettests und Produktionsbuild bestehen. Bestehende Projektprüfungen werden entsprechend der tatsächlichen Änderungen ausgeführt. Ergebnisse und offene menschliche Art-Abnahme werden ergänzt, sobald belegt.

Nicht-Ziele: fertiger Charaktereditor für Kampagnenwerte, automatische Übernahme ins Spiel, fotorealistische Gesichter, Finger-/Gesichtsrig, beliebige Fremdassets, zusätzliche Abos, Meshy/Tripo oder ein zusätzlicher 3D-Renderer.

## Nachweise

Am 21.10.2026 mit drei Subagenten des Modells `gpt-6-luna`, jeweils Reasoning `high`, umgesetzt und integriert:

- `corepack pnpm typecheck`: alle fünf betroffenen Workspaces erfolgreich; Client-Typecheck nach dem letzten Animationsfix erneut erfolgreich.
- `corepack pnpm test`: 119 Tests in 16 Dateien bestanden (Simulation 44, Gebäudegenerator 44, Figuren 8, Server 23). Die Figurenprüfung umfasst alle 144 Kombinationen aus Körper/Frisur/Outfit/Zubehör, Seed-/JSON-Rundlauf, Normalen, Dreiecksorientierung, Budgets und tatsächlich gemischte Hautgewichte.
- `corepack pnpm build:characters` und `corepack pnpm check:characters`: erfolgreich. Echte WebGL-Vorschau bei 1366×768 und 1920×1080, alle Bedienfelder/Clips, Pause, zwei unabhängige Sitzungen, JSON-Rundlauf, ungültige/zu große Importe und Exporte während laufender bzw. pausierter Bewegung geprüft. Laufende und pausierte Exportdatei waren bytegleich. Kein Browserfehler; [Prüfbericht](../artifacts/characters/check.json).
- Tatsächlich exportierte GLB-Bytes zusätzlich mit dem installierten Babylon-Loader in einer neuen NullEngine geladen: je ein Skin mit 19 Bones, sieben Clips und passender Vertexzahl. Khronos glTF-Validator für die drei Browser- und drei Lieferfiguren: **0 Fehler, 0 Warnungen**; [Lieferprüfung](../artifacts/characters/delivery-validation.json).
- Browserfreie CLI zweimal mit Seed 42 ausgeführt: identische GLB-Bytes/SHA-256. Ungültiger Seed und ungültige Spezifikation scheitern vor dem Erzeugen eines Ausgabeordners.
- Blender **5.2.2 LTS** importiert alle drei Lieferfiguren unabhängig: Runner **1.024**, Wache **1.072**, Techniker **1.088** Dreiecke; jeweils fünf Materialien, 19 Bones und sieben tatsächlich deformierende Clips. Bodenkontakt bei 30-fps-Abtastung: größte Abweichung etwa **0,001232** Welteinheiten, unter der Prüftoleranz von 0,005. Je Figur wurden vier Ansichten gerendert und eine echte Blend-Datei gesichert. Berichte: [Runner](../artifacts/characters/blender-runner/report.json), [Wache](../artifacts/characters/blender-guard/report.json), [Techniker](../artifacts/characters/blender-tech/report.json).

Produktionsspezifikationen liegen unter `assets/specs/characters`, GLB/JSON und einzelne Herkunftsmanifeste unter `assets/generated/characters`, Blend-Dateien unter `assets/source/characters`. [character-pilot.json](../assets/manifests/character-pilot.json) erfasst die Lieferdateien und Prüfnachweise mit SHA-256. Die Geometrie stammt aus eigenen Projekt-Rezepten, ohne fremde Figurenmodelle, Texturen oder zusätzliche Dienste. Der CLI-Aufruf ist für Codex, Claude Code und Cursor derselbe; tatsächlich ausgeführt wurde er hier über Codex. Separate Tests in den anderen beiden Clients wurden nicht behauptet.

Behobene Integrationsfehler: verlorene Root-Metadaten, nicht gemischte Gewichte, umgedrehte GLB-Dreiecke, verfälschte Exportfarben sowie wirkungsloses Animationssampling durch eine noch nicht gestartete AnimationGroup und gecachte Skin-Matrizen. Die entsprechenden Struktur-/Winding-/Gewichtsprüfungen bleiben im Testweg; die Blender-Prüfung kontrolliert den unabhängigen Bewegungsexport.

Offen bleiben menschliche Art-, Bewegungs- und Spielkamera-Abnahme sowie Missions-/Profilintegration. Die Figuren und Bewegungen sind stilisierte Pilot-Platzhalter. Nicht blockierend: Vite meldet den großen Babylon-Renderer-Chunk; Babylon konvertiert beim Export die Joint-Index-Puffer nach `UNSIGNED BYTE`, ohne Validatorfehler. Kein M6/M7- oder MVP-Abschluss. Der Arbeitsordner besitzt kein Git-Repository; ein Git-Diff kann deshalb nicht ausgewiesen werden.
