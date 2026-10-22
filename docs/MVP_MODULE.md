# NEON CONTRACT – MVP je Systemmodul

Stand: 20.10.2026 · Alle nachfolgenden Nachweise sind noch offen.

Begriffe und gemeinsame Abnahme: [MVP.md](MVP.md). Fachliche Grenzen: [MODULE.md](MODULE.md). Umsetzungspakete: [ARBEITSPAKETE.md](ARBEITSPAKETE.md).

Jeder Abschnitt nennt das Pflichtminimum für v0.1 beziehungsweise die erste spätere Einführung. „Nicht erforderlich“ gilt jeweils für diese Minimalversion.

## MOD-01 · Content-Verträge und Versionsverwaltung

**MVP-Status:** erforderlich · **Pakete:** AP-02/04.

**Pflichtfunktionen:** Eine handgebaute Mission laden; zwei Waffen- und zwei Gegnerprofile sowie Runner-Presets referenzieren; IDs und Werte zur Laufzeit prüfen. Das akzeptierte Paket erhält eine nachvollziehbare Version und einen reproduzierbaren Hash.

**Mindestdaten:** Kartenmaß/Zellen, Blockaden/Deckung, Spawnplätze, Tür/Terminal/Extraktion, Zieldefinition, Regeln, Presets und Referenzen. Ein kleiner Manifestdatensatz verbindet die verwendeten Dateien.

**Fehler:** fehlende Definition, doppelte ID, ungültiger Zahlenbereich oder unpassende Version verhindert den Missionsstart. Meldung nennt Datei, Objekt und Feld.

**Abnahmenachweis:** dieselbe Karte zweimal laden → gleicher Hash; ein unbekanntes Waffenprofil eintragen → klarer Ladefehler vor Raumstart.

**Nicht erforderlich:** allgemeiner Modeditor, Hot-Reload während einer Mission oder Content-Marktplatz.

## MOD-02 · Simulationszustand und deterministische Ausführung

**MVP-Status:** erforderlich · **Pakete:** AP-02 sowie begleitende Regelaufgaben.

**Pflichtfunktionen:** reiner synchroner Simulationsschritt, deterministischer RNG, stabile Einheitenreihenfolge, validierte Eingaben und verständliche Ergebnisse/Ereignisse. Vorheriger Zustand bleibt unverändert.

**Mindestdaten:** Mission/Version, Runde/Phase, Revision, RNG-Zustand, Einheiten/Ressourcen, Objekt-/Zielzustände und relevante Controller-Zuordnung. Der Eingabestrom enthält auch Phasenschluss und Besitzübergaben.

**Fehler:** ungültige Eingabe liefert eine Ablehnung ohne Ressourcen- oder Zufallsänderung; unbekannte Replay-Version wird ausdrücklich abgelehnt.

**Abnahmenachweis:** aufgezeichneten kompletten Einsatz wiederholt ausführen → nach jedem Schritt identische Hashes und Ereignisse; Originalzustände bleiben unverändert.

**Nicht erforderlich:** Lockstep zwischen Clients, Rückspulen der Live-Mission oder allgemeine ECS-Plattform.

## MOD-03 · Raster, Wege, Sicht und Deckung

**MVP-Status:** erforderlich · **Pakete:** AP-03/05.

**Pflichtfunktionen:** 20 × 20 Raster, vier Bewegungsrichtungen, deterministische Pfade, blockierte Zellen, Reichweiten, Teamsicht, bekannte Geometrie und gerichtete niedrige Deckung.

**Mindestdaten:** begehbare Zellen, undurchsichtige Hindernisse, Deckungskanten, Positionen und Sichtweiten. Aktuell sichtbare Gegner werden getrennt von erkundetem Gelände geführt.

**Fehler:** kein Weg beziehungsweise kein gültiger Schuss wird begründet; eine Vorschau darf keine versteckten Gegnerpositionen offenlegen.

**Abnahmenachweis:** Wand blockiert Bewegung/Sicht; Deckung wirkt aus einer Richtung; Gegner verlässt Sicht und verschwindet aus der aktuellen TeamView; feste Pfadgleichstände bleiben reproduzierbar.

**Nicht erforderlich:** Diagonalbewegung, eine Mission über mehrere Etagen, Rauch, zerstörbare Geometrie, Höhenbonus oder Kletterkosten. Zellen dürfen eine ganzzahlige Höhe tragen; Ghost Floor bleibt auf einer Höhe. Siehe [0007](decisions/0007-babylon-taktikansicht.md).

