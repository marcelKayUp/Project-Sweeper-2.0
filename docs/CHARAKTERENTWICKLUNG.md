# NEON CONTRACT – Gestufte Charakterentwicklung

Stand: 20.10.2026 · Status: dokumentierte Entwurfsrichtung; konkrete Regeln, Kosten und Inhalte sind noch zu prüfen. Die Empfehlungen zu ARPG-Elementen und Aktionsquellen sind Vorschläge. Keine Implementierungsfreigabe.

Grundlage: Nutzerwunsch nach den drei Ausgangsattributen **Physisch, Sozial und Mental**, die sich an Wertschwellen günstiger spezialisieren lassen. Dasselbe Prinzip soll für Fertigkeiten gelten. Ein Beispiel ist **Waffenloser Kampf → Kickboxen → High-Kick**.

Einordnung: [M6 im Entwicklungsplan](ENTWICKLUNGSPLAN.md), MOD-13, S05/S06/S13/S14 und AP-24/AP-25. Die [Entscheidungsnotiz](decisions/0002-gestufte-charakterentwicklung.md) hält Herkunft und offene Entscheidungen fest.

## 1. Ziel und Umfang

Die Charaktererschaffung beginnt übersichtlich. Mit steigender Kompetenz können Spieler einzelne Bereiche genauer ausbauen. Breite Verbesserungen kosten mehr, weil sie viele Anwendungen beeinflussen; enge Verbesserungen kosten weniger und schaffen ein persönliches Profil.

Das ergänzt die im [Originalkonzept](../NEON_CONTRACT_Konzept.md) vorgesehene freie Spezialisierung durch Fertigkeiten, Cyberware und Ausrüstung. Das Konzept verlangt außerdem, dass neue Charaktere mit erfahrenen Runnern sinnvoll zusammenspielen können. Fortschritt soll deshalb vor allem zusätzliche taktische Möglichkeiten und begrenzte Verbesserungen schaffen.

Die Ausgestaltung gehört zur späteren Charakterentwicklung ab M6. v0.1/v0.2 behalten ihre festgelegten Presets und Aktionsregeln. Der vollständige Attribut-/Fertigkeitskatalog, eine Beuteökonomie und Cyberware sind keine zusätzlichen Voraussetzungen für deren Abnahme.

## 2. Gemeinsames Prinzip für Attribute und Fertigkeiten

- **Ausgangswerte:** Zunächst sind nur Physisch, Sozial und Mental als Attribute zu steigern. Die Startfertigkeiten werden separat festgelegt.
- **Erste Auffächerung:** Ab einer festgelegten Schwelle im übergeordneten Wert kann ein engerer Bereich gekauft werden, etwa Physisch → Geschick oder Waffenloser Kampf → Kickboxen.
- **Weitere Auffächerung:** Ab einer höheren Schwelle im spezialisierten Bereich kann eine noch engere Spezialisierung gekauft werden, etwa Geschick → Feinmotorik oder Kickboxen → High-Kick.
- **Kosten:** Eine gleich große Verbesserung mit kleinerem Anwendungsbereich soll günstiger sein. Konkrete Kosten und ihre Steigerungskurve sind offen.
- **Breite Entwicklung bleibt möglich:** Ein übergeordneter Wert kann auch nach dem Freischalten seiner Unterzweige weiter gesteigert werden.
- **Tiefe:** Für einen ersten Entwurf werden höchstens drei Ebenen empfohlen. Weitere Ebenen brauchen einen belegbaren spielerischen Nutzen.

Die Schwellen geben zusätzliche Kaufmöglichkeiten. Sie verteilen keine kostenlosen Punkte und erzwingen keine Spezialisierung.

## 3. Vererbung und Berechnung

Empfohlene Regel: Ein Zweig übernimmt den Wert seiner Vorfahren. Gekauft und gespeichert werden die zusätzlichen Punkte des jeweiligen Zweigs.

