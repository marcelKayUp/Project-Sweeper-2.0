# NEON CONTRACT – Definition des ersten spielbaren Prototyps

Stand: 20.10.2026 · Status: Scope-Vorschlag zur Prüfung.

Grundlage: [Originalkonzept](../NEON_CONTRACT_Konzept.md). Alle hier ergänzten Zahlen und Detailregeln sind Testannahmen, keine bereits beschlossenen oder ausbalancierten Werte.

Der erste Stand v0.1 wird in [MVP.md](MVP.md) als interner Taktik-MVP eingegrenzt. Die dort verlinkten Verträge beschreiben das konkrete Minimum je Modul, Screen und Generator. Zahlenwerte und Sieg-/Verlustregeln dieses Dokuments bleiben die Referenz.

## 1. Die erste zu beantwortende Frage

Können vier Menschen mit je einem Runner gemeinsam eine kleine Datenraubmission spielen, dabei sinnvolle taktische Entscheidungen treffen und ohne lange Einzelzüge bis zur Extraktion kommen?

Der erste spielbare Stand **v0.1 „Ghost Floor – Kernmission“** beantwortet diese Frage. Der vollständige Konzept-Slice **v0.2 „Ghost Floor – Vergleichstest“** ergänzt Drohne, dritten Gegnertyp, simultane Planung, acht Spieler und eingeschränkten Hotjoin. Erst v0.2 prüft die zentrale Produktannahme für 4–8 Spieler.

Diese Aufteilung verkleinert den ersten Lieferumfang ausdrücklich. Der ursprüngliche Slice wird durch v0.1 allein noch nicht erfüllt.

## 2. v0.1: Eine Mission von Anfang bis Ende

**Start:** Ein Spieler öffnet einen privaten Raum. Vier Slots werden mit Menschen oder Testbots belegt. Jeder Mensch kontrolliert genau einen Runner. Ein Entwickler kann allein mit drei Bots testen; die eigentliche Mehrspielerabnahme erfolgt mit vier menschlichen Spielern.

**Mission:** Eine Konzernetage mit 20 × 20 Feldern und vier orthogonalen Bewegungsrichtungen. Jede Zelle darf eine ganzzahlige Höhe tragen; diese Mission bleibt auf einer Höhe. Einstieg und Extraktion liegen auf derselben Kartenseite. Ein breiter Hauptweg und ein schmalerer Wartungsweg führen zum Datenraum. Es gibt Wände, niedrige gerichtete Deckung, eine hackbare Abkürzungstür und ein Datenterminal.

**Auftrag:** Datenterminal erreichen, zwei Interaktionen zum Kopieren abschließen und zurück zur Extraktionszone gelangen. Jeder Runner kann hacken. Fortschritt am Terminal ist gemeinsam und bleibt zwischen Runden erhalten.

**Erfolg:** Daten kopiert, mindestens ein Runner extrahiert und kein handlungsfähiger Runner mehr auf der Karte. Handlungsunfähige zurückgelassene Runner werden im Ergebnis als Verluste gezählt; sie blockieren den Abschluss nicht. Die Daten gelten zunächst als Crewziel, nicht als physischer Gegenstand bei einem bestimmten Träger.

**Niederlage:** Kein handlungsfähiger, noch eingesetzter Runner mehr und die Erfolgsbedingung ist nicht erfüllt; oder das Rundenlimit von 24 vollständig beendeten Runden ist erreicht. Ein Team kann außerdem gemeinsam abbrechen. Wer vor dem Datenkopieren extrahiert, kehrt nicht zurück. Sieg wird nach jeder relevanten Aktion geprüft, vor einer anschließenden Niederlagenprüfung.

**Abschluss:** Ergebnisansicht mit Erfolg/Misserfolg, extrahierten Runnern, Verlusten, Runden und tatsächlicher Dauer; erneuter Versuch mit demselben oder einem neuen Seed. Noch keine XP, Beuteverteilung oder dauerhafte Verletzungen.