## MOD-04 · Aktionen und taktische Ressourcen

**MVP-Status:** erforderlich · **Pakete:** AP-03/06/08.

**Pflichtfunktionen:** Bewegung, Zielen, Schießen, Nachladen, Overwatch, Medkit und Handlungsunfähigkeit nach den bestehenden Prototypregeln. Jede Aktion hat serverseitig prüfbare Voraussetzungen und eindeutige Kosten.

**Mindestdaten:** HP/AP, Magazin/Reserve, Medkitverbrauch, Zielbonus, Overwatch-Sektor/Reservierung und Einheitenstatus.

**Fehler:** zu wenig AP, leeres Magazin, ungültiges Ziel und unzulässige Heilung erzeugen keine Teilbuchung. Bewegung kann nach einem tatsächlich ausgeführten Schritt durch Reaktion abbrechen.

**Abnahmenachweis:** Schuss verbraucht genau die festgelegten Ressourcen; Overwatch löst einmal aus; getroffener und ausgeschalteter Läufer führt keine restlichen Schritte aus.

**Nicht erforderlich:** allgemeines Status-/Zaubersystem, Granaten, komplexe Wunden, Cyberware oder freie Waffenmods. Die eine Verletzung folgt in v0.2.

## MOD-05 · Zugablauf und Planauflösung

**MVP-Status:** Teamzug erforderlich; simultane Planung erst v0.2 · **Pakete:** AP-07, später AP-17.

**Pflichtfunktionen:** Crewphase, Bereitmeldungen, konfiguriertes Zeitbudget, Gegnerphase und Rundenende. Der Server ordnet gleichzeitig empfangene Aktionen eindeutig. Bots melden ihre Phase selbstständig fertig.

**Mindestdaten:** Phase/Runde, Bereitschaft pro aktivem Controller und logische Reihenfolge. Die reale Deadline liegt beim Serveradapter und wird als Frist-Eingabe in den Kern übersetzt.

**Fehler:** nach Phasenschluss keine neue Aktion; ein verspäteter Clienttimer verlängert die Phase nicht. Ausgeschaltete/extrahierte Figuren blockieren Bereit nicht.

**Abnahmenachweis:** vier Controller handeln innerhalb derselben Teamphase; alle bereit beendet sie vorzeitig; Fristablauf und Rundenwechsel füllen AP genau einmal.

**Minimum v0.2:** AP-geprüfte Pläne, Bearbeiten/Bereit, deterministischer Umlauf und klarer Planabbruch. Kein Mischbetrieb beider Modi im selben Einsatz.

**Nicht erforderlich:** komplexe physikalische Gleichzeitigkeit oder Initiativezeitachse.

## MOD-06 · Missionsziele und Weltinteraktionen

**MVP-Status:** erforderlich · **Pakete:** AP-09, später AP-19.

**Pflichtfunktionen:** hackbare Abkürzung, zweistufige Datenkopie, Extraktion, 24-Runden-Limit sowie eindeutiger Erfolg/Verlust/Abbruch. Jeder Runner kann die Pflichtinteraktionen ausführen.

**Mindestdaten:** Objekt-IDs/Positionen, Türzustand, Kopierfortschritt, extrahierte/ausgefallene Runner und einmaliges MissionResult.

**Fehler:** Interaktion außerhalb der Reichweite und Extraktion außerhalb der Zone werden abgewiesen. Weitere Ereignisse nach Missionsende verändern das Resultat nicht.

**Abnahmenachweis:** zwei unterschiedliche Runner können dieselbe Datenkopie gemeinsam beenden; Extraktion erfüllt exakt die Erfolgsregel; mehrfacher Abschlussaufruf erzeugt ein Resultat.

**Minimum v0.2:** einmaliger Alarm, sichtbare Löschfrist und gespeicherte Verstärkungswelle mit Behandlung belegter Spawnfelder.

**Nicht erforderlich:** Geiseleskorte, mehrere Missionstypen, verzweigte Dialoge oder frei skriptbare Trigger.

## MOD-07 · Session, Lobby und Runner-Besitz

**MVP-Status:** erforderlich · **Pakete:** AP-11/15; acht Slots/Hotjoin AP-21.

