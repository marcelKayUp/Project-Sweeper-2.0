# 0021 – CC0-Figuren in der Testmission

Datum: 22.10.2026. Auftrag: den Spielserver starten und die neuen Modelle mit der Testmission verbinden.

## Entscheidung

`?stueck=sicht` zeichnet sichtbare Einheiten mit den modularen Quaternius-Bibliotheken. Die Zuordnung ist fest und nur kosmetisch:

- Kite: männlich, Suit, Pistole
- Voss: männlich, Casual2, Pistole
- Nera: weiblich, SciFi, Pistole
- Sol: männlich, Punk, Pistole
- Gegner: männlich, Swat, Pistole

Stehende Figuren spielen `Idle_Gun`. Ein bestätigter Weg, auch über mehrere Felder, spielt `Walk` Feld für Feld. Eine handlungsunfähige Figur spielt `Death`. Crouch und Reload fehlen in der Quelle und werden nicht durch andere Clips ersetzt.

Das 8×8-Raster behält die Kästen. Boden, Wand, Tür, Terminal und Deckung bleiben die bisherigen einfachen Körper. Fehlt eine Bibliothek, bleibt für die betroffene Einheit der Kasten.

## Grenzen

Die Meshes ändern keine Regel. Sicht, Deckung, AP und Treffer bleiben in `packages/sim`. Der Server sendet keine Modelldaten. Unsichtbare Gegner erzeugen kein Mesh. Die separaten Waffenmodelle aus `Models&Animations/Weapons` hängen nicht an den Händen; die Pistole stammt aus der jeweiligen Figurenbibliothek. Menschliche Artabnahme und der volle Sieben-Clip-Vertrag bleiben offen. Kein Abschluss von M1 oder v0.1.

Der Nutzer hat am 22.10.2026 festgelegt, dass die weibliche Bibliothek dieselbe Quaternius-Quelle und dieselbe CC0-1.0-Lizenz hat wie der männliche Master. Der Werkstattkatalog trägt für diese Datei weiter den früheren ungeprüften Marker, weil die Werkstattprüfung diese Kennzeichnung erwartet. Diese Entscheidung ändert die Katalogzeichenkette nicht.

## Nachweis

Der Client-Typecheck besteht. Im Browser unter `http://127.0.0.1:5173/?stueck=sicht` stehen die vier Crew-Figuren auf der Extraktion. Sol geht von Feld 2, 2 nach 2, 3; AP fällt von 8 auf 7, die bekannten Felder von 29 auf 31. Nera geht von Feld 1, 2 nach 1, 6 in vier Schritten. Die Figur läuft dabei von Zellenmitte zu Zellenmitte, jeder Schritt etwa 320 ms, und AP fällt von 8 auf 4. Beide Master-GLBs werden geladen.
