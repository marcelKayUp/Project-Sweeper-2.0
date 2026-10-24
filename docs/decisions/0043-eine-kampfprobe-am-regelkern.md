# 0043 · Eine Kampfprobe am Regelkern

Datum: 24.10.2026 · Status: Ableitung, keine Umsetzung und keine Produktfreigabe. Die menschliche M3-Abnahme bleibt offen. [0034](0034-koerperteile-und-blutung.md) und [0005](0005-kampf-rng-und-schussaufloesung.md) bleiben die geltende Kampfregel, bis eine spätere Aufgabe den Kern ausdrücklich umstellt.

## Anlass

Die laufende Auflösung ist eine Trefferchance, danach eine Zone, danach Kratzer, Blutung oder Bruch. Daneben stehen ein Probenentwurf, eine Würfelidee mit Bestätigungswurf und Ränge für Art, Panzerung und Waffenführung. Diese Notiz leitet daraus eine Probe ab, die an AP, Deckung, Sicht und Overwatch hängen kann. Sie schreibt `packages/sim` nicht um und legt kein zweites Kampfprogramm an.

## Was die Quellen hergeben

### Mitgegebenes Regelsystem

`regelsystem-cyberpunk.md` nennt sich selbst Entwurf. [REGELIDEEN.md](../REGELIDEEN.md) gibt ihn wieder. Die Datei enthält nacheinander zwei Skalen, die nicht aufeinander passen.

Die feine Skala bildet den Zielwert aus einem doppelten Primärattribut, einem Sekundärattribut und einer Fertigkeit: `(2 × Primär + Sekundär) / 2 + Fertigkeit`. Das Beispiel Waffenloser Kampf mit Gewandheit 6, Stärke 3 und Fertigkeit 4 ergibt 11,5. Hacken mit Verstand 7, Technik 2 und Fertigkeit 5 ergibt 12. Halbe Punkte sollen nach der Empfehlung der Datei stehen bleiben; kaufmännisches Runden und stets Abrunden stehen daneben, ohne Wahl. Als Würfel nennt sie 1W10, verwirft ihn für Zielwerte über 10 und stellt 1W20 mit Erfolg bei Wurf kleiner oder gleich dem Zielwert neben 2W10. Schwierigkeit ist dort +4, +2, 0, −2, −4. Volle fünf Punkte Abstand zum Zielwert geben oder nehmen einen Erfolgsgrad. Eine Spezialisierung gibt +1, ab Fertigkeitsstufe 5 dann +2. Kritisch sind natürliche Einsen oder Zwanziger, je nach Würfel. Ab der Hälfte der Trefferpunkte gilt −1 auf alle Proben, ab einem Viertel −3. Genannt werden Gewandtheit, Stärke, Verstand, Technik und Konstitution. Einen vollständigen Attributkatalog hat die Datei nicht.

Der spätere Abschnitt derselben Datei setzt eine Hunderterskala darüber. Werte von 1 bis 100, Durchschnittsmensch 10, menschliches Maximum 50, darüber übermenschlich. Fertigkeiten: 0, 10, 30, 50. Ein W100 gilt als Erfolg bei Wurf unter oder gleich dem Zielwert. Zielwerte über 100 sind automatischer Erfolg, außer beim Patzer. Der Patzer ist dort 96 bis 00, wenn der Zielwert unter 95 liegt. Schwierigkeit ist +20, +10, 0, −10, −20. Absolute Modifikatoren ändern den Zielwert; genannt sind Sichtweite, Licht, Ausrüstungsqualität, Zeitdruck und Verwundung. Relative Modifikatoren ändern Attribute, und die Datei nennt dafür nur Bioengineering. Der Gesamtmodifikator ist höchstens ±40. Pro Ausrüstungskategorie zählt der beste Bonus. Erst addieren, dann einmal runden, dann auf 1 bis 99 begrenzen; übermenschliche Werte bleiben außerhalb. Cyberware gibt in diesem Abschnitt zum Beispiel +5 auf ein Attribut oder +10 auf eine Fertigkeitsgruppe. Das widerspricht den +1 bis +3 der feinen Skala. Fehlfunktionen des Implantats liegen bei billig auf 96 bis 00, bei Standard auf 98 bis 00 und bei Premium auf 00. Das sind Bänder der Datei für das Implantat, nicht der kritische Fehlschlag einer Probe. Bioengineering multipliziert Attribute: Stufe I ×1,2 bei Stoffwechselkosten 5, Stufe II ×1,35 bei 10, Stufe III ×1,5 bei 20. Das Stoffwechselbudget ist die Konstitution. Zonen sind Kopf, Torso, beide Arme, beide Beine und ein optionales Nervensystem. Jede Zone trägt höchstens ein Implantat.