**Pflichtfunktionen:** privaten Raum erstellen/beitreten, vier Slots zuweisen, Bots einsetzen, Presets bestätigen, Bereitschaft verwalten, Mission starten und denselben Runner wieder aufnehmen.

**Mindestdaten:** temporäre Spieler-/Session-ID, Slot/Runner-ID, Koordinator, Konfigurationsrevision, Command-ID, Controller-Epoche und Wiederaufnahmefrist. Keine öffentliche Registrierung nötig.

**Fehler:** voller Raum, ungültige Einladung, fremder Runner, doppelte Nachricht, veraltete Phase, zweiter Controller und abgelaufener Reconnect. Im laufenden v0.1-Einsatz wird ein neuer Beitritt ohne Wiederaufnahmerecht abgewiesen.

**Abnahmenachweis:** vier getrennte Sessions spielen; ein doppelter Schuss wirkt einmal; Reconnect bekommt dieselbe Einheit ohne neue AP; Koordinatorwechsel ändert keine Runnerrechte.

**Minimum v0.2:** 4/6/8 Slots und Übernahme eines nicht reservierten Bot-Runners an der Crewphasengrenze.

**Nicht erforderlich:** Matchmaking, Freunde-/Accountsystem, Servermigration oder neues Verstärkungsmitglied mitten im Einsatz.

## MOD-08 · Sichtprojektion und Client-Synchronisierung

**MVP-Status:** erforderlich · **Paket:** AP-12.

**Pflichtfunktionen:** vollständigen Serverzustand in erlaubte Teamsicht projizieren; Anfangssnapshot, Änderungen, geordnete Ereignisse und Command-Bestätigungen übertragen. Nach einer Lücke einen aktuellen Snapshot anwenden.

**Mindestdaten:** State-Revision, Ereignis-IDs/Zielrevision, sichtbare Einheiten/Objekte, Crewressourcen und erlaubte Ziel-/Phaseninformation.

**Fehler:** keine unbekannten Gegner in Payloads, Animationslogs oder Ablehnungsdetails. Doppelte Events werden nicht erneut animiert oder als Regelwirkung angewandt.

**Abnahmenachweis:** zwei Sessions zeigen denselben erlaubten Zustand; absichtlich ausgelassenes Ereignis wird erkannt; Snapshot korrigiert die Anzeige ohne Verlust von Besitz oder Listenerverdopplung.

**Nicht erforderlich:** Client-Prediction, Rollback oder Übertragung des kompletten geheimen Zustands für lokale Berechnung.

## MOD-09 · Anwendung, Navigation und Einstellungen

**MVP-Status:** erforderlich · **Pakete:** AP-13/15.

**Pflichtfunktionen:** Zugang, Lobby, Mission und Ergebnis als zusammenhängender Ablauf; minimale Settings/Hilfe; klarer Verlassen- und Wiederaufnahmeweg.

**Mindestdaten:** aktuelle Ansicht und lokale UI-Präferenzen; Onlinezustände aus MOD-07/08. Persönliche Einstellungen bleiben nach Neuladen erhalten.

**Fehler:** Server nicht erreichbar, Session abgelaufen und Versionskonflikt haben verständliche Anzeige und Rückweg. Das Öffnen eines Menüs hält den Teamtimer nicht an.

**Abnahmenachweis:** ohne Entwicklereingriff vom Hauptmenü bis Ergebnis und erneut in die Lobby; ein Settingswechsel ändert weder AP noch Zugmodus.

**Nicht erforderlich:** vollständige Kontoverwaltung, mehrere Sprachen, ein UI-Theme-Editor oder leere Kampagnenmenüs.

## MOD-10 · Taktikkarte und Gefechtsoberfläche

**MVP-Status:** erforderlich · **Paket:** AP-14.

**Pflichtfunktionen:** orthografische 3D-Taktikkarte, Auswahl des eigenen Runners, 45-Grad-Kamera mit 90-Grad-Drehung und Zoom, erlaubte Bewegungsvorschau, Ziel-/Trefferinformation, alle vorhandenen Aktionen, Crewstatus, Timer/Ziele und kleine taktische Übersicht.

**Mindestdaten:** ausschließlich TeamView und bestätigte Ereignisse. Die UI unterscheidet wartenden Befehl, Ablehnung, eigene Bereitschaft und Gegnerphase.

**Fehler:** Befehl während gesperrter Phase wird nicht als ausgeführt angezeigt; ausgefallener Runner bleibt beobachtbar, aber nicht steuerbar. Animation kann zum bestätigten Stand aufschließen.