**Dauer:** v0.1 zielt vorläufig auf 15–30 Minuten pro Kernmission. Das Produktziel bleibt 30–60 Minuten einschließlich Briefing und Abschluss; dieses wird in v0.2 mit Menschen geprüft. Keine künstliche Verlängerung einer bereits spaßigen kürzeren Mission.

## 3. Enthaltene Spielregeln

### Runner, AP und Waffen

- Vier gleichwertige Runner, jeweils 6 HP und 8 AP pro Crewphase. Auswahl zwischen zwei Ausrüstungs-Presets; Duplikate erlaubt. Noch kein Skilltree und keine verpflichtenden Rollen.
- Preset „Rifle“: Sturmgewehr, Reichweite 10 Rasterfelder, 6 Schuss im Magazin, 2 Reservemagazine.
- Preset „Sidearm“: Pistole, Reichweite 6, 8 Schuss im Magazin, 2 Reservemagazine. Für die Erstprüfung bewusster kleiner Waffenvergleich, noch keine zugesicherte Gleichwertigkeit.
- Beide Waffen: Schuss 3 AP, Schaden bei Treffer 2 HP. Nachladen 2 AP; angebrochenes Magazin wird durch ein volles ersetzt, verbliebene Patronen werden verworfen. Kein Inventar-Tetris.
- Bewegung 1 AP je freiem orthogonalen Feld; Figuren blockieren das Betreten, kein Durchlaufen oder Zelltausch.
- Zielen 1 AP, gibt dem nächsten Schuss desselben Runners in dieser Phase +15 Prozentpunkte. Nicht stapelbar; Bewegung oder andere Aktion außer Schießen hebt den Bonus auf.
- Jeder Runner trägt ein Medkit: 3 AP, einmalig +2 HP bis zum Maximum bei sich selbst oder einem orthogonal angrenzenden, handlungsfähigen Runner.
- Bei 0 HP ist ein Runner handlungsunfähig: keine Aktionen oder Sichtaufklärung, abgebrochener Restpfad. In v0.1 kein Wiederbeleben, Tragen oder Blutungssystem.

### Sicht, Deckung und Schüsse

- Gemeinsame Teamsicht: Vereinigung der Sicht aller handlungsfähigen Crewmitglieder. Sichtweite zunächst 10 Felder; geschlossene Türen und Wände blockieren.
- Distanz wird für Reichweite und Abzüge als Manhattan-Distanz gemessen. Der tatsächliche Sichtstrahl ist geometrisch, kein Bewegungspfad.
- Ein Schuss braucht sowohl Teamsicht auf das Ziel als auch freie Schusslinie und Reichweite des Schützen.
- Startformel: `70 + Zielbonus − 5 × max(0, Distanz − 3) − Deckungsabzug`; das Ergebnis wird auf 10–95 Prozent begrenzt und intern ganzzahlig gerechnet.
- Niedrige Deckung gibt 25 Prozentpunkte Abzug, wenn der Schuss die geschützte Zielkante passiert. Hohe undurchsichtige Hindernisse blockieren den Schuss. Kein Stapeln mehrerer niedriger Deckungsabzüge.
- Ein gültiger Schuss verbraucht AP und eine Patrone, auch wenn er verfehlt. Ungültige Aktionen verbrauchen weder AP noch Zufall.
- Kein Friendly Fire, Flächenschaden, Rauch, Höhenbonus oder Zerstören von Deckung in v0.1.

### Overwatch

Overwatch kostet sofort 3 AP und reserviert eine Patrone im Magazin. Ein Runner wählt einen 90-Grad-Sektor in einer der vier Hauptrichtungen. Nach dem Bewegungsschritt eines Gegners in diesem Sektor wird bei freier Schusslinie und Waffenreichweite genau ein Schuss ausgelöst; ein bereits im Sektor stehender Gegner löst erst bei einer weiteren Bewegung aus.

Der Schuss kostet keine weiteren AP, verbraucht die reservierte Patrone und erhält keinen Zielbonus. Andere Aktionen des Beobachters beenden seine Haltung ohne AP-Erstattung; die unverschossene Patrone wird wieder freigegeben. Die Haltung verfällt zu Beginn der nächsten eigenen Teamphase. Handlungsunfähigkeit beendet sie sofort.

