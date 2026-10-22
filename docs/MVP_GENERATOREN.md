# NEON CONTRACT – MVP je Generator

Stand: 21.10.2026 · Diese Verträge bleiben Mindestziele. Ein separat beauftragter Gebäude-Prototyp ist vorhanden; Umfang und tatsächliche Nachweise stehen in [GEBAEUDEGENERATOR.md](GEBAEUDEGENERATOR.md). Er erweitert v0.1 nicht und schließt M7 nicht ab.

Der Folgeauftrag zur Bedarfsplanung ([0011](decisions/0011-bedarfsbasiertes-raumprogramm.md)) erweitert das lokale Werkzeug um Kapazitäten und variable Raumzahlen bis zum Suchbudget von 32 Instanzen. Die folgenden Mindestverträge werden dadurch weder zu neuen v0.1-Pflichten noch pauschal als erfüllt markiert.

Version 4 ergänzt auf ausdrücklichen Folgeauftrag Konzernidentitäten, Büroorganisation und kosmetische Oberflächen; siehe [0012](decisions/0012-konzernidentitaet-und-bueroorganisation.md). Auch dieser Ausbau schließt keine menschliche M7-Abnahme ab und erweitert keine Kampfregel.

Der [Generatorplan](GENERATOREN.md) erklärt Schnittstellen und Pipeline. Dieses Dokument legt das kleinste benötigte Ergebnis je Stufe fest. [MVP.md](MVP.md) begrenzt den ersten spielbaren Umfang.

**Grundsatz:** v0.1 braucht eine gültige handgebaute Mission. Inhalte aus festen Vorlagen zu instanziieren ist ausreichend. Eine zufällig erzeugte Karte oder ein zufällig ausgerüsteter NPC ist kein notwendiger Bestandteil dieses ersten MVP. Das spätere Verfahren steht in [0008](decisions/0008-hierarchischer-missionsgenerator.md): zuerst das taktische Problem, danach die Umgebung.

Für die späteren Generator-Minima gelten stets: expliziter Seed/Version, stabile IDs, begrenzte Versuche, überprüfbare Ausgabe und gespeichertes Missionspaket. Ein Generator schreibt nicht direkt in eine laufende Mission.

## GEN-00 · Seedverwaltung und Pipeline

**v0.1 nötig:** Seed und RNG-Zustand für den Einsatz, Content-/Regelversionen sowie reproduzierbare Replay-Metadaten. Noch keine allgemeine Generatorsteuerung.

**Minimum M7:** benannte Unter-Seeds für Geometrie, Gegner und kosmetische Namen; feste Stufenreihenfolge; höchstens zehn dokumentierte Versuche; Ergebnismanifest und expliziter Fehler/Rückfall.

**Ergebnis/Nachweis:** gleiche Konfiguration erzeugt denselben Hash beziehungsweise denselben Fehler; Änderung eines Namensgenerators verändert keine Waffen oder Kampfwerte.

**Später:** verteilte Generierungsjobs, komplexe Reparaturstrategien und große vorproduzierte Inhaltsbibliotheken.

**Zuordnung:** MOD-01/02/15; AP-02/32.

## GEN-01 · Missions- und Auftragsgenerator

**v0.1 nötig:** feste Datenraubdefinition mit Hauptziel, Extraktion, zwei Terminalinteraktionen und eindeutigen Endbedingungen.

**Minimum bei Einführung:** aus mindestens zwei geprüften Konfigurationen des vorhandenen Missionstyps wählen, etwa andere Raumzuordnung oder optionale bereits implementierte Ziele. Ausgabe enthält Zielgraph, benötigte Raumrollen und erlaubte Komplikation.

**Ergebnis/Nachweis:** erzeugte Mission enthält keine unbekannte Mechanik, zyklischen Pflichtziele oder notwendige Spezialklasse; sie kann mit dem bestehenden Regelkern abgeschlossen werden.

**Später:** weitere Missionstypen, solange ihre Laufzeitregeln fehlen. Mehrere Missionen setzen keinen beliebigen Zufallsgenerator für Regeln voraus.

**Zuordnung:** MOD-06/15; feste Definition AP-09, variable Missionskombination als eigener Auftrag nach dem ersten Generator-Slice.

## GEN-02 · Levelgenerator

**v0.1 nötig:** eine handgebaute 20 × 20 Karte im normalisierten Format, gültige Ziele/Spawns und geometrische Prüfungen. Kein prozeduraler Aufbau.

**Minimum M7:** wenige geprüfte Büro-/Korridorvorlagen zu Varianten derselben Vier-Runner-Mission kombinieren; Haupt- und Alternativweg, erreichbarer Datenraum und Extraktion. Alle Teilmodule haben eine einfache Ausführung:

