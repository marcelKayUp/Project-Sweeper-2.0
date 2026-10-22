# 0018 – Männliche und weibliche Figuren als getrennte Bibliotheken

Datum: 22.10.2026. Ausdrücklicher Folgeauftrag: Beide bereitgestellten Skelette und Meshes sollen in der Charakterwerkstatt auswählbar sein.

## Entscheidung

„Körpermodell“ wählt Männlich oder Weiblich. Beide Quellen enthalten 62 gleich benannte Knochen und 24 native Clips, ihre Ruhe-/Bind-Matrizen unterscheiden sich jedoch. Die Werkstatt lädt daher pro Quelle deren eigenen Rig, Meshes, Materialien und Clips. Es gibt kein automatisches Umhängen weiblicher Meshes auf den männlichen Rig und kein Retargeting.

Die bestehende Version-2-Spezifikation verwendet weiterhin `source` als Diskriminator: `quaternius-modular-men-v1` bleibt unverändert; `modular-women-v1` kommt hinzu. Alte männliche JSON-Dateien bleiben gültig. Quelleigene Varianten und Ausrüstung werden zur Laufzeit geprüft. Gemeinsame Variantennamen beziehen sich immer auf die gewählte Quelle. Der native Schreibfehler `Formad_Head` wird über den Katalog auf die weibliche Formal-Vorlage abgebildet.

Männlich bietet elf Sets und Pistole/Schwert/Rucksack. Weiblich bietet zehn Sets und Pistole/Schwert; beide Waffen bleiben als ursprüngliche starre Anhänge an `Middle1.R` erhalten. Pro Quelle bleibt der letzte Entwurf innerhalb der offenen Werkstatt erhalten. Beim Wechsel wird die Vorschau neu aufgebaut; fehlgeschlagenes Laden blockiert den GLB-Export und ist wiederholbar. JSON-Import schaltet ebenfalls auf die enthaltene Quelle um. Browser und CLI exportieren denselben isolierten Rig mit ausgewählten Teilen und erhalten Quellenhashes sowie Spezifikation.

## Quelle und Erstellungsweg

Die weibliche Nutzerquelle `Models&Animations/All together.blend` wurde bytegleich nach `assets/source/characters/women/Humans_Master.blend` kopiert (SHA-256 `e478c764a329f5ba8a425df865e2b9061bba42add8afe8e7324cc2cb257fc8de`). `tools/characters/export_female_master.py` verarbeitet diese Kopie in einem unabhängigen Blender-Prozess. Das interaktive Blender und die Originaldatei werden nicht verändert. 40 Outfitmeshes und zwei Waffen bilden die Browserbibliothek unter `apps/client/public/assets/characters/women`.

Der Lizenzbeleg des männlichen Quaternius-Masters gilt nicht automatisch für die weitere Datei. Ihre Herkunft wird deshalb ausdrücklich als `Unverified (user-provided)` / `LicenseRef-UserProvided-Unverified` gespeichert. Es wurde kein eigenständiger Lizenznachweis in dieser Quelle festgestellt; die Werkzeugübernahme erzeugt keine Nutzungsrecht-Freigabe. [Herkunftsprotokoll](../../assets/source/characters/women/provenance.json).

Ausgeblendete Quellmeshes werden ausschließlich im Exportprozess aktiviert. Lokale PBR-Materialkopien erhalten die Diffusfarben. Der glTF-Export begrenzt Hautgewichte auf vier Einflüsse und normiert sie; die Quelldatei bleibt unverändert. Beide Modelle werden anhand ihrer eigenen Casual-Ruhehöhe auf 1,05 Welteinheiten plus Größenfaktor normalisiert.

## Abnahme und Grenzen

Die [Prüfanleitung und Ergebnisse](../CHARACTER_MODULAR.md) belegen Quellenwechsel, getrennte Bind-Rigs, alle 21 Sets, Waffen, JSON und GLB. Menschliche Art-/Bewegungsabnahme und Lizenzbeleg der weiblichen Quelle bleiben offen. Kein Missions- oder Profileinbau, keine allgemeine Socket-/Retargeting-Schnittstelle, keine neuen Animationen, keine zusätzlichen Abos. Crouch/Reload und Leistungsnachweise in der Spielszene bleiben eigene Aufgaben.
