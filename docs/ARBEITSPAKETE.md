# NEON CONTRACT – Planbare Arbeitspakete

Stand: 20.10.2026 · Alle Pakete sind **geplant**, keines begonnen oder abgenommen.

Dies ist die ausführbare Zerlegung des [Entwicklungsplans](ENTWICKLUNGSPLAN.md). Fachliche Details stehen in [MODULE.md](MODULE.md), [SCREENS.md](SCREENS.md) und [GENERATOREN.md](GENERATOREN.md).

## 1. Verwendung

Ein Paket wird als einzelne Umsetzungsaufgabe beauftragt, nach vorhandenen Abhängigkeiten begonnen und anhand seines Ergebnisses abgenommen. Seine lokalen Tests gehören zur Umsetzung; die späteren Integrationspakete ersetzen diese Tests nicht.

Die zugehörigen Einträge in [MVP_MODULE.md](MVP_MODULE.md), [MVP_SCREENS.md](MVP_SCREENS.md) und [MVP_GENERATOREN.md](MVP_GENERATOREN.md) konkretisieren Pflichtfunktionen, Daten, Fehlerfälle und Abnahme. [MVP.md](MVP.md) ist die gemeinsame Umfangsgrenze. Ein erst später vorgesehener Eintrag wird nicht durch seine bloße Dokumentation zur Voraussetzung von AP-01 bis AP-16.

**S:** kleine, abgegrenzte Änderung. **M:** mehrere eng verbundene Komponenten. **L:** zuerst weiter aufteilen. Es gibt hier bewusst keine unaufgeteilten L-Implementierungsaufträge. Nach den ersten drei Paketen Aufwand anhand tatsächlicher Arbeit neu schätzen.

„Nach“ bezeichnet Mindestabhängigkeiten, keine Aufforderung zum Start zusätzlicher Agenten. Bildschirm- und Modul-IDs sind dokumentierte Zuordnungen, keine bereits existierenden Codepfade.

## 2. Fundament und Regeln · M1/M2 · P0

### AP-01 · Lokale Toolchain und Integrationsnachweis

**Größe:** M · **Nach:** Planungsprüfung M0 · **Zuordnung:** MOD-01/07/09.

**Lieferung:** eigenes Projekt, fixierte kompatible Versionen, Start-/Testbefehle und kleiner React-/Colyseus-Durchstich mit zwei Sessions. Die Zielansicht ist die Babylon.js-Szene aus [0007](decisions/0007-babylon-taktikansicht.md). Die Fortsetzung ist die spielbare Fassung aus [0013](decisions/0013-isometrische-fortsetzung.md). Der ältere Phaser-Durchstich bleibt ein früher Nachweis.

**Abnahme:** lokal starten und sauber stoppen; keine doppelte Szeneninstanz. Noch keine vollständige Lobby.

### AP-02 · Domain-Verträge, Zustand und RNG

**Größe:** M · **Nach:** AP-01 · **Zuordnung:** MOD-01/02/12.

**Lieferung:** kleinste Zustands-/Command-/Eventtypen, Versionsfelder, reiner Schritt, Seed/RNG und kanonischer Hash.

**Abnahme:** identischer Eingabestrom liefert identische Ereignisse/Hashes; kein UI-/Netzwerkimport im Kern.

### AP-03 · Rasterbewegung und AP

**Größe:** M · **Nach:** AP-02 · **Zuordnung:** MOD-03/04.

**Lieferung:** Raster, feste Nachbarreihenfolge, Pfad, Blockaden und Schritt-Kosten.

**Abnahme:** Randfelder, belegte Felder, zu wenig AP und konkurrierende Zielzellen getestet.

### AP-04 · Handgebauter Content und Loader

**Größe:** M · **Nach:** AP-02 · **Zuordnung:** MOD-01, GEN-11.

**Lieferung:** 20 × 20 Referenzkarte, Waffen-/Gegnervorlagen und geprüfte Objekt-IDs.

