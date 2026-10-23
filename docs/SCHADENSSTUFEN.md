# Schadensstufen

Vorschlag für eine spätere Stufe, kein stiller Ersatz. [`docs/decisions/0034-koerperteile-und-blutung.md`](decisions/0034-koerperteile-und-blutung.md) und [`packages/sim/src/wounds.ts`](../packages/sim/src/wounds.ts) bleiben, wie sie sind. Dort gelten die Trefferorte Kopf, Torso, Arm links, Arm rechts, Bein links und Bein rechts sowie die Arten Kratzer, Blutung und Bruch. Hier gilt keine Regel. Kampfwerte, Punkte, Aktionspunkte und Trefferchancen ändern sich nicht.

## Vorrat, keine Zugtabelle

Unterhalb von gesund stehen 360 kurze Ideen. Das ist ein Vorrat, keine Tabelle, die im Spielzug geblättert wird. Später würde ein Treffer zuerst eine Stufe und danach eine Variante aus dem Vorrat dieser Stufe und dieser Zone wählen. Wie diese Wahl fällt, ist hier nicht festgelegt.

Nicht jede leichte Idee ist eine Amputation. Was vergeht, steht unten. Narbe, dauerhafte Folge und Verlust stehen oben. Zerstört an Kopf oder Torso liest sich in diesen Sätzen als Ende der Zone und oft als Ende des Einsatzes für diese Figur. Das ist Farbe, keine neue Todesregel. An Armen und Beinen ist zerstört der Verlust oder die dauerhafte Unbrauchbarkeit dieses Glieds.

## Lesekonvention für links und rechts

Nur für die Sätze in diesem Vorrat: Der rechte Arm ist der Waffenarm, der linke der Stützarm. Das rechte Bein ist das Standbein, das linke das Spielbein. Das ändert nicht, in welcher Hand eine Pistole liegen kann, und es ist keine Körperregel.

Hände gehören zum jeweiligen Arm. Gürtel und Rücken gehören zum Torso. Das Gewehr belegt beide Hände. Ein Treffer an einem Arm kann in der Fiktion die dort gehaltene Waffe aus der Führung bringen. Ein zerstörter Arm kann das Gewehr unbenutzbar machen, weil Abzug oder Vorderschaft fehlen. Die andere Hand bleibt.

Ob das Stück selbst Dellen, Risse oder einen Verlust erleidet, steht nicht in den 360 Sätzen. Das prüft der Abschnitt zur Ausrüstung, und nur, wenn in der Zone etwas liegt.

## Stufen

- **Gesund.** Die Zone arbeitet. Dazu gibt es keine Verletzungsvarianten und keine Ausrüstungsprüfung.
- **Sehr leicht.** Augenblicklich oder kosmetisch. Es vergeht.
- **Leicht.** Es stört und bleibt nicht.
- **Mittel.** Die Zone funktioniert schlechter und ist noch behandelbar.
- **Schwer.** Bleibende Narbe oder Funktionseinbuße. Versorgung kann Schlimmeres noch aufhalten.
- **Kritisch.** Eine dauerhafte Folge ist wahrscheinlich. Die Zone ist kaum noch brauchbar.
- **Zerstört.** Verlust oder dauerhafte Unbrauchbarkeit des Teils.

## Sehr leicht

### Kopf

- **Blendkante.** Neon bricht im Visier, die Pupille zieht sich zusammen, ein Blinzeln hat die Kante weg.
- **Kupferfaden.** Aus einem Nasenloch läuft ein Faden, der von selbst gerinnt, bevor die nächste Deckung erreicht ist.
- **Pfeifton.** Ein hoher Ton setzt sich in ein Ohr und stirbt, ehe die Gasse abbiegt.
- **Wimpernruß.** Ruß hängt in den Wimpern, die Augen tränen ihn fort, der Blick ist danach klar.
- **Zungenkupfer.** Die Zähne erwischen die Zunge, der Geschmack ist metallisch, die nächste Silbe sitzt wieder.
- **Brauenfunke.** Ein Streif versengt ein Brauenhaar, die Haut darunter ist nur warm.
- **Lippenkleb.** Die Unterlippe platzt und klebt im Laufen von allein wieder zu.
- **Sternschlag.** Der Hinterkopf singt, für einen Herzschlag sind Sterne da, dann steht die Gasse scharf.
- **Wangenkreide.** Ein heller Strich auf der Wange, Staub und oberste Haut, morgen nicht mehr zu sehen.
- **Kinnnick.** Das Kinn nickt aus der Haltung und findet sie zurück, ohne dass der Biss sich ändert.

### Torso

- **Jackenfunke.** Eine Falte der Jacke schmort, darunter ist die Haut warm und ganz.
- **Rippenklang.** Ein dumpfer Ton beim ersten Einatmen, der nächste Zug geht ohne Echo.
- **Flankenflattern.** Die Flanke zuckt unter der Jacke und liegt dann still.
- **Brustkorn.** Splitter und Regen liegen als Korn auf dem Brustbein und lassen sich abwischen.
- **Atemloch.** Ein Atemzug fällt aus, der übernächste füllt die Brust wie vorher.
- **Bauchwelle.** Die Bauchdecke läuft in einer Welle und spannt sich wieder glatt.
- **Schulterblattwarm.** Wärme liegt auf einem Schulterblatt und zieht ab, ohne die Haltung zu ändern.
- **Wirbelklopfen.** Ein Wirbel meldet einen Klaps und schweigt, sobald der Rumpf gerade steht.
- **Sonnenstoß.** Die Luft geht aus der Körpermitte und kehrt im nächsten Schritt zurück.
- **Taillenstaub.** Entlang der Taille liegt eine Staubspur, die Haut darunter ist unberührt.

### Arm rechts

- **Abzugskribbeln.** Der Zeigefinger am Abzug kribbelt und hat den Druck einen Atemzug später wieder.
- **Griffneu.** Die Schusshand rutscht am Pistolengriff oder am Gewehrgriff und fasst neu, die Waffe bleibt in der Hand.
- **Knöchelkreide.** Die Knöchel der Schusshand sind weiß abgeschürft, die Faust schließt sich noch ganz.
- **Gelenksklick.** Das rechte Handgelenk klickt beim Heben der Waffe und führt danach wieder gerade.
- **Sicherungsdaumen.** Der Daumen neben Sicherung und Hahn ist einen Moment ungeschickt und liegt dann richtig.
- **Unterarmwärme.** Unter der Jacke wird der rechte Unterarm warm, es entsteht keine Beule.
- **Schaftscheuer.** Der Schaft scheuert die Schulter des Waffenarms, die Stelle kühlt, sobald die Waffe sitzt.
- **Sehnenblitz.** Ein heller Blitz läuft vom rechten Ellbogen in die Schusshand und ist vorbei.
- **Fingerblässe.** Das Blut weicht aus den Fingern der Schusshand und läuft zurück, der Abzug ist wieder fühlbar.
- **Handrückenlinie.** Ein roter Strich über den Handrücken, die Finger am Griff bleiben trocken und fest.

### Arm links

- **Schaftruck.** Die Stützhand verliert den Vorderschaft für einen Herzschlag und liegt wieder an.
- **Ladefinger.** Die Finger, die ein Magazin an die Waffe führen, sind kurz steif und dann fein.
- **Rahmenkribbeln.** Die linke Hand am Türrahmen kribbelt und schließt wieder um die Kante.
- **Betonellenbogen.** Der Stützellenbogen schrammt Beton, die Haut wird rot, die Beugung bleibt frei.
- **Schafthitze.** Die Handfläche am Metall des Vorderschafts wird heiß und kühlt im Regen.
- **Kleinfingerpause.** Der kleine Finger der Stützhand gehorcht einen Atemzug nicht und hakt sich dann wieder ein.
- **Innenarmstrich.** An der Innenseite des linken Unterarms bleibt ein Strich, der nicht blutet.
- **Stützzucken.** Die linke Schulter zuckt hoch und fällt, das vordere Ende des Gewehrs liegt danach wieder ruhig.
- **Gelenkstaub.** Staub sitzt im linken Ellbogen, ein Schütteln nimmt ihn mit.
- **Kantenfilm.** Die Kletterfinger sind einen Griff lang glitschig und dann wieder trocken.

