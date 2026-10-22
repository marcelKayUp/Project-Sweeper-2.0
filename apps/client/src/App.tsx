import { useEffect, useRef } from "react";
import { ApScreen } from "./ApScreen.tsx";
import { queryDeckungFrame } from "./battle/frame.ts";
import { ActionBar } from "./hud/ActionBar.tsx";
import { createGame } from "./phaser/createGame.ts";
import { IsoWalkScreen } from "./iso/IsoWalkScreen.tsx";
import { MissionScreen } from "./mission/MissionScreen.tsx";
import { SchussScreen } from "./SchussScreen.tsx";
import { SightScreen } from "./sight/SightScreen.tsx";

const frame = queryDeckungFrame();

export function App() {
  const piece = new URLSearchParams(window.location.search).get("stueck");
  if (piece === "aktionspunkte") return <ApScreen />;
  if (piece === "schuss") return <SchussScreen />;
  if (piece === "mission") return <MissionScreen />;
  if (piece === "raster") return <IsoWalkScreen />;
  if (piece === "deckung") return <DeckungScreen />;
  return <SightScreen />;
}

function DeckungScreen() {
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const game = createGame("battle-root");
    return () => {
      started.current = false;
      game.destroy(true);
    };
  }, []);

  return (
    <div className="frame">
      <div id="battle-root" />
      <ActionBar incoming={frame.incoming} blocked={frame.blocked} />
    </div>
  );
}