**Abnahme:** kaputte Referenzen/ungültige Werte werden beim Laden erklärt; keine prozedurale Karte nötig.

### AP-05 · Sicht und gerichtete Deckung

**Größe:** M · **Nach:** AP-03/04 · **Zuordnung:** MOD-03.

**Lieferung:** Sichtlinie, Teamsicht, Erkundung und Deckungsmodifikator.

**Abnahme:** symmetrische Sichttests, Eckfälle und Angriff aus geschützter/ungeschützter Richtung.

### AP-06 · Schuss, Munition und Versorgung

**Größe:** M · **Nach:** AP-05 · **Zuordnung:** MOD-04.

**Lieferung:** Zielen, Trefferwurf, Schaden, Nachladen, Medkit und Handlungsunfähigkeit.

**Abnahme:** Kosten/RNG nur für gültige Aktionen; Magazin-/Heilgrenzen und Ausfall geprüft.

### AP-07 · Gemeinsame Teamphase

**Größe:** M · **Nach:** AP-06 · **Zuordnung:** MOD-05.

**Lieferung:** Crew-/Gegnerphase, Bereitstatus, logische Frist-Eingabe und Rundenwechsel.

**Abnahme:** keine Aktionen nach Phasenschluss; AP einmal auffüllen; Replay enthält Phasenbarrieren.

### AP-08 · Overwatch und Bewegungsunterbrechung

**Größe:** M · **Nach:** AP-05/06/07 · **Zuordnung:** MOD-04/05.

**Lieferung:** Reaktionshaltung, Sektor, Reservierung, stabile Reaktionsreihenfolge und Pfadabbruch.

**Abnahme:** mehrere Beobachter, ausgeschaltetes Ziel und Ende der Haltung ohne Endlosschleife.

### AP-09 · Mission vollständig abschließbar

**Größe:** M · **Nach:** AP-04/07/08 · **Zuordnung:** MOD-06.

**Lieferung:** Tür, Datenkopie, Extraktion, Rundenlimit, Erfolg/Verlust und MissionResult.

**Abnahme:** je ein reproduzierbarer Sieg, Verlust und Abbruch; genau ein Abschlussereignis.

### AP-10 · Bots und Headless-Durchlauf

**Größe:** M · **Nach:** AP-09 · **Zuordnung:** MOD-11/12.

**Lieferung:** Wache/Flanker, missionsorientierter Crewbot, Replay-Dateien und erste Seed-Suite.

**Abnahme:** 100 feste Läufe bis regulärem Ende/Rundenlimit ohne ungültigen Zustand; tatsächlicher Sieg und Verlust zusätzlich durch gezielte Szenarien belegt.

**Stand 22.10.2026:** Nachweis in `@neon/sim` und `@neon/bots`. Das Replay ist versioniertes JSON; der Test schreibt es nur in ein temporäres Verzeichnis. Die defensive Ausfallübernahme bleibt AP-15.

## 3. Vier Menschen spielen · M3 · P0

### AP-11 · Autoritativer Raum und Besitz

**Größe:** M · **Nach:** AP-02/07/09 · **Zuordnung:** MOD-07.

**Lieferung:** vier Slots, temporäre Sessions, ein Koordinator, Startvalidierung, Command-IDs und Controller-Epochen.

**Abnahme:** fremde Runner, doppelte Befehle, veraltete Phase und konkurrierender Start werden korrekt behandelt.

**Stand 23.10.2026:** Nachweis in `@neon/server` und `@neon/sim`. Der Raum führt Lobby und Befehle seriell aus. Die Verbindung bestimmt den Runner; eine mitgeschickte Spieler-ID verleiht kein Recht. Dieselbe Command-ID liefert dasselbe Ergebnis ohne zweite Wirkung. Eine falsche Epoche oder ein fremder Runner wird abgelehnt. Die Crewfrist startet bei 90 Sekunden; die Koordination kann vor dem Start 60 oder 120 setzen und hebt damit offene Bereitmeldungen auf. Der Ablauf wird als `close-team-phase` in dieselbe Eingabereihenfolge gelegt. Ungenutzte AP verfallen mit dem bestehenden Phasenende. Neue Befehle sind auf 20 je Session und Sekunde begrenzt, wie schon im Rasterraum; Wiederholungen zählen nicht erneut. Die Epoche beginnt bei 1 und wechselt noch nicht. Die vorhandene Missionsansicht zeigt die gesetzte Frist, hat aber noch keinen Wähler. Die Teamsicht ist in AP-12 nachgewiesen. Reconnect, defensive Übernahme und die Vier-Browser-Prüfung bleiben offen. Regelversion 2, Protokollversion 1.