Die Datei hat keine Aktionspunkte, keine Deckung, kein Overwatch, keine Trefferzonen-Reihenfolge, keine Arten Stich, Schnitt und Wucht, keine Panzerungsränge und keine Waffen-Slots.

### Prozent-Roll-under, Cyberpunk-2020-ähnlich

Weder `regelsystem-cyberpunk.md` noch das Repo enthalten einen Cyberpunk-2020-Text oder eine andere klassische Prozent-Roll-under-Vorlage. [classification.md](../../assets/specs/weapons/classification.md) und [classification.json](../../assets/specs/weapons/classification.json) nennen Cyberpunk RED und Cyberpunk 2077 nur als öffentliche Wiki-Notizen zu Aufsätzen und schreiben ausdrücklich, das sei keine gültige Regel. Sie nennen keinen Würfel, keine Trefferzahl und keinen Schaden. Deshalb stehen hier keine Zahlen aus diesem Spiel.

Das einzige belegte Prozent-unterwürfeln im Repo ist der eigene Schuss: der Kampf-RNG zieht 0 bis 99, Treffer nur wenn der Wurf kleiner als die Chance ist. Das steht in [0005](0005-kampf-rng-und-schussaufloesung.md). Das ist nicht der W100 der Quelldatei und nicht ein zitiertes Fremdsystem.

### Project Zomboid

Ein Regeltext von Project Zomboid liegt weder im Repo noch in der Quelldatei. Deshalb werden keine Kleiderwerte, keine Infektion und keine Stimmung von dort zitiert. [0034](0034-koerperteile-und-blutung.md) sagt, Zahlen, Namen, Texte, Assets und Code einer fremden Vorlage seien nicht übernommen, und nennt, was nicht übernommen ist: Infektion, Stimmung, Hunger, Durst, Schmerzmittel, Nähen, Desinfizieren, Echtzeitblutung und eine zweite Kampfimplementierung. Die Verletzungsrichtung, die im Repo steht, ist damit nur [0034](0034-koerperteile-und-blutung.md) und der Gesprächsteil in [REGELIDEEN.md](../REGELIDEEN.md): sechs Zonen, Blutung bis zur Versorgung, und Stich, Schnitt, Wucht als Art des Treffers.

### AP, Deckung, Overwatch

Ein XCOM-Regeltext liegt weder im Repo noch in der Quelldatei. Deshalb werden keine Aktionspunkte, Deckungsstufen oder Reaktionsregeln aus diesem Spiel zitiert. Die Taktik, die bleibt, ist der eigene Kern:

