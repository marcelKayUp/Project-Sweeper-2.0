# 0004 · Gerichtete Deckungskante und blockierende Wand

Datum: 20.10.2026 · Status: Arbeitsentscheidung für die Gefechtsansicht, keine Produktfreigabe.

## Anlass

Die Startformel in [PROTOTYP.md](../PROTOTYP.md) nennt einen Deckungsabzug, wenn der Schuss die geschützte Zielkante passiert, und blockierende hohe Hindernisse. Für einen prüfbaren Regelkern braucht diese Aussage eine eindeutige Geometrie.

## Entscheidung für diese Umsetzung

- Niedrige Deckung gehört zu einer Zelle und nennt genau eine Kante: Nord, Ost, Süd oder West. Y wächst nach Süden.
- Der Abzug beträgt 25 Prozentpunkte, wenn die Strecke zwischen den Zellmittelpunkten von Schütze und Ziel diese Kante der Zielzelle schneidet, einschließlich der Endpunkte. Mehrere Kanten derselben Zielzelle ziehen nur einmal ab. Deckung anderer Zellen erzeugt keinen weiteren Abzug.
- Hohe undurchsichtige Hindernisse sind ganze Zellen. Der Strahl zwischen den Mittelpunkten ist ein symmetrischer Supercover: betretene Zellen zählen, und ein exakt berührter undurchsichtiger Eckpunkt blockiert. Eine blockierte Linie hat keine Trefferchance.
- Offen bleibt die ganzzahlige Formel `70 + Zielbonus − 5 × max(0, Manhattan − 3) − Deckungsabzug`, begrenzt auf 10–95. Basispunkte sind hier nicht nötig, weil jeder Term ein ganzer Prozentpunkt ist.
- Die Abfrage liest nur und verändert Karte, Zellen und Bonus nicht. Sie verbraucht weder AP noch einen Würfel.

Darstellung darf Wände und niedrige Deckung mit unterschiedlicher aufgemalter Höhe zeigen. Das ist keine zweite Höhenebene und ändert die Regeln nicht. Ganzzahlige Zellhöhen als Kartendaten folgen [0007](0007-babylon-taktikansicht.md) und führen hier keinen Höhenbonus ein.

## Verweise

[Prototyp](../PROTOTYP.md) · [Architektur](../ARCHITEKTUR.md)
