# NEON CONTRACT – Vertrag für wiederverwendbare Assetfamilien

Stand: 22.10.2026 · Vertragsentwurf v1 und projektlokaler Agenten-Skill. Generator und Browserloader des Terminalpiloten sind noch nicht auf diesen Datenvertrag umgestellt.

Bezug: GEN-10, MOD-10/15, M7; [Assetplanung](ASSET_PIPELINE.md), [Terminalpilot](TERMINAL_PILOT.md), [0023](decisions/0023-wiederverwendbare-assetfamilien.md).

## Gemeinsamer Einstieg

Der [Skill `asset-families`](../.agents/skills/asset-families/SKILL.md) beschreibt Entscheidungen und Arbeitsschritte. Dieser Vertrag definiert die Daten- und Wiederverwendungsregeln. Lokale Generatoren und Prüfer führen die Arbeit aus. Ein Modellwechsel ändert diesen Vertrag nicht.

Codex und Cursor verwenden `.agents/skills/asset-families/SKILL.md`. Für Claude Code existiert ein [kurzer Einstieg](../.claude/skills/asset-families/SKILL.md) unter `.claude/skills`, der dieselbe Anleitung lädt. Falls Cursor beide Einträge zeigt, führen sie zum gleichen Verfahren. Es gibt keine getrennten Generatoren oder voneinander abweichenden Regelkopien.

Beispielauftrag für alle drei Werkzeuge:

> Verwende den Skill asset-families. Ergänze für das vorhandene Pult eine Organisationspalette. Verwende die bestehende Geometrie und dokumentiere Materialänderungen und tatsächlichen Prüfstand.

Codex: `$asset-families`; Claude Code: `/asset-families`; Cursor: Skill über `/` auswählen. Bei fehlender Erkennung kann jedes lokale Modell die gemeinsame `SKILL.md` über ihren Projektpfad lesen. Dateizugriff, lokale Shell und bei Produktionsaufträgen Blender sind die benötigten Fähigkeiten. Ein rein textuelles Modell ohne diese Werkzeuge kann nur planen.

