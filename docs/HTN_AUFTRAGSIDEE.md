# NEON CONTRACT – HTN-Auftragslogik

24.10.2026 · **Idee, nicht umgesetzt.** Keine Freigabe, keine Spielregel, keine Änderung an Simulation, Server, Katalog oder Missionspipeline.

Die [Organisationslandschaft](ORGANISATIONEN.md) und der [Katalog](ORGANISATIONSKATALOG.md) bleiben die Inhaltsquelle. Diese Datei formuliert die Zerlegung aus, die dort als Domänenskizze steht. Sie ersetzt die Skizze nicht und fügt keine Organisation hinzu. Einordnung: [0045](decisions/0045-htn-auftragsidee.md).

## 1. Einordnung

Sweepers ist ein kooperatives Cyberpunk-Spiel. Runner nehmen Aufträge an. Die Spielfläche einer Mission ist abgeschlossen. Eine offene Stadt ist nicht das Ziel. Die Stadtkarte aus [0041](decisions/0041-vektorkarte-gebaeude-und-strassen.md) bleibt eine Zeichenfläche ohne Deckung, ohne Sichtlinie und ohne Auftragswahl.

KASANE, CONCORD, PARALLAX und VERDANT bleiben verworfen, [0019](decisions/0019-bisherige-konzernentwuerfe-verworfen.md). Neue Namen, Tochterfirmen oder Aliase dieser Entwürfe kommen hier nicht vor.

Die strategische Planung liefert einen Anlass. Die Missionspipeline aus [0008](decisions/0008-hierarchischer-missionsgenerator.md) erzeugt daraus zuerst das taktische Problem und danach die Umgebung. Diese Idee endet vor der Pipeline. Sie erzeugt Auftragsziele und Methoden. Deckung, Sichtlinie, Dekoration und Fassade entstehen hier nicht und behalten keine Kampfwirkung.

`packages/sim` enthält keinen Planner und keinen HTN-Typen. Die taktischen Befehle dort sind `move`, `interact`, `extract`, `shoot`, `reload`, `aim`, `heal`, `overwatch` und `ready`. Diese Idee hängt keinen neuen Befehl daran und ruft die Schussauflösung nicht auf. [0005](decisions/0005-kampf-rng-und-schussaufloesung.md) bleibt die geltende Schussregel. [0043](decisions/0043-eine-kampfprobe-am-regelkern.md) ist eine Ableitung am Regelkern und wird hier nicht übernommen. Würfel, Probenwerte und Trefferformeln bleiben unberührt.

Die Planungszeit liegt vor der taktischen Runde. Das Ergebnis der Zerlegung ist ein Auftrag oder eine begründete Absage. Es ist kein Zug, keine Aktionspunkte-Ausgabe und keine gleichzeitige Planung mehrerer Figuren in der Runde.

## 2. Algorithmus

Grundlage ist das geordnete Aufgabennetz, das [ORGANISATIONEN.md](ORGANISATIONEN.md) bereits auf das SHOP-Muster bezieht: abstrakte Aufgaben, Methoden mit Voraussetzungen und geordneten Teilaufgaben, primitive Aufgaben am Ende. Diese Idee ergänzt die deterministische Auswahl, die Grenze der Suche und die Kante zu dem, was das Spiel schon kann.

### 2.1 Zustände

Voraussetzungen und Effekte sind benannte Zustände. Ein Zustand gilt oder er gilt nicht. Freier Text ist kein Effekt. Profilfelder des Katalogs sind Fähigkeiten und Interessen. Sie setzen von sich aus keinen Weltzustand.

Weltzustände dieser Idee:

| Zustand | Argumente | Lesart |
| --- | --- | --- |
| `kennt` | Akteur, Gegenstand | Der Akteur verfügt über eine Kopie oder über gesichertes Wissen. |
| `kontrolliert-zugang` | Akteur, Ressource | Der Akteur kontrolliert einen Zugang. Die Machtbasis im Profil genügt dafür nicht. |
| `nutzungsrecht` | Akteur, Ressource | Ein benanntes Nutzungsrecht liegt vor. |
| `abhaengigkeit` | A, B, Ressource | A benötigt die Ressource für ein aktives Ziel, und B kontrolliert einen geeigneten Zugang. Das ist die Definition aus der Organisationslandschaft. |
| `beleg-kopie` | Besitzer, Gegenstand | Eine Kopie liegt vor. Der bisherige Besitzer behält das Original. |
| `angebot-offen` | Von, An, Gegenstand | Ein Angebot ist ausgesprochen und noch ohne Antwort. |
| `antwort` | Angebot, Wert | Wert ist `angenommen` oder `abgelehnt`. Der Wert kommt von außen. |
| `auftrag-offen` | Auftrag, Schritte | Ein Runner-Auftrag ist angeboten. Die Schritte sind die geordneten Primitive. |
| `mission-bestaetigt` | Auftrag, Ergebnis | Ein bestätigtes Missionsergebnis liegt vor. Die Zerlegung erzeugt es nicht. |
| `neutraler-ort` | Ort, Parteien | Ein Ort, den keine der genannten Parteien kontrolliert. |
| `archiv-haelt` | Akteur, Gegenstand | Ein Archiv dieses Akteurs hält den Gegenstand. |
| `verhandlungsfaehig` | Akteur | Der Akteur kann ein Angebot beantworten. Das steht in keinem Profil. |
| `erreichbar` | Akteur, Voraussetzung | Technologie, Personal oder Finanzierung ist für diesen Akteur erreichbar. Mengen legt diese Idee nicht fest. |

Planmarken sind keine Weltzustände. Sie leben nur in der Suchkopie: `schritt-vorgesehen`, `offen`, `wartet` und `ziel-wartet`. Eine verworfene Suchkopie nimmt ihre Marken mit.

Die Zerlegung würfelt nicht. Sie liest keine Uhr und zieht keine Zufallszahl. Gleiche Bibliothek, gleicher Ausgangszustand und dieselbe Folge äußerer Antworten ergeben dieselbe Spur. Wenn eine spätere Aufgabe doch eine Wahl auslost, braucht sie einen gespeicherten, seedbaren Zufallsstrom, getrennt vom Kampf-RNG und vom Bot-RNG, dazu eine stabile Sortierung. Diese Idee enthält keinen solchen Strom.

### 2.2 Zielauswahl vor der Zerlegung

Die Zielauswahl bleibt ein eigener Schritt vor dem Netz. Die Zerlegung wählt das Organisationsziel nicht selbst. Ein Kandidat entsteht nur aus einem schon vorliegenden Zustand, im Ausschnitt der Akteure, den ein späterer Aufruf übergibt. Diese Idee durchsucht die 70 Profile nicht von sich aus.

Für einen übergebenen Akteur gilt diese Reihenfolge:

1. Liegt `abhaengigkeit` für ihn vor, ist die Wurzel `aufgabe.abhaengigkeit-verringern`.
2. Sonst, wenn seine Katalogabhängigkeiten Belege oder Registerzugriff nennen und ein Anspruch gegen einen benannten anderen Akteur vorliegt, ist die Wurzel `aufgabe.anspruch-absichern`.
3. Sonst, wenn die Ressource Information ist und `kennt` fehlt, ist die Wurzel `aufgabe.information-beschaffen`.

Mehrere Kandidaten desselben Akteurs behalten diese Klassenreihenfolge. Mehrere Akteure werden nach Akteur-ID sortiert, danach nach Aufgaben-ID. Interessen und bevorzugte Mittel erzeugen keinen Kandidaten. Sie stehen an den Methoden als Vermerk. Die Versuchsordnung bleibt die Priorität, danach die stabile Methoden-ID.

Die übrigen Zielklassen der Organisationslandschaft, Marktposition, Verpflichtung, Kapazität, Konkurrenz und Zusammenhalt, behalten dort ihre Namen. Diese Bibliothek gibt ihnen keine Methoden.

### 2.3 Zerlegung

Eine abstrakte Aufgabe hat Methoden. Eine Methode hat eine Priorität, eine stabile ID, Voraussetzungen, einen optionalen Mittelvermerk und eine geordnete Liste von Teilaufgaben. Eine primitive Aufgabe hat Voraussetzungen und endet. Teilaufgaben einer Methode sind total geordnet. Eine partielle Ordnung verwendet diese Idee nicht.

