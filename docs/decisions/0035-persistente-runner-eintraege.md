# 0035 · Persistente Runner-Einträge

Datum: 23.10.2026 · Status: durch die direkte Nutzeranweisung begonnen. M4, M5 und die menschliche M3-Abnahme bleiben offen.

## Anlass

Die gemeinsame Kampagne speichert vier feste Figuren und einen anonymen Crew-Topf. Die Anweisung will je Spieler einen eigenen Eintrag, den ein Passwort öffnet, ohne das Passwort abzulegen. Aussehen, Attribute und Skillbaum bleiben draußen.

## Entscheidung

- Der stabile Schlüssel ist der normalisierte Runner-Name: NFKC, getrimmt, ohne Großschreibung. `Mira` und `mira` sind derselbe Runner. Der angezeigte Name bleibt die Schreibung der ersten Anlage.
- Das Passwort ist nur das Geheimnis. Der Server speichert scrypt mit Salt, Parametern und Hash. Kein Klartext im Dateinamen, im JSON, in Logs, in Replays oder in Fehlermeldungen. `packages/sim` sieht das Passwort nicht und importiert kein Node-crypto.
- Ein Eintrag enthält den Namen, den Passwort-Hash, die Ausrüstung (Körperbelegung und eigenes Lager) und das Buchungsregister dieses Runners. Ein offener Einsatz liegt als Hold am Eintrag, damit ein Abbruch die Stücke zurückgibt. Kein Aussehen, keine Attribute, kein Skillbaum.
- Der Zugang vor der Lobby nimmt Name und Passwort. „Runner anlegen“ schreibt den Eintrag, wenn der Name frei ist und das Passwort mindestens acht Zeichen hat. „Anmelden“ öffnet ihn nur bei passendem Hash. Doppelter Name und falsches Passwort werden abgelehnt, ohne zu sagen, ob ein Hash verglichen wurde. Der Client sendet den Wunsch, der Server entscheidet.
- Ein neuer Runner beginnt mit dem bisherigen Startbestand: Gewehr in beiden Händen, Pistole und Magazine auf dem Rücken, Medkit am Gürtel, leeres eigenes Lager, keine Buchung. Das ist sein Bestand, nicht der gemeinsame Crew-Topf.
- Die vier Missionsplätze bleiben kite, voss, nera und sol. Ein angemeldeter Runner belegt einen freien Slot mit seinem Bestand. Der Account ist der Spieler-Eintrag, der Slot nur der Platz in der Runde. `campaign.json` bleibt liegen und wird nicht migriert. Die Accounts stehen in `apps/server/data/runners.json`.
- Die Papierpuppe zeigt den Bestand des angemeldeten Runners. Sein Lager heißt dort Eigenes Lager. Ziehen und die Serverprüfung der Slots bleiben. Ein Gewehr belegt beide Hände.

## Nicht in dieser Scheibe

Charakteraussehen, 3D-Anker, Skillbaum, Händler, Stadtkarte und das Schadensmodell. M4, M5 und die menschliche M3-Abnahme bleiben offen.

## Verweise

[0031](0031-erster-inventar-speicher.md) · [0033](0033-papierpuppen-inventar.md) · [Entwicklungsplan M6](../ENTWICKLUNGSPLAN.md)
