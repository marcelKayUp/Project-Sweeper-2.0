# NEON CONTRACT – Konkurrenzstrukturen für HTN-getriebene Geschichten

Version 8 · 22.10.2026 · **Konzeptentwurf auf ausdrücklichen Auftrag.**

Die Organisationen bilden eine Domäne für die Erzeugung von Geschichten. Sie besitzen Interessen, Fähigkeiten und Abhängigkeiten und verfolgen innerhalb einer konkreten Weltlage unterschiedliche Ziele. Handlungen und Gegenhandlungen entstehen aus diesem Gefüge. Der [Katalog](ORGANISATIONSKATALOG.md) beschreibt alle 70 Akteurspotenziale; feste Konfliktketten, Ansprechpartner, Schauplätze oder Enden werden daraus nicht vorgeschrieben.

Diese Fassung folgt der Nutzerkorrektur, Konkurrenzgebilde für eine HTN-getriebene Geschichte auszuarbeiten. Die [Nutzerfassung V6](sources/cyberpunk_konzerne_v6.md) bleibt erhalten, die vier Altentwürfe bleiben verworfen. Einordnung: [0020](decisions/0020-organisationslandschaft-und-lokale-konflikte.md).

## 1. Generatives Grundprinzip

Eine Geschichte entsteht, wenn ein Akteur einen gewünschten Zustand erreichen möchte, dafür Ressourcen oder Zustimmung anderer benötigt und seine Handlungen die Möglichkeiten weiterer Akteure verändern. Andere können denselben Zustand verhindern wollen, aus eigener Abhängigkeit helfen oder eine Alternative anbieten.

Ein Konzern kann Auftraggeber, Partner oder Konkurrent sein. Eine Gemeinschaft kann dieselben Rollen einnehmen. Nicht jede Konkurrenz führt zu Gewalt, und nicht jede Geschichte braucht Verrat. Autoren definieren Motive, Beziehungen und zulässige Vorgehensweisen; das Szenario bindet diese Möglichkeiten an einen konkreten Zustand.

