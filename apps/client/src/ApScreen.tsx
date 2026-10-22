import { useEffect, useRef } from "react";
import { ApScene } from "./phaser/ApScene.ts";
import { createGame } from "./phaser/createGame.ts";

export function ApScreen() {
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const game = createGame("battle-root", ApScene);
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
