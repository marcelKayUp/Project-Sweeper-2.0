# 0012 – Konzernidentität und Büroorganisation im Gebäudegenerator

Status: technischer Generatorausbau dokumentiert; die vier Konzernentwürfe sind seit 22.10.2026 verworfen, siehe [0019](0019-bisherige-konzernentwuerfe-verworfen.md).  
Datum: 21.10.2026

Der Nutzer hat KASANE, CONCORD, PARALLAX und VERDANT ausdrücklich als Weltgrundlage verworfen. Die folgenden Namen/Profile beschreiben den bisherigen Implementierungsstand und historische Nachweise. Sie sind keine Grundlage für neue Inhalte. Büroorganisation, Bedarfsplanung und geometrische Prüfungen bleiben davon unabhängig; die technische Ablösung des Katalogs ist gesondert umzusetzen.

## Auftrag und Grenzen

Der Nutzer beauftragt die zuvor besprochenen kulturell geprägten Megakonzerne und ihre Corporate Identity im Generator. Der Ausbau ergänzt die Bedarfsplanung aus [0011](0011-bedarfsbasiertes-raumprogramm.md) um Organisation, Büroformen, funktionale Nachbarschaften und eine erkennbare Ausstattung. Die Konzernprofile sind eigene fiktive Gründungsgeschichten; sie weisen realen Nationalitäten keine festen Eigenschaften zu.

Die Mission bleibt ein Datenraub mit vier Runnern und sechs Gegnern auf einem Geschoss. CEO, Leitung, Assistenz und Teams sind Arbeitsplatzrollen im Raumprogramm, keine zusätzlichen NPCs oder Befehle. Reguläre Zugangskontrolle bleibt eine semantische Gebäudeeigenschaft. Verbindliche Laufzeitsperre ist weiterhin ausschließlich die vorhandene hackbare Abkürzung. Zusätzliche Fraktionsregeln, Überwachungsmechaniken, Kampagne, WFC und mehrere begehbare Geschosse entstehen nicht.

## Versionierte Profile

`src/corporate.ts` enthält Namen, Herkunft, Gründungsgeschichte, Versprechen, Widerspruch, Zeichen, Palette, Oberflächen und Kapazitätsannahmen:

- **KASANE GROUP, Osaka/Singapur:** familienkontrollierte Robotik/Infrastruktur; Präzision und Beständigkeit. Drei Teamplätze pro Gruppenbüro, vier Plätze pro Besprechungsraum. Sicherheit muss an den Einstieg anschließen; die Geschäftsführung liegt hinter Assistenz beziehungsweise Zugangsverteiler. Graphit, Elfenbein, warme Metallakzente, Stein und privilegierte Holzoberflächen mit linearem Muster.
- **CONCORD SYSTEMS, Rhein/Benelux:** Energie-/Automatisierungskonsortium; Standards und lückenlose Erfassung. Vier Teamplätze je Büro, acht je Besprechung; Technik muss an den Verkehrsverteiler anschließen. Modulare Raster, kühle Akzente, Teppich und metallische Nebenräume.
- **PARALLAX NETWORK, Kalifornien/Seoul:** Medien-/Identitätsplattform; offene Bühne vor abgeschirmter Datenmacht. Acht Teamplätze je offener Teamfläche, sechs Besprechungsplätze. Besprechung beziehungsweise Begegnungsraum muss am Einstieg liegen. Rückzugsräume ergänzen offene Arbeitsflächen; Kunstharz und Leiterbahnmuster prägen die Darstellung.
- **VERDANT COMMONS, Nairobi/São Paulo/Stockholm:** Biotechnologie und ökologische Wiederherstellung; Fürsorge nach Status. Sechs Teamplätze je offener Teamfläche, vier Besprechungsplätze. Ein Gemeinschaftsgarten mit mindestens 20 beziehungsweise 24 Rasterfeldern muss an den Verkehrsverteiler anschließen. Holz, grüne Akzente und Blattmuster.

