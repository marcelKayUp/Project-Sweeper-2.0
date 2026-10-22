# 0010 – Variable BSP-Grundrisse und Einbettung vorgegebener Raumgraphen

Status: entschieden für den beauftragten Generatorausbau  
Datum: 21.10.2026

Fortgeschrieben durch [0011](0011-bedarfsbasiertes-raumprogramm.md): Version 3 ersetzt die festen zwölf Raumslots und den festen Laborzyklus durch ein bedarfsabhängiges Programm mit geschützten Laborgruppen. Das Suchbudget steigt auf höchstens 32 örtliche Räume und verwendet für alle Familien maximal 12.000 Platzierungsversuche je Flächenentwurf. Die folgende Beschreibung dokumentiert Version 2.

## Anlass

Nach der Prüfung freier GitHub-Bausteine hat der Nutzer die empfohlene Umsetzung beauftragt: BSP für variable Büro-/Lagergrundrisse und eine Untersuchung/Umsetzung des graphbasierten Edgar-Ansatzes. Damit wird die feste 4×3-Geometrie aus [0009](0009-semantischer-gebaeudegenerator.md) ersetzt. Die übrigen Grenzen von 0008/0009 bleiben erhalten: vier Runner, ein Geschoss, Datenraub, keine Ausweitung zur Kampagne und keine behauptete menschliche Spielabnahme.

## Quellen und tatsächliche Übernahme

Aus [halftheopposite/bsp-dungeon-generator](https://github.com/halftheopposite/bsp-dungeon-generator/tree/ca8c5b4cb3df2bde2b269e59433cc0f93e6406c5) wird die horizontale/vertikale Rechteckteilung aus `splitContainer` angepasst. Die neue Fassung verwendet unveränderliche Rechtecke, eine reservierte Wandzelle und lokale Zufallsströme. Globales `Math.random`, `seedrandom`-Seiteneffekte, `nanoid`, Renderer und Assets werden nicht übernommen. Der vollständige MIT-Text und die genaue Herkunft stehen in [THIRD_PARTY_NOTICES.md](../../packages/generator/THIRD_PARTY_NOTICES.md) und [halftheopposite-MIT.txt](../../packages/generator/licenses/halftheopposite-MIT.txt).

[Edgar-DotNet](https://github.com/OndrejNepozitek/Edgar-DotNet/tree/258c83a88656bd6095255a1b749232ade2b87589) liefert das Entwurfsprinzip „Raumgraph plus erlaubte Türanschlüsse“. Die Einbettung ist eine eigene TypeScript-Implementierung; sie kopiert keinen Edgar-Code und benötigt keine .NET-Laufzeit. Polygonräume, Simulated Annealing und die vollständige Edgar-Bibliothek sind nicht implementiert. Zusätzliche Laufzeitabhängigkeiten sind nicht nötig.

Die MIT-Lizenz ist in der Werkstatt sichtbar und wird zusätzlich als `THIRD_PARTY_NOTICES.txt` in den Generatorbuild geschrieben. Der normale Spielbuild importiert die Werkstatt weiterhin nicht.

## Layoutverfahren

**BSP für Konzernbüro und Fabrik/Lager:** Der Innenraum wird rekursiv in exakt zwölf Rechtecke geteilt. Jede Teilung reserviert eine Wandzelle; Blattflächen besitzen mindestens drei Zellen je Seite, mindestens zwölf Zellen Fläche und ein Seitenverhältnis von höchstens 3:1. Vorausschau prüft, ob die verbleibende Raumzahl noch geometrisch teilbar ist. Die mögliche Teilungsmenge ist durch maximal 30×30 Innenzellen und fünfzehn Blätter begrenzt; dieser Schnitt verwendet zwölf.

Anschließend werden die bekannten Funktionen mit einem begrenzten Suchlauf an Flächen gebunden. Empfang und Anlieferung liegen außen. Reguläre Zugänge bleiben verbunden, öffentliche Räume führen nicht direkt in Hochsicherheit, Personal- und Logistikwege benötigen keinen Hochsicherheitsdurchgang. Eine physisch vorhandene, entbehrliche Verbindung wird zur hackbaren Abkürzung. Zwei andere unabhängige Übergangsfolgen zum Serverraum bleiben verfügbar.

**Graph-Einbettung für das Labor:** Vor der räumlichen Zuordnung steht ein versionierter Graph mit einem Missionszyklus, Sicherheitsübergängen, einer Schleuse und ihrem einzigen Reinraumzugang fest. Eine Suche ordnet die zwölf semantischen Knoten BSP-Flächen zu. Jede vorgegebene Kante benötigt einen gemeinsamen möglichen Türanschluss. Es werden nur die vorgegebenen Übergänge geöffnet; weitere geometrische Nachbarschaften bleiben Wände. Dadurch können alternative Wege erhalten bleiben, ohne die Schleuse zu umgehen.

Die Suche wählt den noch unplatzierten Raum mit den wenigsten zulässigen Flächen, berücksichtigt erforderliche Nachbarzahlen und prüft bereits gebundene Türbeziehungen. Kandidaten und Gleichstände verwenden stabile, lokal gesäte Reihenfolgen. Es gibt höchstens 12.000 Platzierungsversuche pro Laboreinbettung; Büro/Fabrik prüfen höchstens 96 vollständige Funktionszuordnungen pro Flächenentwurf.

## Begrenzung, Prüfung und Versionen

Ein Gesamtversuch untersucht höchstens vier dokumentierte BSP-Flächenentwürfe. Nach höchstens zehn Gesamtversuchen folgt ein erklärter Fehler; ein Rückfall auf das alte Raster findet nicht statt. Verworfene Flächenentwürfe sind Layoutsuche, keine erfolgreich erzeugten Gebäude. Ihre Anzahl, Gründe und Suchknoten bleiben im Paket nachvollziehbar. Derselbe kleine Suchauftrag kann reproduzierbar scheitern, während ein höheres Versuchsbudget eine Lösung findet.

Zwei Missionswege werden über ganzzahligen maximalen Fluss mit Kapazität eins pro Übergang gefunden und anschließend als konkrete Pfade ausgegeben. Ein früher gefundener Weg darf während der Suche umgeleitet werden. So hängt die Annahme nicht von einer zufällig ungünstigen ersten kürzesten Route ab.

Die unabhängige Validierung prüft zusätzlich den gesamten BSP-Teilungsbaum gegen die Raumrechtecke und das Labor gegen seinen deklarierten Graphen. Die bisherigen Zell-, Schleusen-, Versorgungs-, Missions- und Ressourcenprüfungen bleiben bestehen. Die Ansicht zeigt BSP-Schnittlinien, das tatsächlich verwendete Layoutverfahren und den Suchbericht.

Die Generatorversion lautet `semantic-building/2`, das Gebäudepaket hat `formatVersion: 2`. Programm-, Grundriss- und Topologiestufen erhalten jeweils Version 2. Kampf-/Bot-RNG bleiben unberührt. Alte Pakete werden nicht still unter der neuen Version rekonstruiert; weiterhin gibt es keinen Import fremder Pakete in das Werkzeug oder den normalen Missionsclient.

WFC wird in diesem Auftrag nicht vorgezogen. Es bleibt ein späteres Ausstattungsverfahren. Freie Gebäudehüllen, polygonale Räume, weitere Raumanzahlen, physische Leitungen und mehrere Geschosse sind ebenfalls offen.

Ausgeführte Prüfungen und Berichte stehen in [GEBAEUDEGENERATOR.md](../GEBAEUDEGENERATOR.md).
