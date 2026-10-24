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

Grundlage ist das geordnete Aufgabennetz aus [ORGANISATIONEN.md](ORGANISATIONEN.md). Abstrakte Aufgaben haben Methoden. Methoden haben Voraussetzungen und geordnete Teilaufgaben. Primitive Operatoren stehen am Ende. Ein Aufruf liest das Wissen eines Planers. Gleiche Bibliothek, gleicher Planer, gleiches Wissen, gleiche bevorzugte Mittel und derselbe Weltzustand ergeben dieselbe Spur. Die Zerlegung würfelt nicht, liest keine Uhr und benutzt keinen Zufallsstrom.

### 2.1 Zustände

Voraussetzungen und Wirkungen sind Tupel aus diesem Verzeichnis. Ein Tupel gilt in einer Menge oder es gilt nicht. Freier Text ist kein Zustand. Profilfelder sind keine Tupel und setzen von sich aus keines.

| Zustand | Argumente | Lesart |
| --- | --- | --- |
| `kennt` | Akteur, Gegenstand | Der Akteur verfügt über eine Kopie oder über gesichertes Wissen. |
| `kontrolliert-zugang` | Akteur, R | Der Akteur kontrolliert einen Zugang zu R. Die Machtbasis im Profil ist dieses Tupel nicht. |
| `nutzungsrecht` | Akteur, R | Ein benanntes Nutzungsrecht an R liegt vor. |
| `abhaengigkeit` | A, B, R | A benötigt R für ein aktives Ziel, und B kontrolliert einen geeigneten Zugang. Das ist die Definition aus der Organisationslandschaft. |
| `beleg-kopie` | Besitzer, Gegenstand | Eine Kopie liegt vor. Der bisherige Besitzer behält das Original. |
| `angebot-offen` | Von, An, R | Ein Angebot über R ist ausgesprochen. Das Tupel bleibt der Name dieses Angebots und bleibt stehen, wenn `antwort` daneben gilt. |
| `antwort` | Angebot, Wert | Wert ist `angenommen` oder `abgelehnt`. Das Angebot ist das Tupel `angebot-offen` mit denselben drei Argumenten. Die Zerlegung schreibt `antwort` nicht. |
| `anspruch` | Akteur, Gegenseite, Gegenstand | Ein benannter Anspruch des Akteurs gegen die Gegenseite über den Gegenstand. Ein Profilwort setzt dieses Tupel nicht. |
| `unabhaengig` | C, B, R | Der Zugang von C zu R steht nicht unter der Kontrolle von B. Das Tupel wird nicht aus einem fehlenden anderen Tupel gefolgert. |
| `anbieter-gebunden` | A, C, R | Die Zerlegung hat C als Anbieter von A für R gebunden. |
| `voraussetzung-gebunden` | Akteur, R | Technologie, Personal und Finanzierung für R sind gebunden. |
| `zugang-geklaert` | Akteur, R | Der Zugang zu R für den nächsten Schritt steht in der Suchkopie. |
| `beleg-bereit` | Akteur, R | Eine Kopie von R liegt in der Suchkopie am Terminal bereit. |
| `erreichbar` | Akteur, Art | Art ist `technologie`, `personal` oder `finanzierung`. Mengen legt diese Idee nicht fest. |
| `verhandlungsfaehig` | Akteur | Der Akteur kann ein Angebot beantworten. Das steht in keinem Profil. |
| `archiv-haelt` | Akteur, R | Ein Archiv dieses Akteurs hält R. |
| `neutraler-ort` | Ort, Parteien | Ein Ort, den keine der genannten Parteien kontrolliert. Die Parteien stehen als Paar in aufsteigender Akteur-ID. Der Ort ist keine Akteur-ID. |
| `ist-information` | Gegenstand | Der Gegenstand ist Information. Der Aufruf übergibt das Tupel. Die Idee durchsucht dafür keine Profile. |

`angebot-offen` steht in dieser Tabelle und nur dort. Diese Idee führt keine Planmarken.

R ist der Argumentplatz für Ressource und Gegenstand. In `aufgabe.abhaengigkeit-verringern` trägt R die Ressource. In `aufgabe.information-beschaffen` und `aufgabe.anspruch-absichern` trägt R den Gegenstand. `kennt(Akteur, Gegenstand)`, `beleg-kopie(Besitzer, Gegenstand)`, `anspruch(Akteur, Gegenseite, Gegenstand)` und `ist-information(Gegenstand)` verwenden dafür das Argument Gegenstand. Es ist derselbe Platz wie R. Eine Teilaufgabe übergibt ihn unverändert.

Die Suchkopie ist eine Menge von Tupeln. Sie beginnt als Kopie des Wissens des Planers. Operatoren schreiben nur in diese Kopie. Der bestätigte Weltzustand bleibt während der Zerlegung unverändert. Eine Wirkung ist das Hinzufügen oder Entfernen der Tupel, die der Operator nennt. Was schon im Anfangswissen steht, hat kein Operator geschrieben.

Eine negierte Voraussetzung ist nur für eigene Tupel des Planers zulässig: fehlendes `kennt(Planer, …)`, fehlendes `nutzungsrecht(Planer, …)` und fehlendes `beleg-kopie(Planer, …)`. Die Wurzelregeln verwenden nur diese Negationen. Ein Zieltest darf lesen, dass die Wirkung eines Operators `abhaengigkeit(A, B, R)` entfernt hat. Ein Tupel über einen anderen Akteur ist nur als positive Voraussetzung zulässig und gilt nur, wenn es in der Suchkopie steht.

### 2.2 Wissen und Welt

Der Planer plant aus seinem Wissen. Die Zerlegung liest den Weltzustand nicht.

`kontrolliert-zugang` eines anderen Akteurs erfüllt eine Voraussetzung nur, wenn dieses Tupel im Wissen des Planers steht. Dasselbe gilt für `archiv-haelt`, `unabhaengig`, `verhandlungsfaehig` eines anderen Akteurs, `angebot-offen`, `antwort` und `neutraler-ort`. Ein Weltfakt, den das Wissen nicht enthält, macht keine Methode anwendbar.