- 8 AP in der Crewphase. Ein Schritt kostet 1 AP. Ein gebrochenes oder leeres Bein macht den Schritt zu 2 AP.
- Zielen kostet 1 AP und gibt dem nächsten Schuss desselben Runners in dieser Phase +15 Prozentpunkte. Der Bonus stapelt nicht.
- Ein gültiger Schuss kostet 3 AP und eine Patrone, auch beim Fehlschuss. Ein ungültiger Schuss bucht weder AP noch einen Wurf.
- Nachladen kostet 2 AP. Overwatch kostet 3 AP, reserviert eine Patrone und löst nach einem Bewegungsschritt im 90-Grad-Sektor genau einen Schuss aus, ohne weiteren AP-Abzug und ohne Zielbonus.
- Das Medkit kostet 3 AP und versorgt ein gewähltes Teil. Interaktion kostet 4 AP, Extraktion 1 AP.
- Die Vorschau ist `70 + Zielbonus − 5 × max(0, Manhattan − 3) − Deckungsabzug`, begrenzt auf 10 bis 95. Niedrige Deckung zieht einmal 25 ab, wenn die geschützte Kante gekreuzt wird. Eine blockierte Linie hat keine Chance und würfelt nicht.
- Sicht und Schusslinie sind getrennt. Der Server entscheidet. Bot-RNG und Kampf-RNG bleiben getrennt. Beide Zugmodelle benutzen dieselben Aktionsregeln.

Diese Zahlen stehen in [PROTOTYP.md](../PROTOTYP.md), [0004](0004-gerichtete-deckungskante.md), [0005](0005-kampf-rng-und-schussaufloesung.md) und [0034](0034-koerperteile-und-blutung.md). Sie sind die geltende Regel, kein Vorschlag dieser Notiz.

## Ableitung

Eine Aktion würfelt einmal. Zulässigkeit, Zone und Art sind keine zweiten Trefferproben.

### Probe

Die Arbeitslesart folgt der bisherigen Festlegung und dreht sie nicht um. Erfolg nur, wenn der Wurf streng unter dem Probenwert liegt. Darüber oder genau darauf ist kein Erfolg. Dieselbe Grenze gilt für den zweiten Wurf.

Die Quelldatei zählt den Gleichstand als Erfolg, auf der feinen Skala als kleiner oder gleich und auf der Hunderterskala als unter oder gleich. Dieser Streit bleibt offen. Diese Notiz schließt ihn nicht.

Eine gewürfelte 1 ist kein Fehlschlag und öffnet den zweiten Wurf. Bleibt der unter dem Probenwert, ist es ein kritischer Erfolg. Ist der zweite Wurf ebenfalls eine 1, ist es ein extrem kritischer Erfolg. Eine gewürfelte 100 ist kein Treffer und öffnet den zweiten Wurf. Bleibt der nicht unter dem Probenwert, ist es ein kritischer Fehlschlag. Ist der zweite Wurf ebenfalls eine 100, ist es ein extrem kritischer Fehlschlag.

Was eine 1 wird, deren zweiter Wurf scheitert, und was eine 100 wird, deren zweiter Wurf gelingt, bleibt offen. Die Folgen von kritisch und von extrem kritisch bleiben offen. Die Patzerbänder 96 bis 00 der Quelldatei und ihre natürlichen Einsen oder Zwanziger sind ein anderer Vorschlag und werden hier nicht eingesetzt. Erfolgsgrade über volle fünf Punkte werden hier nicht eingesetzt.

Die Gesichter 1 und 100 passen nur auf einen Hunderterwurf. Die feine Skala mit Zielwerten um 11,5 passt dazu nicht. Die Ableitung benutzt deshalb die spätere Hunderterskala der Quelldatei als Maß der Probe und behandelt die feine Skala als den früheren Entwurf, der sie in der Datei schon ist. Welche Attribute die Formel füllen, bleibt offen: [CHARAKTERENTWICKLUNG.md](../CHARAKTERENTWICKLUNG.md) nennt Physisch, Sozial und Mental und legt keine Trefferformel fest. Die Quelldatei nennt fünf andere Namen und ersetzt jenes Dokument nicht.

Der laufende Wurf bleibt der aus [0005](0005-kampf-rng-und-schussaufloesung.md): eine ganze Zahl von 0 bis 99, Treffer wenn sie kleiner als die Chance ist. Eine 100 gibt es auf diesem Wurf nicht. Ihn durch einen Wurf von 1 bis 100 zu ersetzen wäre eine spätere Regelversion, nicht diese Notiz.