**Effektiver Bereichswert = Grundwert + gekaufte Zuschläge entlang eines passenden Pfads.**

Beispiel, ausschließlich zur Erklärung:

- Waffenloser Kampf **3** gilt für die allgemeinen zugehörigen Anwendungen.
- Kickboxen **+2** ergibt für passende Anwendungen **5**.
- High-Kick **+1** ergibt für diese Technik **6**.
- Wird Waffenloser Kampf später um einen Punkt erhöht, steigen diese Werte auf **4 / 6 / 7**. Eine allgemeine Steigerung hat entsprechend mehr Wirkung als eine einzelne Techniksteigerung.

Als vorläufiges Schwellenbeispiel könnte der übergeordnete Wert 3 die erste Spezialisierung und deren effektiver Wert 5 die nächste Ebene öffnen. Das ist keine festgelegte Werteskala oder Balanceregel. Startwerte, Schwellen und Obergrenzen bleiben offen.

Für **dauerhafte Lernvoraussetzungen** zählen Grundwert und dauerhaft gekaufte Zuschläge. Ausrüstung, temporäre Verstärkungen und Verletzungen ändern diese Lernvoraussetzungen nicht. So ermöglicht ein kurz angelegter Gegenstand keinen dauerhaften Ausbau, und sein Ablegen löscht keine erlernte Kompetenz. Einschränkungen der aktuellen Anwendung werden gesondert geprüft.

Eine Aktion verwendet je benötigtem Attribut beziehungsweise je benötigter Fertigkeit einen eindeutig passenden Pfad. Boni mehrerer Geschwisterzweige werden nicht zusammengerechnet. Können mehrere gelernte Kampfstile dieselbe Technik tragen, gilt der höchste passende Bereichswert; bei Gleichstand wird eine feste ID-Reihenfolge zur Anzeige und Aufzeichnung verwendet.

Damit ist noch keine Treffer-, Schadens- oder Würfelformel festgelegt. Insbesondere werden diese Beispielwerte nicht ungeprüft auf die Prozentwerte des Prototyps addiert.

## 4. Kompetenz und gelernte Techniken

Ein Fertigkeitsrang beschreibt die Beherrschung eines Bereichs. Eine gelernte Technik beschreibt eine ausführbare besondere Aktion oder eine klar definierte Variante. Beide Angaben müssen im Charakterbogen unterscheidbar sein.

High-Kick ist sowohl ein Beispiel für einen sehr engen Kompetenzbereich als auch eine mögliche benannte Technik. Vor ihrer Einführung muss feststehen, ob der Kauf der Technik bereits ihren ersten Zuschlag enthält oder ob Technik und weitere Ränge getrennt bezahlt werden. Die Oberfläche zeigt den vollständigen Preis und die Wirkung vor dem Kauf.

Eine Technik kann über mehrere passende Lernwege erreichbar sein, etwa über unterschiedliche Kampfstile. Sie besitzt trotzdem eine gemeinsame Identität und wird einmal gelernt. Mehrere Lernwege vervielfachen ihre Wirkung nicht.

## 5. Kombination mit ARPG-Fortschritt

Die Hierarchie lässt sich mit XP, Stufen, freischaltbaren Aktionen, Ausrüstungsverbesserungen und Synergien kombinieren. Sie beschreibt, **wofür** Entwicklungspunkte ausgegeben werden. Der Fortschrittsablauf beschreibt, **wann und wie viele** Punkte verfügbar werden. Die rundenbasierte Taktik bleibt damit vereinbar.

Empfohlener erster Ablauf:

