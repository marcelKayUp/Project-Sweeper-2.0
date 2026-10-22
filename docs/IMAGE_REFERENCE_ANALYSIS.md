# Bildreferenzen: Klassifizierung, Symmetrie und Flächen

Stand: 22.10.2026 · Auf Folgeauftrag implementierter Analyse-Slice. Der [Asset-Skill](../.agents/skills/asset-families/SKILL.md) verwendet einen kleinen semantischen Auftrag und eine allgemeine CPU-Bildanalyse. Der [Fahrzeugpilot v2](IMAGE_REFERENCE_PILOT.md) übernimmt deren gemessene Profilkorrekturen in den Meshbau. Klasse, Flächenbedeutung und grobe Grenzen werden weiterhin vom Agenten vorgegeben; ein automatischer semantischer Bildklassifikator ist nicht enthalten. Die Objektkontur kann seit [0025](decisions/0025-neuronale-hilfsmodelle-als-eingabe.md) optional aus einer SAM-2-Maske stammen (Abschnitt 7).

## 1. Klasse und Bauweise getrennt erfassen

Die Objektklasse wählt passende Vorlagen, Suchverfahren und mögliche Bauteile. Sie legt die Geometrie nicht endgültig fest. Beispiele für Vorlagenfamilien sind Fahrzeug, Möbel, Pflanze, Waffe und technisches Gerät. Unbekannte oder gemischte Objekte bleiben zulässig.

Ein kompakter Auftrag nennt Hauptklasse, Untertyp und Bauweise: etwa `vehicle / articulated-truck / manufactured-mixed`. Die Bauweise unterscheidet überwiegend ebene, überwiegend gekrümmte, organische und gemischte Formen. Ein gerundetes Fahrzeug braucht andere Flächenannahmen als ein kantiger Schrank. Auch ein künstlicher Gegenstand besteht nicht zwangsläufig aus rechtwinkligen Ebenen.

Diese semantische Einordnung nimmt der bildfähige Agent einmalig vor und speichert sie als Daten. Der [Klassenkatalog](../assets/specs/reference-analysis/classes.json) liefert mögliche Symmetrien und Bauteile für Fahrzeug, Möbel, Pflanze, Waffe, Gerät und unbekannte Objekte. Das ist eine Modellentscheidung und wird nicht als Ergebnis des Python-Kantendetektors ausgegeben. Bei unsicherer Zuordnung bleibt `unknown` zulässig. Die implementierte Geometrieverfeinerung betrifft zunächst künstliche, als eben eingeordnete Flächen.

## 2. Symmetrie als Hypothese pro Bauteil

Die Klasse liefert mögliche Symmetrien. Die Bildmerkmale, der Bauteiltyp und gegebenenfalls weitere Ansichten entscheiden, welche davon tatsächlich genutzt werden dürfen.

- Fahrzeug: mögliche bilaterale Symmetrie der Karosserie; Räder als wiederholte Teile. Anbauten und Beschriftungen gesondert behandeln.
- Möbel: je nach Untertyp bilaterale oder rotatorische Symmetrie, Wiederholung von Beinen/Modulen oder keine Symmetrie.
- Pflanze: Verzweigungs- und Wachstumsregeln; exakte Spiegelung ist keine allgemeine Annahme.
- Waffe: mögliche Rotationssymmetrie des Laufs; Gehäuse, Auswurf, Bedienelemente und Zubehör einzeln beurteilen.

Jede Hypothese nennt Typ, Ebene/Achse im Objektkoordinatensystem, Geltungsbereich, Ausnahmen und Herkunft. Statuswerte sind `candidate`, `supported`, `assumed`, `rejected` oder `unknown`. Aus einer Klasse vorgeschlagene oder für unsichtbare Seiten angenommene Symmetrie erhält dadurch keinen Belegstatus.

Symmetrie im 3D-Objekt bedeutet unter Perspektive keine einfache Spiegelung der Bildpixel. Geometrie, Material und Beschriftung können unterschiedliche Symmetrien besitzen. Wiederholte Bauteile dürfen dieselbe Geometrie verwenden, ohne dass das ganze Objekt symmetrisch sein muss.

## 3. Flächenkandidaten und Grenzarten erfassen

Die Bildanalyse soll zusammenhängende Regionen, längere Linien, Ecken und Nachbarschaften liefern. Daraus werden Flächenkandidaten gebildet. Jeder Kandidat benennt die vermutete Form (`planar`, `curved`, `mixed`, `unknown`), Bildregion, sichtbare und verdeckte Grenzen sowie Herkunft und Unsicherheit.

