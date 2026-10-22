# 0015 – Vorschlag für eine agentengesteuerte Low-Poly-Asset-Pipeline

Status: **Vorschlag zur Prüfung; nur Recherche und Planung beauftragt.**  
Datum: 21.10.2026

## Kontext

Der Nutzer möchte eine mit Codex, Claude Code oder Cursor bedienbare Low-Poly-Produktion ohne weitere Abos. Parametrisierter Blender-Zugriff ist ausdrücklich möglich. [0007](0007-babylon-taktikansicht.md) legt Blend als Quelle, GLB, Maßstab 1,0 und stilisiertes Cyberpunk fest. GEN-10 trennt Offline-Produktion und Laufzeitauswahl. Eine Implementierungsfreigabe liegt für diesen Auftrag nicht vor.

## Vorgeschlagene Richtung

- Blender-Python-Rezepte mit geprüften JSON-Parametern bilden den Bauplan. Varianten teilen Stil, Anker und technische Grenzen. Geometry Nodes nur ergänzen, wenn eine Familie davon profitiert.
- Hintergrundprozesse erzeugen Blend, GLB, Vorschauen und Prüfbericht. Die bestehende Brücke `ahujasid/mcp-for-blender` ist der Kandidat für interaktive Agentenarbeit. Kein eigener allgemeiner MCP-Server.
- Passende Bausteine aus `EL4CTEO/blender-skills` nach Prüfung wiederverwenden; GLB zusätzlich unabhängig mit dem Khronos-Validator prüfen. Kandidat für den gemeinsamen API-Zweig ist Blender 5.2 LTS, genaue Versionen erst bei Einrichtung qualifizieren.
- Zuerst ein Prop und ein kleines Umgebungskit, geriggte Figuren mit sieben Pflichtclips als eigener Folgeschritt. Agentengesteuerte Bildprüfung ergänzt technische Prüfungen, ersetzt keine menschliche Lesbarkeitsabnahme.
- Keine zusätzlichen Modell-APIs oder Abos als Voraussetzung. Lokales Kiln ist die Vergleichsalternative; eine Übernahme als Hauptkern würde den bisherigen Quellformatvertrag ändern und braucht eine ausdrückliche Folgeentscheidung.
- Annahme friert fertige Dateien, Quellenangaben und Hashes ein. Laufzeitgeneratoren verwenden stabile Asset-IDs. Meshes erzeugen keine Spielregeln.

## Folgen und Grenzen

Dies konkretisiert GEN-10 als separat beauftragbare Produktionsstrecke. Es erweitert weder v0.1 noch M7 und ändert keine Architekturentscheidung aus 0007/0013. Der bestehende Gebäudegrundrissgenerator bleibt zuständig für die semantische Geometrie. Weitere Taktikdarstellung setzt `?stueck=sicht` fort; `?stueck=raster` bleibt unverändert.

Einrichtungs-, Export-, Bild-, Figuren- und Mehrclientnachweise sind offen. Es wurden keine Werkzeuge installiert oder Assets erzeugt. Recherche, Alternativen, Datenvertrag und gestufte Abnahme stehen in [ASSET_PIPELINE.md](../ASSET_PIPELINE.md).
