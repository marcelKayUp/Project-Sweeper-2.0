# Semantischer Gebäudegenerator

Inhaltsentscheidung vom 22.10.2026: Die hier noch beschriebenen KASANE-/CONCORD-/PARALLAX-/VERDANT-Profile sind als Weltgrundlage verworfen. Ihre technische Ablösung steht aus; vorhandene Beispiele und Nachweise dokumentieren den bisherigen Katalog. Siehe [0019](decisions/0019-bisherige-konzernentwuerfe-verworfen.md).

Stand: 23.10.2026. Generatorversion `semantic-building/7`, Content `building-catalog/5`, Gebäudepaketformat 7. Grundfläche und Personal bestimmen die Etagenzahl, höchstens vier. Empfang, Server, Anlieferung, Geschäftsführung, Vorstand, Archiv und Gemeinschaftsgarten gelten einmal je Gebäude. Die übrigen Funktionen gelten je Etage. Die gezeichnete Platte ist eine Etage; weitere Etagen wiederholen sie. Ab der zweiten Etage liegen Treppe und familieneigener Aufzug auf dem Flur. Siehe [0040](decisions/0040-grundflaeche-personal-und-etagen.md) und [0038](decisions/0038-etagen-treppen-und-aufzuege.md). Beauftragter Schnitt von GEN-00/02/03/04/11 und S23; kein Abschluss von M7. Abgrenzungen: [0009](decisions/0009-semantischer-gebaeudegenerator.md), Layout [0010](decisions/0010-bsp-und-graph-grundrisse.md), Bedarf [0011](decisions/0011-bedarfsbasiertes-raumprogramm.md), Konzernidentität [0012](decisions/0012-konzernidentitaet-und-bueroorganisation.md), Flure/Sanitärwege [0014](decisions/0014-flurerschliessung-und-sanitaerwege.md).

## Lokal starten

Im Projektordner mit der vorhandenen Node-24-/pnpm-Toolchain:

```powershell
corepack pnpm install --offline
corepack pnpm dev:generator
```

Die Werkstatt öffnet `http://127.0.0.1:5174/generator.html`. Familie, Flächenbudget, Betriebsprofil, Ausschnitt und Seed wählen und „Grundriss erzeugen“ drücken. Eine bereits laufende Werkstatt kann auf einem anderen Port liegen. „Profilwerte für Fläche laden“ übernimmt die Annahmen für Familie/Größe; ein bloßer Flächenwechsel verändert die Belegung nicht. Unter der Vorschau steht die Bedarfsherleitung auch bei Platzmangel. Geänderte Parameter sperren den Export eines alten Entwurfs.

Die Werkstatt startet mit KASANE, Hauptsitz und einem Büro auf Standardfläche mit 16 Arbeitsplätzen. Oben stehen Konzern, Standortrolle, Abteilung, Ausstattungsniveau, Baugeschichte und Zustand. Die Herkunft beschreibt eine fiktive Gründungsgeschichte. „Architekturwirkung“ springt zu den Regeln und Pflichtnachbarschaften. Raumdetails zeigen Arbeitsrolle, Büroform, Abteilung, regulären Zugang und Material. „Konzernmaterialien“ wechselt in 2D/3D zwischen Ausstattung und Funktionszonen. Reparaturspuren und Möbelproxies haben keine Regelwirkung.

Räume lassen sich anklicken oder mit Tab und Enter auswählen. Die Raumdetails zeigen zugewiesenen Bedarf, Kapazität und Mindestfläche. Grundriss und Raumgraph zeigen Missionswege, ein Versorgungsnetz, die Raumstreifenschnitte oder den tatsächlichen Sanitärweg des ausgewählten Raums. Die Prüfung nennt Flurfeldzahl und gemessenen CEO-Weg. Unter „Layout“ stehen Verfahren, Flächenentwurf und Suchbericht. In 3D drehen die Schaltflächen die Kamera in 90°-Schritten; das Mausrad zoomt.

Ohne Browser erzeugen:

```powershell
corepack pnpm generate:building --seed 42 --family laboratory --size compact
corepack pnpm generate:building --seed 42 --family office --size standard --occupants 24 --workplaces 24 --storageUnits 8
corepack pnpm generate:building --seed 42 --family office --size standard --occupants 24 --workplaces 24 --storageUnits 8 --scope mission-floor --floorShare 50
corepack pnpm generate:building --seed 42 --family office --size standard --corporation kasane --siteRole headquarters
corepack pnpm generate:building --seed 42 --family office --size large --corporation parallax --siteRole branch --department engineering --statusTier contractor --buildingHistory converted --condition patched
```