Ein Aufruf übergibt vier Dinge: die Planer-ID, das Wissen, den Weltzustand und die bevorzugten Mittel dieses einen Planers. Die Mittel sind die Katalogeinträge des Feldes „Bevorzugte Mittel“, getrennt an „; “, als ganze Einträge. Hat das Profil dieses Feld nicht, ist die Liste leer. Die Idee liest dafür nicht die übrigen Profile.

Nach einem gefundenen Plan prüft der Weltabgleich jedes Tupel aus dem Anfangswissen, das eine angewendete Methode oder ein angewendeter Operator als positive Voraussetzung gelesen hat und das einen anderen Akteur als den Planer nennt. Das Tupel muss im Weltzustand stehen. Wirkungen der Suchkopie zählt der Abgleich nicht als Weltfakten. Fehlt ein solches Tupel, verwirft der Abgleich den Plan. Die Spur nennt `welt-weicht-ab`. Eine weitere Methode wird deshalb nicht versucht, weil der Weltzustand die Methodenwahl nicht steuert. Ohne Plan findet kein Weltabgleich statt.

### 2.3 Genau eine Wurzel

Ein Aufruf hat genau einen Planer und genau eine Wurzel. Die Wurzel steht fest, bevor `zerlegen` beginnt.

1. Enthält das Wissen mindestens ein Tupel `abhaengigkeit(Planer, B, R)`, ist die Wurzel `aufgabe.abhaengigkeit-verringern`. Gebunden wird das Tupel mit der aufsteigend ersten Akteur-ID von B und bei gleichem B dem aufsteigend ersten Ressourcennamen.
2. Sonst, enthält das Wissen mindestens ein Tupel `anspruch(Planer, Gegenseite, Gegenstand)` und enthält es `beleg-kopie(Planer, Gegenstand)` nicht, ist die Wurzel `aufgabe.anspruch-absichern`. Gebunden wird das Tupel mit der aufsteigend ersten Akteur-ID der Gegenseite und danach dem aufsteigend ersten Gegenstandsnamen.
3. Sonst, enthält das Wissen ein Tupel `ist-information(Gegenstand)` und enthält es `kennt(Planer, Gegenstand)` nicht, ist die Wurzel `aufgabe.information-beschaffen`. Gebunden wird der aufsteigend erste solche Gegenstandsname.
4. Sonst gibt es keine Wurzel. Die Spur nennt `kein-wurzelziel`. Es gibt keinen Plan und keinen Eintritt in `zerlegen`.

Scheitert die Zerlegung dieser Wurzel, beginnt derselbe Aufruf keine andere Regel. Mehrere passende Tupel derselben Regel werden nicht nacheinander gebunden. Mehrere Planer sind mehrere Aufrufe. Deren Reihenfolge ist die aufsteigende Akteur-ID. Jeder Aufruf hat sein eigenes Budget von 32.

Profilfelder erzeugen keine Wurzel. Interessen und bevorzugte Mittel erzeugen keine Wurzel. Das Abhängigkeitsfeld eines Profils ist nicht der Zustand `anspruch` und nicht der Zustand `abhaengigkeit`.

### 2.4 Ordnung der Methoden

Eine abstrakte Aufgabe hat mindestens eine Methode. Eine Methode hat eine Priorität, eine stabile ID, Voraussetzungen, eine Mittel-Liste und eine total geordnete Liste von Teilaufgaben. Jede Teilaufgabe ist eine Aufgaben-ID oder eine Primitive-ID. Eine leere Teilaufgabenliste gibt es nicht. Eine partielle Ordnung verwendet diese Idee nicht.

Passend ist eine Methode, deren Voraussetzungen in der aktuellen Suchkopie alle gelten. Bevorzugte Mittel machen eine unpassende Methode nicht passend.

Die Prüfungsordnung aller Methoden einer Aufgabe ist:

1. Mittelrang 0 vor Mittelrang 1. Mittelrang 0 gilt, wenn die Mittel-Liste der Methode und die bevorzugten Mittel des Planers mindestens einen ganzen Eintrag gemeinsam haben. Mittelrang 1 gilt, wenn die Liste `keines` ist oder kein ganzer Eintrag gemeinsam ist. „Lizenzen“ und „Lizenzalternativen“ sind verschiedene Einträge. Ein Teilstring zählt nicht.
2. Priorität aufsteigend.
3. Methoden-ID aufsteigend nach Unicode-Codepunkten.

Die Reihenfolge der Methoden im Dokument ist keine Ordnung. Plankosten sind keine Ordnung. Nach diesen drei Schlüsseln bleibt kein Gleichstand.

### 2.5 Suchbudget

Das Suchbudget ist 32. Es gilt für die ganze Zerlegung dieses einen Aufrufs. Es gibt keine zweite Tiefengrenze.

Jeder Eintritt in eine Aufgabe, jeder Eintritt in eine Primitive, jeder Methodenversuch und jedes Zurücksetzen verbraucht einen Schritt derselben Variablen `rest`. Ein rekursiver Aufruf erhält den schon verminderten Stand. Nach der Rückkehr bleibt dieser Stand. Verbrauchte Schritte kommen nicht zurück. Die nächste Methode beginnt bei dem Stand, den die vorige Methode übrig gelassen hat.

Ist `rest` bei einem geforderten Verbrauch 0, läuft dieser Verbrauch nicht. Die Spur nennt `budget-erschoepft`. Das Ergebnis ist kein Plan. Weitere Methoden derselben Aufgabe werden nicht begonnen. Die übergeordnete Aufgabe versucht danach keine weitere Methode.

Ein Methodenversuch, dessen Voraussetzungen fehlen, verbraucht den Versuch und kein zusätzliches Zurücksetzen. Zurücksetzen verbraucht einen Schritt, wenn eine Methode schon eine Teilaufgabe begonnen hatte oder der Zieltest scheitert.

Der längste Plan dieser Bibliothek verbraucht 13 Schritte. In diesem Pfad enthalten die bevorzugten Mittel einen Eintrag aus der Mittel-Liste von `methode.verbessertes-nutzungsrecht`, diese Methode und `methode.unabhaengige-alternative` scheitern an fehlenden Voraussetzungen, und `methode.eigene-faehigkeit` hat erfüllte Voraussetzungen:

