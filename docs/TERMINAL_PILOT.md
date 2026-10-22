# Parametrische Terminal-Familie

Stand: 22.10.2026. Separat beauftragter Assetpilot: Standterminal, Pult und Wandterminal aus einem gemeinsamen Rezept. **18 statische Varianten** kombinieren drei Bauformen, zwei Größen und drei Organisationsfarben. Es gibt keinen neuen Missionstyp, keine Interaktionsregel und keine Änderung an den bestehenden Figuren.

## Vorschau öffnen

Die vollständigen Exportkombinationen sind der aktuelle Bestand. Der [Familienvertrag](ASSET_FAMILIES.md) und der [Skill `asset-families`](../.agents/skills/asset-families/SKILL.md) beschreiben die folgende Trennung in drei Geometriebasen, Materialprofile und Skalierungsdaten. Generator und Vorschau sind noch nicht darauf umgestellt; siehe [0023](decisions/0023-wiederverwendbare-assetfamilien.md).

Im Projektordner:

```powershell
corepack pnpm dev:terminals
```

Terminal laufen lassen, dann [Terminal-Vorschau öffnen](http://127.0.0.1:5176/terminals.html). Bauform, Größe und Organisation auswählen; Ziehen dreht, Mausrad zoomt. Front-, Rücken- und Schrägansicht sowie GLB-/Rezeptdownload sind vorhanden. Die Kamera verwendet beim Umschalten denselben Metermaßstab. Das Wandterminal benötigt bei späterer Platzierung eine passende Wand; seine Unterkante ist wie bei den anderen Formen der Ursprung.

Vite bedient die Seite auch unter `/terminals.html` an einem bereits laufenden Client-Devserver. Die Produktionsprüfung verwendet getrennt Port 4176; die bestehenden Figuren-/Generatorserver bleiben unabhängig.

## Produktion und Varianten

```powershell
corepack pnpm generate:terminals
corepack pnpm build:terminals
corepack pnpm check:terminals
```

Eingabe ist [terminal-family.json](../assets/specs/props/terminal-family.json). Das Rezept enthält Familie/Version, uint32-Seed, freigegebene Bauformen, Größenfaktoren, drei Materialrollen je Palette und technische Budgets. Unbekannte Felder und ungültige Werte werden abgewiesen. Größenfaktoren dürfen im Pilot zwischen 0,65 und 1,25 liegen; das Ausgangsrezept verwendet 0,8 und 1,0.

Jede Bauform verwendet eigene Proportionen und dieselben Materialrollen. Grundkörper, abgeflachte Ecken, Stützteil, Rahmen, Display und Statusmarkierungen sind prozedural erstellt. Der Seed variiert das selbst gezeichnete Displaymuster. Organisationsfarben verändern keine Geometrie. Die drei Paletten stammen aus den öffentlichen Farbbriefings des [Organisationskatalogs](ORGANISATIONSKATALOG.md): Falkenfeld-Kessler, Daeyang und Nakamura-Lindahl. Dies ersetzt noch keinen Organisationskatalog im laufenden Gebäude- oder Figurengenerator.

Abweichende Rezepte und einzelne Exporte können in ein isoliertes Bündel geschrieben werden:

```powershell
node tools/terminals/generate-terminals.mjs --recipe assets/specs/props/terminal-family.json --out artifacts/terminals/custom
node tools/terminals/generate-terminals.mjs --only terminal-pedestal-standard-daeyang --out artifacts/terminals/single
```

`--force` baut erneut. `--blender` oder `BLENDER_PATH` wählen die lokale Blender-Installation. Ein isolierter oder einzelner Export überschreibt die öffentliche Familie nicht. Nur der vollständige Standardlauf veröffentlicht GLBs und Katalog unter `apps/client/public/assets/props/terminals`.

## Dateien und Erstellungsweg

Das [Blender-Rezept](../tools/terminals/build_terminal_family.py) läuft in einem separaten Prozess mit `--background --factory-startup --disable-autoexec`. Es greift nicht auf das interaktive Blender oder fremde Quellmodelle zu. Der [Node-Aufruf](../tools/terminals/generate-terminals.mjs) hält Pfade im Projekt und sammelt ausführliche Meldungen in `build.log`.

Unter `assets/generated/props/terminals` liegen:

- `glb/`: selbstständige Lieferdateien, ohne Kamera, Licht, Rig oder Animation;
- `source/`: editierbare Blend-Dateien mit eingebetteter Displaygrafik;
- `textures/`: selbst erzeugte 128×128-PNGs, im GLB ebenfalls eingebettet;
- `recipes/`: vollständig aufgelöste Einzelrezepte mit Quelle, Form, Skalierung, Palette und Seed;
- `manifest.json`: Werkzeugversionen, Rezept-/Codehashes, Maße, Budgets und Dateihashes;
- `catalog.json`: öffentliche Auswahl samt GLB-Hash und kosmetischem Rezept.

Das Produktionsrezept und der Code sind der parametrische Bauplan. Änderungen an einer erzeugten Blend-Datei werden nicht in das JSON zurückübersetzt. Die Ausgabeverzeichnisse sind generierte Lieferungen; der nächste Neubau rekonstruiert sie aus dem Rezept. Eigene manuelle Bearbeitungen benötigen eine getrennte Arbeitskopie.

## Eingesetzte Werkzeuge

**Blender/Python und das mitgelieferte NumPy** genügen für diesen Pilot. NumPy berechnet Profilringe und Rastergrafik; Blender erstellt Meshes, Materialien, PNGs, Blend und GLB. Es werden keine weiteren Python- oder Node-Pakete installiert. Geprüfter Stand: Blender 5.2.2 LTS, Python 3.13.13, NumPy 2.3.4; Babylon/glTF-Validator und Playwright stammen aus dem bestehenden Client-Workspace.

Pillow wäre bei komplexerer zweidimensionaler Bildverarbeitung ein sinnvoller Zusatz. SciPy, Numba, SDF, Raymarching und Lua werden hier nicht benötigt. Der Pilot prüft zunächst den direkten Meshweg für technische Low-Poly-Props. Es gibt keine Modell-API oder zusätzliche Subscription.

Die neuen Geometrien und Rastergrafiken sind projektseitig erstellt; es werden keine externen Modelle, Texturen, Schriften oder fertigen Logos verwendet. Der Manifestmarker `LicenseRef-Project-Authored` ist eine Herkunftskennzeichnung, keine behauptete externe CC0-Freigabe. Die Organisationsnamen und Farben referenzieren den vorhandenen Weltentwurf.

## Prüfung und tatsächliche Ergebnisse

Der [Client-/GLB-Prüfer](../apps/client/scripts/check-terminals.mjs) kontrolliert alle 18 Dateien mit Khronos-Validator und Babylon-Reimport: ausgewählte Spezifikation, eingebettete Bilder, Maße nach Achsenumwandlung, Ursprung, Material-/Dateibudget und geometrische Gleichheit bei bloßem Palettenwechsel. Die kleinere Variante hat exakt den vorgesehenen Größenfaktor. Ein isolierter frischer Bau muss dieselben GLB-Bytes liefern. Beschädigte generierte Cachedateien werden neu gebaut.

Der Cache verwendet aufgelöste Parameter, Codehash, Blender- und NumPy-Version sowie die Hashes aller vier Lieferdateien. Er spart unveränderte Erzeugung; er vermeidet keine notwendige neue Prüfung nach einer Änderung. Das Manifest nennt die Treffer und neu gebauten Varianten.

Der Browsertest prüft alle Auswahlen anhand tatsächlich gerenderter Pixel, Downloads, Ansichten, rasches Umschalten und Erholung nach Ladefehler. Eine Ausgabe wird erst freigegeben, wenn die Texturen und Materialien bereit sind. Kontaktbilder sind Screenshots der gelieferten GLBs und keine unabhängig modellierten Werbeansichten.

Die unabhängige Blender-Prüfung importiert die drei Standardbauformen und öffnet deren drei Blend-Lieferungen. Sie kontrolliert Maße, Unterkante, fünf Mesh-/Materialgruppen und gepackte 128×128-Displays. Sechs ungültige Rezeptfälle werden abgewiesen:

```powershell
& 'C:/Program Files/Blender Foundation/Blender 5.2/blender.exe' --background --factory-startup --disable-autoexec --threads 4 --python-exit-code 1 --python tools/terminals/verify_terminal_family.py
```

Belegte Werte der Ausgangsfamilie:

- Standterminal **444 Dreiecke**, Pult **366**, Wandterminal **206**; jeweils fünf Materialien/Meshgruppen.
- GLB-Größe **18.412–32.432 Bytes**, einschließlich eingebetteter Displaygrafik und Rezeptmetadaten.
- Alle 18 GLBs: **0 Khronos-Fehler und 0 Warnungen**. Referenzbau im unabhängigen Prozess bytegleich.
- Unveränderter Familienlauf: **18 Cachetreffer, 0 Neubauten**. Ein geänderter Seed verändert das Display ohne Geometrieänderung.
- [GLB-/Browserbericht](../artifacts/terminals/check.json), [Blender-Bericht](../artifacts/terminals/blender-check.json), [Kontaktbogen](../artifacts/terminals/contact-sheet.png), [Vorschau](../artifacts/terminals/workshop.png).

Die Grenzen von 2.400 Dreiecken, fünf Materialien und 200.000 GLB-Bytes sind Pilotbudgets, keine gemessenen Browserleistungsgrenzen. Fünf Materialgruppen können entsprechend viele Drawcalls verursachen; Atlas-/Materialzusammenlegung und Instancing sind mögliche spätere Optimierungen. Keine FPS-, LOD-, Kollisions-, Sicht- oder Mehrspielerabnahme wird daraus abgeleitet. Spielintegration und menschliche Artabnahme bleiben offen.