- **GEN-02A Raumprogramm:** feste Liste Einstieg/Büro/Serverraum/Rückweg mit bekannten Mindestmaßen.
- **GEN-02B Topologie:** verbundener Raumgraph mit einem Hauptweg und einem tatsächlich anderen Zugang.
- **GEN-02C Rastereinbettung:** Räume und Korridore innerhalb 20 × 20 platzieren; Überschneidung verwirft den Versuch.
- **GEN-02D Wände/Durchgänge:** Wände, freie Zellen und vorhandene Türtypen mit konsistenter logischer Geometrie.
- **GEN-02E Zonen:** vier unterschiedliche Crewfelder sowie freie Ziel-/Extraktions- und Interaktionsanker reservieren.
- **GEN-02F Deckung:** wenige gerichtete Deckungsobjekte einsetzen, ohne reservierte Zugänge oder Pflichtwege zu sperren.
- **GEN-02G Darstellung:** vorhandene GLB-Module für Boden, Wand, Tür, Deckung und Treppe zuweisen; keine neuen Assets generieren.
- **GEN-02H Bericht:** Erreichbarkeit, Alternativroute, Kollisionen und Weglängen ausgeben.

**Ergebnis/Nachweis:** 100 feste Seeds für vier Runner, akzeptierte Pakete bestehen alle harten Prüfungen; Rückfallrate separat ausweisen. Repräsentative Karten im normalen Client spielen. Erreichbarkeit allein gilt nicht als Nachweis für Fairness.

**Später:** beliebige Gebäudetypen, prozedural erzeugte Höhenstufen, zerstörbare Architektur oder gleichzeitige automatische Optimierung für alle Crewgrößen. Ganzzahlige Zellhöhen sind im Kartenformat bereits erlaubt.

**Zuordnung:** MOD-03/15; AP-04 früh, AP-33/34 bei Einführung.

## GEN-03 · Interaktionen und Sicherheitsnetz

**v0.1 nötig:** eine Abkürzungstür, ein Datenterminal und markierte Extraktion mit festen Objekt-IDs.

**Minimum M7:** vorhandene Objektvorlagen an gültigen Ankern platzieren, passende Interaktionsfelder reservieren und Tür-/Terminalabhängigkeiten auf Erreichbarkeit prüfen.

**Ergebnis/Nachweis:** benötigtes Terminal liegt nicht hinter seiner eigenen einzigen Zugangssperre; alle Objekt-IDs existieren, alle Pflichtaktionen sind implementiert.

**Später:** Kameranetze, Stromkreise, Schlüsselkartenketten und mehrstufige Hackingrätsel.

**Zuordnung:** MOD-06/15; AP-09/34.

## GEN-04 · Encounter und Spawns

**v0.1 nötig:** feste sechs Gegner mit geprüften Startplätzen und Patrolldaten; keine Spawnüberschneidung.

**Minimum bei prozeduraler Einführung:** aus vorhandenen Wachen/Flankern innerhalb eines konfigurierten Budgets Gruppen bilden und auf gültige Positionen verteilen. Alle Waffen-/Rollenwerte bleiben zunächst unverändert.

**Ergebnis/Nachweis:** Startfelder frei und außerhalb des Crew-Einstiegs; Routen begehbar; Budget eingehalten. Gleicher Seed liefert gleiche Gruppen. Alarmwellen nur mit bereits implementierter Alarmmechanik.

**Später:** adaptive Schwierigkeit während des Einsatzes oder unbegrenzte Gegnerwellen.

**Zuordnung:** MOD-11/15; feste Aufstellung AP-04/10, Varianten AP-21/35.

## GEN-05 · NPC-Generator

**v0.1 nötig:** zwei feste Profile, Wache und Flanker, als eigenständige Einheiten mit eindeutigen IDs instanziieren. Werte, Ausrüstung und Policy sind geprüft.

**Minimum bei variabler Einführung:** begrenzte Auswahl vorhandener kompatibler Profile; kosmetische Identität aus einer eigenen Zufallsquelle. Die Teilmodule bleiben klein:

