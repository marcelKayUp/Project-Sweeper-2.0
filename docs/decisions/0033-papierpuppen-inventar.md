# 0033 · Papierpuppen-Inventar

Datum: 23.10.2026 · Status: durch die direkte Nutzeranweisung begonnen. M4, M5 und die menschliche M3-Abnahme bleiben offen.

## Anlass

[0032](0032-lager-slots-und-stadtkarte.md) speichert je Runner nur Stückzahlen. Die direkte Anweisung will die Ausrüstung an benannten Körperstellen sehen und per Ziehen verschieben. Ein Gewehr braucht beide Hände. Die Stadtkarte bleibt unverändert.

## Entscheidung

- Save-Version ist 3. Version 0, 1 und 2 bleiben lesbar. Die Migration legt keine Gegenstände an und verdoppelt keine. Version 2 mit einem übervollen Slot bleibt ungültig. Stückzahlen über der Slotgrenze wandern wie bisher ins gemeinsame Lager, danach setzt die Papierpuppe die begrenzten Stücke.
- Ein Runner trägt weiter höchstens ein Gewehr, eine Pistole, drei Gewehrmagazine, drei Pistolenmagazine und ein Medkit. Das Gewehr belegt beide Hände oder zwei benachbarte Rückenfelder. Die Pistole belegt eine Hand oder ein Rückenfeld. Ein Magazin belegt ein Rückenfeld. Das Medkit belegt den Gürtel. Der Rücken hat vier mal drei Felder, damit das bisherige Einsatzset auch abgelegt noch Platz hat. Das gemeinsame Lager bleibt eine Zählung je Kategorie.
- Der Client sendet den Wunsch, ein Stück von einem Platz zu einem anderen zu schieben. `packages/sim` entscheidet Belegung, Verschieben, Einfrieren und Buchung. Ein unpassendes Ziel, ein voller Platz und ein leeres Lager werden abgelehnt. Während eines eingefrorenen Einsatzes ist kein Verschieben möglich. Die Buchung bleibt genau einmal.
- Die Lobby zeigt den gewählten Runner als Silhouette. Die Modulfigur hat keine Anker, an denen Gewehr, Pistole und Medkit der Belegung folgen. Die Silhouette zeichnet das getragene Teil an Hand, beiden Händen oder Gürtel. Das ist keine zweite Kampfansicht.

## Nicht in dieser Scheibe

Beine, Schultern, Raketen, neue Waffen, Händler, Skillbaum, Cyberware, patronegenaues Inventar und die Stadtkarte. M4, M5 und die menschliche M3-Abnahme bleiben offen.

## Verweise

[0031](0031-erster-inventar-speicher.md) · [0032](0032-lager-slots-und-stadtkarte.md) · [Entwicklungsplan M6](../ENTWICKLUNGSPLAN.md)