### Bein rechts

- **Sohlenmeldung.** Die Sohle des Standbeins meldet einen Stich, das Gewicht bleibt auf diesem Bein.
- **Knieklopf.** Das Standknie klopft unter der Last und verriegelt sich wieder.
- **Schienbeinklang.** Das Auftreten klingt hell am rechten Schienbein und ist im nächsten Tritt still.
- **Hüftdrehfunke.** Ein Funke in der Standhüfte, die Drehung in den Anschlag sitzt danach wieder.
- **Wadenlassen.** Die Standwade spannt hart und lässt im selben Stand los.
- **Sohlenkante.** Der rechte Knöchel rollt und findet die Außenkante der Sohle zurück.
- **Fersenstille.** Die Ferse, die das Gewicht hält, ist einen Schritt lang stumm und meldet dann wieder.
- **Hosenwärme.** Stoff am Standbein schmort, die Haut darunter ist nur warm.
- **Splitterpuder.** Der Tritt wirbelt Splitter auf, sie pudern die Hose und bleiben nicht in der Haut.
- **Gewichtsrückkehr.** Das Gewicht kippt vom Standbein weg und kehrt auf dieselbe Ferse zurück.

### Bein links

- **Absatzfang.** Der vordere Absatz rutscht auf nassem Beton, der nächste Schritt haftet.
- **Treppenknie.** Das Knie, das die Stufe nimmt, zuckt und hebt sich wieder.
- **Türschienbein.** Ein Streif am Bein, das zuerst durch die Tür geht, die Haut ist nur gestreift.
- **Zehenwacht.** Die Zehen im vorderen Schuh schlafen einen Tritt lang und werden wach.
- **Schrittfleck.** Dort, wo der Schritt lang wird, bleibt ein roter Fleck, der nicht aufgeht.
- **Leistenzucken.** Ein Zucken in der Leiste des Spielbeins, das Anheben zum nächsten Schritt geht.
- **Führungsknick.** Der Führungsknöchel deutet einen Knick an und steht dann gerade in der Spur.
- **Abdruckwärme.** Die Wade, die den vorderen Absatz hebt, wird warm und kühlt im Weitergehen.
- **Schaftrand.** Der Stiefelrand scheuert am Spielbein, darunter ist die Haut nur gereizt.
- **Ausfallneu.** Der Ausfallschritt stockt und setzt neu an, die Länge ist dieselbe.

## Leicht

### Kopf

- **Doppeltür.** Für die Dauer eines Blinzelns steht der Türrahmen doppelt, dann wieder einfach.
- **Augendruck.** Druck sitzt hinter einem Auge, Zukneifen löst ihn, das Zielen findet die Kante wieder.
- **Watteohr.** Eine Seite ist wie mit Watte belegt, ein Schütteln holt die Stimmen zurück.
- **Lockerzahn.** Ein Zahn gibt im Kiefer nach, er hält, das Sprechen geht um ihn herum und wird wieder glatt.
- **Pfeifnase.** Die Nase pfeift bei jedem Zug, ein Zwicken richtet den Weg, danach ist sie still.
- **Nackenbrand.** Den Kopf zu drehen sticht in der Nackenhaut, dann lässt der Stich nach.
- **Namenslücke.** Ein Rufname ist weg und liegt einen Satz später wieder auf der Zunge.
- **Tränenschleier.** Der Blick schmiert, der Ärmel wischt ihn klar, die Schärfe kehrt ohne Rest zurück.
- **Kieferknack.** Der Mund geht mit einem Knack auf, später kaut und ruft es sich wie vorher.
- **Seitenschritt.** Der Körper will aus der Linie zur Seite, ein Schritt fängt ihn, der Kopf ist wieder bei der Sache.

### Torso

- **Rippenstich.** Tiefes Holen und ein kurzes Lachen stechen an einer Rippe, der Stich wandert ab.
- **Brustenge.** Die Brust ist einen Gang lang zu eng für einen vollen Zug und weitet sich an der nächsten Ecke.
- **Flankenkrampf.** Eine Seite krampft unter der Jacke, die Hand darauf löst den Krampf.
- **Staubhusten.** Ein Huster holt Staub aus der Kehle, danach sind die Züge klar.
- **Bauchnachgeben.** Die Bauchdecke will sich beim Strecken nicht längen und gibt dann doch nach.
- **Blattscheuern.** Drehen scheuert auf einem Schulterblatt, die Stelle brennt und kühlt, ohne die Haltung zu halten.
- **Herzstolper.** Ein Schlag fällt aus dem Takt, der nächste ist der alte.
- **Zwerchfellkipp.** Der Treffer sitzt unter den Rippen, die Stimme kippt und steht im nächsten Satz wieder.
- **Bückwirbel.** Ein Wirbel meldet sich beim Bücken zum Gürtel und schweigt, sobald der Rumpf oben ist.
- **Schritttaille.** Die Haut an der Taille spannt bei jedem Schritt und lässt nach, wenn der Gang ruhiger wird.

### Arm rechts

- **Abzugswille.** Der Zeigefinger setzt den Zug verspätet um, danach ist der Abzug wieder leicht.
- **Grifflage.** Die Schusshand schließt zu weit oben um Pistole oder Gewehrgriff und korrigiert die Lage.
- **Rückstoßfeder.** Das rechte Handgelenk federt beim Rückstoß weg und fängt die Mündung wieder.
- **Hebelstockung.** Das Heben des Waffenarms stockt auf Schulterhöhe und geht dann durch.
- **Hahnlage.** Der Daumen liegt neben dem Hahn falsch und findet die Lage, ohne die Waffe abzusetzen.
- **Zielbeule.** Eine kleine Beule am rechten Unterarm macht das Zielen unruhig und schwillt im Stehen ab.
- **Feinzittern.** Eine Sehne singt vom Handgelenk in die Schusshand, das Feinzielen zittert und steht.
- **Halbe Faust.** Die Schusshand schließt nicht ganz zur Faust, beim nächsten Griff um die Waffe doch.
- **Schaftansatz.** Die Schulter des Waffenarms nimmt den Schaft schief und setzt neu an, der Anschlag sitzt wieder.
- **Klammfinger.** Die Finger am Abzug sind klamm und tauen, der Druck wird wieder genau.

### Arm links

- **Schaftnick.** Die Stützhand rutscht vom Vorderschaft, das Gewehr nickt, die Hand ist im selben Atemzug wieder da.
- **Lippenpatzer.** Die Finger verfehlen die Magazinlippe und setzen das Magazin beim nächsten Griff richtig.
- **Rahmenhängen.** Die linke Hand bleibt am Türrahmen hängen und löst sich, ohne dass der Arm nachzieht.
- **Kniestütze.** Das Aufstützen des linken Ellbogens geht nicht sofort und dann doch.
- **Schaftunruhe.** Die Stützhand zittert am Vorderschaft und wird still, das vordere Ende hört auf zu wandern.
- **Kantenfehlgriff.** Die linke Hand greift eine Kante daneben und dann richtig.
- **Vorhaltemüdigkeit.** Das Halten des Vorderschafts ermüdet vor der Zeit und erholt sich, sobald die Waffe kurz unten ist.
- **Hängeschulter.** Die linke Schulter hängt, das Gewehr liegt schief, bis die Schulter hochkommt.
- **Metallbrand.** Die Handfläche brennt am Metall, ein Umgreifen am Schaft nimmt die Hitze weg.
- **Hakenfinger.** Der kleine Finger der Stützhand hakt am Vorderschaft und löst sich, ohne den Griff zu öffnen.

### Bein rechts

- **Gewichtsuche.** Das Gewicht sucht kurz das andere Bein und kehrt auf das Standbein zurück.
- **Knieverzug.** Das Verriegeln beim Knien auf dem Standbein kommt einen Atemzug spät und sperrt dann.
- **Auftrittslaut.** Das rechte Schienbein klingt beim Auftreten, der Schmerz zieht ab, ehe der Stand wechselt.
- **Eckige Drehung.** Die Drehung der Standhüfte ist eckig und wird beim nächsten Anlegen wieder rund.
- **Wadenknoten.** Ein Knoten in der Standwade macht das Stehen unruhig und löst sich unter dem Gewicht.
- **Kantenkorrektur.** Der rechte Knöchel setzt auf eine Kante, eine kleine Korrektur, dann steht die Sohle fest.
- **Ferne Ferse.** Das Auftreten der rechten Ferse fühlt sich fern an und ist im nächsten Tritt wieder nah.
- **Lastzug.** Beim Verlagern auf das Standbein zieht der Oberschenkel und lässt nach, sobald das Gewicht ruht.
- **Kurzer Stand.** Der Schritt, der auf dem Standbein landet, ist kürzer und wird wieder gleich lang.
- **Hindernisstockung.** Das Anheben des Standbeins über ein Hindernis stockt und geht dann durch.

