# 0024 – Ein Start für die Testmission

Status: entschieden  
Datum: 22.10.2026

## Kontext

[0013](0013-isometrische-fortsetzung.md) macht `?stueck=sicht` zur Fortsetzung der Taktikansicht. Die Adresse ohne Parameter öffnete weiterhin die ältere Phaser-Deckung. Spielserver und Client wurden getrennt gestartet, obwohl die Anleitung bereits `corepack pnpm dev` nennt. Figuren, generierte Karte, Zielen, Medkit und Overwatch lagen damit hinter einer Sonderadresse.

## Entscheidung

- `corepack pnpm dev` startet den Spielserver und den Client. Laufen beide bereits, öffnet der Befehl nur die Mission.
- `http://127.0.0.1:5173/` zeigt dieselbe Testmission wie `?stueck=sicht`: kompaktes Büro, Seed 42, bestätigte Züge, CC0-Figuren, Zielen, Medkit und Overwatch.
- `?stueck=deckung` behält die Phaser-Deckung. `?stueck=raster`, `?stueck=aktionspunkte`, `?stueck=schuss` und `?stueck=mission` bleiben unter ihren bisherigen Adressen.
- Ghost Floor und das 8×8-Raster werden nicht in diese Mission übernommen.

## Folgen

Keine Änderung an Regeln, Seeds oder am Kartenvertrag. Kamera und Rastergrenze aus 0013 gelten weiter. Der parameterlose Einstieg ist ab hier die Testmission.