Passende Methoden sind die, deren Voraussetzungen im aktuellen Suchzustand alle gelten. Ihre Ordnung ist die Priorität aufsteigend, bei gleicher Priorität die Methoden-ID in aufsteigender Unicode-Reihenfolge. Die Reihenfolge im Dokument ist keine zweite Ordnung. Bevorzugte Mittel aus dem Katalog machen eine Methode mit falscher Voraussetzung nicht anwendbar und schieben die Priorität nicht stillschweigend um.

```text
zerlegen(aufgabe, zustand, tiefe, budget, spur):
  ist das Budget aufgebraucht oder die Tiefe überschritten:
    spur ergänzen um aufgabe und den Abbruchgrund
    kein Plan
  ist die aufgabe primitiv:
    fehlt eine Voraussetzung:
      spur ergänzen, kein Plan
    sonst:
      Plan aus dieser einen Primitive
      Suchkopie trägt nur die zugehörige Planmarke
  sonst:
    methoden = passende Methoden, sortiert nach Priorität, dann Methoden-ID
    ist keine Methode passend:
      spur ergänzen um die fehlenden Zustandsnamen, kein Plan
    für jede methode in dieser Ordnung:
      kopie = Kopie des zustands
      teilplan = leer
      methode-gültig = ja
      für jede teilaufgabe in der Methodenreihenfolge:
        ergebnis = zerlegen(teilaufgabe, kopie, tiefe + 1, budget - 1, spur)
        hat ergebnis keinen Plan oder trägt es die Marke offen:
          kopie verwerfen
          spur ergänzen um aufgabe, methoden-ID und den Fehlgrund
          methode-gültig = nein
          diese Methode abbrechen
        teilplan an den Plan anhängen
        kopie = Suchkopie des Ergebnisses
      ist methode-gültig:
        diesen teilplan zurückgeben
    kein Plan
```

Jeder Eintritt in `zerlegen` verbraucht einen Budgetschritt. Tiefe und Budget sind Parameter eines späteren Laufs. Diese Idee legt die beiden Zahlen nicht fest. Ist das Budget aufgebraucht, endet die Suche mit der Spur und ohne Plan. Es wird keine Ressource nachgetragen, damit eine Methode doch passt. Eine Teilaufgabe wie Zugang klären darf in `prim.zugang` enden. Erst die Marke `offen` verwirft den Versuch und holt die nächste Methode derselben Aufgabe. So bleibt der Datenraub über Zugang und Extraktion erreichbar, nachdem die Variante mit Beobachtung in der Spur steht.

Backtracking ist das Verwerfen einer Suchkopie und das Probieren der nächsten Methode. Die Spur nennt Aufgabe, Methoden-ID und die fehlenden oder offenen Zustände in der Reihenfolge der Versuche. Der bestätigte Weltzustand bleibt in der ganzen Suche unverändert. Ein Auftrag ist noch kein Erfolg. `kennt` und `beleg-kopie` entstehen in dieser Idee erst als Lesart eines späteren `mission-bestaetigt`, und auch das nur als benannter Folgezustand, nicht als Schreibzugriff auf den Regelkern.

Ein anbietbarer Crew-Auftrag enthält nur die Primitive `prim.zugang`, `prim.datenraub` und `prim.extraktion`, und er enthält `prim.datenraub`. Er ist ein Auftrag in der vorhandenen Datenraubform. Zugang und Extraktion sind die Checkliste dieses einen Auftrags. Daraus werden keine drei Missionen und kein zweiter Auftragstyp. Ein Plan, der `prim.beobachtung` enthält, bleibt in der Spur und wird nicht an die Crew ausgegeben. Die nächste Methode darf danach noch einen anbietbaren Plan liefern. Ein Plan, der nur `prim.angebot-vorlegen` und `prim.antwort-abwarten` enthält, ist ein Organisationsschritt und keine Mission.

## 3. Primitive Grenze

