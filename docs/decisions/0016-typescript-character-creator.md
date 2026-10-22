# 0016 – Lokaler TypeScript-Character-Creator mit gemeinsamer Rigstruktur

Ergänzung vom 22.10.2026: Die Standardquelle wird auf ausdrücklichen Folgeauftrag durch den CC0-Master ersetzt, siehe [0017](0017-quaternius-figurenbibliothek.md). Diese Entscheidung beschreibt weiterhin die separat erreichbare eigene prozedurale Quelle.

Datum: 21.10.2026. Umsetzungsauftrag: „plane es und lasse es von luna subagents umsetzen“. Diese Entscheidung gilt für den begrenzten visuellen GEN-10-Piloten, nicht für Kampagnenwerte oder den Abschluss von M6/M7.

## Ausgangspunkt

Die Recherche in 0015 und der Folgefrage zum Character-Creator zeigt passende modulare Ansätze. Die untersuchten MIT-Editoren nutzen andere Renderer/Exportverträge; die besonders passenden prozeduralen Kandidaten `avatarkit` und `lowpolyrealrigs` weisen keine ausdrückliche Codelizenz aus. Ungeklärter Fremdcode und zusätzliche Renderer werden deshalb nicht übernommen. Der Nutzer beauftragt jetzt Umsetzung mit Luna-Subagenten.

## Entscheidung

Eine separate Figuren-Werkstatt unter `characters.html` nutzt React und den installierten Babylon-Renderer. Ein reines TypeScript-Paket erzeugt aus einer validierten versionierten Spezifikation eigene Low-Poly-Geometrie mit einer stabilen humanoiden Rigstruktur. Gemeinsame Slots und fünf Materialrollen erlauben kosmetische Varianten. GLB exportiert Skin und die sieben vorhandenen Clip-Anforderungen; eine unabhängige Blender-Prüfung sichert eine echte bearbeitbare Blend-Datei.

Damit wird die Blend-Quellenregel aus 0007 für diese prozeduralen Figuren ergänzt: der reproduzierbare Produktionsbauplan ist das TypeScript-Rezept zusammen mit JSON und Werkzeugversionen. Blend bleibt eine bearbeitbare Produktionslieferung. Ein GLB-Import allein rekonstruiert keine parametrische Blender-Vorlage. Diese Abweichung ist bewusst, weil der Folgeauftrag einen TypeScript-Character-Creator umsetzt.

Die Quelle verwendet Y-up, Vorderseite +Z, Fußsohle Y=0 und etwa 1,05 Welteinheiten Referenzhöhe passend zum Bestand. Der Exporter übernimmt die glTF-Achsenumrechnung. Ein gemeinsamer Bindevertrag gilt für alle Varianten. Animationen sind einfache Pilotclips; finale menschliche Bewegungs- und Artabnahme bleibt offen.

## Grenzen

Keine Änderung an `packages/sim`, Server, Sichtregeln, Gebäudelayout oder bestehenden Taktikansichten. Kein v0.1- oder Acht-Spieler-Nachweis. Die Werkstatt hat keine Netzwerk-/Profilpersistenz; ihre Sitzungen sind unabhängig. Spielintegration ist ein Folgeauftrag. Keine zusätzlichen Abos, Modell-APIs oder fremden Figurenassets. Plan und tatsächliche Nachweise stehen in [CHARACTER_CREATOR.md](../CHARACTER_CREATOR.md).