### AP-12 · TeamView und Synchronisierung

**Größe:** M · **Nach:** AP-05/11 · **Zuordnung:** MOD-08.

**Lieferung:** gefilterte Projektion, Snapshots, Ereignis-Batches, Bestätigungen und Client-Store.

**Abnahme:** keine geheimen Gegnerdaten im Client; fehlende Ereignisse werden über Snapshot behoben.

**Stand 23.10.2026:** Nachweis in `@neon/sim`, `@neon/server` und `apps/client/src/mission/teamStore.test.ts`. Bewegungen und Schüsse fehlen in der Ausgabe, sobald eine beteiligte Einheit nicht in der Teamsicht ist. Eine Ablehnung, die eine versteckte Gegner-ID enthält, wird zu „Aktion abgelehnt.“ Jede Session erhält denselben gefilterten Stand und nur neue, fortlaufend nummerierte Ereignisse. Dieselbe Command-ID hängt kein zweites Ereignis an. Der Client verändert keine Trefferpunkte anhand von Ereignissen. Fehlt eine Nummer, fordert er den Stand mit `hallo` erneut an; der Snapshot ersetzt Anzeige, Cursor und Animation und behält den zugewiesenen Runner. Bekannte Zellen kommen aus diesem Stand. Regelversion 2, Protokollversion 1.

### AP-13 · Zugang und Vorbereitung

**Größe:** M · **Nach:** AP-11/12 · **Screens:** S01–S04, S07/S08, minimale S21/S22.

**Lieferung:** Hauptmenü, Raumzugang, Lobby, Preset-/Ausrüstungswahl, Briefing, Bereitstatus und Start. Die Panels teilen sich einen kleinen UI-Rahmen.

**Abnahme:** vier getrennte Sessions erreichen gemeinsam den Missionsstart; Konfigurationsänderungen invalidieren die richtigen Bereitmeldungen. Falls der UI-Rahmen unerwartet groß wird: Zugang/Settings und Lobby als getrennte Unteraufträge liefern.

**Stand 23.10.2026:** `?stueck=mission` zeigt Menü, privaten Zugang, Lobby, Ausrüstung, Briefing, Bereit und Start. Die Koordination sendet 60, 90 oder 120 Sekunden; der Server hebt die Bereitmeldungen auf und erhöht die Fassung. Einstellungen für Schriftgröße, Kontrast und Bewegung bleiben lokal und enthalten keine Spielwerte. Hilfe beschreibt den vorhandenen Stand und hält die Frist nicht an. Ein Browserdurchlauf hat die gespeicherte Skalierung, die Frist 60 und die aufgehobene Bereitmeldung gesehen. Freie Slots mit einem Bot zu besetzen bleibt offen, weil die erlaubte Bot-Sicht und die Übernahme an der Phasengrenze zu AP-15 gehören. Die menschliche Abnahme bleibt offen.

### AP-14 · Spielansicht und taktische Übersicht

**Größe:** M · **Nach:** AP-09/12/13 · **Screens:** S06 minimal, S09/S10, S12.

**Lieferung:** Babylon.js-Taktikkarte mit orthografischer 45-Grad-Kamera, 90-Grad-Drehung und Zoom, Auswahl, Vorschau, Aktionsleiste, Teamstatus, Timer, Ergebnis und kleine Übersicht. Siehe [0007](decisions/0007-babylon-taktikansicht.md).

