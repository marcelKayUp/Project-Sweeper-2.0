# NEON CONTRACT – MVP je Screen

Stand: 20.10.2026 · Spezifikation; die beschriebenen Ansichten und Nachweise sind noch nicht umgesetzt.

Die Spielerwege und Layoutidee stehen in [SCREENS.md](SCREENS.md), die gemeinsame MVP-Abnahme in [MVP.md](MVP.md). Ein Screen darf als Panel, Tab oder Dialog realisiert werden. Die Mindestfunktionen müssen unabhängig von der Darstellungsform funktionieren.

## S01 · Hauptmenü

**Stufe:** v0.1 erforderlich · **Module:** MOD-07/09 · **Paket:** AP-13.

**Sichtbares Minimum:** Titel, „Spiel erstellen“, „Beitreten“, „Einstellungen“ und „Hilfe“. „Einsatz fortsetzen“ erscheint nur bei vorhandener Wiederaufnahmereferenz und wird vor Rückkehr vom Server geprüft.

**Bedienung/Daten:** Schaltflächen führen in die passenden Ansichten; bestehende Session nicht durch bloße Navigation ersetzen. Kein Account erforderlich.

**Zustände:** normal, Verbindung wird geprüft, Server nicht erreichbar, Session abgelaufen. Bei abgelaufener Session ist ein neuer Zugang möglich.

**Nachweis:** Spiel von hier erstellen und später nach Browserneuladen wieder aufnehmen; abgelaufene Berechtigung führt verständlich zum Zugang.

**Später:** Kampagnenbibliothek, Neuigkeiten, animierte Menüs oder Profilverwaltung.

## S02 · Raum erstellen / Beitreten

**Stufe:** v0.1 erforderlich · **Module:** MOD-07/09 · **Pakete:** AP-11/13.

**Sichtbares Minimum:** Anzeigename, „Raum erstellen“, Eingabefeld für Einladungscode/-link, „Beitreten“ und Zurück. Die Serveradresse stammt normalerweise aus der Testkonfiguration.

**Bedienung/Daten:** Pflichtfelder prüfen, einen Verbindungsversuch auslösen und währenddessen doppelte Klicks sperren. Erfolg übernimmt die serverbestätigte Session.

**Zustände:** Eingabe, Verbinden, ungültiger Code, Raum voll, Version unpassend, Server nicht erreichbar, laufende Mission ohne erlaubten Eintritt.

**Nachweis:** Ein Mensch erstellt einen Raum, drei andere treten über dieselbe Einladung bei; ungültiger Code lässt die Eingabe korrigieren und erzeugt keinen neuen Raum.

**Später:** öffentliche Raumliste, Filter, Matchmaking, Freundesliste.

## S03 · Lobby und Crew

**Stufe:** v0.1 erforderlich; acht Slots v0.2 · **Module:** MOD-07/09 · **Paket:** AP-13.

**Sichtbares Minimum:** vier Crewslots mit Name, Mensch/Bot, Runner/Preset, Verbindung und Bereitstatus; ausgewählte Mission und Teamzeit; Einladung, eigene Bereitmeldung und Koordinator-Start.

**Bedienung/Daten:** Koordinator füllt freie Slots mit Bots; Menschen wählen ihren Runner/Loadout. Mindestens ein verbundener Mensch ist für einen normalen Spielstart erforderlich. Bots blockieren die Bereitschaft nicht.

**Zustände:** frei, reserviert, belegt, nicht bereit, bereit, Start wird bestätigt. Änderungen an gemeinsamen Missionsoptionen setzen alle Bereitmeldungen zurück, eigener Loadoutwechsel die eigene.

**Nachweis:** vier bestätigte Slots starten exakt eine Mission; Start gegen veraltete Konfiguration wird abgewiesen. Koordinator geht → neuer Koordinator sichtbar, Runnerrechte bleiben erhalten.

**Später:** Chat, Abstimmungen über beliebige Optionen, Kampagnenverwaltung. v0.2 ergänzt Moduswahl und 4/6/8 Konfigurationen.

## S04 · Charakterauswahl

**Stufe:** v0.1 erforderliche Presetauswahl; gespeicherte Runner M6 · **Module:** MOD-07, später MOD-13 · **Pakete:** AP-13/24.

