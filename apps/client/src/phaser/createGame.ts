import Phaser from "phaser";
import { BattleScene } from "./BattleScene.ts";

type SceneCtor = new () => Phaser.Scene;

export function createGame(parent: string, Scene: SceneCtor = BattleScene): Phaser.Game {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: 1920,
    height: 1080,
    backgroundColor: "#090c11",
    banner: false,
    audio: { noAudio: true },
    fps: { target: 30, forceSetTimeOut: true },
    scale: {
      mode: Phaser.Scale.NONE,
      autoCenter: Phaser.Scale.NO_CENTER,
      width: 1920,
      height: 1080,
    },
    render: { antialias: true, pixelArt: false },
    scene: [Scene],
  });
}
