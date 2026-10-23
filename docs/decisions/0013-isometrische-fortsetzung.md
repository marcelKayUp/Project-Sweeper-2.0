# 0013 – Isometrische Fortsetzung der Taktikansicht

Status: entschieden  
Datum: 21.10.2026

## Kontext

[0007](0007-babylon-taktikansicht.md) legt die orthografische Babylon-Ansicht als Ziel fest und lässt die schon gebauten zweidimensionalen Stücke bestehen. Inzwischen gibt es diese Ansicht spielbar: `?stueck=raster` für das 8×8-Laufstück und `?stueck=sicht` für Sicht, gerichtete Deckung und eine kompakte Karte aus `generateBuilding`. Beide nutzen dieselbe Kamera, dieselbe Bedienleiste und denselben Colyseus-Spielserver. Der Nutzer legt fest, dass weitere Taktikarbeit von dieser Fassung ausgeht.

## Entscheidung

Die Fortsetzung der Taktikansicht ist die orthografische Babylon-Fassung.

- Einstiege: `http://127.0.0.1:5173/?stueck=raster` und `http://127.0.0.1:5173/?stueck=sicht`. Seit [0039](0039-testeinstieg-aus-der-sitemap.md) öffnet die Adresse ohne Parameter die Prüfliste. Die Testmission bleibt `?stueck=sicht`.
- Kamera, Nordmarke, Zoom und 90-Grad-Drehung bleiben die aus `?stueck=raster`. Eine Drehung ändert weder logisch Nord noch Deckung oder Sichtlinie.
- Der Spielserver bestätigt Bewegung, Schuss, Interaktion und Missionsfortschritt. Der Client zeichnet nur den gefilterten Stand.
- Neue taktische Darstellung, Eingabe und serverbestätigte Kartenarbeit erweitern diese Fassung. Dazu gehören die Szenen in `apps/client/src/iso` und die Räume `raster` und `sicht`.
- Das 8×8-Raster bleibt ein eigenes, unverändertes Laufstück. Die erzeugte Karte wird nicht in dieses kleine Raster gezwängt.

Die älteren zweidimensionalen Stücke bleiben im Projekt erreichbar: die Phaser-Deckung unter `?stueck=deckung`, außerdem `?stueck=aktionspunkte`, `?stueck=schuss` und die DOM-Mission unter `?stueck=mission`. Sie sind Bestand und Nachweis, nicht die Grundlage der nächsten Taktikarbeit. Seit [0024](0024-ein-start-fuer-die-testmission.md) öffnet die Adresse ohne Parameter die Testmission.

Die 2D-/3D-Umschaltung der Generatorwerkstatt betrifft Konzernmaterialien und Funktionszonen. Sie ist keine Taktikansicht und fällt nicht unter diese Entscheidung.

## Folgen

- Regeln, AP, Treffer und Missionsabschluss bleiben in `packages/sim`. Diese Entscheidung ändert keine Spielwerte.
- `packages/sim` importiert weiterhin weder Babylon.js noch Phaser.
- Ghost Floor, der Missionsraum und das 8×8-Protokoll bleiben, bis eine eigene Aufgabe sie auf diese Ansicht hebt.
- Die menschliche Abnahme der vollständigen Mission bleibt offen.