`neutral` ist der ungebundene Referenzbetrieb. Er bewahrt das bisherige Kapazitätsmodell ohne zusätzliche Konzernhierarchie und bleibt der API-Standard. Die Werkstatt startet dagegen mit KASANE, Hauptsitz, Büro, Standardfläche und 16 Arbeitsplätzen, damit die neue Organisation unmittelbar sichtbar ist. Es gibt weiterhin keine Zusage, dass jeder Bedarf in jede Flächengröße passt.

## Konfiguration und Organisation

Sechs normalisierte, zur Laufzeit geprüfte Parameter gehören zum Export:

- `corporation`: `neutral`, `kasane`, `concord`, `parallax`, `verdant`; API-Standard `neutral`.
- `siteRole`: `headquarters`, `branch`, `operations`; API-Standard `branch`.
- `department`: `mixed`, `finance`, `legal`, `engineering`, `service`; Standard `mixed`.
- `statusTier`: `executive`, `staff`, `contractor`; Standard `staff`.
- `buildingHistory`: `purpose-built`, `converted`; Standard `purpose-built`.
- `condition`: `pristine`, `worn`, `patched`; Standard `pristine`.

Ein Hauptsitz mit mindestens sechs Arbeitsplätzen kann einen örtlich vertretenen CEO benötigen. Niederlassungen und Betriebsstandorte bekommen kein CEO-Büro. Leitungsplätze folgen ungefähr zwölf, im Betriebsstandort 16 Arbeitsplätzen pro Leitung; die Zahl bleibt durch die tatsächlich vorhandenen Plätze begrenzt. Örtlich vertretene Geschäftsführung erhält, soweit ein weiterer Arbeitsplatz vorhanden ist, eine Assistenz. **Leitung und Assistenz werden von den vorhandenen Arbeitsplätzen abgezogen.** Der Rest bildet das Teamprogramm. Außenbedarf wird separat ausgewiesen; die Summe örtlicher und äußerer Rollen bleibt exakt erhalten.

Im Missionsgeschoss liegt die Geschäftsführung bei `statusTier: executive` örtlich; auf Personalgeschossen wird sie dem vorhandenen Außenbedarf zugeordnet. Fehlen entsprechende Außenplätze, wird keine zusätzliche CEO-Stelle erfunden. Das ist eine vereinfachte Raumplanung, kein vollständiges Personalverzeichnis.

`legal` begrenzt Teamräume auf zwei Plätze, `finance` auf höchstens drei. Diese Bereiche erhalten vertrauliche Zweiergesprächsräume; offene Teamflächen ebenfalls. Pro angefangenen zwölf Arbeitsplätzen wird dafür ein Gesprächsraum geplant. Die Geschäftsführung bekommt einen Vorstandssaal mit acht Besuchsplätzen; diese erzeugen keine weiteren Büroarbeitsplätze. Abteilungsleitung und Team müssen mindestens über das erste zugeordnete Raumpaar unmittelbar benachbart sein. Weitere Leitungsinstanzen sind kapazitätsbezogen, ohne vollständigen Abteilungsorganigramm-Solver.

Ausgelagerte Bereiche erlauben bei nicht vertraulicher Arbeit zwei zusätzliche Teamplätze pro Büro und günstigere Oberflächen. Repräsentative Bereiche begrenzen Teamräume auf höchstens drei Plätze. Ein Bestandsumbau erhält einen zusätzlichen örtlichen Verkehrsverteiler. Das modelliert einen konkreten Erschließungsrest, keine Rekonstruktion eines historischen Gebäudes.

## Räume, Beziehungen und Geometrie

Neue Raumtypen: Geschäftsführung, Abteilungsleitung, Assistenz, Vorstandssaal, vertrauliches Gespräch und Gemeinschaftsgarten. Zusammen mit den bisherigen Typen umfasst der Katalog 24 Funktionen. Jeder Raum nennt Arbeitsrolle, Büroform, Abteilung, Zugang und Erscheinungsbild.