### Bein links

- **Frühes Aufsetzen.** Das Spielbein setzt zu früh auf und findet die Schrittlänge im nächsten Gang zurück.
- **Ausfallfang.** Das linke Knie knickt im Ausfall an und fängt sich, bevor das Gewicht ganz vorn ist.
- **Stufenstich.** Der erste Kontakt des Spielbeins mit der Stufe sticht und lässt im Weitersteigen nach.
- **Späte Kante.** Der vordere Schuh meldet die Kante spät und dann rechtzeitig.
- **Hebenzug.** Das Heben des Spielbeins zieht in der Leiste und gibt den Schritt frei.
- **Langer Muskel.** Der Muskel auf der Vorderseite des linken Oberschenkels brennt über die nächsten Schritte und kühlt.
- **Spur außen.** Der linke Fuß zeigt zu weit nach außen und korrigiert in die Spur.
- **Spätes Abdrücken.** Das Abdrücken der linken Wade kommt spät und dann im Takt des Gangs.
- **Nasser Absatz.** Der linke Absatz rutscht, der folgende Tritt haftet auf demselben Beton.
- **Voreiliger Tritt.** Das Spielbein will auftreten, bevor der Körper da ist, und fällt dann in den Takt zurück.

## Mittel

### Kopf

- **Brauenklappe.** Blut aus der Braue legt sich über ein Auge. Ein festes Schließen oder ein Verband hält es aus dem Blick, die Stelle ist noch zu versorgen.
- **Spätes Ohr.** Auf einer Seite kommen Rufe spät an. Die Seite ist dumpf und lässt sich noch öffnen, das andere Ohr trägt die Gasse.
- **Breite Worte.** Der Kiefer ist dick, die Worte sind breiig, der Ruf bleibt verständlich. Kälte und Ruhe machen den Biss wieder brauchbar.
- **Grauer Rand.** Die Ränder des Blicks werden grau. Eine Versorgung holt die Schärfe zurück, solange der Runner die Augen noch führt.
- **Ein Nasenloch.** Luft geht nur durch ein Loch. Der First lässt sich richten, Atmen durch den Mund geht noch.
- **Rumpf muss mit.** Der Nacken gibt den Blick über die Schulter nicht her, der ganze Oberkörper dreht mit. Wärme löst den Riegel, der Nacken bleibt nicht steif.
- **Undichter Mund.** Die Lippe ist bis auf den Zahn offen, Trinken läuft daneben. Ein Verschluss macht den Mund wieder dicht.
- **Schläfenpuls.** Der Puls sitzt in der Schläfe und stiehlt die Ruhe, in der man eine Visierkante hält. Stillen nimmt den Takt aus dem Ziel.
- **Sprechende Wange.** Sprechen zieht an einer offenen Wange. Ein Verband hält die Haut zusammen, der Kiefer arbeitet darunter noch.
- **Blick nach oben.** Nach oben sehen kippt das Gleichgewicht. Die Beule am Hinterkopf ist behandelbar, der Horizont steht wieder, wenn der Kopf Ruhe bekommt.

### Torso

- **Sprechende Rippe.** Jeder tiefe Zug hat an einer Rippe eine scharfe Stelle. Sie lässt sich stilllegen, die Brustwand hält.
- **Flacher Zug.** Atmen geht flach, die Stimme trägt nicht über die Gasse. Versorgung vertieft den Zug, die Lunge ist noch frei.
- **Drehende Flanke.** Die Seite öffnet sich beim Drehen des Rumpfes. Ein Druckverband schließt sie, die Wand darunter ist ganz.
- **Hustende Decke.** Die Bauchdecke hält beim Husten schlecht und ist noch nicht durch. Ruhe und ein Verschluss geben ihr die Spannung zurück.
- **Schiefer Rücken.** Das Gurtzeug liegt schief, weil ein Punkt neben der Wirbelsäule beim Bücken nicht mitmacht. Der Punkt ist versorgbar, der Rumpf richtet sich auf.
- **Kleine Mitte.** Die Körpermitte spannt nicht, die Bewegungen werden klein. Sie werden wieder groß, wenn die Prellung nachlässt.
- **Feuchter Husten.** Im Husten liegt ein Faden Feuchte. Die Lunge ist gereizt und noch zu beruhigen, der Zug selbst bleibt da.
- **Enger Gürtelgriff.** Beugen zum Gürtel ist eng, die Taille verweigert die volle Beuge. Die Muskeln sind geprellt und lassen sich lösen.
- **Aufrichtstrang.** Ein Strang neben der Wirbelsäule lässt das Aufrichten stocken. Er ist lösbar, der Rücken trägt noch.
- **Anschlagpunkt.** Der Gewehrschaft drückt auf einen geprellten Punkt am Brustbein. Kälte nimmt den Punkt, die Mitte ist nicht eingebrochen.

### Arm rechts

- **Später Abzug.** Der Zeigefinger hängt dem Willen hinterher, die Waffe wartet in der Schusshand. Schiene und Ruhe holen den Zug nach vorn.
- **Loser Griff.** Pistole und Gewehrgriff liegen lose in der Schusshand. Sie kann sie noch halten, wenn sie sich auf den Schluss besinnt.
- **Wandernde Mündung.** Das rechte Handgelenk ist dick, die Mündung wandert. Ein fester Verband macht die Richtung ehrlicher.
- **Heißer Ellbogen.** Strecken des Waffenarms in den Anschlag geht nur mit einem heißen Ellbogen. Das Gelenk ist geschwollen und noch ganz.
- **Grobe Sicherung.** Sicherung und kleiner Hebel werden grob bedient, die Sehne der Schusshand ist gereizt und nicht gerissen.
- **Sofort müde.** Das Halten der Waffe im rechten Arm ermüdet sofort. Die Muskeln sind geprellt und erholen sich, wenn die Last kurz weg ist.
- **Daumen daneben.** Der rechte Daumen greift an der Waffe nicht mehr mit, die anderen Finger halten Pistole oder Griff.
- **Langsames Heben.** Der Waffenarm hebt langsam aus der Schulter und kommt oben an. Er ist nicht ausgerenkt.
- **Schaftstoß.** Jeder Schuss, der den Schaft in die rechte Schulter legt, fährt in dieselbe Stelle. Kälte und ein Polster machen den Anschlag wieder tragbar.
- **Griff ohne Meldung.** Die rechte Handfläche meldet den Druck auf den Griff schlecht, die Lage der Waffe muss gesehen werden. Das Gefühl kann zurückkehren.

### Arm links

- **Nur aufgelegt.** Die Stützhand führt den Vorderschaft nicht mehr, sie liegt bloß auf. Schonung gibt die Führung zurück, die Finger sind geprellt.
- **Lippe daneben.** Die linke Hand findet die Magazinlippe nicht sicher. Die Finger sind dick und noch zum Greifen fähig.
- **Nasse Klinke.** Türklinken und Kanten rutschen aus der linken Hand, die Fläche ist offen. Nähen gibt ihr den Halt zurück.
- **Weicher Stützellenbogen.** Aufstützen zum niedrigen Schuss scheitert am linken Ellbogen. Das Gelenk ist geschwollen und führt sich noch.
- **Schiefe Führung.** Das Gewehr zeigt nach, weil die linke Schulter den Vorderschaft nicht hebt. Die Schulter ist richtbar, die andere Hand hält den Griff.
- **Schaftdruck.** Ein Schnitt am linken Unterarm öffnet sich, wenn der Vorderschaft gedrückt wird. Ein Verband hält zu, der Arm trägt noch.
- **Stange unsicher.** Die äußeren Finger der Stützhand schließen um eine Stange nicht zuverlässig. Sie sind angeknackst und können ruhen.
- **Wandernder Schaft.** Das linke Handgelenk lässt den Schaft wandern. Eine Bandage gibt dem Gelenk eine Kante, die Führung kommt zurück.
- **Früher Abbruch.** Das Halten der Waffe vor dem Körper bricht an der linken Seite vor der Zeit ab. Der Muskel ist überdehnt und erholbar.
- **Weiches Abstützen.** Ein hartes Abstützen mit der linken Faust bleibt weich. Die Knochen sind angeknackst und halten, wenn sie Ruhe bekommen.

