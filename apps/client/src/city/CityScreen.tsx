import { memo, useEffect, useMemo, useRef, useState } from "react";
import { RHEIN_RUHR, RHEIN_RUHR_BUILDINGS, RHEIN_RUHR_MAP_SOURCE, RHEIN_RUHR_PLACES, RHEIN_RUHR_STREETS, rheinRuhrMapPoint } from "@neon/sim";
import { frame, spin, vectorScene, type VectorScene } from "./vectorMap.ts";

const TURN_STEP = Math.PI / 4;
const CITY_SPAN = 340;
const MIN_SPAN = 80;

interface View {
  readonly x: number;
  readonly y: number;
  readonly span: number;
}

interface Drag {
  readonly id: number;
  readonly x: number;
  readonly y: number;
  readonly view: View;
}

const places = RHEIN_RUHR_PLACES.map((place) => {
  const point = rheinRuhrMapPoint(Number(place.lon), Number(place.lat));
  const name = RHEIN_RUHR.nodes.find((node) => node.id === place.id)?.name ?? place.id;
  return { id: place.id, name, x: point.x, y: point.y };
});
const essen = places.find((place) => place.id === "essen") ?? places[0];
const initialView: View = { x: essen?.x ?? 0, y: essen?.y ?? 0, span: CITY_SPAN };

export function CityScreen() {
  const [turn, setTurn] = useState(0);
  const [view, setView] = useState<View>(initialView);
  const drag = useRef<Drag | null>(null);
  const map = useRef<HTMLDivElement>(null);
  const scene = useMemo(() => vectorScene(RHEIN_RUHR_STREETS, RHEIN_RUHR_BUILDINGS, places, turn), [turn]);
  const viewBox = frame(scene.center, view.x, view.y, Math.min(view.span, scene.fullSpan), turn);

  useEffect(() => {
    const node = map.current;
    if (!node) return;
    const zoom = (event: WheelEvent) => {
      event.preventDefault();
      const rect = node.getBoundingClientRect();
      const tx = rect.width > 0 ? (event.clientX - rect.left) / rect.width : 0.5;
      const ty = rect.height > 0 ? (event.clientY - rect.top) / rect.height : 0.5;
      setView((current) => zoomAt(scene.center, current, turn, tx, ty, event.deltaY > 0 ? 1.18 : 1 / 1.18, scene.fullSpan));
    };
    node.addEventListener("wheel", zoom, { passive: false });
    return () => node.removeEventListener("wheel", zoom);
  }, [scene.center, scene.fullSpan, turn]);

  function beginDrag(event: React.PointerEvent<HTMLDivElement>) {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    event.preventDefault();
    drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, view };
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Ohne aktiven Zeiger bleibt das Ziehen über die Bewegungen auf der Karte erhalten.
    }
  }

  function moveDrag(event: React.PointerEvent<HTMLDivElement>) {
    const start = drag.current;
    if (!start || start.id !== event.pointerId) return;
    setView(panBy(scene.center, start.view, turn, event.currentTarget.getBoundingClientRect(), event.clientX - start.x, event.clientY - start.y));
  }

  function endDrag(event: React.PointerEvent<HTMLDivElement>) {
    const start = drag.current;
    if (!start || start.id !== event.pointerId) return;
    drag.current = null;
    setView(panBy(scene.center, start.view, turn, event.currentTarget.getBoundingClientRect(), event.clientX - start.x, event.clientY - start.y));
  }

  function showPlace(place: { x: number; y: number }) {
    setView({ x: place.x, y: place.y, span: CITY_SPAN });
  }

  return (
    <main className="stadt" data-screen="stadt" data-buildings={scene.buildings.length} data-streets={scene.streets.length} data-turn={turn}>
      <aside>
        <p className="kicker">Übersicht</p>
        <h1>Rhein-Ruhr</h1>
        <p>Blaue Flächen sind einzelne Gebäude. Weiße Linien sind Straßen, die dünneren die kleineren. Ziehen verschiebt, das Rad zoomt, die Tasten drehen. Ein Ortsname holt diesen Ausschnitt. Die Ansicht erzeugt keine Deckung und keine Mission.</p>
        <div className="stadt-turn" role="group" aria-label="Kartenansicht">
          <button type="button" onClick={() => setTurn((value) => value - TURN_STEP)}>
            Links
          </button>
          <button type="button" onClick={() => setTurn((value) => value + TURN_STEP)}>
            Rechts
          </button>
          <button type="button" onClick={() => setView((current) => zoomAt(scene.center, current, turn, 0.5, 0.5, 1 / 1.18, scene.fullSpan))}>
            Näher
          </button>
          <button type="button" onClick={() => setView((current) => zoomAt(scene.center, current, turn, 0.5, 0.5, 1.18, scene.fullSpan))}>
            Weiter
          </button>
          <button type="button" onClick={() => { setTurn(0); setView(initialView); }}>
            Ausgangslage
          </button>
          <button type="button" onClick={() => setView({ x: scene.center.x, y: scene.center.y, span: scene.fullSpan })}>
            Gebiet
          </button>
        </div>
        <ul className="stadt-places">
          {places.map((place) => (
            <li key={place.id}>
              <button type="button" data-node={place.id} onClick={() => showPlace(place)}>
                {place.name}
              </button>
            </li>
          ))}
        </ul>
        <p data-source="osm" data-roads-live={RHEIN_RUHR_MAP_SOURCE.roadsLive} data-buildings-live={RHEIN_RUHR_MAP_SOURCE.buildingsLive}>
          Gebäude und Straßen © OpenStreetMap-Mitwirkende, {RHEIN_RUHR_MAP_SOURCE.license}. Vereinfachte Vektoren, abgefragt {RHEIN_RUHR_MAP_SOURCE.queriedAt}.
        </p>
      </aside>
      <div ref={map} className="stadt-map" tabIndex={0} aria-label="Vektorkarte Rhein-Ruhr" onPointerDown={beginDrag} onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={endDrag} onDragStart={(event) => event.preventDefault()}>
        <svg viewBox={viewBox} role="img" aria-hidden="true">
          <MapArt scene={scene} />
        </svg>
      </div>
    </main>
  );
}

