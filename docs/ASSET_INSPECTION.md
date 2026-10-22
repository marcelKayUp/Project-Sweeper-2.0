# Lokale Assetprüfung mit Cache

Der Nutzer hat am 22.10.2026 die technische Analyse des ausdrücklich genannten Ordners `Models&Animations` und den Aufbau des vorgeschlagenen Prüflaufs beauftragt. Quellen werden nur gelesen. Der Prüfer importiert keine Assets in die Figuren-Werkstatt oder Mission und verändert keine Spielregeln. Er erweitert die [Asset-Pipeline-Planung](ASSET_PIPELINE.md) um diesen begrenzten GEN-10/GEN-11-Werkzeugschritt.

## Ausführen

Im Projektordner:

```powershell
corepack pnpm inspect:assets
corepack pnpm check:asset-inspection
```

Der Paketbefehl wählt ausdrücklich den vom Nutzer benannten Ordner `../Models&Animations` und erzeugt technische Daten, Vorschaubilder, Kontaktbögen und eine durchsuchbare HTML-Übersicht unter `artifacts/asset-inspection`. Für andere Pfade oder Optionen direkt die Node-CLI verwenden:

```powershell
node tools/assets/inspect-assets.mjs --source '../Models&Animations' --no-thumbnails
```

Diese Schreibweise bewahrt auch `&` in Windows-Pfaden ohne zusätzliche Paketmanager-Shell. Ein anderes Zielverzeichnis wird über `--out` gewählt und muss innerhalb des Projekts, außerhalb des Quellordners liegen. Es werden keine Quelldateien umbenannt, verschoben, normalisiert oder gespeichert.

Benötigt werden die bestehende Node-Installation, Blender 5.2 und für die Kontaktbögen der bereits im Projekt verwendete Playwright-Browser (Chrome/Edge/Chromium). Es werden keine Pakete oder Subscriptions hinzugefügt. Der Blender-Pfad kann mit `--blender` oder der Umgebungsvariable `BLENDER_PATH` gesetzt werden; die hier geprüfte Installation ist `C:/Program Files/Blender Foundation/Blender 5.2/blender.exe`.

Der Hintergrundprozess verwendet `--factory-startup --disable-autoexec`; beim Laden wird `use_scripts=False` gesetzt. Textblöcke werden nur benannt, keine eingebetteten Anweisungen übernommen. Er verändert weder das offene Blender-Fenster noch dessen Datei. Logs bleiben in `inspection.log`; im Terminal erscheinen nur kurze Fortschritts- und Ergebniszeilen.

## Daten und Prüfmethode

- `report.json`: vollständige Datei-/Meshdaten, Materialnamen/Farbmuster, Maße, Bilder-/Bibliotheksreferenzen, Skin-Messwerte, Knochen und Bindematrizen, Animationsfingerabdrücke und fünf Bewegungsproben pro Clip.
- `summary.json` und `summary.md`: kompakter letzter Lauf, Kategorien und Auffälligkeiten. `cacheHits`/`inspected` schließen den separaten vorhandenen Referenzmaster ein; deshalb 132 Prüfeinträge für 131 Quelldateien.
- `thumbs/`, `contact-characters.png`, `contact-weapons.png`, `contact-components.png`: 140 tatsächliche Vorschauen. `index.html` kann lokal im Browser geöffnet und nach Namen durchsucht werden. Es lädt keine externen Dienste oder Schriften.
- `verification.json`: Prüfbelege für Quelldateihashes und Cache-Verhalten. `contact-check.json`: Browserprüfung der Bilder und Suchfunktion.

Für Geometrie und Animationssamples werden ausgeblendete Quellobjekte und Collections ausschließlich im Prozess aktiviert. Original-Sichtbarkeit wird protokolliert. Dreiecke werden nach Modifier-Auswertung in Ruhepose gezählt. Die Rohgewichte stammen aus den ursprünglichen Vertexgruppen; ihre Normierung bzw. Reduktion auf vier Einflüsse ist ein späterer Exportvorgang, keine stillschweigende Analysekorrektur.

Der Rigvergleich berücksichtigt Knochennamen, Eltern, Deformationsflags, Restmatrizen und Objekttransformation. Ein gleicher Rigname oder eine gleiche Knochenanzahl ist kein Kompatibilitätsbeweis. Kurvenfingerabdrücke vergleichen sortierte Pfade, Kanalindizes, Keyframes, Handles und Interpolation (auf sechs Nachkommastellen gerundet). Eine Bewegungsprobe misst auch tatsächliche zeitliche Vertexänderung, nicht nur eine Abweichung von der T-Pose.

Geometriefingerabdrücke verwenden geordnete, auf ihren Bounds-Mittelpunkt zentrierte lokale Vertices (1e−6 Genauigkeit) und Dreiecksindizes. Namen und Materialien sind ausgeschlossen. Das erkennt konservative geometrische Übereinstimmungen; anders angeordnete Topologie kann unentdeckt bleiben. Gleiche Form bedeutet nicht gleiche Materialien, Größe, Skin oder Funktion.