### Bein rechts

- **Knie nach innen.** Längeres Belasten schiebt das Standknie nach innen. Eine Schiene hält die Linie, das Bein trägt.
- **Vorsichtiges Knien.** Knien auf dem Standbein geht nur mit Vorsicht, das Knie ist dick. Die Schwellung ist behandelbar, das Gelenk sperrt noch.
- **Heller Tritt.** Auftreten auf dem rechten Schienbein hat einen hellen Punkt. Der Knochen ist geprellt und nicht durch.
- **Kleine Drehung.** Die Drehung der Standhüfte im Anschlag ist kleiner geworden. Ruhe und vorsichtiges Bewegen weiten sie wieder.
- **Fehlende Feder.** Das Abdrücken der rechten Wade fehlt, das Bein trägt noch. Die Faser ist gezerrt und kann heilen.
- **Unehrliche Sohle.** Die rechte Sohle setzt unsicher auf, der Knöchel ist breit. Ein Verband macht den Tritt ehrlich.
- **Ballen statt Ferse.** Das Gewicht scheut die rechte Ferse und geht auf den Ballen. Die Prellung klingt ab, die Ferse nimmt die Last wieder an.
- **Tiefer Erguss.** Ein tiefer Erguss im rechten Oberschenkel, das Bein trägt, wenn der Stand klein bleibt. Er lässt sich kühlen.
- **Überredetes Standbein.** Der Körper sucht das Spielbein, das Standbein lässt sich noch überreden, die Last zu halten.
- **Gereizte Leiste.** Das Heben des Standbeins über ein Hindernis stockt in der Leiste. Die Sehne ist gereizt und noch ganz.

### Bein links

- **Kurzer Handel.** Das Spielbein setzt zu nah, Hindernisse werden zur Verhandlung. Schonung gibt dem Schritt die Länge zurück.
- **Misstrauischer Ausfall.** Der Ausfall knickt im linken Knie, das Gelenk ist geschwollen und lässt sich führen.
- **Scharfe Stufe.** Jede Stufe meldet sich scharf am linken Schienbein. Der Knochen hält, Kälte nimmt die Schärfe.
- **Späte Sohle.** Die Kante kommt im linken Schuh spät an. Das Gefühl in der Sohle kann zurück, der Fuß ist nicht taub für immer.
- **Spätes Heben.** Das Spielbein hebt spät, die Leiste ist gezerrt und noch ein Stück.
- **Offene Schrittbahn.** Ein Schnitt liegt auf dem Muskel, der den linken Schritt lang macht. Nähen hält ihn zusammen, das Bein geht noch.
- **Breiter Weg.** Der linke Fuß zeigt nach außen, der Weg wird breit. Der Knöchel lässt sich bandagieren und in die Spur holen.
- **Angerissenes Abdrücken.** Das Abdrücken vom hinteren Fuß sticht in der linken Wade. Die Faser ist angerissen und will Ruhe statt einen weiteren Sprung.
- **Schweres Nachkommen.** Das Spielbein kommt nicht rechtzeitig nach vorn und ist nicht gelähmt. Es holt auf, wenn der Gang klein bleibt.
- **Eckiger Schritt.** Der Schritt nach vorn aus der linken Hüfte ist eckig statt rund. Die Hüfte ist geprellt und wird wieder rund.

## Schwer

### Kopf

- **Tiefes Lid.** Das Lid bleibt tiefer, wenn die Braue jetzt nicht genäht wird. Genäht bleibt eine Narbe, das Auge sieht weiter durch eine volle Öffnung.
- **Offene Muschel.** Am Ohr fehlt ein Stück Knorpel, Wind fährt hinein, das Hören ist noch da. Schließen verhindert, dass die Muschel weiter aufreißt.
- **Biss daneben.** Die Zahnreihen treffen sich nicht. Ein Richten jetzt kann den Biss retten, sonst bleibt er schief.
- **Keil im Blick.** In einem Auge fehlt ein Keil des Blicks. Versorgung kann verhindern, dass der Keil bleibt, die Narbe am Rand bleibt so oder so.
- **Hängender Winkel.** Ein Mundwinkel hängt, der Nerv lässt die Seite nach. Früh versorgt kann die Seite wieder mitziehen, sonst bleibt das Hängen.
- **Haut auf dem Knochen.** An der Stirn liegt Haut auf dem Knochen. Schließen hält die Schale, die Naht wird bleiben, offen gelassen geht die Stelle tiefer.
- **Schiefer Horizont.** Das Gleichgewicht legt die Welt schief. Ruhe kann verhindern, dass die Schiefe bleibt, ein Taumel bleibt bis dahin.
- **Zungenkante.** Die Zunge ist am Rand eingerissen, die Sprache verliert Kanten. Nähen kann den Rand halten, eine Kerbe bleibt.
- **Schweißbahn.** Eine künftige Narbe durch die Braue wird die Bahn für Schweiß und Blut. Die Wunde darunter ist noch zu schließen, bevor sie in die Lidfalte arbeitet.
- **Ohr nach innen.** Ein Ohr blutet nach innen. Hören auf dieser Seite kann bleiben, wenn die Stelle jetzt still wird, sonst droht sie taub zu werden.

### Torso

- **Laute Rippe.** Auch wenn der erste Schmerz nachlässt, wird diese Rippe das Atmen erinnern. Schienen kann verhindern, dass der Bruch wandert.
- **Brustnaht.** Eine Naht über dem Brustbein wird bleiben. Offen gelassen zieht sie jeden Zug enger, geschlossen hält sie die Weite.
- **Tiefe Flanke.** Die Seite ist offen bis in die Schicht, die den Rumpf hält. Druck jetzt verhindert, dass mehr Wand nachgibt, eine Narbe bleibt.
- **Müde Bauchwand.** Die Bauchwand hält mit Mühe. Ein Verschluss bewahrt die Körpermitte, ohne ihn gibt sie weiter nach.
- **Rückenkerbe.** Eine Kerbe neben der Wirbelsäule wird bleiben. Versorgung kann verhindern, dass das Aufrichten ganz ausfällt.
- **Feuchter Zug.** Die Lunge gibt Feuchte an den Husten ab. Stillen kann verhindern, dass jeder folgende Zug schwerer wird.
- **Eingegrabener Gurt.** Der Gurt hat sich in die Schulter gegraben. Die Narbe wird den Weg des Gurtzeugs zeichnen, Herauslösen stoppt das Tiefergehen.
- **Bleibende Beuge.** Bücken zum Gürtel bleibt eng. Die Muskeln jetzt zu richten kann verhindern, dass die Taille die Beuge ganz verweigert.
- **Nachgebende Mitte.** Druck vom Schaft auf das Brustbein schmerzt und wird das weiter tun. Stabilisieren kann verhindern, dass die Mitte einbricht.
- **Mitte mit Erinnerung.** Die Körpermitte zuckt später noch bei jedem Stoß. Ruhe jetzt hält diesen Aussetzer kurz, die Empfindlichkeit bleibt.

### Arm rechts