1. Eintritt `aufgabe.abhaengigkeit-verringern`
2. Versuch `methode.verbessertes-nutzungsrecht`
3. Versuch `methode.unabhaengige-alternative`
4. Versuch `methode.eigene-faehigkeit`
5. Eintritt `aufgabe.voraussetzungen-beschaffen`
6. Versuch `methode.erreichbares-binden`
7. Eintritt `prim.voraussetzung-binden`
8. Eintritt `aufgabe.kapazitaet-aufbauen`
9. Versuch `methode.eigene-kapazitaet`
10. Eintritt `prim.kapazitaet-reservieren`
11. Eintritt `aufgabe.nutzbarkeit-bestaetigen`
12. Versuch `methode.eigene-nutzung`
13. Eintritt `prim.nutzung-bestaetigen`

Gelten die Voraussetzungen einer früher geordneten Methode, liefert diese den Plan, und die späteren Methoden beginnen nicht. Der Verbrauch ist dann kürzer. Eine Methode mit erfüllten Voraussetzungen scheitert in dieser Bibliothek nicht in einer Teilaufgabe: jede Voraussetzung einer Teilaufgabe ist schon Voraussetzung der Methode oder Wirkung der vorigen Teilaufgabe. Es gibt deshalb keinen Erfolg, in dem eine passende Methode zurückgesetzt wird und danach eine spätere Methode plant. 13 ist der Höchstverbrauch. 32 liegt darüber. Die Zielauswahl und der Weltabgleich verbrauchen das Budget nicht.

### 2.6 Zerlegung und Zieltest

```text
rest beginnt bei 32

verbrauche(rest, spur, grund):
  ist rest gleich 0:
    spur ergänzen um budget-erschoepft und grund
    gesamte Suche beenden, kein Plan
  sonst:
    rest um 1 senken

zerlegen(aufgabe, kopie, rest, spur):
  verbrauche(rest, spur, eintritt der aufgabe)
  ist die aufgabe primitiv:
    fehlt eine Voraussetzung in der kopie:
      spur nennt die Zustandsnamen, an denen die Voraussetzung scheitert
      kein Plan; rest bleibt auf dem Stand nach diesem Eintritt
    sonst:
      kopie um die Wirkung des Operators fortschreiben
      Plan aus dieser einen Primitive, rest weitergeben
  sonst:
    methoden = alle Methoden der Aufgabe in der Ordnung aus 2.4
    für jede methode in dieser Ordnung:
      verbrauche(rest, spur, versuch der methode)
      parameter binden, wie unten
      fehlt eine Voraussetzung:
        spur nennt die Zustandsnamen, an denen die Voraussetzung scheitert
        nächste methode
      zweig = Kopie der kopie
      teilplan = leer
      für jede teilaufgabe in der Methodenreihenfolge:
        ergebnis, zweig, rest = zerlegen(teilaufgabe, zweig, rest, spur)
        hat ergebnis keinen Plan:
          enthält die spur budget-erschoepft:
            kein Plan, keine weitere Methode
          verbrauche(rest, spur, zuruecksetzen der methode)
          spur nennt aufgabe, methoden-ID und den Fehlgrund
          diese Methode abbrechen und die nächste Methode prüfen
        teilplan an den Plan anhängen
      gilt der Zielzustand der aufgabe im zweig:
        teilplan, zweig und rest zurückgeben
      sonst:
        verbrauche(rest, spur, zuruecksetzen der methode)
        spur nennt ziel-nicht-erreicht
        nächste methode
    kein Plan, rest weitergeben
```

Jeder Rückweg gibt den aktuellen Stand von `rest` zurück. Ein Abbruch aus `verbrauche` beendet die gesamte Suche.

Der Zieltest liest die Suchkopie nach den Wirkungen der Teilaufgaben. Er akzeptiert die Methode, wenn der Zielzustand dieser Aufgabe dort gilt. Ziele anderer Akteure und der Wert von `antwort` sind keine Wirkungen. [0020](decisions/0020-organisationslandschaft-und-lokale-konflikte.md) verlangt diesen Zieltest nach den Operatoren. Die übergeordnete Aufgabe prüft ihr eigenes Ziel erneut.

Parameter bindet die Methode beim Versuch an das aufsteigend erste Tupel, das jede Voraussetzung der Methode zugleich erfüllt. Die Ordnung ist die Akteur-ID, danach der Ressourcen- oder Gegenstandsname, danach der Ortsname. Erfüllt kein Tupel die ganze Voraussetzung, ist die Methode unpassend. Scheitert die Zerlegung nach dieser Bindung, wird kein weiteres Tupel gebunden.

Ablauf eines Aufrufs:

1. Wurzel nach 2.3 bestimmen. Gibt es keine, endet der Aufruf mit `kein-wurzelziel`.
2. `zerlegen` mit einer Kopie des Wissens und `rest` = 32.
3. Gibt es keinen Plan, endet der Aufruf mit der Spur.
4. Sonst den Weltabgleich aus 2.2 ausführen. Besteht er, ist der Plan das Ergebnis. Scheitert er, gibt es keinen Plan und die Spur nennt `welt-weicht-ab`.

### 2.7 Auftrag an die Missionspipeline

Die Reihenfolge Zugang, Datenraub, Extraktion ist die Teilaufgabenliste von `methode.datenraub-ueber-zugang`: `prim.zugang`, danach `prim.datenraub`, danach `prim.extraktion`. Diese Methode legt die Reihenfolge fest.

Die Pipeline aus [0008](decisions/0008-hierarchischer-missionsgenerator.md) erhält einen Plan genau dann, wenn die expandierte Primitivliste genau diese drei IDs in dieser Reihenfolge ist. Sie erzeugt daraus eine Mission der vorhandenen Datenraubform und verwendet nur bereits vorhandene Aktionen: `interact` für den Zugang, `interact` für das Terminal, `extract` für die Extraktion. Sie erzeugt daraus keine drei Missionen und keine zweite Missionsfamilie. Die HTN ruft `shoot` nicht auf und ruft die Schussauflösung nicht auf. Ihre Planungszeit liegt vor der taktischen Runde. Die Pipeline behält ihre Reihenfolge: zuerst das taktische Problem, danach die Umgebung.

Jeder andere Plan bleibt ein Organisationsergebnis in der Suchkopie und wird keine Missionsanfrage.

## 3. Operatoren