## Cache und Tokenverbrauch

Der Cache berücksichtigt den SHA-256 der Blend-Datei, Prüfercode, Blender-Version, Renderkonfiguration und das Verzeichnis für relative Referenzen. Externe Bilder/Bibliotheken innerhalb des ausdrücklich gewählten Quellordners bzw. Projekts werden ebenfalls gehasht; geänderte Abhängigkeiten machen den Eintrag ungültig. Referenzen außerhalb dieser Wurzeln werden als ungeprüft protokolliert. Es werden keine beliebigen Dateien außerhalb dieser Bereiche eingelesen.

Ein Folgeauftrag muss nur `summary.md` und bei Bedarf ausgewählte Berichtsfelder/Kontaktbilder lesen. Ganze Meshpuffer, 131 Einzelberichte und Vorschaubilder gehören nicht in den Modellkontext. Die unveränderte Analyse benötigt keine weitere Agentenrunde je Datei. Ändert sich der Prüfer selbst, wird korrekt neu geprüft; bei Änderungen nur an Berichts-/Kontaktbogen-Code bleiben die technischen Blender-Daten wiederverwendbar.

Die zusätzliche Canvas-Auswertung ist eine datierte Momentaufnahme mit eingebetteten Bildern und Daten. Sie lädt die JSON-Datei nicht automatisch nach; für den neuesten Lauf sind `summary.json` und `report.json` maßgeblich. Agenten sollen die Canvas-Datei mit ihren eingebetteten Bilddaten nicht vollständig in den Textkontext lesen.

## Tatsächliche Ergebnisse vom 22.10.2026

- 131 Blend-Dateien, 88.036.620 Bytes. 57 vollständige Waffen und 73 Waffenteile nach Dateinamen klassifiziert; die Sammeldatei enthält zehn vollständige Figurensets. 140 Motive gerendert; kein Datei- oder Renderfehler.
- Figuren: 5.956–7.900 Dreiecke je vollständigem Set nach Modifiern; Waffen 668–4.901; Waffenteile 156–2.537. Das sind Assetmesswerte, kein Framerate-Nachweis.
- Neue Figuren und Referenz besitzen dieselben 62 Knochennamen, dieselbe Hierarchie und dieselben Deformationsflags. 59 Restmatrizen weichen ab. Daher eigener Rig oder ausdrücklich geprüfte Anpassung; die Analyse belegt keine direkte Teilemischung mit dem bestehenden Master.
- Alle 24 benannten Clips bewegen die exemplarischen vier Casual-Teile in der Fünf-Sample-Prüfung. 13 Kurvensätze stimmen mit der Referenz überein; keine neuen Clipnamen. Crouch/Reload bleiben offen.
- `Formad_Head` wird ausdrücklich nur für die Review-Gruppe `Formal` zugeordnet. Die Datei und der Objektname bleiben unverändert. 1.313 Quellvertices besitzen mehr als vier Bone-Einflüsse; Rohgewichte müssen beim späteren Export begrenzt/normalisiert und anschließend unabhängig geprüft werden.
- Drei Geometriegruppen zeigen gemeinsam verwendete Magazine in fertigen Waffen und separaten Bauteildateien. Keine bytegleichen Blend-Dateien.
- Keine separate Lizenzdatei. Ein ungenutzter `Texture.png`-Datenblock verweist außerhalb des untersuchten Bereichs; er wird von keinem Material verwendet. Für diese neue Lieferung wird keine Lizenz aus Ähnlichkeit zum vorhandenen Quaternius-Pack abgeleitet.

`check:asset-inspection` besteht: aktuelle 131 Quellen gehasht und unverändert, 140 Bilder geladen, Suche ohne Seitenfehler. Ein isolierter, im Projekt erzeugter Fixture-Test prüft kalt/Cache, geänderte externe PNG-Bytes bei unveränderter Blend-Datei und geänderte Blend-Bytes bei unverändertem Änderungsdatum. Nur jeweils der betroffene Eintrag wird erneut untersucht. Der vollständige Wiederholungslauf verwendet 132 Cache-Einträge und untersucht null Dateien neu. Gemessener Prüferabschnitt: kalt 17,99 s, warm 1,96 s; Blender-Start und Kontaktbogen-Browser kommen hinzu. Die Messwerte sind lokale Einzelläufe.

Canvas-Typecheck besteht. HTML-Kontaktbogen und Figuren-/Waffenbilder wurden visuell geprüft. Menschliche Bewegungs-/Art-Abnahme, Herkunftsbeleg, GLB-Lieferprüfung und Spielintegration bleiben getrennte Folgeschritte. Keine pauschale Asset- oder MVP-Freigabe.