Vorschlag, keine geltende Regel: Sobald Attribute gelten, ist der Probenwert `(2 × Primär + Sekundär) / 2 + Fertigkeit` auf der Hunderterskala, danach die absoluten Zu- und Abschläge der Quelldatei, danach die Zustandsterme unten. Die Obergrenze ±40, die Klammer 1 bis 99, die einmalige Rundung und die Schwierigkeitsstufen +20, +10, 0, −10, −20 bleiben Vorschläge der Quelldatei und werden nicht übernommen. Bis dahin ist der Probenwert die vorhandene Trefferchance. `previewShot` würfelt weiter nicht.

Die Wundabzüge der Quelldatei, −1 ab der Hälfte und −3 ab einem Viertel eines einzelnen Lebensbalkens, werden nicht zusätzlich auf die Teilregeln gelegt. Arm und Bein wirken so, wie [0034](0034-koerperteile-und-blutung.md) es schon tut.

### Trefferzone

Nur ein Erfolg öffnet die Zone. Fehlschuss und ungültige Aktion verbrauchen den Zonenwurf nicht, so wie der Kern es schon tut. Die Zonen bleiben Kopf, Torso, Arm links, Arm rechts, Bein links und Bein rechts. Das optionale Nervensystem der Quelldatei ist keine siebte Zone. Hände, Rücken und Gürtel bleiben Inventar und keine Trefferorte.

Der Kern würfelt die Zone danach gleichverteilt aus der festen Reihenfolge. Ein gezieltes Teil gibt es nicht: Zielen ist +15 auf den nächsten Schuss, keine Zonenwahl. Ob ein Schuss ein Teil nennen darf, bleibt offen.

### Schadensart

Stich, Schnitt und Wucht sind die Art des Treffers, nicht eine vierte Wundart und nicht die Sätze in [SCHADENSSTUFEN.md](../SCHADENSSTUFEN.md). Stich läuft auf Blutung und auf eine Zone. Schnitt läuft auf Kratzer oder Blutung und auf Gurte. Wucht läuft auf Bruch und auf Gehäuse. Die geltenden Arten bleiben Kratzer, Blutung und Bruch. Kopf und Torso verlieren bei Kratzer und Blutung 2, ein Glied 1. Ein Bruch zieht 3 beziehungsweise 2 ab, gedeckelt auf die Restpunkte des Teils. Nichts läuft auf ein anderes Teil über. Eine schwerere Art ersetzt eine leichtere an demselben Teil.

Vorschlag, keine geltende Regel: Die Waffe trägt eine dieser drei Arten. Ein gewöhnlicher Treffer schreibt die passende geltende Art auf die gewürfelte Zone und benutzt die Punktzahlen von [0034](0034-koerperteile-und-blutung.md). Wo die Idee „oder“ sagt, bei Schnitt zwischen Kratzer und Blutung, bleibt die Wahl offen. Gurte und Gehäuse sind keine Zonen und kein zweiter Punktevorrat. Der heutige Zufall zwischen Kratzer, Blutung und Bruch bleibt geltend, bis eine spätere Regelversion ihn durch diese Art ersetzt.

### Panzerung

Panzerung trägt dieselben drei Werte. Die Stärke ist ein Rang und kein Abzug von Trefferpunkten. Eine Rangtabelle gibt es nicht. Eine Stichweste ist stark gegen Stich. Ein Kettenhemd ist stark gegen Schnitt; Stich kann die Ringe teilen, Wucht kommt als Bruch an. Polster steht gegen Wucht. Platte steht gegen Stich und Schnitt, Wucht bleibt als Erschütterung. Erschütterung ist keine vierte Art neben Kratzer, Blutung und Bruch. Wie sie auf diese drei Arten fiele, bleibt offen.