Jeder Operator hat Voraussetzungen, Plankosten, Wirkung und Sichtbarkeit. Plankosten sind für jeden Operator dieser Bibliothek 1. Die Summe der Plankosten eines Plans ist die Anzahl seiner Primitive. Plankosten sind keine Aktionspunkte, keine Würfel und keine Preise. Was `extract` im bestehenden Kern an Aktionspunkten kostet, bleibt außerhalb dieser Idee. Die Methodenordnung liest die Plankosten nicht.

Die Sichtbarkeit ist eine Liste aus `planer`, `gegenpartei`, `besitzer` und `anbieter`. Die Suchkopie des Planers erhält jede Wirkung seiner eigenen Operatoren. Die Liste nennt, wer sonst zu informieren wäre. Dieser Aufruf schreibt Wissensstände anderer Akteure nicht fort.

| ID | Voraussetzung | Plankosten | Wirkung in der Suchkopie | Sichtbarkeit | Grenze |
| --- | --- | --- | --- | --- | --- |
| `prim.anbieter-festlegen` | `kontrolliert-zugang(C, R)` und `unabhaengig(C, B, R)` | 1 | setzt `anbieter-gebunden(A, C, R)` | `planer`, `anbieter` | Organisationsschritt. Keine Mission. |
| `prim.nutzungsrecht-schreiben` | `angebot-offen(A, Gegenpartei, R)`, `antwort` dieses Angebots mit Wert `angenommen`, `verhandlungsfaehig(Gegenpartei)` | 1 | setzt `nutzungsrecht(A, R)` | `planer`, `gegenpartei` | Schreibt `antwort` nicht und `angebot-offen` nicht. Keine Mission. |
| `prim.abhaengigkeit-loesen` | `nutzungsrecht(A, R)` und `abhaengigkeit(A, B, R)` | 1 | entfernt `abhaengigkeit(A, B, R)` | `planer` | Entfernt keinen Zugang der Gegenseite. Keine Mission. |
| `prim.voraussetzung-binden` | `erreichbar(A, technologie)`, `erreichbar(A, personal)` und `erreichbar(A, finanzierung)` | 1 | setzt `voraussetzung-gebunden(A, R)` | `planer` | Keine Mission. |
| `prim.kapazitaet-reservieren` | `voraussetzung-gebunden(A, R)` | 1 | setzt `kontrolliert-zugang(A, R)` | `planer` | Strategisches Reservieren aus der Landschaft. Keine Mission. |
| `prim.nutzung-bestaetigen` | `kontrolliert-zugang(A, R)` und `abhaengigkeit(A, B, R)` | 1 | setzt `nutzungsrecht(A, R)` und entfernt `abhaengigkeit(A, B, R)` | `planer` | Keine Mission. |
| `prim.information-uebernehmen` | `angebot-offen(Besitzer, A, R)` und `antwort` dieses Angebots mit Wert `angenommen` | 1 | setzt `kennt(A, Gegenstand)` und `beleg-kopie(A, Gegenstand)` | `planer`, `besitzer` | Entfernt `kennt` des Besitzers nicht. Keine Mission. R ist der Gegenstand. |
| `prim.zugang` | `nutzungsrecht(A, R)` gilt nicht | 1 | setzt `zugang-geklaert(A, R)` | `planer` | Benennt das vorhandene `interact` an einer Tür. Ruft es nicht auf. R ist der Gegenstand. |
| `prim.datenraub` | `zugang-geklaert(A, R)` | 1 | setzt `beleg-bereit(A, R)` | `planer` | Benennt das vorhandene `interact` am Terminal. Ruft `shoot` nicht auf. |
| `prim.extraktion` | `beleg-bereit(A, R)` | 1 | setzt `kennt(A, Gegenstand)` und `beleg-kopie(A, Gegenstand)` | `planer` | Benennt das vorhandene `extract`. Ruft es nicht auf, vergibt keine Belohnung und entfernt den Zugang des Halters nicht. |

`angebot-offen`, `antwort` und `nutzungsrecht` sind drei verschiedene Zustände. `angebot-offen` bleibt neben `antwort` stehen. Eine angenommene Antwort ist noch kein Nutzungsrecht. `prim.nutzungsrecht-schreiben` setzt das Nutzungsrecht, das vorher nicht galt, und löscht `angebot-offen` nicht. `prim.abhaengigkeit-loesen` liest dieses Nutzungsrecht und entfernt erst danach die Abhängigkeit.

`prim.zugang` schreibt `zugang-geklaert`. `prim.datenraub` liest dieses Tupel und schreibt `beleg-bereit`. `prim.extraktion` liest `beleg-bereit` und schreibt `kennt` und `beleg-kopie`. Der Zieltest liest diese Tupel in der Suchkopie.

## 4. Aufgabenbibliothek

Ressourcenfamilien, Abhängigkeiten und Interessen stammen aus der Organisationslandschaft und aus den Profilfeldern. Die Bibliothek wiederholt die 70 Profile nicht. Jede abstrakte Aufgabe hat mindestens eine Methode. Jede Teilaufgabe ist eine ID aus diesem Abschnitt oder aus Abschnitt 3.

### 4.1 `aufgabe.abhaengigkeit-verringern(A, B, R)`

Zieltest: `nutzungsrecht(A, R)` gilt, und `abhaengigkeit(A, B, R)` gilt nicht.

`methode.unabhaengige-alternative`. Priorität 10. Mittel: `keines`.

- Voraussetzung: `abhaengigkeit(A, B, R)`. Dazu ein C ungleich A und ungleich B mit `kontrolliert-zugang(C, R)` und `unabhaengig(C, B, R)` im Wissen. Dazu `verhandlungsfaehig(C)`, `angebot-offen(A, C, R)` und `antwort` dieses Angebots mit Wert `angenommen`.
- Teilaufgaben: `aufgabe.anbieter-binden(A, C, B, R)`, danach `aufgabe.vereinbarung-mit-anbieter(A, C, R)`, danach `aufgabe.kapazitaet-sichern(A, B, R)`.
- Kette: `prim.anbieter-festlegen` setzt `anbieter-gebunden(A, C, R)`. `aufgabe.vereinbarung-mit-anbieter` liest dieses Tupel und setzt `nutzungsrecht(A, R)`. `prim.abhaengigkeit-loesen` liest das Nutzungsrecht und entfernt `abhaengigkeit(A, B, R)`.