- **Kurzer Zug.** Eine Narbe am Abzugsfinger wird den Zug kürzer machen, wenn die Sehne jetzt nicht gerichtet wird. Gerichtet bleibt der Finger, und eine steife Stelle bleibt mit ihm.
- **Dünnere Faust.** Die Schusshand wird nicht mehr ganz dicht schließen. Schienen kann verhindern, dass sie Pistole und Gewehrgriff gar nicht mehr hält.
- **Winkliges Gelenk.** Das rechte Handgelenk verheilt winklig, wenn es nicht gerichtet wird. Die Waffe würde dann dauerhaft neben die Visierlinie zeigen.
- **Anschlag vor dem Geraden.** Der Waffenarm streckt nicht mehr bis ins Gerade. Richten und Ruhe können dieses Ende noch hinausschieben, eine Grenze bleibt.
- **Hand unter Last.** Die Schusshand öffnet sich, wenn die Waffe schwer wird. Eine Naht an der Sehne kann das Reißen noch verhindern.
- **Kerbe im Unterarm.** Im rechten Unterarm fehlt ein Stück Gefühl, die Kerbe bleibt. Verschluss hindert, dass die Hand darunter ausfällt.
- **Schwacher Gegendruck.** Der rechte Daumen gibt der Pistole und dem Gewehrgriff kaum noch Gegendruck. Richten holt einen Teil zurück, sonst bleibt die Schwäche.
- **Rutschende Schulter.** Der Waffenarm rutscht im Schultergelenk. Einrenken jetzt verhindert, dass er unten bleibt, das Gelenk wird das Rutschen erinnern.
- **Offene Schaftstelle.** Die Schulter, die den Schaft nimmt, ist offen. Jeder weitere Anschlag macht sie schlimmer, Naht und Polster halten sie, die Narbe bleibt die Anlage.
- **Ertastete Hebel.** Sicherung und Hebel werden ertastet statt gefühlt. Die Nerven der Schusshand können noch zurück, wenn die Wunde ruht, die Feinheit bleibt geringer.

### Arm links

- **Schiefe Auflage.** Die Stützhand legt sich nicht mehr flach an den Vorderschaft. Nähen kann verhindern, dass die Finger einziehen, die schiefe Narbe bleibt.
- **Steife Ladefinger.** Die Finger, die das Magazin führen, bleiben steif. Früh bewegt lernen sie den Wechsel noch, sonst bleibt er grob.
- **Offene Fläche.** Die linke Handfläche ist durch die Hautschicht durch. Schließen bewahrt die Beugesehnen, die Fläche wird eine Narbe bleiben.
- **Schmerzendes Stützen.** Aufstützen auf den linken Ellbogen bleibt mit Schmerz verbunden. Ruhigstellen kann verhindern, dass das Gelenk im falschen Winkel festwächst.
- **Begrenztes Heben.** Die linke Schulter hebt den Vorderschaft nur noch begrenzt. Versorgung kann verhindern, dass er vorn gar nicht mehr hochkommt.
- **Reißende Bahn.** Am linken Unterarm wird eine offene Bahn zur Narbe, die beim Drehen des Schafts aufreißt. Decken stoppt das Aufreißen, die Bahn bleibt.
- **Unsichere Stange.** Stange und Mauerkante bleiben in der linken Hand unsicher. Die Sehnen sind angerissen, eine Naht hält sie, die alte Sicherheit kehrt nicht zurück.
- **Knirschendes Gelenk.** Das linke Handgelenk knirscht und wird das weiter tun. Richten kann verhindern, dass aus der Unruhe ein Festwerden wird.
- **Dünner Halt.** Das Halten der Waffe vor dem Körper bleibt an der linken Seite schwach. Stillen der Wunde kann den Rest des Muskels retten, die alte Kraft nicht.
- **Weicher Außenrand.** Der äußere Rand der linken Faust trägt nicht mit. Der Finger ist noch dran, Versorgung kann verhindern, dass er taub bleibt, die Kraft bleibt geringer.

### Bein rechts

- **Bewusstes Verriegeln.** Das Standknie verriegelt nur noch, wenn der Runner es will. Schienen kann verhindern, dass es seitlich wegknickt, die Bewusstheit bleibt.
- **Kante im Knochen.** Das rechte Schienbein hat eine Kante, die beim Auftreten bleibt. Ruhigstellen kann verhindern, dass die Kante zum Bruch wird.
- **Kleinere Hüftdrehung.** Die Drehung der Standhüfte im Anschlag bleibt kleiner. Jetzt bewegen kann verhindern, dass sie ganz sperrt.
- **Lücke in der Feder.** In der rechten Wade fehlt ein Stück Feder und wird fehlen. Nähen kann verhindern, dass die Lücke wächst.
- **Schiefer Knöchel.** Der rechte Knöchel will schief verheilen. Richten hält das Gewicht auf der Sohle, sonst bleibt der Stand auf der Kante.
- **Scheue Ferse.** Das Gewicht scheut die rechte Ferse und wird das weiter tun. Decken und Ruhe können verhindern, dass die Stelle offen bleibt.
- **Eingeschittenes Tragen.** Der Muskel, der das rechte Bein zum Stand macht, ist eingeschnitten. Verschluss rettet das Tragen, eine Schwäche bleibt.
- **Knappes Heben.** Das Heben des Standbeins bleibt knapp. Schonung kann verhindern, dass die Leiste reißt, die Knappheit bleibt.
- **Zittern unter Last.** Das Standbein zittert unter vollem Gewicht. Ruhe kann verhindern, dass es unter der Last ganz aussetzt.
- **Narbenhindernis.** Hindernisse bleiben für das Standbein eine eigene Aufgabe. Die Narbe in der Hüftbeuge bleibt, Weiterreißen ist noch aufzuhalten.

### Bein links

- **Kurzer Schritt bleibt.** Die Schrittlänge kommt nicht zurück, wenn die Sehne des Spielbeins jetzt nicht entlastet wird. Entlastet bleibt sie kürzer als vorher und reißt nicht weiter.
- **Schloss im Knie.** Das linke Knie will im Ausfall zufallen oder wegklappen. Eine Schiene kann dieses Schloss verhindern, das Knie bleibt empfindlich.
- **Empfindliche Vorderkante.** Das linke Schienbein bleibt die erste empfindliche Kante an jeder Stufe. Ruhigstellen hindert den Bruch, die Empfindlichkeit bleibt.
- **Arme Meldung.** Die Sohle des vorderen Fußes meldet die Kante nur noch arm. Versorgung kann verhindern, dass das Gefühl ganz geht.
- **Bremse in der Leiste.** Das Spielbein kommt spät nach vorn und wird das weiter tun. Schonung kann das Reißen der Leiste noch stoppen.
- **Offener Schrittmuskel.** Der Muskel des langen Schritts ist offen. Eine Naht hält überhaupt einen Schritt, die alte Länge bleibt aus.
- **Fuß nach außen.** Der linke Knöchel droht nach außen fest zu werden. Richten holt den Fuß in die Spur, sonst bleibt der Weg breit.
- **Schwaches Abdrücken.** Das Abdrücken der linken Wade bleibt schwach. Nähen kann den Rest der Faser halten, die Feder kehrt nicht ganz zurück.
- **Zeichnendes Hinken.** Das Hinken des Spielbeins zeichnet den Gang. Weitergehen ohne Versorgung macht es zum Schleifen, mit Versorgung bleibt es ein Hinken.
- **Eckige Hüfte.** Der runde Schritt aus der linken Hüfte wird eckig bleiben. Jetzt lösen kann verhindern, dass die Hüfte ganz sperrt.

## Kritisch

### Kopf

- **Bilder in Fetzen.** Das Bewusstsein kommt und geht, die Gasse steht nur in Stücken. Zielen und ein klarer Ruf fallen in die Lücken.
- **Ein Auge arbeitet.** Ein Auge bleibt dunkel, das andere tut die ganze Arbeit. Die Zone ist kaum noch ein Werkzeug zum Sehen.
- **Kiefer ohne Biss.** Beißen fällt aus, die Sprache ist Brei. Der offene Mund ist vor allem ein Problem für die Luft.
- **Bruchstückdenken.** Eine Linie im Schädel ist fühlbar, Denken kommt in Bruchstücken. Ein Auftrag bleibt nicht am Stück im Kopf.
- **Befehle ohne Ohr.** Rufe setzen sich nicht, ob die Ohren lärmen oder schweigen. Die Gasse ist über die Ohren kaum noch zu lesen.
- **Mund ohne Worte.** Der Mund bewegt sich, Worte kommen nicht an. Was der Kopf sagen will, bleibt drinnen.
- **Aufrecht als Aufgabe.** Das Gleichgewicht ist weg, aufrecht bleiben verhandelt jeder Schritt neu. Für etwas anderes ist der Kopf kaum frei.
- **Blick durch Schwellung.** Sehen und Atmen gehen durch Schwellung und einen Blutfilm. Das Gesicht ist kaum noch zu gebrauchen.
- **Licht ohne Folge.** Eine Pupille folgt dem Licht nicht. Der Blick auf dieser Seite ist kein Werkzeug mehr, die andere trägt allein und unsicher.
- **Kopf in der Hand.** Das Genick trägt den Kopf nicht, eine Hand muss ihn halten. Ohne diese Stütze fällt er aus der Linie.