Unterhaut ist dasselbe Muster als Cyberware an der Zone. Welche Ränge ein bestimmtes Stück hätte, bleibt offen. Ob Panzerung, Unterhaut und eine Cyberwaffe dieselbe Zone teilen, bleibt offen, weil die Quelldatei höchstens ein Implantat je Zone nennt.

Vorschlag, keine geltende Regel: Nach dem Treffer wird die Art der Waffe mit dem Rang der getroffenen Zone gegen diese Art verglichen. Ein höherer Rang gegen diese Art kann die geschriebene Art um eine Stufe senken, Bruch gegen Blutung, Blutung gegen Kratzer, Kratzer gegen keine neue Wunde. Punkte wechseln das Teil dabei nicht. Die Ränge selbst bekommen hier keine Zahl.

### Kritische Stufen

Fest ist nur das Verfahren: gewöhnlicher Erfolg, kritischer Erfolg, extrem kritischer Erfolg, kritischer Fehlschlag, extrem kritischer Fehlschlag. Die beiden gemischten zweiten Würfe bleiben offen, und offen bleibt, was die Stufen am Teil ändern.

Vorschlag, keine geltende Regel, und nur für den Fall, dass die gemischten Würfe später geschlossen werden: Ein kritischer Erfolg schreibt eine um eine Stufe schwerere geltende Art auf dasselbe Teil, weiterhin gedeckelt durch [0034](0034-koerperteile-und-blutung.md). Ein extrem kritischer Erfolg bleibt ohne zusätzliche Zahl. Ein kritischer Fehlschlag eines gültigen Schusses bucht weiterhin AP und Patrone und fügt keinen weiteren Schaden zu. Ein extrem kritischer Fehlschlag setzt die Waffe oder das Implantat am Arm aufs Spiel; die Qualitätsbänder der Quelldatei sind dafür nicht die Schwelle.

### Aktionspunkte

Neue Kosten legt diese Notiz nicht fest. Es gelten die Kosten im Abschnitt oben. Ein Nahkampf ist keine zweite Tabelle. Vorschlag, keine geltende Regel: Ein Nahkampfschlag kostet dieselben 3 AP wie ein Schuss, bis eine Inhaltsentscheidung etwas anderes festhält. Die Reichweite in Feldern bleibt offen. `rifle` und `sidearm` bleiben die einzigen Kampf-IDs. Klinge, Schlag und Stange werden hier keine neuen IDs. Overwatch, Sicht und die gerichtete Deckung bleiben, was sie sind. Eine Reaktion bleibt ein Schuss ohne Zielbonus.

### Was aus dem Zustand folgt

Diese Wirkungen sind schon Regel und hängen an derselben Probe, ohne einen zweiten Wurf:

- Blutung: am Anfang der gegnerischen Phase verliert jedes blutende Teil einer noch stehenden Figur 1 Punkt, einmal pro Runde. Eine Wunde aus dieser Phase tickt erst in der nächsten Runde. Die Blutung endet, wenn das Medkit dieses Teil versorgt oder das Teil keine Punkte mehr hat. Blutung ändert den Probenwert nicht nebenher.
- Ein gebrochener oder leerer Arm zieht 15 Prozentpunkte ab, nachdem die Vorschau gerechnet ist. Sind beide Arme leer, ist das Gewehr nicht abfeuerbar. Die Pistole bleibt nutzbar.
- Ein gebrochenes oder leeres Bein macht den Schritt zu 2 AP.
- Deckung und Entfernung stecken bereits in der Chance. Eine blockierte Linie würfelt nicht.
- Der Zielbonus von +15 gilt nur für den nächsten eigenen Schuss dieser Phase.