HTN stellt dafür abstrakte Aufgaben, alternative Zerlegungsmethoden und primitive Operatoren bereit. Methoden haben Anwendbarkeitsbedingungen. Der Planner zerlegt die vorgegebenen Aufgaben; die Auswahl eines Akteursziels und dessen Motivation müssen wir zusätzlich modellieren. Grundlage: [SHOP-Projekt der University of Maryland](https://www.cs.umd.edu/projects/shop/description.html). Die konkrete Architektur unten ist unser Projektvorschlag.

## 2. Profil, Zustand und Planungsdomäne

**Organisationsprofil:** Identität, wirtschaftliche Domäne, typische Machtbasis, Abhängigkeiten, wiederkehrende Interessen, bevorzugte Mittel und innere Spannungsachsen. Ein Profil beschreibt Fähigkeiten und Präferenzen, keine unbegrenzten tatsächlich verfügbaren Ressourcen.

**Weltzustand:** konkrete Bestände, Rechte, Standorte, Verträge, Angebote, Informationen und bestätigte Ereignisse. Weltjahr und Region sind Szenarioparameter; die Gründungsgeschichten müssen dazu passen. Das zuvor vorgeschlagene Jahr 2057 und der Hafenbezirk sind keine Voraussetzung.

**Akteurszustand:** eigener Wissensstand, aktive Ziele, Prioritäten und Bindungen. Akteure können irren. Interne Sparten werden nur dann als Unterakteure modelliert, wenn deren Eigeninteressen relevant sind; der erste Ansatz simuliert nicht sämtliche Abteilungen.

**Planungsdomäne:** gemeinsame Aufgaben, Methoden und Operatoren. Jede ausführbare Änderung braucht Voraussetzungen, Kosten, Wirkung und Sichtbarkeit. Eine Textformulierung kann diese Wirkung nicht nachträglich erfinden.

## 3. Gemeinsame Ressourcenfamilien

- **Kapital:** verfügbar, gebunden, geschuldet oder als Sicherheit reserviert.
- **Kapazität:** Produktion, Energie, Wartung, Transport oder Facharbeit mit Typ, Menge und Geltungsbereich.
- **Zugangsrechte:** Nutzung von Anlagen, Schnittstellen, Routen oder Standards; Eigentum und Nutzungsrecht sind getrennt.
- **Information:** Wissen und Belege; Kopien können mehreren Parteien gleichzeitig vorliegen.
- **Verpflichtungen:** zugesagte Lieferung, Schutz, Kredit oder Abnahme zwischen benannten Beteiligten.
- **Bindung und Anerkennung:** Unterstützung konkreter Gruppen sowie Rechte und Pflichten aus Bündnissen.

Eine Transportkapazität kann belegt werden; Information wird durch Kopieren nicht beim bisherigen Besitzer gelöscht. Ein Nutzungsrecht kann örtlich oder zeitlich begrenzt sein. Die Ressourcentypen werden deshalb nicht auf einen universellen Machtwert reduziert.

Eine Abhängigkeit lautet: **A benötigt R für ein aktives Ziel; B kontrolliert einen geeigneten Zugang zu R.** Sie wird schwächer, wenn A eine tatsächlich unabhängige Alternative gewinnt. Ein zweiter Anbieter unter Kontrolle desselben B erfüllt dieses Ziel nicht automatisch.

## 4. Wiederverwendbare Konkurrenzmuster

**Horizontale Konkurrenz:** A und B möchten denselben begrenzten Markt, Auftrag, Standort oder Kunden gewinnen.

**Vertikale Abhängigkeit:** A benötigt eine Vorleistung von B. Vertragsabsicherung, neue Lieferanten und eigene Kapazität verändern die Abhängigkeit unterschiedlich.

**Standards und Zugang:** Akteure möchten beeinflussen, welche Schnittstellen, Lizenzen und Identitäten ein Netz akzeptiert. Ein offener Standard kann seinen Initiator stärken oder austauschbar machen.

**Vermittlung:** Ein Akteur kontrolliert die Verbindung zwischen anderen, etwa Bewertung, Zahlung, Versicherung oder Transport. Andere können ihn stärken, umgehen oder ersetzen.

**Gesellschaftliche Bindung:** Akteure konkurrieren um Beschäftigte, Kunden, Mitglieder und Unterstützung. Versorgung und Schutz können die Bindung stärken; restriktiver Zugang kann sie beschädigen.

**Innere Konkurrenz:** Wachstum oder Reserve, offener Zugang oder Kontrolle, Soforthilfe oder Bestandserhalt. Die Spannungsachsen des Katalogs werden erst durch eine konkrete Lage zu aktiven Konflikten.

Mehrere gerichtete Beziehungen können gleichzeitig bestehen. Ein Lieferant kann Rivale und Kreditnehmer desselben Partners sein. Wer tatsächlich konkurriert, ergibt sich aus unvereinbaren Zielen, knappen Ressourcen oder strittigen Rechten im aktuellen Zustand.

<a id="buendnisse"></a>

## 5. Bündnisse als Kooperationsstrukturen

Ein Bündnis verbindet gemeinsamen Nutzen mit begrenzten Verpflichtungen. Es erzeugt weder pauschalen Gehorsam noch eine universelle Feindschaft. Konkrete Verträge benötigen Gegenstand, Beteiligte und Geltungsbereich.

### 5.1 Die Dreifaltigkeit

**Kern:** Daeyang, Luzsfera, Vantier; Sogno als assoziierter Medienpartner. Der Name bezeichnet die drei Kernfunktionen Daten, Netz und Finanzierung.

**Gemeinsamer Nutzen:** verbundene Identitäts-, Kunden- und Abrechnungssysteme. **Konkurrenz:** Kontrolle des Kundenzugangs und Austauschbarkeit der Partner. **Bindungen:** Schnittstellen und Zahlungszusagen. **Bruchpotenzial:** Ein Vorhaben entwertet diese Zusagen oder entzieht einem Partner seine Vermittlerrolle.

### 5.2 Der Körperbund

**Kern:** Nakamura-Lindahl, Clinique Aube, Kaveri.

**Gemeinsamer Nutzen:** kompatible Produkte und Versorgung. **Konkurrenz:** Patente, Behandlungszugang, Kontrolle des Produktlebenszyklus. **Bindungen:** Lizenz-, Liefer- und Kompatibilitätsverträge. **Bruchpotenzial:** eigene Standards, zurückgehaltene Vorleistungen oder konkurrierende Zugangsmodelle.

### 5.3 Die Ordnungsmacht

**Kern:** Falkenfeld-Kessler und Redlake; weitere Dienstleister werden je Auftrag angebunden.

**Gemeinsamer Nutzen:** Schutz, Vollzug und Verwaltung lassen sich gemeinsam anbieten. **Konkurrenz:** Zuständigkeit, Haftung und Erlösanteile. **Bindungen:** Schutz-, Übergabe- und Betriebsverträge. **Bruchpotenzial:** Verlagerung von Kosten oder Verantwortung auf den Partner.

### 5.4 Die Himmelsfraktion

**Kern:** Adeyemi, die Tochter Azur Transit, der unabhängige Partner Pinoy Orbital.

**Gemeinsamer Nutzen:** Zugang, Transport und Wartung greifen ineinander. **Konkurrenz:** Eigenständigkeit und Verteilung knapper Kapazität. **Bindungen:** Kontingente, Rücktransport und Beteiligungen. **Bruchpotenzial:** alternative Routen oder veränderte Zugangskontrolle.

### 5.5 Die Lebensversorger

**Kern:** Sanjivani, Waterlicht, Southern Cross; örtliche Betreiber besitzen eigene Verträge.

**Gemeinsamer Nutzen:** Nahrung, Wasser, Luftfilterung und Energie sichern einander ab. **Konkurrenz:** Vorleistungen, Preisgestaltung und Vorrang. **Bindungen:** Austausch, Reserven und Kontingente. **Bruchpotenzial:** Ein Vorhaben verschiebt Knappheit und Kosten zulasten eines Partners.

### 5.6 Die Baumeister

**Kern:** Qasr-Stahl mit wechselnden Projektpartnern. Der Name bezeichnet einen Projektverbund, keine feste Liste gleichberechtigter Eigentümer.

**Gemeinsamer Nutzen:** Finanzierung, Material, Bau und Betrieb werden verbunden. **Konkurrenz:** Standorte, Nachträge und Betriebserlöse. **Bindungen:** konkrete Projektverträge. **Bruchpotenzial:** neue Eigentümer, alternative Beschaffung oder veränderte Nutzung.

## 6. Vom Interesse zum aktiven Ziel

Ein Interesse ist dauerhaft, ein Ziel situationsgebunden. „Eigenständigkeit stärken“ kann aktiv werden, wenn ein Zugang bedroht und eine Alternative erreichbar ist.

Eine kleine Zielauswahl vor der HTN berücksichtigt bedrohte und ungenutzte Ressourcen, Verpflichtungen, Akteurswissen, Priorität, Kosten und Risiko. Anfangs genügen explizite Prioritätsregeln. HTN allein wählt nicht automatisch die richtigen Organisationsziele.

Gemeinsame Zielklassen sind **Zugang sichern**, **Abhängigkeit verringern**, **Marktposition ausbauen**, **Verpflichtung erfüllen**, **Kapazität schützen**, **Konkurrenz begrenzen** und **Zusammenhalt erhalten**. Jeder Zieltyp kann für verschiedene Organisationstypen gelten.

Ein aktives Ziel nennt Akteur, Gegenstand, Umfang und Erfolgskriterium. Nach einer Zerlegung wird geprüft, ob deren erwartete Wirkung dieses Ergebnis erfüllt. Eine erfüllte Aufgabe ist nicht automatisch ein erreichtes strategisches Ziel.

<a id="methoden"></a>

## 7. Gemeinsame HTN-Aufgaben und Methoden

Eine kleine Aufgabenbibliothek genügt als Ausgangspunkt: Zugang beschaffen, Anbieter finden, Vertrag verhandeln, Kapazität aufbauen, Information beschaffen, Anspruch absichern, Unterstützung gewinnen und Operation beauftragen.

Das folgende Aufgabennetz ist eine parametrische Domänenskizze, keine festgelegte Geschichte oder ausführbare Planner-Syntax:

```text
Aufgabe: Abhängigkeit von A gegenüber B für Ressource R verringern

Methode: unabhängige Alternative
  Voraussetzung: geeigneter Anbieter C außerhalb der Kontrolle von B
  Unteraufgaben: Zugang klären; Vereinbarung erreichen; nutzbare Kapazität sichern

Methode: eigene Fähigkeit
  Voraussetzung: Technologie, Personal und Finanzierung erreichbar
  Unteraufgaben: Voraussetzungen beschaffen; Kapazität aufbauen; Nutzbarkeit bestätigen

Methode: verbessertes Nutzungsrecht
  Voraussetzung: B ist verhandlungsfähig; ein tragfähiges Angebot ist möglich
  Unteraufgaben: Position vorbereiten; Angebot vorlegen; Vereinbarung abschließen
```

Die Akteure werden erst aus dem Zustand gebunden. Die bevorzugten Mittel eines Profils ordnen passende Methoden; sie machen eine unzulässige Methode nicht gültig. Ein anderer Preis erfüllt beispielsweise nicht zwangsläufig das Ziel geringerer Abhängigkeit.

Information beschaffen kann sich wiederum in freiwilligen Austausch, Kauf, eigene Prüfung oder eine beauftragte Operation zerlegen. Jeder Weg braucht eigene Voraussetzungen und Effekte. Die Bibliothek wird wiederverwendet, anstatt 70 unterschiedliche Plots zu schreiben.

Primitive strategische Schritte können Angebote vorlegen, Angebote annehmen/ablehnen, Kapazität reservieren/freigeben, Information übergeben/veröffentlichen, Vereinbarungen ändern und Operationen anbieten beziehungsweise deren Ergebnis übernehmen.

Dabei gilt: Ein Angebot ist noch kein Vertrag. Ein Auftrag ist noch kein Erfolg. Veröffentlichung verändert Wissen, nicht rückwirkend die Wahrheit. Eine Zusage darf keine nicht verfügbare Kapazität erschaffen. Übernahme, Sabotage und Erpressung brauchen bei späterer Verwendung eigene begrenzte Operatoren; ihre Erwähnung implementiert keine Wirkung.

Die ausformulierte Zerlegung steht als Idee in [HTN-Auftragslogik](HTN_AUFTRAGSIDEE.md) und [0045](decisions/0045-htn-auftragsidee.md). Sie führt keine Regel ein.

## 8. Mehrere Akteure, Reaktionen und Spielerfreiheit

Der erste Ansatz benötigt keinen global optimalen Plan für alle 70 Organisationen. Ein begrenzter Ausschnitt verfolgt wenige Ziele; die anderen Akteure bleiben potenzielle Lieferanten, Vermittler und Hintergrundpartner.

Ein möglicher Ablauf ist:

1. Bestätigten Weltzustand und getrennte Wissensstände lesen.
2. Ziele wählen und anwendbare HTN-Methoden zu begrenzten Vorhaben zerlegen.
3. Fällige primitive Schritte seriell gegen den aktuellen Zustand prüfen und bestätigen.
4. Betroffene Akteure über wahrnehmbare oder zugestellte Ereignisse informieren.
5. Ungültige Restpläne verwerfen oder neu planen.
6. Bei Spielerangeboten und externen Operationen auf eine echte Entscheidung beziehungsweise ein bestätigtes Ergebnis warten.

Mehrere Einzelpläne sind nicht automatisch miteinander verträglich. Reservierungen und Rechte müssen beim Bestätigen erneut geprüft werden. Ein verworfener Suchzweig verändert den bestätigten Zustand nicht.

Ein Akteur plant aus seinem Wissen; die Weltvalidierung entscheidet über die tatsächliche Ausführbarkeit. Unbekannte Informationen werden ihm nicht zur Verfügung gestellt, nur weil sie einen interessanten Plan ermöglichen würden.

Methodentiefe, Suchbudget und Zahl gleichzeitig aktiver Vorhaben werden vor einer Umsetzung begrenzt. Eine festgelegte Sortierung und ein gespeicherter Seed machen Gleichstände nachvollziehbar. Bei fehlendem Plan wird das Vorhaben zurückgestellt oder mit einem erklärten Fehler beendet; es werden keine passenden Ressourcen nachträglich erfunden.

Die Crew kann ablehnen, anders handeln oder scheitern. Zukünftige Pläne reagieren darauf. Der Planner setzt Spielerzustimmung nicht voraus und schreibt bestätigte Entscheidungen nicht für einen gewünschten Spannungsbogen um.

## 9. Erzählung aus der kausalen Spur

Die Geschichte erklärt, warum ein Ziel aktiv wurde, welche Methode gewählt wurde, was dafür fehlte und welche anderen Möglichkeiten sich dadurch änderten. Personen und Orte werden zu passenden Rollen konkretisiert, sobald eine Situation gebunden ist.

Eine redaktionelle Auswahl kann interessante gültige Vorhaben hervorheben: erkennbare Abhängigkeit, mehrere plausible Mittel und relevante Folgen. Sie darf fehlende Beweise oder Rechte nicht erfinden, um einen vorgegebenen Plot zu erzwingen.

Dieselben Profile ergeben bei anderem Startzustand andere Geschichten. Gemeinsame Kapazität ermöglicht Kooperation; exklusive Knappheit erzeugt Konkurrenz; eine unabhängige Alternative verändert beide Verhandlungspositionen. Variation entsteht im Zustand und in der Methodenwahl, nicht nur beim Austausch der Namen.

## 10. Anschluss an Missionen, Gebäude und Figuren

Die strategische Geschichtenplanung begründet ein Vorhaben und gegebenenfalls ein Spielerangebot. Die Missionspipeline konkretisiert daraus ein taktisches Problem. Ihre bestehende Reihenfolge bleibt erhalten: Missionslogik, Topologie, taktisches Layout, Begegnungen, Darstellung und Prüfung; siehe [0008](decisions/0008-hierarchischer-missionsgenerator.md).

Gesuchte Daten benötigen eine eindeutige Verbindung zur beabsichtigten strategischen Wirkung. „Kopiert“ bedeutet nicht automatisch „Vertrag geändert“ oder „Konkurrent übernommen“. Der vorab definierte Folgeschritt übernimmt das bestätigte Missionsergebnis. Für eine erste spätere Verbindung steht nur der vorhandene Datenraub zur Verfügung; unimplementierte Eskorte oder Sabotage dürfen nicht als Spieleraktion angeboten werden.

Ein laufendes Missionspaket bleibt eingefroren. Strategische Planung verschiebt keine Gegner oder Siegbedingungen und gibt Bots keine geheimen Daten. Kampagnenfolgen werden an definierten Ereignisgrenzen bestätigt.

Gebäudebedarf entsteht aus der gebundenen Rolle: Produktion, Verwaltung, Lager, Vermittlung oder Prüfung. Der Gebäudegenerator löst die Geometrie. Öffentliche Farben und Zeichen kommen aus dem Organisationsprofil. Kleidung richtet sich nach Rolle und Situation; Körpermodell und individuelle Erscheinung bleiben davon unabhängig. Kosmetik erzeugt keine Kampfwerte.

Die neuen Organisations-IDs sind noch keine gültigen Auswahlwerte der bestehenden Werkstätten. Eine Integration braucht versionierte Profile, geprüfte Rezepte und einen expliziten Umgang mit dem verworfenen Altbestand. Öffentliche Assetmetadaten enthalten keine internen Ziele oder Geheimnisse.

## 11. Begrenzter Nachweis einer späteren Umsetzung

Ein erster fachlicher Nachweis kann mit drei aktiven Akteuren, wenigen Ressourcen und gemeinsamen Methoden beginnen. Die konkrete Besetzung ist eine Testkonfiguration, keine neue feste Weltvorgabe.

Beobachtbare Prüffälle wären:

- Geänderte Abhängigkeiten führen bei denselben Profilen zu anderen anwendbaren Plänen.
- Kooperation wird bei ausreichender gemeinsamer Kapazität möglich; exklusive Knappheit verändert die Methode.
- Ein Anbieter unter derselben Kontrolle erfüllt unabhängigen Zugang nicht automatisch.
- Unbekannte Information wird ohne Zugangsschritt nicht als Verhandlungsmacht verwendet.
- Angebot, Annahme und Erfüllung bleiben verschiedene Zustände.
- Kopierte Information bleibt beim bisherigen Besitzer; Reservierungen erhalten die Mengenbilanz.
- Nach Spielerentscheidungen ändern sich zukünftige Pläne, nicht bestätigte Ereignisse.
- Gleiche Versionen, Startzustände und Eingaben ergeben dieselbe Ereignisspur.
- Angebotene Missionen verwenden ausschließlich implementierte Aktionen und gespeicherte Bedingungen.

Die Prüfung verlangt weder eine bestimmte Gewinnerorganisation noch eine festgelegte Anzahl Wendungen. Sie prüft, ob Geschichten aus der Konkurrenzstruktur entstehen können.

## 12. Lieferumfang und offene Umsetzung

Ausgearbeitet sind 70 Interessen-/Ressourcenprofile, sechs Kooperationsstrukturen, ein Modell für Abhängigkeiten, Wissen und Ziele sowie eine gemeinsame HTN-Domänenskizze. Die feste lokale Besetzung und die drei vorformulierten Konfliktketten gehören nicht mehr zur Projektfassung. Laufender Spielcode und Kampagnenpersistenz sind unverändert; M6/M7 und menschliche Spielabnahme bleiben offen.

Eine nächste technische Aufgabe sollte ein kleines Akteurs-/Ressourcenmodell mit wenigen Methoden anhand von Zustandsvariationen nachweisen. Zusätzliche Organisationen erweitern anschließend die Datenbasis. Planung und Zustandsprüfung können lokal erfolgen; eine neue Subscription oder Modell-API ist nicht erforderlich. Optionale Sprachmodelle formulieren überprüfte gespeicherte Fakten aus.

Die redaktionelle Prüfung kontrolliert Profilvollständigkeit, IDs, Verweise und die unveränderte Quelle. Sie ist kein HTN- oder Laufzeitnachweis. Protokoll: `artifacts/concept/organisations-check.json`.