const MapArt = memo(function MapArt({ scene }: { scene: VectorScene }) {
  return (
    <>
      <path className="stadt-street-nah" data-kind="nah" d={scene.paths.nah} />
      <path className="stadt-street-fern" data-kind="fern" d={scene.paths.fern} />
      <g className="stadt-buildings">
        {scene.buildings.map((building, index) => (
          <polygon key={`${building.place}:${index}`} className="stadt-building" data-place={building.place} points={building.points} fill={building.fill} />
        ))}
      </g>
      {scene.labels.map((label) => (
        <text key={label.id} className="stadt-label" data-label={label.id} x={label.x} y={label.y}>
          {label.name}
        </text>
      ))}
    </>
  );
});

function panBy(center: { x: number; y: number }, view: View, turn: number, rect: DOMRect, dx: number, dy: number): View {
  const width = Math.max(rect.width, 1);
  const height = Math.max(rect.height, 1);
  const projected = spin(view.x, view.y, center.x, center.y, turn);
  const next = spin(projected.x - (dx / width) * view.span, projected.y - (dy / height) * view.span, center.x, center.y, -turn);
  return { x: next.x, y: next.y, span: view.span };
}

function zoomAt(center: { x: number; y: number }, view: View, turn: number, tx: number, ty: number, factor: number, fullSpan: number): View {
  const span = clamp(view.span * factor, MIN_SPAN, fullSpan);
  const projected = spin(view.x, view.y, center.x, center.y, turn);
  const anchorX = projected.x - view.span / 2 + tx * view.span;
  const anchorY = projected.y - view.span / 2 + ty * view.span;
  const next = spin(anchorX - (tx - 0.5) * span, anchorY - (ty - 0.5) * span, center.x, center.y, -turn);
  return { x: next.x, y: next.y, span };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
