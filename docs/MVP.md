# NEON CONTRACT – MVP-Umfang und Abnahme

Stand: 20.10.2026 · Status: spezifizierter Entwurf; keine dieser Funktionen ist bisher implementiert oder abgenommen.

## 1. Was in dieser Planung MVP bedeutet

**MVP bezeichnet hier den ersten intern spielbaren Taktikstand v0.1:** vier Menschen können von der Lobby bis zum Abschluss dieselbe Datenraubmission spielen. Ein Einzeltester kann drei Slots mit Bots besetzen. Regeln, Multiplayer und Bedienung funktionieren zusammen.

Das Produktziel bleibt ein Spiel für 4–8 Personen mit langfristigen Charakteren. **v0.2** prüft acht Spieler, beide Zugmodelle, Drohne, Alarm und Hotjoin. **M6** ergänzt die erste persistente Kampagnenschleife. Die Abnahme von v0.1 allein bestätigt diese späteren Ziele noch nicht.

Ein „Minimum bei Einführung“ beschreibt die kleinste brauchbare Ausführung einer späteren Funktion. Es zieht diese Funktion nicht automatisch in v0.1 vor. So sind beispielsweise Levelaufstieg und Stadtkarte vollständig planbar, ohne den ersten Taktiktest aufzuhalten.

Die Einzelverträge:

- [MVP je Systemmodul](MVP_MODULE.md): MOD-01 bis MOD-15.
- [MVP je Screen](MVP_SCREENS.md): S01 bis S23 und das Einsatzmenü.
- [MVP je Generator](MVP_GENERATOREN.md): GEN-00 bis GEN-12 einschließlich Level-/NPC-Teilmodulen.

Architektur und numerische Kampfregeln bleiben in [ARCHITEKTUR.md](ARCHITEKTUR.md) und [PROTOTYP.md](PROTOTYP.md). Die neuen Verträge präzisieren den erforderlichen Funktionsnachweis. Abweichende neue Regelwerte müssen ausdrücklich im Prototypdokument geändert werden.

## 2. Durchgehender MVP-Spielerweg

1. Hauptmenü öffnen und einen privaten Raum erstellen oder ihm beitreten.
2. Vier Slots mit Menschen/Bots besetzen; jeder Mensch übernimmt genau einen Runner.
3. Eines der beiden Loadout-Presets wählen, Briefing lesen und Bereitschaft bestätigen.
4. Die handgebaute 20 × 20 Mission im gemeinsamen Teamzug starten.
5. Bewegen, Deckung nutzen, schießen/nachladen, Overwatch einsetzen, heilen und interagieren.
6. Daten kopieren, extrahieren oder an einer eindeutigen Verlustbedingung scheitern.
7. Das bestätigte Ergebnis sehen und in die Lobby für einen weiteren Versuch zurückkehren.

Ein Verbindungsabbruch mit anschließender Wiederaufnahme desselben Runners muss innerhalb dieses Ablaufs funktionieren. Ein neuer Mensch darf erst in v0.2 per Hotjoin einen verfügbaren Bot-Slot übernehmen.

## 3. Umfang nach Stufe

**v0.1:** MOD-01 bis MOD-12 in ihren beschriebenen kleinen Ausführungen. MOD-13 liefert lediglich feste Presetdaten, MOD-14 noch keine Kampagnenspeicherung, MOD-15 lediglich Content-Laden und Prüfungen.

**Screenumfang v0.1:** S01–S04, S06 als kleines Informationspanel, S07/S08 als Lobby-Panels, S09/S10, Reconnect-Teil von S11, S12, minimale S21/S22 und Einsatzmenü. Das sind 13 Ansichten plus Einsatzmenü, die in wenigen gemeinsamen Oberflächen umgesetzt werden können.

**v0.2:** dieselben Ansichten erhalten acht Slots, Planmodus, Drohnenanzeige, Alarm und Hotjoin. Keine Kampagnenscreens als Voraussetzung.

**M6:** gespeicherte Runner, einfache Charaktererstellung, Skillliste/Levelaufstieg, Loadout/Lager und Hub mit zwei handgebauten Aufträgen.

