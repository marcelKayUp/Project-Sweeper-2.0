# NEON CONTRACT – Priorisierter Entwicklungsplan

Stand: 20.10.2026 · Status: Vorschlag; aktuell ausschließlich Planung.

Maßgeblich für den Umfang sind [PROTOTYP.md](PROTOTYP.md) und das [Originalkonzept](../NEON_CONTRACT_Konzept.md). Technische Grenzen stehen in [ARCHITEKTUR.md](ARCHITEKTUR.md).

Die konkrete Zerlegung umfasst [15 Systemmodule](MODULE.md), [23 Screens/Ansichten](SCREENS.md), [13 Generator-/Werkzeugmodule](GENERATOREN.md) und [36 Arbeitspakete](ARBEITSPAKETE.md). Die IDs verbinden diese Sichten; es entstehen keine 15 separaten Dienste.

[MVP.md](MVP.md) definiert den ersten spielbaren Umfang. Die Einzelverträge [für Module](MVP_MODULE.md), [für Screens](MVP_SCREENS.md) und [für Generatoren](MVP_GENERATOREN.md) ergänzen die Abnahmekriterien der jeweils zugeordneten Pakete.

## 1. Priorität und Abhängigkeiten

**P0:** Einen taktisch aussagekräftigen, deterministischen Vier-Spieler-Einsatz spielbar machen.

**P1:** Den Konzept-Slice vervollständigen und die Risiken „acht Menschen“, „zwei Zugmodelle“, „Begleiter“ und „Hotjoin“ prüfen.

**P2:** Erst nach erfolgreichem Taktiktest Charakterpersistenz und eine zweite Mission.

**Optionaler Ausbau:** prozedurale Inhaltsvarianten und spätere Kampagnensysteme nach konkretem Bedarf; sie sind keine Voraussetzung für v0.1/v0.2.

Hauptabhängigkeit: `M0 → M1 → M2 → M3 (v0.1) → M4 → M5 (v0.2) → M6`. Zusätzlich kann nach M5 der optionale Generatorstrang M7 beginnen. Dessen Stadt-/Belohnungserweiterungen benötigen passende M6-Kampagnensysteme.

Jeder Meilenstein hat ein sichtbares Ergebnis und eine überprüfbare Abnahme. Es gibt bewusst noch keine Terminzusage: Agentenzahl ist kein verlässlicher Geschwindigkeitsfaktor. Nach M1 anhand tatsächlicher Integrations- und Testarbeit neu schätzen.

## 2. M0 · Planung gemeinsam prüfen — P0

**Ergebnis:** Architektur, Umfang und erste Entscheidungsnotiz sind konsistent.

Zu prüfen sind:

1. Stack und strikt unabhängiger Regelkern.
2. Vier-Spieler-Kernmission vor dem vollständigen 4–8-Spieler-Slice.
3. Gemeinsamer Teamzug zuerst; simultane Planung verpflichtend vor der endgültigen Moduswahl.
4. Gemeinsame Teamsicht, einfache Rastergeometrie und kleine Startregelmenge.
5. Kampagnenpersistenz nach dem ersten Taktiknachweis.
6. Botübernahme als erster Hotjoin; echter Verstärkungseintritt später.

**Abnahme:** Der Nutzer hat die Planung geprüft und die nächste Implementierungsaufgabe beauftragt. Dokumente allein gelten nicht als Freigabe. Dies folgt aus dem ausdrücklichen Wunsch, zuerst Architektur und Scope gemeinsam zu prüfen.

## 3. M1 · Technisches Fundament und kleinster Regeldurchstich — P0

**Abhängigkeit:** M0.

Arbeit:

- Eigenständiges Projekt im Verzeichnis `Cyberpunk Game` einrichten; keine Abhängigkeiten oder Skripte aus dem benachbarten Projekt übernehmen.
- Toolchain und konkrete kompatible Versionen fixieren, Workspaces und Importgrenzen einrichten.
- Sehr kleiner Integrationstest: React mountet/entfernt die Zielansicht; zwei Clients verbinden sich mit einem Colyseus-Raum und erhalten eine autoritative Zustandsänderung. Die Zielansicht ist seit [0007](decisions/0007-babylon-taktikansicht.md) eine Babylon.js-Szene. Die Fortsetzung ist die spielbare Fassung aus [0013](decisions/0013-isometrische-fortsetzung.md). Der ältere Phaser-Durchstich bleibt ein früher Nachweis der Trennung.
- Domain-Zustand, validierte Befehle, Integer-RNG, logische Phasen und eine kleine Testkarte.
- Bewegen, AP-Verbrauch, Hindernisse, eindeutige IDs, Fehlerresultate und Replay-Hash.

**Abnahme:** Derselbe Eingabestrom hat in wiederholten Headless-Läufen identische Hashes. Zwei konkurrierende Bewegungen können kein Feld doppelt belegen. Der Lebenszyklus der Zielansicht erzeugt weder doppelte Instanzen noch Listener. Kein Frameworkimport in `sim`.

**Nicht enthalten:** vollständige Karte, umfangreiches UI, Kampagnendatenbank.

## 4. M2 · Vollständige Mission ohne Grafik — P0

**Abhängigkeit:** M1.

Arbeit:

- 20 × 20 Karteninhalt, gerichtete Deckung, Sicht und Schusslinien.
- Zwei Waffen, AP, Zielen, Munition, Nachladen, Medkit und Handlungsunfähigkeit.
- Overwatch einschließlich Unterbrechung eines Pfads und begrenzter Reaktionskette.
- Tür, Terminalfortschritt, Extraktion, Runde 24 und eindeutiger Missionsabschluss.
- Teamzug, Gegnerphase, einfache Gegner-Policies und ein missionsorientierter Crewbot.
- Replay-Export und minimale Metriken.

**Abnahme:** Headless-Szenarien erreichen nachvollziehbar Sieg und Niederlage. Feste Tests decken Schüsse um Ecken, Deckung aus beiden Richtungen, leere Magazine, ausgeschaltete Figuren während Bewegung und gleichzeitige Zieleingaben ab. Bots führen mindestens 100 vorgegebene Seeds ohne Ausnahme oder ungültigen Zustand bis zum regulären Ende/Rundenlimit aus.

**Stand 22.10.2026:** Der Headless-Teil ist umgesetzt. Die Referenzkarte hat vier Wachen und zwei Flanker. Die Gegnerphase merkt sich gemeinsame letzte Sichtungen. `@neon/bots` spielt mit der Policy `mission-v1` nur auf der Teamsicht und schreibt ein versioniertes Replay. 100 Seeds der Referenzmission enden regulär. Lobby, Reconnect, Playwright und die menschliche Abnahme gehören zu M3 und bleiben offen. Regelversion 2 und die Grenzen der Policy: [0030](decisions/0030-gegnerpolicies-und-missionsbot.md).

**Warum vor Grafik:** Die teuren taktischen Fehler sind zu diesem Zeitpunkt klein und reproduzierbar. UI-Fehler können später von Regelfehlern getrennt werden.

## 5. M3 · Vier Menschen können „Ghost Floor“ spielen — P0 / v0.1

**Abhängigkeit:** M2 und erfolgreicher Integrationstest aus M1.

Arbeit:

- Private Lobby, vier Runner-Slots und Ausrüstungsauswahl.
- Client-Adapter, gefilterte Teamsicht, sequenzierte Ereignisse, AP-/Treffervorschau und lesbare Karte.
- Gemeinsamer Timer, Bereitstatus, Aktionsfeedback, Missionsanzeige und Ergebnis.
- Besitzprüfung, Command-Deduplizierung, Phasenbarrieren und Ablehnungen.
- Reconnect, Übergabe an defensiven Bot, Rückgabe an Phasengrenze.
- Lokaler Startweg und testbarer Browser-Build; Hosting erst als eigene Aufgabe, wenn benötigt.

