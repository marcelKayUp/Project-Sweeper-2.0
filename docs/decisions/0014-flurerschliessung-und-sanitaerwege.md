# 0014 – Eigene Flurerschließung und kurze Sanitärwege

Datum: 21.10.2026. Umsetzungsauftrag: fehlende Flure und der lange WC-Weg der Geschäftsführung im vorhandenen Generator. Ergänzt 0008/0010/0011/0012; kein Abschluss von M7 oder Ausbau der Kernmission.

## Problem

Version 4 teilte die gesamte Innenfläche in Raumrechtecke. Ein Raumtyp „Verteiler“ ersetzte kein Flurnetz: reguläre Verbindungen konnten quer durch Arbeitsräume führen. Der bisherige Sanitärtest prüfte lediglich Graph-Erreichbarkeit ohne Hochsicherheitsräume. Er begrenzte weder tatsächliche Gehstrecke noch fremde Bürodurchquerungen.

## Umsetzung in Version 5

- Zuerst wird eine zusammenhängende Erschließung reserviert: zwei oder drei waagerechte Flure mit seitlichen Rückverbindungen. Nutzräume liegen in vier bzw. sechs Raumstreifen; jeweils zwei Streifen erschließen sich über denselben Flur. Flur und Raum sind durch eine Wand mit deklarierten Türen getrennt. Flurbreite: ein taktisches Rasterfeld, keine reale Mindestbreite.
- Flurfelder stehen separat in `building.circulation`, zählen weder als Arbeitsplatz noch als zusätzlicher Programmraum. Ihr Graph besitzt stabile `hall-x-y`-Knoten und `passage`-Kanten zwischen benachbarten Feldern. Türen verbinden Räume und Flurknoten; geschützte direkte Raumbeziehungen bleiben gesonderte Türen. Zugangshallen (`type: corridor`, früher „Verteiler“) bleiben die im Programm verlangten Eingangs-/Bestandsräume, ersetzen aber keine Flure.
- Jeder nicht exklusiv erschlossene Raum benötigt einen eigenen Flurzugang. CEO und Reinräume bleiben ausschließlich über zugeordnete Assistenz bzw. Schleuse erreichbar. Empfang und Server erhalten je zwei reguläre Türen an verschiedenen Flurfeldern. Zwei kantenunabhängige Missionswege und die vorhandene optionale hackbare Abkürzung bleiben erforderlich.
- Bestehende Sanitärkapazität wird nahe der Assistenz platziert; sie wird nicht nochmals als privates CEO-WC gezählt. Sanitärgruppen und vertrauliche Gesprächsräume bleiben Sackräume. Der Vorstandssaal liegt im Leitungsbereich, ist aber nicht mehr zwingend durch eine direkte Assistenz-Tür verbunden: ein nachgewiesener kurzer Flurweg bis 24 Schritte erfüllt diese Beziehung.
- Geometrische Breitensuche zählt Schritte von der ganzzahligen Raummitte bis zum ersten erreichbaren Feld des Zielraums. Für WC-Wege dürfen nur eigener Ausgangsraum, Flure, Zugangshallen und WC betreten werden; der CEO darf zusätzlich seine Assistenz durchqueren. Wände, Terminal und geschlossene Abkürzung bleiben blockiert. Fremde Arbeitsräume, Archive, Labore und gesperrte Bereiche werden nicht als Verkehrsfläche benutzt.
- CEO → WC höchstens **16 Raster-Schritte**, Assistenz → zugeordnete Sanitärgruppe höchstens **12**. Das sind versionierte Spielannahmen, keine DIN-/ASR- oder baurechtlichen Entfernungsgrenzen. Andere Beschäftigte benötigen einen solchen zulässigen WC-Weg; für sie gibt es in diesem Schnitt keine weitere maximale Länge.

## Flächen, Versionen und Suchgrenzen

Eigene Flure und ihre Wände benötigen zusätzliche Fläche. Die festen Flächenstufen wachsen auf **28×24 / 32×28 / 32×32**. Der Generator überschreitet weiterhin keine Achse von 32 Rasterfeldern; die bestehende Taktikansicht kann den MissionSpec unverändert verarbeiten. Diese Änderung gilt ausschließlich für generierte Gebäude. Die 20×20-Referenzmission des Kernprototyps bleibt bestehen. Belegung und Mindestflächen werden nicht still reduziert.

Die Bedarfsbilanz ergänzt eine explizite untere Schranke für Flurfelder neben Nutzraum- und Wandflächen. Sie garantiert keine Einbettung. Es bleiben höchstens 32 Programmräume, vier Layoutkandidaten mit je höchstens 12.000 Packversuchen und zehn Gesamtversuche. Zusammengesetzte Pflichtgruppen werden in Raumstreifen gepackt, deren Wände weiterhin mit der vorhandenen Rechteckteilung entstehen. Der allgemeine rekursive BSP-Solver bleibt separat verfügbar und geprüft; er erzeugt nicht mehr allein die komplette Gebäudefläche. Es gibt keinen allgemeinen Polygon-Solver.

Exportformat **5**, Generator `semantic-building/5`, Content `building-catalog/4`; Programm/Grundriss/Topologie jeweils Stufe 5. Alte Pakete/Hashes behalten ihre alte Bedeutung und werden nicht mit neuen Seeds rekonstruiert. Der Regelkern und dessen MissionSpec werden nicht erweitert. Keine neue Abhängigkeit oder Grafikquelle.

## Sichtbarer Nachweis und Grenzen

2D und 3D zeichnen die tatsächlichen Flurflächen. Die Werkstatt zeigt Flurfeldzahl und gemessenen CEO-Weg. „Sanitärweg“ bzw. die entsprechende Schaltfläche zeichnet den kürzesten zulässigen Weg des ausgewählten Raums. Die Raumstreifenschnitte bleiben als Overlay sichtbar.

Der Validator prüft Flurverbund, Kanten und Türen gegen die Geometrie, eigene Raumzugänge, fehlende Wände/Durchbrüche, geschützte Beziehungen, Sackräume und gemessene Unterstützungswege. Regressionen prüfen insbesondere „im Graph erreichbar, tatsächlicher CEO-Weg zu lang“ und „Raum nur über fremdes Büro erreichbar“. Ausgeführte Prüfungen stehen in `docs/GEBAEUDEGENERATOR.md` und den Generator-Artefakten.

Lesbare Flure und begrenzte Wege ersetzen keine menschliche Architektur-/Spielabnahme. Mehrgeschossige Erschließung, reale Fluchtwege, rollstuhlgerechte Abmessungen und allgemeine Sanitärentfernungsregeln sind nicht Bestandteil dieses Auftrags.
