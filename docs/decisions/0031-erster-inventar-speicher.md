# 0031 · Erster Speicher für Inventar und Ergebnisbuchung

Datum: 23.10.2026 · Status: durch die direkte Nutzeranweisung begonnen. M4 und M5 bleiben offen. Die menschliche M3-Abnahme bleibt offen.

## Anlass

Der Entwicklungsplan setzt M6 nach einem positiven Taktiktest und einer Scope-Entscheidung hinter M5. Die direkte Anweisung beginnt den persistenten Speicher vorher. M6 insgesamt verlangt gespeicherte Runner, Skills, eine zweite Mission und einen Hub. Diese Scheibe trägt nur den kleinsten geschlossenen Teil von AP-23 und AP-26.

## Entscheidung

- Es gibt eine lokale Kampagne `lokal` mit Save-Version 1. Die vier festen Runner kite, voss, nera und sol behalten ihren Besitz. Der Server speichert ihn als JSON und entscheidet über Freeze und Buchung. `packages/sim` bleibt ohne Dateizugriff.
- Der Startbestand je Runner ist das heutige Einsatzset: ein Gewehr, eine Pistole, drei Magazine je Waffe und ein Medkit. Drei Magazine sind das geladene Magazin plus die zwei vorhandenen Reserven.
- Die Lobby kann nur eine Waffe einfrieren, für die Waffe, drei passende Magazine und ein Medkit im Besitz liegen. Der laufende Einsatz ändert dieses Lager nicht. Beim Abbruch ohne Buchung kehrt das eingefrorene Set einmal zurück.
- Ein Missionsergebnis mit derselben Resultat-ID wird genau einmal verbucht. Zurück kommen die Waffe, unbenutzte Reservemagazine, das geladene Magazin, solange noch eine Patrone darin liegt, und die übrigen Medkits. Eine Overwatch-Patrone zählt dabei zum geladenen Magazin. Ein angebrochenes Magazin bleibt ein Magazin; der nächste Einsatz startet weiter mit dem vollen Magazin der bestehenden Missionsregeln.
- Fortschritt in dieser Scheibe ist das Buchungsregister: Anzahl, letztes Ergebnis und die gebuchte Änderung. Es gibt keine neuen Kosten, Schwellen oder Skillbäume. Ghost Floor hat keine zusätzliche Beute neben dem zurückgegebenen Set.
- Version 0 ist nur der Besitz ohne Register. Die Migration auf Version 1 legt das leere Register an und fügt keine Gegenstände hinzu. Zähler im Save sind ganze Zahlen von 0 bis 99; das ist eine Prüfgrenze, kein Spielziel.
- Ein Prozessabbruch vor dem Schreiben der Buchung gibt das eingefrorene Set zurück und verbucht nichts. Ein zweiter Tab und eine Wiederaufnahme lesen denselben Speicher und erzeugen keine zweite Buchung.

## Nicht in dieser Scheibe

Zweite Mission, Stadtkarte, Händler, Klinik, Fraktionen, Hub, Charaktererstellung, Attribut- oder Technikbaum, gemeinsames Lager, patronegenaues Inventar und die Reparatur der Seeds 1–100. M4 und M5 bleiben unberührt. `docs/M3_TESTBOGEN.md` bleibt leer.

## Verweise

[Entwicklungsplan M6](../ENTWICKLUNGSPLAN.md) · [AP-23 und AP-26](../ARBEITSPAKETE.md) · [MOD-13 und MOD-14](../MVP_MODULE.md)