**Sichtbares Minimum:** für den eigenen Slot auswählbare Runner-/Presetdarstellung mit Name/Markierung, Kurzbeschreibung und gewählter Ausrüstung. Ein Bestätigen-Schritt genügt.

**Bedienung/Daten:** Die Auswahl reserviert die konkrete Einsatzfigur. Mehrere Spieler dürfen Rifle oder Sidearm verwenden; zwei Spieler dürfen nicht dieselbe Runner-Instanz kontrollieren. S04 und S07 verwenden dieselbe bestätigte Auswahl.

**Zustände:** auswählbar, eigener Runner, fremd/reserviert, Bestätigung läuft, Auswahl abgelehnt.

**Nachweis:** gleicher Presettyp in zwei Slots möglich; Versuch, eine fremde Einheit zu übernehmen, scheitert auf dem Server und bleibt in der UI nachvollziehbar.

**Später:** persönliche Charakterbibliothek, Sortierung, Portraiteditor. M6 ergänzt ausschließlich berechtigte gespeicherte Runner.

## S05 · Charaktererstellung

**Stufe:** kein v0.1/v0.2-Screen; Minimum bei M6 · **Module:** MOD-13/14 · **Paket:** AP-24.

**Sichtbares Minimum bei Einführung:** Name, Auswahl weniger vorhandener Portraits, festes Startprofil/Loadout, sichtbare Ausgangswerte Physisch/Sozial/Mental, Vorschau und „Erstellen“. Die [gestufte Charakterentwicklung](CHARAKTERENTWICKLUNG.md) bleibt die Entwurfsgrundlage. Freie Startpunktverteilung ist für diesen ersten Nachweis nicht erforderlich.

**Bedienung/Daten:** Name validieren, serverseitig genau einen eigenen Runner anlegen und dessen ID in S04 anbieten. Ein Hintergrundtext darf kosmetisch bleiben.

**Zustände:** Entwurf, ungültig, wird gespeichert, erstellt, Speicherung fehlgeschlagen. Zurück verwirft ungespeicherte Eingaben nach Hinweis.

**Nachweis:** Doppelklick auf Erstellen ergibt einen Runner; nach Neuladen ist er auswählbar; bei Fehler bleibt ein korrigierbarer Entwurf.

**Später:** eigene Portraituploads, komplexe Herkunftsboni, freie Attributverteilung oder verpflichtende Klassenwahl.

## S06 · Charakterbogen

**Stufe:** v0.1 als kleines Informationspanel; vollständiger Bogen M6 · **Module:** MOD-08/10/13 · **Pakete:** AP-14/24.

**Sichtbares Minimum:** eigener/ausgewählter Crewrunner mit Name, HP/AP samt Maximum, Waffe/Munition, Medkit und aktuellem Zustand. Im Einsatz nur lesen.

**Bedienung/Daten:** Auswahl aus Karte oder Crewleiste öffnet denselben bestätigten Datensatz. Fremde Crewfiguren bleiben nicht steuerbar.

**Zustände:** aktiv, handlungsunfähig, extrahiert, kurzzeitig nicht synchronisiert. Eine alte Anzeige wird nicht als aktueller Ressourcenstand ausgegeben.

**Nachweis:** bestätigter Schuss, Heilung und Ausfall aktualisieren das Panel; Neuladen setzt keine Werte zurück.

**Minimum M6:** Physisch/Sozial/Mental, wenige aufklappbare Spezialisierungen, XP/Stufe/Punkte und Verweise zu Skills/Loadout ergänzen. Grundwert, eigener Zuschlag, effektiver Pfadwert und aktueller Ausrüstungsbonus müssen unterscheidbar sein. Später ausführliche Biografie und Kampagnenstatistik.

## S07 · Ausrüstung und Einsatz-Loadout

**Stufe:** v0.1 als Lobby-Panel; echtes Inventar M6 · **Module:** MOD-01/07/13 · **Pakete:** AP-13/26.

**Sichtbares Minimum:** Rifle/Sidearm auswählen, Waffenreichweite/AP-Kosten, Magazin/Reserve und festes Medkit ansehen, Auswahl bestätigen.

**Bedienung/Daten:** bestätigtes Preset im eigenen Slot ändern; beim Start einfrieren. Das Panel verwendet dieselbe Auswahl wie S04, keine zweite unabhängige Loadoutkopie.