**Abnahme:** Alle sieben v0.1-Kriterien aus PROTOTYP.md erfüllt. Ein Playwright-Szenario spielt die komplette Mission mit vier getrennten Browser-Kontexten; zusätzliche Szenarien prüfen Verbindungsabbruch, doppelte Befehle und Informationsfilter.

**Menschlicher Test:** Mindestens zwei Viererpartien, dabei Verständlichkeit und Wartezeit aufzeichnen. Wenn derzeit keine Gruppe verfügbar ist, technische Abnahme abschließen und die menschliche Prüfung ausdrücklich offenlassen. Kein Agent darf Spaß oder reale Spielzeit aus Botläufen als bestätigt ausgeben.

**Stand 23.10.2026:** AP-11 bis AP-14 sind umgesetzt. Die Einsatzansicht zeichnet die bestätigte Teamsicht orthografisch und sendet die vorhandenen Aktionen. Vorbereitung, Frist und lokale Einstellungen bleiben wie in AP-13. Bot-Slots, Reconnect, die Vier-Browser-Prüfung mit Ausfall und die menschliche Abnahme bleiben offen.

**Entscheidung danach:** Ist die Kernmission verständlich und erzeugen Deckung, AP und Extraktion Entscheidungen? Falls nein, diese Regeln überarbeiten, bevor weiterer Inhalt hinzukommt.

## 6. M4 · Vergleichbarer Modus A und Konzeptmechaniken — P1

**Abhängigkeit:** technisch stabiles M3, Rückmeldungen aus dem ersten menschlichen Test soweit verfügbar.

Arbeit:

- Simultane Planung mit AP-Budget, Bereit/Frist, Umlaufauflösung und sichtbaren Konfliktabbrüchen.
- Identische Regeln und Inhalte in beiden Modi; keine duplizierte Kampflogik.
- Scout-Drohne mit AP-Kosten beim Besitzer, dritter Gegnertyp, Präzisionswaffe und eine einfache Verletzung.
- Alarm, sechsphasiger Lösch-Countdown, einmalige Verstärkungswelle.
- Aggressive und defensive Crewbot-Policy neben der missionsorientierten.

**Abnahme:** Regeltests für Plankollision, erschossenes Planziel, Ausfall des Drohnenbesitzers, Timeout, Alarm nur einmal, blockierte Verstärkungsfelder und Datenkopie unmittelbar vor Fristende. Beide Modi spielen dieselbe Mission bis zum Ende.

**Entscheidung danach:** Es existieren zwei erprobbare Varianten. Noch keine endgültige Auswahl allein aufgrund besserer Bot-Erfolgsquoten.

## 7. M5 · Acht-Spieler- und Hotjoin-Validierung — P1 / v0.2

**Abhängigkeit:** M4.

Arbeit:

- Sechs und acht Slots, größere Zugangsschleuse, optionale verteilte Ziele und konfigurierte Gegner-/Alarmgruppen.
- Hotjoin durch Übernahme eines freien Bot-Slots an der Crewphasengrenze.
- Browser- und Headless-Tests für 4/6/8 Runner in beiden Modi.
- Schwächere Verbindung simulieren; Doppel-Tab, Phasenwechsel beim Wiederverbinden und Event-Lücken prüfen.
- Vergleichstest mit Menschen, gleiche Mission und wechselnde Reihenfolge A/B.

**Technische Abnahme:**

- Je Kombination aus zwei Modi und drei Crewgrößen 100 feste Seeds mit einer reproduzierbaren gemischten Crew-Policy: 600 Baseline-Läufe.
- Ergänzend je Modus und Crewgröße 20 Seeds pro einheitlicher Crew-Policy (aggressiv/defensiv/missionsorientiert): 360 Vergleichsläufe.
- Null nicht abgefangene Fehler, AP-Unterläufe, doppelte Zellen oder abweichende Replay-Hashes. Reguläre Missionsniederlagen sind erlaubt.
- Acht unabhängige Browser-Sessions bleiben bis zum Abschluss konsistent. Vergleich bezieht sich auf deren erlaubte Sichtprojektion, nicht auf geheime Serverdaten.
- Beitritt während Auflösung führt erst an der nächsten Crewphasengrenze zu Kontrolle. Kein Ressourcen-Reset und keine zweite Steuerinstanz.
- Nach wiederhergestellter Verbindung soll der aktuelle Zustand im lokalen Test innerhalb von zwei Sekunden angezeigt werden; ein weiterführender WAN-Test bleibt separat.

