import { useRef, useState } from "react";
import { RHEIN_RUHR, RHEIN_RUHR_SOURCE, cityCells } from "@neon/sim";
import { cityPicture, type CityPicture } from "./cityPicture.ts";
import { hologram, type HoloCellSource, type HoloScene } from "./hologram.ts";

const TURN_STEP = Math.PI / 4;

interface RheinRuhrView {
  readonly picture: CityPicture;
  readonly cells: readonly HoloCellSource[];
}

interface Drag {
  readonly id: number;
  readonly x: number;
  readonly turn: number;
}

let rheinRuhrView: RheinRuhrView | null = null;

function loadRheinRuhrView(): RheinRuhrView {
  if (rheinRuhrView) return rheinRuhrView;
  const picture = cityPicture(RHEIN_RUHR.nodes, RHEIN_RUHR.edges);
  rheinRuhrView = { picture, cells: cityCells(RHEIN_RUHR.nodes) };
  return rheinRuhrView;
}

export function CityScreen() {
  const { picture, cells } = loadRheinRuhrView();
  const [turn, setTurn] = useState(0);
  const drag = useRef<Drag | null>(null);
  const scene: HoloScene = hologram(picture, cells, turn);

  function beginDrag(event: React.PointerEvent<HTMLDivElement>) {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    event.preventDefault();
    drag.current = { id: event.pointerId, x: event.clientX, turn };
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Ohne aktiven Zeiger bleibt das Ziehen über die Bewegungen auf der Karte erhalten.
    }
  }

  function moveDrag(event: React.PointerEvent<HTMLDivElement>) {
    const start = drag.current;
    if (!start || start.id !== event.pointerId) return;
    const width = event.currentTarget.getBoundingClientRect().width;
    const swept = ((event.clientX - start.x) * Math.PI) / Math.max(width, 1);
    setTurn(start.turn + swept);
  }

  function endDrag(event: React.PointerEvent<HTMLDivElement>) {
    const start = drag.current;
    if (!start || start.id !== event.pointerId) return;
    const width = event.currentTarget.getBoundingClientRect().width;
    const swept = ((event.clientX - start.x) * Math.PI) / Math.max(width, 1);
    drag.current = null;
    setTurn(start.turn + swept);
  }

  return (
    <main className="stadt" data-screen="stadt" data-nodes={picture.blocks.length} data-edges={picture.streets.length} data-cells={scene.cells.length} data-turn={turn}>
      <aside>
        <p className="kicker">Übersicht</p>
        <h1>Rhein-Ruhr</h1>
        <p>Leuchtende Baukörper sind Orte. Weiße Linien sind Korridore. Ziehen oder die Tasten drehen die Ansicht um die Mitte. Die Ansicht erzeugt keine Deckung und keine Mission.</p>
        <div className="stadt-turn" role="group" aria-label="Kartendrehung">
          <button type="button" onClick={() => setTurn((value) => value - TURN_STEP)}>
            Links
          </button>
          <button type="button" onClick={() => setTurn((value) => value + TURN_STEP)}>
            Rechts
          </button>
          <button type="button" onClick={() => setTurn(0)}>
            Ausgangslage
          </button>
        </div>
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
      <div className="stadt-map" tabIndex={0} aria-label="Holografische Rhein-Ruhr-Übersicht" onPointerDown={beginDrag} onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={endDrag} onDragStart={(event) => event.preventDefault()}>
      <svg viewBox={scene.viewBox} role="img" aria-hidden="true">
        <defs>
          <filter id="stadt-street-glow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="2.2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <polygon className="stadt-plate" points={scene.plate} />
        <g className="stadt-cells">
          {scene.cells.map((cell) => (
            <path key={cell.id} className="stadt-cell" data-cell={cell.id} fill={cell.fill} fillRule="evenodd" d={cell.d} />
          ))}
        </g>
        <polygon className="stadt-frame" points={scene.plate} />
        {scene.grid.map((points) => (
          <polyline key={points} className="stadt-grid" points={points} />
        ))}
        <g filter="url(#stadt-street-glow)">
          {scene.streets.map((street) => (
            <line key={street.id} data-edge={street.id} x1={street.x1} y1={street.y1} x2={street.x2} y2={street.y2} />
          ))}
        </g>
        {scene.blocks.map((block) => (
          <g key={block.id} className="stadt-block" data-node={block.id}>
            <title>{block.name}</title>
            {block.faces.map((face) => (
              <polygon key={face.kind} className={`stadt-${face.kind}`} points={face.points} fill={block[face.kind]} />
            ))}
          </g>
        ))}
      </svg>
      </div>
    </main>
  );
}