| ID | Planmarke | Was schon vorliegt | Wo die Primitive endet |
| --- | --- | --- | --- |
| `prim.zugang` | `schritt-vorgesehen` | In der vorhandenen Datenraubmission öffnet `interact` eine Tür. | Der Auftrag nennt den Zugang. Die Primitive ruft `interact` nicht auf und legt keine Zugangsregel an. |
| `prim.datenraub` | `schritt-vorgesehen` | Dieselbe Mission kopiert am Terminal über `interact`. Für Spieleroperationen steht bisher diese Datenraubform. | Der Auftrag nennt den Datenraub. Die Primitive ruft `shoot` nicht auf. |
| `prim.extraktion` | `schritt-vorgesehen` | `extract` kostet im bestehenden Kern 1 AP und kann den Einsatz beenden, sobald die Kopien vorliegen. | Der Auftrag nennt die Extraktion. Eine Belohnung vergibt die Primitive nicht. |
| `prim.beobachtung` | `offen` | Ein Beobachtungsauftrag ist nicht vorhanden. Die gefilterte Bot-Beobachtung ist keine Spielermission. | Die Zerlegung darf hier enden. Eine Sichtlinie entsteht nicht. Als Crew-Auftrag wird der Plan nicht ausgegeben. |
| `prim.angebot-vorlegen` | `angebot-offen` in der Suchkopie | Die Organisationslandschaft nennt das Vorlegen als strategischen Schritt. | Es entsteht kein Vertrag und kein taktischer Zug. |
| `prim.antwort-abwarten` | `wartet` | Antworten sind äußere Entscheidungen. | Die Suche erfindet weder Zusage noch Ablehnung. |

`move`, `aim`, `reload`, `heal` und `overwatch` bleiben taktische Befehle. Sie sind keine Aufgaben dieses Netzes.

## 4. Aufgabenbibliothek

Ressourcenfamilien, Abhängigkeiten und Interessen stammen aus der Organisationslandschaft und aus den Profilfeldern. Die Bibliothek wiederholt die 70 Profile nicht.

### 4.1 Aufgaben

| ID | Art | Erfolg, sobald er später bestätigt wäre |
| --- | --- | --- |
| `aufgabe.abhaengigkeit-verringern` | Wurzel | Die benannte Abhängigkeit ist durch eine Alternative, eine eigene Fähigkeit oder ein Nutzungsrecht abgelöst. Welche der drei Lesarten gilt, entscheidet die Methode, die tatsächlich einen Plan geliefert hat. |
| `aufgabe.information-beschaffen` | Aufgabe | `kennt` für den suchenden Akteur und den Gegenstand. Bis `mission-bestaetigt` trägt der Plan nur `ziel-wartet`. |
| `aufgabe.zugang-klaeren` | Aufgabe | Ein Nutzungsrecht liegt vor, oder der Auftrag sieht `prim.zugang` vor. |
| `aufgabe.anspruch-absichern` | Wurzel | Eine `beleg-kopie` des Gegenstands liegt beim suchenden Akteur. Die Forderung selbst bleibt unverändert. |
| `aufgabe.vereinbarung-erreichen` | Aufgabe | `antwort` mit dem Wert `angenommen`. Die Suche selbst setzt diesen Wert nicht. |
| `aufgabe.kapazitaet-sichern` | Aufgabe | Diese Bibliothek gibt der Aufgabe keine Methode. |

### 4.2 Methoden