Mehrere Beobachter reagieren in stabiler Einheiten-ID-Reihenfolge; ist das Ziel bereits ausgeschaltet, reagieren die übrigen nicht. Reaktionsfeuer löst kein weiteres Reaktionsfeuer aus. Jeder Bewegungsschritt wird nach der Reaktionskette auf Abbruch geprüft.

### Hacken, Türen und Extraktion

- Interaktion nur vom orthogonal angrenzenden Feld, am Terminal oder an der Tür: jeweils 4 AP.
- Türhacken öffnet dauerhaft die Abkürzung. Der alternative Hauptweg ist ohne Spezialausrüstung nutzbar.
- Das Datenterminal benötigt zwei erfolgreiche Interaktionen, auch von verschiedenen Runnern oder in derselben Runde. Keine Zufallsprobe, kein Hacking-Minispiel.
- Extraktion ist eine Aktion für 1 AP innerhalb der markierten Zone und entfernt den Runner aus dem Einsatz. Handlungsunfähige Figuren können sie nicht verwenden.

### Gegner und einfacher Kontakt

Sechs Gegner: vier Wachen und zwei Flanker. Beide verwenden dieselben AP-, Sicht-, Schuss- und Reaktionsregeln wie Runner, haben vorläufig 4 HP, 8 AP und ein Sturmgewehr.

Wachen patrouillieren auf festen Wegen und bevorzugen nach Kontakt Deckung und Overwatch. Flanker suchen nach einem günstigeren Schusswinkel. Alle Wege und Gleichstände sind deterministisch. Ein Gegnerteam teilt seine Sicht und zuletzt beobachtete Positionen, nicht die geheimen aktuellen Crewpositionen.

Vor Kontakt folgt es der Patrouille; nach Sichtkontakt verfolgt es zuletzt bekannte Positionen. Dies ist grundlegende Entdeckung, noch kein vollständiges Schleichen mit Geräuschen, Licht, Haltung und Verdachtsstufen. Ein begrenzter Suchlauf fällt auf Patrouille zurück, wenn keine neuen Kontakte entstehen.

### Gemeinsamer Teamzug

90 Sekunden Crewphase, alle Runner frei aktiv, frühes Ende über „Bereit“. Kein eigener Zug je Person. Danach führt die Gegner-KI ihre Phase aus; die nächste Crewphase füllt die AP auf.

Aktionsannahme und Konfliktauflösung folgen [ARCHITEKTUR.md](ARCHITEKTUR.md), Abschnitt 6. Der Timer kann vor Missionsstart auf 60 oder 120 Sekunden gesetzt werden. Für Entwickler gibt es einen gesonderten Testmodus ohne Frist; dessen Ergebnisse fließen nicht in die Zeitmessung des Spieltests ein.

## 4. Bedienung und technische Mindestfunktionen

- Desktop-Browser, Maus und Tastatur. Orthografische 3D-Taktikansicht, Kamera um 45 Grad geneigt, Drehung in 90-Grad-Schritten, Zoom eingeschaltet. Siehe [0007](decisions/0007-babylon-taktikansicht.md).
- Eigenen Runner auswählen, erreichbare Felder und AP-Vorschau sehen, gültiges Ziel anklicken, Schusswahrscheinlichkeit und Deckungsgrund sehen.
- Aktionsleiste für Bewegen, Zielen, Schießen, Nachladen, Overwatch, Medkit, Interagieren, Extraktion und Bereit.
- Sichtbare Phase, Timer, HP/AP/Munition, Missionsfortschritt, Verbindungsstatus und Aktionsprotokoll.
- Teammitglieder und Gegner anhand von Form/Markierung unterscheidbar; entscheidende Information nicht nur über Farbe.
- Private Lobby, vier Slots, Ausrüstungswahl, Start, Ergebnis, Neustart. Kein integrierter Sprachchat.
- Reconnect zum selben Runner ohne Ressourcen-Reset; defensiver Bot an der nächsten Crewphasengrenze bei weiterem Ausfall.
- Wiederkehrende Spieler sehen den aktuellen Snapshot. Abgeschlossene Animationen werden nicht nachgespielt.
- GLB-Platzhalter im Maßstab 1,0 genügen; Sounds und Portraits sind kein Abnahmekriterium. Figuren sind geriggt, Umgebungsmodule sind Boden, Wand, Tür, Deckung und Treppe.

