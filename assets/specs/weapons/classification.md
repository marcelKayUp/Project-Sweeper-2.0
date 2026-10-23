# Waffenklassifikation

`classification.json` ordnet die extern gelesenen Blend-Dateinamen in eigene Familien und Steckplätze. Sie legt keine Reichweite, keinen Schaden und keine Aktionspunkte fest. `rifle` und `sidearm` bleiben die einzigen Kampf-IDs. Es gibt keine Decision, solange die Kampfregeln gleich bleiben. Es wurden keine Meshes kopiert.

Call of Duty: Der Herstellerblog zu Black Ops 6 vom 18.10.2024 benennt getrennte Platzarten für Optik, Mündung, Lauf, Unterlauf, Magazin, Hintergriff und Schaft; Laser und Feuermodi bleiben dort Werte. Der Herstellertext zu Modern Warfare II führt Munition als eigene Kategorie neben Mündung und Unterlauf.

Cyberpunk RED, öffentliche Wiki- und Forenbeschreibungen, keine gültige Regel: eine Fernkampfwaffe trägt wenige allgemeine Aufsätze statt einer getrennten Mündungs- und Visierleiste, und die Munition gehört zur Waffenfamilie. Cyberpunk 2077, Fandom-Wiki, keine gültige Regel: getrennte Plätze für Mündung und Visier plus ein Modulplatz; ein Spielführer beschreibt denselben Schnitt, und die Munition bleibt an der Waffenklasse.

Visier und Zielfernrohr sind Teilfamilien des Slots `aufsatz`, nicht zwei Optiken zugleich. Vordergriff und Hintergriff sind getrennt, weil beide in den Dateinamen vorkommen. Bewusst ohne Slot: Laser, Feuermodi, Kamm, Schaftpolster, der Modulplatz und Nahkampf. Die Armbrust nutzt die Kaliberklasse `bolzen`, weil sie keine der Schussklassen ist.

Am 23.10.2026 lagen außerhalb des Repos 130 `.blend`-Dateien und keine Lizenzdatei: 57 fertige Waffen, 58 modulare Teile und 15 Zubehördateien. Die frühere Sichtung von 57 und 73 trifft zu, 73 ist die Summe aus Modul und Zubehör. Die Beispiele in der JSON sind einzelne Dateinamen, nicht der Ordnerinhalt.