`building.relationships` enthält tatsächliche Pflichtnachbarschaften mit Begründung und gegebenenfalls exklusivem Zugang. Sie werden zusammen mit den vorhandenen Labor-/Schleusenpaaren vor der Rasterzuordnung gebildet. Die Geschäftsführung besitzt nur den ihr zugeordneten Assistenz-/Verteilerzugang. Besprechungs- und Vorstandsräume bleiben unterschiedliche Kapazitätsbedarfe. Vertrauliche Gesprächsräume und Sanitärgruppen sind keine Durchgangsräume. Öffentliche Räume führen nicht direkt in eingeschränkte oder exklusive Bereiche. Pflichtbeziehungen dürfen nicht zur geschlossenen Missionsabkürzung werden.

Die BSP-Stufe kann ab 24 Räumen ungleiche Flügel mit ungefähr einem Viertel bis drei Vierteln der Raumzahl bilden. Kleinere Teilprogramme behalten die ausgeglichene Strategie. Dadurch lässt sich beispielsweise das Legal-Programm mit 31 Räumen auf 32×28 einbetten; die frühere strikt halbierende Teilung scheiterte daran trotz ausreichender Gesamtfläche. Ganzzahlige Maße, Mindestflächen, Wandabstand, höchstens 32 örtliche Räume, 12.000 Platzierungsversuche je Entwurf, vier Entwürfe und zehn Gesamtversuche bleiben bestehen. Fehlversuche entfernen keine Pflichtfunktion.

## Darstellung und Trennung von Spielregeln

`building.identity` enthält das aufgelöste Konzernprofil einschließlich Architekturparametern. Räume besitzen `appearance` mit Oberfläche, Farben, Muster, Lichtstimmung und Zustand. Die Werkstatt zeigt Konzernmaterialien oder Funktionszonen; dieselben Oberflächen werden in der primitiven Babylon-Vorschau verwendet. Arbeitsplatzproxies, Tische, Pflanzen, Oberflächenlinien und Reparaturspuren sind eigene prozedurale Formen ohne externe Grafikassets.

Dekoration erzeugt keine Kollision, Deckung oder Sichtregel. Die vorhandene gerichtete Deckung bleibt explizit in `MissionSpec.lowCover`. Der Erhaltungszustand wird nur dem Dekorations-Zufallsstrom zugeführt. `pristine` → `patched` verändert bei sonst identischer Anfrage keine Raumgeometrie, Übergänge, Gegner, AP oder Missionsdaten. Das Paket und seine kosmetischen Angaben bekommen einen anderen Hash. Materialien und Oberflächenlinien sind die erste Darstellung dieser Identitäten, keine vollständigen Architektur-/GLB-Assets; Fassaden und räumliche Hüllen bleiben offen.

## Versionen und Nachweise

Generator `semantic-building/4`, Content `building-catalog/3`, Paketformat 4, Programm-/Grundriss-/Topologiestufen 4 und Dekorationsstufe 2. Alte Paketversionen werden nicht still neu interpretiert. Alle Konzernparameter werden im CLI- und Browserexport gespeichert. Der Validator berechnet Identität, Kapazitäten, Arbeitsplatzbilanz, Materialien und Beziehungen aus der Konfiguration neu und prüft die tatsächliche Geometrie dagegen.

Keine neue externe Abhängigkeit und keine geänderte Simulationsregel. Der bestehende Workspace-Link des parallel ergänzten Sichtservers wurde aus dessen vorhandenem Manifest offline installiert und im Lockfile nachvollzogen. Die bekannten MIT-Hinweise zur BSP-Rechteckarithmetik bleiben bestehen. Ausgeführte Prüfungen stehen in [GEBAEUDEGENERATOR.md](../GEBAEUDEGENERATOR.md). M7 und menschliche Architektur-/Spielabnahme bleiben offen.
