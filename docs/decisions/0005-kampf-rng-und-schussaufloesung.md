# 0005 · Kampf-RNG und Schussauflösung

Datum: 20.10.2026 · Status: Arbeitsentscheidung für die Gefechtsansicht, keine Produktfreigabe.

## Anlass

[PROTOTYP.md](../PROTOTYP.md) legt fest, dass ein gültiger Schuss auch beim Fehlschuss AP und eine Patrone verbraucht, ein ungültiger Schuss weder AP noch Zufall, und dass Treffer 2 HP kosten. Die Vorschau bleibt die vorhandene Formel. Offen war, welcher gespeicherte Zufallsstrom den Schuss auflöst.

## Entscheidung für diese Umsetzung

- `previewShot` bleibt die reine Vorschau. Sie würfelt nicht und bucht keine Ressourcen.
- Kampfwürfe laufen über einen eigenen Stream `combat`. Ein Bot-Stream mischt dasselbe Seed mit einem anderen Salz und wird von `resolveShot` abgelehnt. Version des Generators ist 1.
- Der Zustand ist ein uint32. Aus dem Seed wird er mit SplitMix32 gemischt. Jeder Schritt ist xorshift32: `x ^= x << 13`, `x ^= x >>> 17`, `x ^= x << 5`, danach als uint32 gespeichert. Ein Zustand 0 wird auf einen festen Ersatzwert gesetzt, damit der Schritt nicht stehen bleibt.
- Der Prozentwurf ist eine ganze Zahl von 0 bis 99. Werte ab 4_294_967_200 werden verworfen und der Schritt wiederholt, damit `% 100` gleichverteilt bleibt. Treffer, wenn der Wurf kleiner als die Chance in Prozentpunkten ist.
- Ein Schuss über eine blockierte Linie, ohne genug AP, ohne Patrone oder außerhalb der Waffenreichweite gibt den RNG-Zustand unverändert zurück und bucht nichts.
- Ein gültiger Schuss bucht 3 AP und eine Patrone, auch beim Fehlschuss. Ein Treffer senkt die Ziel-HP um 2, mindestens auf 0. Dieselbe Seed und dieselbe Vorschau ergeben denselben Wurf und denselben Folgezustand.
- Der Zielbonus dieser Ansicht ist 0. `resolveShot` nimmt sonst nur +15 an. Ein zweites +15 ist kein gültiger Bonus.

Die Gefechtsansicht löst den Schuss der Wache auf Kite aus [0004](0004-gerichtete-deckungskante.md) mit Seed 1 auf. Die Linie kreuzt die geschützte Ostkante, die Chance ist 40, der Abzug 25, der Wurf 33, also ein Treffer.

## Verweise

[Prototyp](../PROTOTYP.md) · [Architektur](../ARCHITEKTUR.md) · [Gerichtete Deckungskante](0004-gerichtete-deckungskante.md)