**Zustände:** bearbeitbar, Bestätigung läuft, gespeichert, Start läuft/gesperrt, Änderung abgelehnt.

**Nachweis:** Presetwechsel setzt eigene Bereitschaft zurück; nach Missionsstart versucht derselbe Client erneut zu wechseln → keine neuen Magazine und kein anderer Einsatz-Loadout.

**Minimum M6:** Itemliste mit zuweisbaren Slots statt aufwendigem Drag-and-drop; der Vergleich erklärt auch hinzugefügte/entfallende Aktionen und benötigte gelernte Techniken. Später Gewichtssystem, frei modifizierbare Waffen und Inventar-Tetris.

## S08 · Briefing

**Stufe:** v0.1 erforderlich, als Lobby-Panel ausreichend · **Module:** MOD-06/09 · **Paket:** AP-13.

**Sichtbares Minimum:** „Ghost Floor“, Hauptziel, Datenkopie, Extraktion, Rundenlimit und Verlustbedingungen; kurze Erklärung des gemeinsamen Teamzugs.

**Bedienung/Daten:** anzeigen und zur Vorbereitung zurückkehren. Das Briefing verwendet die freigegebenen Informationen der tatsächlich gewählten Mission.

**Zustände:** geladen, Auftrag wurde geändert, Auftrag nicht verfügbar. Bereitschaft gilt nicht stillschweigend für einen ausgetauschten Auftrag.

**Nachweis:** Spieler kann aus dem Briefing erklären, wie die Mission gewonnen wird; ungesehene Gegnerpositionen und interne Seeds werden dort nicht angezeigt.

**Später:** Cinematics, Sprecher, Verhandlung und verzweigte Dialoge. v0.2 ergänzt bekannte Alarmrisiken.

## S09 · Spielansicht

**Stufe:** v0.1 zwingend · **Module:** MOD-04/05/06/08/10 · **Paket:** AP-14.

**Sichtbares Minimum:** orthografische 3D-Karte mit 45-Grad-Neigung, 90-Grad-Drehung und Zoom, eigener Runner, Crewstatus, Phase/Timer, Ziel-/Kopierfortschritt, HP/AP/Munition und Aktionsleiste. Verfügbare Aktionen: Bewegung, Zielen, Schuss, Nachladen, Overwatch, Medkit, Interaktion, Extraktion, Bereit. Siehe [0007](decisions/0007-babylon-taktikansicht.md).

**Bedienung/Daten:** Einheit/Ziel auswählen, erlaubte Vorschau ansehen, Aktion senden und Bestätigung abwarten. Vorschau ist unverbindlich; nur bestätigte Ereignisse verändern angezeigte Ressourcen.

**Zustände:** eigene Aktionen erlaubt, Befehl ausstehend, Ablehnung, bereit, Gegnerphase, ausgefallen/extrahiert, Verbindung verloren und Mission beendet. Ausstehende Eingaben dürfen nicht dauerhaft ohne Verbindungs-/Fehlerhinweis hängen.

**Nachweis:** ein Mensch kann die ganze Mission ohne Debugbedienung spielen; AP-/Treffer-/Ablehnungsinformation erklärt die Aktion; ausfallender eigener Runner erlaubt nur noch Beobachtung.

**Minimum v0.2:** Planliste und deren AP-Summe, Bearbeiten/Bereit, Konfliktabbruch, Drohnenselektion sowie Alarm-/Löschanzeige. Später aufwendige Animationen und Effekte.

## S10 · Taktische Übersichtskarte

**Stufe:** v0.1 erforderlich; einfaches Overlay genügt · **Module:** MOD-03/08/10 · **Paket:** AP-14.

**Sichtbares Minimum:** bekannte Einsatzgeometrie, Crewpositionen, aktuell sichtbare Gegner, bekannte Ziele und Extraktion.

**Bedienung/Daten:** öffnen/schließen, auf einen bekannten Bereich fokussieren. Es wird ausschließlich dieselbe TeamView wie in S09 verwendet.

**Zustände:** erkundete/unerforschte Bereiche, aktuelle Sicht, aktive eigene Auswahl. Keine Anzeige geheimer Feindpositionen als Hilfsmarker.

