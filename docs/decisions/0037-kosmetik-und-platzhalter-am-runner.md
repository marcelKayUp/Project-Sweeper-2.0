# 0037 · Kosmetische Spec und wirkungslose Platzhalter am Runner

Datum: 23.10.2026 · Status: durch die direkte Nutzeranweisung begonnen. M4, M5, M6 und die menschliche M3-Abnahme bleiben offen.

## Anlass

Beim ersten Anlegen soll die Figur sichtbar werden und Punkte erhalten, bevor der Eintrag geschrieben wird. [CHARAKTERENTWICKLUNG.md](../CHARAKTERENTWICKLUNG.md) bleibt ein Entwurf ohne Freigabe. Kosten und Schwellen werden nicht übernommen.

## Entscheidung

- „Runner anlegen“ öffnet die Erstellung auf dem Zugang. Der Server schreibt den Account erst nach Bestätigen, und nur wenn der Name frei ist, das Passwort 8 bis 128 Zeichen hat und die Punkte in den Grenzen liegen. „Anmelden“ öffnet einen vorhandenen Runner und legt keinen weiteren Körper an.
- Der Eintrag speichert die modulare kosmetische Spec und die Punktverteilung. Alte Einträge ohne diese Felder bleiben ladbar. Sie gelten als Standardaussehen der Modulbibliothek und als ausgeglichene Platzhalter. Das Passwort bleibt nur ein scrypt-Hash.
- Die Attribute sind die Oberbegriffe Physisch, Sozial und Mental. Jedes hat eine ganze Zahl von 1 bis 5, zusammen 9 Punkte, ausgeglichen 3/3/3. Die Fertigkeiten sind drei unbenannte Platzhalter, je 0 bis 3, zusammen 3 Punkte, ausgeglichen 1/1/1. Die Oberfläche zeigt dazu nur „Beschreibung folgt“.
- Diese Punkte ändern keine Kampf-, Bewegungs- oder Wundwerte. `packages/sim` liest sie nicht in Treffer oder AP und importiert die Figurenwerkstatt nicht.

## Nicht in dieser Scheibe

Skillbaum, Schwellen, Kosten, Effekte, Händler und die Freigabe der Charakterentwicklung.

## Verweise

[0016](0016-typescript-character-creator.md) · [0035](0035-persistente-runner-eintraege.md) · [CHARAKTERENTWICKLUNG.md](../CHARAKTERENTWICKLUNG.md)
