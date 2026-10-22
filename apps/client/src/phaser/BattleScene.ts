import Phaser from "phaser";
import { queryDeckungFrame } from "../battle/frame.ts";
import { paintBattle } from "./paintBattle.ts";

export class BattleScene extends Phaser.Scene {
  constructor() {
    super("battle");
  }

  create(): void {
    const frame = queryDeckungFrame();
    paintBattle(this, frame);
    window.__NEON_FRAME_READY__ = true;
  }
}