- **GEN-05A Archetyp:** Auswahl aus implementierten Rollen, zunächst Wache/Flanker und später Suppressor.
- **GEN-05B Werte:** feste getestete Zahlen pro Profil; freie Attributwürfe sind nicht erforderlich.
- **GEN-05C Fähigkeiten:** vorhandene Profilfähigkeiten referenzieren; leer erlaubt, wenn der Archetyp keine besondere Fähigkeit benötigt.
- **GEN-05D Ausrüstung:** vollständigen kompatiblen Waffen-/Magazinloadout aus GEN-06 übernehmen.
- **GEN-05E Verhalten:** eine vorhandene Policy-ID und gültige Parameter zuweisen; die KI-Ausführung bleibt MOD-11.
- **GEN-05F Identität:** Name/Rufzeichen aus kurzer kuratierter Liste, unabhängig vom Kampf-RNG.
- **GEN-05G Darstellung:** eine vorhandene passende GLB-Figurenreferenz, gegebenenfalls einfacher Platzhalter. Portrait bleibt getrennt.
- **GEN-05H Konsistenz:** positive Startressourcen, gültige Referenzen und zur Waffe passende Munition.

**Ergebnis/Nachweis:** gültige NPCDefinition wird instanziiert und durch den bestehenden Bot gesteuert; Änderung des Namens hat keinen Einfluss auf Werte/Policy. Ungültige Ausrüstung wird vor Missionstart abgewiesen.

Falls spätere Profile die [gestufte Charakterentwicklung](CHARAKTERENTWICKLUNG.md) nutzen, prüft GEN-05H zusätzlich dauerhafte Lernschwellen, eindeutige Technik-IDs und benötigte Ausrüstungsquellen. Der Generator erfindet dafür keine eigenen Kompetenzregeln.

**Später:** freie Persönlichkeiten, komplette Skillbuilds, lernende Gegner oder prozedurale Dialogpartner.

**Zuordnung:** MOD-01/11/15; AP-04/10/20/35.

## GEN-06 · Gegenstände und Loadouts

**v0.1 nötig:** Rifle/Sidearm-Presets mit den definierten Magazinen, Reserven und Medkit; passende feste Gegnerausrüstung.

**Minimum bei variabler Einführung:** Auswahl aus einem kleinen Katalog gültiger Basistypen; Slots, Magazine, erlaubte Kombination und Budget prüfen. Zufallsaffixe sind nicht nötig.

**Ergebnis/Nachweis:** jede akzeptierte Zusammenstellung kann vom Regelkern verwendet werden; falsche Munition oder fehlender Pflichtslot führt zu einem erklärten Fehler.

**Später:** zufällige Effektnamen, Qualitätsskalen, Craftingrezepte oder hunderte Itemvarianten.

**Zuordnung:** MOD-01/13/15; AP-04/26/35.

## GEN-07 · Beute und Belohnungen

**v0.1 nötig:** keine XP-/Beutegenerierung; ausschließlich MissionResult anzeigen.

**Minimum M6:** feste versionierte Belohnung aus dem MissionResult berechnen und als RewardProposal ausgeben; MOD-14 bucht sie einmal. Zunächst genügt ein XP-Betrag und gegebenenfalls eine klar definierte Gegenstandsbelohnung.

**Ergebnis/Nachweis:** dieselbe Resultat-ID erzeugt denselben Anspruch; erneuter Aufruf oder Browserneuladen würfelt nicht neu und zahlt nicht erneut aus.

**Später:** seltene zufällige Beute, umfangreiche Drop-Tabellen und automatische Wirtschaftskalibrierung.

**Zuordnung:** MOD-13/14/15; AP-23/27; variable Beute gesondert.

## GEN-08 · Stadt, Fraktionen und Auftragsangebote

**v0.1 nötig:** nichts; die Mission wird direkt in der Lobby vorbereitet.

**Minimum bei Einführung:** kleiner gespeicherter Bezirksgraph mit vorhandenen Fraktionen und Aufträgen. Zuerst feste Ausgangsdaten; spätere Auswahl beschränkt sich auf zulässige Angebote.

**Ergebnis/Nachweis:** dieselbe gespeicherte Kampagne zeigt beim erneuten Öffnen dieselben Bezirke und Angebote. Aktualisierung passiert an einem definierten Kampagnenereignis, nicht beim Neuladen des Screens.

**Später:** vollständige Stadtentwicklung, tägliche Zufallsangebote oder dynamische Fraktionssimulation.

**Zuordnung:** MOD-14/15; handgebaute Basis AP-28/31, Generierung als zusätzlicher Auftrag.

## GEN-09 · Namen und Flavourtext

**v0.1 nötig:** kurze feste Namen und Texte für Mission, Waffen und Gegner.

**Minimum bei Einführung:** kuratierte Namenslisten und Textvorlagen mit erlaubten Feldern; Fakten aus bereits bestätigten Daten übernehmen.

**Ergebnis/Nachweis:** Text passt zu Ziel/Belohnung und bleibt innerhalb der UI-Längen; anderer Namens-Seed verändert keine Regelwerte.

**Später:** Sprachmodellaufrufe und umfangreiche Narrative. Optional vorab erzeugter Text wird geprüft und als feste Datei versioniert.

