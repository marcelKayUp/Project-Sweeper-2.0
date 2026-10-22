// Authoring helper: assembles concept Markdown, never runtime game data.
import { readFile, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const src=await readFile('docs/sources/cyberpunk_konzerne_v6.md','utf8');
const base=src.split(/^## Konkurrenzstruktur/m)[0];
const entries=[...base.matchAll(/^(?:### (\d+)\. ([^\r\n]+)|(\d+)\. \*\*([^*]+)\*\*)/gm)];
const old=await readFile('docs/ORGANISATIONSKATALOG.md','utf8');
const ids=[...old.matchAll(/^- \*\*ID:\*\* `([^`]+)`/gm)].map(m=>m[1]);
assert.equal(ids.length,70); assert.equal(entries.length,70);
// domain | leverage | dependence | recurring interests | preferred methods | internal axis
const company=[
 ['Implantate und Biotechnologie','Patente, Wartungsschnittstellen, Fertigung','Forschung, qualifiziertes Personal, Finanzierung','Installierte Basis erhalten; Standards kontrollieren; Wartungsumsatz sichern','Lizenzen; Produktbindung; Partnerschaften','Technische Offenheit ↔ Kontrolle über den Produktlebenszyklus'],
 ['Sicherheit und Rüstung','Ausgebildete Kräfte, Drohnen, Sicherheitsverträge','Daten, Energie, staatliche und private Auftraggeber','Schutzverträge gewinnen; Einsatzfähigkeit erhalten; Haftung begrenzen','Schutzangebote; Subunternehmen; kontrollierte Eskalation','Auslastung und Abschreckung ↔ langfristige Stabilität der Kunden'],
 ['Daten und Prognosen','Analysemodelle, Datenverknüpfung, Bewertungsschnittstellen','Netzbetreiber, Datenlieferanten, Abnehmer','Datenzugang erweitern; Prognosen verwertbar machen; Standards setzen','Informationshandel; Integration; Bündnisse','Datenexklusivität ↔ Reichweite und Austauschbarkeit'],
 ['Orbitale Infrastruktur','Startrechte, Stationszugang, Transportkontingente','Bodenlogistik, Wartung, Finanzierung','Zugang zum Orbit kontrollieren; Anlagen auslasten; Versorgung sichern','Kontingentverträge; Beteiligungen; langfristige Reservierung','Auslastung ↔ Reserven und Betriebssicherheit'],
 ['Kommunikationsnetze','Netzabdeckung, Zugangsknoten, Übertragungskapazität','Energie, lokale Genehmigungen, finanzierte Wartung','Teilnehmer halten; Netze ausbauen; Kundenzugänge kontrollieren','Anschlussverträge; Bündelangebote; Zugangsbeschränkung','Zentrale Kontrolle ↔ regionale Reichweite'],
 ['Saatgut und Agrarlizenzen','Sortenrechte, Produktionsketten, Anbauwissen','Wasser, Anbauflächen, Transport, Vertrauen der Erzeuger','Anbauanteile ausweiten; Lizenzbindung halten; Ertrag absichern','Lizenzierung; Liefergarantien; Patentdurchsetzung','Kontrollierte Vermehrung ↔ Anpassung und Verbreitung'],
 ['Wasser, Luft und Schutzinfrastruktur','Anlagenbetrieb, Qualitätsstandards, Versorgungsverträge','Energie, Wartungsteile, örtliche Betreiber','Versorgungshoheit erhalten; Kapazität sichern; Kosten verteilen','Betriebsverträge; Kontingente; gemeinsame Standards','Zentrale Reserven ↔ örtliche Versorgung'],
 ['Medien und Erlebnisprodukte','Inhalte, Marken, Distributionsrechte, Neuroplattformen','Kreativpersonal, Netze, Publikum, Gerätezugang','Aufmerksamkeit halten; Rechte erweitern; Produktionsfähigkeit sichern','Exklusivverträge; Vermarktung; Plattformbindung','Kreative Eigenständigkeit ↔ Verwertbarkeit und Rechtekontrolle'],
 ['Finanzierung und Versicherung','Kreditlinien, Forderungen, Rücklagen, Risikobewertung','Vertrauen, Zahlungsfähigkeit der Kunden, verlässliche Daten','Forderungen absichern; Kapitalzugang ausweiten; Risiken begrenzen','Kredite; Beteiligungen; Vertragsprüfung','Kurzfristige Rendite ↔ Tragfähigkeit des Vertragsnetzes'],
 ['Bau und Immobilieninfrastruktur','Baukapazität, Projektverträge, Flächen- und Zugangsrechte','Kapital, Material, Energie, örtliche Zustimmung','Projekte gewinnen; Flächen kontrollieren; Betriebskosten übertragen','Projektverbünde; Grundstücksgeschäfte; Nachträge','Neubau und Prestige ↔ langfristiger Betrieb'],
 ['Neuroschnittstellen','Spezialwissen, kompatible Schnittstellen, Entwicklungsarbeit','Fertigung, Vertrieb, Patentrechte','Eigenständigkeit ausbauen; eigene Standards verbreiten; Kunden gewinnen','Lizenzalternativen; Kooperation; Standardöffnung','Offenheit ↔ finanzierte Weiterentwicklung'],
 ['Regionale Sicherheit','Örtliches Personal, Kontakte, Reaktionskapazität','Großaufträge, Ausrüstung, lokale Akzeptanz','Aufträge halten; Abhängigkeit vom Hauptauftraggeber senken; Personal binden','Subverträge; lokale Bündnisse; Informationsweitergabe','Eigenständigkeit ↔ verlässliche Großaufträge'],
 ['Logistik und Routen','Hafenzugang, Disposition, Streckenwissen','Fahrzeuge, sichere Korridore, Abnehmer','Routen sichern; Frachtvolumen halten; Datenhoheit behalten','Transportverträge; Umleitung; Vermittlung','Offene Zugänge ↔ exklusive Routen'],
 ['Arbeitsrobotik','Anpassbare Maschinen, Wartungswissen, Ersatzteile','Komponenten, Energie, Kundenintegration','Installierte Maschinenbasis ausbauen; Wartung sichern; Anwendungsfelder erweitern','Produktverträge; technische Standards; Anpassungsleistungen','Universelle Nutzbarkeit ↔ Kontrolle über Verwendungszwecke'],
 ['Kleinkredite und lokale Finanzierung','Filialnetz, Kundenkontakte, Forderungspools','Kapitalgeber, Rückzahlungen, Akzeptanz vor Ort','Kundenbasis halten; Finanzierung sichern; Ausfälle begrenzen','Kleinkredite; Bündelung von Forderungen; Vermittlung','Lokale Kundenbindung ↔ Renditeanforderung des Eigentümers'],
 ['Körperersatz und Zelltechnologie','Zelllinien, Behandlungen, Fachpersonal','Patente, Finanzierung, Patientenvertrauen','Behandlungskapazität ausbauen; Linienrechte halten; Fachkräfte gewinnen','Forschungskooperation; Behandlungsverträge; Lizenzierung','Wissenschaftliche Verbreitung ↔ Kontrolle sensibler Herkunftsdaten'],
 ['Rohstoffe und Tiefseeförderung','Förderrechte, Anlagen, Rohstoffkontingente','Wartung, Personal, Transport, Abnahmeverträge','Förderzugang halten; Abnehmer binden; Betrieb finanzieren','Langfristige Lieferung; Projektbeteiligung; Kostenverlagerung','Fördermenge ↔ Sicherheit und Folgekosten'],
 ['Nachrichten und Verteilung','Redaktionen, Sendekanäle, Publikumszugang','Netze, Quellen, Werbefinanzierung','Reichweite sichern; Zugang zu Quellen halten; Finanzierung diversifizieren','Berichterstattung; Distributionsverträge; redaktionelle Auswahl','Glaubwürdigkeit ↔ Finanzierung und Zugang'],
 ['Strafvollzug und Arbeitsvermittlung','Verwaltungskapazität, Unterbringung, Arbeitsverträge','Zuweisungen, staatliche/private Verträge, Personal','Kapazität auslasten; Vermittlungsverträge halten; Haftungsrisiken begrenzen','Betriebsverträge; Arbeitsvermittlung; Informationsaustausch','Dauerhafte Auslastung ↔ erfolgreiche Entlassung und Vermittlung'],
 ['Urbane Landwirtschaft','Anbauflächen, freie Sorten, lokale Verteilung','Wasser, Energie, Gebäude, Transport','Versorgung ausbauen; Standortzugang halten; wirtschaftliche Eigenständigkeit sichern','Lokale Liefernetze; Kooperation; offene Sorten','Gemeinschaftlicher Zugang ↔ Wettbewerb um knappe Betriebsressourcen'],
 ['Wohnen und Vergabe','Wohnbestand, Bewertungsregeln, Standortverträge','Kapital, Bauleistungen, Daten, Mieterakzeptanz','Bestand auslasten; Vergabe kontrollieren; Baukapital sichern','Mietverträge; Bewertung; Projektpartnerschaften','Bezahlbarer Zugang ↔ Ertrag und Bestandsentwicklung'],
 ['Bildung und Rekrutierung','Abschlüsse, Lehrkapazität, Arbeitgeberzugang','Finanzierung, Lehrpersonal, Anerkennung','Ausbildung finanzieren; Abschlüsse verwertbar halten; Rekrutierung binden','Bildungsverträge; Stipendien; Personalvermittlung','Offene Bildung ↔ Bindung an Finanzierer und Arbeitgeber'],
 ['Energieversorgung','Erzeugung, Netzkapazität, Vorrangrechte','Brennstoffe/Anlagen, Netzzugang, Abnahme','Abnahme sichern; Kapazität ausbauen; Reserven kontrollieren','Stromverträge; Reservierung; Lastverteilung','Verkaufte Auslastung ↔ Reservefähigkeit'],
 ['Orbitale Fracht','Crews, Umschlag, Frachtverträge','Startzugang, Wartung, Bodenlogistik','Eigenständigkeit stärken; Frachtvolumen halten; Crewversorgung sichern','Frachtverträge; Umgehungsrouten; Vermittlung','Unabhängigkeit ↔ Zugangsgarantien des Großpartners'],
 ['Auskunft und Bewegungsdaten','Register, Verknüpfungswissen, Kundenzugang','Datenzufluss, rechtlicher Zugang, Abnehmervertrauen','Datenbestand erhalten; Abnehmer gewinnen; Stellung gegenüber Plattformen sichern','Datenhandel; Kooperation; Prüfung','Datenerhalt ↔ begrenzte legitime Nutzung'],
 ['Medikamente und Arbeitspharma','Rezepturen, Produktion, Vertrieb','Rohstoffe, Zulassungen, Vertriebsverträge','Absatz ausweiten; Produktion absichern; Rezepturrechte halten','Lieferverträge; Lizenzierung; Bindungsangebote','Breite Versorgung ↔ profitable Produktbindung'],
 ['Werbung und AR','Kampagnen, Sichtfeldzugang, Produktionsnetz','Plattformen, Geräte, Kundenaufträge','Sichtbarkeit verkaufen; Plattformzugang sichern; Publikum binden','Kampagnen; Produktbündel; Aufmerksamkeitsanalyse','Finanzierung durch Werbung ↔ Selbstbestimmung der Nutzer'],
 ['Premiumtransport und Zugang','Reisekontingente, Passkontingente, Kundenkontakte','Transportplattformen, Personal, Sicherheitsfreigaben','Exklusiven Zugang sichern; zahlungsfähige Kunden binden; Betriebsspielraum halten','Reservierung; Zugangspakete; Vermittlung','Exklusivität ↔ verlässliche operative Versorgung'],
 ['Versicherung und Rücklagen','Deckungszusagen, Kapitalreserven, Risikoklassen','Anlagedaten, Kundenzahlungen, Vertrauen','Risiken begrenzen; Bestand ausweiten; Zahlungsfähigkeit erhalten','Versicherung; Risikoauswahl; Datenzukauf','Verlässliche Zusage ↔ selektiver Risikoausschluss'],
 ['Örtlicher Versorgungsbetrieb','Betriebswissen, Wartung, lokale Verteilung','Großversorger, Ersatzteile, örtliche Akzeptanz','Betrieb aufrechterhalten; Verträge halten; Kosten beherrschbar machen','Betriebsführung; Beschaffung; Kontingentverhandlung','Kurzfristige Versorgung ↔ langfristige Instandhaltung'],
];
assert.equal(company.length,30);
// recurring goal | leverage | dependence | trade-off
const independent=[
 ['Zensur einschränken; offene Schnittstellen erhalten','Technisches Wissen, interne Quellen','Netzzugang, geschützte Kommunikation','Öffentliche Belegkraft ↔ Schutz der Quelle'],
 ['Gemeinsamen Netzzugang erhalten','Knotenstandorte, Wartungsgemeinschaft','Spenden, Ersatzteile, Fachwissen','Unbedingter Zugang ↔ dauerhaft finanzierte Wartung'],
 ['Unabhängige Stimmen verbreiten','Sendezugang, Publikum, lokale Glaubwürdigkeit','Energie, Inhalte, sichere Sender','Schnelle Reichweite ↔ Prüfung und redaktionelle Unabhängigkeit'],
 ['Personen Zugang außerhalb der Register eröffnen','Dokumentenwissen, Vertrauensnetz','Daten, sichere Übergaben','Offener Zugang ↔ Missbrauchsschutz und Schutz fremder Identitäten'],
 ['Überwachung begrenzen','Schutztechnik, Reparaturwissen','Komponenten, geheim gehaltene Schwachstellen','Offene Reparierbarkeit ↔ Schutz vor technischer Anpassung des Gegners'],
 ['Vertrauliche Informationen öffentlich prüfbar machen','Veröffentlichungskanäle, Quellenkontakte','Belege, Quellenschutz, Glaubwürdigkeit','Öffentlichkeit ↔ Schutz Unbeteiligter'],
 ['Zugang zu eigenen Erinnerungsdaten ermöglichen','Archive, Wiederherstellungswissen','Sichere Speicherung, Einwilligung','Individuelle Verfügung ↔ Rechte gemeinsam Betroffener'],
 ['Schuldabhängigkeit verringern','Vertragswissen, lokale Netzwerke','Belege, Unterstützung, Zugriff auf Register','Breite Entlastung ↔ Folgen für abhängige Dritte'],
 ['Gemeinsamen Netzzugang sichern','Standorte, freiwillige Arbeit, Bindung','Wartungswissen, Finanzierung','Technische Verlässlichkeit ↔ verteilte Entscheidungsgewalt'],
 ['Unabhängige Routen erhalten','Routingwissen, lokale Kontakte','Aktuelle Informationen, Geheimhaltung','Offener Informationszugang ↔ Schutz verborgener Routen'],
 ['Unabhängige Reparatur und Behandlung erhalten','Fachwissen, Patientennetz','Teile, Prüfmittel, geschützte Daten','Zugänglichkeit ↔ Sicherheitsnachweis und Patientenschutz'],
 ['Freie Prothesenversorgung ermöglichen','Konstruktionen, Werkstattkapazität','Material, Prüfungen, Ersatzteile','Offene Konstruktion ↔ dauerhaft geprüfte Produktion'],
 ['Selbstbestimmung von Klonen ermöglichen','Schutzkontakte, medizinisches Wissen','Identitäten, Unterkunft, Finanzierung','Politische Sichtbarkeit ↔ individuelle Selbstbestimmung und Schutz'],
 ['Unabhängigen Schutz anbieten','Erfahrenes Personal, lokale Bindung','Bezahlte Aufträge, Ausrüstung','Gemeinsames Schutzversprechen ↔ ökonomische Tragfähigkeit'],
 ['Körperliche Selbstbestimmung sichtbar machen','Handwerk, Ausdrucksformen, Kontakte','Material, sichere Räume','Politische Sichtbarkeit ↔ Sicherheit und spätere Veränderbarkeit'],
 ['Unabhängigen Medikamentenzugang erhalten','Verteilung, Beratung, lokale Kenntnis','Geprüfte Ware, Lagerung, Finanzierung','Breiter Zugang ↔ gesicherte Herkunft und Priorisierung'],
 ['Akute Versorgung außerhalb des Konzernvertriebs ermöglichen','Beschaffung, Verteilung, Untergrundkontakte','Nachschub, Finanzierung, Vertrauen','Unmittelbare Hilfe ↔ fortgesetzte Abhängigkeit und Eigeninteresse'],
 ['Organspenden gemeinschaftlich organisieren','Spendernetz, Vermittlung, Beratung','Prüfungen, medizinische Partner, Beiträge','Versorgung ↔ freiwillige Entscheidung ohne wirtschaftlichen Druck'],
 ['Schuldgebundene Menschen unterstützen','Sozialkontakte, Fallkenntnis','Rechtszugang, Unterkunft, Finanzierung','Schnelle individuelle Hilfe ↔ Folgen für andere Betroffene'],
 ['Verantwortung im Vollzug offenlegen','Insiderwissen, Dokumentzugang','Quellenschutz, Vertrauen Betroffener','Wirksame Aufklärung ↔ persönliche Verantwortung der Informanten'],
 ['Unabhängige Wasserversorgung stärken','Verteilung, Messwissen, Nachbarschaftsvertrauen','Kartuschen, Prüfgeräte, Nachschub','Soforthilfe ↔ langfristige unabhängige Qualitätsprüfung'],
 ['Freies Saatgut verfügbar halten','Sortenbestand, Anbauwissen','Land, regionale Anpassung, Austausch','Breite Verteilung ↔ örtliche Eignung und Ertragssicherheit'],
 ['Luftfilter gemeinschaftlich betreiben','Wartung, Konstruktion, Haushaltkontakte','Material, Prüfverfahren, Finanzierung','Technische Transparenz ↔ Schutz personenbezogener Nutzungsdaten'],
 ['Schutzräume erhalten','Unterkünfte, Freiwillige','Flächen, Energie, Vorräte','Verlässlicher Betrieb ↔ Unabhängigkeit von kontrollierenden Geldgebern'],
 ['Energie gemeinsam verfügbar machen','Mikronetz, technische Arbeit','Erzeugung, Speicher, Finanzierung','Gleicher Zugang ↔ Beiträge und unterschiedlicher lebenswichtiger Bedarf'],
 ['Geschützte Verarbeitung von Erinnerungen ermöglichen','Beratung, Vertrauen, Gruppenräume','Finanzierung, Fachwissen, Schutz','Politische Aufklärung ↔ geschützter persönlicher Raum'],
 ['Gemeinschaftliche Ernährung sichern','Küche, Freiwillige, Verteilung','Lebensmittel, Räume, Energie','Stabile Finanzierung ↔ frei zugängliche Versorgung und faire Mitarbeit'],
 ['Wohnabhängigkeit verringern','Organisierung, kollektive Verhandlung','Zusammenhalt, Rücklagen, Rechtswissen','Gemeinsame Position ↔ unterschiedliche persönliche Durchhaltefähigkeit'],
 ['Bildung außerhalb der Konzernbindung ermöglichen','Lehrarbeit, Gemeinschaftsräume','Material, Lehrkräfte, Anerkennung','Unabhängigkeit ↔ verwertbare Abschlüsse und Datenschutz'],
 ['Rechtszugang unabhängig vom Einkommen erhalten','Fachwissen, Fallverbünde','Zeit, Finanzierung, Mandate','Breite Alltagshilfe ↔ aufwendige strategische Verfahren'],
 ['Unabhängige Ersatzteilversorgung sichern','Schiffe, Bergungswissen, Kontakte','Treibstoff, Teile, sichere Zugänge','Offener Handel ↔ militärische Nutzung derselben Güter'],
 ['Transport außerhalb kontrollierter Korridore anbieten','Fahrzeuge, Umgehungswissen','Sichere Routen, lokales Einverständnis','Verlässliche Lieferung ↔ Rechte und Risiken durchquerter Gemeinschaften'],
 ['Zugang zu aufgegebenen Ressourcen erhalten','Bergung, örtliche Kenntnis','Schutztechnik, Abnehmer, rechtlicher Spielraum','Eigene Arbeit ↔ Gesundheits- und Umweltfolgen'],
 ['Handel unabhängig von Passprivilegien ermöglichen','Tauschplatz, Ruf, Vermittlung','Versorgung, Vertrauen, Transport','Offener Zugang ↔ Betrugsschutz ohne neue Passmacht'],
 ['Gemeinschaftlichen Standort erhalten','Flächen, Anlagen, lokale Regeln','Versorgung, Zusammenhalt, Wartung','Selbstverwaltung ↔ Aufnahme und Schutz weniger leistungsfähiger Mitglieder'],
 ['Unabhängige Passage ermöglichen','Boote, Fahrkenntnis, Übergabekontakte','Treibstoff, sichere Anläufe, Finanzierung','Zugang für alle ↔ knappe sichere Transportkapazität'],
 ['Versorgungsdaten unabhängig prüfbar machen','Messwissen, Insidernetz','Belege, Kommunikationszugang','Dringlichkeit ↔ belastbare Aussagen unter Unsicherheit'],
 ['Örtliche Selbstverwaltung erhalten','Gebietszugang, Zusammenhalt, Schlichtung','Versorgung, Anerkennung, Verteidigung','Innere Sicherheit ↔ Rechte von Außenseitern und Minderheiten'],
 ['Transport gemeinschaftlich finanzieren','Fahrzeuge, Mitgliederarbeit','Kostendeckung, Wartung, Aufträge','Faire Preise ↔ faire Löhne und entfernte Versorgungspflichten'],
 ['Unabhängigen Notrufzugang erhalten','Funkstandorte, Vermittlung, Helfernetz','Energie, Erreichbarkeit, Vertrauen','Anonym erreichbare Hilfe ↔ Schutz und Belastbarkeit der Helfer'],
];
assert.equal(independent.length,40);
const replaceField=(block,key,value)=>block.replace(new RegExp(`^- \\*\\*${key}:\\*\\*[^\\r\\n]*`,'m'),`- **${key}:** ${value}`);
const headings={1:'## 1. Megakonzerne',11:'## 2. Weitere Unternehmen',31:'## 3. Netz und Öffentlichkeit',41:'## 4. Körper und Untergrund',51:'## 5. Versorgung und Gemeinschaft',61:'## 6. Raum, Logistik und Grenze'};
let out='# NEON CONTRACT – Organisationskatalog für Konkurrenzstrukturen\n\nVersion 8 · 22.10.2026 · Konzeptentwurf. Grundlage ist die unveränderte [Nutzerfassung V6](sources/cyberpunk_konzerne_v6.md). [Konkurrenzmodell und HTN-Domäne](ORGANISATIONEN.md) erklären die Verwendung. Namen, Herkunft, Vorgeschichten und visuelle Identität bleiben Weltmaterial; Interessen, Machtmittel, Abhängigkeiten und Spannungsachsen sind wiederverwendbare Planungsprofile. Sie legen weder einen konkreten Vorfall noch dessen Ausgang fest.\n\n70 stabile Entwurfs-IDs: 10 Megakonzerne, 20 weitere Unternehmen, 40 unabhängige Organisationen. Profilfähigkeiten sind mögliche Zugänge zu Ressourcen; der konkrete Weltzustand bestimmt, was eine Organisation an einem bestimmten Standort tatsächlich besitzt, weiß und einsetzen kann. Ausgangsbindungen sind Vorschläge für den Startgraphen und werden von aktuellem Vertragszustand unterschieden. Eine Spannungsachse erzeugt nicht automatisch ein Ziel.\n\n';
for(let i=0;i<entries.length;i++){
 const m=entries[i],n=Number(m[1]??m[3]); assert.equal(n,i+1);
 if(headings[n])out+=headings[n]+'\n\n';
 let block=base.slice(m.index,entries[i+1]?.index??base.length).replace(/\n(?:---|## Ebene |### Gruppe )[\s\S]*$/,'').trim();
 if(n<=30){
  block=block.replace(/Öffentliches Slogan/g,'Öffentlicher Slogan').replace(/Marketing-Klischee/g,'Markeninszenierung').replace(/\*\*Bindung:/g,'**Ausgangsbindung:');
  block=block.replace(/^- \*\*(?:Innerer Konflikt|Geheimnis|Hook|Konflikt):\*\*[^\r\n]*\r?\n?/gm,'');
  block=block.replace(/^(### [^\r\n]+)\r?\n/,'$1\n\n- **ID:** `'+ids[i]+'`\n');
  const [domain,power,needs,goals,methods,tension]=company[i];
  block+='\n'+[['Domäne',domain],['Machtbasis',power],['Abhängigkeiten',needs],['Wiederkehrende Interessen',goals],['Bevorzugte Mittel',methods],['Spannungsachsen',tension]].map(([k,v])=>`- **${k}:** ${v}`).join('\n');
 }else{
  const p=block.match(/^\d+\. \*\*([^*]+)\*\* \(([^)]+)\): (.*?) \*Gegenkultur:\* (.*?) \*Typ:\* (.*?) \*Dilemma:\* [^\r\n]+/),art=block.match(/^\s+- \*Farbschema:\* (.*?) \*Logo:\* (.*)$/m);assert(p&&art);
  const [goals,power,needs,tension]=independent[n-31];
  block=`### ${n}. ${p[1]}\n\n- **ID:** \`${ids[i]}\`\n- **Typ:** ${p[5]}\n- **Herkunft:** ${p[2]}\n- **Kurzprofil:** ${p[3]}\n- **Gegenkultur:** ${p[4]}\n- **Wiederkehrende Interessen:** ${goals}\n- **Machtbasis:** ${power}\n- **Abhängigkeiten:** ${needs}\n- **Spannungsachsen:** ${tension}\n- **Farbschema:** ${art[1]}\n- **Logo:** ${art[2]}`;
 }
 if(n===1){block=replaceField(block,'Leistung','Langlebige Implantate und ein breites Wartungsnetz; technische Zuverlässigkeit und vertraglicher Zugang werden getrennt betrachtet.');block=block.replace('nachdem sie dort die Kernpatente verloren hatte','nachdem ein gemeinsames Patentabkommen zerbrochen war');}
 if(n===7)block=block.replace('Schone Luft','Saubere Luft');
 if(n===14)block=block.replace('aus einer Schiffswerft in Tampere, die nach der Krise im Schiffbau auf Industrierobotik umstellte','aus einem Maschinenbauzulieferer in Tampere, der nach dem Verlust großer Werftaufträge auf Industrierobotik umstellte').replace('Die Verbindung von nordischer Ingenieurskunst und Arbeitsrobotik ist das Markenzeichen.','Sein Markenzeichen sind robuste Wartungszugänge und anpassbare Arbeitsrobotik.');
 if(n===24)block=block.replace('Die Philippinen sind ein Land der Seefahrer und Auslandsarbeiter, und genau diese Netzwerke bilden die Basis der Orbitalfracht.','Die Gründer brachten Kontakte aus Hafenarbeit, Geldtransfers und Auslandsbeschäftigung in die Orbitalfracht ein.');
 if(n===25)block=block.replace('Die deutsche Tradition der Schufa-Auskunft wurde zum globalen Profilgeschäft.','Aus vorhandenen Auskunftsregistern entstand ein grenzüberschreitendes Profilgeschäft.');
 if(n===27)block=block.replace('Die Firma verbindet westafrikanische Erzählkunst mit europäischer Sensorik.','Die Agentur brachte Autoren und Produktionskontakte ein, das Startup die Geräteplattform.');
 assert(!/Kantor|Glaskante/.test(block));
 out+=`<a id="${ids[i]}"></a>\n\n${block.trim()}\n\n`;
}
out+='## 7. Verwendung und Herkunft\n\nDie Profile definieren Akteurspotenziale. Konkrete Ressourcenbestände, aktive Ziele, bekannte Geheimnisse, laufende Verträge und Ereignisse gehören in eine gesonderte Szenarioinstanz. Die [sechs Bündnisse](ORGANISATIONEN.md#buendnisse) begründen gemeinsame Interessen und begrenzte Kooperation. Eine Organisation darf mit demselben Partner zugleich kooperieren und konkurrieren.\n\nFeste Handlungsabläufe, lokale Ansprechpartner und vorab verteilte Gewinner/Verlierer sind nicht Bestandteil dieser Fassung. Das Weltjahr und die Wahl eines Bezirks bleiben Szenarioparameter. Farben und Logos sind gestalterische Briefings und verleihen weder Wissen noch Kampffähigkeiten.\n\nDie Nutzerquelle V6 bleibt bytegleich unter docs/sources/cyberpunk_konzerne_v6.md erhalten, SHA-256 22f416a762c751f00b4b26f6a9431b6e175cb676d04a9c7150f194501cb66438. V8 überführt konkrete Konflikte und Dilemmata in wiederkehrende Interessen und Spannungsachsen. Es werden keine zusätzlichen Organisationen eingeführt; unaufgelöste Fremdnamen aus V6 werden nicht übernommen. Keine über die Nutzerbereitstellung hinausgehende Rechtebehauptung.\n';
await writeFile('docs/ORGANISATIONSKATALOG.md',out,'utf8');
console.log(JSON.stringify({organizations:70,planningProfiles:70,version:8,bytes:Buffer.byteLength(out)}));
