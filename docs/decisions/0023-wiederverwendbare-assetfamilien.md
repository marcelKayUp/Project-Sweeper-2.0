# 0023 – Wiederverwendbare Assetfamilien und gemeinsamer Agenten-Skill

Datum: 22.10.2026. Status: dokumentierter Vertragsentwurf und projektlokaler Skill; Laufzeitumstellung offen.

## Anlass

Der Terminalpilot exportiert 18 Kombinationen, obwohl Farbe und uniforme Größe dieselben drei Geometrien weiterverwenden können. Auf die Frage nach einer Formalisierung für unterschiedliche Modelle werden Wiederverwendungsregeln und Agentenablauf gemeinsam festgehalten.

## Festgehaltene Richtung

Der [Familienvertrag](../ASSET_FAMILIES.md) trennt Geometriebasis, Material-/Texturprofil und Varianten-/Instanzdaten. Paletten- und Skalierungsänderungen sollen keine neue Basis erzeugen. Unterschiedliche Formen, notwendige UV-Aufteilungen oder inkompatible Rigs werden nicht künstlich vereinheitlicht.

Der [Skill](../../.agents/skills/asset-families/SKILL.md) beschreibt Entscheidungen, vorhandene Werkzeugwege und erforderliche Nachweise. Claude Code erhält einen kurzen Einstieg unter `.claude/skills`, der dieselbe Quelle lädt. Es entstehen keine anbieterspezifischen Produktionsskripte oder neuen Dienstabhängigkeiten.

Prüfungen müssen bei einer späteren Umstellung die tatsächliche Wiederverwendung und unabhängige Materialvarianten belegen. Formatkonformität und ein gleiches Bild allein reichen nicht. Ein selbstständiger GLB-Export bleibt ein optionales Lieferformat.

## Grenzen und Folgearbeit

Die Formalisierung ändert weder Generator noch Vorschau aus [0022](0022-parametrische-terminal-familie.md). Familienschema, semantische Validierung, getrennte Bau-/Cachepfade und gemeinsamer Browserloader sind ein eigener kleiner Umsetzungsschnitt. Produktübergreifende Skill-Ausführung ist noch nicht erprobt.

Keine neue Spielregel, Abhängigkeit, Subscription oder zusätzliche M7-/MVP-Abnahme. Der dokumentierte Zielzustand behauptet keine bereits implementierte Laufzeitfunktion.