Ausgabe: `artifacts/generator/<familie>-<größe>-<seed>-<hash8>.building.json` und die zugehörige `.mission.json`; die CLI nennt die konkreten Namen. Unterschiedliche Profile mit demselben Seed erhalten unterschiedliche Hashanteile. Dieselbe vollständige Konfiguration überschreibt ihre erzeugten Dateien. Die CLI schreibt ausschließlich in den Generator-Artefaktordner dieses Projekts.

## Eingaben

- `seed`: Ganzzahl 0 bis 4294967295; keine Zeit- oder ungespeicherte Zufallsquelle.
- `family`: `office`, `laboratory`, `factory`.
- `size`: `compact` (28×24), `standard` (32×28), `large` (32×32); Standard `compact`.
- `crewSize`: ausschließlich 4; Standard 4.
- `mission`: ausschließlich `data-heist`; Standard `data-heist`.
- `instanceId`: 1–48 Kleinbuchstaben/Ziffern/Bindestriche; Standard `preview`.
- `maxAttempts`: 1–10; Standard 10. Danach erklärter Fehler, kein Rückfall.
- `occupants`: gleichzeitig anwesende Beschäftigte im ganzen Betrieb, 1–96.
- `workplaces`: gleichzeitig belegte Büroarbeitsplätze, 0–96, höchstens `occupants`; beim Büro mindestens 1.
- `processUnits`: Labor-/Produktionsplätze, 1–48; beim Büro genau 0.
- `storageUnits`: abstrakter Lager-/Versorgungsbedarf, 1–96.
- `scope`: `building` (Standard) oder `mission-floor`.
- `floorShare`: Anteil des Bedarfs im spielbaren Missionsgeschoss, 1–100; Standard dort 50. Beim ganzen Gebäude genau 100.
- `corporation`: `neutral` (API-Standard), `kasane`, `concord`, `parallax`, `verdant`.
- `siteRole`: `headquarters`, `branch` (Standard), `operations`.
- `department`: `mixed` (Standard), `finance`, `legal`, `engineering`, `service`.
- `statusTier`: `executive`, `staff` (Standard), `contractor`.
- `buildingHistory`: `purpose-built` (Standard), `converted`.
- `condition`: `pristine` (Standard), `worn`, `patched`; ausschließlich kosmetischer Einfluss.

Fehlende Profilfelder bekommen die Werte des Familien-/Größenprofils: 8/16/24 Anwesende für kompakt/standard/groß. Büroarbeitsplätze entsprechen beim Büro dieser Belegung, bei Labor/Fabrik einem Viertel. Prozessplätze dort: die halbe Belegung; Lagerbedarf: im Büro/Labor die halbe, in der Fabrik die ganze Belegung. Eigene Profilfelder ersetzen einzelne Vorgaben und müssen zusammen gültig sein. Die vier Runner und sechs Gegner bleiben davon unabhängig.

Unbekannte Parameter, nicht ganzzahlige Seeds und unpassende Crewgrößen werden vor der Erzeugung abgewiesen. Der interne Contentkatalog ist versioniert; es gibt keinen Import ausführbarer Regeln.

## API und Export

```ts
import { generateBuilding, validateBuilding } from "@neon/generator";

const result = await generateBuilding({ seed: 42, family: "laboratory" });
if (result.ok) {
  const { building, mission, config } = result.package;
  const report = validateBuilding(building, mission, config);
  // mission erfüllt den vorhandenen MissionSpec-Vertrag aus @neon/sim.
}
```

`generateBuilding` nimmt unbekannte Eingaben entgegen und prüft sie zur Laufzeit. `validateBuilding` prüft typisierte interne Daten; es ist kein JSON-Parser. Beide verändern ihre Eingaben nicht. Die Erzeugung ist wegen SHA-256 über Web Crypto asynchron, verwendet aber keine zeitabhängigen Entscheidungen, Netzwerkzugriffe oder Node-IO. Die Simulationsregeln bleiben synchron.

