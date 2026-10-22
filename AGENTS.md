# NEON CONTRACT – Regeln für Coding-Agenten

Diese Datei gilt für das gesamte Projekt. Direkte Nutzeranweisungen haben Vorrang.

## Vor jeder Aufgabe
- Lies `README.md`, `docs/ARCHITEKTUR.md`, `docs/PROTOTYP.md` und den betroffenen Meilenstein in `docs/ENTWICKLUNGSPLAN.md`.
- Hole die zur Aufgabe passenden Abschnitte aus dem Tag-Index: `powershell -NoProfile -File tools/rag/NeonRag.ps1 -Tag <Kennung>`. Kennungen sind MOD-01–MOD-15, S01–S23, GEN-00–GEN-12 samt Teilkennungen wie GEN-02A, AP-01–AP-36, M0–M7 und DEC-0001–DEC-0014. Mehrere Kennungen gehen in denselben Aufruf, zum Beispiel `-Tag MOD-03,AP-05` oder `-Tag S01-S04`. Der Treffer enthält Planabschnitt, MVP-Mindestvertrag und Verweise. Spätere Stufen erweitern nicht automatisch v0.1. Bei Abweichungen gilt das Quelldokument. Meldet das Skript veraltete Quellen, den Index mit `-Build` neu schreiben.
- Beachte `docs/MVP.md` und den passenden Mindestvertrag in `docs/MVP_MODULE.md`, `docs/MVP_SCREENS.md` oder `docs/MVP_GENERATOREN.md`; ein späteres „Minimum bei Einführung“ ist kein v0.1-Pflichtumfang.
- `NEON_CONTRACT_Konzept.md` ist die unveränderte Ausgangsquelle. Die Planungsdokumente sind Vorschläge; behaupte keine Freigabe.
- Aktuell ist nur Planung beauftragt. Beginne Implementierung erst, wenn der Nutzer eine entsprechende Folgeaufgabe erteilt.
- Arbeite innerhalb dieses Projektordners. Verwende keine Pakete, Skripte oder Dateien des benachbarten Projekts als stillschweigende Grundlage.

## Umfang und Arbeitsweise
- Liefere kleine, prüfbare Änderungen mit klarem Ziel und Nicht-Zielen; keine unangefragte Ausweitung zur Kampagne.
- Beachte die Trennung v0.1 Kernmission und v0.2 vollständiger Konzept-Slice. Acht-Spieler-Tauglichkeit nicht aus vier Slots ableiten.
- Begründe Abweichungen vom Plan. Halte neue Grundentscheidungen unter `docs/decisions/` fest und aktualisiere betroffene Dokumente.
- Nutze weitere Agenten nur, wenn ausdrücklich beauftragt oder durch geltende Anweisungen vorgesehen; trenne dann Dateien und Zuständigkeiten.
- Verändere keine fremde Arbeit und führe keine pauschalen Rücksetzungen aus. Prüfe vor Änderungen den vorhandenen Projektstand.

## Architektur
- `packages/sim` enthält ausschließlich deterministische Regeln und Domain-Typen; keine Imports aus Babylon.js, Phaser, React, Colyseus, DOM, Node-IO oder Bots.
- Simulationsschritte sind synchron und verändern ihre Eingaben nicht. Kein `Date.now()`, `Math.random()`, Netzwerk oder Timer im Regelkern.
- Verwende Integer, gespeicherten seedbaren RNG, stabile IDs und explizite Sortier-/Gleichstandsregeln. Bot-RNG und Kampf-RNG bleiben getrennt.
- Replays benötigen Anfangszustand, Versionen/Content-Hash und geordnete Eingaben einschließlich relevanter Fristen und Controllerwechsel.
- Beide Zugmodelle verwenden dieselben Aktionsregeln. Unterschiedlich sind Eingabeannahme und Reihenfolge, nicht eine zweite Kampfimplementierung.
- Der Server entscheidet über Besitz, AP, Treffer und Missionsfortschritt. Clients senden Wünsche und zeigen bestätigte Ergebnisse.
- Colyseus-Schemas sind Transportmodelle, keine Simulationsobjekte. Verborgene Daten auch aus Events, Fehlern und Diagnoseantworten filtern.
- Babylon.js zeichnet die Taktikansicht und verarbeitet ihre Eingaben; React stellt die Bedienoberfläche. Keine verbindliche Spielregel in Szenen- oder Komponenten-Code. Die Zielansicht steht in `docs/decisions/0007-babylon-taktikansicht.md`. Weitere Taktikarbeit setzt die orthografische Fassung von `?stueck=raster` und `?stueck=sicht` fort, siehe `docs/decisions/0013-isometrische-fortsetzung.md`. Die älteren Phaser- und DOM-Stücke bleiben erreichbar und sind nicht diese Fortsetzung.
- Bots erhalten nur erlaubte Beobachtungen und verwenden dieselben Spielbefehle wie Menschen. Kein allwissender Vorteil für Balancebots.
- Begleiter verbrauchen Ressourcen des Hauptcharakters; kein unabhängiger zusätzlicher Vollzug ohne neue Designentscheidung.
- Der Missionsgenerator erzeugt zuerst ein interessantes taktisches Problem und anschließend eine glaubwürdige Cyberpunk-Umgebung darum. Die Stufen und ihre Grenzen stehen in `docs/decisions/0008-hierarchischer-missionsgenerator.md`. Dekoration, WFC und Fassaden erzeugen keine Deckung, Sichtlinie oder Missionsregel.

## Netzwerk und Daten
- Prüfe externe Nachrichten und Content zur Laufzeit: Typ, Größe, IDs, Phase, Besitz und Ressourcen. TypeScript ersetzt diese Prüfung nicht.
- Dedupliziere Command-IDs, bearbeite Raumaktionen seriell und mache Controllerwechsel eindeutig. Reconnect darf Ressourcen nicht zurücksetzen.
- Trenne vollständigen Serverzustand, gefilterten Clientzustand und Animation. Ein Snapshot muss einen Client ohne alte Animationen synchronisieren.
- Spielwerte gehören in versionierte Regeldaten. Speichere keine Tokens oder sonstigen Zugangsdaten in Logs, Replays oder Testfixtures.
- Dokumentiere bei Assets Quelle/Nutzungsrecht, Erstellungsweg und Format. Lesbarkeit vor grafischer Ausarbeitung.

## Qualität und Abschluss
- TypeScript strikt; neue Abhängigkeiten nur für einen konkreten Bedarf. Versionen zur installierten API prüfen und Lockfile pflegen.
- Tests prüfen beobachtbares Verhalten: AP, Sicht, Deckung, Reaktionen, konkurrierende Befehle, Besitz, Missionsabschluss und Replay-Gleichheit.
- Führe die zur Änderung passenden vorhandenen Prüfungen aus. Ein behobener Regelfehler erhält einen reproduzierbaren Regressionsfall.
- Lies ausführbare Befehle aus `package.json` und der aktuellen Dokumentation. Derzeit gibt es noch keine installierte Toolchain oder Testscripts.
- Für Netzwerk-/UI-Änderungen passende Mehrclient- und Reconnect-Szenarien prüfen; Bots ersetzen keine menschliche Spielabnahme.
- Berichte knapp, was geändert und tatsächlich geprüft wurde und was offenbleibt. Keine erfundenen Testergebnisse oder gemessenen Spielzeiten.
- Ein Meilenstein ist erst abgeschlossen, wenn seine Abnahmekriterien belegt sind; menschliche Prüfungen gegebenenfalls ausdrücklich offenlassen.