**Abnahme:** eine vollständige Mission lässt sich ohne Debugbefehle spielen; aktueller Zustand bleibt nach übersprungener Animation korrekt.

**Stand 23.10.2026:** `?stueck=mission` zeichnet den Einsatz auf der vorhandenen orthografischen Babylon-Karte. Auswahl, 90-Grad-Drehung, Zoom, Bewegungs- und Treffervorschau, Aktionsleiste, Teamstatus, Frist, Ergebnis und die kleine Übersicht lesen nur die bestätigte Teamsicht. Die Ansicht sendet Bewegung, Zielen, Schuss, Nachladen, Overwatch, Medkit, Terminal, Tür, Extraktion und Bereit; der Server entscheidet. Eine übersprungene Animation springt auf den bestätigten Stand. Das vorhandene Vier-Browser-Skript spielt diese Mission bis zum Sieg in Runde 2 und sieht die Karte. Die menschliche Abnahme bleibt offen. Regelversion 2, Protokollversion 1.

### AP-15 · Reconnect und defensive Übernahme

**Größe:** M · **Nach:** AP-10/11/12/14 · **Screen:** S11.

**Lieferung:** Wiederaufnahmeberechtigung, Bots bei Ausfall, Rückgabe an definierter Grenze und verständlicher Verbindungsstatus.

**Abnahme:** Trennung während Aktion/Phase, Rückkehr, zweiter Tab und abgelaufene Reservierung; keine Ressourcenverdopplung.

**Stand 23.10.2026:** Ein Ausfall während der Mission behält Runner, AP, HP, Position und Besitz. Dieselbe Sitzung kann fünf Minuten wieder aufgenommen werden; ein zweiter Tab übernimmt nicht. An der nächsten Crewphasengrenze übernimmt ein defensiver Bot, wenn die Person weg ist. Er liest nur die Teamsicht, heilt sich unter der Hälfte der HP oder meldet Bereit, und nutzt keinen eigenen Zufall. Die Rückgabe an den Menschen folgt an der nächsten Grenze. Die Koordination kann freie Lobby-Slots mit diesem Bot besetzen. Die Prüfung mit vier Browsern, Ausfall und Botübernahme steht in AP-16. Die menschliche Abnahme bleibt offen.

### AP-16 · Vier-Client-Abnahme

**Größe:** M · **Nach:** AP-10/13/14/15 · **Zuordnung:** MOD-12.

**Lieferung:** Mehrbrowser-End-to-End-Test, dokumentierter lokaler Startweg und menschlicher Testbogen.

**Abnahme:** alle v0.1-Kriterien; technische und menschliche Abnahme separat ausweisen. Fehlende Testpersonen nicht durch simulierte Zustimmung ersetzen.

**Stand 23.10.2026:** `pnpm --filter @neon/client mission:vier` spielt die Seeds 1 und 2 in vier getrennten Browserkontexten bis zum Sieg in Runde 2. Der Lauf nutzt Bewegung, Terminal und Extraktion, sieht die orthografische Karte und beim Start keinen verborgenen Gegner. Dieselbe Registerkarte nimmt die Sitzung nach dem Neuladen wieder auf; HP, AP und Position bleiben. Ein zweiter Tab mit dem Einladungscode bleibt draußen. Nach einem weiteren Ausfall übernimmt der defensive Bot an der Crewphasengrenze; HP und Position bleiben, die Rückkehr zeigt die Bot-Kontrolle. Deckung, Munition und Overwatch bleiben in den Regeltests. Der Bogen [M3_TESTBOGEN.md](M3_TESTBOGEN.md) ist leer. Status: technisch spielbar, menschliche Abnahme offen.

## 4. Konzept-Slice vervollständigen · M4/M5 · P1

### AP-17 · Simultane Planung

**Größe:** M · **Nach:** AP-16 · **Zuordnung:** MOD-05, S09.

**Lieferung:** Planbudget, Bearbeiten/Bereit, Umlaufauflösung, Pfadvorschau und Abbruchfeedback.

