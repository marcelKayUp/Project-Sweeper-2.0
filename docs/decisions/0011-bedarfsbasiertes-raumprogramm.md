# 0011 – Bedarfsbasiertes Raumprogramm und Missionsausschnitte

Status: entschieden für den ausdrücklich beauftragten Generatorausbau  
Datum: 21.10.2026

Erweitert durch [0012](0012-konzernidentitaet-und-bueroorganisation.md): Version 4 ergänzt Konzernprofile, Arbeitsplatzrollen, Büroformen, Pflichtnachbarschaften und getrennte kosmetische Materialien/Zustände. Der neutrale Referenzbetrieb bewahrt die hier beschriebenen Kapazitätsannahmen.

## Anlass und Umfang

Der Nutzer hat die vorgeschlagene Bedarfsplanung vor der Grundrissgenerierung beauftragt. Ein Raum pro Funktion ist keine brauchbare Mengenermittlung. Version 3 ergänzt deshalb Betriebsbelegung, Kapazitäten, bedarfsabhängige Mindestflächen und einen expliziten Missionsausschnitt. Die festen zwölf Raumslots aus 0009/0010 entfallen. Der frühere Rahmen von 8–15 Räumen wird für diesen Auftrag auf höchstens 32 örtliche Rauminstanzen erweitert; das ist eine Suchgrenze, keine garantierte Flächenkapazität.

Die Mission bleibt ein Datenraub mit vier Runnern und sechs Gegnern auf einem spielbaren Geschoss. Gebäudebeschäftigte sind Bedarfsdaten, keine zusätzlichen Einheiten. Normale Multiplayerintegration, WFC, weitere Missionstypen und menschliche Abnahme bleiben offen.

## Modell

`BusinessProfile` beschreibt gleichzeitig Anwesende, gleichzeitig belegte Büroarbeitsplätze, Labor-/Produktionsplätze und abstrakte Lagereinheiten. Die Werte stehen in der normalisierten Konfiguration und gehen in Seeds und Paket-Hash ein. Das versionierte Modell `business-capacity/1` ist in `packages/generator/src/demand.ts` implementiert. Es folgt dem Prinzip „Nutzung → Bedarf → Kapazität → Raumprogramm“. Es übernimmt keine DIN-/ASR-Tabellen und erhebt keinen Anspruch auf baurechtliche Planung. Ein Feld ist keine Quadratmeterangabe.

Die vereinfachten Spielannahmen:

- Büro: vier Arbeitsplätze pro Raum; 24 Arbeitsplätze ergeben sechs Büros. Mindestfläche pro Instanz `max(12, 6 + 2 × belegte Plätze)`.
- Besprechung und Pause: gleichzeitig Plätze für die Hälfte der örtlichen Arbeitsplätze beziehungsweise Anwesenden; acht Plätze je Raum, Mindestfläche `max(12, 6 + belegte Plätze)`.
- Sanitär: eine Gruppe je 24 Anwesende, vereinfacht eine Kabine je zwölf. Kabinenzahl und Raumanzahl sind getrennte Angaben. Diese Annahme ist keine Umsetzung der ASR A4.1.
- Labor/Produktion: vier Prozessplätze je Raum, mit Mindestflächen `max(12, 8 + 2 × Plätze)` beziehungsweise `max(12, 8 + 3 × Plätze)`.
- Reinraum und zugehörige Schleuse: eine Gruppe je acht Laborprozessplätze; jeder Reinraum besitzt seine eigene Schleuse. Die Schleuse muss außerdem an ein zugeordnetes Labor anschließen.
- Lager: acht Lagereinheiten pro Raum; Werkstatt je acht Prozessplätze, Versand/Anlieferung je 16 Lagereinheiten, Archiv je 24 Büroarbeitsplätze.
- Lokale Technik je 48 Lastpunkte, wobei Anwesende einfach und Prozessplätze doppelt zählen; Sicherheitsposten je 32 Anwesende. Versorgung bleibt ein abstrakter Raumgraph.
- Ein lokales Serverziel bleibt durch die Datenraubmission vorgegeben. Ein Verteiler im ganzen Gebäude beziehungsweise zwei Zugangsverteiler im Missionsgeschoss dienen der taktischen Erschließung.

