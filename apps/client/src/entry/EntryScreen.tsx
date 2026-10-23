import { playerStops, techStops, type EntryStop } from "./sitemap.ts";

export function EntryScreen() {
  return (
    <main className="einstieg">
      <header>
        <p className="einstieg-kicker">NEON CONTRACT</p>
        <h1>Manuell testen</h1>
        <p>Vorhandene Flächen öffnen sich von hier. Geplante Stationen haben noch keinen Sprung. Zugang, Lobby, Taktik, Sicht und Raster brauchen den Spielserver.</p>
      </header>
      <section>
        <h2>Spielerweg</h2>
        <ol>{playerStops.map((stop) => <Stop key={stop.id} stop={stop} />)}</ol>
      </section>
      <section>
        <h2>Technikstücke</h2>
        <ul>{techStops.map((stop) => <Stop key={stop.id} stop={stop} />)}</ul>
      </section>
    </main>
  );
}

function Stop({ stop }: { stop: EntryStop }) {
  return (
    <li>
      <strong>{stop.title}</strong>
      <span className={stop.mark === "vorhanden" ? "einstieg-da" : "einstieg-offen"}>{stop.mark}</span>
      <span>{stop.note}</span>
      {stop.href ? <a href={stop.href}>Öffnen</a> : <span className="einstieg-offen">kein Sprung</span>}
    </li>
  );
}
