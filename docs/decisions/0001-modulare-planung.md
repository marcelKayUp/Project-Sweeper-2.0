# 0001 · Modulare Planung von Systemen, Screens und Generatoren

Datum: 20.10.2026 · Status: vorgeschlagen, noch nicht als Implementierungsumfang freigegeben.

## Anlass

Der Nutzer möchte die vorhandenen Konzepte in modulare, planbare Abschnitte zerlegt haben, einschließlich der benötigten Multiplayer-Screens und Generatoren.

## Vorschlag

- Fachliche Systeme als MOD-01 bis MOD-15 beschreiben, ohne daraus separate Dienste zu machen.
- Benutzerabläufe und Ansichten als S01 bis S23 planen; Hauptseiten, Panels und Verbindungszustände ausdrücklich unterscheiden.
- Inhaltserstellung als GEN-00 bis GEN-12 zerlegen, einschließlich unterteilter Level-/NPC-Generatoren und zentraler Validierung.
- Umsetzung als AP-01 bis AP-36 mit Mindestabhängigkeiten und Abnahme führen.
- Die erste Referenzmission bleibt handgebaut. Ein optionaler Generatorstrang M7 folgt auf den Taktiktest M5; kampagnenabhängige Generatoren benötigen die jeweiligen Kampagnensysteme.

## Gründe und Folgen

Screens können früh geplant werden, ohne alle späteren Spielsysteme in v0.1 zu bauen. Datenbesitz bleibt eindeutig: dieselben Charakterregeln versorgen Charakterbogen, Skillliste und Levelaufstieg.

Getrennte Generatoren erlauben gezielte Tests und Austausch einzelner Stufen. Versionierte, eingefrorene Ergebnisse erhalten die Wiederholbarkeit von Missionen und Replays.

Die Planung ergänzt keine externe Infrastruktur und enthält keinen Spielcode. Die Ausbaustufen v0.1/v0.2 bleiben erhalten; Hauptmenü, minimale Settings und taktische Übersicht konkretisieren die bisherige grundlegende Benutzeroberfläche.

## Noch zu entscheiden

Konkreter Grafikstil, detaillierte XP-/Skillökonomie, individuelle Skillkataloge, Handelsregeln und Freischaltkurven werden in ihren Arbeitspaketen geprüft. Die Planung behauptet hierfür keine bereits gefällten Designentscheidungen.

## Verweise

[Modulplan](../MODULE.md) · [Screenplan](../SCREENS.md) · [Generatoren](../GENERATOREN.md) · [Arbeitspakete](../ARBEITSPAKETE.md)