Das Gebäudepaket enthält Parameter, Generator-/Content-/Stufenversionen, Seeds, Versuchsberichte, Raumprogramm, Raumrechtecke, Übergänge mit Portalen, Zugänge, Missionsgraph, vier Versorgungsgraphen, kosmetische Platzierungen und Validierungsbericht. `building.layout` nennt die Flurerschließung (`circulation`, Vorlage `double-loaded-loop/1`), lokale Seeds, angenommene/verworfene Entwürfe, Suchknoten, Rückschritte und die Schnitte innerhalb der Raumstreifen. `mission.hash` prüft die vollständigen Missionsdaten ohne dieses Hashfeld. `hash` prüft das vollständige Paket ohne sein äußeres Hashfeld. Beide sind SHA-256 der kanonischen Serialisierung. Ein alter Seed ohne seine Paket-/Generatorversion rekonstruiert keinen alten Entwurf.

Seit Format 3 enthält das Paket `building.demand` (Gesamt-/Orts-/Außenprofil, Mindestflächen, Flächenbudget und Kabinenzahlen), das ausführliche `building.program` und Kapazität/Bedarfszuweisung je Raum. Programmzeilen enthalten örtliche und äußere Raumzahlen, erforderliche Einheiten, Kapazität je Raum und insgesamt, Mindestflächen und Begründung. Raum-IDs enthalten Typ und laufende Nummer. Generatorfehler enthalten `demand` mit dem vollständigen berechneten Programm; bei ungültiger Konfiguration ist es `null`.

Format 4 ergänzt `building.identity`, deklarierte `building.relationships` und die Raumattribute `workplaceRole`, `officeForm`, `department`, `access`, `appearance`. Die Pflichtnachbarschaften einschließlich exklusiver Zugänge werden gegen die tatsächlichen regulären Verbindungen geprüft. Alte Pakete werden nicht still als Format 4 rekonstruiert. Der API-Standard `neutral` hält das Referenzprogramm ohne zusätzliche Hierarchie verfügbar; der Generator-/Formatwechsel verändert dennoch Versionen, Seeds und Hashes.

Format 5 ergänzt `building.circulation` (eigene begehbare Flurfelder), stabile `hall-x-y`-Knoten mit `passage`-Kanten und `maxDistance` für kurze Unterstützungsbeziehungen. Flure zählen getrennt von Programm-/Arbeitsräumen. `minimumCirculationArea` steht in der Bedarfsbilanz; `corridorCells` und `executiveSanitaryDistance` im Prüfbericht. Die WC-Kapazität bleibt aus der Belegung abgeleitet; der nahe Leitungsstandort erzeugt keine zusätzliche oder doppelt gezählte Gruppe. Siehe [0014](decisions/0014-flurerschliessung-und-sanitaerwege.md).

Die Missionsausgabe enthält Rastermaße, Wände, gerichtete niedrige Deckung, Terminal, Abkürzung, Extraktion, vier Runner und sechs Gegner mit vorhandenen Waffen-/Patrouillenverträgen. Die Namen „Wache“ und „Flanker“ erzeugen keine neuen Policies; ausgeführt wird der vorhandene Resolver. `?stueck=sicht` zeigt diese Karte in derselben Babylon-Ansicht wie `?stueck=raster`. Die Adresse ohne Parameter ist seit [0039](decisions/0039-testeinstieg-aus-der-sitemap.md) die Prüfliste. Der Spielserver erzeugt sie über `generateBuilding`, prüft die Züge und sendet nur die Teamsicht. Weitere Taktikarbeit an dieser Karte setzt diese Fassung fort, siehe [0013](decisions/0013-isometrische-fortsetzung.md) und [0024](decisions/0024-ein-start-fuer-die-testmission.md). Der DOM-Missionsbildschirm lädt die Dateien noch nicht. Rasterraum und Ghost Floor bleiben unverändert.

## Prüfungen und Grenzen

Die Reihenfolge lautet Konzernidentität/Standort → Organisation/Betriebsprofil → Kapazitäten → Raumzahl/Mindestflächen → Flurnetz/Raumstreifen → Taktik → Darstellung/Prüfung. Beim neutralen Referenzbetrieb ergeben 24 Büroarbeitsplätze / vier Plätze je Büro sechs Büros mit mindestens 84 Raumfeldern insgesamt. Bei einem Missionsgeschoss mit 50 Prozent liegen zwölf Arbeitsplätze in drei Büros örtlich; die anderen drei Büros werden als Außenbedarf deklariert. Empfang und zentrale Anlieferung liegen dann außerhalb, zwei örtliche Zugangsverteiler übernehmen Einstieg und Nebeneingang. Örtliche Technik, Sicherheit, Personal und Sanitär bleiben erhalten.

