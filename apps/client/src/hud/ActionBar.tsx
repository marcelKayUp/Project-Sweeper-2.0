import type { ShotPreview } from "@neon/sim";
import { CircleIcon, ShieldIcon, StopIcon } from "./icons.tsx";

interface ActionBarProps {
  readonly incoming: ShotPreview;
  readonly blocked: ShotPreview;
}

export function ActionBar({ incoming, blocked }: ActionBarProps) {
  const chance = incoming.chance;
  const formula =
    chance !== null && !incoming.clamped
      ? `${incoming.base} − ${incoming.distancePenalty} − ${incoming.coverPenalty} = ${chance}`
      : "";

  return (
    <footer className="bar">
      <div className="unit">
        <CircleIcon />
        <div className="who">
          <strong>Kite</strong>
          <span className="mark">
            <ShieldIcon />
            {incoming.protectedEdgeCrossed ? "gedeckt" : "offen"}
          </span>
        </div>
      </div>
      <div className="shot">
        <div className="pct">{chance === null ? "—" : `${chance} %`}</div>
        <div className="shot-copy">
          <span className="kicker">Wache → Kite</span>
          <span className="formula">{formula}</span>
          <span className="mark">
            <ShieldIcon />
            Deckung −{incoming.coverPenalty} · Distanz {incoming.distance}
          </span>
        </div>
      </div>
      <div className="shot">
        <StopIcon />
        <div className="shot-copy">
          <span className="kicker">Nix → Datenraum</span>
          <strong>{blocked.blocked ? "blockiert" : "frei"}</strong>
          <span className="mark">{blocked.blocked ? "Schusslinie endet an der Wand" : "Schusslinie frei"}</span>
        </div>
      </div>
    </footer>
  );
}