Nachführen, Raum, Angriff und Parade sind Ränge der Waffenführung, keine zweite Probe und kein Schaden. Nachführen gehört zum Fernkampf: schwere, unhandliche Waffen folgen einem bewegten Ziel langsam, leichte und kurze schnell. Die Tendenzen der Familien stehen in [REGELIDEEN.md](../REGELIDEEN.md) und werden hier nicht beziffert. Raum gehört zum Nahkampf und beschreibt den bereits stehenden Kontakt. Angriff und Parade sind zwei weitere Ränge. Die Art bleibt, wie getroffen wird. Die vier Ränge bleiben, wie die Waffe geführt wird.

Vorschlag, keine geltende Regel: Nachführen ändert den Probenwert nur, wenn das Ziel in dieser Phase ein Feld betreten hat, also auch beim Overwatch-Schuss auf diesen Schritt. Ein stehendes Ziel erhält daraus keinen Abzug. Raum, Angriff und Parade ändern denselben Probenwert. Parade ist dieser Rang und kein eigener Verteidigungswurf. Wie viele Punkte ein Rang wert ist, bleibt offen.

Waffen-Slots ändern den laufenden Kern nicht. Die Achsen aus der Festlegung sind Munition, Lauf, Unterlauf, Aufsatz und Griff. [classification.json](../../assets/specs/weapons/classification.json) führt eine breitere Liste und sagt, sie ändere keine Kampfwerte: zusätzlich Mündung, Hintergriff, Vordergriff, Körper, Trommel, Magazin, Schaft und Handschutz. Die Nahkampf-Steckplätze Griff, Parierfläche, Klinge oder Kopf stehen dort bewusst nicht. Vorschlag, keine geltende Regel: Ein belegter Kampf-Slot ändert höchstens eine Sache, die Art oder einen der vier Führungsränge, und nie die AP-Kosten. Welcher Slot was ändert, bleibt offen. Ob Mündung, Schaft und das Magazin als Bauteil in die fünf Achsen fallen, bleibt offen.

## Offen

- Ob der Gleichstand Erfolg ist. Die Quelldatei sagt ja, die Arbeitslesart sagt nein.
- Die beiden gemischten Bestätigungswürfe und die Folgen der kritischen Stufen.
- Welcher Attributkatalog die Formel füllt, und ob die Modifikatorgrenze, die Klammer und die Schwierigkeitstufen der Quelldatei je gelten.
- Cyberware-Boni, Menschlichkeit, Bioengineering, Stoffwechsel und die Implantat-Fehlfunktion. Nichts davon wird hier zur Kampfregel.
- Ein genanntes Trefferteil, die Wahl bei Schnitt, die Erschütterung, und ob Panzerung, Unterhaut und Cyberwaffe eine Zone teilen.
- Die Zahlen der Ränge, die Nahkampfreichweite und ob der Nahkampf bei 3 AP bleibt.
- Hören, Echos, Zonenlärm und gestufte Alarme. Sie stehen weiter nur in [REGELIDEEN.md](../REGELIDEEN.md). Alarm, Verstärkung, Drohne und simultane Planung aus v0.2 werden hier nicht gebaut.
- [SCHADENSSTUFEN.md](../SCHADENSSTUFEN.md) bleibt ein Vorrat. Die 360 Sätze sind keine Zugtabelle.

## Nicht in dieser Scheibe

Keine Änderung an `packages/sim`, keine neue Regelversion, kein zweiter Resolver, keine neuen Kampf-IDs, keine M4-Umsetzung und kein Ausfüllen der menschlichen M3-Abnahme.

## Verweise

[0004](0004-gerichtete-deckungskante.md) · [0005](0005-kampf-rng-und-schussaufloesung.md) · [0034](0034-koerperteile-und-blutung.md) · [0002](0002-gestufte-charakterentwicklung.md) · [PROTOTYP.md](../PROTOTYP.md) · [REGELIDEEN.md](../REGELIDEEN.md) · [CHARAKTERENTWICKLUNG.md](../CHARAKTERENTWICKLUNG.md) · [SCHADENSSTUFEN.md](../SCHADENSSTUFEN.md) · [classification.md](../../assets/specs/weapons/classification.md)