Konzernprofile verteilen dieselben Arbeitsplätze auf Geschäftsführung, Leitung, Assistenz und Teamräume. Die vollständigen Annahmen stehen in [0012](decisions/0012-konzernidentitaet-und-bueroorganisation.md). KASANE bindet Sicherheit an den Einstieg, CONCORD die Technik an den Verkehrsverteiler, PARALLAX eine Besprechung an den Einstieg und VERDANT einen Gemeinschaftsgarten an den Verteiler. Legal/Finance verwenden kleinere Büroeinheiten und zusätzliche vertrauliche Gesprächsräume. Niederlassungen bekommen kein CEO-Büro. Ein Personalgeschoss kann Führung und Assistenz als Außenbedarf ausweisen. Die Rollenbilanz bleibt örtlich und außerhalb exakt erhalten.

Version 5 reserviert Flure und ihre Wände zuerst; vier bzw. sechs Raumstreifen nehmen die Pflichtgruppen auf. Auch das Legal-/VERDANT-Programm mit 31 Räumen passt im geprüften Fall auf die große Fläche. Nicht jeder beliebige Bedarf ist geometrisch lösbar. Die frühere BSP-Flügelbeschreibung gilt für Version 4.

Räume werden für örtlichen und äußeren Bedarf getrennt aufgerundet; getrennte Bereiche können daher zusammen mehr Räume als ein gemeinsamer Bereich benötigen. Außenfunktionen sind Gebäudekontext, keine erzeugten zweiten Geschosse. Das Modell ist kein vollständiges Abbild der übrigen Gebäudeteile. Sämtliche Kapazitäten, Pausengleichzeitigkeit und Flächen sind ausdrücklich versionierte Spielannahmen in Rasterfeldern; sie implementieren keine DIN-/ASR- oder baurechtliche Bemessung. Die konkreten Formeln stehen in [0011](decisions/0011-bedarfsbasiertes-raumprogramm.md) und `packages/generator/src/demand.ts`.

Geprüft werden Pflichtfunktionen und Flächen, eindeutige IDs, Überschneidungen, exakte Übereinstimmung von Übergängen und Raster, Schleusenzugang, Sanitärerreichbarkeit, Zonenwechsel, zwei unabhängige Übergangsfolgen, verbundene Versorgung, Missionsabhängigkeiten, Spawns/Patrouillen, Zielzugänglichkeit und Rückwege bei geschlossener Tür. Unmodellierte Wanddurchbrüche sind Fehler.

Alle Familien besitzen ein eigenes verbundenes Flurnetz mit Wand-/Türtrennung zu Nutzräumen. Jeder reguläre Raum benötigt einen Flurzugang; CEO und Reinräume behalten die zugeordneten exklusiven Zugänge. Sanitärgruppen und vertrauliche Gesprächsräume sind Sackräume. Zwingende Nachbarbeziehungen sind eigene Türen, kurze Unterstützungsbeziehungen werden geometrisch gemessen. Der CEO erreicht WC über Assistenz/Flur in höchstens 16, Assistenz die zugeordnete Sanitärgruppe in höchstens zwölf Schritten ab Raummitte. Fremde Büros oder gesperrte Räume sind kein Ersatz für Flure. Vorstandsraum und Assistenz dürfen über bis zu 24 Gehfelder verbunden sein. Das sind Spielannahmen, keine Gebäudenormen. Der Validator prüft Flurkanten, Raumstreifenschnitte, Türen und tatsächlich zulässige Wege. Präferenzen beeinflussen weiterhin nur eine ganzzahlige Kennzahl. Maximal 32 örtliche rechteckige Räume sind ein Suchbudget, keine Garantie, jeden Bedarf in jede Größe einzupassen; es gibt keinen allgemeinen Polygon-/Architektur-Solver.

Zu großer Bedarf wird vorab mit vollständigem Programm und Flächenbilanz abgewiesen. Die notwendige Untergrenze ist Raum-Mindestfläche plus wenigstens drei Trennwandfelder je zusätzlichem Programmraum und eine gesonderte Fluruntergrenze; sie beweist keine Einbettbarkeit. Pro Gesamtversuch werden höchstens vier Flächenentwürfe mit jeweils maximal 12.000 Platzierungsversuchen geprüft. Nach höchstens zehn Gesamtversuchen folgt ein erklärter Fehler. Teilentwürfe und Gesamtversuche werden getrennt berichtet. Pflichtfunktionen werden nicht still gelöscht oder verkleinert; größere Fläche, geringerer Bedarf oder kleinerer Ausschnitt erfordern eine explizite Konfigurationsänderung.