**Nachweis:** Gegner außerhalb der Teamsicht bleibt auch in der Übersicht verborgen; Öffnen hält Timer und Gegneraktionen nicht an.

**Später:** gemeinsame Pings, gezeichnete Pläne und ausführliche Kartenfilter.

## S11 · Reconnect und Hotjoin

**Stufe:** Reconnect in v0.1 erforderlich; Hotjoin v0.2 · **Module:** MOD-07/08/09 · **Paket:** AP-15.

**Sichtbares Minimum:** „Verbindung verloren“, Wiederverbindungsstatus, gegebenenfalls Bot-Übernahme, nächster Übergabezeitpunkt und „Erneut versuchen / Zurück zum Zugang“.

**Bedienung/Daten:** gespeicherte Wiederaufnahmereferenz serverseitig prüfen; aktuellen Snapshot und bestätigten Besitz abwarten, bevor Befehle wieder möglich sind.

**Zustände:** Wiederaufnahme läuft, wartet auf Phasengrenze, Runner wieder übernommen, Frist abgelaufen, Raum beendet, Server nicht erreichbar.

**Nachweis:** Verbindungsabbruch während Bewegung → Rückkehr zur tatsächlich erreichten Position und den aktuellen Ressourcen; zweiter Tab erhält keine gleichzeitige Kontrolle.

**Minimum v0.2:** verfügbare, nicht reservierte Bot-Slots für neue Menschen anzeigen und Übergabe bestätigen. Später neuer Verstärkungsrunner oder Servermigration.

## S12 · Ergebnis und Nachbereitung

**Stufe:** v0.1 erforderlich · **Module:** MOD-06/12, später MOD-14 · **Paket:** AP-14.

**Sichtbares Minimum:** Erfolg/Misserfolg mit Grund, Kopier-/Extraktionsstatus, extrahierte/ausgefallene Runner, Rundenzahl und gemessene Dauer. „Zur Lobby“ für den nächsten Versuch.

**Bedienung/Daten:** ein bestätigtes MissionResult darstellen. Mehrfaches Öffnen erzeugt keine neue Mission und verändert das Ergebnis nicht.

**Zustände:** Ergebnis noch ausstehend, Ergebnis vorhanden, Raum nicht mehr erreichbar. Ohne gespeichertes Ergebnis keine erfundenen Zahlen anzeigen.

**Nachweis:** alle verbundenen Clients sehen denselben Ausgang; derselbe Missionsabschluss bleibt nach wiederholtem Öffnen unverändert.

**Minimum M6:** verbuchte XP/Beute samt Buchungsstatus und Verweis auf freiwillige Entwicklung. Später umfangreiche Diagramme oder Bestenlisten.

## S13 · Skillliste und Skilldetails

**Stufe:** außerhalb v0.1/v0.2; Minimum M6 · **Module:** MOD-01/13 · **Paket:** AP-25.

**Sichtbares Minimum bei Einführung:** mindestens drei implementierte Verbesserungsoptionen in einer eingerückten, aufklappbaren Liste; mindestens ein Attribut- und ein Fertigkeitspfad haben eine Spezialisierung. Je Eintrag: Grundwert/Zuschlag, effektiver Wert, dauerhafte Lernschwelle, Kosten, nächste Wirkung und erworben/verfügbar/gesperrt. Ein großflächiges Baumdiagramm und komplexe Filter sind nicht nötig.

**Bedienung/Daten:** Zweig/Technik auswählen, Detail/Wirkung ansehen, Kaufentwurf in S14 übernehmen. Katalog und serverseitige Regelprüfung verwenden dieselben IDs/Werte. Kompetenz und gelernte Aktion werden unterschieden; bei einer Technik sind ihre Quellen und gegebenenfalls benötigte Ausrüstung sichtbar.

**Zustände:** kein Punkt verfügbar, Voraussetzung fehlt, schon erworben, kaufbar oder Charakter im Einsatz gesperrt.

**Nachweis:** sichtbare Vorschau entspricht der Wirkung des erworbenen Zweigs; gesperrter Kauf scheitert auch über eine direkte Anfrage. Temporäre Ausrüstungsboni öffnen keine dauerhafte Lernschwelle, mehrere Lernwege duplizieren keine Technik.

**Später:** viele Rangstufen, komplette Spezialisierungsbäume, Suche und Respec.