Grenzen erhalten eine eigene Bedeutung:

- `silhouette`: sichtbarer äußerer Umriss;
- `crease`: vermuteter geometrischer Knick;
- `part-seam`: Bauteilfuge, deren Tiefenwirkung noch zu beurteilen ist;
- `appearance`: Farb-, Material- oder Texturwechsel;
- `lighting`: vermuteter Schatten oder Reflex;
- `occlusion`: Grenze einer Verdeckung;
- `unknown`: Bedeutung nicht hinreichend geklärt.

Nur ausreichend gestützte Geometriegrenzen sollen den Meshbau steuern. Ein Materialwechsel auf einer ebenen Fläche erzeugt kein neues Formsegment. Eine große einfarbige Region beweist umgekehrt keine Ebene.

Für künstliche Objekte bieten Linien-/Eckenerkennung und anschließend begrenzte Linienanpassung wiederverwendbare Bausteine. Die [OpenCV-Dokumentation zu Hough-Linien](https://docs.opencv.org/4.x/d9/db0/tutorial_hough_lines.html) und [Harris-Ecken](https://docs.opencv.org/4.x/dc/d0d/tutorial_py_features_harris.html) beschreibt diese Bildmerkmale. Ob sie geometrische Kanten oder Beleuchtungswechsel zeigen, bleibt zusätzlich zu beurteilen. Eine [Homographie](https://docs.opencv.org/4.x/d9/dab/tutorial_homography.html) kann die Perspektive einer begründet ebenen Region behandeln; sie liefert keine eindeutige Tiefe oder Originalmaße des gesamten Gegenstands.

Beim LKW wären Ladeseite, vorderer Abschluss der Ladeeinheit, Oberseite des Vorderteils und Frontblende sinnvolle erste Flächenkandidaten. Die Karosserie-Symmetrie bleibt aus der einen Ansicht eine Annahme. Räder sind wiederholte gekrümmte Bauteile. Das sind Einordnungen des Agenten, noch keine automatisch erkannten Flächen.

## 4. Kleine Übergabe zwischen Agent und Skripten

Der Agent liefert eine kompakte semantische Beschreibung. Die [allgemeine Analyse](../tools/reference-analysis/analyze.py) berechnet Canny-Kanten, Hough-Linien, Eckpunkte und mittels gesetzter Startpunkte Watershed-Regionen. Geprüfte grobe Grenzpolygone werden durch robuste Linienanpassung und benachbarte Linienschnittpunkte begrenzt verfeinert. Der Flächenfüllschritt allein liefert keine geometrische Freigabe. Neue Python-Modellierungslogik pro Motiv soll eine begründete Ausnahme werden.

Der vollständige ausführbare [LKW-Auftrag](../assets/specs/reference-analysis/truck.json) ist das Eingabebeispiel. `schemaVersion: 1`, ID, Referenz/Objektregion, `classification`, `symmetryHypotheses` und `surfaceRequests` bilden den Vertrag. `sourceRecipe` darf Referenzbild, Objektkontur und bereits vorhandene Profilpolygone liefern. Eine neue Referenz kann Bild, Objektpolygon und grobe Grenzen direkt angeben. Pro Fläche genügen ein Startpunkt und eine Formhypothese; nur eine zusätzlich mit `boundary.review: accepted` markierte Grenze mit Modellbindung kann Geometrie verändern.

`boundary.kind` oder die einzelnen `boundary.kinds` unterscheiden Form-, Material- und Lichtgrenzen. Benachbarte Kanten müssen als `crease` oder `silhouette` freigegeben und ausreichend durch Bildkanten gestützt sein, bevor ihr Schnittpunkt einen Profilpunkt versetzt. `binding.targetProfile` benennt das zu ändernde Profil. Der aktuelle Bauadapter kontrolliert Referenz-/Quell-/Werkzeughashes, zulässige Verschiebung und Grenzarten erneut.

Die Achsen sind je Vorlage eindeutig festzulegen; `XZ` setzt die Fahrzeugkonvention mit Längsachse X und Höhe Z voraus. Symmetrie wirkt nur mit `useForGeometry: true`, Status `assumed`/`supported` und Begründung. Ein Klassen-Prior kann keinen Belegstatus erhalten. Die [gemeinsame Symmetriepolitik](../tools/reference-analysis/semantics.py) behandelt Teilbereiche wie `main-body/sideInset` und Ausnahmen. Eine ausgenommene Seitenverkleidung wird im Fahrzeugadapter tatsächlich nur auf einer Seite erzeugt. Eine asymmetrische tragende Ladeeinheit oder fehlende Räder überschreiten den vorhandenen Fahrzeugbaukasten und führen zu einem erkennbaren Fehler.

Gemessene Linien, Regionen und Qualitätswerte stehen im getrennten Ergebnisbericht mit Quellenverweisen. Alle Flächen behalten `planeStatus: unverified`: Eine zweidimensionale Region beweist keine 3D-Ebene. Unsicherheit wird begründet beschrieben; Prozentwerte werden nicht als kalibrierte Erkennungswahrscheinlichkeiten erfunden.

## 5. Ausführung und Wiederverwendung

Einmalig im Projektstamm:

```powershell
corepack pnpm setup:reference-analysis
```

Der Aufruf erzeugt `.venv-assets` und installiert die drei direkt festgeschriebenen [Python-Abhängigkeiten](../tools/reference-analysis/requirements.txt): NumPy, Pillow und OpenCV Headless. Die vorhandene Blender-Installation und globale Python-Pakete werden nicht geändert. `--python` wählt den Basisinterpreter für die Einrichtung; ohne Angabe wird der vorhandene gebündelte Runtime oder lokales Python verwendet. Es entsteht keine zusätzliche Subscription oder Modell-API-Abhängigkeit.

```powershell
corepack pnpm analyze:reference
corepack pnpm analyze:reference --spec artifacts/reference-analysis/checks/cabinet.json --out artifacts/reference-analysis/cabinet
corepack pnpm generate:reference-vehicle
corepack pnpm check:reference-analysis
```

Die Schrankreferenz wird vom Prüflauf erzeugt; das zweite Beispiel funktioniert daher nach `check:reference-analysis`. Die allgemeine CLI akzeptiert eigene `--spec`, `--out`, `--force` und `--python`. Der Messschritt schreibt `report.json`, `geometry-patches.json`, `edges.png` und `overlay.png`. Der [LKW-Bericht](../artifacts/reference-analysis/truck/report.json), die [Geometrieübergabe](../artifacts/reference-analysis/truck/geometry-patches.json) und die [Diagnoseansicht](../artifacts/reference-analysis/truck/overlay.png) sind die tatsächlichen Ergebnisse.

Der Cache bindet Referenzbild, semantischen Auftrag, Quellrezept, Klassenkatalog, Analyse-/Symmetriecode und Python-/Bibliotheksversionen. Ausgabehashes werden geprüft; beschädigte Dateien werden neu berechnet. Warme Läufe geben nur eine kompakte Zusammenfassung aus. Objektkontur und semantische Flächenstartpunkte dürfen weiterhin manuell vorgegeben sein. Die Objektkontur kann optional aus einer SAM-2-Maske stammen (Abschnitt 7). Eine automatische Wahrheitsbewertung der Grenzarten gibt es nicht.

## 6. Tatsächliche Nachweise und Tokenvergleich

Der [Prüfbericht](../artifacts/reference-analysis/checks/checks.json) umfasst das LKW-Foto und eine eigens erzeugte kontrollierte Schrankreferenz mit Farbband, Schatten und einseitigem Griff. Beide verwenden denselben Analysecode. Beim Schrank sinkt die mittlere Eckabweichung gegenüber der bekannten Testgeometrie von 9,19 auf 3,56 Pixel. Das ist ein kontrollierter Funktionstest, kein Benchmark mit unbekannten Realfotos.

Farb-/Schattenkanten und unbestätigte Grenzen verändern keine Profilgeometrie. Klassenannahmen allein aktivieren keine Spiegelung. Cachetreffer und Wiederherstellung beschädigter Ausgaben sind geprüft. Sieben ungültige/unsichere Fälle werden abgewiesen, darunter nicht endliche Punkte, ungültige Grenzarten, gekreuzte Polygone und eine Lichtgrenze als Meshanweisung.

Beim LKW werden acht Bild-Profilpunkte korrigiert und anschließend in veränderte 3D-Koordinaten und echte GLB-Positionsdaten umgesetzt. Der Symmetrietest baut zwei GLBs mit Blender-Reimport: normale Verkleidung mit 2.116 Dreiecken, Verkleidung als asymmetrische Ausnahme mit 2.021. Der Unterschied betrifft tatsächliche Geometrie, nicht nur Metadaten. Der vollständige Produktionslauf prüft zusätzlich Khronos-Konformität und geteilte Radgeometrie.

Die LKW-Außenkontur erreicht aktuell etwa 92,2 Prozent Überdeckung gegenüber 92,7 Prozent im ursprünglichen Pilot. Die neue Messstufe belegt damit keine pauschale Verbesserung des gesamten Modells. Ihr Nachweis sind die messbare Grenzverfeinerung im kontrollierten Test, sichere Trennung der Grenzarten und die tatsächliche Anbindung an Geometrie. Maßstab, verdeckte Formen und Kamerabrennweite bleiben Annahmen.

Werkzeugentwicklung bleibt von der Generierung eines Folgeassets getrennt. Die Skripte selbst rufen kein LLM auf (`llmCallsByScript: 0`); Agentenklassifizierung, Beurteilung und deren Kontext verbrauchen weiterhin Tokens. Der Prüflauf setzt diese Agentenarbeit nicht fälschlich mit null an: Sein Nullwert betrifft ausschließlich die Skriptausführung. Der vorhandene Schrankauftrag kann direkt erneut analysiert werden, ohne Agent oder Änderung des Analyseprogramms. Ein gemessener Gesamtpreis für ein neues unbekanntes Asset und ein automatischer Import von Agenten-Nutzungsdaten sind noch offen.

## 7. Optionale Objektfreistellung mit SAM 2

Seit [0025](decisions/0025-neuronale-hilfsmodelle-als-eingabe.md) kann [SAM 2.1](https://github.com/facebookresearch/sam2) den handgezeichneten Objektumriss ersetzen. Verwendet wird die kleinste Variante Hiera tiny; Code und Checkpoints stehen unter Apache-2.0. Die Maske ersetzt nur den Umriss. Klasse, Flächenstartpunkte, Symmetrie und Grenzfreigaben bleiben Agenteneingaben. Eine Maskenkante ist eine Bildregion, keine freigegebene Formgrenze.

**Auftrag:** Ein Analyseauftrag erhält statt `objectRegion` einen Block `objectSegmentation`. Er enthält `model`, `origin`, optional einen Rahmen `box: [x0, y0, x1, y1]` sowie `points` mit `pointLabels`: 1 gehört zum Objekt, 0 gehört nicht dazu. Nötig sind ein Rahmen oder mindestens ein positiver Punkt; erlaubt sind höchstens 16 Punkte. `objectRegion` und `objectSegmentation` schließen sich aus. Beispiel: der [LKW-Auftrag mit SAM](../assets/specs/reference-analysis/truck-sam.json). Er entspricht dem bisherigen LKW-Auftrag; Rahmen und Punkte hat der Agent nach Bildansicht gesetzt.

**Ablauf** aus dem Projektstamm:

```powershell
corepack pnpm setup:reference-segmentation
corepack pnpm segment:reference --spec assets/specs/reference-analysis/truck-sam.json --out artifacts/reference-analysis/segmentation/truck
corepack pnpm analyze:reference --spec artifacts/reference-analysis/segmentation/truck/analysis-spec.json --out artifacts/reference-analysis/segmentation/truck/analysis
corepack pnpm check:reference-segmentation
```

Die Einrichtung legt `.venv-sam` an und installiert die festen Versionen aus [requirements-sam.txt](../tools/reference-analysis/requirements-sam.txt) nur als fertige Pakete. Danach baut sie die reinen Python-Pakete aus [requirements-sam-source.txt](../tools/reference-analysis/requirements-sam-source.txt) lokal, ohne CUDA-Erweiterung (`SAM2_BUILD_CUDA=0`). Anschließend lädt sie den Checkpoint aus der in [sam-models.json](../tools/reference-analysis/sam-models.json) eingetragenen Meta-Adresse nach `.venv-sam/models`. Ist der Download gesperrt, die Datei manuell herunterladen und mit `--from-file <Pfad>` übernehmen. Ein eingetragener SHA-256 wird geprüft. Solange keiner eingetragen ist, meldet die Einrichtung den berechneten Wert zum Festschreiben.

**Ergebnis:** `segment:reference` schreibt `object-mask.png` (die gewählte SAM-Maske), `mask-overlay.png`, `object-mask.json` und `analysis-spec.json`. `object-mask.json` enthält Prompt, Checkpoint-Hash, Lizenz, Versionen, Score, Messwerte und Laufzeit. `analysis-spec.json` ist der unveränderte Auftrag mit Polygon und `objectRegionProvenance`. Das unveränderte `analyze.py` verarbeitet ihn wie einen handgezeichneten Umriss und bindet über den Auftragshash auch den Maskenhash. Der Cache des Segmentierschritts bindet Auftrag, Bild, Code, Modellliste, Checkpoint-Hash, Paketversionen und Threadzahl. SAM läuft auf der CPU mit fester Threadzahl (Standard 4) und angeforderten deterministischen Algorithmen.

**Regeln:**
- Die Maske muss ein zusammenhängendes Objekt bilden. Splitter unter 1 % der Hauptfläche werden entfernt und gezählt; ein größerer zweiter Teil führt zum Fehler.
- Ein positiver Punkt außerhalb oder ein negativer Punkt innerhalb der Maske ist ein Widerspruch und führt ebenfalls zum Fehler.
- Löcher werden gemessen. Der Umriss schließt sie wie ein handgezeichnetes Polygon.
- Das Polygon hat höchstens 256 Ecken und darf sich nicht selbst schneiden. Seine Überdeckung mit der Maske wird angegeben.
- Mit Rahmen darf höchstens 1 % der Maske außerhalb des Rahmens liegen; der Rahmen bekommt dafür 2 % Rand, mindestens 4 Pixel.
- Eine Maske über 90 % der Bildfläche wird abgewiesen.

Die letzten beiden Regeln kamen nach einem Test mit Zufallsgewichten dazu: Dessen Maske füllte fast das ganze Bild und wurde von den übrigen Regeln nicht erkannt.

**Prüfungen und Stand vom 22.10.2026:** `check:reference-segmentation` hat einen Offline-Teil und einen Modellteil.

Der Offline-Teil braucht keinen Checkpoint und besteht in der Cloud-Sitzung. Abgewiesen werden 19 ungültige Fälle: falsche Prompts, Umriss und Maske zugleich, unbekanntes Modell, fehlender oder falsch gehashter Checkpoint, leere, geteilte, widersprüchliche, bildfüllende und über den Rahmen laufende Masken. Splitter- und Lochmessung stimmen. `analyze.py` lädt kein PyTorch. Eine bekannte Testschrankmaske ergibt einen Umriss mit 86 Ecken und 0,9991 Überdeckung. Daraus erzeugt der Schritt einen Analyseauftrag, den das unveränderte `analyze.py` verarbeitet. Ergebnis: [checks.json](../artifacts/reference-analysis/segmentation/checks.json) mit `complete: false`.

Der Modellteil verlangt für LKW gegen Handumriss und Testschrank gegen bekannte Fläche jeweils mindestens 0,95 Überdeckung. Das ist eine vorgeschlagene Schwelle; der Handumriss ist selbst nur eine Näherung. Außerdem prüft er:
- gleiche Maske bei Wiederholung,
- Cachetreffer und Wiederherstellung beschädigter Ausgaben,
- eine Differenzansicht gegen den Handumriss,
- den Vergleich der LKW-Analyse mit SAM-Umriss und mit Handumriss,
- die gemessene Laufzeit.

**Noch nicht gelaufen:** Der Checkpoint-Download war in der Cloud-Sitzung durch die Netzwerkrichtlinie gesperrt (`dl.fbaipublicfiles.com`, ebenso `huggingface.co`). Deshalb gibt es noch keine echte SAM-Maske und keinen Qualitätsnachweis; auch der Checkpoint-Hash ist noch nicht eingetragen. Den Ablauf der Modellprüfung habe ich mit einer Ersatzmaske aus dem Handumriss getestet; diese Ergebnisse sind nicht gespeichert.

**Laufzeit mit Zufallsgewichten:** Ein Lauf mit zufällig initialisierten Gewichten derselben Architektur (39,0 Mio. Parameter) maß auf 4 CPU-Threads im Cloud-Container etwa 0,5 s Modellladen und 1,3 s pro Bild. Zwei Läufe ergaben dieselbe Maske. Das belegt Aufruf und Rechenzeit, nicht die Maskenqualität.

**Plattformhinweise:**
- Unter Linux zieht das PyPI-PyTorch mehrere GB CUDA-Pakete, auch bei reiner CPU-Nutzung. Unter Windows sind die PyPI-Pakete reine CPU-Builds.
- PNG-Bytes unterscheiden sich zwischen Plattformen. Maskenhashes sind daher nur innerhalb einer Umgebung vergleichbar; die Pixel des Testschranks waren identisch.
