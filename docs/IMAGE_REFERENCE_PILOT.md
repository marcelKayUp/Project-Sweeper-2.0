# Bildreferenz → parametrisches Low-Poly-Fahrzeug

Stand: 22.10.2026. Lokaler Versuch anhand des vom Nutzer bereitgestellten Fahrzeugbildes. Der Nutzer stellte das Bild im Anschluss an die Frage nach Kameraschätzung, Konturvermessung und Python-/Blender-Modellierung bereit.

## Ergebnis und Umfang

Der Pilot liefert ein bearbeitbares Blender-Modell, GLB und drei gerenderte Ansichten. Der [Vergleich](../artifacts/reference-truck/comparison.png) zeigt das Referenzbild und die tatsächliche Modellansicht. Das Verfahren folgt der Trennung aus [ASSET_FAMILIES.md](ASSET_FAMILIES.md): eine Geometrie, getrennte Farbrollen und gemeinsam genutzte Radkomponenten. Es ist ein Fahrzeugentwurf, keine Spielintegration.

Die Referenz ist 596×335 Pixel groß. Außenkontur, semantische Ecken und 13 Bild-/Modellbezugspunkte sind im [Rezept](../assets/specs/vehicles/reference-truck.json) vom Agenten manuell annotiert. Diese Zuordnungen wurden nicht automatisch erkannt. Die verdeckte Seite und die Verjüngung der Ladeeinheit sind geometrische Annahmen. Eine angenommene Fahrzeugbreite und angenommene Radmaße setzen den relativen Maßstab; die Meterwerte sind keine aus dem Foto gemessenen Originalmaße.

## Was berechnet wird

Die [nächste Analysestufe](IMAGE_REFERENCE_ANALYSIS.md) konkretisiert die Nutzerideen zu Objektklassifizierung, bauteilweiser Symmetrie und genauerer Abgrenzung von Flächen. Sie ist als Ablauf im Skill hinterlegt. Die folgenden vorhandenen Berechnungen bleiben davon zu unterscheiden; eine allgemeine automatische Flächenerkennung oder daraus gesteuerte neue Meshproduktion ist noch nicht implementiert.

1. Pillow liest und glättet das Bild. NumPy berechnet Helligkeitsgradienten innerhalb der annotierten Fahrzeugmaske. Sechs Linien werden aus Kantenpunkten in schmalen, ebenfalls annotierten Suchbändern angepasst. Schatten und Reflexionen bleiben mögliche Bildkanten.
2. Ein begrenzter, gedämpfter Least-Squares-Fit passt Kameraposition, Orientierung und Brennweite an die 13 Korrespondenzen an. Hauptpunkt in der Bildmitte, keine Objektivverzerrung und kein Rollwinkel sind Modellannahmen.
3. Sichtbare Profilpunkte werden entlang ihrer Kamerastrahlen auf angenommene seitliche Flächen zurückgerechnet. Eine symmetrische, teilweise verjüngte Extrusion erzeugt daraus die Ladeeinheit. Unterbau, Räder, Halterung und Lichtdetails werden parametrisch ergänzt.
4. Blender schreibt die editierbare Quelle und triangulierte GLB. Körperteile werden nach Material zusammengeführt; Reifen, Felge und Nabe verwenden je einen Meshdatensatz für alle sechs Räder. Farben bleiben Materialrollen, keine vervielfachten Modellvarianten.
5. Eine Blender-Kamera mit den berechneten Parametern muss dieselben Bildpunkte projizieren wie die NumPy-Rechnung. Die echten Renderbilder liefern außerdem die Modellsilhouette für den Bildvergleich.

Die Brennweite erreicht beim aktuellen Fit die gesetzte Suchgrenze. Das ist im Bericht ausdrücklich markiert: Kameradaten und angenommene Geometrie sind aus dieser einzelnen Ansicht nicht eindeutig bestimmbar. Die berechnete Kamera ist eine brauchbare Modellierkamera und kein Nachweis der Originalkamera.

## Starten

Aus dem Projektstamm:

```powershell
corepack pnpm generate:reference-vehicle
```

