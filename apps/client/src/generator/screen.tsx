import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { architecturalNodes, sanitaryPath, ARCHETYPES, CORPORATE_PROFILES, defaultBusinessProfile, generateBuilding, parseConfig, planDemand, ROOM_RULES, type BuildingPackage, type CorporateConfig, type DemandPlan, type Family, type Room, type Scope, type Service, type Size, type Zone } from "@neon/generator";
import { ACCESS, CONDITION_LABELS, DEPARTMENT_LABELS, OFFICE_FORMS, ROLES, SURFACES } from "./presentation.ts";
import mitLicense from "@neon/generator/mit-license?raw";

const Building3D = lazy(() => import("./view3d.tsx"));
type View = "floorplan" | "graph" | "3d";
export const ZONES: Record<Zone, { label: string; color: string }> = {
  public: { label: "Öffentlich", color: "#74dccc" }, staff: { label: "Personal", color: "#9cb5ea" },
  research: { label: "Forschung", color: "#bd9ff7" }, secure: { label: "Gesichert", color: "#f3a382" },
  logistics: { label: "Logistik", color: "#d3c184" }, technical: { label: "Technik", color: "#98b5b2" },
};
const SERVICE_LABELS: Record<Service, string> = { power: "Strom", ventilation: "Lüftung", network: "Netzwerk", security: "Sicherheit" };
const mid = (room: { x: number; y: number; width: number; height: number }) => ({ x: room.x + room.width / 2, y: room.y + room.height / 2 });