Verzeichnisse und Aufrufe sind anhand der [offiziellen OpenAI-Dokumentation](https://learn.chatgpt.com/docs/build-skills), der [Claude-Code-Dokumentation](https://code.claude.com/docs/en/skills) und der [Cursor-Dokumentation](https://cursor.com/docs/skills) geprüft. Die Ausführung wurde hier nicht in drei separaten Agentenprodukten erprobt. Der Skill benötigt den Projektbestand; er ist kein eigenständiges Blender-Plugin und verlangt keine zusätzlichen Abos.

## Getrennte Daten

**Geometriebasis:** Form, Topologie, Vertexattribute, UVs und Material-Slots. Eine Basis hat eine stabile ID und eine Inhaltsrevision. Slots benennen ihre Funktion, etwa `Housing`, `Trim`, `Identity`, `Rubber` und `Display`. Eine Organisation gehört in ein Materialprofil, nicht in eine ansonsten identische Geometrie-ID.

**Erscheinungsbild:** Ein Materialprofil belegt Slots mit Farbe, Rauheit, Metallanteil, Emission und optionalen Texturbindungen. Rezeptfarben sind eindeutig als sRGB-Hexwerte angegeben und werden an der Rendergrenze passend umgerechnet. Gemeinsame Graustufen-/Maskentexturen werden eingefärbt, wenn nur der Farbton variiert. Unterschiedliche Logos oder Displayinhalte dürfen unterschiedliche Texturen bei gleicher Geometrie verwenden.

**Variante/Instanz:** Eine Variante verweist auf Basis und Materialprofil und enthält ihre Größenwahl. Eine konkrete Platzierung ergänzt Position und Rotation. Reine uniforme Skalierung mit gleichen Proportionen erzeugt keine neue Meshdatei. Soll ein kleineres Gehäuse andere Proportionen, Wandstärken oder Details behalten, ist das ein Geometrieparameter und keine reine Skalierung.

Der erste Vertrag betrifft statische Props. Für Figuren gelten diese Trennungsprinzipien ebenfalls; Rig-, Bind-Pose-, Skinning- und Clip-Kompatibilität richten sich nach [CHARACTER_MODULAR.md](CHARACTER_MODULAR.md). Männliche und weibliche Basismodelle sind nicht automatisch austauschbar.

## Minimaler Datenvertrag

Eine zukünftige Familie enthält getrennte Sammlungen:

- `geometries`: Basis-ID, Rezept-/Quellreferenz, ausschließlich formwirksame Parameter, Slots und erzeugte Dateien mit Revision/Hashes.
- `materialProfiles`: Profil-ID und Slotbelegung; optionale Textur-IDs statt neuer Kopien identischer Bilder.
- `textures`: Textur-ID, Dateireferenz/Hash und Verwendung/Farbraum. Eine gemeinsame Textur liegt einmal im kanonischen Bestand.
- `variants`: stabile Varianten-ID mit `geometryId`, `materialProfileId` und positivem, endlichem `uniformScale`.
- `provenance` und `budgets`: Quellen/Nutzungsrecht, Erstellungsweg, Werkzeug-/Rezeptversion, Maßeinheit, Ursprung sowie Datei-, Dreiecks-, Material- und Texturbudgets.

Beispiel für einen Variantenverweis:

```json
{
  "schemaVersion": 1,
  "variantId": "terminal-pedestal-compact-daeyang",
  "geometryId": "terminal-pedestal",
  "materialProfileId": "terminal-daeyang",
  "uniformScale": 0.8
}
```

Das ist kein heute vom Terminalgenerator akzeptiertes Rezept. Die Version gehört zum neuen Vertragsentwurf und ersetzt nicht die gleichnamige Versionsnummer bestehender Terminalrezepte. Ein maschinenlesbares Familienschema, Loader und semantischer Validator sind bei der Umstellung gemeinsam zu ergänzen. Unbekannte IDs/Slots, fehlende Pflichtbindungen und ungültige Parameter werden dann vor Bau oder Laden abgewiesen.

Die kanonische Lieferung enthält pro anderer Basis eine GLB und die bearbeitbare Quelle bzw. das Rezept. Gemeinsame Texturen liegen getrennt vor oder werden über wiederverwendete Laufzeitressourcen gebunden. Ein optionaler Einzel-Export darf alle benötigten Daten selbstständig einbetten; er vervielfacht nicht den kanonischen Familienbestand.

Geometrie-Buildschlüssel berücksichtigen Rezept-/Codeversion, formwirksame Parameter, geometriewirksame Seeds, Quellhashes und relevante Werkzeugversionen. Ein nur die Displaygrafik betreffender Seed gehört in den Texturschlüssel. Paletten und Instanzskalierung erzwingen keinen Geometriebau. Ein gesonderter Lieferhash darf alle Daten eines fertigen Einzel-Exports abdecken.

## Wann eine neue Basis nötig ist

- Farbe, Rauheit und Emission verwenden dieselbe Basis.
- Ein anderes Bild verwendet dieselbe Basis, solange die vorhandenen UVs/Slots ausreichen.
- Ein anderes Gehäuse, zusätzliche Öffnungen, echte Verformung, Displacement oder eine andere benötigte UV-Aufteilung können eine eigene Basis erfordern.
- Name, Organisation und Katalogkategorie rechtfertigen keine neue Geometrie.

UV-Unterschiede sind Meshdatenunterschiede, auch bei gleicher Silhouette. Nichtuniforme Größenänderungen müssen wegen Proportionen und Details beurteilt werden. Wiederverwendung soll begründet sein, ohne jede Formvariante auf ein gemeinsames Mesh zu zwingen.

## Laufzeit und überprüfbare Abnahme

Ein umgestellter Loader lädt eine Basis einmal pro Inhaltsrevision. Gleichzeitige Anforderungen teilen auch den laufenden Ladevorgang. Platzierungen teilen Geometrieressourcen; Transforms und eigene oder gemeinsam gecachte Materialprofile gehören zu den Instanzen. Eine geänderte Palette darf andere Exemplare nicht unbeabsichtigt umfärben. Das Entfernen eines Exemplars darf noch verwendete Ressourcen nicht freigeben.

Geometriewiederverwendung senkt redundante Lieferung und Ressourcenbelegung. Sie belegt keine bestimmte Framerate und senkt Drawcalls nicht automatisch. Instancing, Materialzusammenlegung und Atlanten sind gesonderte, bei Bedarf gemessene Optimierungen.

Bei der Umstellung sind diese Nachweise erforderlich:

1. Palettenwechsel und uniforme Skalierung erzeugen keine zusätzliche Basis. Vergleiche relevante Meshdaten einschließlich UVs, Normalen und Slotaufteilung, nicht die vollständigen GLB-Bytes mit anderen Materialien/Metadaten.
2. Beim Durchschalten aller Varianten lädt eine frische Browserseite höchstens die Zahl unterschiedlicher Basen. Prüfe außerdem die tatsächlich geteilten Geometrieressourcen; ein HTTP-Cachetreffer allein genügt nicht.
3. Zwei gleichzeitig sichtbare Exemplare verschiedener Paletten behalten ihre Erscheinung. Wechsel und Entfernen eines Exemplars beschädigen das andere nicht.
4. Unbekannte Referenzen, ungültige Größen und Ladefehler führen zu einem erkennbaren Fehler; nach Korrektur ist weiteres Laden möglich.
5. Format, Maße, Ursprung, Budgets, Herkunft und Darstellung bleiben geprüft. Gleiche Inputs sind innerhalb der dokumentierten Werkzeugkombination reproduzierbar; bytegleiche GLBs über beliebige Blender-Versionen werden nicht behauptet.

Der Bericht nennt Umgebung, Basen/Varianten, gemessene Werte, ausgeführte Prüfungen und offene menschliche Artabnahme. Abbildungen zeigen tatsächliche Lieferungen.

## Terminalpilot: Bestand und nächster Schnitt

Der [Pilot](TERMINAL_PILOT.md) liefert 18 vollständige GLBs: drei Formen × zwei Skalierungen × drei Paletten. Die vorhandene Prüfung bestätigt drei unterschiedliche Positions-/Index-Geometrien. Der Browser lädt weiterhin je Auswahl die vollständige Variante. Diese Hashes ersetzen noch nicht den oben geforderten Vergleich sämtlicher relevanter Meshattribute.

Nächster Umsetzungsschnitt: drei neutrale Basen erzeugen, Paletten/Größen als Variantendaten veröffentlichen, Loader auf gemeinsame Ressourcen umstellen und die Prüfung um Wiederverwendungsnachweise erweitern. Aktuelle Standalone-GLBs bleiben bis zur geprüften Umstellung nutzbar. Mit dem Anlegen des Skills wurde keine automatische Migration durchgeführt.

Vorhandene Befehle aus dem Projektstamm:

```powershell
corepack pnpm generate:terminals
corepack pnpm build:terminals
corepack pnpm check:terminals
corepack pnpm dev:terminals
```

`generate:terminals` baut aktuell vollständige Exportkombinationen. `check:terminals` prüft nach dem Build den bisherigen Piloten einschließlich isolierter Wiederholungsbauten; es ist kein reiner Nur-Lese-Befehl und noch kein Nachweis für einen umgestellten Loader. Bei einem reinen Konzept- oder Farbwunsch ist kein vollständiger Familienbau erforderlich.
