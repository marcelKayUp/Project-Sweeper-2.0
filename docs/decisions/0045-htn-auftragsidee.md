# 0045 – HTN-Auftragslogik

Datum: 24.10.2026. Status: Idee, nicht umgesetzt.

## Anlass

Die [Organisationslandschaft](../ORGANISATIONEN.md) beschreibt Konkurrenz, Ressourcen, Abhängigkeiten und eine HTN-Domänenskizze. Ein strategischer Planner ist dort ausdrücklich nicht implementiert. Dieser Auftrag hält die Zerlegung und eine kleine, an den Katalog gebundene Aufgabenbibliothek als Idee fest, damit sie später an den deterministischen Kern anschließbar bleibt.

0042 und 0044 sind belegt. Diese Notiz ist die nächste freie Nummer.

## Inhalt der Idee

[HTN-Auftragslogik](../HTN_AUFTRAGSIDEE.md) ist die Ausformulierung. Kurz:

- Ein Aufruf hat einen Planer und eine Wurzel. Die Wurzelregeln stehen in einer Kaskade. Die erste zutreffende Regel gilt und ergibt genau eine Wurzel. Eine spätere Regel beginnt in demselben Aufruf nicht. Die Regeln verwenden die Zustandsnamen des Verzeichnisses, darunter `abhaengigkeit`, `anspruch`, `beleg-kopie`, `ist-information` und `kennt`. Profilwörter setzen diese Tupel nicht.
- Das Suchbudget ist 32 für die ganze Zerlegung. Jeder Eintritt, jeder Methodenversuch und jedes Zurücksetzen verbraucht denselben Zähler. Verbrauch kommt nicht zurück. Bei Erschöpfung endet die Suche mit `budget-erschoepft` und ohne Plan.
- Methoden stehen in einer totalen Ordnung: Mittelrang aus den bevorzugten Mitteln des Planers, danach Priorität, danach Methoden-ID. Die Ordnung bestimmt nur die Reihenfolge. Eine Methode mit fehlender Voraussetzung bleibt unpassend. Bevorzugte Mittel ändern daran nichts.
- Operatoren haben Voraussetzungen, Plankosten, Wirkung und Sichtbarkeit. Die Wirkung schreibt Tupel in die Suchkopie. Danach prüft der Zieltest, ob der Zielzustand gilt. Die Suchkopie beginnt als Wissen des Planers. `kontrolliert-zugang` eines anderen Akteurs gilt darin nur, wenn das Wissen es enthält. Ein Weltabgleich nach dem Plan kann `welt-weicht-ab` ergeben.
- `methode.datenraub-ueber-zugang` legt die Reihenfolge `prim.zugang`, `prim.datenraub`, `prim.extraktion` fest. Die Missionspipeline aus [0008](0008-hierarchischer-missionsgenerator.md) erhält nur diese Liste und nur bereits vorhandene Aktionen. Die HTN ruft die Schussauflösung nicht auf. `angebot-offen` ist ein Zustand des Verzeichnisses. Die Idee führt keine Planmarken.
- Beobachtung, Geisel, Sabotage und Eskorte sind keine Aufgaben dieses Netzes.
- Die Beispiele nutzen Katalogbegriffe von `daeyang`, `ruhrmark`, `kettenbrecher`, `vantier-helvetia`, `datenfriedhof`, `sogno-ottico`, `offene-schleuse`, `chengyu-neuro`, `nakamura-lindahl`, `sternenmarkt`, `bosfor-vektor`, `freie-zone-sued` und `falkenfeld-kessler`. Für das Archiv der Vantier-Forderungen und für `neutraler-ort` nennt der Katalog keinen passenden Akteur. Die Idee legt keinen an.

## Grenzen

Die Notiz gibt nichts frei. Sie ändert `packages/sim` nicht, keine Würfel, keine Missionsregel, keine Deckung und keine Sichtlinie. Dekoration und die Stadtkarte bleiben ohne Kampfwirkung. KASANE, CONCORD, PARALLAX und VERDANT bleiben verworfen. Der Katalog und die Domänenskizze bleiben die Inhaltsquelle. Die Landschaft erhält in demselben Schritt nur einen Verweis auf diese Idee.

Nicht-Ziele bleiben Belohnungen, neue Missionsfamilien, Händler, Drohnen als Einsatzmittel, Alarm, Verstärkung, simultane Planung und jede Serverumsetzung. [0005](0005-kampf-rng-und-schussaufloesung.md) bleibt die Schussregel. [0043](0043-eine-kampfprobe-am-regelkern.md) wird nicht übernommen. [0008](0008-hierarchischer-missionsgenerator.md) behält die Reihenfolge der Missionspipeline. Die Missionslogik erzeugt nur schon vorhandene Aktionen.

## Verweise

[HTN-Auftragslogik](../HTN_AUFTRAGSIDEE.md) · [Organisationslandschaft](../ORGANISATIONEN.md) · [Katalog](../ORGANISATIONSKATALOG.md) · [0019](0019-bisherige-konzernentwuerfe-verworfen.md) · [0020](0020-organisationslandschaft-und-lokale-konflikte.md) · [0008](0008-hierarchischer-missionsgenerator.md) · [0041](0041-vektorkarte-gebaeude-und-strassen.md) · [0043](0043-eine-kampfprobe-am-regelkern.md)