Versorgungsgraphen folgen Raumnachbarschaften; physische Leitungen und Sabotage fehlen. Die 3D-Vorschau verwendet eigene primitive Meshes statt GLB-Dateien. Keine externen Grafikassets wurden übernommen. Die BSP-Rechteckteilung enthält angepassten MIT-Code von Aymeric Chauvin; Herkunft, festgelegter Commit und Änderungen stehen in [THIRD_PARTY_NOTICES.md](../packages/generator/THIRD_PARTY_NOTICES.md). Der vollständige Lizenztext ist in der Werkstatt und im Generatorbuild enthalten. Edgar dient als Entwurfsreferenz, ohne kopierten Code oder .NET-Abhängigkeit. WFC bleibt offen. Etagenzahl, Gebäude- und Etagenräume stehen in [0040](decisions/0040-grundflaeche-personal-und-etagen.md).

## Reproduzierbare Prüfungen

```powershell
corepack pnpm test
corepack pnpm typecheck
corepack pnpm build:generator
corepack pnpm check:generator-ui
corepack pnpm check:buildings
corepack pnpm check:corporations
```

Der UI-Check benötigt lokal Chrome oder Edge. Er startet einen temporären Previewserver auf Port 4174 und beendet ihn danach. Der eigene Generatorbuild liegt unter `apps/client/dist-generator`; der normale Clientbuild bleibt unter `apps/client/dist`.

Tests prüfen 100 Seeds je Familie in der kompakten Größe, größere Grundrisse, geometrische Vielfalt, vollständige Reproduzierbarkeit, Hashes, Unveränderlichkeit, isolierten Zufall ohne `Math.random`, Graph-Einbettung, feste Suchbudgets, Parameter und gezielt kaputte Beispiele. Zusätzliche Bedarfsfälle prüfen Kapazitätsschwellen, Restbelegung, Flächen, mehrere geschützte Laborgruppen, getrennten Außenbedarf, Manipulationen, frühen Flächenfehler und ganze Gebäude/Missionsgeschosse mit 1/8/24/48 Beschäftigten. Ein geometrisch zu großes Büroprogramm scheitert reproduzierbar am Layoutbudget und gelingt auf größerer Fläche. Der Integrationstest prüft Bewegung und zweimaliges Kopieren über den vorhandenen Resolver; er spielt keine vollständig gewonnene Mission und ersetzt keinen Botlauf.

Der Batchbericht `artifacts/generator/seed-suite.json` nennt tatsächliche Annahmen, Fehler, Wiederholungen und Rückfälle für 100 Seeds je Familie und Größe des neutralen Referenzbetriebs. `corporate-suite.json` ergänzt 25 Seeds pro Konzern/Familie auf Standardfläche und 20 Standort-/Abteilungsvarianten. UI-Prüfung und Screenshots liegen ebenfalls unter `artifacts/generator/`. Tatsächliche Nachweise werden nach der Prüfung unten festgehalten.

Menschliche Architekturprüfung, taktische Fairness und vollständige Spiele im normalen Netzwerkclient bleiben offen. Eine akzeptierte Karte belegt keine gewinnbare oder unterhaltsame Mission.

## Ausgeführter Nachweis für Version 5 vom 21.10.2026