**Abnahme:** Kollisions-/Zielverlustfälle deterministisch; Regeln identisch zum Teamzug.

### AP-18 · Eine Scout-Drohne

**Größe:** M · **Nach:** AP-16 · **Zuordnung:** MOD-04/11, S07/S09.

**Lieferung:** Besitzerbindung, Ressourcenverbrauch beim Runner, Auswahl, Bewegung und Sicht.

**Abnahme:** keine eigenen AP/Bereitmeldung; Ausfall des Besitzers und Reaktionsfeuer auf Drohne geprüft.

### AP-19 · Alarm und Verstärkung

**Größe:** M · **Nach:** AP-16 · **Zuordnung:** MOD-06, S08/S09.

**Lieferung:** einmaliger Alarm, Lösch-Countdown und vorgeplante Verstärkungswelle.

**Abnahme:** Alarm nur einmal, blockierter Spawn wartet, rechtzeitige Datenkopie stoppt den relevanten Verlustgrund.

### AP-20 · Dritter Gegnertyp, Präzisionswaffe und einfache Verletzung

**Größe:** M · **Nach:** AP-16/19 · **Zuordnung:** MOD-01/04/11.

**Lieferung:** begrenzte vorhandene Regelvarianten für Suppressor, Präzisionswaffe und höhere Bewegungskosten unter halben HP.

**Abnahme:** Ausrüstung/Policy passen zusammen, Werte in Daten gepflegt, UI erklärt Bewegungskosten. Diese drei kleinen Varianten können separat integriert werden; keine neue universelle Effekt-Engine.

### AP-21 · Acht Slots und Hotjoin

**Größe:** M · **Nach:** AP-15/18/19/20 · **Zuordnung:** MOD-07/08, S03/S11.

**Lieferung:** 4/6/8 Konfigurationen, passende Referenzkartenvarianten und sichere Bot-Slotübernahme.

**Abnahme:** acht unabhängige Sessions, reservierter Slot geschützt, Kontrolle nur an Crewphasengrenze, keine Skalierungsänderung durch reine Botübernahme.

### AP-22 · Vergleich und Modusentscheidung

**Größe:** M · **Nach:** AP-17/18/19/20/21 · **Zuordnung:** MOD-11/12.

**Lieferung:** ergänzte Crew-Policies, 600 Baseline-/360 Vergleichsläufe sowie menschliche A/B-Tests gemäß Entwicklungsplan.

**Abnahme:** technische Gates und dokumentierte menschliche Befunde; Moduswahl oder konkret begründete nächste Iteration. Erst damit ist M5 fachlich abgeschlossen.

## 5. Charaktere und Kampagne · M6 · P2

### AP-23 · Save-Verträge und Resultatbuchung

**Größe:** M · **Nach:** AP-22 und Kampagnenauftrag · **Zuordnung:** MOD-01/14.

**Lieferung:** Kampagne, Runneridentität, Besitz, Save-Version und idempotente Anwendung eines MissionResult.

**Abnahme:** Neustart/Laden, eine Migration, doppeltes Resultat und abgebrochene Buchung ohne doppelte Ressourcen.

**Stand 23.10.2026:** Der erste Save hält Besitz, Version 1 und die einmalige Ghost-Floor-Buchung fest; die Migration von Version 0 legt nur das leere Buchungsregister an, zweite Mission und Skills bleiben offen, siehe [0031](decisions/0031-erster-inventar-speicher.md).

### AP-24 · Runner erstellen, auswählen und speichern

**Größe:** M · **Nach:** AP-23 · **Screens:** S04/S05/S06.

**Lieferung:** einfache Charaktererstellung, gespeicherter Katalog und Detailansicht.

**Abnahme:** nur berechtigte Auswahl, keine doppelte Einsatzinstanz; eigenes Profil nach Neuladen unverändert.

### AP-25 · Skills und Levelaufstieg

**Größe:** M · **Nach:** AP-24 · **Screens:** S13/S14.