| ID | Aufgabe | Priorität | Mittelvermerk, wörtlich aus Profilen | Voraussetzung | Teilaufgaben in dieser Reihenfolge |
| --- | --- | --- | --- | --- | --- |
| `methode.unabhaengige-alternative` | Abhängigkeit verringern | 10 | keiner | Es gibt ein C ungleich B mit `kontrolliert-zugang` auf dieselbe Ressource, und B kontrolliert C nicht. | Zugang klären, Vereinbarung erreichen, `aufgabe.kapazitaet-sichern` |
| `methode.eigene-faehigkeit` | Abhängigkeit verringern | 20 | keiner | `erreichbar` für Technologie, Personal und Finanzierung desselben Akteurs. | Die drei Namen aus der Domänenskizze: Voraussetzungen beschaffen, Kapazität aufbauen, Nutzbarkeit bestätigen. Dafür gibt es hier keine Methoden. |
| `methode.verbessertes-nutzungsrecht` | Abhängigkeit verringern | 30 | Lizenzen; Partnerschaften; Kooperation; Lizenzalternativen | `verhandlungsfaehig` für B. | `aufgabe.vereinbarung-erreichen` |
| `methode.freiwilliger-austausch` | Information beschaffen | 10 | Informationshandel | `angebot-offen` vom Besitzer an den suchenden Akteur über den Gegenstand. | `prim.antwort-abwarten` |
| `methode.datenraub-mit-beobachtung` | Information beschaffen | 20 | Informationshandel | `kennt` fehlt, und ein anderer Akteur hat `kontrolliert-zugang` auf den Gegenstand. | Zugang klären, `prim.beobachtung`, `prim.datenraub`, `prim.extraktion` |
| `methode.datenraub-ueber-zugang` | Information beschaffen | 30 | Informationshandel | Dieselbe Voraussetzung wie bei der Beobachtungsvariante. | Zugang klären, `prim.datenraub`, `prim.extraktion` |
| `methode.zugang-aus-recht` | Zugang klären | 10 | keiner | `nutzungsrecht` des suchenden Akteurs. | keine Teilaufgabe |
| `methode.zugang-offen` | Zugang klären | 20 | keiner | `nutzungsrecht` fehlt. | `prim.zugang` |
| `methode.druckmittel-ueber-archiv` | Anspruch absichern | 10 | keiner | `archiv-haelt` für einen Halter, der nicht die Gegenseite ist. Der suchende Akteur nennt im Katalog Belege oder Registerzugriff. | `aufgabe.information-beschaffen` für denselben Gegenstand |
| `methode.direktes-angebot` | Vereinbarung erreichen | 10 | Partnerschaften; Kooperation | `verhandlungsfaehig` für beide Parteien. | `prim.angebot-vorlegen`, `prim.antwort-abwarten` |
| `methode.treffen-neutraler-ort` | Vereinbarung erreichen | 20 | Kooperation | `neutraler-ort` für beide Parteien. Der Halter des Orts ist keine der beiden Parteien. | `prim.zugang`, `prim.beobachtung`, `prim.angebot-vorlegen`, `prim.antwort-abwarten` |

Ein Mittelvermerk ist die wörtliche Katalogphrase. Er dokumentiert die Nähe zu einem Profil. Er ist kein Sortierschlüssel.

### 4.3 Das Netz in einer Ansicht

```text
abhängigkeit-verringern
  unabhängige Alternative
    Zugang klären → Datenraub-Kante oder vorhandenes Recht
    Vereinbarung erreichen → direktes Angebot oder Treffen
    Kapazität sichern → keine Methode
  eigene Fähigkeit → drei Namen ohne Methoden
  verbessertes Nutzungsrecht
    Vereinbarung erreichen → direktes Angebot oder Treffen

information-beschaffen
  freiwilliger Austausch → auf die Antwort warten
  Datenraub mit Beobachtung → Zugang, Beobachtung, Datenraub, Extraktion
  Datenraub über Zugang → Zugang, Datenraub, Extraktion

anspruch-absichern
  Druckmittel über ein Archiv
    information-beschaffen
```

## 5. Beispiel: Datenraub über Zugang und Extraktion

Katalogpaar, keine neue Lore. `daeyang` hat das wiederkehrende Interesse „Datenzugang erweitern“, die Domäne Daten und Prognosen und das bevorzugte Mittel „Informationshandel“. `ruhrmark` hat die Machtbasis „Register, Verknüpfungswissen, Kundenzugang“ und die Ausgangsbindung „Lieferant und Gegner von Daeyang Intelligence“. Eine Ausgangsbindung ist ein Vorschlag für einen Startgraphen. Sie ist kein Vorfall und setzt `kontrolliert-zugang` nicht.

Leseskizze, nur damit die passende Methode sichtbar wird. Sie wird nicht in den Katalog geschrieben:

- `kontrolliert-zugang(ruhrmark, register-ruhrmark)` liegt in der Skizze vor.
- `kennt(daeyang, register-ruhrmark)` fehlt.
- `angebot-offen` fehlt.
- `nutzungsrecht(daeyang, register-ruhrmark)` fehlt.

Wurzel nach der Zielauswahl: `aufgabe.information-beschaffen(daeyang, register-ruhrmark)`. Die Abhängigkeit ist in der Skizze nicht gesetzt, die Ressource ist Information, `kennt` fehlt.