- `corepack pnpm test`: **111 Tests in 15 Dateien** bestanden: 44 Simulation, 44 Generator, 23 Server. Fünf neue Generatorregressionen prüfen eigene Flurflächen, zulässige kurze CEO-Wege in vier Konzernen und zwei Ausschnitten, fehlende Flure/blockierte Assistenz, im Graph erreichbare aber zu weit entfernte WC sowie Büros ohne eigene Flurtür. Die 24 gezielten CEO-Konfigurationen bewahren die vorhandene WC-Kapazität.
- `corepack pnpm typecheck`: Simulation, Generator, Server und Client bestanden. `corepack pnpm build:generator`: bestanden; MIT-Text enthalten. Der bekannte Hinweis zum großen dynamischen Babylon-Chunk bleibt bestehen. Keine neue Abhängigkeit.
- `corepack pnpm check:buildings`: **900/900** Referenzentwürfe, 0 Fehler/Rückfälle/zusätzliche Gesamtversuche/verworfene Layoutkandidaten. Jede der neun Familien-/Größensuiten besitzt 100 unterschiedliche Geometrien und Missionshashes. Bericht: [seed-suite.json](../artifacts/generator/seed-suite.json).
- `corepack pnpm check:corporations`: **300/300** Konzernentwürfe und **20/20** Standort-/Abteilungsvarianten angenommen, 0 Fehler/Rückfälle/zusätzliche Gesamtversuche; 24 Layoutkandidaten verworfen. Gemessene CEO-Wege der Hauptsitz-Büros: bei allen vier Konzernen 14–16 Gehfelder. Bericht: [corporate-suite.json](../artifacts/generator/corporate-suite.json).
- `corepack pnpm check:generator-ui`: bestanden, Format-5-Exporte stimmen vollständig mit der API überein. Eigene Flurfelder, gemessener CEO-Weg, auswählbare Sanitärroute, Raumstreifenschnitte, drei Familien, vier Konzernhauptsitze, weitere Profilachsen, 31-Raum-Legal-Fall, 2D/3D, Exportzustände, Außenbedarf, Tastatur und Neuladen geprüft. Keine `pageerror`-Ereignisse, Viewports 1366×768 und 1920×1080. Bericht: [ui-check.json](../artifacts/generator/ui-check.json).
- CLI-Beispiel: [KASANE, Hauptsitz, Standard, Seed 42](../artifacts/generator/office-standard-42-ab97af9c.building.json): 21 Programmräume, **90 eigene Flurfelder**, CEO → WC **16 Gehfelder**, zwei reguläre Missionswege. Vorschau und WC-Route: [plan-circulation-wc.png](../artifacts/generator/plan-circulation-wc.png). Flure und Wege in 2D sowie die 3D-Flächen wurden anhand der erzeugten Screenshots visuell geprüft.

Menschliche Architektur-/Spielabnahme und vollständige Botmissionen bleiben offen. Die folgenden Abschnitte sind historische Nachweise; aktuelle Berichtdateien und Screenshots enthalten Version 5.

## Ausgeführter Nachweis für Version 4 vom 21.10.2026

- `corepack pnpm test`: 105 Tests in 14 Dateien bestanden: 44 Simulation, 39 Generator und 22 Server. Der Generator ergänzt neun Konzernfälle für Identität/Pflichtnachbarschaften, reproduzierbare Programme, exakte Rollenbilanz über 0–96 Arbeitsplätze und verschiedene Geschossanteile, vertretene Hauptsitzrollen, vertrauliche/offene Büroformen, Bestandserschließung, kosmetische Abnutzung, ungültige Parameter, manipulierte Zugänge und einen reproduzierbaren 31-Raum-Legal-Fall. Die Ergebnisse von Simulation/Server beziehen sich auf den aktuellen gemeinsamen Projektstand; dieser Auftrag ändert deren Regeln nicht.
- `corepack pnpm typecheck`: Simulation, Generator, Server und Client bestanden. `corepack pnpm install --offline` hat den bereits im Servermanifest deklarierten Generator-Workspace-Link nachgeführt; keine neue externe Abhängigkeit.
- `corepack pnpm check:buildings`: 900/900 neutrale Referenzentwürfe angenommen, 0 Fehler/Rückfälle/zusätzliche Gesamtversuche, 37 verworfene BSP-Entwürfe innerhalb der Versuche. Je Familien-/Größensuite 100 unterschiedliche Geometrien und Missionshashes. Bericht: [seed-suite.json](../artifacts/generator/seed-suite.json).
- `corepack pnpm check:corporations`: 300/300 Konzernentwürfe auf Standardfläche angenommen, je 25 Seeds pro Konzern/Familie. Keine Fehler, Rückfälle oder zusätzlichen Gesamtversuche; 18 BSP-Entwürfe verworfen. Zusätzlich 20/20 Standort-/Abteilungs-/Geschoss-/Umbauvarianten auf großer Fläche angenommen, darunter VERDANT/Legal mit 31 Räumen. Bericht: [corporate-suite.json](../artifacts/generator/corporate-suite.json). Diese gezielte Suite behauptet keine universelle Lösbarkeit aller Kombinationen.
- `corepack pnpm build:generator`: bestanden; vollständiger MIT-Hinweis enthalten. Der bekannte große, erst bei 3D geladene Babylon-Chunk bleibt als Buildhinweis bestehen.
- `corepack pnpm check:generator-ui`: alle vier Konzernhauptsitze sowie die drei neutralen Familien als Format 4 erzeugt; die vollständigen Downloads stimmen mit den kanonischen API-Ergebnissen überein. CEO-/Materialdetails, Material-/Zonenumschaltung, Konzernansichten in 2D/3D, alle sechs Konfigurationsachsen im Export eines geflickten Bestandsstandorts, fehlender CEO in Niederlassungen, 31-Raum-Legal-Entwurf, äußere Funktionen, Export bei geänderten Parametern, Flächenfehler, BSP-/Versorgungsansichten, Tastatur, MIT-Text, Kamera und Neuladen geprüft. Keine `pageerror`-Ereignisse; Viewports 1366×768 und 1920×1080. Bericht: [ui-check.json](../artifacts/generator/ui-check.json).
- CLI-Beispiele erzeugt: [KASANE-Hauptsitz, Standard, 16 Arbeitsplätze](../artifacts/generator/office-standard-42-a74f442d.building.json) mit 21 Räumen sowie [PARALLAX-Bestandsstandort, ausgelagertes Engineering, geflickt](../artifacts/generator/office-large-42-b0c44c71.building.json) mit 22 Räumen. Alle neuen CLI-Parameter sind im Paket gespeichert.
- KASANE-Grundriss und VERDANT-3D-Vorschau wurden anhand der erzeugten Screenshots visuell geprüft. Monogramme, Oberflächenmuster und Möbelproxies sind eigene prozedurale Formen. Hochwertige GLB-Ausstattung, Fassaden, vollständige Botmissionen und menschliche Architektur-/Spielabnahme bleiben offen.