Die zugehörigen Ansichten sind im [Screenplan](SCREENS.md) beschrieben: Hauptmenü, Raumzugang, Lobby mit Charakter-/Ausrüstungswahl und Briefing, Spielansicht, taktische Übersichtskarte, Reconnect, Ergebnis sowie minimale Settings/Hilfe. Charakterauswahl bedeutet in v0.1 feste Presets; Levelaufstieg, freie Skillliste und strategische Stadtkarte gehören zum späteren Kampagnenumfang.

Die Karte und NPC-Profile werden zuerst handgebaut und über gemeinsame Datenverträge geladen. Die [Generatorplanung](GENERATOREN.md) erweitert den späteren Entwicklungsweg, nicht die v0.1-Abnahme um eine prozedurale Welt.

## 5. v0.1 ist spielbar, wenn …

1. Vier Menschen aus vier Browser-Sessions können die Lobby öffnen, ihre Runner übernehmen, die Mission spielen und einen eindeutigen Abschluss erreichen.
2. Sieg und Niederlage sind sowohl im Browser als auch headless erreichbar; kein Ziel braucht eine bestimmte Klasse.
3. Bewegung, Richtung der Deckung, Munition, Overwatch und Hacken beeinflussen eine tatsächlich gespielte Mission; reine UI-Demos genügen nicht.
4. Ein getrennter und wiederverbundener Client erhält denselben Runner und den aktuellen Zustand. Kein Doppelzug, keine neue Munition, keine zusätzlichen AP.
5. Mindestens ein missionsorientierter Crewbot und die beiden Gegner-Policies können vollständige Läufe ausführen. Verbleibende Bot-Schwächen sind dokumentiert.
6. Derselbe Replay-Eingabestrom erzeugt dieselben Prüfsummen; AP-Unterlauf und doppelte Feldbelegung scheitern an Tests.
7. Der gesamte Missionsablauf ist mit einfachem Build-/Startweg reproduzierbar. Kein manueller Datenbankeingriff oder Editieren des Saves nötig.

Ein technischer Durchlauf mit vier automatisierten Browsern ersetzt Punkt 1 nicht. Bis zum menschlichen Test lautet der Status „technisch spielbar, menschliche Abnahme offen“.

## 6. v0.2: Den ursprünglichen Slice vervollständigen

Diese Ergänzungen sind Teil des anschließenden Validierungsumfangs, keine Zusage für v0.1:

