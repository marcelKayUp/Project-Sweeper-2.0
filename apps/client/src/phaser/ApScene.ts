import { apBattle } from "@neon/sim";
import Phaser from "phaser";
import { paintAp } from "./paintAp.ts";

export class ApScene extends Phaser.Scene {
  constructor() {
    super("aktionspunkte");
  }

  create(): void {
    paintAp(this, apBattle());
    window.__NEON_FRAME_READY__ = true;
  }
}