**Menschliche Abnahme und vorläufige Zielwerte:**

- Mindestens je zwei Partien pro Modus mit vier und acht Menschen; gleiche Gruppe wechselt die Reihenfolge zwischen A→B und B→A. Sechs Menschen zusätzlich, sobald verfügbar.
- Mindestens 75 % dieser vollständigen Partien liegen einschließlich kurzem Briefing/Ergebnis zwischen 30 und 60 Minuten. Kleine Stichprobe ausdrücklich ausweisen.
- Median des individuellen Wartens nach eigener Bereitmeldung bis zur nächsten eigenen Planungs-/Aktionsphase höchstens 30 Sekunden; 90. Perzentil höchstens 60 Sekunden.
- Mindestens 75 % der Teilnehmenden bewerten Aktionsfolgen mit 4/5 oder besser als verständlich und möchten eine weitere Mission spielen. Antworten getrennt von Botmetriken auswerten.
- Acht-Personen-Partien dürfen die mediane Rundenzeit gegenüber Vier-Personen-Partien nicht um mehr als 50 % erhöhen; Messung nur bei gleicher Timerkonfiguration.

Diese Schwellen sind Arbeitsannahmen für die gemeinsame Prüfung. Bei wenigen Tests ist eine Zahl ein Hinweis, kein statistischer Beweis.

**Modusentscheidung:** Wartezeit, Lesbarkeit, Planabbrüche und Gruppenpräferenz gemeinsam betrachten. Scheitern beide Modi, Timer, Aktionsumfang und Kartendichte ändern, dann erneut testen. Vor einer Kampagne muss das Hauptproblem „acht Personen kooperieren flüssig“ gelöst oder das Spielerzahlziel bewusst geändert werden.

## 8. M6 · Fortschritt außerhalb einer Mission — P2

**Abhängigkeit:** positiver Taktiktest und explizite Scope-Entscheidung nach M5.

Erster Ausbau: gespeicherte Runner, kleine Auswahl taktischer Verbesserungen, persistentes Inventar, eine zweite handgebaute Mission und einfacher Nachbereitungsbildschirm.

Abnahme: Missionsergebnis wird genau einmal verbucht; Laden/Speichern und eine Save-Migration sind getestet; Neueinsteiger können einen Auftrag sinnvoll mitspielen. Danach erst Fraktionen, Safehouse, weitere Begleiter und größere Contentproduktion priorisieren.

Echter Verstärkungs-Hotjoin mit zusätzlichem Runner erhält eine eigene Aufgabe: sicherer Einstieg, Skalierung kommender Wellen, Ressourcenregeln und Kampagnenbesitz gemeinsam definieren.

Die ersten Kampagnenansichten sind Charaktererstellung/-bogen, Skillliste, Levelaufstieg, gespeichertes Loadout, einfacher Safehouse-Hub und Auftragswahl. Strategische Stadtkarte, Händler, Klinik und Fraktionen bleiben einzeln wählbare Ausbaupakete AP-28 bis AP-31. Sie sind nicht alle für den Abschluss von M6 nötig.

Für AP-24/AP-25 dient die [gestufte Charakterentwicklung](CHARAKTERENTWICKLUNG.md) als Entwurfsgrundlage: drei Ausgangsattribute, günstigere Spezialisierungen an Wertschwellen und Vorschläge zu XP/Stufen sowie Aktionsquellen aus Training und Ausrüstung. Kosten, Schwellen und konkrete Inhalte sind noch zu prüfen. M6 beginnt mit wenigen exemplarischen Zweigen und vorhandenen Effekten; ein vollständiger Attribut-/Technikbaum ist kein zusätzliches Abschlusskriterium.

## 9. M7 · Begrenzte prozedurale Inhaltsvarianten — optionaler Ausbau