## S14 · Levelaufstieg / Punkte verteilen

**Stufe:** außerhalb v0.1/v0.2; Minimum M6 · **Module:** MOD-13/14 · **Paket:** AP-25.

**Sichtbares Minimum bei Einführung:** alter/neuer Level, verfügbares gemeinsames Entwicklungspunktebudget, ausgewählte allgemeine Verbesserung/Spezialisierung, erwarteter Restbestand, „Bestätigen“ und „Später“. Auswirkungen auf den gewählten Pfad werden vorgeschaut. Mindestens ein echter Levelübergang genügt für den ersten Nachweis; seine XP-Regel bleibt vor Umsetzung festzulegen.

**Bedienung/Daten:** Auswahl ist ein lokaler Entwurf. Ein Kauf mit Änderungs-ID und erwarteter Charakterrevision wird serverseitig gemeinsam mit dem Punkteabzug gebucht.

**Zustände:** Entwurf, Bestätigung läuft, erfolgreich, nicht genug Punkte, veralteter Charakterstand, Verbindungsabbruch.

**Nachweis:** Kauf per Doppelklick/zweitem Tab auslösen → genau eine Wirkung und ein Punkteabzug; Rückkehr nach Verbindungsabbruch zeigt den tatsächlich gebuchten Stand.

**Später:** mehrere Level auf einmal, große Talentplaner und Respec. Unverteilte Punkte dürfen den gemeinsamen Missionsstart nicht blockieren.

## S15 · Safehouse / Kampagnenhub

**Stufe:** außerhalb v0.1/v0.2; Minimum M6 · **Module:** MOD-14 · **Paket:** AP-27.

**Sichtbares Minimum bei Einführung:** Kampagnen-/Crewname, eigene Runner, letzter Einsatz und Zugang zu Aufträgen, Charakter und Lager.

**Bedienung/Daten:** bestätigten Kampagnenstand laden und vorhandene Funktionen öffnen; andere Spieler können gleichzeitig ihre eigenen Runner vorbereiten.

**Zustände:** lädt, geladen, Save nicht verfügbar, inkompatible Version. Ein leerer neuer Kampagnenstand bietet Charaktererstellung.

**Nachweis:** nach gespeichertem Einsatz ist der Hub erreichbar; von dort kann die Crew den zweiten Auftrag vorbereiten.

**Später:** frei begehbare Basis, Räume ausbauen, Produktionszeiten oder dekorative Einrichtungen.

## S16 · Strategische Stadtübersicht

**Stufe:** kein Taktik-MVP; eigener Ausbau nach M6 · **Module:** MOD-14/15 · **Paket:** AP-28.

**Sichtbares Minimum bei Einführung:** kleine handgebaute Übersicht mit mindestens zwei benannten Bezirken, sichtbaren Aufträgen und klar erkennbarer Auswahl.

**Bedienung/Daten:** Bezirk/Auftrag wählen und dessen Details öffnen. Marker und Auftragsboard referenzieren dieselben Angebots-IDs.

**Zustände:** Auftrag verfügbar, gesperrt mit Grund oder abgeschlossen. Nur bekannte Kampagneninformation anzeigen.

**Nachweis:** Auftrag von der Karte wählen, abschließen und zurückkehren → Marker und Board zeigen übereinstimmend den neuen Zustand.

**Später:** prozedurale Megacity, Reisesimulation, animierte Fraktionsfronten oder Open World.

## S17 · Auftragsboard und Auftragsdetails

**Stufe:** v0.1 hat nur das feste Briefing; Minimum M6 · **Module:** MOD-06/14 · **Paket:** AP-27.

**Sichtbares Minimum bei Einführung:** zwei handgebaute Aufträge mit Ziel, bekannter Gefahr, Belohnung und Status; Auftrag auswählen und Vorbereitung öffnen.

**Bedienung/Daten:** Koordinator setzt den Auftrag; die Crew bestätigt Bereitschaft zur geänderten Konfiguration. Aufträge haben persistierte IDs und definierte Wiederholbarkeit.

**Zustände:** verfügbar, ausgewählt, aktiv, abgeschlossen oder gesperrt. Auswahlkonflikte werden vom bestätigten Raumstand aufgelöst.