**Lieferung:** kleine XP-/Punktregel, wenige vorhandene taktische Effekte, Voraussetzungen, Vorschau und transaktionaler Kauf.

**Entwurfsgrundlage:** [Gestufte Charakterentwicklung](CHARAKTERENTWICKLUNG.md) und [Entscheidungsnotiz 0002](decisions/0002-gestufte-charakterentwicklung.md). Vor Implementierung Kosten, Schwellen und das Zusammenspiel von gelernten Techniken und benötigter Ausrüstung festlegen. Zunächst wenige exemplarische Zweige und vorhandene Effekte umsetzen; ein vollständiger Technikkatalog ist ein eigener Ausbau. Vererbung, dauerhafte Lernvoraussetzungen und doppelte Lernwege benötigen nachvollziehbare Nachweise.

**Abnahme:** keine Pflichtklasse, Doppelklick-/Revisionstest, nachvollziehbare Wirkung im nächsten Einsatz.

### AP-26 · Persistente Ausrüstung und Lager

**Größe:** M · **Nach:** AP-24 · **Screens:** S07/S18.

**Lieferung:** Iteminstanzen, Slots, eigenes/gemeinsames Lager und eingefrorener Einsatz-Loadout.

**Abnahme:** konkurrierende Entnahme kann keinen Gegenstand duplizieren; keine Ausrüstungsänderung innerhalb des laufenden Einsatzes.

**Stand 23.10.2026:** Eingefroren wird nur vorhandenes Gewehr oder vorhandene Pistole samt den bisherigen Magazinen und dem Medkit; ein laufender Einsatz ändert dieses Lager nicht, siehe [0031](decisions/0031-erster-inventar-speicher.md).

**Stand 23.10.2026, Slots:** Das gemeinsame Lager und die Slots je Runner trennen Waffe, Magazin und Medkit. Ein Slot fasst höchstens ein Gewehr, eine Pistole, drei Magazine je Waffe und ein Medkit. Einfrieren und Buchen lesen nur diese Slots; Überhang aus älteren Saves wandert ins Lager. Keine Itemdatenbank und kein Händler, siehe [0032](decisions/0032-lager-slots-und-stadtkarte.md).

### AP-27 · Einfacher Hub und zweiter Auftrag

**Größe:** M · **Nach:** AP-23/24/25/26 · **Screens:** S12/S15/S17.

**Lieferung:** zweiter handgebauter Einsatz, Auftragswahl und Nachbereitung mit gebuchten Ergebnissen.

**Abnahme:** zwei vollständige Aufträge mit dazwischen gespeichertem Fortschritt; abwesende Spieler blockieren die Kampagne nicht.

## 6. Einzeln auswählbarer Kampagnenausbau

Diese Pakete sind getrennte Optionen nach M6. Sie sind keine automatische Erweiterung des ersten Prototyps.

### AP-28 · Strategische Stadtkarte

**Größe:** M · **Nach:** AP-27 · **Screen:** S16.

**Lieferung:** handgebauter Bezirksgraph, Auftragsmarker und bekannte Freischaltungen.

**Abnahme:** Karte und Auftragsboard referenzieren dieselben Angebote; keine Open-World-Fortbewegung nötig.

**Stand 23.10.2026:** Die direkte Anweisung liefert nur den abstrakten Straßengraphen, 32 Orte und die groben Korridore, unter `?stueck=stadt`. Auftragsmarker, Freischaltungen, Händler und Fraktionen bleiben offen, siehe [0032](decisions/0032-lager-slots-und-stadtkarte.md).

### AP-29 · Händler und gemeinsame Ökonomie

**Größe:** M · **Nach:** AP-26/27 · **Screen:** S18.

**Lieferung:** kleines Angebot, feste Preise, Kauf/Verkauf und Berechtigungen für gemeinsame Ressourcen.

**Abnahme:** parallele Käufe, zu wenig Guthaben und wiederholte Transaktion korrekt behandelt.

### AP-30 · Klinik und erste Cyberware

**Größe:** M · **Nach:** AP-25/26/27 · **Screen:** S19.