1. Ein abgeschlossenes Missionsergebnis vergibt XP genau einmal.
2. XP führen nach einer noch festzulegenden Regel zu Entwicklungspunkten, gegebenenfalls über Stufenaufstiege.
3. Zwischen Einsätzen werden diese Punkte für allgemeine Werte, Spezialisierungen oder gelernte Techniken ausgegeben.
4. Ausrüstung und später Cyberware ergänzen die gewählte Spielweise durch konkrete Funktionen und begrenzte Modifikatoren.
5. Der nächste Einsatz startet mit bestätigten Werten und eingefrorenem Loadout.

Für die erste Fassung wird ein gemeinsames Entwicklungspunktebudget empfohlen. XP wären dabei die Fortschrittsmessung und keine zusätzliche zweite Kaufwährung für dieselbe Verbesserung. Direkte XP-Käufe sind eine mögliche Alternative, die vor der Umsetzung ausdrücklich gewählt werden muss.

Eine Stufe sollte zunächst den Fortschritt und verfügbare Punkte anzeigen. Automatische zusätzliche AP-, HP- und Schadenssprünge pro Stufe sind in diesem Vorschlag nicht vorgesehen. Neue Techniken können andere Ziele, Positionierungen, Reaktionen oder Ressourcennutzungen ermöglichen. Große Schadensmultiplikatoren aus Attributen, Fertigkeiten und Ausrüstung würden das Zusammenspiel mit Neueinsteigern erschweren.

Ein eigener weiterer Talentbaum neben den bereits verzweigten Fertigkeiten ist für den Einstieg nicht erforderlich. Begrenzte Umspezialisierung zwischen Missionen ist eine sinnvolle Prüfoption; Kosten, Rückerstattung und Umgang mit abhängigen Zweigen sind noch offen.

## 6. Aktionen durch Ausrüstung und Skills

Empfohlen wird ein Zusammenspiel mit nachvollziehbaren Quellen:

- **Grundaktionen:** Bewegung, einfache Interaktion und andere allgemeine Handlungen stehen aufgrund der Grundregeln zur Verfügung. Aktuelle Zustände und Ressourcen können sie einschränken.
- **Werkzeug- und Waffenaktionen:** Ein ausgerüsteter Gegenstand liefert seine vorgesehenen Standardfunktionen, etwa Schießen und Nachladen. Fertigkeitswerte beeinflussen deren Beherrschung. Eine geeignete Waffe wird nicht für jeden normalen Schuss zusätzlich durch eine erlernte Spezialtechnik gesperrt.
- **Gelernte Techniken:** Training eröffnet fortgeschrittene Aktionen oder Varianten. Eine Technik kann zusätzlich ein passendes Werkzeug erfordern. Waffenlose Techniken benötigen keine Waffe, wohl aber die festgelegten körperlichen und situativen Voraussetzungen.
- **Besondere Gerätefunktionen:** Ein konkreter Gegenstand kann eine eigene Aktion liefern, etwa ein Scanner mit Scan-Funktion. Ob Bedienausbildung erforderlich ist, steht in seiner Regeldefinition. Das Gerät verleiht dadurch keine dauerhaften Lernpunkte.

**Eine Aktion ist verfügbar, wenn ihre vorgesehene Quelle vorhanden ist und sämtliche für sie definierten Lern-, Ausrüstungs-, Zustands-, Ziel- und Ressourcenbedingungen erfüllt sind.** Manche Aktionen benötigen ausschließlich ein Werkzeug, manche eine gelernte Technik und manche beides.

Beispiele für spätere Designprüfung:

- **Normaler Schuss:** ausgerüstete Schusswaffe; Ausführung abhängig von Munition, AP und gültigem Ziel. Training kann die Anwendung verbessern.
- **Kontrollierter Feuerstoß als Spezialtechnik:** falls später eingeführt, gelernte Technik plus dafür geeignete Waffe und ausreichende Ressourcen. Der vorhandene Feuerstoßmodus gehört zur Waffe; das Training eröffnet das besondere kontrollierte Manöver. Eine höhere allgemeine Fertigkeit erzeugt keine Feuerstoßfunktion an einer ungeeigneten Waffe.
- **High-Kick:** gelernte Technik und gültige Nahkampfsituation. Eine Beinverstärkung könnte seine Wirkung ändern; das Training bleibt Bestandteil des Charakters.
- **Gerätescan:** Gerät mit definierter Scan-Funktion, erforderliche Bedienkompetenz sofern vorgesehen, gültiges Ziel und Ressourcen.