`methode.eigene-faehigkeit`. Priorität 20. Mittel: `keines`.

- Voraussetzung: `abhaengigkeit(A, B, R)`, `erreichbar(A, technologie)`, `erreichbar(A, personal)`, `erreichbar(A, finanzierung)`.
- Teilaufgaben: `aufgabe.voraussetzungen-beschaffen(A, R)`, danach `aufgabe.kapazitaet-aufbauen(A, R)`, danach `aufgabe.nutzbarkeit-bestaetigen(A, B, R)`.
- Kette: `prim.voraussetzung-binden` setzt `voraussetzung-gebunden(A, R)`. `prim.kapazitaet-reservieren` liest es und setzt `kontrolliert-zugang(A, R)`. `prim.nutzung-bestaetigen` liest diesen Zugang, setzt `nutzungsrecht(A, R)` und entfernt `abhaengigkeit(A, B, R)`.

`methode.verbessertes-nutzungsrecht`. Priorität 30. Mittel: `Lizenzen`, `Partnerschaften`, `Kooperation`, `Lizenzalternativen`.

- Voraussetzung: `abhaengigkeit(A, B, R)`, `verhandlungsfaehig(A)`, `verhandlungsfaehig(B)`, `angebot-offen(A, B, R)`, `antwort` dieses Angebots mit Wert `angenommen`.
- Teilaufgaben: `aufgabe.vereinbarung-erreichen(A, B, R)`, danach `aufgabe.kapazitaet-sichern(A, B, R)`.
- Kette: `prim.nutzungsrecht-schreiben` setzt `nutzungsrecht(A, R)`. `prim.abhaengigkeit-loesen` liest es und entfernt `abhaengigkeit(A, B, R)`.

Ohne gemeinsamen Mitteleintrag ist die Ordnung `methode.unabhaengige-alternative`, danach `methode.eigene-faehigkeit`, danach `methode.verbessertes-nutzungsrecht`. Ein gemeinsamer Eintrag setzt `methode.verbessertes-nutzungsrecht` an die erste Stelle, vor die Priorität 10.

### 4.2 Aufgaben unter der unabhängigen Alternative

`aufgabe.anbieter-binden(A, C, B, R)`. Zieltest: `anbieter-gebunden(A, C, R)` gilt.

`methode.anbieter-ist-bekannt`. Priorität 10. Mittel: `keines`.

- Voraussetzung: `kontrolliert-zugang(C, R)` und `unabhaengig(C, B, R)`.
- Teilaufgabe: `prim.anbieter-festlegen`.
- Wirkung: setzt `anbieter-gebunden(A, C, R)`.

`aufgabe.vereinbarung-mit-anbieter(A, C, R)`. Zieltest: `nutzungsrecht(A, R)` gilt.

`methode.nutzungsrecht-vom-anbieter`. Priorität 10. Mittel: `keines`.

- Voraussetzung: `anbieter-gebunden(A, C, R)`, `verhandlungsfaehig(C)`, `angebot-offen(A, C, R)`, `antwort` dieses Angebots mit Wert `angenommen`.
- Teilaufgabe: `prim.nutzungsrecht-schreiben`. Die Gegenpartei des Operators ist C.
- Wirkung: liest `anbieter-gebunden` aus der vorigen Teilaufgabe der übergeordneten Methode und setzt `nutzungsrecht(A, R)`.

`aufgabe.kapazitaet-sichern(A, B, R)`. Zieltest: `abhaengigkeit(A, B, R)` gilt nicht.

`methode.kapazitaet-aus-nutzungsrecht`. Priorität 10. Mittel: `keines`.

- Voraussetzung: `nutzungsrecht(A, R)` und `abhaengigkeit(A, B, R)`.
- Teilaufgabe: `prim.abhaengigkeit-loesen`.
- Wirkung: liest das Nutzungsrecht aus der vorigen Teilaufgabe und entfernt `abhaengigkeit(A, B, R)`.

### 4.3 Aufgaben der eigenen Fähigkeit

`aufgabe.voraussetzungen-beschaffen(A, R)`. Zieltest: `voraussetzung-gebunden(A, R)` gilt.

`methode.erreichbares-binden`. Priorität 10. Mittel: `keines`.

- Voraussetzung: `erreichbar(A, technologie)`, `erreichbar(A, personal)`, `erreichbar(A, finanzierung)`.
- Teilaufgabe: `prim.voraussetzung-binden`.
- Wirkung: setzt `voraussetzung-gebunden(A, R)`.

`aufgabe.kapazitaet-aufbauen(A, R)`. Zieltest: `kontrolliert-zugang(A, R)` gilt.

`methode.eigene-kapazitaet`. Priorität 10. Mittel: `keines`.

- Voraussetzung: `voraussetzung-gebunden(A, R)`.
- Teilaufgabe: `prim.kapazitaet-reservieren`.
- Wirkung: liest `voraussetzung-gebunden` aus der vorigen Teilaufgabe und setzt `kontrolliert-zugang(A, R)`.

`aufgabe.nutzbarkeit-bestaetigen(A, B, R)`. Zieltest: `nutzungsrecht(A, R)` gilt, und `abhaengigkeit(A, B, R)` gilt nicht.

`methode.eigene-nutzung`. Priorität 10. Mittel: `keines`.

- Voraussetzung: `kontrolliert-zugang(A, R)` und `abhaengigkeit(A, B, R)`.
- Teilaufgabe: `prim.nutzung-bestaetigen`.
- Wirkung: liest `kontrolliert-zugang(A, R)` aus der vorigen Teilaufgabe, setzt `nutzungsrecht(A, R)` und entfernt `abhaengigkeit(A, B, R)`.

### 4.4 `aufgabe.vereinbarung-erreichen(A, Gegenpartei, R)`

Zieltest: `nutzungsrecht(A, R)` gilt.

`methode.direktes-angebot`. Priorität 10. Mittel: `Partnerschaften`.

- Voraussetzung: `verhandlungsfaehig(A)`, `verhandlungsfaehig(Gegenpartei)`, `angebot-offen(A, Gegenpartei, R)`, `antwort` dieses Angebots mit Wert `angenommen`.
- Teilaufgabe: `prim.nutzungsrecht-schreiben`. Die Gegenpartei des Operators ist der Parameter Gegenpartei.
- Wirkung: setzt `nutzungsrecht(A, R)`.