Die letzte Instanz eines Typs bekommt nur den verbleibenden Bedarf zugewiesen. Ihre Kapazität darf darüber liegen; ihre Mindestfläche folgt der tatsächlichen Zuweisung. IDs enthalten Typ und laufende Nummer und bleiben von der räumlichen Zuordnung unabhängig. Der Validator berechnet den erwarteten Bedarf aus der Konfiguration neu und prüft jede Instanz, Kapazität, Raumzahl und Flächendeklaration.

## Ganzes Gebäude und Missionsgeschoss

`scope: building` modelliert den gesamten Betrieb auf der einen spielbaren Fläche; `floorShare` muss 100 sein. `scope: mission-floor` verwendet einen Anteil von 1–100 Prozent, standardmäßig 50. Jede örtliche Bedarfsgröße wird aufgerundet; der Rest ergibt den Außenbedarf. Räume werden für beide Bereiche getrennt aufgerundet. Dadurch können zwei getrennte Bereiche mehr Räume benötigen als ein gemeinsamer Bereich derselben Gesamtbelegung.

Empfang und zentrale Anlieferung liegen im Missionsgeschoss ausdrücklich außerhalb. Zwei örtliche Verteiler übernehmen die Missionszugänge. Örtliche Sanitär-, Personal-, Sicherheits- und Technikfunktionen bleiben vorhanden. Der Programmbericht nennt örtlichen Bedarf, Kapazität, örtliche/äußere/gesamte Raumzahl und Begründung. Außenfunktionen sind deklarierter Gebäudekontext; sie erzeugen keine zusätzlichen Rasterzellen, Wege oder Spielregeln. Das Modell ist kein vollständiger Grundriss der übrigen Geschosse; beispielsweise bleibt weitere zentrale IT unmodelliert.

## Geometrie und Fehler

Die BSP-Stufe erhält die tatsächliche Anzahl der Rauminstanzen. Die Funktionszuordnung berücksichtigt deren Mindestflächen, die beiden äußeren Missionszugänge und die geschützten Laborgruppen. Der feste Laborzyklus aus Version 2 wird durch einen kapazitätsabhängigen Constraintgraphen ersetzt: vorgegebene Labor-/Schleusen-/Reinraumpaare plus zulässige geometrische Nachbarschaften, verbundene reguläre Wege und zwei unabhängige Missionsrouten. Nicht passende Nachbarschaften bleiben geschlossen. Sanitärgruppen haben genau einen Eingang und dienen nicht als Durchgang.

Alle Familien benutzen höchstens 12.000 Platzierungsversuche je BSP-Entwurf. Vier Entwürfe pro Gesamtversuch und höchstens zehn Gesamtversuche bleiben bestehen. Die 32-Raum-Grenze und eine notwendige Flächenuntergrenze werden vor der Layoutsuche geprüft: Summe der Mindestflächen plus mindestens drei Trennwandfelder je BSP-Schnitt. Diese Untergrenze beweist keine geometrische Einbettbarkeit. Auch ein rechnerisch passender Bedarf darf am begrenzten Layoutbudget scheitern. Pflichtfunktionen werden dabei nicht verkleinert oder entfernt. Fehler enthalten den vollständigen Bedarfsplan und nennen größere Fläche, geringeren Bedarf oder kleineren Ausschnitt als mögliche Änderung.

Die Werkstatt trennt Flächenbudget und Betriebsprofil: Flächenwechsel verändert die Belegung nicht automatisch. Ein eigener Knopf lädt die Profilannahmen für Familie/Größe (8/16/24 Anwesende). Beim Familienwechsel werden passende Profilwerte geladen. Geänderte Parameter sperren den Export eines vorherigen Entwurfs.

## Versionen und Nachweis

Generator `semantic-building/3`, Content `building-catalog/2`, Paketformat 3; Programm-, Grundriss- und Topologiestufen Version 3. Alte Pakete werden nicht still als neue Pakete rekonstruiert. CLI und Browserexport enthalten einen Hashanteil im Dateinamen, damit verschiedene Betriebsprofile mit demselben Seed verschiedene Dateien erhalten. Keine zusätzliche Abhängigkeit; MIT-Herkunft des BSP-Schnitts bleibt bestehen.

Ausgeführte Prüfungen und verbleibende Grenzen stehen in [GEBAEUDEGENERATOR.md](../GEBAEUDEGENERATOR.md). M7, AP-36 und die menschliche Spielabnahme bleiben offen.
