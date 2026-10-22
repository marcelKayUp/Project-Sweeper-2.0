# 0022 – Parametrische Terminal-Familie als Assetpilot

Datum: 22.10.2026. Status: Umsetzung eines ausdrücklich beauftragten lokalen Produktionspiloten.

## Auftrag

Auf die Empfehlung einer Terminal-Familie mit Größen, Gehäuseformen und Organisationsfarben lautet der Nutzerauftrag „mache das“. Der Pilot konkretisiert den direkten Meshweg aus [0015](0015-agentengesteuerte-asset-pipeline.md). Die dortige allgemeine Pipeline und neue Spielregeln werden damit nicht pauschal beauftragt.

## Entscheidung

Ein versioniertes JSON-Rezept erzeugt über einen unabhängigen Blender-Python-Prozess drei Bauformen, zwei Größen und drei kosmetische Paletten, insgesamt 18 statische Props. NumPy aus Blender berechnet Geometrieprofile und eine eigene Rasteranzeige. Weitere Bibliotheken, Modell-APIs und Subscriptions sind dafür nicht nötig.

Lieferungen enthalten GLB, editierbare Blend, gepackte Displaygrafik, Einzelrezept und Herkunfts-/Hashmanifest. Blender -Y ist die Vorderseite, die Unterkante liegt bei Z=0; GLB wird im üblichen Y-up-Format exportiert. Eine Einheit entspricht einem Meter. Pro Material werden Meshteile zusammengeführt, unbenutzte UV-Daten entfernt. Die drei Organisationspaletten sind eigenständige kosmetische Beispiele und ersetzen nicht still den bestehenden Gebäudekatalog.

Die separate Seite `terminals.html` zeigt die tatsächlich erzeugten GLBs mit Auswahl, festem Vergleichsmaßstab und Download. Die Produktion veröffentlicht nur beim vollständigen Standardlauf. Eigene Ausgabepfade und Einzelbauten bleiben isoliert. Cachetreffer benötigen übereinstimmende Parameter-, Code-, Werkzeug- und Lieferhashes.

## Qualität und Grenzen

Khronos-Validator, Babylon-Reimport, unabhängiger Blender-Reimport und Browserdarstellung prüfen unterschiedliche Eigenschaften. Ein frischer isolierter Wiederholungsbau prüft GLB-Reproduzierbarkeit; eine veränderte Displayvariante darf die Geometrie nicht ändern. Der Prüfer bildet die exportierten Assets ab, keine nachmodellierte Vorschau.

Keine Änderung an Simulation, Mission, Tür-/Terminalaktionen, Kollisions- oder Sichtdaten. Kein allgemeiner SDF-Generator, kein weiterer Figurenrig und kein vollständiger Propeditor. Die technischen Budgets sind Pilotvorgaben, keine gemessene Framerate. Nachweise und Startweg: [TERMINAL_PILOT.md](../TERMINAL_PILOT.md). Menschliche Artabnahme und spätere Spielintegration bleiben offen.
