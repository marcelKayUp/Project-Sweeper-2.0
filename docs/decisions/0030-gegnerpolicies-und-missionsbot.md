# 0030 · Gegnerpolicies und missionsorientierter Crewbot

Datum: 22.10.2026 · Status: Arbeitsentscheidung für den Headless-Nachweis von M2, keine M3- oder Produktfreigabe.

## Anlass

[PROTOTYP.md](../PROTOTYP.md) verlangt vier Wachen, zwei Flanker und einen missionsorientierten Crewbot. [0006](0006-vier-spieler-mission.md) hatte für den früheren Vier-Browser-Nachweis bewusst nur zwei Wachen. Overwatch und Medkit sind seitdem in der Simulation vorhanden. Offen war, wie die beiden Gegnerrollen ihre 8 AP ausgeben, ohne eine zweite Kampfimplementierung und ohne dass `packages/sim` eine Bot-Policy importiert.

## Entscheidung

- Regelversion der Mission ist 2. Ältere Replays passen nicht mehr, weil die Gegnerphase und der Zustand `contacts` dazukommen. Die Protokollversion bleibt 1.
- Wache ist die Vorgabe. Ein Flanker ist eine Einheit, deren Id mit `flanker` beginnt oder deren Name mit `Flanker` beginnt. Der Handbau nutzt die Id, der bestehende Generator den Namen.
- Pro Gegner und Phase höchstens ein Schuss, danach höchstens ein Schritt, danach Overwatch, solange Sicht, AP und eine Patrone bleiben. Rest-AP verfällt. Ohne frische eigene Sicht folgt ein Schritt zur gemeinsamen letzten Sichtung, sonst ein Patrouillenschritt.
- Eine Wache betritt eine orthogonal benachbarte Deckung, wenn sie dort vor dem gesehenen Runner geschützt ist und die Sicht behält. Ein Flanker betritt nur ein Nachbarfeld, dessen Deckungsabzug auf dasselbe Ziel strikt kleiner ist.
- Das Gegnerteam speichert zuletzt gesehene Felder handlungsfähiger Runner. Ein Feld verfällt, wenn ein Gegner darauf steht und niemand den Runner noch sieht. Ungesehene gegenwärtige Positionen werden nicht nachgetragen.
- Gleichstände folgen der Einheiten-Id und der Richtungsreihenfolge Nord, Ost, Süd, West. Die Suche besucht jedes Feld höchstens einmal. Der Bot-Stream würfelt dabei nicht.
- Der Crewbot lebt in `@neon/bots` und liest nur `TeamView`. Er kopiert, geht zur Extraktion und heilt sich unter halben HP, bevor er schießt. Unbekanntes Gelände betritt er nicht. Ein abgelehnter Befehl wird für diesen Runner als Bereit behandelt. Die Policy-Id ist `mission-v1`.

## Grenzen

Der Bot öffnet die Abkürzung nicht und erkundet keinen Nebel. Auf der Referenzkarte liegt das Terminal im Einstieg, deshalb kommt er dort ohne Kampf aus. Die defensive Übernahme eines ausgefallenen Controllers, der Server-Dateisink und die Vier-Browser-Abnahme bleiben M3.

## Verweise

[Prototyp](../PROTOTYP.md) · [Entwicklungsplan](../ENTWICKLUNGSPLAN.md) · [Vier Spieler, eine Mission](0006-vier-spieler-mission.md) · [Architektur](../ARCHITEKTUR.md)
