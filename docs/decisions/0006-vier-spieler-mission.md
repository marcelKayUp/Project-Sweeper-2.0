# 0006 · Vier Spieler, eine Mission

Datum: 21.10.2026 · Status: Arbeitsentscheidung für Stück 4, keine Produktfreigabe.

## Anlass

Stück 4 verlangt, dass vier getrennte Browser dieselbe handgebaute Mission „Ghost Floor“ vom Start bis zu genau einem serverseitigen Abschluss spielen. [PROTOTYP.md](../PROTOTYP.md) beschreibt dafür v0.1. Overwatch, Medkit, Bots, Reconnect und die Frist sind in diesem Stück nicht der Nachweis.

## Entscheidung

- Installierbare 0.18-Linie, exakt festgehalten: `@colyseus/core` 0.18.19, `@colyseus/ws-transport` 0.18.4, `@colyseus/schema` 5.0.42, `@colyseus/sdk` 0.18.5. Das Metapaket `colyseus` 0.18.9 verlangt Core `^0.18.18`; 0.18.19 liegt in dieser Linie. Der Raum ist privat, hat vier Slots und schreibt keine Tokens in Logs.
- Der Regelkern bleibt in `packages/sim`. Er importiert keine Darstellung und kein Netzwerk. Kampfwürfe laufen weiter über `resolveShot` und den Combat-RNG. Die Gegnerphase ist deterministisch und würfelt nur, wenn ein Schuss gültig ist.
- Für diesen Nachweis stehen zwei Wachen auf der Karte, beide mit Gewehr und denselben Schussregeln. Sechs Gegner, Overwatch, Medkit und ein Crewbot fehlen hier bewusst.
- Die Crewphase endet, wenn alle handlungsfähigen Runner bereit sind. Eine Echtzeitfrist gibt es in diesem Raum nicht. Missionsende entsteht nur aus Kopie plus Extraktion, aus dem Verlust aller handlungsfähigen Runner oder nach 24 beendeten Runden.
- Die Missionskarte ist eine DOM-Ansicht. Phaser bleibt für die früheren Gefechtsstücke zuständig. So können vier Browser-Kontexte Felder und Aktionen bedienen und das bestätigte Ergebnis lesen. Die künftige Zielansicht steht in [0007](0007-babylon-taktikansicht.md) und ersetzt diesen Nachweis nicht rückwirkend.
- Die handgebaute Karte liegt als Datenmodul neben dem Regelkern, analog zur bestehenden Deckungsfixture. Ein Content-Loader kommt mit diesem Stück nicht hinzu.

## Offen

Menschliche Spielzeit und Verständlichkeit sind nicht geprüft. Reconnect, Bots und der volle Aktionsumfang aus v0.1 bleiben offen.