`methode.treffen-neutraler-ort`. Priorität 20. Mittel: `Kooperation`.

- Voraussetzung: `neutraler-ort(Ort, {A, Gegenpartei})`, `verhandlungsfaehig(A)`, `verhandlungsfaehig(Gegenpartei)`, `angebot-offen(A, Gegenpartei, R)`, `antwort` dieses Angebots mit Wert `angenommen`.
- Teilaufgabe: `prim.nutzungsrecht-schreiben`. Die Gegenpartei des Operators ist der Parameter Gegenpartei.
- Wirkung: setzt `nutzungsrecht(A, R)`.

Enthalten die bevorzugten Mittel `Kooperation` und enthalten sie `Partnerschaften` nicht, hat `methode.treffen-neutraler-ort` Mittelrang 0 und wird vor `methode.direktes-angebot` geprüft. Gelten dann ihre Voraussetzungen, setzt ihre Primitive das Nutzungsrecht. Fehlt `neutraler-ort`, ist `methode.treffen-neutraler-ort` unpassend, und `methode.direktes-angebot` setzt dasselbe Ziel. Enthalten die bevorzugten Mittel `Partnerschaften`, liegt `methode.direktes-angebot` vorn und setzt das Ziel, sobald ihre eigenen Voraussetzungen gelten.

### 4.5 `aufgabe.information-beschaffen(A, Gegenstand)`

Zieltest: `kennt(A, Gegenstand)` gilt. Beide Methoden schreiben zusätzlich `beleg-kopie(A, Gegenstand)`.

`methode.datenraub-ueber-zugang`. Priorität 10. Mittel: `keines`.

- Voraussetzung: `ist-information(Gegenstand)`, `kennt(A, Gegenstand)` gilt nicht, `nutzungsrecht(A, R)` gilt nicht. R ist der Gegenstand. Im Wissen steht ein H ungleich A, für den `kontrolliert-zugang(H, R)` oder `archiv-haelt(H, R)` gilt. Die Methode folgt von einem dieser Tupel nicht auf das andere. Bei mehreren H bindet sie die aufsteigend erste Akteur-ID.
- Teilaufgaben: `prim.zugang`, danach `prim.datenraub`, danach `prim.extraktion`.
- Kette: R ist hier der Gegenstand. `prim.zugang` setzt `zugang-geklaert(A, R)`. `prim.datenraub` liest es und setzt `beleg-bereit(A, R)`. `prim.extraktion` liest `beleg-bereit` und setzt `kennt(A, Gegenstand)` und `beleg-kopie(A, Gegenstand)`. Das gebundene H bleibt Parameter des Plans. Die drei Primitive ändern keine Tupel von H.

`methode.freiwilliger-austausch`. Priorität 20. Mittel: `Informationshandel`.

- Voraussetzung: `ist-information(Gegenstand)`, `kennt(A, Gegenstand)` gilt nicht, `angebot-offen(Besitzer, A, R)` mit einem Besitzer ungleich A und `antwort` dieses Angebots mit Wert `angenommen`. R ist der Gegenstand.
- Teilaufgabe: `prim.information-uebernehmen`.
- Wirkung: setzt `kennt(A, Gegenstand)` und `beleg-kopie(A, Gegenstand)`.

Enthält die Mittel-Liste des Planers `Informationshandel`, hat `methode.freiwilliger-austausch` Mittelrang 0 und wird vor `methode.datenraub-ueber-zugang` geprüft, trotz der Priorität 20. Ohne diesen Eintrag bleibt die Priorität 10 vorn.

### 4.6 `aufgabe.anspruch-absichern(A, Gegenseite, Gegenstand)`

Zieltest: `beleg-kopie(A, Gegenstand)` gilt. Das Tupel `anspruch(A, Gegenseite, Gegenstand)` bleibt stehen.

`methode.druckmittel-ueber-archiv`. Priorität 10. Mittel: `keines`.

- Voraussetzung: `anspruch(A, Gegenseite, Gegenstand)`, `beleg-kopie(A, Gegenstand)` gilt nicht, `kennt(A, Gegenstand)` gilt nicht, `nutzungsrecht(A, R)` gilt nicht, `ist-information(Gegenstand)`, und ein H ungleich A und ungleich der Gegenseite mit `archiv-haelt(H, R)` im Wissen. R ist der Gegenstand. Damit gelten die Voraussetzungen von `methode.datenraub-ueber-zugang`, auch wenn `methode.freiwilliger-austausch` unpassend ist.
- Teilaufgabe: `aufgabe.information-beschaffen(A, Gegenstand)`.
- Kette: die gerufene Methode schreibt `kennt(A, Gegenstand)` und `beleg-kopie(A, Gegenstand)`. Der Zieltest liest `beleg-kopie`.

### 4.7 Das Netz

Die Einrückung zeigt die Teilaufgaben. Sie ist nicht die Prüfungsordnung aus Abschnitt 2.4.

```text
aufgabe.abhaengigkeit-verringern
  methode.unabhaengige-alternative
    aufgabe.anbieter-binden
      prim.anbieter-festlegen
    aufgabe.vereinbarung-mit-anbieter
      prim.nutzungsrecht-schreiben
    aufgabe.kapazitaet-sichern
      prim.abhaengigkeit-loesen
  methode.eigene-faehigkeit
    aufgabe.voraussetzungen-beschaffen
      prim.voraussetzung-binden
    aufgabe.kapazitaet-aufbauen
      prim.kapazitaet-reservieren
    aufgabe.nutzbarkeit-bestaetigen
      prim.nutzung-bestaetigen
  methode.verbessertes-nutzungsrecht
    aufgabe.vereinbarung-erreichen
      methode.direktes-angebot
        prim.nutzungsrecht-schreiben
      methode.treffen-neutraler-ort
        prim.nutzungsrecht-schreiben
    aufgabe.kapazitaet-sichern
      prim.abhaengigkeit-loesen
aufgabe.information-beschaffen
  methode.datenraub-ueber-zugang
    prim.zugang
    prim.datenraub
    prim.extraktion
  methode.freiwilliger-austausch
    prim.information-uebernehmen
aufgabe.anspruch-absichern
  methode.druckmittel-ueber-archiv
    aufgabe.information-beschaffen
```