export function GeneratorScreen() {
  const [family, setFamily] = useState<Family>("office");
  const [size, setSize] = useState<Size>("standard");
  const [seed, setSeed] = useState("42");
  const [profile, setProfile] = useState({ occupants: "16", workplaces: "16", processUnits: "0", storageUnits: "8" });
  const [corporate, setCorporate] = useState<CorporateConfig>({ corporation: "kasane", siteRole: "headquarters", department: "mixed", statusTier: "staff", buildingHistory: "purpose-built", condition: "pristine" });
  const [finishes, setFinishes] = useState(true);
  const [scope, setScope] = useState<Scope>("building");
  const [floorShare, setFloorShare] = useState("50");
  const [item, setItem] = useState<BuildingPackage | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(true);
  const [selected, setSelected] = useState("room-cleanroom-01");
  const [view, setView] = useState<View>("floorplan");
  const [overlay, setOverlay] = useState<"none" | "routes" | "sanitary" | "bsp" | Service>("routes");
  const request = useRef(0);
  function input(nextSeed = seed, nextFamily = family, nextSize = size) {
    const number = (value: string) => value.trim() ? Number(value) : NaN;
    return { seed: number(nextSeed), family: nextFamily, size: nextSize, occupants: number(profile.occupants), workplaces: number(profile.workplaces), processUnits: number(profile.processUnits), storageUnits: number(profile.storageUnits), scope, floorShare: scope === "building" ? 100 : number(floorShare), ...corporate };
  }
  let demand: DemandPlan | null = null;
  let dirty = true;
  try {
    const config = parseConfig(input());
    demand = planDemand(config);
    dirty = !item || Object.entries(config).some(([key, value]) => item.config[key as keyof typeof config] !== value);
  } catch { /* Field errors are reported on submission. */ }
  function loadProfile(nextFamily = family) {
    const values = defaultBusinessProfile(nextFamily, size);
    setProfile({ occupants: String(values.occupants), workplaces: String(values.workplaces), processUnits: String(values.processUnits), storageUnits: String(values.storageUnits) });
  }

  async function generate(nextSeed: string, nextFamily: Family, nextSize: Size) {
    const revision = ++request.current;
    setBusy(true); setError("");
    try {
      const result = await generateBuilding(input(nextSeed, nextFamily, nextSize));
      if (revision !== request.current) return;
      if (result.ok) { setItem(result.package); setSelected(result.package.building.rooms.find((room) => room.type === "executive")?.id ?? result.package.building.rooms.find((room) => room.type === "cleanroom")?.id ?? result.package.building.missionGraph.targetRoom); }
      else { setItem(null); setError(result.errors.map((finding) => finding.message).join(" ")); }
    } catch (failure) {
      if (revision === request.current) { setItem(null); setError(failure instanceof Error ? failure.message : "Erzeugung fehlgeschlagen"); }
    } finally { if (revision === request.current) setBusy(false); }
  }
  useEffect(() => {
    void generate("42", "office", "standard");
    return () => { request.current += 1; };
  }, []);

  const selectedRoom = item?.building.rooms.find((room) => room.id === selected);
  const selectedSanitaryPath = item && selectedRoom ? sanitaryPath(item.building, selectedRoom, item.mission) : [];
  const roomLinks = item?.building.connections.filter((link) => link.from === selected || link.to === selected) ?? [];

  function download(missionOnly = false) {
    if (!item || dirty || busy) return;
    const blob = new Blob([JSON.stringify(missionOnly ? item.mission : item, null, 2) + "\n"], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url; anchor.download = `neon-${item.config.family}-${item.config.seed}-${item.hash.slice(0, 8)}-${missionOnly ? "mission" : "building"}.json`;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return <div className="workshop">
    <header className="workshop-header"><a href="/generator.html" className="brand">N<span>◆</span>C <small>NEON CONTRACT</small></a><span className="header-divider" /><span>GEBÄUDE-WERKSTATT</span><span className="dev-badge">LOKALES ENTWICKLUNGSWERKZEUG</span></header>
    <div className="workshop-title"><div><p className="eyebrow">SEMANTIC BUILDING GENERATOR / 05</p><h1>Konzerne prägen Räume.</h1><p>Konzernidentität → Organisation → Raumprogramm → Grundriss → Ausstattung.</p></div><div className="version">EIN GESCHOSS<span>4 RUNNER · DATENRAUB</span></div></div>
    <section className="identity-panel panel" aria-label="Konzernprofil">
      <div className="identity-controls">
        <label>Konzern<select aria-label="Konzern" value={corporate.corporation} onChange={(event) => setCorporate({ ...corporate, corporation: event.target.value as CorporateConfig["corporation"] })}>{Object.entries(CORPORATE_PROFILES).map(([id, value]) => <option key={id} value={id}>{value.name}</option>)}</select></label>
        <label>Standortrolle<select aria-label="Standortrolle" value={corporate.siteRole} onChange={(event) => setCorporate({ ...corporate, siteRole: event.target.value as CorporateConfig["siteRole"] })}><option value="headquarters">Hauptsitz</option><option value="branch">Niederlassung</option><option value="operations">Betriebsstandort</option></select></label>
        <label>Abteilung<select aria-label="Abteilung" value={corporate.department} onChange={(event) => setCorporate({ ...corporate, department: event.target.value as CorporateConfig["department"] })}>{Object.entries(DEPARTMENT_LABELS).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
        <label>Ausstattungsniveau<select aria-label="Ausstattungsniveau" value={corporate.statusTier} onChange={(event) => setCorporate({ ...corporate, statusTier: event.target.value as CorporateConfig["statusTier"] })}><option value="executive">Repräsentativ</option><option value="staff">Personal</option><option value="contractor">Ausgelagert</option></select></label>
        <label>Baugeschichte<select aria-label="Baugeschichte" value={corporate.buildingHistory} onChange={(event) => setCorporate({ ...corporate, buildingHistory: event.target.value as CorporateConfig["buildingHistory"] })}><option value="purpose-built">Zweckbau</option><option value="converted">Bestandsumbau</option></select></label>
        <label>Erhaltungszustand<select aria-label="Erhaltungszustand" value={corporate.condition} onChange={(event) => setCorporate({ ...corporate, condition: event.target.value as CorporateConfig["condition"] })}>{Object.entries(CONDITION_LABELS).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
      </div>
      {demand && <div className="identity-story" style={{ borderColor: demand.identity.accent }}><div className="corporate-mark" style={{ color: demand.identity.accent }}>{demand.identity.signature}</div><div><h2>{demand.identity.name}</h2><p>{demand.identity.origin} · {demand.identity.history}</p><p><strong>Versprechen:</strong> {demand.identity.promise} <span> / </span><strong>Widerspruch:</strong> {demand.identity.tension}</p></div><a href="#corporate-effects">Architekturwirkung ↓</a></div>}
    </section>
    <main className="workshop-grid">
      <aside className="control-panel panel">
        <div className="panel-heading"><span className="number">01</span><h2>Gebäudeprogramm</h2></div>
        <form onSubmit={(event) => { event.preventDefault(); void generate(seed, family, size); }}>
          <label htmlFor="family">Gebäudefamilie</label><select id="family" value={family} onChange={(event) => { const next = event.target.value as Family; setFamily(next); loadProfile(next); }}><option value="office">Konzernbüro</option><option value="laboratory">Forschungslabor</option><option value="factory">Fabrik / Lager</option></select>
          <label htmlFor="size">Flächenbudget</label><select id="size" value={size} onChange={(event) => setSize(event.target.value as Size)}><option value="compact">Kompakt · 28 × 24</option><option value="standard">Standard · 32 × 28</option><option value="large">Groß · 32 × 32</option></select>
          <button type="button" className="profile-reset" onClick={() => loadProfile()}>Profilwerte für Fläche laden</button>
          <div className="business-inputs">{([
            ["occupants", "Beschäftigte gleichzeitig", 1, 96], ["workplaces", "Büroarbeitsplätze", family === "office" ? 1 : 0, 96],
            ["processUnits", family === "laboratory" ? "Laborplätze" : "Produktionsplätze", family === "office" ? 0 : 1, 48], ["storageUnits", "Lagereinheiten", 1, 96],
          ] as const).filter(([key]) => family !== "office" || key !== "processUnits").map(([key, label, min, max]) => <div key={key}><label htmlFor={key}>{label}</label><input id={key} type="number" min={min} max={max} step="1" value={profile[key]} onChange={(event) => setProfile({ ...profile, [key]: event.target.value })} /></div>)}</div>
          <label htmlFor="scope">Gebäudeausschnitt</label><select id="scope" value={scope} onChange={(event) => setScope(event.target.value as Scope)}><option value="building">Ganzes Betriebsgebäude</option><option value="mission-floor">Missionsgeschoss</option></select>
          {scope === "mission-floor" && <><label htmlFor="floorShare">Bedarfsanteil im Geschoss (%)</label><input id="floorShare" type="number" min="1" max="100" step="1" value={floorShare} onChange={(event) => setFloorShare(event.target.value)} /></>}
          <label htmlFor="seed">Seed</label><input id="seed" inputMode="numeric" value={seed} onChange={(event) => setSeed(event.target.value)} autoComplete="off" />
          <div className="generate-buttons"><button className="primary" disabled={busy} type="submit">{busy ? "Erzeugt …" : "Grundriss erzeugen"}<span>↗</span></button><button type="button" aria-label="Nächster Seed" disabled={busy} onClick={() => { const next = String((Number(seed) + 1) >>> 0); setSeed(next); void generate(next, family, size); }}>+1</button></div>
        </form>
        <div role="status" aria-live="polite" className={error ? "notice error" : "notice"}>{error || (busy ? "Bedarf und Geometrie werden geprüft." : dirty ? "Parameter geändert · Entwurf neu erzeugen" : "Entwurf akzeptiert · harte Prüfungen bestanden")}</div>
        <div className="rule-note"><h3>Organisation vor Geometrie</h3><p>Leitung, Assistenz und Teams teilen sich die vorgegebenen Arbeitsplätze. Größere Hauptsitze benötigen entsprechend mehr Fläche.</p><p>Mehr Fläche ändert die Belegung erst mit „Profilwerte laden“. Zwei Wege zum Datenraum und die geschützten Raumzugänge bleiben verbindlich.</p></div>
        <h3 className="legend-title">FUNKTIONSZONEN</h3><div className="zone-legend">{Object.entries(ZONES).map(([key, zone]) => <span key={key}><i style={{ backgroundColor: zone.color }} />{zone.label}</span>)}</div>
        <p className="quiet">Dekoration hat keine Regelwirkung. Sicherheitsschwellen beschreiben reguläre Gebäudenutzung; die Mission verwendet die vorhandene hackbare Abkürzung.</p>
      </aside>
      <section className="drawing-panel panel" aria-label="Gebäudevorschau">
        <div className="drawing-toolbar"><div className="view-tabs" role="group" aria-label="Ansicht"><button aria-pressed={view === "floorplan"} onClick={() => setView("floorplan")}>Grundriss</button><button aria-pressed={view === "graph"} onClick={() => setView("graph")}>Raumgraph</button><button aria-pressed={view === "3d"} onClick={() => setView("3d")}>3D</button></div><label className="overlay-label">2D-Overlay<select aria-label="Overlay" disabled={view === "3d"} value={overlay} onChange={(event) => setOverlay(event.target.value as typeof overlay)}><option value="none">Ohne Overlay</option><option value="routes">Missionswege</option><option value="sanitary">Sanitärweg</option><option value="bsp">Raumteilungen</option>{Object.entries(SERVICE_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label></div>
        {item ? <><div className="drawing-caption"><span>{item.building.identity.signature} · {ARCHETYPES[item.config.family].label.toUpperCase()} <b>/</b> {item.mission.width} × {item.mission.height}</span><span>{dirty ? "VORHERIGER ENTWURF · " : ""}SEED {item.config.seed}</span></div>
          <label className="finish-toggle"><input type="checkbox" checked={finishes} onChange={(event) => setFinishes(event.target.checked)} /> Konzernmaterialien <span>{finishes ? "Ausstattung und Zustand" : "Funktionszonen"}</span></label>
          <div className="drawing-area">{view === "3d" ? <Suspense fallback={<p className="loading">3D-Ansicht lädt …</p>}><Building3D item={item} selected={selected} onSelect={setSelected} finishes={finishes} /></Suspense> : <Plan item={item} selected={selected} onSelect={setSelected} graphOnly={view === "graph"} overlay={overlay} finishes={finishes} />}</div>
          <div className="drawing-footer"><span><b className="cyan">●</b> Einstieg / Extraktion <b className="orange">◆</b> Datenterminal</span><span>Raum anklicken für Details{view !== "3d" && " · N ↑"}</span></div>
        </> : <div className="empty-preview">{busy ? "Entwurf wird erzeugt …" : "Parameter korrigieren und erneut erzeugen."}</div>}
      </section>
      <aside className="inspection-panel panel">
        <div className="panel-heading"><span className="number">02</span><h2>Prüfung & Details</h2></div>
        {item && <>
          <div className="metrics"><div><strong>{item.report.metrics.roomCount}</strong><span>RÄUME</span></div><div><strong>{item.report.metrics.independentRoutes}</strong><span>WEGE ZUM ZIEL</span></div><div><strong>{item.report.metrics.targetDistance}</strong><span>FELDER ZUM ZIEL</span></div><div><strong>{item.report.metrics.coverCount}</strong><span>DECKUNGEN</span></div></div>
          <div className="validation"><span>✓</span><div><strong>Harte Constraints erfüllt</strong><p>Raumprogramm · Zugänge · Geometrie · Versorgungsgraphen · Missionsanker</p></div></div>
          <div className="circulation-report"><strong>{item.report.metrics.corridorCells} Flurfelder</strong><p>Zusammenhängende Erschließung mit Raumtüren und zwei Umlaufwegen.</p>{item.report.metrics.executiveSanitaryDistance !== null && <p data-ceo-sanitary>CEO → WC: <strong>{item.report.metrics.executiveSanitaryDistance} Gehfelder</strong> / höchstens 16</p>}{selectedRoom && selectedRoom.type !== "restroom" && selectedSanitaryPath.length > 0 && <button onClick={() => { setView("floorplan"); setOverlay("sanitary"); }}>Sanitärweg anzeigen · {selectedSanitaryPath.length - 1} Felder</button>}</div>
          {selectedRoom && <div className="room-detail"><div className="detail-kicker">{selectedRoom.id.toUpperCase()}</div><h2>{ROOM_RULES[selectedRoom.type].label}</h2><p><i style={{ background: ZONES[selectedRoom.zone].color }} />{ZONES[selectedRoom.zone].label} · {selectedRoom.width} × {selectedRoom.height} Felder</p><dl><dt>Grundfläche</dt><dd>{selectedRoom.width * selectedRoom.height} / min. {selectedRoom.minArea}</dd><dt>Belegung / Kapazität</dt><dd>{selectedRoom.assignedDemand} / {selectedRoom.capacity} {item.building.program.find((row) => row.type === selectedRoom.type)?.unit}</dd><dt>Arbeitsrolle</dt><dd>{ROLES[selectedRoom.workplaceRole]}</dd><dt>Büroform</dt><dd>{OFFICE_FORMS[selectedRoom.officeForm]}</dd><dt>Abteilung</dt><dd>{DEPARTMENT_LABELS[selectedRoom.department]}</dd><dt>Zugang</dt><dd>{ACCESS[selectedRoom.access]}</dd><dt>Material / Zustand</dt><dd>{SURFACES[selectedRoom.appearance.surface]} · {CONDITION_LABELS[selectedRoom.appearance.wear]}</dd><dt>Übergänge</dt><dd>{roomLinks.length}</dd><dt>Versorgung</dt><dd>{ROOM_RULES[selectedRoom.type].services.map((service) => SERVICE_LABELS[service]).join(", ")}</dd></dl></div>}
          <details><summary>Raumprogramm · {item.building.program.length} Funktionen</summary><ul className="room-list">{item.building.rooms.map((room) => <li key={room.id}><button onClick={() => setSelected(room.id)}><span>{room.id.slice(-2)} · {ROOM_RULES[room.type].label}</span><span>{room.width * room.height}</span></button></li>)}</ul></details>
          <details><summary>Layout · {item.building.layout.method === "circulation" ? "Flurnetz + Raumstreifen" : "BSP-Teilung"}</summary><div className="metadata"><p>{item.building.layout.templateId ?? "Variable Raumnachbarschaften"}</p><p>Flächenentwurf {item.building.layout.candidate} / 4 · {item.building.layout.searchNodes} Suchknoten · {item.building.layout.backtracks} Rückschritte</p>{item.building.layout.rejected.map((rejected) => <p key={rejected.candidate}>Verworfen {rejected.candidate}: {rejected.reason}</p>)}</div></details>
          <details><summary>Versionen & Zufallsströme</summary><div className="metadata"><p>{item.generatorVersion}<br />{item.contentVersion}</p><p>Versuch {item.attempt} / {item.config.maxAttempts} · kein Rückfall</p>{Object.entries(item.seeds).map(([stage, value]) => <div key={stage}>{stage}<code>{value}</code></div>)}<p className="hash">SHA-256<br />{item.hash}</p></div></details>
          <div className="export-actions"><button className="primary" disabled={busy || dirty} onClick={() => download()}>Gebäudepaket exportieren <span>↓</span></button><button disabled={busy || dirty} onClick={() => download(true)}>Missionsdaten exportieren</button></div>
          <details className="license-notice"><summary>Quellen & MIT-Lizenz</summary><p>BSP-Rechteckteilung nach <a href="https://github.com/halftheopposite/bsp-dungeon-generator/tree/ca8c5b4cb3df2bde2b269e59433cc0f93e6406c5" target="_blank" rel="noreferrer">Aymeric Chauvin</a>. Graph-Einbettung: eigene TypeScript-Implementierung nach dem <a href="https://github.com/OndrejNepozitek/Edgar-DotNet/tree/258c83a88656bd6095255a1b749232ade2b87589" target="_blank" rel="noreferrer">Edgar-Ansatz</a>, ohne übernommenen Edgar-Code.</p><pre>{mitLicense}</pre></details>
        </>}
      </aside>
    </main>
    {demand && <section className="demand-panel panel" aria-label="Bedarfsherleitung"><div className="panel-heading"><span className="number">03</span><h2>Bedarfsherleitung · aktuelle Parameter</h2></div>
      <div id="corporate-effects" className="corporate-effects"><div><h3>Architekturwirkung · {demand.identity.name}</h3><ul>{demand.identity.principles.map((principle) => <li key={principle}>{principle}</li>)}</ul></div><div><h3>Verbindliche Nachbarschaften</h3><ul>{demand.relationships.map((rule) => <li key={`${rule.from}-${rule.to}`}>{rule.reason}{rule.exclusive ? " · einziger Zugang" : ""}</li>)}</ul><p>Bei Platzmangel bleiben Rollen und Beziehungen erhalten. Konzernprofile sind fiktive Gründungsgeschichten.</p></div></div>
      <div className="demand-summary"><p><strong>{demand.summary.local.occupants}</strong> Beschäftigte örtlich / {demand.summary.building.occupants} im Gebäude<br /><strong>{demand.instances.length}</strong> Räume örtlich · {demand.program.reduce((sum, row) => sum + row.outsideCount, 0)} außerhalb</p><p>Mindestens <strong>{demand.summary.minimumArea}</strong> Raumfelder + <strong>{demand.summary.minimumWallArea}</strong> Trennwandfelder + <strong>{demand.summary.minimumCirculationArea}</strong> Flurfelder<br /><strong>{demand.summary.availableArea}</strong> Innenfelder verfügbar · Wände sind nur eine Untergrenze</p><p>Sanitär: <strong>{demand.summary.sanitaryFixtures}</strong> Kabinen örtlich, {demand.summary.outsideSanitaryFixtures} außerhalb<br />Beschäftigte und Kapazitäten erzeugen keine zusätzlichen Gegner.</p></div>
      {demand.errors.length > 0 && <p className="demand-error">{demand.errors.map((finding) => finding.message).join(" ")}</p>}
      <div className="demand-table-wrap"><table className="demand-table"><thead><tr><th>Funktion</th><th>Bedarf örtlich</th><th>Kapazität / Raum</th><th>Räume örtlich</th><th>Außerhalb</th><th>Min. Raumfelder</th><th>Herleitung</th></tr></thead><tbody>{demand.program.map((row) => <tr key={row.type} data-room-type={row.type}><th>{ROOM_RULES[row.type].label}</th><td>{row.required} {row.unit}</td><td>{row.capacityPerRoom}</td><td data-local-count>{row.count}</td><td>{row.outsideCount}<small>{row.outsideRequired} {row.unit}</small></td><td>{row.minimumArea || "—"}</td><td>{row.reason}</td></tr>)}</tbody></table></div>
      <p className="quiet">Versionierte Spielannahmen, keine baurechtliche/ASR-Planung. Flächen in Rasterfeldern, nicht m². Bedarf wird auf ganze Räume aufgerundet; getrennte Bereiche benötigen eigene Kapazitäten. Außerhalb deklarierte Funktionen werden nicht begehbar erzeugt. Das Missionsgeschoss erhält lokale Technik und Zugangsverteiler; weitere Geschosse bleiben abstrakt.</p>
    </section>}
    <footer className="workshop-footer"><span>BEDARF → RAUMPROGRAMM → GRUNDRISS → TAKTIK</span><p>Prototyp: Versorgung als Raumgraph; Leitungsgeometrie, WFC, mehrere spielbare Stockwerke, Bot- und menschliche Spielabnahme offen. Der Export wird vom bestehenden Missionsbildschirm noch nicht geladen.</p></footer>
  </div>;
}

function Plan({ item, selected, onSelect, graphOnly, overlay, finishes }: { item: BuildingPackage; selected: string; onSelect: (id: string) => void; graphOnly: boolean; overlay: "none" | "routes" | "sanitary" | "bsp" | Service; finishes: boolean }) {
  const { building, mission } = item;
  const selectedRoom = building.rooms.find((room) => room.id === selected);
  const sanitation = selectedRoom ? sanitaryPath(building, selectedRoom, mission) : [];
  const getRoom = (id: string) => architecturalNodes(building).get(id)!;
  const pointString = (ids: readonly string[]) => ids.map((id) => { const point = mid(getRoom(id)); return `${point.x},${point.y}`; }).join(" ");
  const routePoints = (ids: readonly string[]) => {
    const points: string[] = [];
    ids.forEach((id, index) => {
      const point = mid(getRoom(id)); points.push(`${point.x},${point.y}`);
      const next = ids[index + 1];
      if (next) { const portal = building.connections.find((edge) => edge.from === id && edge.to === next || edge.to === id && edge.from === next)!.portal; points.push(`${portal.x + 0.5},${portal.y + 0.5}`); }
    });
    return points.join(" ");
  };
  return <svg className="plan" viewBox={`-1 -1 ${mission.width + 2} ${mission.height + 2}`} role="img" aria-label={graphOnly ? "Raum- und Zugangsgraph" : "Funktionaler Gebäudegrundriss"}>
    <defs><pattern id="grid" width="1" height="1" patternUnits="userSpaceOnUse"><path d="M 1 0 L 0 0 0 1" fill="none" stroke="#ffffff" strokeOpacity="0.045" strokeWidth="0.025" /></pattern>
      {building.rooms.map((room) => <pattern key={room.id} id={`surface-${room.id}`} width={room.appearance.surface === "timber" ? 0.5 : 1} height="1" patternUnits="userSpaceOnUse"><path d={room.appearance.surface === "timber" ? "M.1 0 V1 M.4 0 V1" : room.appearance.pattern === "leaves" ? "M0 1 Q.2 .2 1 0 M.5 .5 Q.8 .6 .8 .9" : room.appearance.pattern === "circuits" ? "M0 .3 H.7 V1 M.3 0 V.3" : room.appearance.pattern === "lines" ? "M0 .2 H1 M0 .7 H1" : "M1 0 H0 V1"} fill="none" stroke={room.appearance.accent} strokeWidth="0.018" strokeOpacity="0.24" /></pattern>)}
    </defs>
    <rect width={mission.width} height={mission.height} fill="#121c27" rx="0.1" />
    <g className="corridor-floor" pointerEvents="none">{building.circulation.map((cell) => <rect key={`${cell.x}-${cell.y}`} x={cell.x} y={cell.y} width="1" height="1" fill="#457d83" fillOpacity="0.48" />)}</g>
    {building.rooms.map((room) => <g key={room.id} role="button" tabIndex={0} aria-label={`${room.id} ${ROOM_RULES[room.type].label}`} onClick={() => onSelect(room.id)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onSelect(room.id); } }} className="room-shape">
      <rect x={room.x} y={room.y} width={room.width} height={room.height} fill={finishes ? room.appearance.color : ZONES[room.zone].color} fillOpacity={finishes ? selected === room.id ? 0.4 : 0.22 : selected === room.id ? 0.24 : 0.09} stroke={selected === room.id ? building.identity.accent : "#526274"} strokeWidth={selected === room.id ? 0.09 : 0.035} />
      {finishes && <><rect x={room.x} y={room.y} width={room.width} height={room.height} fill={`url(#surface-${room.id})`} pointerEvents="none" />{room.appearance.wear !== "pristine" && <g className="wear-marks" stroke="#acb0a4" strokeOpacity="0.28" strokeWidth="0.045" pointerEvents="none"><path d={`M${room.x + 0.2} ${room.y + 0.5} l.6 -.2 m-.4 .3 l.6 -.1`} />{room.appearance.wear === "patched" && <path d={`M${room.x + room.width - 1} ${room.y + room.height - 1} h.7 v.5 h-.7 Z`} fill="#535d63" />}</g>}</>}
    </g>)}
    <rect width={mission.width} height={mission.height} fill="url(#grid)" pointerEvents="none" />
    {overlay === "bsp" && building.layout.partitions.map((part) => <line key={part.id} x1={part.bounds.x + (part.axis === "x" ? part.offset + 0.5 : 0)} y1={part.bounds.y + (part.axis === "y" ? part.offset + 0.5 : 0)} x2={part.bounds.x + (part.axis === "x" ? part.offset + 0.5 : part.bounds.width)} y2={part.bounds.y + (part.axis === "y" ? part.offset + 0.5 : part.bounds.height)} stroke="#e6c78f" strokeWidth="0.055" strokeDasharray="0.1 0.15" pointerEvents="none" />)}
    {building.connections.map((link) => {
      const a = mid(getRoom(link.from)); const b = mid(getRoom(link.to));
      if (link.kind === "passage") return graphOnly ? <line key={link.id} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#8dbdc4" strokeWidth="0.065" pointerEvents="none" /> : null;
      return graphOnly ? <line key={link.id} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={link.kind === "shortcut" ? "#edb77c" : "#718398"} strokeDasharray={link.kind === "shortcut" || link.kind === "controlled" ? "0.15 0.15" : undefined} strokeWidth="0.05" pointerEvents="none" />
        : <rect key={link.id} x={link.portal.x + 0.1} y={link.portal.y + 0.1} width="0.8" height="0.8" fill={link.kind === "shortcut" ? "#e4ac6d" : link.kind === "airlock" ? "#b99beb" : "#5c817e"} opacity="0.85" pointerEvents="none" />;
    })}
    {overlay === "routes" && building.missionGraph.routes.map((route, index) => <polyline key={index} points={graphOnly ? pointString(route) : routePoints(route)} fill="none" stroke={index === 0 ? "#77e0cb" : "#e8ba82"} strokeOpacity="0.5" strokeWidth="0.08" strokeDasharray={index ? "0.2 0.18" : undefined} pointerEvents="none" />)}
    {overlay === "sanitary" && sanitation.length > 0 && <polyline className="sanitary-path" points={sanitation.map((cell) => `${cell.x + 0.5},${cell.y + 0.5}`).join(" ")} fill="none" stroke="#b4eafe" strokeWidth="0.15" strokeLinejoin="round" pointerEvents="none"><title>Sanitärweg: {sanitation.length - 1} Gehfelder</title></polyline>}
    {overlay !== "none" && overlay !== "routes" && building.infrastructure.find((service) => service.kind === overlay)?.edges.map((edge, index) => {
      const a = mid(getRoom(edge.from)); const b = mid(getRoom(edge.to));
      return <line key={index} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#ded09b" strokeWidth="0.1" pointerEvents="none" />;
    })}
    {!graphOnly && finishes && <g pointerEvents="none" className="cosmetic-furniture">{building.dressing.map((part) => part.module === "planter" ? <circle key={part.id} cx={part.x + 0.5} cy={part.y + 0.5} r="0.3" fill="#87ad79" fillOpacity="0.65" /> : <rect key={part.id} x={part.x + 0.2} y={part.y + 0.25} width="0.6" height={part.module === "table" ? "0.55" : "0.32"} rx="0.04" fill={building.identity.accent} fillOpacity="0.27" />)}</g>}
    {!graphOnly && <g pointerEvents="none">{mission.lowCover.map((cover) => <path key={cover.id} d={`M${cover.x + (cover.protects === "w" ? 0.12 : 0.88)},${cover.y + 0.18} v0.64`} stroke="#b2bcd0" strokeWidth="0.13" />)}{mission.extraction.map((cell, index) => <rect key={index} x={cell.x + 0.12} y={cell.y + 0.12} width="0.76" height="0.76" stroke="#8ce6cc" strokeWidth="0.03" fill="#72d8ba" fillOpacity="0.14" />)}{mission.spawns.map((spawn) => <circle key={spawn.id} cx={spawn.x + 0.5} cy={spawn.y + 0.5} r="0.13" fill={spawn.team === "crew" ? "#99f4d8" : "#f4a58c"} />)}<path d={`M${mission.terminal.x + 0.5},${mission.terminal.y + 0.18} l0.32,0.32 -0.32,0.32 -0.32,-0.32 Z`} fill="#f7bc74" /></g>}
    {building.entries.map((entry) => <text key={entry.roomId} x={entry.cell.x + 0.5} y={entry.cell.y + 0.67} fontSize="0.55" fill="#b3f7e4" textAnchor="middle" pointerEvents="none">{entry.cell.x === 0 ? "→" : entry.cell.x === mission.width - 1 ? "←" : entry.cell.y === 0 ? "↓" : "↑"}</text>)}
    {building.rooms.map((room) => { const point = mid(room); return <g key={room.id} pointerEvents="none"><text x={point.x} y={point.y - 0.27} fill={finishes ? room.appearance.accent : ZONES[room.zone].color} textAnchor="middle" fontSize="0.23" letterSpacing="0.035">{room.id.slice(-2)} / {finishes ? room.workplaceRole === "support" ? ZONES[room.zone].label.toUpperCase() : OFFICE_FORMS[room.officeForm].toUpperCase() : ZONES[room.zone].label.toUpperCase()}</text><text x={point.x} y={point.y + 0.19} fill="#ebeff5" textAnchor="middle" fontSize={ROOM_RULES[room.type].label.length > 15 ? "0.28" : "0.35"} fontWeight="600">{ROOM_RULES[room.type].label}</text><text x={point.x} y={point.y + 0.61} fill="#9cabb8" textAnchor="middle" fontSize="0.24">{room.width * room.height} Felder{room.workplaceRole !== "support" ? ` · ${room.assignedDemand} Plätze` : ""}</text></g>; })}
  </svg>;
}

