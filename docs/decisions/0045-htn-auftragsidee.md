# 0045 – HTN-Auftragslogik

Datum: 24.10.2026. Status: Idee, nicht umgesetzt.

## Anlass

Die [Organisationslandschaft](../ORGANISATIONEN.md) beschreibt Konkurrenz, Ressourcen, Abhängigkeiten und eine HTN-Domänenskizze. Ein strategischer Planner ist dort ausdrücklich nicht implementiert. Dieser Auftrag hält die Zerlegung und eine kleine, an den Katalog gebundene Aufgabenbibliothek als Idee fest, damit sie später an den deterministischen Kern anschließbar bleibt.

0042 und 0044 sind belegt. Diese Notiz ist die nächste freie Nummer.

## Inhalt der Idee

[HTN-Auftragslogik](../HTN_AUFTRAGSIDEE.md) ist die Ausformulierung. Kurz:

- Abstrakte Aufgaben, Methoden mit geordneten Teilaufgaben und primitive Aufgaben. Voraussetzungen und Effekte sind benannte Zustände.
- Bei mehreren passenden Methoden entscheidet die Priorität, danach die stabile Methoden-ID. Backtracking verwirft nur die Suchkopie, bleibt begrenzt und schreibt den Fehlgrund in eine Spur. Die Idee würfelt nicht und liest keine Uhr.
- Die Primitive enden bei Datenraub, Extraktion, Zugang und Beobachtung, dazu bei Angebot und Warten auf eine äußere Antwort. Datenraub, Zugang und Extraktion sind die Checkliste eines Auftrags in der vorhandenen Datenraubform. Beobachtung bleibt offen und wird nicht als Crew-Auftrag ausgegeben. Keine Primitive ruft die Schussauflösung auf.
- Die Planungszeit liegt vor der taktischen Runde. Der Plan ist ein Auftrag oder eine begründete Absage.
- Die Beispiele nutzen Katalogbegriffe von `daeyang`, `ruhrmark`, `kettenbrecher`, `vantier-helvetia`, `datenfriedhof`, `chengyu-neuro` und `nakamura-lindahl`. Für das Archiv der Vantier-Forderungen und für einen neutralen Ort nennt der Katalog keinen passenden Akteur. Die Idee legt keinen an.

## Grenzen

Die Notiz gibt nichts frei. Sie ändert `packages/sim` nicht, keine Würfel, keine Missionsregel, keine Deckung und keine Sichtlinie. Dekoration und die Stadtkarte bleiben ohne Kampfwirkung. KASANE, CONCORD, PARALLAX und VERDANT bleiben verworfen. Der Katalog und die Domänenskizze bleiben die Inhaltsquelle. Die Landschaft erhält in demselben Schritt nur einen Verweis auf diese Idee.

Offen bleiben Belohnungen, neue Missionsfamilien, Händler, Drohnen als Einsatzmittel, Alarm, Verstärkung, simultane Planung und jede Serverumsetzung. [0005](0005-kampf-rng-und-schussaufloesung.md) bleibt die Schussregel. [0043](0043-eine-kampfprobe-am-regelkern.md) wird nicht übernommen. [0008](0008-hierarchischer-missionsgenerator.md) behält die Reihenfolge der Missionspipeline.

## Verweise

[HTN-Auftragslogik](../HTN_AUFTRAGSIDEE.md) · [Organisationslandschaft](../ORGANISATIONEN.md) · [Katalog](../ORGANISATIONSKATALOG.md) · [0019](0019-bisherige-konzernentwuerfe-verworfen.md) · [0020](0020-organisationslandschaft-und-lokale-konflikte.md) · [0008](0008-hierarchischer-missionsgenerator.md) · [0041](0041-vektorkarte-gebaeude-und-strassen.md) · [0043](0043-eine-kampfprobe-am-regelkern.md)