## 5. Beispiel: Datenraub über Zugang und Extraktion

Katalogpaar, keine neue Lore. `daeyang` hat das wiederkehrende Interesse „Datenzugang erweitern“, die Domäne „Daten und Prognosen“ und die bevorzugten Mittel „Informationshandel; Integration; Bündnisse“. `ruhrmark` hat die Machtbasis „Register, Verknüpfungswissen, Kundenzugang“ und die Ausgangsbindung „Lieferant und Gegner von Daeyang Intelligence.“ Eine Ausgangsbindung setzt `kontrolliert-zugang` nicht.

`register-ruhrmark` ist ein Argumentname der Leseskizze und keine Katalog-ID. Die Skizze wird nicht in den Katalog geschrieben.

Wissen von `daeyang` in der Skizze:

- `ist-information(register-ruhrmark)` gilt.
- `kontrolliert-zugang(ruhrmark, register-ruhrmark)` gilt im Wissen.
- `kennt(daeyang, register-ruhrmark)` gilt nicht.
- `nutzungsrecht(daeyang, register-ruhrmark)` gilt nicht.
- `angebot-offen` gilt nicht. `anspruch` gilt nicht. `abhaengigkeit` gilt nicht.

Weltzustand der Skizze: `kontrolliert-zugang(ruhrmark, register-ruhrmark)` gilt. Stünde dieses Tupel nur in der Welt und nicht im Wissen, wäre `methode.datenraub-ueber-zugang` unpassend. Stünde es nur im Wissen und nicht in der Welt, fände die Suche einen Plan und der Weltabgleich verwürfe ihn mit `welt-weicht-ab`. In dieser Skizze steht es in beiden Mengen.

Wurzel nach Regel 3: `aufgabe.information-beschaffen(daeyang, register-ruhrmark)`.

`Informationshandel` gibt `methode.freiwilliger-austausch` den Mittelrang 0. Sie wird vor `methode.datenraub-ueber-zugang` geprüft, obwohl ihre Priorität 20 und die des Datenraubs 10 ist. Spur, `rest` beginnt bei 32:

1. Eintritt `aufgabe.information-beschaffen`. `rest` = 31.
2. Versuch `methode.freiwilliger-austausch`. `rest` = 30. `angebot-offen` fehlt.
3. Versuch `methode.datenraub-ueber-zugang`. `rest` = 29. H ist `ruhrmark`, weil `kontrolliert-zugang(ruhrmark, register-ruhrmark)` im Wissen steht.
4. Eintritt `prim.zugang`. `rest` = 28. Wirkung: `zugang-geklaert(daeyang, register-ruhrmark)`.
5. Eintritt `prim.datenraub`. `rest` = 27. Liest `zugang-geklaert` und setzt `beleg-bereit(daeyang, register-ruhrmark)`.
6. Eintritt `prim.extraktion`. `rest` = 26. Liest `beleg-bereit` und setzt `kennt(daeyang, register-ruhrmark)` und `beleg-kopie(daeyang, register-ruhrmark)`.

Der Zieltest liest `kennt(daeyang, register-ruhrmark)`. Der Weltabgleich findet `kontrolliert-zugang(ruhrmark, register-ruhrmark)` in der Welt. Der Plan ist `prim.zugang`, `prim.datenraub`, `prim.extraktion`. Diese Reihenfolge ist die Teilaufgabenliste der Methode. Die Pipeline erhält genau diese drei IDs und verwendet `interact`, `interact` und `extract`. `ruhrmark` behält Register und Wissen. Die Suchkopie entfernt beides nicht.

## 6. Beispiel: Druckmittel über ein Archiv

Katalogpaar. `kettenbrecher` hat das Interesse „Schuldabhängigkeit verringern“ und die Abhängigkeiten „Belege, Unterstützung, Zugriff auf Register“. Das Profil führt keine bevorzugten Mittel. `vantier-helvetia` hat die Machtbasis „Kreditlinien, Forderungen, Rücklagen, Risikobewertung“ und das Interesse „Forderungen absichern“.

Die drei Wörter des Abhängigkeitsfeldes sind kein Tupel `anspruch` und kein Tupel `abhaengigkeit`. Ohne weitere Tupel im Wissen liefert Regel 4 keine Wurzel. Die Spur nennt `kein-wurzelziel`.

`forderungen-vantier` ist ein Argumentname der folgenden Leseskizze und keine Katalog-ID. Wissen der Skizze:

- `anspruch(kettenbrecher, vantier-helvetia, forderungen-vantier)` gilt.
- `ist-information(forderungen-vantier)` gilt.
- `beleg-kopie(kettenbrecher, forderungen-vantier)` gilt nicht.
- `archiv-haelt` gilt nicht. `abhaengigkeit` gilt nicht.

Wurzel nach Regel 2: `aufgabe.anspruch-absichern`. Regel 3 beginnt nicht, obwohl `ist-information` im Wissen steht.

1. Eintritt `aufgabe.anspruch-absichern`. `rest` = 31.
2. Versuch `methode.druckmittel-ueber-archiv`. `rest` = 30. `archiv-haelt` fehlt.

Es gibt keinen Plan. `aufgabe.information-beschaffen` wird nicht betreten. Eine zweite Wurzel beginnt nicht.

Im Katalog hat `datenfriedhof` die Machtbasis „Archive, Wiederherstellungswissen“. Das Kurzprofil lautet „Sammelt gelöschte Erinnerungen von Sogno-Kunden und gibt sie zurück.“ Das Interesse lautet „Zugang zu eigenen Erinnerungsdaten ermöglichen“. Die Katalog-ID der Medienorganisation ist `sogno-ottico`. Das Tupel `archiv-haelt(datenfriedhof, forderungen-vantier)` steht dort nicht. `offene-schleuse` hat die Machtbasis „Veröffentlichungskanäle, Quellenkontakte“, die Abhängigkeiten „Belege, Quellenschutz, Glaubwürdigkeit“ und das Interesse „Vertrauliche Informationen öffentlich prüfbar machen“. Ein Archivhalter ist das Profil nicht. `ruhrmark` hat die Machtbasis „Register, Verknüpfungswissen, Kundenzugang“ und ist an diesem Anspruch nicht gebunden.