Diese Beispiele sind keine Erweiterung des Prototypumfangs. Bereits vorgesehene Grundfunktionen wie Overwatch und das Missionshacken bleiben für den aktuellen Slice nach dessen Regeln zugänglich; die Progressionsplanung macht daraus nachträglich keine Pflichtklasse.

Eine gelernte Technik bleibt im Charakter gespeichert, wenn ihre Ausrüstung fehlt. Sie wird als aktuell nicht nutzbar mit konkretem Grund angezeigt. Eine ausschließlich vom Gegenstand gelieferte Aktion entfällt ohne diesen Gegenstand. Identische Aktionen aus mehreren Quellen werden einmal angeboten; Modifikatoren folgen ausdrücklichen Kombinationsregeln.

Begleiter und Cyberware erhalten durch diese Progression keinen unabhängigen zusätzlichen Vollzug. Aktionskosten und Reaktionen bleiben Teil der gemeinsamen taktischen Regeln.

## 7. Kosten, Risiken und spätere Prüfziele

Für eine spätere konkrete Regelfassung sind folgende Fälle zu belegen:

- Gleiche gekaufte Grundwerte und Zuschläge haben unabhängig von der erlaubten Kaufreihenfolge dieselben Gesamtkosten. Ausrüstung darf keine billigere Lernabkürzung erzeugen.
- Bei gleichem Punktebudget ist sowohl breite Kompetenz als auch eine Spezialisierung in geeigneten Situationen sinnvoll.
- Eine billige Technik wird nicht durch ständige universelle Einsetzbarkeit zur besten allgemeinen Kampfsteigerung. Reichweite, Zielbedingungen, Positionierung und Gegenmöglichkeiten müssen ihre tatsächliche Breite begrenzen.
- Der High-Kick und andere tiefe Techniken verdrängen nicht automatisch alle Grundaktionen. Etwaige Nachteile müssen im taktischen Regelsystem tatsächlich wirken.
- Kombinationen aus Attributpfad, Fertigkeitspfad und Ausrüstung überschreiten die vereinbarten Grenzen für Treffer, Schaden und Ressourcen nicht. AP-Rabatte benötigen wegen zusätzlicher Handlungsmöglichkeiten eine eigene Prüfung.
- Verlust einer benötigten Ausrüstungsquelle deaktiviert die betreffende Aktion, ohne gelernte Werte oder bereits verbrauchte Einsatzressourcen zurückzusetzen.
- Mehrere Lernwege oder Aktionsquellen erzeugen keine doppelten Techniken oder Wirkungen. Rückerstattungen lassen keine ungültigen Unterzweige bestehen.
- Physische, soziale und mentale Verbesserungen erhalten konkrete Anwendungen. Insbesondere soziale Werte brauchen passende Spielsysteme, bevor sie als lohnende Käufe angeboten werden.

Dies sind geplante Nachweise. Es gibt noch keine implementierte Progression oder gemessene Balanceergebnisse.

## 8. Darstellung und Zuständigkeiten

**S05/S06:** Charaktererschaffung und -bogen beginnen mit den drei Attributen. Freigeschaltete beziehungsweise gekaufte Zweige lassen sich auffächern. Bekannte Folgeoptionen können als Vorschau sichtbar bleiben. Grundwert, eigener Zuschlag, effektiver Wert und aktuelle Ausrüstungsmodifikatoren sind unterscheidbar.