### Torso

- **Atem oben.** Die Lunge füllt sich nicht mehr nach unten, jeder Zug ist kurz. Der Rumpf taugt kaum noch zum Atmen.
- **Wandernde Rippen.** Die Brustwand hält ihre Form nicht, Rippen verschieben sich gegeneinander. Drehen und tiefes Holen sind kaum möglich.
- **Nachgebende Körpermitte.** Die Bauchwand gibt nach, aufrecht bleiben ist das Äußerste. Ein weiterer Zug am Rumpf öffnet die Mitte weiter.
- **Klappender Rücken.** Der Rumpf klappt, wo er sich aufrichten sollte. Die Wirbelsäule in diesem Abschnitt gehorcht kaum noch.
- **Husten ohne Ende.** Jeder Zug bringt mehr Feuchte aus der Brust. Die Lunge ist kaum noch ein Werkzeug.
- **Reißende Taille.** Beugen oder Drehen öffnet die Seite weiter. Der Rumpf ist kaum belastbar.
- **Mitte nach innen.** Das Brustbein gibt nach innen nach. Liegen, Anschlagen und ein tiefer Zug fallen aus.
- **Rücken ohne Last.** Der Rücken trägt keine Last mehr, die Stelle ist roh und gibt nicht nach. Ein Gurt findet dort keinen tragenden Grund.
- **Taktlos.** Stimme und Atem finden keinen gemeinsamen Schlag, das Zwerchfell setzt aus. Rufen ist kaum noch drin.
- **Starre Mitte.** Deckung mit dem Körper nehmen scheitert am Rumpf, die Mitte dreht kaum noch. Der Oberkörper ist fast ein Block.

### Arm rechts

- **Finger ohne Antwort.** Der Zeigefinger der Schusshand tut nicht, was der Wille sagt. Die Pistole in dieser Hand ist ein Gewicht, der Abzug am Gewehrgriff ebenso.
- **Griff fällt auf.** Die Schusshand hält Pistole und Gewehrgriff nicht mehr aus eigener Kraft. Die Finger sind noch da und schließen nicht.
- **Mündung ohne Richtung.** Das rechte Handgelenk gibt der Mündung keine Richtung, sie kippt. Zielen aus diesem Gelenk ist kaum möglich.
- **Winkelarm.** Der Waffenarm bleibt in einem Winkel, der Ellbogen klemmt. Der Anschlag ist kaum zu erreichen.
- **Eine Bewegung fehlt.** Öffnen oder Schließen der Schusshand fehlt fast ganz, die Sehne ist durch. Die Waffe lässt sich so nicht bedienen.
- **Heben bricht ein.** Den Waffenarm mit der Waffe zu heben bricht zusammen und kommt nicht wieder. Halten gelingt nicht mehr.
- **Daumen ohne Gegenseite.** Ohne den rechten Daumen rutscht jeder Griff. Pistole und Gewehrgriff haben keinen Gegenspieler mehr.
- **Hängender Waffenarm.** Die Schulter trägt den Waffenarm nicht, er hängt. Die Hand ist noch daran und kaum auf die Höhe der Visierlinie zu bringen.
- **Schaft ins Leere.** Die rechte Schulter nimmt den Schaft nicht an. Ein Schuss würde in eine Schulter fahren, die nicht mehr führt.
- **Raten am Abzug.** Die Schusshand weiß nicht, wo ihre Finger sind. Sicherung und Abzug zu bedienen ist Raten.

### Arm links

- **Schaft ohne Stütze.** Die Stützhand liegt nicht mehr am Vorderschaft. Das Gewehr hat vorn keine Führung, die Schusshand allein richtet es nicht.
- **Magazin bleibt liegen.** Die linke Hand bekommt ein Magazin nicht an die Waffe. Der Wechsel fällt aus, die Finger schließen um das Blech nicht.
- **Nichts bleibt in der Hand.** Türen, Stangen und der Vorderschaft bleiben nicht in der linken Hand. Was sie greift, verliert sie.
- **Starrer Stützellenbogen.** Aufstützen und das Führen nach vorn fallen am linken Ellbogen aus. Der Arm ist in sich kaum noch zu falten.
- **Vorderende unten.** Die linke Schulter hebt das vordere Ende des Gewehrs nicht. Der Lauf senkt sich, sobald die Stütze fehlt.
- **Druck öffnet den Arm.** Druck auf den Schaft öffnet den linken Unterarm weiter, Kraft ist keine mehr da. Führen und Halten fallen zusammen aus.
- **Finger ohne Absprache.** Die Finger der Stützhand sind einzeln taub und greifen nicht miteinander. Das Gewehr wandert aus der Auflage.
- **Gelenk klappt weg.** Das linke Handgelenk klappt weg, sobald der Schaft Gewicht hat. Das vordere Ende zeigt nach unten.
- **Kein Hub vorn.** Die linke Seite hebt die Waffe vor dem Körper kaum noch. Die Schusshand am Griff ersetzt diese Führung nicht.
- **Hand ohne Auftrag.** Die linke Hand ist noch angewachsen und tut nichts Zuverlässiges. Das Gewehr ist ohne sie kaum zu gebrauchen.

### Bein rechts

- **Stand knickt weg.** Volles Gewicht knickt das Standbein weg. Stehen auf dieser Seite ist kaum möglich.
- **Knie ohne Sperre.** Das rechte Knie trägt weder in der Beuge noch in der Streckung zuverlässig. Knien und Stehen auf diesem Bein fallen aus.
- **Tritt setzt aus.** Jeder Tritt auf das rechte Schienbein setzt das Bein aus. Es ist kaum noch ein Stand.
- **Hüfte ohne Dreh.** Der Anschlag kann sich nicht mehr über die Standhüfte drehen. Das Bein ist ein Pfosten ohne Gelenkspiel.
- **Wade ohne Feder.** Abdrücken aus der rechten Wade fehlt ganz. Das Bein gibt nach, wo es federn sollte.
- **Sohle sucht.** Der rechte Knöchel ist lose, die Sohle sucht den Boden und findet ihn nicht verlässlich.
- **Ferse ohne Last.** Die rechte Ferse nimmt kein Gewicht an. Stehen wackelt, weil der hintere Punkt fehlt.
- **Oberschenkel faltet.** Der Muskel des Standbeins gibt nach, das Bein faltet unter dem Körper.
- **Nur an der Wand.** Ohne eine Wand oder eine Hand als Stütze ist das Standbein kein Stand mehr.
- **Bein schleift beim Heben.** Die rechte Leiste hebt das Bein nicht. Ein Hindernis ist für diese Seite nicht mehr zu nehmen, das Bein schleift.

### Bein links

- **Nichts kommt nach vorn.** Das Spielbein kommt nicht vor den Körper. Gehen ist ein Nachziehen auf dem Standbein.
- **Ausfall ohne Trag.** Das linke Knie klappt im Ausfall weg. Der vordere Schritt trägt nicht.
- **Stufe verweigert.** Der erste Kontakt mit einer Stufe setzt das Spielbein aus. Treppen sind mit diesem Bein kaum noch zu beginnen.
- **Kante ohne Fuß.** Die Kante existiert für den linken Fuß nicht. Jeder Absatz nach vorn ist ein Stolpern.
- **Bein bleibt hinten.** Die linke Leiste sperrt das Heben, das Spielbein bleibt hinter dem Körper.
- **Schrittlänge tot.** Der linke Oberschenkel hat keine Kraft für einen langen Schritt. Das Bein schleift neben dem Stand.
- **Ansatz knickt weg.** Der linke Knöchel knickt bei jedem Ansatz, der Fuß zeigt weg und trägt den Schritt nicht.
- **Kein Abdruck nach vorn.** Die linke Wade bringt den Körper nicht vom hinteren Fuß nach vorn. Der Gang kommt nicht in Bewegung.
- **Schlepp statt Führung.** Das Spielbein folgt und führt nicht. Laufen ist für dieses Bein kaum noch der richtige Name.
- **Hüfte ohne Schwung.** Der Schwung aus der linken Hüfte ist tot. Nur ein unsicheres Nachsetzen bleibt, und auch das bricht ab.

