# 0039 – Testeinstieg aus der Sitemap

Datum: 23.10.2026. Auftrag: die Sitemap als Einstieg für das manuelle Testen nutzen.

## Entscheidung

`http://127.0.0.1:5173/` ohne `stueck` zeigt die Prüfliste aus [NAVIGATION.md](../NAVIGATION.md). Vorhandene Flächen sind Sprünge. Geplante Flächen stehen in derselben Reihenfolge und haben keinen Sprung. `?stueck=einstieg` öffnet dieselbe Liste.

Die Testmission bleibt unter `?stueck=sicht`. Raster, Deckung, Aktionspunkte, Schuss, Spielzugang, Stadtkarte, Figuren-Werkstatt, Gebäude-Werkstatt und Terminals behalten ihre Adressen. Die Liste ändert keine Buchung, keine Sicht und keine Missionsregel.

Damit ersetzt diese Entscheidung nur den parameterlosen Einstieg aus [0024](0024-ein-start-fuer-die-testmission.md). Die Testmission selbst bleibt die dort beschriebene Babylon-Ansicht.

## Folgen

Der Spielerweg auf der Liste ist Zugang, Charaktereditor, Stadtkarte, Missionsauswahl, Lobby, Inventar, Level-Up, Mission, Erfolg, Abbruch, Fehlschlag, Auswertung, Einstellungen und Hilfe. Editor, Lobby, Inventar, Mission, Einstellungen und Hilfe teilen sich `?stueck=mission`, weil sie dort nacheinander liegen. Die Stadtkarte hat eine eigene Adresse. Missionsauswahl, Level-Up und die drei getrennten Ausgänge samt Auswertung bleiben geplant.