**Lieferung:** eine Behandlung und wenige explizit implementierte Cyberware-Effekte; Begleiterverwaltung später separat.

**Abnahme:** Kosten/Effekt gemeinsam verbucht, Loadout bleibt im Einsatz unverändert, keine versteckte Pflichtverbesserung.

### AP-31 · Fraktionsruf und Journal

**Größe:** M · **Nach:** AP-27; Kartenintegration nach AP-28 · **Screen:** S20.

**Lieferung:** wenige Fraktionen, deterministische Konsequenzen vorhandener Aufträge und nachvollziehbares Journal.

**Abnahme:** Rufänderung genau einmal; gespeicherte Folge beeinflusst ein tatsächlich vorhandenes Angebot.

## 7. Generator-Ausbau · M7 · optional nach M5

**Separater Auftrag vom 21.10.2026:** Der Gebäude-Prototyp setzt Teile von AP-32 bis AP-36 vorgezogen um: Vertrag, Seeds, Raumprogramm, Geometrie, Anker, Deckung, feste Encounter und lokale Vorschau/Export sind vorhanden. Integration in den normalen Missionsclient, vollständige Botläufe und menschliche Abnahme fehlen. Die Pakete werden daher nicht pauschal abgeschlossen. Details: [GEBAEUDEGENERATOR.md](GEBAEUDEGENERATOR.md), [0009](decisions/0009-semantischer-gebaeudegenerator.md).

Dieser Arbeitsstrang kann nach AP-22 unabhängig von der vollständigen Kampagne begonnen werden. „M7“ bezeichnet das Ergebnis, keinen Zwang, vorher alle Ausbaupakete umzusetzen.

### AP-32 · Generatorvertrag und Berichte

**Größe:** M · **Nach:** AP-22 und Generatorauftrag · **Zuordnung:** GEN-00/11.

**Lieferung:** feste Stufen, benannte Unter-Seeds, Versuchsbudget, Manifest, unveränderliches Paket und Rückfallverfahren.

**Abnahme:** Ergebnis und Fehler reproduzierbar; kosmetischer Zufall unabhängig von Kampfdaten.

### AP-33 · Raumgraph und Rastereinbettung

**Flurerschließung Version 5:** Ein eigenes verbundenes Flurnetz mit Wand-/Türtrennung ersetzt Durchgangswege durch Büros. Kurze WC-Wege werden auf der realen Zellgeometrie geprüft und in der Werkstatt angezeigt; CEO höchstens 16 Raster-Schritte. Flächenstufen 28×24 / 32×28 / 32×32, Format 5. Zugangshallen bleiben Programmräume; Flurfelder werden separat bilanziert. Festlegung und Grenzen: [0014](decisions/0014-flurerschliessung-und-sanitaerwege.md). Die folgenden Versionsbeschreibungen sind frühere Ausbaustände.

**Konzernmodell Version 4:** Kapazitätsbezogene Hierarchie, unterschiedliche Büroformen und verpflichtende Konzernnachbarschaften erweitern den beauftragten Teilschnitt. Größere Programme erlauben ungleiche BSP-Flügel. Die Werkstatt zeigt Materialien und Architekturwirkung; siehe [0012](decisions/0012-konzernidentitaet-und-bueroorganisation.md). AP-36 und menschliche Spielabnahme bleiben offen.

**Bedarfsausbau Version 3:** Raumprogramm und Mindestflächen werden vor dem BSP aus dem Betriebsprofil berechnet. Kapazitätsabhängige Instanzen ersetzen feste Slots; örtliche und äußere Funktionen bleiben unterscheidbar. Der gesonderte Auftrag erweitert das frühere Raumzahlbudget auf maximal 32 örtliche Instanzen; siehe [0011](decisions/0011-bedarfsbasiertes-raumprogramm.md). Die nachfolgende ursprüngliche Lieferung bleibt der kleine M7-Zielschnitt, keine behauptete Abnahme.