**Nachweis:** Auswahl erscheint bei allen; einmaliger abgeschlossener Auftrag lässt sich nicht durch erneutes Öffnen neu starten oder auszahlen.

**Später:** zufällige Angebote, tägliche Aufgaben, komplexe Auftraggeberdialoge und Sortiersysteme.

## S18 · Lager und Händler

**Stufe:** kein v0.1-Inventar; Lager M6, Händler später · **Module:** MOD-13/14 · **Pakete:** AP-26/29.

**Sichtbares Minimum Lager:** eigene und gemeinsame Gegenstandsliste, Slots/Mengen, Details sowie Entnehmen/Einlagern. Einfache Listenbedienung genügt.

**Minimum Händler bei Einführung:** kleiner fester Katalog, vorhandenes Guthaben, Preis, Kauf/Verkauf und Bestätigung. Keine prozeduralen Preise erforderlich.

**Daten/Zustände:** serverseitiger Bestand, Eigentum und Revision; Buchung läuft, Bestand geändert, kein Platz beziehungsweise zu wenig Geld.

**Nachweis:** zwei Menschen entnehmen dasselbe Einzelstück → genau eine Entnahme; zweimal derselbe Kaufauftrag → genau eine Buchung.

**Später:** Auktionshaus, Crafting, variable Händlerbeziehungen und Inventar-Tetris.

## S19 · Klinik, Cyberware und Begleiter

**Stufe:** außerhalb des Taktik-MVP, Ausbau nach M6 · **Module:** MOD-13/14 · **Paket:** AP-30.

**Sichtbares Minimum bei Einführung:** ein tatsächlich behandelbarer gespeicherter Zustand, eine Behandlung, wenigstens eine implementierte Cyberware mit Kosten/Wirkung und Bestätigung.

**Bedienung/Daten:** eigenen Runner auswählen, Änderung vorschauen und außerhalb eines aktiven Einsatzes buchen. Wenn noch keine dauerhafte Verletzung existiert, bleibt der Behandlungsbereich bis zu ihrer Implementierung aus der Ansicht.

**Zustände:** möglich, Voraussetzung fehlt, zu wenig Ressourcen, Runner im Einsatz, Buchung läuft/abgeschlossen.

**Nachweis:** Behandlung/Einbau und Kosten werden gemeinsam gespeichert und wirken beim nächsten Einsatz; erneutes Öffnen dupliziert keine Wirkung.

**Später:** Begleiterrekrutierung/-verwaltung als eigener Auftrag, OP-Risiken, viele Implantatslots und Behandlungszeiten.

## S20 · Fraktionen und Journal

**Stufe:** außerhalb des Taktik-MVP, Ausbau nach M6 · **Module:** MOD-14 · **Paket:** AP-31.

**Sichtbares Minimum bei Einführung:** mindestens zwei Fraktionen mit Ruf und kurzer Bedeutung; chronologische Liste abgeschlossener Aufträge mit ihren gebuchten Folgen.

**Bedienung/Daten:** Fraktion/Eintrag öffnen; Informationen aus gespeicherten Kampagnenereignissen lesen. Keine freie Änderung von Ruf durch UI-Eingaben.

**Zustände:** bekannt, noch kein Kontakt und Auftrag abgeschlossen; neue Kampagne erklärt fehlende Einträge über einen sinnvollen Einstiegsweg.

**Nachweis:** Abschluss verändert einen Rufwert und ein vorhandenes Angebot genau einmal; Journal und Wert bleiben nach Neuladen gleich.

**Später:** komplexes Diplomatiesystem, große Kontaktbäume oder automatisch erfundene Konsequenzen.

## S21 · Settings

**Stufe:** kleines funktionales Minimum v0.1 · **Module:** MOD-09 · **Paket:** AP-13.

**Sichtbares Minimum:** UI-Skalierung, zusätzliche Kontrast-/Statusmarkierungen, Bewegungsreduktion, Kamerageschwindigkeit, Animationstempo und „Standard wiederherstellen“.

**Bedienung/Daten:** lokale Präferenzen speichern und beim nächsten Öffnen anwenden. Nur existierende Funktionen bekommen Regler; Ton erst mit Tonassets.

**Zustände:** aktuelle Einstellung, angewandt und zurückgesetzt. Ein geänderter Wert muss eine tatsächlich sichtbare/bedienbare Wirkung haben.