Die [gestufte Charakterentwicklung](CHARAKTERENTWICKLUNG.md) wird dabei mit den drei Ausgangsattributen und wenigen exemplarischen Spezialisierungspfaden nachgewiesen. Ihr vollständiger Attribut-/Technikkatalog gehört nicht zum ersten M6-Minimum.

**Späterer Ausbau:** strategische Stadtkarte, Handel, Klinik/Cyberware und Fraktionsjournal; Generatorstrang M7 nach dem Taktiktest. Konkrete Minimalversionen sind trotzdem bereits beschrieben.

## 4. Gemeinsame Mindestqualität

- **Echte Verbindung:** Der Client zeigt Serverergebnisse. Mockdaten allein erfüllen keine funktionale Abnahme.
- **Determinismus:** Gleicher Ausgangszustand, gleiche Regeln und geordnete Eingaben erzeugen dieselben Zustände/Ereignisse. Phasenfristen und relevante Besitzwechsel werden mitprotokolliert.
- **Konsistenz:** Keine negativen AP, doppelte Feldbelegung, mehrfach wirksamen Command-IDs oder zwei menschlichen Controller für dieselbe Einheit.
- **Verständlichkeit:** Aktion, Kosten, verfügbares Ziel und Ablehnungsgrund sind erkennbar; Sicht-/Deckungsinformation stammt aus erlaubten Daten.
- **Fehlerbehandlung:** Verbindung verloren, Aktion abgelehnt und Session abgelaufen führen zu verständlichen Zuständen mit einem verfügbaren nächsten Schritt.
- **Bedienung:** Desktop mit Maus/Tastatur; bei 1366 × 768 und 1920 × 1080 ohne verdeckte Pflichtaktionen. Zusätzliche Markierungen zu Farben, sichtbarer Fokus und skalierbare UI.
- **Betrieb:** Ein dokumentierter lokaler Start-/Testweg, ein Serverprozess und Browser reichen. Installation und Build müssen innerhalb des eigenen Projektordners funktionieren.
- **Menschliche Prüfung:** Vier automatisierte Sessions belegen technische Funktion; mindestens zwei menschliche Viererpartien dienen der v0.1-Spielabnahme. M5 behält die weitergehenden 4-/8-Personen-Kriterien.

MVP-Darstellung darf einfache Tiles, farbige Formen und feste Texte verwenden. Funktionslose Kampagnenmenüs, vorgetäuschte Speicherstände oder erfolgreiche Meldungen ohne Serverbestätigung gelten nicht als funktionierende Minimalversion.

## 5. Gemeinsamer Abnahmenachweis

Jede Umsetzung nennt **ID und Zielstufe**, getesteten Build/Contentstand, das konkrete Szenario, erwartetes Ergebnis, tatsächlich beobachtetes Ergebnis und offene Einschränkungen. Die in den Einzelverträgen genannten Nachweise sind geplante Prüfungen, keine Testergebnisse.

Ein Modul kann technisch fertig sein, während die zugehörige Benutzerführung noch fehlt. Ein Screen kann vollständig aussehen, während Besitzprüfung oder Ergebnisbuchung fehlen. Der MVP-Abschluss erfordert den vollständigen Spielerweg und die passenden Backend-Nachweise.

Als Startpunkt genügen die bestehenden AP-01 bis AP-16. Die MVP-Verträge ergänzen deren Definition von „fertig“; sie erfinden keine neuen parallelen Implementierungsaufträge.

## 6. Grenzen des ersten MVP

Noch keine Accounts, öffentlichen Räume, Kampagnen-XP, Skillkäufe, freie Inventare, prozeduralen Level, eigenen KI-Modelle auf dem Laptop oder integrierter Sprachchat. Platzhalterassets und ein manueller Karteninhalt sind ausreichend.

Reconnect setzt einen weiter laufenden Serverraum voraus. Serverneustart-Wiederherstellung und Hostmigration sind nicht Bestandteil von v0.1. Der Prototyp muss diese Grenze verständlich anzeigen.

Die angestrebte v0.1-Kernmission dauert vorläufig 15–30 Minuten; v0.2 prüft das Produktziel 30–60 Minuten. Bis dahin sind das Testziele, keine gemessenen Spielzeiten.
