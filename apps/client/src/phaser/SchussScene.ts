import { SCHUSS_VIEW_SEED, schussView } from "@neon/sim";
import Phaser from "phaser";
import { paintSchuss } from "./paintSchuss.ts";

export class SchussScene extends Phaser.Scene {
  constructor() {
    super("schuss");
  }

  create(): void {
    paintSchuss(this, schussView(SCHUSS_VIEW_SEED));
    window.__NEON_FRAME_READY__ = true;
  }
}