Spur:

1. `methode.freiwilliger-austausch`, Priorität 10. `angebot-offen` fehlt. Nicht passend.
2. `methode.datenraub-mit-beobachtung`, Priorität 20. Die Voraussetzung passt. Zugang klären probiert zuerst `methode.zugang-aus-recht`. Das Nutzungsrecht fehlt. Danach passt `methode.zugang-offen` und setzt `prim.zugang`. Die nächste Teilaufgabe ist `prim.beobachtung` mit der Marke `offen`. Der Plan wird nicht an die Crew ausgegeben. Die Suchkopie verfällt. Die Spur nennt `prim.beobachtung`.
3. `methode.datenraub-ueber-zugang`, Priorität 30. Dieselbe Zugangsklärung liefert wieder `prim.zugang`, danach `prim.datenraub` und `prim.extraktion`.

Der anbietbare Plan ist ein Auftrag: Zugang, Datenraub, Extraktion, in dieser Reihenfolge, als eine vorhandene Datenraubmission. `ziel-wartet` bleibt stehen, bis ein späteres bestätigtes Ergebnis gelesen wird. Eine Kopie würde `ruhrmark` das Register nicht nehmen. Diese Lesart schreibt der laufende Kern nicht.

## 6. Beispiel: Druckmittel über ein Archiv

Katalogpaar. `kettenbrecher` hat das Interesse „Schuldabhängigkeit verringern“ und die Abhängigkeiten „Belege, Unterstützung, Zugriff auf Register“. Bevorzugte Mittel führt das Profil nicht. `vantier-helvetia` hat die Machtbasis „Kreditlinien, Forderungen, Rücklagen, Risikobewertung“ und das Interesse „Forderungen absichern“.

Wurzel der Leseskizze: `aufgabe.anspruch-absichern(kettenbrecher, forderungen-vantier, vantier-helvetia)`. Die Skizze setzt `archiv-haelt` nicht.

`methode.druckmittel-ueber-archiv` verlangt einen Halter mit `archiv-haelt` für diesen Gegenstand. Im Katalog hat `datenfriedhof` als einziges Profil die Machtbasis „Archive, Wiederherstellungswissen“. Das Archiv gilt den gelöschten Erinnerungen von Kunden von `sogno-ottico`, dem Interesse „Zugang zu eigenen Erinnerungsdaten ermöglichen“. Es ist kein Archiv der Forderungen von `vantier-helvetia`. `offene-schleuse` braucht Belege und veröffentlicht. Ein Archivhalter ist das Profil nicht. `ruhrmark` hat Register und ist an diesem Anspruch nicht gebunden.

Die Methode passt nicht. Die Spur endet bei fehlendem `archiv-haelt` und nennt die geprüften Profile. Die Teilaufgaben stehen trotzdem in der Bibliothek, damit das Netz lesbar ist. Wäre der Archivhalter später ein Weltzustand und kein neues Profil, ginge die einzige Teilaufgabe nach `aufgabe.information-beschaffen` und von dort in die Datenraubkante aus Abschnitt 5. Die Planmarke bliebe eine Kopie. Eine Änderung der Forderung, eine Streichung der Schuld oder eine Erpressung ist keine Aufgabe. Die Organisationslandschaft verlangt für so einen Operator eine eigene spätere Grenze. Diese Idee zieht die Grenze, indem sie den Operator nicht aufnimmt.

## 7. Beispiel: Treffen über einen neutralen Ort

Katalogpaar. `chengyu-neuro` hängt an „Fertigung, Vertrieb, Patentrechte“, will sich laut Ausgangsbindung von `nakamura-lindahl` unabhängig machen, hat das Interesse „Eigenständigkeit ausbauen“ und die Mittel „Lizenzalternativen, Kooperation, Standardöffnung“. `nakamura-lindahl` hat die Machtbasis „Patente, Wartungsschnittstellen, Fertigung“, das Interesse „Standards kontrollieren“ und die Mittel „Lizenzen, Produktbindung, Partnerschaften“.

Leseskizze der Wurzel `aufgabe.abhaengigkeit-verringern(chengyu-neuro, patentrechte, nakamura-lindahl)`:

- Ein Anbieter C außerhalb von `nakamura-lindahl` ist nicht benannt.
- `erreichbar` ist nicht gesetzt.
- `verhandlungsfaehig(nakamura-lindahl)` ist nicht gesetzt.
- `neutraler-ort` ist nicht gesetzt.

Spur der Wurzel, in Prioritätsreihenfolge:

1. `methode.unabhaengige-alternative`. C fehlt.
2. `methode.eigene-faehigkeit`. `erreichbar` fehlt.
3. `methode.verbessertes-nutzungsrecht`. `verhandlungsfaehig` fehlt. Der Mittelvermerk trifft „Kooperation“ und „Lizenzalternativen“ und ändert die Priorität 30 nicht.

Die Vereinbarung wird in dieser Skizze nicht betreten. Ihre Methoden stehen in der Bibliothek:

`methode.direktes-angebot` legt ein Angebot vor und wartet auf die Antwort. Eine Mission entsteht dabei nicht.

`methode.treffen-neutraler-ort` verlangt `neutraler-ort` für `chengyu-neuro` und `nakamura-lindahl`, mit einem Halter, der keine der beiden Parteien ist. Die Teilaufgaben sind Zugang, Beobachtung, Angebot und Warten auf die Antwort. Beobachtung trägt die Marke `offen`. Selbst bei einem später gesetzten Ort gäbe dieser Zweig keinen Crew-Auftrag aus, solange Beobachtung offen ist.

Der Katalog hat keinen Akteur, dessen Profil ein neutraler Ort ist.

- `vantier-helvetia` wirbt mit dem Slogan „Neutral für jeden Kunden“ und bleibt eine Partei mit dem Interesse „Forderungen absichern“.
- `sternenmarkt` hat die Machtbasis „Tauschplatz, Ruf, Vermittlung“ und das Interesse „Handel unabhängig von Passprivilegien ermöglichen“.
- `bosfor-vektor` nennt „Vermittlung“ unter den Mitteln für Frachtrouten.
- `freie-zone-sued` hat „Gebietszugang“ und „Schlichtung“. Das Interesse ist örtliche Selbstverwaltung. Das Kurzprofil sagt, dass Falkenfeld-Kessler die Zone nicht betritt.

Keiner dieser Begriffe erfüllt `neutraler-ort`. Die Idee bindet keinen von ihnen an das Treffen und legt keinen neuen Akteur an.

## 8. Was offen bleibt

- Konkrete Würfel, Proben, Aktionspunkte, Deckung, Sicht und Treffer.
- Belohnungen, Preise, Ruf und Vertragswerte.
- Neue Missionsfamilien. Geisel, Sabotage und Eskorte bleiben außerhalb. Beobachtung bleibt eine offene Primitive.
- Die Zahlen für Suchtiefe, Budget und gleichzeitig aktive Vorhaben.
- Ob eine spätere reine Funktion im Regelkern, neben dem Generator oder an anderer Stelle liegt. Ein zweiter Kampfweg entsteht dabei nicht.
- Händler, Lager und eine Auftragswahl auf der Stadtkarte.
- Drohnen als Einsatzmittel, Alarm, Verstärkung und simultane Planung in der taktischen Runde.
- Personen, Weltjahr, Bezirk und ein festes Ende.
- Ein Archivhalter für die Forderungen von `vantier-helvetia` und ein Akteur für `neutraler-ort`.
- Die Zielklassen ohne Methode in dieser Bibliothek.
- Eine Umsetzung im Server und jede Änderung an `packages/sim`.

## 9. Verweise

[Organisationslandschaft](ORGANISATIONEN.md) · [Katalog](ORGANISATIONSKATALOG.md) · [0019](decisions/0019-bisherige-konzernentwuerfe-verworfen.md) · [0020](decisions/0020-organisationslandschaft-und-lokale-konflikte.md) · [0008](decisions/0008-hierarchischer-missionsgenerator.md) · [0005](decisions/0005-kampf-rng-und-schussaufloesung.md) · [0041](decisions/0041-vektorkarte-gebaeude-und-strassen.md) · [0043](decisions/0043-eine-kampfprobe-am-regelkern.md) · [0045](decisions/0045-htn-auftragsidee.md)