## Zerstört

### Kopf

- **Offene Schale.** Die Schädeldecke hält nicht mehr. Was in diesem Kopf entschieden hat, ist nicht mehr erreichbar.
- **Leere Höhlen.** Beide Augen sind fort. Sehen aus diesem Kopf gibt es nicht mehr.
- **Fehlender Unterkiefer.** Der Unterkiefer ist weg. Sprechen und Beißen mit diesem Mund sind vorbei.
- **Taub und ohne Lot.** Gehör und Gleichgewicht sind ausgelöscht. Der Kopf meldet weder Stimme noch Lage.
- **Genick ohne Antwort.** Der Kopf antwortet der Wirbelsäule nicht mehr. Haltung und Blick aus dem Genick sind zu Ende.
- **Stummes Zentrum.** Worte kommen aus diesem Kopf nicht wieder. Der Mund kann sich noch bewegen oder auch nicht, die Sprache bleibt aus.
- **Atemweg zu.** Nase und oberer Mund sind kein Weg für Luft mehr. Atmen durch dieses Gesicht ist vorbei.
- **Stirn ohne Zugang.** Die Stirn ist als Zugang zum Denken zerstört. Der Runner kehrt aus diesem Kopf nicht zurück.
- **Unbewegtes Gesicht.** Muskeln und Nerven des Gesichts sind tot, die Form ist noch da. Der Kopf ist eine Last ohne Mimik, ohne Biss und ohne willentliches Augenspiel.
- **Sinne zu Ende.** Sehen, Hören und das Halten des Kopfes fallen zusammen aus. Die Zone ist verloren, der Körper folgt aus ihr nicht mehr.

### Torso

- **Lunge ohne Raum.** Die Brust gibt der Lunge keinen Raum mehr. Atmen aus diesem Rumpf ist vorbei.
- **Bauch ohne Wand.** Die Bauchwand ist als Halt verloren. Die Körpermitte trägt sich nicht mehr.
- **Leitung unterbrochen.** Durch den Rumpf läuft keine verlässliche Leitung mehr zwischen Schultern und Becken. Der Körper hat in der Mitte keinen Zusammenhang.
- **Schlag zu Ende.** Der Schlag in der Brust ist aus. Der Rumpf trägt diesen Runner nicht weiter.
- **Brustbein als Trümmer.** Das Brustbein ist keine Mitte mehr. Anschlag, Beugen und Atem haben dort keinen Knochen.
- **Flanke ohne Form.** Die Seite hält den Rumpf nicht mehr in seiner Form. Die Wand, die dort war, ist dauerhaft weg.
- **Rücken ohne Aufrichten.** Aufrichten aus diesem Rücken ist für immer vorbei. Der Rumpf bleibt geklappt.
- **Zwerchfell ohne Takt.** Es gibt keinen Atemtakt mehr, das Zwerchfell ist zerrissen und kommt nicht wieder.
- **Mitte trägt nichts.** Gurt, Gürtel und das eigene Gewicht haben an diesem Rumpf keinen tragenden Grund mehr. Die Zone ist als Träger zu Ende.
- **Rumpf zu Ende.** Der Runner steht aus diesem Torso nicht wieder auf. Arme und Beine haben keine Mitte mehr, der sie gehorchen.

### Arm rechts

- **Schusshand fort.** Die Hand, die Abzug und Griff bedient hat, ist weg. Die linke Hand kann am Vorderschaft liegen und das Gewehr allein nicht abziehen.
- **Unterarm ohne Faust.** Der rechte Unterarm endet, bevor eine Faust oder ein Griff möglich wäre. Pistole und Gewehrgriff haben auf dieser Seite keine Finger.
- **Ellbogen als Ende.** Der rechte Ellbogen ist Trümmer, der Waffenarm führt keine Waffe mehr und wird es nicht wieder tun. Die Stützhand bleibt eine Hand.
- **Leere Waffenschulter.** Das Schultergelenk des Waffenarms ist leer. Heben, Anschlagen und Rückstoß haben auf dieser Seite keinen Arm.
- **Finger einzeln fort.** Die Finger der Schusshand sind weg, der Arm endet in einem Rest ohne Griff. Abzug und Gegendruck gibt es dort nicht mehr.
- **Nerv für immer still.** Der Waffenarm ist warm und gehorcht nie wieder. Die Hand öffnet sich nicht und schließt sich nicht, die Stützhand ist davon unberührt.
- **Unter dem Gelenk nichts.** Unterhalb des rechten Handgelenks ist nichts Brauchbares mehr. Der Griff fällt, weil keine Schusshand ihn hält.
- **Steifer Waffenarm.** Der Arm steht dauerhaft so, dass die Hand den Gewehrgriff nicht erreicht. Die linke Hand bleibt am Schaft und hält eine Waffe, die niemand mehr abzieht.
- **Geschlossene Last.** Der Waffenarm hängt als Gewicht und lässt nicht los, wenn die Finger um etwas geschlossen geblieben sind. Die Stützseite muss ohne ihn auskommen und bedient das Gewehr nicht allein.
- **Stumpf an der rechten Schulter.** Vom Waffenarm bleibt ein Stumpf. Das Gewehr verliert Abzug und Schulteranlage auf dieser Seite, die linke Hand verschwindet nicht mit.

### Arm links

- **Vorderschaft leer.** Die Stützhand ist am Schaft weggerissen. Vorn hält niemand, die Schusshand am Griff bleibt und richtet das Gewehr nicht allein.
- **Hand im Rahmen.** Die linke Hand ist in einem Türrahmen geblieben, die Finger sind fort. Magazine und Klinken haben auf dieser Seite keinen Griff, der Waffenarm ist noch ganz.
- **Muskel hebt nie wieder.** Der linke Unterarm ist so aufgerissen, dass er den Schaft nie wieder hebt. Der Arm hängt daran und bleibt unbrauchbar, die Schusshand fehlt nicht.
- **Angewinkelter Stützarm.** Ein Sturz auf die Stützseite hat den Ellbogen dauerhaft angewinkelt. Aufstützen und Nach-vorn-Führen sind vorbei, die andere Schulter nimmt noch einen Schaft.
- **Schulter ohne Zufluss.** Die linke Schulter ist aus dem Gelenk, die Gefäße sind zu. Der Arm mag noch daran hängen, er ist verloren, und Klettern auf dieser Seite auch.
- **Mittelhand ohne Schluss.** Die Kletterhand endet in einer Mittelhand ohne Finger. Eine Stange, ein Magazin und ein Vorderschaft lassen sich damit nicht schließen.
- **Stücke halten nicht.** Der linke Unterarm liegt in Stücken, die nicht zusammenbleiben. Führen ist vorbei, die rechte Hand bleibt am Griff.
- **Verbackene Faust.** Die linke Hand ist dauerhaft zu einer Faust verbacken, die sich nicht um den Schaft öffnet. Sie stößt das Gewehr weg, statt es zu legen.
- **Arm erreicht den Schaft nicht.** Der linke Arm steht steif vom Körper ab und kommt an den Vorderschaft nicht heran. Die Schusshand bleibt am Griff und hat vorn keine Hilfe.
- **Stummel unter der Schulter.** Unter der linken Schulter bleibt ein Stummel. Das Gewehr ist vorn ohne Halt, die rechte Hand ist noch eine vollständige Hand.

### Bein rechts