**Nachweis:** UI-Skalierung bleibt nach Neuladen; reduziertes Animationstempo verändert weder AP noch Phasendauer; alle Pflichtaktionen bleiben sichtbar.

**Später:** freie Tastenbelegung, Übersetzungen, umfangreiche Grafikeinstellungen. Zugmodus/Timer gehören zur Raumkonfiguration.

## S22 · Hilfe und Einführung

**Stufe:** kleine erreichbare Hilfe v0.1 · **Module:** MOD-09/10 · **Paket:** AP-13.

**Sichtbares Minimum:** Steuerung, Ziel/Extraktion, AP, Deckung, Overwatch, Bereit/Timer und Reconnect; kurze Texte zur tatsächlich vorhandenen Version.

**Bedienung/Daten:** aus Hauptmenü und Einsatz erreichbar, schließen führt zur vorherigen Ansicht. Aktionsfehler dürfen auf eine passende Erklärung verweisen.

**Zustände:** Einstiegshilfe oder konkreter Regelabschnitt; Hinweise behaupten keine Pause während eines Einsatzes.

**Nachweis:** ein neuer Tester findet die Erklärung für fehlende AP und den Siegweg; Schließen verliert seine Session nicht.

**Später:** geführtes Tutorial, Videos und interaktive Trainingsmissionen.

## S23 · Entwickleransicht für Inhalte und Tests

**Stufe:** kein Spieler-MVP-Screen; Minimum M7 · **Module:** MOD-12/15 · **Paket:** AP-36.

**Sichtbares Minimum bei Einführung:** Seed/Version/Konfiguration, „Erzeugen“, einfache Karten-/NPC-Vorschau, Validierungsbefunde, verwendeter Rückfall und Export eines akzeptierten Pakets.

**Bedienung/Daten:** lokale Contentwerkzeuge bedienen; Fehler auf betroffene Stufe/Objekt-ID beziehen. Exportierte Datei kann die normale Missionseingabe ersetzen.

**Zustände:** erzeugt, validiert, fehlgeschlagen, geprüfte Ersatzvorlage verwendet und exportiert.

**Nachweis:** denselben Seed wiederholen → gleicher Paket-Hash; fehlerhafte Karte lässt sich nicht als akzeptierte Mission exportieren.

**Später:** vollständiger visueller Editor, Onlinekollaboration, umfassendes Analyseportal. In v0.1 genügen Dateien und Testausgaben.

## Einsatzmenü und gemeinsame Dialoge

**Stufe:** v0.1 erforderlich · **Module:** MOD-07/09/10 · **Pakete:** AP-13/14/15.

**Minimum:** Settings/Hilfe öffnen, Verbindung ansehen und bewusst den eigenen Einsatz verlassen. Der Verlassen-Dialog erklärt die vorhandene Bot-Übernahme. Abbrechen des Dialogs kehrt ohne Zustandsänderung zurück.

Gemeinsamer Missionsabbruch ist eine andere Aktion: Alle aktuell verbundenen Menschen bestätigen; Bots zählen nicht mit. Der Server entscheidet anhand der aktuellen Teilnehmerrevision. Ändert sich die Menge menschlicher Teilnehmer während der Abstimmung, muss die Bestätigung auf den neuen Stand bezogen werden; ein Disconnect ist keine Ja-Stimme.

**Nachweis:** persönliches Verlassen beendet nicht die ganze Mission; Öffnen des Menüs pausiert nicht; ein veralteter Abbruchentscheid beendet keinen Einsatz gegen den inzwischen geänderten Teilnehmerstand.

## Übergreifende Screen-Abnahme

Pflichtansichten benötigen zugängliche Beschriftungen, erreichbare Rückwege, sichtbaren Fokus und verständliches Feedback für laufende Änderungen. Darstellung wird bei 1366 × 768 und 1920 × 1080 geprüft. Screenwechsel, Snapshot und Browserneuladen werden zusätzlich in einem durchgehenden Spielerweg geprüft.

Spätere Ansichten werden im v0.1-Menü weggelassen. Ihre hier dokumentierten Minimalversionen sind konkrete spätere Aufgaben, keine Platzhalterseiten, die für den ersten MVP gebaut werden müssen.