Der obige Abschnitt dokumentiert den früheren Version-4-Lauf. Aktuelle Nachweise stehen im Version-5-Abschnitt; Berichtdateien und Screenshots werden bei neuen Prüfläufen erneuert.

## Historischer Nachweis für Version 3 vom 21.10.2026

- `corepack pnpm test`: 89 Tests in elf Dateien bestanden: 44 Simulation, 30 Generator und 15 Server. Die Generatorfälle prüfen unter anderem Kapazitätsschwellen und Restbelegung, mehrere Laborgruppen, Sanitär-/Technik-/Sicherheitsposten bei höherer Belegung, Außenbedarf, Eingabegrenzen, Flächenfehler und manipulierte Programme. 24 Profilvarianten aus drei Familien, 1/8/24/48 Beschäftigten und beiden Ausschnitten werden jeweils identisch reproduziert. Simulation und Server wurden für diesen Bedarfsausbau nicht verändert; ihre Prüfergebnisse beziehen sich auf den aktuellen gemeinsamen Projektstand.
- `corepack pnpm typecheck`: Simulation, Generator, Server und Client bestanden.
- `corepack pnpm check:buildings`: 900/900 Standardprofil-Entwürfe angenommen, 0 Fehler, 0 Rückfälle und 0 zusätzliche Gesamtversuche. 31 BSP-Flächenentwürfe wurden innerhalb des jeweiligen Suchbudgets verworfen. Jede Familien-/Größensuite enthält 100 verschiedene Geometrien und Missionshashes; die Profile ergeben 13–22 örtliche Räume. Bericht mit Profilparametern und Raumzahlen: [seed-suite.json](../artifacts/generator/seed-suite.json). Das ist kein Nachweis für sämtliche zulässigen Profile.
- `corepack pnpm build:generator`: bestanden, einschließlich vollständiger MIT-Hinweise. Vite meldet weiterhin den großen, erst für 3D geladenen Babylon-Chunk.
- `corepack pnpm check:generator-ui`: Familienexporte und Missionsgeschoss-Export stimmen vollständig mit den kanonischen API-Ergebnissen überein. 24 Arbeitsplätze → sechs Büros; 50-Prozent-Ausschnitt → drei örtliche Büros und Empfang/Anlieferung außerhalb. Veralteter Export wird bei Parameteränderung gesperrt. Zu großer Bedarf behält die Herleitung und entfernt den Export. Variable BSP-Linien, MIT-Text in Oberfläche/Build, Tastaturauswahl, Versorgungs-/Graphansicht, 3D-Mount/Drehung/Zoom/Unmount, ungültiger Seed und Neuladen bestanden. Keine `pageerror`-Ereignisse oder horizontale Überbreite bei 1366×768 und 1920×1080. Bericht: [ui-check.json](../artifacts/generator/ui-check.json).
- CLI-Beispiele erzeugt: [Labor kompakt / Seed 42](../artifacts/generator/laboratory-compact-42-e981f191.building.json) mit 13 Räumen und zwei Wegen; [Bürogeschoss mit zwölf örtlichen von 24 Beschäftigten](../artifacts/generator/office-standard-42-13a14595.building.json) mit drei örtlichen Büros, vollständigem Außenprogramm und zwei Wegen.
- Die erzeugten Büro-/Missionsgeschossansichten und die Bedarfsherleitung wurden anhand der Screenshots visuell geprüft. Globale Zufallsquellen in der Generatorlogik und Generatorimporte in `sim` wurden gesucht; keine Treffer. Menschliche Partien, vollständige Botmissionen und reguläre Multiplayerintegration bleiben offen.

