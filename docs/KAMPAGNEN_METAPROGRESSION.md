# NEON CONTRACT – Kampagnen-Metaprogression

24.10.2026 · **Idee, nicht umgesetzt.** Keine Freigabe, keine Spielregel, keine Änderung an Simulation, Server oder Katalog. Alle Zahlen sind Startannahmen für Tests. Herkunft: Nutzervorschlag vom 24.10.2026.

Einordnung: M6 ([ENTWICKLUNGSPLAN.md](ENTWICKLUNGSPLAN.md)), nach positivem Taktiktest und Scope-Entscheidung. Der Vorschlag knüpft an [CHARAKTERENTWICKLUNG.md](CHARAKTERENTWICKLUNG.md) und [0002](decisions/0002-gestufte-charakterentwicklung.md) an: kooperatives Spiel mit 4–8 Runnern, eine persistente Crew, XP als gemeinsame Entwicklungswährung, keine automatischen AP-, HP- oder Schadenssprünge pro Stufe. Fraktionen sind die Organisationen aus [ORGANISATIONEN.md](ORGANISATIONEN.md). Er ändert weder Kampfregel noch AP noch Trefferchancen.

## 1. Grundidee

Die Crew wird nicht über Geld definiert, sondern über Ruf, Spuren und Beziehungen. Jeder Einsatz verändert, wer die Crew ist, wem sie etwas schuldet, wen sie verärgert hat und wer verletzt wurde. Geld bleibt, wenn überhaupt, ein Nebenaspekt.

| Vorbild | übernommene Idee | Sweepers-Variante |
|---|---|---|
| Mordheim | Veteranen, Verletzungstabelle | Narben mit Nachspiel-Wurf |
| Necromunda | Hausfehden, Gangtraditionen | Fraktionsbeziehungen, Crew-Kodex |
| Shadowrun | Karma, Bekanntheit, Aufmerksamkeit | Entwicklungspunkte, Ruf und Heat |
| Cyberpunk 2077 | Ruf in Vierteln, Kontakte | Dossiers und Fraktionsstufen |

## 2. Kampagnen-Ressourcen

- **Crew-Ruf (drei Achsen).** Diskretion, Kühnheit, Verlässlichkeit, je −3 bis +3. Jeder Einsatz verschiebt sie je nach Vorgehen. Schwellen schalten Auftragstypen frei: hohe Kühnheit offene Angriffsaufträge, hohe Diskretion Infiltration und Datendiebstahl. Die Crew bekommt eine Identität ohne zusätzlichen Charakterbogen.
- **Heat (Aufmerksamkeit).** Steigt durch laute Einsätze, offene Gewalt und Fehlschläge. Hoher Heat erschwert Missionen, etwa durch zusätzliche Patrouillen oder frühere Alarme. Heat sinkt in Ruhephasen oder durch Opfer, etwa einen abgebrochenen Auftrag oder einen preisgegebenen Kontakt. Das erzeugt Spannung zwischen Gewinn und Risiko ohne Geld.
- **Fraktionsbeziehungen.** Pro Organisation −3 (Feind) bis +3 (Bindung). Ab +2 öffnen sich Safehouse-Räume oder Informationen, ab +3 besondere Aufträge. Rivalitäten sind verknüpft: Wer eine Fraktion stärkt, verschlechtert oft die Beziehung zu ihrem Gegenspieler.
- **Bindungen.** Jeder Runner hat bis zu zwei Bindungen zu Mitrunnern, Kontakten oder Orten, mit Art und Stärke („Schuld“, „Vertrauen“, „Rivalität“). Sie entstehen, wenn Runner gemeinsam Krisen überstehen. Im Nachspiel kann eine Bindung eingesetzt werden, um einen gefallenen oder gefangenen Runner zu retten; das kostet Bindungsstärke und oft Heat.
- **Narben.** Verletzungen und Traumata als dauerhafte Narbenkarten mit kleinen Einschränkungen oder neuen Möglichkeiten. Sie werden nicht gekauft, sondern durch Ruhezeit, Bindungen oder Behandlung über eine Fraktion gemildert.
- **Dossiers.** Pro Stadtteil Fortschritt 0 bis 5. Mehr Wissen zeigt alternative Einstiegspunkte und Gegnerinformationen. Aufklärung ist selbst Belohnung.
- **Crew-Kodex.** Beim Aufbau wählt die Crew einen Kodex mit zwei Traditionen, etwa „Schattenzunft“, „Straßenclan“, „Konzernflüchtlinge“. Jede Tradition bietet eine taktische Möglichkeit mit Kosten („Fortschritt schafft Optionen“). Kodizes sind festgelegt und versioniert, damit Generatoren und Bots gültige Kombinationen erhalten.
- **Vermächtnis.** Stirbt ein Runner, bleibt eine Gedenkkarte. Sie gibt der Crew einmal pro Kampagne einen Effekt für den Nachfolger oder einen Ruf-Bonus auf eine Achse.

