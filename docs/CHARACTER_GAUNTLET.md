# Humanoider Character-Creator – Qualitätslauf

**Folgeauftrag vom 22.10.2026:** Der Nutzer beauftragt die Übernahme seines geöffneten CC0-Masters. Die Standardwerkstatt kombiniert nun dessen Originalteile, siehe [modulare Werkstatt](CHARACTER_MODULAR.md) und [0017](decisions/0017-quaternius-figurenbibliothek.md). Die folgenden Vergleichsrunden bleiben historische Nachweise; die Übernahme ist kein nachträglicher Gauntlet-Sieg des eigenen Geometriegenerators. Die früheren 5.000-Dreiecks-/19-Bone-Grenzen gelten für den prozeduralen Piloten, nicht für die neue Quelle.

Der Nutzer hat am 21.10.2026 die Verbesserung des vorhandenen Systems über den Skill `gauntlet-loop` beauftragt und Referenz **A: Quaternius Ultimate Modular Men** gewählt. Der bestehende Auftrag zur Umsetzung mit Luna-Subagenten gilt weiter. Dieses Dokument ergänzt den [Figurenpilot](CHARACTER_CREATOR.md), ohne Missionsregeln oder MVP-Abnahme zu erweitern.

## Konkreter Maßstab

Die erzeugte Figur soll als zusammenhängender stilisierter Mensch lesbar sein: plausible Kopf-/Körperproportionen, erkennbare Gesichts- und Hand-/Fußformen, Schulter-, Brust-, Taillen- und Beckenkontur sowie anatomisch nachvollziehbare Gliedmaßen. Die Referenz ist das echte Modell **Casual Character** aus [Quaternius Ultimate Modular Men](https://quaternius.com/packs/ultimatemodularcharacters.html), ebenfalls auf der [Autorenseite bei Poly Pizza](https://poly.pizza/m/kZ3DmIoGip). Die Autorenseiten weisen CC0 aus. Das Modell dient ausschließlich als Testreferenz und wird nicht in den Produktionsgenerator übernommen.

Der offizielle Drive-Download lieferte eine Quotenfehlermeldung. Der Download über die Autorenseite bei Poly Pizza ist ein gültiger GLB; SHA-256: `fea7e71271203e7073f1a073fa1208de7402df276f87f80e149bf7589b5d46b4`. Herkunft und Dateipfad stehen in [provenance.json](../artifacts/characters/gauntlet/reference/provenance.json). Die Referenz besitzt 5.776 Dreiecke und 62 Bones; für unsere Produktion bleibt die bestehende Grenze von 5.000 Dreiecken, fünf Materialrollen und 19 Bones bestehen. Eine geringe Dreieckszahl allein ist kein Qualitätsgewinn.

## Verfahren

Ein Luna-Builder bearbeitet Geometrie und passende Körper-/Rig-Landmarken. Ein zweiter bearbeitet Pose, Animation und Darstellung. Ein separater Kritiker erhält tatsächliche Bilder; für den direkten Vergleich erhält ein weiterer frischer Kritiker ausschließlich anonymisierte A/B-Bilder mit vertauschter Herkunftsbezeichnung. Er wählt binär die bessere humanoide Form und benennt den größten sichtbaren Mangel. Herkunftsschlüssel und Urteil werden erst anschließend zusammen dokumentiert. Das ist eine Bewertung durch Agenten, keine menschliche Art-Abnahme.

`tools/characters/render_comparison.py` importiert die echten GLBs unabhängig in Blender. Gleiche orthografische Kamera, auf 1,05 normalisierte Referenzhöhe, Beleuchtung, Rendergröße und Bühne erzeugen Front-, Iso-, Seiten- und Rückansichten. Geometrie, Skin und Materialien werden nicht retuschiert. Der Bericht benennt die gewählte Animation und die für die Vergleichsbühne vorgenommene Positionsnormalisierung. Der Bodenkontakt wird zusätzlich ohne diese Review-Normalisierung von `verify_blender.py` geprüft.

Die [Live-Qualitätsseite](http://127.0.0.1:5175/character-gauntlet/) zeigt die tatsächlichen Zwischenstände. Browser-/JSON-/GLB-Prüfung, Slotkombinationen, Typecheck und unabhängige Animationsprüfung bleiben technische Mindestgates. Ein technisch grünes Modell darf den visuellen Vergleich dennoch verlieren.

## Tatsächlicher Verlauf

- **Ausgangsstand:** gesichert unter `artifacts/characters/gauntlet/baseline`. Der Kritiker beanstandet Kopfmaske, zylindrischen Hals, stabförmige Arme/Beine, fehlende Hand-/Fußsilhouette und primitive Kleidungsformen. [Befund](../artifacts/characters/gauntlet/critic-baseline.md).
- **Runde 1:** zusätzliche Gesichtsdetails, Finger, konische Körpervolumen und Kleidungsdetails reichen noch nicht. Der frische A/B-Kritiker wählt die Quaternius-Referenz klar. Hauptmangel: lange schmale Arme mit dünnen abgesetzten Fingern und sichtbare Trennung der Körperteile. Die Runde wird verworfen; Körperform, Übergänge und gemeinsam berechnete Mesh-/Rig-Landmarken werden weiter verbessert.

Der Lauf ist noch nicht als erfolgreich abgeschlossen dokumentiert. Finale Lieferdateien, Hashes und Nachweise werden erst nach der erfolgreichen Integration erneuert.