**S13/S14:** Kosten, Schwelle, nächste Wirkung und fehlende Voraussetzungen stehen direkt beim Zweig. Die Aktionsvorschau nennt Quelle, benötigtes Gerät und zuständige Kompetenz. Ein Kauf ist vor dem Bestätigen als Entwurf vergleichbar.

**S07/S09:** Loadout-Vergleich und Aktionsdetails erklären, welche Aktionen durch einen Gegenstand verfügbar werden oder wegfallen. Im Einsatz stehen die aktuellen, bestätigten Aktionswerte im Vordergrund; die vollständige Entwicklung bleibt im Charakterbereich.

**MOD-13/AP-25:** Für den ersten M6-Ausbau wenige exemplarische Zweige und vorhandene taktische Effekte wählen. Ein vollständiger Kampfstil- oder Technikkatalog ist ein eigener Ausbau. MOD-04 führt die Aktionsregeln aus; MOD-13 liefert die dafür benötigte Kompetenz und Ausstattung.

**MOD-14 sowie spätere GEN-05/GEN-06:** Käufe, Voraussetzungen und Resultatbuchungen verwenden dieselben versionierten Definitionen. Generatoren dürfen nur gültige Kombinationen aus vorhandenen Techniken, Gegenständen und Kompetenzen erzeugen. Während einer Mission entscheidet der Server über die aktuell zulässigen Aktionen; Clients und Bots reichen dieselben normalen Spielbefehle ein.

## 9. Noch zu entscheiden

Vor einer Implementierung: Werteskala und Startbudget; konkrete Attribut-/Fertigkeitszweige; Schwellen und Kostenkurve; Obergrenzen; Verhältnis von Attribut und Fertigkeit in Aktionsproben; Kaufregel für Techniken und Ränge; XP-/Stufenökonomie; Umspezialisierung; Grenzen von Gegenstandsboni; ausreichend sinnvolle soziale und mentale Anwendungen.

Die drei Ausgangsattribute und das gestufte Spezialisierungsprinzip stammen aus dem Nutzerwunsch. Vererbung, anfängliche Begrenzung auf drei Ebenen, gemeinsame Punkteökonomie und das beschriebene Zusammenspiel von Skills und Ausrüstung sind ausgearbeitete Vorschläge zur Prüfung.

## 10. Geprüfte ARPG-Beispiele

Abgerufen am 20.10.2026. Die Quellen belegen unterschiedliche veröffentlichte Designansätze. Die Empfehlungen für NEON CONTRACT sind daraus abgeleitete eigene Vorschläge.

- **Diablo IV:** Blizzard beschreibt für Update 3.0.0 schrittweise zugängliche Verzweigungen aktiver Skills und Wechselwirkungen mit Gegenstandseigenschaften. Das zeigt, dass Skillränge, Varianten und Ausrüstung gemeinsam einen Build prägen können. [Offizieller Überblick, Abschnitt „Major Skill Tree Updates“](https://news.blizzard.com/en-us/article/24267729/prepare-for-the-reckoning-lord-of-hatred-draws-near).
- **Last Epoch:** Ein Entwicklerbeitrag vom 06.06.2025 erläutert Fertigkeitsbäume mit breiten frühen Optionen, späteren Nischen und unterschiedlichen Spielweisen innerhalb derselben Fähigkeit. Der Beitrag betont außerdem, dass einzelne Knoten nicht zu verpflichtenden Entscheidungen werden sollen. [Making Last Epoch – Skill Design](https://forum.lastepoch.com/t/making-last-epoch-skill-design/78179).
- **Path of Exile 2:** Die offizielle Übersicht beschreibt Skill Gems als Gegenstände, die aktive Fähigkeiten gewähren, und Support Gems als Veränderung ihres Verhaltens. Das ist ein Beispiel für einen stärker an Gegenstände gebundenen Zugang zu Aktionen. [Offizielle Early-Access-Übersicht, „New Skill Gem System“](https://pathofexile2.com/en/early-access).