**Abnahmenachweis:** Mensch spielt einen kompletten Einsatz mit Maus/Tastatur; alle Pflichtaktionen sind bei 1366 × 768 erreichbar; versteckte Gegner erscheinen auch in der Übersicht nicht.

**Nicht erforderlich:** aufwendige Animationen, Portraitproduktion, Partikeleffekte oder vollständige Touchbedienung.

## MOD-11 · Bots und Begleitersteuerung

**MVP-Status:** Bots erforderlich; Drohne erst v0.2 · **Pakete:** AP-10/15, später AP-18/22.

**Pflichtfunktionen:** zwei Gegner-Policies, ein missionsorientierter Crewbot und eine defensive Ausfallübernahme. Alle verwenden gültige Spielbefehle und ihre erlaubte Beobachtung.

**Mindestdaten:** Policy-ID/-Version, zulässige Beobachtung, letzter bekannter Kontakt, eigener RNG und begrenztes Entscheidungsbudget.

**Fehler:** kein sinnvoller legaler Zug führt zu Passen; fehlender Kontakt erlaubt keine allwissende Verfolgung. Ein Bot hält die Phase nicht unbegrenzt offen.

**Abnahmenachweis:** Einzelspieler plus drei Bots kann die Mission abschließen; ausgeschiedener Controller wird an der festgelegten Grenze defensiv ersetzt; Seedläufe sind reproduzierbar.

**Minimum v0.2:** Scout-Drohne mit Besitzer-AP und ohne eigenen Vollzug; aggressive/defensive/missionsorientierte Vergleichs-Policies.

**Nicht erforderlich:** Sprachmodelle zur Laufzeit, lernende KI, mehrere Begleiterarten oder automatische Balanceänderungen.

## MOD-12 · Tests, Replays und Auswertung

**MVP-Status:** erforderlich ab erster Regel · **Pakete:** AP-02 bis AP-16 begleitend.

**Pflichtfunktionen:** Regeltests, Invarianten, Replay-Runner, Raumtests, vollständiger Vier-Client-Browserlauf und 100 feste Headless-Seeds. Das Ergebnis erfasst Ausgang, Runden und Ressourcenfehler.

**Mindestdaten:** Build-/Content-/Policy-Version, Seed, geordnete Eingaben, Checkpoints und tatsächliches Testergebnis. Menschlicher Bogen erfasst Dauer, Verständlichkeit und Wartezeit separat.

**Fehler:** fehlerhafte Seeds und erster abweichender Replay-Schritt sind ausgebbar; ein regulärer Missionsverlust zählt nicht als technischer Absturz.

**Abnahmenachweis:** eine absichtlich eingeführte Regelverletzung wird im Test entdeckt; vollständiger Vier-Client-Lauf inklusive Reconnect; mindestens zwei menschliche Viererpartien separat dokumentiert.

**Nicht erforderlich:** grafisches Analyseportal, automatische Balancingoptimierung oder Tausende Browser gleichzeitig.

## MOD-13 · Charaktere, Skills und Ausrüstung

**MVP-Status:** v0.1 nur zwei feste Presets; dauerhaftes System erst M6 · **Pakete:** AP-24/25/26.

**Minimum bei Einführung:** eigenen Runner erstellen/laden/auswählen, Attribute/Inventar ansehen, ein Loadout vorbereiten sowie mindestens einen echten Levelübergang mit spendbarem Punkt abbilden. Die [gestufte Charakterentwicklung](CHARAKTERENTWICKLUNG.md) liefert die Entwurfsrichtung: Physisch, Sozial und Mental sowie zunächst wenige Verbesserungsoptionen. Mindestens ein Attribut- und ein Fertigkeitspfad demonstrieren je eine Spezialisierung ab einer dauerhaften Wertschwelle. Ein kleiner Katalog mit mindestens drei implementierten Verbesserungsoptionen genügt; ein vollständiger Technikbaum ist nicht erforderlich.

**Mindestdaten:** Eigentümer-/Runner-ID, Name/Portraitreferenz, Charakterrevision, XP/Stufe/Punkte, Grundwerte, dauerhaft gekaufte Zuschläge je Zweig, gelernte Technik-IDs und Iteminstanzen. Effektive Pfadwerte werden nachvollziehbar abgeleitet. XP-/Lernschwellen, Kosten und Wirkungen sind explizite versionierte Regeldaten; Werte vor AP-25 festlegen.

