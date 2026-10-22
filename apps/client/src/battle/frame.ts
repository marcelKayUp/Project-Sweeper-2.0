import { deckungFixture, previewShot } from "@neon/sim";

const AIM_BONUS = 0;

export function queryDeckungFrame() {
  const incoming = previewShot(deckungFixture.map, deckungFixture.enemy, deckungFixture.runner, AIM_BONUS);
  const blocked = previewShot(deckungFixture.map, deckungFixture.nix, deckungFixture.blockedTarget, AIM_BONUS);
  return { ...deckungFixture, incoming, blocked };
}

export type DeckungFrame = ReturnType<typeof queryDeckungFrame>;

declare global {
  interface Window {
    __NEON_FRAME_READY__?: boolean;
  }
}
