# 0017 – Quaternius-Master als modulare Figurenquelle

Datum: 22.10.2026. Folgeauftrag: „Können wir dieses Modell denn in die Figuren-Werkstatt übernehmen?“ Die Übernahme ist ausdrücklich beauftragt. Sie erweitert weder Spielregeln noch die MVP-Abnahme.

## Entscheidung

Die Standardwerkstatt `characters.html` verwendet den vom Nutzer in Blender geöffneten CC0-Master **Quaternius Ultimate Modular Characters / Men**. Eine Projektkopie des aktuellen Blender-Zustands liegt unter `assets/source/characters/quaternius/Humans_Master.blend`. Der interaktive Blender-Dateipfad, die Auswahl und ungespeicherte Änderungen werden durch die Übernahme nicht ersetzt. Das lokale Exportskript verarbeitet ausschließlich die gesicherte Kopie in einem separaten Blender-Prozess.

Elf Varianten liefern jeweils Kopf, Oberkörper, Beine und Schuhe. Drei zusätzliche Ausrüstungsmeshes sind optional; `Horse_Head` gehört nicht zur humanoiden Bibliothek. Die 47 Teile teilen sich den ursprünglichen Rig mit 62 Knochen und 24 nativen Animationen. Materialien, Gewichte und Anatomie stammen aus dem Quaternius-Master. Die Bibliothek wird einmal geladen; nur vier ausgewählte Teile und höchstens ein Ausrüstungsteil werden dargestellt bzw. ausgeliefert. Der Einzel-GLB enthält keine ungewählten Outfits oder Vorschauobjekte.

`ModularCharacterSpec` Version 2 speichert ausschließlich kosmetische Parameter: Quellenkennung, ID, Seed, vier Slots, Ausrüstung, uniforme Größe und optionale Farbrollen. `null` bewahrt Originalfarben. JSON wird zur Laufzeit geprüft; die Spezifikation kann weder URLs noch beliebige Quelldateien laden. Browser und lokale Agenten-CLI verwenden denselben Exportweg. Die bisherige eigene prozedurale Quelle aus 0016 bleibt über `?quelle=prozedural` und Spezifikationen der Version 1 erreichbar.

Die Quelle bleibt CC0-1.0; Autor, Quellenlink sowie SHA-256 von Master und Bibliothek stehen im Katalog und den Liefermetadaten. Die Originalquelle ist [Quaternius](https://quaternius.com/packs/ultimatemodularcharacters.html), die Freigabe ist [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/). Keine zusätzlichen Subscriptions oder Modell-APIs.

## Begründete Abweichungen zu 0016

Der bisherige Generator erreichte im dokumentierten Vergleich noch keine überzeugende humanoide Form. Der Nutzer stellt nun die passende ausdrücklich freigegebene Quelle bereit. Statt Anatomie aus Grundkörpern neu zu konstruieren, parametrisiert die Werkstatt deren echte modulare Teile.

Die früheren Grenzen von 5.000 Dreiecken, fünf Materialien und 19 Bones waren Pilotvorgaben, keine gemessenen Browsergrenzen. Sie gelten weiter für den alten prozeduralen Testweg, werden aber nicht auf diesen Master übertragen. Die nativen vollständigen Sets umfassen etwa 5.000–11.200 Dreiecke, optional zuzüglich Ausrüstung; die Werkstatt zeigt den tatsächlichen Wert. 15.000 Dreiecke dienen höchstens als vorläufiger Hinweis für die Figur samt Ausrüstung, nicht als belegtes Leistungsversprechen. Material-/Drawcall-Reduktion, LOD und mehrere animierte Figuren müssen später in der tatsächlichen Spielszene gemessen werden. Der Rig wird für diese Übernahme nicht reduziert.

Die Werkstatt normalisiert den Master mit einheitlicher Skalierung auf etwa 1,05 Welteinheiten plus Größenfaktor, entsprechend der bisherigen Darstellungsreferenz. Der unabhängige Import prüft den tatsächlichen Ruheposen-Bodenkontakt; ein Export darf keine laufende Vorschaupose in das Bindemesh backen.

## Offene Grenzen

Der Master enthält unter anderem Idle, Walk, Run, Schuss, Treffer und Death. **Crouch und Reload fehlen**. Es werden keine anderen Clips entsprechend umbenannt; der vollständige Sieben-Clip-Missionsvertrag bleibt offen. Zubehör ist bereits auf den Quellrig gewichtet, keine allgemein gelöste Socket-API. Uniforme Größe ersetzt keine Anatomiemorphs. Gemischte Outfits können sichtbare Übergänge oder Überschneidungen besitzen und benötigen Art-Abnahme.

Kein Missionseinbau, Profilpersistenz, weiterer Renderer oder Acht-Spieler-/Performance-Nachweis. Anleitung und tatsächliche Prüfberichte: [modulare Werkstatt](../CHARACTER_MODULAR.md).
