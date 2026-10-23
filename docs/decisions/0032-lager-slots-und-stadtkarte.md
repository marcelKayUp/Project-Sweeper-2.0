# 0032 · Lager, Slots und Straßengraph

Datum: 23.10.2026 · Status: durch die direkte Nutzeranweisung begonnen. M4, M5 und die menschliche M3-Abnahme bleiben offen. Die Belegung der Slots ist in [0033](0033-papierpuppen-inventar.md) fortgeschrieben.

## Anlass

[0031](0031-erster-inventar-speicher.md) speichert je Runner ganze Zahlen für Gewehr, Pistole, Magazine und Medkits. Die direkte Anweisung erweitert das um ein kleines gemeinsames Lager und begrenzte Slots und verlangt zusätzlich eine abstrakte Rhein-Ruhr-Übersicht. AP-28 bleibt im Plan nach M6; diese Scheibe übernimmt davon nur den Graphen, nicht Händler, Fraktionen oder Auftragsmarker.

## Entscheidung

- Save-Version ist 2. Version 0 und Version 1 bleiben lesbar und werden beim Laden migriert. Die Migration legt keine Gegenstände an. Was über den Slot hinausgeht, wandert ins gemeinsame Lager. Ein Save der Version 2 mit einem übervollen Slot ist ungültig.
- Ein Runner trägt höchstens ein Gewehr, eine Pistole, drei Gewehrmagazine, drei Pistolenmagazine und ein Medkit. Der Rest liegt im gemeinsamen Lager. Kategorien sind nur Waffen, Magazine und Medkits. Es gibt keine Itemdatenbank, keine Seltenheit, kein Gewicht und keine Cyberware.
- Der Server entscheidet Entnahme, Einlagern, Einfrieren und Buchung. Der Client sendet Wünsche. Einfrieren geht nur aus den Slots, nie aus dem Lager allein. Während eines eingefrorenen Einsatzes ist kein Verschieben möglich. Die Buchung eines Ergebnisses bleibt genau einmal. Passt die Rückgabe nicht mehr in den Slot, liegt der Überhang im Lager. Die Buchungszeile nennt danach den Slotstand.
- Der Startbestand bleibt das bisherige Einsatzset in den Slots. Das Lager beginnt leer. Der lokale Save `apps/server/data/campaign.json` bleibt der Speicher. Reconnect und ein zweiter Zugriff auf denselben Save erzeugen keine zweite Buchung und setzen das Lager nicht zurück.
- `packages/sim` enthält den Rhein-Ruhr-Graphen und die Abfrage der Nachbarn in der gespeicherten Kantenreihenfolge. 32 Orte, 49 Kanten, ganzzahlige Koordinaten. Der Graph erzeugt keine Deckung, keine Sichtlinie und keine Missionsregel.
- Die Orte kommen aus einer Live-Overpass-Abfrage am 23.10.2026, 06:46:36 UTC, Endpoint `https://overpass-api.de/api/interpreter`, Bounding Box 50.65, 6.35, 51.70, 7.95. Abgefragt wurden `place=city` und acht benannte `place=town`: Witten, Wesel, Dinslaken, Unna, Ratingen, Gladbeck, Hilden, Velbert. Quelle ist OpenStreetMap, Lizenz ODbL 1.0. Die Antwort nennt: „The data included in this document is from www.openstreetmap.org. The data is made available under ODbL.“
- Die Koordinaten sind auf einen Bereich von 0 bis 1000 gerundet. x wächst nach Osten, y nach Süden: x = gerundet((lon − 6.4353792) / (7.8191185 − 6.4353792) × 1000), y = 1000 − gerundet((lat − 50.7352621) / (51.681281 − 50.7352621) × 1000). Gespeichert sind die gerundeten Zahlen, nicht der OSM-Dump.
- Die Straßenabfrage ist nicht durchgelaufen. Relationen mit `network=DE:BAB` lieferten null Elemente. Eine Way-Abfrage der Hauptstrecken antwortete mit HTTP 502. Eine Zählabfrage endete ohne Antwortkörper im Timeout. Die 49 Kanten sind deshalb eine handgesetzte Reduktion öffentlich bekannter Korridore zwischen den abgefragten Orten, keine importierte Straßengeometrie. Im Datensatz steht `roadsLive` auf `nein`.
- Der Client zeichnet diesen Graphen unter `?stueck=stadt` mit SVG: blaue Blöcke, weiße Kanten, dunkler Grund. Die taktische Babylon-Szene bleibt unverändert.

## Nicht in dieser Scheibe

Zweite Mission, Hub, Händler, Klinik, Fraktionen, Auftragsmarker, Skillbaum, Cyberware, patronegenaues Inventar und die Reparatur der Seeds 1–100. Die menschliche M3-Abnahme bleibt offen.

## Verweise

[Entwicklungsplan M6](../ENTWICKLUNGSPLAN.md) · [AP-26 und AP-28](../ARBEITSPAKETE.md) · [S07, S16 und S18](../MVP_SCREENS.md) · [0031](0031-erster-inventar-speicher.md)
