import { RHEIN_RUHR, RHEIN_RUHR_SOURCE } from "@neon/sim";
import { cityPicture } from "./cityPicture.ts";

export function CityScreen() {
  const picture = cityPicture(RHEIN_RUHR.nodes, RHEIN_RUHR.edges);
  return (
    <main className="stadt" data-screen="stadt" data-nodes={picture.blocks.length} data-edges={picture.streets.length}>
      <aside>
        <p className="kicker">Übersicht</p>
        <h1>Rhein-Ruhr</h1>
        <p>Blaue Blöcke sind Orte. Weiße Linien sind Korridore. Die Ansicht erzeugt keine Deckung und keine Mission.</p>
        <ul>
          {picture.blocks.map((block) => (
            <li key={block.id} data-node={block.id}>
              {block.name}
            </li>
          ))}
        </ul>
        <p data-source="osm" data-roads-live={RHEIN_RUHR_SOURCE.roadsLive}>
          Orte © OpenStreetMap-Mitwirkende, {RHEIN_RUHR_SOURCE.license}. {RHEIN_RUHR_SOURCE.roadsLive === "nein" ? "Straßenabfrage nicht bestätigt." : "Straßenabfrage bestätigt."}
        </p>
      </aside>
      <svg viewBox={picture.viewBox} role="img" aria-label="Abstrakte Rhein-Ruhr-Übersicht">
        {picture.streets.map((street) => (
          <line key={street.id} data-edge={street.id} x1={street.x1} y1={street.y1} x2={street.x2} y2={street.y2} />
        ))}
        {picture.blocks.map((block) => (
          <g key={block.id} data-node={block.id}>
            <title>{block.name}</title>
            <rect x={block.x - 9} y={block.y - 9} width={18} height={18} />
          </g>
        ))}
      </svg>
    </main>
  );
}
