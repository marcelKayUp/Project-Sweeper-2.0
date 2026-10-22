# Baseline-Kritik: Character-Creator

## Sichtbefund (blender-runner)

Der stärkste Mangel ist die fehlende menschliche Körperlesbarkeit: Die Figur wirkt aus der üblichen Front-, Rück- und Schrägansicht wie eine Reihe glatter Quader und Zylinder, die einen Mantel bilden, statt wie ein stilisierter Mensch.

1. **Kopf und Gesicht:** Der hautfarbene Kopf ist ein langes, fast gesichtsloses Oval mit flacher Oberkante. Schädel, Kiefer, Nase, Ohren und Gesichtsebene sind nicht lesbar. Der pinke Querbalken wirkt wie eine undurchsichtige Zensurleiste, nicht wie eine Brille oder ein sauber integriertes Visier. Der schmale zylindrische Hals verstärkt den Eindruck eines aufgesetzten Kopfes.
2. **Rumpf und Becken:** Der Oberkörper ist ein langes, nahezu gleich breites Rechteck mit gerader Unterkante. Brust, Taille und Becken gehen nicht als Körperformen ineinander über. Die Schulterkappen sitzen wie separate rechteckige Aufsätze.
3. **Gelenke und Gliedmaßen:** Arme sind fast gleichmäßig dünne Stäbe; Ellbogen und Handgelenke fehlen. Die Hände sind kleine hautfarbene Stummel. Beine bleiben von Hüfte bis Knöchel praktisch gerade schmale Säulen ohne klare Oberschenkel-, Knie- oder Wadenform. Die blockigen Schuhe haben keine lesbare Fußform.
4. **Pose und Materialformen:** Front und Rückseite stehen steif und symmetrisch. Im Walk spreizen sich vor allem starre Beine; die Knie-/Hüftbeugung und das Gegenschwingen der Arme lesen sich kaum natürlich. Die pinken Bänder wirken aufgesetzt statt als Kleidung oder Ausrüstung geformt.

## Priorität für die nächste Runde

1. Menschliche Silhouette und Proportionen herstellen: Kopf/Schädel, Schulter-zu-Taille-Übergang, Becken, Oberschenkel/Knie/Waden/Knöchel als zusammenhängende Volumen.
2. Gelenke sowie Hände und Füße klar lesbar machen und die Gehpose natürlich artikulieren.
3. Kleidung und Ausrüstung als integrierte, übereinanderliegende Formen ausarbeiten.

Die derzeitigen 1.024 Dreiecke sind kein Engpass für diesen visuellen Befund: Entscheidend ist die Formgebung, nicht zusätzliche Polygonzahl.

## Bewertungsgrundlage

Sichtprüfung von `artifacts/characters/blender-runner/iso.png`, `front.png`, `back.png`, `walk.png`, sowie den verfügbaren Varianten `artifacts/characters/guard-iso.png`, `tech-iso.png`, `initial.png` und dem Figuren-Workshop-Screenshot `workshop-1366.png`. `report.json` nennt 1.024 Dreiecke, 19 Bones und sieben Clips; technische Erfüllung ersetzt das offene visuelle Urteil nicht.

## Abgleich mit dem offiziellen Referenzbild

Das offizielle Bild `artifacts/characters/gauntlet/reference/modularcharacters.jpg` zeigt eine klare gemeinsame Formensprache: facettierte, kantige Flächen; erkennbare menschliche Gesichter und Kiefer; Haare oder bewusst gestaltete Helme; breite, anatomisch gegliederte Rümpfe; echte Hosen-/Beinformen mit Knie- und Wadenvolumen; Hände mit Fingern; Schuhe mit lesbarer Fußform. Die Figuren sind stilisiert, aber nicht aus gleichförmigen Stäben und Kästen zusammengesetzt. Kleidung und Rüstung bilden erkennbare Schichten mit Volumen und Kanten.

Gegen diese sichtbare Referenz fällt die Baseline vor allem durch ihre glatten, einheitlichen Oberflächen und den schmalen, starren Körper ab. Ihre Kopf-/Gesichtsfläche ist völlig leer, während die Referenz auch mit minimalistischen Augen, Nase, Kiefer, Haar oder Helm eine klare Kopfidentität herstellt. Die Beine der Baseline sind fast unveränderte Säulen; die Referenz macht Hosenbeine, Knie/Waden und Fuß/Sohle mit facettiertem Volumen lesbar. Die Baseline hat stumme Handstummel, während die Referenz klar geformte Hände und Finger zeigt. Die pinken Balken der Baseline liefern keine vergleichbare Form- oder Materialgliederung.

Daraus folgen drei konkrete nächste Anforderungen:

1. Den Rumpf und die Gliedmaßen in facettierte, menschlich proportionierte Volumen umformen: sichtbare Schulter-/Brust-/Taille-/Beckenfolge sowie Oberschenkel, Knie, Waden und Knöchel. Gleichmäßige Zylinder und quaderförmige Säulen erfüllen die Referenz nicht.
2. Den Kopf als stilisiertes menschliches Gesicht oder als sauber gestalteten, thematisch passenden Helm modellieren. Bei Gesichtern braucht es mindestens lesbare Kiefer-/Nasen-/Augenebenen und Haare; bei Visieren eine echte Helm-/Brillenform mit seitlicher Befestigung statt eines freischwebenden Balkens.
3. Hände und Schuhe als erkennbare Körperteile gestalten: Handflächen/Finger und Fußspitze/Sohle müssen aus Front und Schrägansicht lesbar sein. Kleidung/Rüstung soll mit kantigen, klar geschichteten Volumen gegliedert sein.

Die Baselinekritik oben bleibt gültig; der Abschnitt Referenzstatus ist durch diesen direkten Sichtvergleich ersetzt.

