# 0041 · Vektorkarte aus Gebäuden und Straßen

Datum: 24.10.2026 · Status: durch die direkte Nutzeranweisung begonnen. Händler, Auftragsmarker und die menschliche M3-Abnahme bleiben offen.

## Anlass

[0032](0032-lager-slots-und-stadtkarte.md) zeichnet 32 Orte als blaue Blöcke und 49 handgesetzte Korridore. Die Schrägansicht macht daraus je Ort einen senkrechten Balken. Die Manhattan-Voronoi-Zellen zeichnen Stadtteile. Die direkte Anweisung will stattdessen eine Stadtkarte aus Vektoren: einzelne Gebäude als Flächen, auch kleinere Straßen als weiße Linien.

## Entscheidung

- `?stueck=stadt` zeichnet Gebäudeumrisse und Straßenpolylinien in SVG. Gebäude sind blaue Flächen. Fernstraßen und die kleineren Straßen sind weiß, die kleineren dünner. Die Karte lässt sich verschieben, zoomen und in der Ebene drehen.
- Die Geometrie ist eine vereinfachte OpenStreetMap-Abfrage, Lizenz ODbL 1.0. Fernstraßen sind `motorway`, `trunk`, `primary` und ihre Link-Wege im bisherigen Ausschnitt. Kleinere Straßen sind `secondary`, `tertiary`, `unclassified`, `residential`, `living_street` und ihre Link-Wege, 1300 m um jeden der 32 Orte. Gebäudeumrisse liegen 850 m um jeden Ort. Je 7 Karteneinheiten bleibt die größte Fläche, höchstens 160 Gebäude je Ort. Koordinaten sind Ganzzahlen im Maß 10000 der bisherigen Längen- und Breitengrenzen. Das Werkzeug ist `tools/city/fetch-rhein-ruhr-map.mjs`.
- Der Nachbarschaftsgraph mit 32 Orten und 49 Korridoren bleibt die Abfrage für `cityNeighbors`. Die neuen Linien sind keine Wegfindung und keine Missionskante. Voronoi-Zellen bleiben als reine Gebietsabfrage in `packages/sim` und werden auf der Karte nicht mehr gezeichnet.
- Die Flächen und Linien erzeugen keine Deckung, keine Sichtlinie und keine Missionsregel.

## Nicht in dieser Scheibe

Rasterkacheln, Höhen der Gebäude, Wegfindung auf dem Straßennetz, Wahl eines Auftrags von der Karte, Händler und die menschliche M3-Abnahme.

## Verweise

[0032](0032-lager-slots-und-stadtkarte.md) · [NAVIGATION.md](../NAVIGATION.md)