**Zuordnung:** MOD-01/15; feste Inhalte AP-04/13, variable Texte separat.

## GEN-10 · Assets und visuelle Varianten

**Separater Umsetzungsauftrag:** Die [Figuren-Werkstatt](CHARACTER_CREATOR.md) liefert einen kosmetischen Character-Creator-Piloten; [0016](decisions/0016-typescript-character-creator.md) ergänzt hierfür die TypeScript-Produktionsquelle. Das ersetzt weder die gesamte GLB-Platzhalterabdeckung noch menschliche Art- und Spielabnahme und erweitert v0.1 nicht.

**Separater Planungsvorschlag:** [ASSET_PIPELINE.md](ASSET_PIPELINE.md) und [0015](decisions/0015-agentengesteuerte-asset-pipeline.md) konkretisieren eine mögliche Offline-Produktion ohne zusätzliche Abos. Der Auftrag umfasst Recherche und Planung, keinen neuen v0.1-Pflichtumfang und keine bereits geprüften Assets.

**v0.1 nötig:** lesbare GLB-Platzhalter im Maßstab 1,0 für Boden, Wand, Deckung, Treppe, Crew, Gegner, Tür, Terminal und Extraktion sowie ein Manifest mit Quellen-/Nutzungsangaben. Figuren sind geriggt.

**Minimum bei Einführung der Asset-Pipeline:** existierende GLB-Dateien auf Maßstab 1,0, Referenzen und die Bewegungen `idle`, `walk`, `crouch`, `shoot`, `reload`, `hit` und `death` prüfen; vorbereitete Varianten über stabile IDs auswählen. Quelle ist Blend, Stil ist stilisiertes Cyberpunk.

**Ergebnis/Nachweis:** jeder erforderliche Objekttyp ist erkennbar; fehlendes optionales Bild nutzt einen Platzhalter. Keine visuelle Variante verändert Kollision oder Sicht.

**Später:** KI-Portraitproduktion, große Animationssets und automatische Stilvarianten. Fertige Bilddateien speichern; gleiche Bildgenerierung per Prompt nicht als garantiert reproduzierbar annehmen.

**Zuordnung:** MOD-01/10/15; Platzhalter AP-04/14, Assetproduktion separat.

## GEN-11 · Validatoren und Qualitätsbericht

**v0.1 nötig:** Datenformate/Referenzen, belegte Spawns, erreichbare Pflichtziele, gültige Extraktion und zur Regelversion passende Mechaniken prüfen.

**Minimum M7:** zusätzlich Abhängigkeiten der Interaktionen, Raum-/Wegregeln, Budget, verwendeten Rückfall und taktische Kennzahlen berichten. Harte Fehler verhindern die Annahme.

**Ergebnis/Nachweis:** absichtlich kaputte Karte/NPC-Definition wird erklärt abgewiesen; akzeptiertes Paket bleibt durch die Prüfung unverändert. Warnungen zur Qualität sind von nachweislich ungültigen Daten getrennt.

**Später:** automatische Reparatursuche und Vorhersagen des Spielspaßes.

**Zuordnung:** MOD-01/12/15; AP-04/32/34/36.

## GEN-12 · Testszenarien und Stresstests

**v0.1 nötig:** feste kleine Regel-/Netzwerkszenarien und festgelegte Seedliste. Eine allgemeine Testfallgenerierung ist nicht nötig.

**Minimum bei Einführung:** begrenzte Variationen von Positionen, Ressourcen, konkurrierenden Befehlen und Verbindungsabbrüchen; gespeicherter Seed/Eingabestrom macht Fehler reproduzierbar.

**Ergebnis/Nachweis:** ein entdeckter Fehler lässt sich als kleines dauerhaftes Regressionsbeispiel festhalten; absichtlich ungültige Fixtures gelangen nicht in den normalen Contentkatalog.

**Später:** große automatisch gesteuerte Suchläufe und selbstständige Änderung des Balancings.

**Zuordnung:** MOD-12; feste Tests AP-02 bis AP-16 begleitend, generierte Varianten als eigener Auftrag.

## Abnahme des ersten Generator-Slice

AP-32 bis AP-36 müssen eine vorhandene Mission variieren, ohne neue Spielregeln zu verlangen. Ein exportiertes akzeptiertes Paket wird über denselben Loader wie die handgebaute Referenz geladen und bleibt für alle Clients, Reconnects und Replays identisch.

Erfolgsquote, Rückfallrate und Fehlerarten werden getrennt angegeben. Menschliche Stichproben bleiben nötig, selbst wenn jede Karte geometrisch erreichbar ist.