## Historischer Nachweis für Version 2 vom 21.10.2026

- `corepack pnpm test`: 75 Tests in neun Dateien bestanden: 39 Simulation, 21 Generator, 15 vorhandene Serverprüfungen. Die zusätzlichen Generatorfälle prüfen BSP-Flächen, zyklische Einbettung, Suchbudgets, umgeleitete Flusspfade und die Unabhängigkeit von globalem Zufall.
- `corepack pnpm typecheck`: Simulation, Generator, Server und Client bestanden. Der Generator prüft zusätzlich `erasableSyntaxOnly`, damit die CLI direkt mit Node 24 laufen kann.
- `corepack pnpm check:buildings`: 900/900 angenommen, 0 Fehler, 0 Rückfälle. Je 100 unterschiedliche geometrische Raumaufteilungen und Missionshashes pro Familie/Größe; alle geprüften Grundrisse besitzen versetzte Teilungen statt eines kartesischen Zeilen-/Spaltenrasters. Seedliste 0–99. Büro/Fabrik benötigen keine weiteren Gesamtversuche. Die drei Laborsuiten benötigen zusammen 173 zusätzliche Gesamtversuche und verwerfen insgesamt 1016 Flächenentwürfe. Diese Suche wird ausdrücklich ausgewiesen. Bericht: [seed-suite.json](../artifacts/generator/seed-suite.json).
- `corepack pnpm build:generator` und `corepack pnpm --filter @neon/client build`: bestanden. Vite weist auf große Grafik-Chunks hin; Babylon.js wird in der Werkstatt erst bei 3D geladen. Der Generatorbuild enthält die vollständige `THIRD_PARTY_NOTICES.txt`.
- `corepack pnpm check:generator-ui`: alle drei Familien als Format 2 erzeugt, verwendetes Layoutverfahren geprüft und vollständige Downloads mit den kanonischen API-Ergebnissen verglichen. BSP-Schnittlinien, vollständige MIT-Hinweise in Oberfläche und Build, Tastaturauswahl, Graph-/Versorgungsansicht, 3D-Mount/Drehung/Zoom/Unmount, negative Seeds und Neuladen geprüft. Keine `pageerror`-Ereignisse. Viewports 1366×768 und 1920×1080, keine horizontale Überbreite. Bericht: [ui-check.json](../artifacts/generator/ui-check.json).
- `corepack pnpm generate:building --seed 42 --family laboratory --size compact`: Format-2-Beispiel mit zwölf Räumen und zwei unabhängigen Wegen erzeugt. Die Geometrie- und Layoutmodule wurden außerdem auf globale Zufallsquellen und Generatorimporte in `sim` durchsucht; keine Treffer.
- Büro- und Laborgrundrisse wurden anhand der erzeugten Screenshots visuell geprüft. Es wurde keine menschliche Partie oder vollständige Botmission ausgeführt. Sucherfolg und geometrische Vielfalt belegen keine taktische Balance.

Die erste Fassung hatte 62 bestandene Tests und 900 angenommene Entwürfe auf der früheren festen Topologie. Die Berichte `seed-suite.json`, `ui-check.json` und aktuellen Screenshots werden bei der Prüfung der neuen Version überschrieben; die Zahlen dieses historischen Abschnitts beziehen sich auf die damalige Version 2.
