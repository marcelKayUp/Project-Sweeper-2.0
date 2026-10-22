# Modulare Figuren-Werkstatt

Stand: 22.10.2026. Die Werkstatt wählt zwischen zwei bereitgestellten Modellbibliotheken mit jeweils eigenem Skelett und Meshes. Die Grundentscheidungen stehen in [0017](decisions/0017-quaternius-figurenbibliothek.md) und [0018](decisions/0018-getrennte-figurenbibliotheken.md). Der [alte prozedurale Pilot](CHARACTER_CREATOR.md) bleibt verfügbar.

## Zugriff

Im Projektordner `corepack pnpm dev:characters` ausführen und das Terminal laufen lassen. Danach [Figuren-Werkstatt öffnen](http://127.0.0.1:5175/characters.html). Der Server ist lokal; nach seinem Ende ist die Adresse nicht mehr erreichbar. `?quelle=prozedural` öffnet den vorherigen Generator.

Links unter **„Körpermodell“** zwischen **Männlich** und **Weiblich** wählen. Männlich startet mit Casual2 und bietet elf Sets sowie ohne/Pistole/Schwert/Rucksack; Weiblich startet mit Casual und bietet zehn Sets sowie ohne/Pistole/Schwert. Beim Umschalten bleibt der letzte Entwurf jeder Bibliothek innerhalb der offenen Werkstatt erhalten. Es gibt keine Speicherung über einen Seitenneustart; dafür JSON herunterladen.

„Komplettes Set“ wechselt alle vier Teile; Kopf, Oberkörper, Beine und Schuhe lassen sich anschließend innerhalb derselben Bibliothek einzeln kombinieren. Größenänderung skaliert die ganze Figur. Farbrollen sind optional und können auf Original zurückgesetzt werden. Derselbe sichtbare Seed erzeugt innerhalb derselben Bibliothek dieselbe Teileauswahl.

Die Vorschau bietet vier Kameraansichten, Mausrotation/-zoom, 24 tatsächliche Quellclips und Pause. JSON speichert den kosmetischen Bauplan einschließlich Modellquelle; Import schaltet auf den passenden Rig um. Ungültiger oder übergroßer Import ersetzt den gültigen Entwurf nicht. GLB liefert nur die gewählten Teile, den ursprünglichen Rig der gewählten Quelle und alle 24 Animationen. Die momentane Vorschaupose wird nicht eingebrannt.

## Agenten ohne Browser

```powershell
corepack pnpm generate:character --seed 42
corepack pnpm generate:character --model female --seed 42
node tools/characters/generate-character.mjs assets/specs/characters/quaternius-casual2.json --out artifacts/characters/modular/agent
node tools/characters/generate-character.mjs assets/specs/characters/female-casual.json --out artifacts/characters/female/agent
```

GLB, JSON und ein Manifest mit Herkunft, Werkzeugversionen und Hashes werden lokal erzeugt. Codex, Claude Code oder Cursor können dieselben Befehle und dieselbe JSON-Spezifikation verwenden; der tatsächlich getestete Agentenclient ist Codex. Es gibt keine kostenpflichtige Modell-API. Version-1-JSONs werden weiter vom alten Generator verarbeitet; `--procedural` wählt ihn auch ohne Eingabedatei.

`--model male|female` bestimmt die Bibliothek für einen neuen Seed-Entwurf. Bei vorhandener JSON-Datei bestimmt deren `source` die Bibliothek; ein zusätzlich widersprüchliches `--model` wird abgelehnt. Bestehende Version-2-JSONs der männlichen Quelle bleiben gültig. Slots und Zubehör aus der jeweils anderen Quelle werden abgewiesen.

## Quelle und Export

Die gesicherte Masterdatei liegt unter `assets/source/characters/quaternius/Humans_Master.blend`. Ein Hintergrundprozess erzeugt die Browserbibliothek und ihren Katalog:

```powershell
& 'C:/Program Files/Blender Foundation/Blender 5.2/blender.exe' --background --factory-startup --python-exit-code 1 --python tools/characters/export_modular_master.py
```

Das Skript prüft den gespeicherten Quellhash und lässt diese Datei unverändert. Änderungen an der Masterquelle benötigen bewusst aktualisierte Herkunftsdaten. `apps/client/public/assets/characters/quaternius/master.glb` enthält 44 Outfitteile und drei Ausrüstungsmeshes. `catalog.json` verbindet die festen Slotnamen mit der Quelle. Die gesamte Bibliothek wird in der Werkstatt geladen; ein exportierter Einzelcharakter enthält deren ungewählte Teile nicht.

Die Originalformen, 62 Knochen, Gewichte und nativen Animationen bleiben erhalten. Die Bibliothek braucht keine externe Textur; der alte fehlende Bilddatenblock `Texture.png` wird von keinem Quellmaterial verwendet. Farben kommen aus den Materialien. Quaternius veröffentlicht das Pack unter [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/); Quellenbeleg und Hash stehen in [provenance.json](../assets/source/characters/quaternius/provenance.json).

Die weibliche Quelle liegt separat unter `assets/source/characters/women/Humans_Master.blend`, eine bytegleiche Kopie der bereitgestellten `All together.blend`. `tools/characters/export_female_master.py` erzeugt unter denselben Blender-Startargumenten die Bibliothek `apps/client/public/assets/characters/women/{master.glb,catalog.json}` mit 40 Outfitmeshes und zwei starren Waffenanhängen. Beide Quellen haben 62 gleich benannte Bones, jedoch unterschiedliche Bind-Posen. Weibliche Meshes verwenden deshalb ihren eigenen ursprünglichen Rig. Die Waffen folgen dessen `Middle1.R`-Knochen. Ausgeblendete Quellobjekte werden nur für den Hintergrundexport aktiviert; Gewichte werden im GLB auf vier Einflüsse begrenzt und normiert.

Für diese weitere Nutzerdatei ist ein eigener Herkunfts-/Lizenzbeleg offen. Werkstatt, Katalog und GLB kennzeichnen sie als ungeprüft; der CC0-Beleg des männlichen Masters wird nicht auf sie übertragen. [Weibliches Herkunftsprotokoll](../assets/source/characters/women/provenance.json).

## Prüfung

```powershell
corepack pnpm typecheck
corepack pnpm --filter @neon/characters test
corepack pnpm build:characters
corepack pnpm check:characters
```

Die Prüfung führt alle elf männlichen und zehn weiblichen Originalsets sowie Zubehörfiguren durch Export, Khronos-Validator und Babylon-Reimport. Sie prüft 62 Gelenke, 24 bewegte Clips, getrennte Bind-Matrizen, Quellenmetadaten und den Ausschluss fremder Outfitteile. Der Browsertest prüft Vorschau, Körpermodell-/Teile-/Clipwechsel, getrennte Entwürfe, Seed, JSON-Quellenwechsel, JSON-Fehler, Wiederholen nach Ladefehler und identischen Export während Animation/Pause. Berichte liegen unter `artifacts/characters/modular`.

Die unabhängige Blender-Prüfung liest das tatsächlich erzeugte Lieferformat:

```powershell
& 'C:/Program Files/Blender Foundation/Blender 5.2/blender.exe' --background --factory-startup --python-exit-code 1 --python tools/characters/verify_modular.py -- artifacts/characters/modular/casual2.glb
& 'C:/Program Files/Blender Foundation/Blender 5.2/blender.exe' --background --factory-startup --python-exit-code 1 --python tools/characters/verify_modular.py -- artifacts/characters/modular/female-casual.glb --catalog apps/client/public/assets/characters/women/catalog.json --output artifacts/characters/female/blender-casual --blend assets/source/characters/women/casual-workshop.blend
```

Sie prüft Maße, Ruheposen-Bodenhöhe, Gewichte und tatsächliche zeitliche Vertexänderung in allen 24 Clips und speichert eine editierbare Blend-Datei. Bei starren Waffenanhängen werden Handbewegung und stabiler Knochenabstand geprüft. `render_comparison.py` erzeugt zusätzlich neutrale Bilder; dessen Bühnen-Normalisierung ist kein Beleg für Bodenkontakt des Assets.

## Grenzen

Crouch und Reload sind in beiden Bibliotheken nicht vorhanden. `?stueck=sicht` zeigt komplette Sets der beiden Bibliotheken als kosmetische Einsatzfiguren, siehe [0021](decisions/0021-cc0-figuren-in-der-testmission.md). Der volle Sieben-Clip-Vertrag, die menschliche Art-/Bewegungsabnahme und das 8×8-Raster bleiben offen. Teilemischungen können Übergänge oder Clipping haben. Dreiecks- und Materialzahlen sind Messwerte des jeweiligen Assets, keine gemessene Framerate; Belastung mit mehreren Figuren wird erst in der Spielszene geprüft. Die männliche Bibliothek umfasst rund 11,7 MB, die weibliche rund 10,2 MB. Nur die gewählte Quelle wird beim ersten Zugriff geladen und danach pro Quelle gecacht; Einzel-GLBs enthalten derzeit alle 24 Clips (Casual2 und weiblich Casual jeweils etwa 5 MB). Clipauswahl und Kompression sind spätere Optimierungen.

## Belegte Ergebnisse vom 22.10.2026

- Drei getrennte Luna-Teilaufgaben lieferten Masterexport, Babylon-Anbindung und UI; Hauptagent integrierte Spezifikation, CLI, Prüfungen und Dokumentation.
- `corepack pnpm test`: 129 Tests bestanden (Simulation 44, Generator 44, Figuren 18, Server 23). `corepack pnpm typecheck` besteht in allen fünf Workspaces.
- Produktionsbuild und `check:characters` bestehen. 28 geprüfte Einzel-GLBs (21 komplette Sets, fünf Zubehörfiguren, zwei Browserdownloads) besitzen 62 Joints und 24 tatsächlich variierende Clips; Khronos meldet jeweils **0 Fehler und 0 Warnungen**. Beide Masterbibliotheken bestehen ebenfalls. [Browser-/GLB-Bericht](../artifacts/characters/modular/check.json).
- `check:characters:procedural` besteht ebenfalls gegen die separat erreichbare alte Werkstatt; deren Version-1-Import und bisherige Lieferfiguren bleiben geprüft.
- Echte Browserdarstellung bei 1366×768 und 1920×1080, beide Körpermodelle, alle 21 Vorlagen, 24 Clipauswahlen, Kameras, deterministischer sichtbarer Seed, JSON-Rückweisung bei falscher Quelle/Teilen/Übergröße, JSON-Quellenwechsel, getrennte Editoren/Entwürfe, rasches Umschalten und Erholung nach HTTP-Ladefehler beider Quellen geprüft. Keine ungefangenen Seitenfehler. Exporte beider Quellen bei Walk-Wiedergabe und Pause sind jeweils bytegleich. [Weibliche Vorschau](../artifacts/characters/modular/workshop-female-1366.png).
- Der unabhängige Blender-5.2.2-Import des Casual2-Exports bestätigt **5.776 Dreiecke**, 62 Knochen, normierte Gewichte und sichtbare Vertexdeformation in allen 24 Clips. Ruhehöhe **1,0500001**, tiefste Fußposition **−0,000790** Welteinheiten (Toleranz 0,005). [Blender-Bericht](../artifacts/characters/modular/blender/report.json), [neutrale Isoansicht](../artifacts/characters/modular/review/iso.png).
- Die CLI produziert mit derselben gespeicherten Casual2-Spezifikation zweimal bytegleiche GLBs. Lieferdateien samt Herkunftsmanifest liegen unter `assets/generated/characters/quaternius`, die unabhängige Blend-Lieferung unter `assets/source/characters/quaternius/casual2-workshop.blend`. [Liefermanifest](../assets/manifests/character-quaternius.json).
- Der unabhängige Blender-5.2.2-Import der weiblichen Casual-Figur bestätigt **6.424 Dreiecke**, 62 Knochen, normierte Gewichte mit höchstens vier Einflüssen und zeitliche Vertexänderung aller 24 Clips. Ruhehöhe **1,0500002**, Bodenhöhe **0**. Der separate Pistol-Import bestätigt Handbewegung bei Attachment-Drift unter **0,000001**. [Casual-Prüfung](../artifacts/characters/female/blender-casual/report.json), [Waffenprüfung](../artifacts/characters/female/blender-pistol/report.json).
- Die weibliche Casual-CLI-Lieferung unter `assets/generated/characters/women` ist im Wiederholungslauf bytegleich (SHA-256 `a995f6875911757eb3a77067a8d2120594a9b838e71fc71b6f6ed5118e4351fc`). JSON, GLB und Herkunftsmanifest werden gemeinsam geschrieben. [Liefermanifest](../assets/generated/characters/women/woman-16.manifest.json).

Während der Integration behoben: glTF-Ausgabe ohne echte Materialfarben bei altem Diffuse-BSDF, konstante Animationskanäle durch Blender-REST-Modus beim Sampling, verschachtelte Skin-Meshes und automatische Death-Wiedergabe beim Laden. Die Tests prüfen deshalb Farbvielfalt, zeitlich variierende Kanäle und unabhängige Deformation zusätzlich zu Clipnamen. Vite meldet den großen Babylon-Chunk; der glTF-Validator hat zusätzliche reine Informationsmeldungen zu UVs/Puffern. Kein Performance- oder menschlicher Art-Abnahmenachweis.