**Vorhandener Ausbau:** Nach [0010](decisions/0010-bsp-und-graph-grundrisse.md) erzeugen BSP-Teilungen variable Flächen; eine begrenzte Suche bindet Funktionen und vorgegebene Laborgraphen daran. Die feste 4×3-Vorlage entfällt. Suchberichte, Quellennachweis und harte Validierung sind vorhanden; die reguläre Spielabnahme bleibt offen.

**Größe:** M · **Nach:** AP-32 · **Zuordnung:** GEN-02A bis GEN-02D.

**Lieferung:** ein Konzerngebäude mit 8 bis 15 Räumen für die Datenraubmission, per BSP und Raumgraph, mit Haupt- und Alternativweg.

**Abnahme:** zusammenhängende Karte ohne Überschneidung; begrenzte Fehlversuche und sichtbare Diagnose.

### AP-34 · Ziele, Reservierungen und Deckung

**Größe:** M · **Nach:** AP-33 · **Zuordnung:** GEN-02E bis GEN-02H, GEN-03/11.

**Lieferung:** bekannte Interaktionen, Eintritt/Extraktion, freie Zugänge, gerichtete Deckung und Wegprüfung. Platzierung über Gewichte, Constraint-Prüfung und begrenztes Backtracking.

**Abnahme:** kein Pflichtterminal hinter seiner eigenen einzigen Zugangssperre; Deckung zerstört keinen Pflichtweg.

### AP-35 · Encounter, NPCs und Loadouts

**Größe:** M · **Nach:** AP-34 · **Zuordnung:** GEN-04/05/06.

**Lieferung:** begrenzte Zusammenstellung aus vorhandenen Gegnern, gültige Spawn-/Patrolldaten und feste kompatible Ausrüstung.

**Abnahme:** Bedrohungsbudget und Positionen geprüft; NPC-Name verändert keine Waffen-/Wertewahl.

### AP-36 · Generatorvorschau und spielbare Varianten

**Größe:** M · **Nach:** AP-35 · **Screen:** S23 · **Zuordnung:** MOD-12/15.

**Lieferung:** einfacher lokaler Viewer, Seed-/Stufenbericht, 100-Seed-Suite für vier Runner, Export und Laden im normalen Spiel. 1000 Seeds bleiben das spätere Ziel der harten Prüfung.

**Abnahme:** Rückfallrate ausgewiesen, akzeptierte Pakete validiert, repräsentative Varianten von Menschen geprüft. Weitere Crewgrößen erhalten eigene geprüfte Konfigurationen.

## 8. Generatoren nach Bedarf ergänzen

Noch nicht in AP-32 bis AP-36 enthalten sind variable Missionskombinationen (GEN-01), wirtschaftlich ausbalancierte Zufallsbeute (GEN-07), Stadt-/Auftragsangebote (GEN-08), variable Texte/Assets (GEN-09/10) und umfangreiche generierte Negativfälle (GEN-12).

Für jedes davon zuerst eine eigene kleine Aufgabe aus seinem Generatorvertrag ableiten. Voraussetzungen: implementierte Missionstypen für GEN-01, stabile Resultatbuchung/Ökonomie für GEN-07, gespeicherte Kampagnenangebote für GEN-08. Ein Generator darf kein fehlendes Spielsystem durch erfundene Daten ersetzen.

## 9. Lieferpunkte

- **Nach AP-03:** kleinster deterministischer Bewegungstest.
- **Nach AP-10:** vollständige Kernmission ohne Grafik.
- **Nach AP-16:** v0.1, vier Menschen können spielen.
- **Nach AP-22:** v0.2, ursprünglicher Konzept-Slice samt Modusvergleich.
- **Nach AP-27:** erste persistente Kampagnenschleife.
- **Nach AP-36:** begrenzte, geprüfte prozedurale Missionsvarianten.

Ein Paketabschluss nennt Ergebnis, tatsächlich ausgeführte Prüfungen und offene Punkte. Nach jedem Lieferpunkt kann der nächste Umfang anhand realer Ergebnisse gewählt werden.