Der Node-Aufruf startet zuerst die Bildanalyse, dann einen getrennten Blender-Hintergrundprozess, anschließend Bildvergleich und Khronos-GLB-Prüfung. Die interaktive Blender-Szene bleibt unberührt. Ein Lauf schreibt die generierten Lieferungen und Diagnosebilder erneut.

Benötigt werden das vorhandene Node/pnpm, Blender mit seinem NumPy sowie ein Python mit Pillow und NumPy. Hier verwendet die Bildanalyse den bereits gebündelten lokalen Codex-Python-Runtime; es wurden keine Pakete installiert. `ASSET_PYTHON_PATH` oder `--python` wählen einen anderen geeigneten Interpreter, `BLENDER_PATH` oder `--blender` die Blender-Installation. Ohne gefundenen gebündelten Interpreter versucht der Aufruf `python`. SciPy, OpenCV, Modell-API und weitere Subscriptions werden für diesen Versuch nicht benötigt.

Die Programme sind [Bildanalyse](../tools/vehicles/analyze_reference.py), [Blender-Bau](../tools/vehicles/build_reference_vehicle.py) und [CLI](../tools/vehicles/run-reference-pilot.mjs). Das annotierte Rezept ist auf dieses Bild und diesen Fahrzeugaufbau zugeschnitten. Ein anderes Motiv benötigt eigene Bezugspunkte, Formannahmen und gegebenenfalls andere Bauteile.

## Lieferungen und geprüfte Grenzen

- [GLB](../assets/generated/vehicles/reference-truck/reference-truck.glb), [Blend](../assets/generated/vehicles/reference-truck/reference-truck.blend), [Manifest](../assets/generated/vehicles/reference-truck/manifest.json).
- [Bildmerkmale/Kamerafit](../artifacts/reference-truck/analysis.json), [Kontur- und Punktmarkierungen](../artifacts/reference-truck/guides.png), [berechnete Kanten](../artifacts/reference-truck/edges.png).
- [Referenzvergleich](../artifacts/reference-truck/comparison.png), [Seitenansicht](../artifacts/reference-truck/side-view.png), [Rückansicht](../artifacts/reference-truck/rear-view.png), [Silhouettenüberlagerung](../artifacts/reference-truck/silhouette-overlay.png).
- [Prüfergebnis](../artifacts/reference-truck/checks.json), [Khronos-Bericht](../artifacts/reference-truck/gltf-validation.json), [Silhouettenwert](../artifacts/reference-truck/silhouette-check.json).

Der Entwurf enthält 2.116 Dreiecke, fünf Materialien und 23 Meshobjekte mit insgesamt acht unterschiedlichen Meshdefinitionen im GLB. Drei Definitionen werden jeweils sechsmal verwendet. Der Export ist ungefähr 78 kB groß und besteht die Khronos-Prüfung mit null Fehlern und null Warnungen. Blender-Reimport prüft die Dreieckszahl; tatsächliche Kamera und NumPy-Projektion stimmen innerhalb von 0,02 Pixeln überein.

Die 13 annotierten Punkte erreichen rund 7,4 Pixel RMS-Abweichung. Die finale Modellsilhouette erreicht etwa 92,7 Prozent Intersection-over-Union mit der manuell markierten Referenzmaske. Dieser Wert bewertet nur die eine bekannte Außenansicht, nicht Innenaufbau, Tiefe, Originalmaße oder Genauigkeit unsichtbarer Flächen. Die zusätzliche Seiten-/Rückansicht macht die ergänzte Geometrie prüfbar.

Die Bildquelle wurde lokal unverändert übernommen und ihr Hash dokumentiert. Urheber/Nutzungsrecht des Referenzbildes wurden nicht mitgeliefert. Es wird nicht als Modelltextur eingebettet; die generierte Geometrie und abstrakten Lichtmarkierungen sind im Projekt erstellt. Herkunft und Prüfstatus stehen im Rezept und Manifest. Menschliche Formabnahme und die Eignung in der tatsächlichen Spielkamera sind offen.