**Fehler:** fehlender Besitz, unerfüllte Voraussetzung, zu wenig Punkte, doppelte Kauf-ID oder veraltete Revision. Aktiver Einsatz blockiert Veränderungen an seinem eingefrorenen Loadout.

**Abnahmenachweis:** Mission gibt einmal XP; Levelwechsel gibt die vorgesehenen Punkte; ein Kauf bleibt nach Neuladen erhalten und wirkt im nächsten Einsatz; zweiter Tab kann dieselben Punkte nicht erneut ausgeben. Ein Ausrüstungsbonus erfüllt keine dauerhafte Lernschwelle; eine Technik mit mehreren Lernwegen wird einmal geführt. Eine Grundwertsteigerung wirkt entlang des passenden Pfads, Geschwisterzweige werden nicht addiert.

**Nicht erforderlich:** riesiger Skilltree, sämtliche Spezialisierungen, Respec, prozedurale Affixe oder umfangreiche kosmetische Charaktergestaltung.

## MOD-14 · Kampagne, Persistenz und gemeinsame Ressourcen

**MVP-Status:** keine Kampagnenpersistenz in v0.1 · **Pakete:** AP-23/27, Ausbau AP-28 bis AP-31.

**Minimum bei Einführung:** eine gespeicherte Crew, eigene Runner, kleines gemeinsames Lager, genau-einmalige Ergebnisbuchung und zwei handgebaute Aufträge. Ein schlichter Hub verbindet diese Funktionen.

**Mindestdaten:** Save-Version, Kampagnen-/Besitzrevision, Runnerreferenzen, Inventarbestand, Auftragszustände und bereits verbuchte Resultat-IDs. Eine dauerhafte lokale Profilzuordnung erhält Besitz auch nach Serverneustart; eine flüchtige Session-ID genügt dafür nicht. Speicheradapter erfüllt den Vertrag ohne IO im Regelkern.

**Fehler:** abgebrochene Transaktion und doppeltes Resultat dürfen keinen Teilgewinn hinterlassen; ein fremder Spieler darf keine persönlichen Ressourcen bearbeiten.

**Abnahmenachweis:** Auftrag abschließen, Server neu starten, Kampagne laden und zweiten Auftrag mit denselben Runnern spielen; identisches Resultat erneut einreichen → unveränderter Bestand.

**Nicht erforderlich:** frei begehbares Safehouse, Händlerökonomie, Fraktionssimulation, mehrere Regionen oder die Wiederherstellung einer abgebrochenen Live-Mission.

## MOD-15 · Inhaltserstellung und Generator-Pipeline

**Stand 21.10.2026:** Ein separat beauftragter semantischer Gebäude-Prototyp mit Werkstatt und Export ist vorhanden. Der nachfolgende Vertrag ist damit nicht vollständig erfüllt; reguläres Laden und menschliche Spielabnahme bleiben offen. Siehe [GEBAEUDEGENERATOR.md](GEBAEUDEGENERATOR.md).

**MVP-Status:** v0.1 nur Loader, Vorlageninstanziierung und Validatoren · **Pakete:** AP-04; später AP-32 bis AP-36.

**Minimum bei Einführung des Generators:** aus wenigen Raumvorlagen eine Variante der bekannten Datenraubmission für vier Runner erzeugen; vorhandene Ziele/NPCs/Loadouts einsetzen, prüfen und als unveränderliches Paket laden.

**Mindestdaten:** Root-/Unter-Seeds, Generatorversionen, relevante Contentreferenzen, Versuchsnummer, Paket-Hash und Validierungsbericht. Akzeptierte Ausgabe wird vor Start eingefroren.

**Fehler:** nach begrenzten Versuchen expliziter Fehler oder gekennzeichneter Rückfall; kein halbfertiger Level im Spiel und keine Neuerzeugung beim Reconnect.

**Abnahmenachweis:** 100 feste Seeds, gleiche Inputs mit gleichen Ergebnissen, ausgewiesene Rückfallrate; akzeptierte Varianten bestehen harte Prüfungen und lassen sich im normalen Client spielen.

**Nicht erforderlich:** zufällige Welt, neue Spielregeln, Laufzeit-Bildgenerierung oder prozedurale Kampagnenökonomie. Einzelminimum: [MVP_GENERATOREN.md](MVP_GENERATOREN.md).