## 3. Kampagnenschleife

**A · Ruhephase (Safehouse).** Zwei Aktionen pro Ruhephase, zum Beispiel:

- Recherche: Dossier +1
- Heilung: eine Narbe leichter machen
- Kontakt pflegen: Fraktionswert +1, Heat −1
- Bindung vertiefen: Bindungsstärke +1
- Untertauchen: Heat −2, der Runner fehlt im nächsten Einsatz

**B · Einsatz.** Nach den bestehenden Kernregeln. Der Server entscheidet verbindlich. Kampagnenwerte werden erst nach dem Einsatz verbucht.

**C · Nachspiel.**

1. Ergebnis (Erfolg, Teilerfolg, Fehlschlag) bestimmt Ruf-Verschiebung und Heat.
2. XP werden genau einmal vergeben.
3. Jeder verletzte Runner wirft die Nachspiel-Tabelle.
4. Fraktionswerte und Dossiers werden aktualisiert.
5. Bindungen können eingesetzt werden oder entstehen.

### Nachspiel-Tabelle (W6 pro verletztem Runner, Startannahme)

| Wurf | Ergebnis |
|---|---|
| 1–2 | Leichte Narbe (kleine dauerhafte Einschränkung) |
| 3–4 | Erholung: fällt in der nächsten Ruhephase aus |
| 5 | Mentale Narbe (z. B. Paranoia, erschwert eine Aktion) |
| 6 | Verschollen: Eine Bindung kann retten, sonst Gefangenschaft, die eine Fraktion gegen Gegenleistung löst |

Tod ist kein reiner Nachspiel-Wurf. Er tritt nur ein, wenn ein Runner in der Mission fällt und keine Bindung eingreift, oder wenn ein Fehlschlag mit hohem Heat zusammenkommt.

Ein Würfelwurf nach der Mission wäre Kampagnenzustand und müsste wie jeder Zufall über gespeicherten, seedbaren RNG laufen, getrennt von Kampf- und Bot-RNG; das ist bei einer Umsetzung zu entscheiden.

## 4. Stufen und Entwicklung

Es bleibt das dokumentierte Modell: ein gemeinsames Budget für Attribut- und Fertigkeitszweige sowie gelernte Techniken. Die Kampagne ergänzt:

- Ruf-Schwellen schalten bestimmte Techniken oder Kodex-Traditionen frei.
- Narben können Lernvoraussetzung oder Gegenposition sein, etwa eine mentale Narbe, die eine Mentaltechnik sperrt.
- Der Crew-Kodex ist eine feste Wahl, kein Kaufobjekt.

## 5. Test- und Balancekriterien

- **Kampagnenlänge:** 8–12 Missionen für einen vollständigen Bogen mit vier Runnern.
- **Narbenrate:** im Schnitt höchstens eine Narbe pro Runner und zwei Missionen.
- **Fraktions-Erreichbarkeit:** jede Stufe mit einem typischen Spielstil in drei bis fünf Missionen, nicht durch einen einzelnen Auftrag.
- **Heat-Kurve:** Eine Crew, die jede Ruhephase nutzt, bleibt meist unter der kritischen Schwelle; eine durchgehend laute Crew spürt die Folgen.
- **Keine Dominanz:** Kein Kodex-Pfad hat in Tests eine deutlich höhere Erfolgsrate.
- **Vermächtnis:** Ein Tod verlängert die Kampagne nicht unfair; der Nachfolger startet mit fairem Fortschritt.

## 6. Offene Fragen

- Wie viele Ruf-Achsen und welche Schwellen (Vorschlag: drei Achsen, Schwellen bei ±2 und ±3)?
- Wirkt Heat kontinuierlich oder in Stufen?
- Konkrete Liste der Kodex-Traditionen und ihrer Kosten.
- Entstehen Bindungen automatisch oder nur durch Ereignisse?

## 7. Empfehlung für den Einstieg

Für einen ersten Test in M6 genügen vier Mechaniken: Crew-Ruf mit drei Achsen, Heat, Narben mit der W6-Tabelle und zwei Bindungen pro Runner. Fraktionen, Dossiers und Kodizes folgen, sobald der Kern im Test trägt. Fraktionen entsprechen dem Ausbaupaket AP-28 bis AP-31 und gehören nicht zum Abschluss von M6.