Die Idee legt keinen Archivhalter an. Wäre `archiv-haelt(H, forderungen-vantier)` später ein Tupel im Wissen, mit H ungleich `kettenbrecher` und ungleich `vantier-helvetia`, ginge die einzige Teilaufgabe nach `aufgabe.information-beschaffen`. Deren Datenraubmethode kann `archiv-haelt` als H lesen und endet in `prim.extraktion`, das `beleg-kopie` setzt. `anspruch` bliebe stehen. Eine Änderung der Forderung, eine Streichung der Schuld oder eine Erpressung ist keine Aufgabe dieser Bibliothek.

## 7. Beispiel: Abhängigkeit und neutraler Ort

Katalogpaar. `chengyu-neuro` hat die Abhängigkeiten „Fertigung, Vertrieb, Patentrechte“, die Ausgangsbindung „Zulieferer von Nakamura-Lindahl, will sich aber unabhängig machen“, das Interesse „Eigenständigkeit ausbauen“ und die Mittel „Lizenzalternativen; Kooperation; Standardöffnung“. `nakamura-lindahl` hat die Machtbasis „Patente, Wartungsschnittstellen, Fertigung“, das Interesse „Standards kontrollieren“ und die Mittel „Lizenzen; Produktbindung; Partnerschaften“.

Die Ausgangsbindung setzt `abhaengigkeit` nicht. `patentrechte` in der folgenden Skizze ist das Ressourcenargument zum Profilwort „Patentrechte“ und keine Katalog-ID.

Wissen der Skizze: nur `abhaengigkeit(chengyu-neuro, nakamura-lindahl, patentrechte)`. Es gibt kein C, kein `unabhaengig`, kein `erreichbar`, kein `verhandlungsfaehig`, kein `angebot-offen`, kein `antwort` und kein `neutraler-ort`.

Wurzel nach Regel 1: `aufgabe.abhaengigkeit-verringern(chengyu-neuro, nakamura-lindahl, patentrechte)`.

`Kooperation` und `Lizenzalternativen` geben `methode.verbessertes-nutzungsrecht` den Mittelrang 0. Die Priorität 30 steht dadurch vor der Priorität 10. Spur:

1. Eintritt `aufgabe.abhaengigkeit-verringern`. `rest` = 31.
2. Versuch `methode.verbessertes-nutzungsrecht`. `rest` = 30. Es fehlen `verhandlungsfaehig(chengyu-neuro)`, `verhandlungsfaehig(nakamura-lindahl)`, `angebot-offen(chengyu-neuro, nakamura-lindahl, patentrechte)` und `antwort`.
3. Versuch `methode.unabhaengige-alternative`. `rest` = 29. Es fehlen `kontrolliert-zugang` eines C und `unabhaengig`.
4. Versuch `methode.eigene-faehigkeit`. `rest` = 28. Es fehlt `erreichbar`.

Es gibt keinen Plan. `aufgabe.vereinbarung-erreichen` wird nicht betreten. Der Weltabgleich läuft nicht.

Die beiden Methoden der Vereinbarung stehen in der Bibliothek. `methode.treffen-neutraler-ort` setzt bei erfüllten Voraussetzungen `nutzungsrecht` über `prim.nutzungsrecht-schreiben`. Die einzige Teilaufgabe ist `prim.nutzungsrecht-schreiben`.

Der Katalog hat keinen Akteur, dessen Profil das Tupel `neutraler-ort` ist. Die Idee bindet keinen der folgenden Einträge an das Treffen und legt keinen Akteur an.

- `vantier-helvetia` hat den Slogan „Diskret seit 1790. Neutral für jeden Kunden.“ und das Interesse „Forderungen absichern“.
- `sternenmarkt` hat die Machtbasis „Tauschplatz, Ruf, Vermittlung“ und das Interesse „Handel unabhängig von Passprivilegien ermöglichen“.
- `bosfor-vektor` hat unter den bevorzugten Mitteln „Vermittlung“.
- `freie-zone-sued` hat die Machtbasis „Gebietszugang, Zusammenhalt, Schlichtung“ und das Interesse „Örtliche Selbstverwaltung erhalten“. Das Kurzprofil lautet „Autonome Zone an der Grenze zur Kuppel, die FKD nicht betritt.“ FKD ist im Katalog der Name von `falkenfeld-kessler`.

Keiner dieser Einträge ist das Tupel `neutraler-ort`.

## 8. Nicht-Ziele

- Würfel, Proben, Aktionspunkte, Deckung, Sicht, Treffer und die Schussauflösung.
- Belohnungen, Preise, Ruf und Vertragswerte.
- Eine Umsetzung in `packages/sim`, im Server oder in der Missionspipeline.
- Neue Missionsfamilien. Geisel, Sabotage, Eskorte und Beobachtung bleiben außerhalb. Keine Methode nennt eine Beobachtungsprimitive.
- Händler, Lager, eine Auftragswahl auf der Stadtkarte, Drohnen als Einsatzmittel, Alarm, Verstärkung und simultane Planung in der taktischen Runde.
- Die Zielklassen Marktposition, Verpflichtung, Kapazität schützen, Konkurrenz und Zusammenhalt. Sie bleiben Namen in der Organisationslandschaft und sind keine Aufgaben dieser Bibliothek.
- Mehrere Wurzeln in einem Aufruf, Personen, Weltjahr, Bezirk und ein festes Ende.
- Diese Idee legt keinen Akteur an, damit `archiv-haelt` oder `neutraler-ort` gilt. Fehlt das Tupel im übergebenen Wissen, ist die zugehörige Methode unpassend.

## 9. Verweise

[Organisationslandschaft](ORGANISATIONEN.md) · [Katalog](ORGANISATIONSKATALOG.md) · [0019](decisions/0019-bisherige-konzernentwuerfe-verworfen.md) · [0020](decisions/0020-organisationslandschaft-und-lokale-konflikte.md) · [0008](decisions/0008-hierarchischer-missionsgenerator.md) · [0005](decisions/0005-kampf-rng-und-schussaufloesung.md) · [0041](decisions/0041-vektorkarte-gebaeude-und-strassen.md) · [0043](decisions/0043-eine-kampfprobe-am-regelkern.md) · [0045](decisions/0045-htn-auftragsidee.md)