**Asset-Formalisierung vom 22.10.2026:** Ein gemeinsamer [Skill](../.agents/skills/asset-families/SKILL.md) und [Familienvertrag](ASSET_FAMILIES.md) beschreiben Geometriewiederverwendung für verschiedene lokale Agenten. Die Laufzeitumstellung des Terminalpiloten und ihre Abnahme bleiben offen; siehe [0023](decisions/0023-wiederverwendbare-assetfamilien.md).

**Separater Terminal-Produktionspilot vom 22.10.2026:** Drei Bauformen, zwei Größen und drei kosmetische Organisationspaletten entstehen aus einem lokalen Blender-/NumPy-Rezept. [TERMINAL_PILOT.md](TERMINAL_PILOT.md) beschreibt 18 GLB-/Blend-Lieferungen, Vorschau und Prüfungen. Keine Missionsintegration, Regelerweiterung oder pauschale M7-Abnahme; siehe [0022](decisions/0022-parametrische-terminal-familie.md).

**Separater GEN-10-Auftrag vom 21.10.2026:** Ein [Character-Creator-Pilot](CHARACTER_CREATOR.md) wird mit Luna-Subagenten als lokale TypeScript-/Babylon-Werkstatt umgesetzt. Er erzeugt rein kosmetische Figuren und GLB-Dateien; Profilpersistenz, Skillentwicklung und Missionsintegration gehören nicht dazu. Quellenentscheidung und tatsächliche Nachweise: [0016](decisions/0016-typescript-character-creator.md). Kein Abschluss von M6/M7.

**Folgeauftrag vom 22.10.2026:** Der bereitgestellte Quaternius-CC0-Master wird als Standardquelle in die [modulare Figuren-Werkstatt](CHARACTER_MODULAR.md) übernommen: elf Sets, gemeinsamer 62-Bone-Rig, 24 native Clips. Crouch/Reload und Spielintegration bleiben offen. Begründete Änderung der Quellen- und Budgetvorgaben: [0017](decisions/0017-quaternius-figurenbibliothek.md).

**Weitere Figuren-Erweiterung vom 22.10.2026:** „Körpermodell“ wählt zwischen dem männlichen Master und der bereitgestellten weiblichen Bibliothek mit zehn Sets. Beide behalten ihren eigenen Bind-Rig, Meshes und 24 Clips; Quellenauswahl bleibt in JSON und GLB erhalten. Nachweis und Herkunftsgrenzen: [0018](decisions/0018-getrennte-figurenbibliotheken.md), [Werkstattprüfung](CHARACTER_MODULAR.md). Keine Erweiterung des Missions-/MVP-Umfangs.

**Darstellung in der Testmission vom 22.10.2026:** `?stueck=sicht` ersetzt die Einheitskästen durch feste komplette Sets aus beiden CC0-Bibliotheken. Walk, Idle und Death laufen nur in der Ansicht. Crouch, Reload, das 8×8-Raster und alle Regelwerte bleiben unverändert. Siehe [0021](decisions/0021-cc0-figuren-in-der-testmission.md).

**Aktionsergänzung vom 22.10.2026:** Zielen, das eine Medkit und Overwatch gelten in der Simulation und in `?stueck=sicht`. Ein 90-Grad-Sektor schließt die Diagonalen ein; bei zwei passenden Richtungen gilt die erste aus Nord, Ost, Süd, West. Sieht ein Gegner nach seinem Schuss noch einen Runner, hält er Overwatch in dessen Richtung und lässt den Patrouillenschritt aus. Deckung suchen, die Lobby und die Ghost-Floor-Abnahme bleiben offen.

**Einstieg vom 22.10.2026:** `corepack pnpm dev` öffnet `http://127.0.0.1:5173/` als dieselbe Testmission. Die Phaser-Deckung bleibt unter `?stueck=deckung`. Siehe [0024](decisions/0024-ein-start-fuer-die-testmission.md).

