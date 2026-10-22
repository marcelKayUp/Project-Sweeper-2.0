# 0008 – Hierarchischer Missionsgenerator

Status: entschieden  
Datum: 21.10.2026

## Kontext

[GENERATOREN.md](../GENERATOREN.md) sieht nach dem Taktiktest einen optionalen Strang M7 vor. [0007](0007-babylon-taktikansicht.md) legt fest, dass eine Mission JSON ist und Babylon.js sie aus GLB-Modulen zeichnet. Diese Entscheidung bestimmt, in welcher Reihenfolge und mit welchen Verfahren spätere Missionen entstehen. Sie ersetzt die handgebaute Ghost-Floor-Mission nicht und zieht keinen Stadtgenerator in v0.1.

## Entscheidung

Der Generator erzeugt zuerst ein taktisches Problem und danach die Cyberpunk-Umgebung, die dieses Problem trägt. Mehrere spezialisierte Stufen bauen aufeinander auf. Ein einzelnes Rausch- oder Kachelverfahren erzeugt keine Mission.

| Stufe | Aufgabe | Verfahren |
| --- | --- | --- |
| Missionslogik | Pflichtziele, optionale Ziele, Abhängigkeiten, alternative Lösungen, Eskalation | Graphgrammatik und HTN, nur mit bereits implementierten Aktionen |
| Topologie | Wege, Räume, Zugänge, später Straßen und Grundstücke | Raumgraph, BSP und Raumgrammatik; Straßengraph erst in einer späteren Stufe |
| Taktisches Layout | Deckung, Sichtlinien, Flanken, Missionsobjekte | Gewichtete Platzierung, Constraint-Prüfung, begrenztes Backtracking |
| Begegnungen | Wachen, Patrouillen, Verstärkung | Threat Budget und vorhandene Rollenvorlagen |
| Darstellung | Module, Fassaden, Dekoration | Zuerst feste GLB-Zuordnung; Shape Grammars, WFC und Poisson-Disk erst für unwichtige Variation |
| Prüfung | Erreichbarkeit, Lösbarkeit, taktische Qualität | Graphprüfung, danach Botläufe auf einer Stichprobe |

Die Ausgabe ist dasselbe eingefrorene Missions-JSON wie bei einer handgebauten Karte: logisches Raster, Deckungskanten, Sichtlinien-Blocker, Modul-IDs. Das Mesh und die Dekoration erzeugen keine Regel.

`packages/generator` entsteht erst mit dem Generatorauftrag. Es darf reine Geometrieabfragen aus `packages/sim` nutzen. `sim` importiert den Generator nicht. Babylon.js, Phaser und ein zweites Simulationspaket gehören nicht in diese Pipeline. Freie Navmesh-Bewegung ist keine taktische Wegfindung.

Jede Stufe hat einen eigenen deterministischen Zufallsstrom. Eine neue Dekorationsregel verschiebt keine Ziele und keine Kampfwerte. Höchstens zehn Versuche, danach eine geprüfte Vorlage oder ein erklärter Fehler. Reconnect, Hotjoin und ein laufender Einsatz erzeugen die Karte nicht neu.

## Stufen des Ausbaus

Die Namen MVP 1 bis 4 werden hier nicht verwendet. Der spielbare MVP bleibt v0.1.

**Generatorstufe 1**, der erste M7-Schnitt: eine Datenraubmission in einem Gebäude mit 8 bis 15 Räumen, einem Serverraum und zwei Zugängen. Verfahren sind Missionsmuster, BSP, Raumgraph und die harte Validierung. Unterstützt werden vier Runner. Ghost Floor bleibt die Vergleichsmission.

**Generatorstufe 2:** taktische Raumrollen und schärfere Deckungskriterien, geprüft an Botläufen. Die Rollen Kill Zone, Flankenweg, Strongpoint, Sammelzone und Schleichweg sind Qualitätslabels des Generators. Sie führen keine neue Trefferformel ein.

**Generatorstufe 3:** Straßengraph, Grundstücke und mehrere Gebäudemodule. Das ist weiterhin eine abgeschlossene Missionsfläche, keine Open World.

**Generatorstufe 4:** Fassaden und Dekoration über Shape Grammars, WFC und Poisson-Disk. Mehrere Geschosse erst zusammen mit einer eigenen Kletterregel. Ein Event-Director nur für Eskalationen, die der Regelkern bereits kennt.

Die Grammatik darf die Familien Datenraub, Geiselbefreiung und Sabotage als Muster vorsehen. Gebaut wird zuerst nur der Datenraub. Geisel und Sabotage warten auf ihre Spielregeln.

Spielerzahl, Schwierigkeit, Fraktion, Viertel und Missionstyp sind Parameter der Anfrage. Die erste unterstützte Konfiguration ist vier Runner, Konzernviertel, Datenraub. Sechs und acht Runner bekommen eigene geprüfte Konfigurationen. Eine größere Crew entsteht nicht dadurch, dass dieselben Gegner verdoppelt werden. Zahlenbeispiele für Wege, Zielbereiche und Encountergruppen sind keine Startwerte.

Beim Hotjoin bleibt die Geometrie stehen. Neue Runner nutzen vorbereitete Zugangspunkte. Nur noch nicht ausgelöste Begegnungen dürfen sich innerhalb des bereits eingefrorenen Budgets ändern.

## Bewusst anders als die Skizze

- Die erste Abnahme von AP-36 bleibt eine Suite von 100 Seeds für die harte Prüfung. 1000 Seeds je Generatorversion sind das spätere Ziel für Erreichbarkeit und Konsistenz. Botläufe und menschliche Partien prüfen eine dokumentierte Stichprobe.
- Ein Constraint-Solver wie OR-Tools kommt erst, wenn gewichtete Platzierung und Backtracking die Qualitätsziele nicht halten. Bis dahin keine neue Abhängigkeit.
- WFC platziert keine Missionsziele, Wege oder entscheidende Deckung.
- Gegner erscheinen nicht unmittelbar bei den Runnern, nur weil ein Director Spannung will. Verstärkung kommt aus vorbereiteten Zugängen.
- Building Site bleibt ein getrenntes Zeichenwerkzeug. Seine JSON wird nicht zur Missionsquelle.

## Folgen

- v0.1 und v0.2 laden weiter handgebaute beziehungsweise vorbereitete Karten.
- [0004](0004-gerichtete-deckungskante.md), [0005](0005-kampf-rng.md), [0006](0006-vier-spieler-mission.md) und [0007](0007-babylon-taktikansicht.md) bleiben in Kraft. Höhenbonus und Kletterkosten entstehen hier nicht.
- Ein Replay nennt den Paket-Hash, die Generatorversionen und die Konfiguration. Ein Seed allein rekonstruiert eine Mission nach einem Generatorupdate nicht.