- **Standbein als Stumpf.** Mitten am Oberschenkel endet das Standbein. Gewicht hat auf dieser Seite keinen langen Knochen mehr, das Spielbein bleibt zum Schritt und ersetzt den Stand nicht.
- **Scharnier ohne Sperre.** Das rechte Knie ist ein Scharnier, das nie wieder sperrt. Das Bein knickt unter Last und wird das immer tun.
- **Schienbein in Splittern.** Das rechte Schienbein trägt keinen Tritt mehr und wird keinen tragen. Auftreten auf dieser Seite ist vorbei.
- **Pfanne leer.** Die rechte Hüfte hat keine Pfanne mehr, das Bein hängt ohne Gelenk. Stand und Drehung im Anschlag sind auf dieser Seite zu Ende.
- **Fuß ohne Standpunkt.** Der rechte Fuß ist fort. Es gibt keinen Punkt mehr, auf den dieses Bein das Gewicht stellt.
- **Säule wächst nicht zu.** Der Knochen des Standbeins ist in der Länge unterbrochen und wird keine tragende Säule mehr. Das Bein faltet unter dem Körper und bleibt so.
- **Stilles Standbein.** Das Standbein ist vollständig gelähmt und bleibt es. Es meldet nichts und stellt sich nicht, das Spielbein ist davon nicht gelähmt.
- **Knie in der Beuge fest.** Das rechte Knie steht dauerhaft in der Beuge. Weder ein gestreckter Stand noch ein Tritt sind auf diesem Bein möglich.
- **Unterschenkel ohne Ferse.** Der Unterschenkel des Standbeins ist ein Stumpf ohne Ferse. Balancieren auf dieser Seite ist vorbei.
- **Unbewegte Masse.** Das Standbein ist eine unbewegte Masse und dauerhaft tot. Es lässt sich nicht setzen und nicht wegklappen, es hängt im Weg.

### Bein links

- **Schrittbein zu Ende.** Mitten am Oberschenkel ist das Spielbein zu Ende. Der Stumpf reicht nicht nach vorn, das Standbein bleibt zum Stehen und ersetzt den Schritt nicht.
- **Ausfallknie platt.** Das linke Knie ist im Ausfall zerquetscht und beugt sich nie wieder. Ein vorderer Schritt hat kein Gelenk.
- **Vorderfuß fort.** Der Fuß, der die Stufe und die dunkle Kante suchen würde, ist weg. Diese Seite beginnt keinen Absatz mehr.
- **Schleifende Hüfte.** Die linke Hüfte hat kein Gelenk mehr, das Bein schleift und wird das immer tun. Nach vorn kommt es aus eigener Kraft nicht.
- **Vorderer Stumpf.** Der Unterschenkel des Spielbeins ist ein Stumpf. Das Nach-vorn-Setzen eines Fußes ist auf dieser Seite vorbei.
- **Länge ohne Muskel.** Der Muskel, der die Schrittlänge gemacht hat, ist fort. Der Knochen mag noch da sein, ein langer Schritt kommt aus diesem Oberschenkel nicht wieder.
- **Bleibt liegen.** Das Spielbein ist gelähmt und bleibt hinter jedem Tritt liegen. Es lernt das Führen nicht zurück, das Standbein steht noch.
- **Fuß ohne Abrollen.** Knöchel und Fuß des Spielbeins sind eine unbewegte Masse. Sie suchen keine Kante und rollen keinen Absatz ab.
- **Ende in der Leiste.** Das Spielbein endet in der Leiste. Auf dieser Seite ist nichts mehr da, was man nach vorn setzen könnte, das Standbein ist noch ein Bein.
- **Steifer Stock.** Das linke Bein steht dauerhaft steif nach vorn, nicht zu heben und nicht unter den Körper zu holen. Es sperrt den Gang, statt ihn zu führen.

## Ausrüstung und Cyberware

Noch nicht umgesetzt. Keine Regel. Nach dem Treffer auf eine Zone wird getrennt geprüft, ob Ausrüstung oder Cyberware in derselben Zone mitgetroffen wird. Gesund löst keine Prüfung aus, und sehr leicht streift höchstens die Oberfläche. Die Chance und die Folge steigen mit der Stufe: leicht verhakt oder beschmutzt, mittel verbeult oder verklemmt, schwer verdirbt oder reißt ab, kritisch wird sehr wahrscheinlich mitgenommen. Zerstört nimmt das Stück mit, sofern es nicht vorher fallengelassen wurde. Liegt in der Zone nichts, entsteht kein Ausrüstungsschaden.

Die Sätze im Vorrat dürfen sagen, dass eine verletzte Hand die Waffe nicht mehr führt. Das ist die Körperfolge. Ein Schaden am Stück selbst kommt nur aus dieser getrennten Prüfung.

### Was heute am Körper liegt

Die Papierpuppe aus [`docs/decisions/0033-papierpuppen-inventar.md`](decisions/0033-papierpuppen-inventar.md) bleibt die Lage. Dieses Dokument verschiebt nichts.

- **Arm rechts und Arm links.** Die Hände tragen Gewehr oder Pistole. Das Gewehr belegt beide Hände und liegt damit in beiden Armzonen, solange es gehalten wird. Die Pistole liegt nur in der Hand, die sie hält. Ein Treffer an einem Arm kann diese Waffe betreffen. Ein zerstörter Arm kann das Gewehr unbenutzbar machen, ohne dass die andere Hand verschwindet.
- **Torso.** Der Gürtel trägt das Medkit, wenn es dort liegt. Der Rücken trägt Magazine und kann Gewehr oder Pistole tragen, wenn sie abgelegt sind. Gürtel und Rücken sind keine eigenen Trefferzonen.
- **Kopf, Bein links, Bein rechts.** Dort liegt heute keine Ausrüstung. Ein Treffer erzeugt dann keinen Ausrüstungsschaden.

Liegt das Gewehr auf dem Rücken, bedroht ein Armtreffer es nicht. Liegt die Pistole in der linken Hand, gehört sie zur linken Armzone und nicht automatisch zum Waffenarm dieser Lesekonvention.

### Was nur gedacht ist

Cyberware gibt es im Spiel nicht. Nichts davon wird hier eingebaut. Eine spätere Prüfung träfe sie nur, wenn ein Stück in der Zone wirklich säße. Sonst ist die Zone in diesem Punkt leer.

- **Kopf.** Optik, etwa ein Augenersatz oder ein Visier, das im Kopf sitzt.
- **Torso.** Ein Rumpfimplantat unter Brust oder Rücken, verschieden vom Gürtel und von den Magazinen.
- **Arm links und Arm rechts.** Je ein Unterarmstück, getrennt, weil die Arme getrennt sind.
- **Bein links und Bein rechts.** Je ein Beinstück, getrennt, weil die Beine getrennt sind.

### Qualitative Bänder

- **Gesund.** Keine Prüfung.
- **Sehr leicht.** Höchstens die Oberfläche. Lack, Stoff oder ein Gurt wird warm oder streifig, das Stück arbeitet wie vorher.
- **Leicht.** Das Stück kann sich lockern, beschmutzen oder kurz verhaken und bleibt in der Regel benutzbar.
- **Mittel.** Das Stück kann verbeulen, ein Gehäuse kann anbrechen, etwas kann durchnässen oder verklemmen. Instandsetzen ist noch denkbar.
- **Schwer.** Das Stück in der Zone kann in der Funktion verderben oder vom Körper reißen. Nicht jedes Stück ist dann noch zu retten. Die Versorgung der Wunde kann Schlimmeres am Körper aufhalten und rettet das Stück nicht von selbst.
- **Kritisch.** Was in der Zone liegt, wird sehr wahrscheinlich unbrauchbar oder weggerissen.
- **Zerstört.** Das Stück geht mit dem Teil mit, sofern es vorher nicht fallengelassen wurde. Eine leere Zone hat auch dann nichts, was mitgehen könnte.

Ein Gewehr in beiden Händen kann von jedem der beiden Arme aus mitgeprüft werden. Verliert eine Seite die Hand, bleibt die andere Hand, und das Gewehr ist ohne die fehlende Seite nicht führbar. Eine Pistole geht nur mit der Hand mit, die sie hält.

### Vorschlag für Wahrscheinlichkeiten, keine Regel

> **Vorschlag, keine gültige Regel.** Pro Stück, das in der getroffenen Zone liegt: sehr leicht 5 von 100 und dann nur Oberfläche, leicht 15 von 100, mittel 35 von 100, schwer 60 von 100, kritisch 85 von 100. Zerstört nimmt jedes noch dort liegende Stück mit. Gesund würfelt nicht. Eine Zone ohne Stück würfelt nicht. Diese Zahlen sind nicht beschlossen und stehen nicht in den 360 Varianten.
