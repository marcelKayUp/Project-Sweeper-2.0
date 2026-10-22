# 0025 – Neuronale Hilfsmodelle als eingefrorene Eingabe

Datum: 22.10.2026. Status: Auf die Frage, ob SAM 2, TRELLIS/InstantMesh und Blender den Assetweg unterstützen, folgte ein gestufter Vorschlag. Der Nutzer hat ihn mit „Mache es“ beauftragt. Grundregel und Schritt 1 (SAM 2) sind umgesetzt; der Modellnachweis ist offen.

## Anlass

Die [Bildanalyse](../IMAGE_REFERENCE_ANALYSIS.md) hatte keine automatische Objektfreistellung; der LKW-Umriss ist von Hand annotiert. [ASSET_PIPELINE.md](../ASSET_PIPELINE.md) schloss lokale Diffusionsmodelle für den Einstieg aus. Text-/Bild-zu-3D-Modelle liefern dichte Netze mit eingebrannter Textur. Benannte Teile, Materialrollen, Anker und gemeinsame Geometrie aus dem [Familienvertrag](../ASSET_FAMILIES.md) fehlen ihnen.

## Entscheidung

1. **Grundregel:** Ergebnisse neuronaler Modelle sind eingefrorene Eingaben wie ein Referenzfoto. Datei, SHA-256, Modell und Checkpoint, Prompt und Lizenz werden festgehalten. Ein solches Ergebnis ist nie selbst Lieferasset. Rezept und Blend bleiben die Quelle; Familienvertrag, Budgets und Prüfungen gelten unverändert.
2. **SAM 2.1 (Hiera tiny, Apache-2.0)** darf den handgezeichneten Objektumriss ersetzen. Der Schritt ist optional und läuft in der eigenen Umgebung `.venv-sam`. Sein Ergebnis ist ein gewöhnlicher Analyseauftrag mit Polygon und Herkunftsangaben. `analyze.py` bleibt unverändert und importiert kein PyTorch. Maskenkanten sind Bildregionen, keine freigegebenen Formgrenzen.
3. **TRELLIS (Version 1)** darf später als Formvorlage für verdeckte Seiten erprobt werden. Voraussetzung sind eine geprüfte NVIDIA-GPU mit mindestens 16 GB und ein eigener Auftrag. Das Nicht-Ziel „lokales Diffusionsmodell“ entfällt nur für diese Rolle.
4. **Nicht übernommen:**
   - InstantMesh, weil die Zero123++-Gewichte unter CC-BY-NC 4.0 stehen und ein Generator für die Erprobung genügt.
   - TRELLIS.2, weil es mindestens 24 GB GPU-Speicher braucht.
   - SAM 3, wegen der eigenen SAM License und weil die Checkpoints nur auf Anfrage erhältlich sind.
   - Hunyuan3D, weil die Lizenz in der EU, im Vereinigten Königreich und in Südkorea nicht gilt.
   - Die direkte Lieferung generierter Netze.

## Folgen

Neue Abhängigkeiten liegen nur in `.venv-sam`. Fest eingetragen sind PyTorch 2.14.1 und torchvision 0.29.1, sam2 1.1.0, hydra-core 1.3.7, iopath 0.1.10 und antlr4-python3-runtime 4.9.3. Die drei Analysepakete stehen in denselben Versionen wie bisher. Eine GPU ist nicht nötig. Die Analyseumgebung `.venv-assets` bleibt unverändert.

Der Checkpoint-Hash ist noch nicht festgeschrieben. Der Download von `dl.fbaipublicfiles.com` war in der Cloud-Sitzung durch die Netzwerkrichtlinie gesperrt, ebenso Hugging Face. Nach dem ersten Download wird der Hash in `tools/reference-analysis/sam-models.json` eingetragen. Bis dahin vermerkt jede Maske `checkpointPinned: false`.

Keine Änderung an Spielregeln, Mission, Generator oder Laufzeitkatalog. v0.1 und M7 werden nicht erweitert.

## Nachweis und Offenes

Bedienung und Prüfungen stehen in [IMAGE_REFERENCE_ANALYSIS.md](../IMAGE_REFERENCE_ANALYSIS.md#7-optionale-objektfreistellung-mit-sam-2). Der Modellnachweis ist offen: Überdeckung mit dem Handumriss und dem Testschrank (vorgeschlagene Schwelle 0,95), Wiederholbarkeit und CPU-Laufzeit mit dem echten Checkpoint. Der TRELLIS-Versuch wartet auf die Angaben zur GPU.
