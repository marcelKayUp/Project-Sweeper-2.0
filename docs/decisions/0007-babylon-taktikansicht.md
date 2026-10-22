# 0007 – Orthografische 3D-Taktikansicht mit Babylon.js

Status: entschieden  
Datum: 21.10.2026

## Kontext

Die bisherige Zielansicht war eine zweidimensionale Phaser-Karte. Die gebauten Kampfstücke und die Vier-Spieler-Mission in [0006](0006-vier-spieler-mission.md) nutzen Phaser und eine DOM-Karte. Diese Entscheidung legt die künftige Darstellung fest. Sie ersetzt die vorhandenen Ansichten nicht rückwirkend und ändert keine Treffer-, AP- oder Missionsregel.

## Entscheidung

Die Taktikansicht ist eine 3D-Szene in Babylon.js.

- Perspektive: taktische 3D-Ansicht.
- Kamera: orthografisch, fest um 45 Grad geneigt.
- Drehung: nur in 90-Grad-Schritten um die senkrechte Achse, also 0, 90, 180 und 270 Grad.
- Zoom: eingeschaltet.
- Die Kameradrehung ändert weder logisch Nord noch Zugreihenfolge, Deckung oder Sichtlinie.

Die Welt ist ein logisches Raster. Eine Zelle misst 1,0 Welteinheiten in der Darstellung. Höhenstufen sind erlaubt: jede Zelle trägt eine ganzzahlige Höhe. Module verbinden die Stufen; eine Treppe ist das Modul dafür. Ghost Floor bleibt auf einer Höhe, solange seine Karte keine Treppe setzt.

Eine Karte ist JSON. Sie enthält das logische Raster, Deckungskanten und Sichtlinien-Blocker. Das Mesh erzeugt keine Regel. Deckung und Sicht gelten nur, wenn die Karte sie ausweist. Der Server bleibt die Instanz für Treffer und Sicht.

Modelle sind GLB, Quelle ist Blend, Maßstab 1,0, Stil stilisiertes Cyberpunk. Figuren sind geriggt und bringen die Bewegungen `idle`, `walk`, `crouch`, `shoot`, `reload`, `hit` und `death` mit. Die Umgebung besteht aus den Modulen Boden, Wand, Tür, Deckung und Treppe.

`packages/sim` importiert Babylon nicht. Die Szenen-API liest bestätigten Zustand und sendet dieselben Spielbefehle wie bisher.

## Folgen

- AP-Kosten, Trefferformel, gerichtete Niedrigdeckung und der Missionsabschluss aus [0004](0004-gerichtete-deckungskante.md), [0005](0005-kampf-rng.md) und [0006](0006-vier-spieler-mission.md) bleiben.
- Höhenstufen sind Kartendaten und Darstellung. Diese Entscheidung führt keinen Höhenbonus und keine Kletterkosten ein. Solange keine eigene Regelentscheidung vorliegt, verlangen spielbare Karten keinen Höhenwechsel.
- Bewegungskosten zählen weiter orthogonale Schritte des logischen Rasters, nicht die Länge eines 3D-Pfads.
- Die Babylon-Paketversion wird bei der Umsetzung gegen die installierte API festgelegt und im Lockfile festgehalten. Diese Entscheidung nennt keine Versionsnummer.
- Phaser- und DOM-Ansichten der bestehenden Stücke bleiben lauffähig. Die Fortsetzung der Taktikarbeit ist die bereits spielbare orthografische Fassung aus [0013](0013-isometrische-fortsetzung.md): `?stueck=raster` und `?stueck=sicht`. Die älteren zweidimensionalen Stücke sind nicht die Grundlage dafür.
- Neue Grundgeometrie, Modulmaße und Kartenfelder werden versioniert. Ein Replay nennt den Karten-Hash zusammen mit den bisherigen Versionen.