**Generatorausbau Version 4:** Konzernidentitäten, Standort-/Abteilungsprofile, Büroorganisation, Pflichtnachbarschaften und kosmetische Materialien/Zustände sind gesondert beauftragt und im lokalen Werkzeug ergänzt. Vier Runner, vorhandene Datenraubregeln und offene menschliche Abnahme bleiben bestehen; siehe [0012](decisions/0012-konzernidentitaet-und-bueroorganisation.md).

**Inhaltsentscheidung vom 22.10.2026:** KASANE, CONCORD, PARALLAX und VERDANT sind als Weltgrundlage ausdrücklich verworfen. Die Organisationslandschaft Version 6 wird als neuer Entwurf geprüft; technische Katalogablösung und neue Kampagnenmechaniken sind damit noch nicht implementiert oder pauschal freigegeben. Siehe [0019](decisions/0019-bisherige-konzernentwuerfe-verworfen.md).

**Beauftragte Konzeptfortentwicklung vom 22.10.2026, mit Nutzerkorrektur:** Die [Organisationslandschaft Version 8](ORGANISATIONEN.md) und der [Katalog](ORGANISATIONSKATALOG.md) beschreiben 70 Akteursprofile und sechs Konkurrenz-/Kooperationsgebilde für eine HTN-getriebene Geschichte. Ressourcen, Abhängigkeiten, Zielauswahl und Methoden ersetzen die zuvor zu speziell ausgearbeiteten Handlungen. Ein erster späterer Nachweis soll Zustandsvariationen mit wenigen Akteuren prüfen. Konkrete Schauplätze, Personen und Ausgänge sind nicht festgelegt. Technische Umsetzung, Kampagnenpersistenz und v0.1-/M6-/M7-Abnahme bleiben gesondert. Siehe [0020](decisions/0020-organisationslandschaft-und-lokale-konflikte.md).

**Generatorausbau Version 3:** Der Folgeauftrag ergänzt Bedarfsplanung, Kapazitäten, variable Raumzahlen und deklarierte Außenfunktionen für Missionsgeschosse. Er erweitert den früheren 8–15-Raum-Rahmen dieses lokalen Werkzeugs auf höchstens 32 örtliche Instanzen; Begründung, Grenzen und Versionierung: [0011](decisions/0011-bedarfsbasiertes-raumprogramm.md). Vier Runner, ein spielbares Geschoss und die offenen Abnahmen bleiben bestehen.

**Generatorausbau Version 2:** Der Folgeauftrag zur GitHub-Auswahl ersetzt die feste Raumaufteilung durch BSP- und Graphverfahren. Herkunft/Lizenz, Suchbudgets und Versionierung stehen in [0010](decisions/0010-bsp-und-graph-grundrisse.md). Das ist weiterhin kein Abschluss von M5, AP-36 oder M7.

**Stand 21.10.2026:** Der ausdrückliche Gebäudeauftrag zieht einen lokalen Prototyp mit drei Familien, Grundriss-/Graph-/3D-Werkstatt und Export vor. Das belegt weder M5 noch die vollständige M7-Abnahme. Abweichungen und offene Integration: [0009](decisions/0009-semantischer-gebaeudegenerator.md); Start und Prüfungen: [GEBAEUDEGENERATOR.md](GEBAEUDEGENERATOR.md).

**Abhängigkeit:** abgeschlossener Taktiktest M5 und gesonderter Generatorauftrag; eine fertige Kampagne ist für Karten-/NPC-Varianten nicht erforderlich.

Arbeit:

- Einheitlicher Generatorvertrag mit benannten Unter-Seeds, Manifest, Versuchsbudget und Rückfall auf geprüfte Vorlagen.
- Generatorstufe 1 nach [0008](decisions/0008-hierarchischer-missionsgenerator.md): Datenraubmuster, ein Gebäude mit 8 bis 15 Räumen, BSP, Raumgraph, Constraint-Prüfung, Deckung und visuelle Modulzuordnung.
- Encounter/NPCs aus vorhandenen, ausbalancierten Rollen und einem Threat Budget.
- Validatoren, Vorschau und Export unveränderlicher Missionspakete. Straßengraph, WFC und weitere Missionsfamilien sind spätere Generatorstufen.