- **Simultane Planung:** identische Mission und Grundregeln, andere Befehlsauflösung gemäß Architektur. Umschalten nur vor Missionsbeginn.
- **4, 6 und 8 Runner:** acht tatsächlich nutzbare Browser-Slots, keine reine Kapazitätskonstante. Konfiguration für vier bleibt erhalten.
- **Dritter Gegnertyp:** ein Sicherheits-Suppressor als Teil des Alarmteams, der eine Route mit Overwatch sperrt. Keine aufgeblähten HP als alleinige Schwierigkeit.
- **Dritte Waffe:** Präzisionsgewehr mit anderem AP-/Reichweitenprofil; Werte vor Implementierung als kleine Content-Entscheidung festhalten.
- **Eine Scout-Drohne für die Crew:** ein Besitzer, 2 HP, keine Waffe, kein eigenes AP-Budget. Ein Befehl kostet dem Besitzer 2 AP und bewegt sie höchstens drei orthogonale Felder. Gleiche Sichtregeln, keine Zielinteraktion; ohne Befehl hält sie Position. Sie belegt eine Zelle, löst gegnerische Overwatch aus und wird bei Ausfall des Besitzers inaktiv. Kein zusätzlicher Bereit-Slot.
- **Eine einfache Verletzung:** unter halben maximalen HP kostet jeder Bewegungsschritt 2 statt 1 AP; Heilung über die Schwelle beseitigt dies. Noch keine langfristige Wundverwaltung.
- **Alarm-Komplikation:** erster gegnerischer Sichtkontakt, erster Schuss oder Beginn des Datenkopierens löst einmalig Alarm aus. Danach beginnt die Löschung und ein fest konfiguriertes Einsatzteam erscheint.
- **Löschung:** nach sechs vollständigen, auf den Alarm folgenden Gegnerphasen scheitert die Mission, falls die Kopie noch nicht fertig ist. Fertige Daten werden nicht nachträglich gelöscht. Der Countdown ist sichtbar.
- **Verstärkung:** einmalig zu Beginn der nächsten Gegnerphase an markierten, freien Spawnfeldern; belegte Felder verzögern ihren jeweiligen Spawn, kein Stapeln oder Verdrängen.
- **Hotjoin:** neuer Mensch übernimmt einen verfügbaren, nicht für Reconnect reservierten Bot-Runner an der nächsten Crewphasengrenze; volle Session-Synchronisierung und eindeutiger Besitz.
- **Bot-Vergleich:** aggressive, defensive und missionsorientierte Crew-Policies, wiederholbare Seed-Suites und Auswertung.

Für 7–8 Runner erhält dieselbe 20 × 20 Grundkarte eine breitere zweite Zugangsschleuse und zwei räumlich getrennte optionale Beweisterminals. Sie ermöglichen Aufteilung und beeinflussen die Ergebniswertung, sperren aber das Hauptziel nicht. Gegner werden über zusätzliche Positionen und die Alarmwelle variiert, mit unveränderten HP pro Typ.

Startkonfigurationen zur Prüfung: bei 4 Runnern 6 Anfangsgegner plus 2 Verstärkungen; bei 6 Runnern 8 plus 3; bei 8 Runnern 10 plus 4. Die Raumkonfiguration wird vor dem Start fixiert; Botübernahme verändert sie nicht. Ob 20 × 20 für acht Menschen genug Platz bietet, ist ein ausdrückliches Testkriterium.

Die gefangene Analystin, freies Einsetzen eines zusätzlichen Runners am sicheren Einstiegspunkt und andere Missionsarten kommen nach v0.2. Das sind weiter bestehende Produktideen.

## 7. Was nach v0.2 entschieden werden muss

- Trägt ein Modus die gemeinsame Planung mit acht Personen, ohne Frust durch Wartezeit oder Konflikte?
- Liegt eine vollständige Mission mit kurzem Briefing und Ergebnis in 30–60 Minuten?
- Erzeugen zwei Zugänge, Deckung und Nebenziele mehrere brauchbare Vorgehensweisen?
- Verdrängen Drohne oder bestimmte Waffen den taktischen Nutzen anderer Ausrüstung?
- Braucht die Karte mehr Platz, statt lediglich mehr Gegner?

Das Ergebnis kann auch ein kleinerer Kern sein: etwa vier bis sechs Spieler als erste veröffentlichte Zielgruppe. Eine solche Änderung am Produktziel erfolgt ausdrücklich nach der Auswertung und wird nicht stillschweigend durch technische Grenzen festgelegt.

## 8. Bewusst später

Persistente Charaktere, Skilltree, Cyberware-Builds, Safehouse, Fraktionsruf, Handel, umfangreiche Ausrüstung, Cybertiere/Henchmen, Geiseleskorte, komplexe Wunden, Panik, Rauch, Höhenbonus, Kletterkosten, Zerstörung, prozedurale Karten, Open World, integrierter Chat, öffentliche Accounts, Matchmaking, mobile Bedienung und produktionsreife Art. Ganzzahlige Zellhöhen sind bereits Kartendaten; Ghost Floor verlangt keinen Höhenwechsel.

Die Architektur lässt geeignete Erweiterungspunkte zu. Für diese Funktionen werden im ersten Prototyp jedoch keine leeren Systeme, Datenbanktabellen oder allgemeinen Frameworks vorgebaut.
