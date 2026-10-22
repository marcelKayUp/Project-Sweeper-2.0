import { useEffect, useRef } from "react";
import { createGame } from "./phaser/createGame.ts";
import { SchussScene } from "./phaser/SchussScene.ts";

export function SchussScreen() {
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const game = createGame("battle-root", SchussScene);
    return () => {
      started.current = false;
      game.destroy(true);
    };
  }, []);

  return (
    <div className="frame">
      <div id="battle-root" />
    </div>
  );
}