**Abnahme:** AP-32 bis AP-36 erfüllt, erste Suite von 100 Seeds mit ausgewiesener Rückfallrate, akzeptierte Pakete bestehen harte Prüfungen, repräsentative Varianten sind im normalen Spiel und mit Menschen geprüft. 1000 Seeds sind das spätere Ziel der harten Prüfung je Generatorversion. Der erste Generator unterstützt vier Runner.

**Nicht enthalten:** neue Laufzeitregeln aus KI-Text, freie Skill-/Waffenerfindung, vollständige zufällige Kampagne oder Open World. Die handgebaute Referenzmission bleibt für Regression und Vergleich erhalten.

## 10. Test- und Balanceprozess

Für jede Regeländerung: kleinsten aussagekräftigen Regressionsfall hinzufügen, betroffene Regeln testen, relevanten Replay-Satz prüfen. Netzwerkänderungen zusätzlich gegen Raum-Integration; UI-/Verbindungsänderungen gegen passende Browser-Szenarien. Nicht jede Text- oder Darstellungsänderung benötigt die vollständige Botmatrix.

Tuning-Seeds und spätere Evaluations-Seeds getrennt halten. Pro Balanceversuch nur eine kleine, dokumentierte Parametergruppe ändern. Ausgeben: Konfiguration, Erfolgsquote samt Stichprobengröße, Rundenzahl, Ausfälle, AP-Nutzung, Ablehnungen und dominierende Vorgehensweisen. Erfolg hängt auch von der Policy-Qualität ab.

Headless-Durchsatz separat von menschlicher Missionsdauer messen. Ein schneller Botlauf sagt nichts über Erklärzeit oder Teamkommunikation aus. Bei Performanceproblemen zuerst Profil und eine Referenzmaschine dokumentieren; dann Zielbudget festlegen. Keine unbelegten „Echtzeit“- oder Skalierungsversprechen.

## 11. Arbeitspakete für Coding-Agenten

Zu Beginn ein Integrationsverantwortlicher und kleine nacheinander abschließbare Aufgaben. Wenn später ausdrücklich parallel gearbeitet wird: Zuständigkeiten etwa `sim`, Server/Protokoll, Client/Assets und QA/Bots trennen; gemeinsame Schnittstellen zuerst festlegen. Ein Vorschlag für spezialisierte Agenten ist keine Aufforderung, beliebig viele Agenten gleichzeitig zu starten.

Jeder Auftrag enthält Ziel, betroffene Dateien, Abhängigkeiten, Nicht-Ziele und überprüfbare Abnahmekriterien. Beispiel:

> „Bewegung und AP im Regelkern: vier Nachbarfelder, feste Pfadreihenfolge, Blockierung durch Einheiten, Abbruch bei Reaktion. Keine UI oder Netzwerkänderung. Nachweis durch illegale Pfade, AP-Grenze und Replay-Gleichheit.“

Agenten sollen kleine Änderungen integrieren, statt erst am Ende große isolierte Implementierungen zusammenzuführen. Änderungen an Protokoll, Simulationsvertrag oder Contentformat brauchen eine kurze Entscheidungsnotiz und eine Anpassung der betroffenen Tests.

Die konkret benannten Aufträge AP-01 bis AP-36 stehen in [ARBEITSPAKETE.md](ARBEITSPAKETE.md). Größenklassen sind relative Planungswerte; nach den ersten umgesetzten Paketen neu schätzen.

## 12. Ergebnis dieser Planungsphase

Das war der Ausgangsstand der Planung vom 20.10.2026. Inzwischen sind Toolchain, Regel-/Grafikstücke, Missionscode und der separat beauftragte Gebäude-Prototyp vorhanden. Der Headless-Nachweis für M2, einschließlich Gegnerrollen, Crewbot und Replay, steht seit dem 22.10.2026. Daraus folgt keine Abnahme von M3 oder eine menschliche Freigabe; konkrete Nachweise und offene menschliche Prüfungen bleiben maßgeblich.
