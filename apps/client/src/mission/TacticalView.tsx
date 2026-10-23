import { useEffect, useRef, useState } from "react";
import type { Cell, Direction } from "@neon/sim";
import { actionAp } from "@neon/sim";
import { mountIsoBoard, type IsoBoardView } from "../iso/mountIsoBoard.ts";
import { partLabel, WoundList } from "./WoundList.tsx";
import type { UiPreferences } from "./preferences.ts";
import { preferenceMarks } from "./preferences.ts";
import {
  actionOffers,
  floorLabel,
  moveWish,
  overviewCells,
  poseAfterSkip,
  readTacticalStand,
  remainingSeconds,
  sameCell,
  shotPreview,
  shownFloor,
  tacticalBoard,
  type MissionAction,
  type TacticalStand,
  type TacticalUnit,
} from "./tactical.ts";

const DIRECTION_LABEL: Readonly<Record<Direction, string>> = { n: "Nord", e: "Ost", s: "Süd", w: "West" };

export function TacticalView({
  payload,
  prefs,
  gap,
  linked,
  pending,
  held = false,
  linkNote = "",
  moveMode,
  onMoveMode,
  onCommand,
  onRetry,
  onHelp,
  onSettings,
}: {
  payload: unknown;
  prefs: UiPreferences;
  gap: boolean;
  linked: boolean;
  pending: boolean;
  held?: boolean;
  linkNote?: string;
  onRetry?: () => void;
  moveMode: boolean;
  onMoveMode: () => void;
  onCommand: (action: MissionAction) => void;
  onHelp: () => void;
  onSettings: () => void;
}) {
  const stand = readTacticalStand(payload);
  const hostRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<IsoBoardView | null>(null);
  const chooseRef = useRef<(cell: Cell) => void>(() => {});
  const [selectedId, setSelectedId] = useState(stand?.ownRunnerId ?? "");
  const [targetId, setTargetId] = useState("");
  const [overview, setOverview] = useState(true);
  const [snap, setSnap] = useState(prefs.reduceMotion);
  const [hint, setHint] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const [viewZ, setViewZ] = useState(0);
  const ownZ = stand?.units.find((unit) => unit.id === stand.ownRunnerId)?.z ?? 0;

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    setViewZ(ownZ);
  }, [ownZ]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let view: IsoBoardView;
    try {
      view = mountIsoBoard(host, (cell) => chooseRef.current(cell));
    } catch {
      return;
    }
    host.dataset.view = "iso";
    viewRef.current = view;
    return () => {
      view.dispose();
      if (viewRef.current === view) viewRef.current = null;
    };
  }, []);

  const shown = stand ? shownFloor(stand, viewZ) : null;
  const selected = stand?.units.find((unit) => unit.id === selectedId) ?? stand?.units.find((unit) => unit.id === stand.ownRunnerId) ?? null;
  const board = shown
    ? tacticalBoard(shown, { selectedId: selected?.id ?? "", targetId, showSteps: moveMode && linked && !pending })
    : null;

  useEffect(() => {
    if (!board) return;
    viewRef.current?.sync(board);
    if (snap) viewRef.current?.settle();
  }, [board, snap]);

  if (!stand || !shown || !board) {
    return (
      <main className="mission mission-tactical" data-screen="einsatz" {...preferenceMarks(prefs)}>
        <p>Stand ist unvollständig.</p>
      </main>
    );
  }

  const active = shown;
  const offers = actionOffers(active, targetId);
  const own = stand.units.find((unit) => unit.id === stand.ownRunnerId) ?? null;
  const locked = !linked || pending || held || stand.phase !== "crew";
  const seconds = remainingSeconds(stand.deadlineAt, now);
  const preview = shotPreview(active, stand.ownRunnerId, targetId);
  const cells = overviewCells(active);
  const pose = poseAfterSkip(stand.units.map((unit) => ({ id: unit.id, x: unit.x, y: unit.y, hp: unit.hp })));
  const sheet = selected ?? own;

  chooseRef.current = (cell) => pick(active, cell, moveMode, linked && !held, pending, offers.move, setSelectedId, setTargetId, setHint, onCommand, (focus) => viewRef.current?.focus(focus));

  function skipAnimation() {
    setSnap(true);
    viewRef.current?.settle();
    viewRef.current?.sync(tacticalBoard(active, { selectedId: selected?.id ?? "", targetId, showSteps: false }));
  }

  return (
    <main
      className="mission mission-tactical"
      data-screen="einsatz"
      data-room-phase="mission"
      data-phase={stand.phase}
      data-round={stand.round}
      data-copies={stand.copies}
      data-ack={numberField(payload, "ack")}
      data-own-runner={stand.ownRunnerId}
      data-seed={numberField(payload, "seed")}
      data-move={moveMode ? "1" : "0"}
      data-gap={gap ? "1" : "0"}
      data-link={linked ? "1" : "0"}
      data-control={held ? "bot" : "human"}
      data-pending={pending ? "1" : "0"}
      data-notice={textField(payload, "notice")}
      data-overview={overview ? "1" : "0"}
      data-snap={snap ? "1" : "0"}
      {...preferenceMarks(prefs)}
    >
      <div className="mission-stage">
        <div className="iso-host" ref={hostRef} />
      </div>
      <aside className="mission-side">
        <p className="kicker">Runde {stand.round}</p>
        <h1>{phaseLabel(stand.phase)}</h1>
        <p data-timer={seconds === null ? "" : String(seconds)}>
          Kopie {stand.copies}/2 · Tür {stand.doorOpen ? "offen" : "zu"} · Frist {stand.phaseSeconds} s
          {seconds === null ? "" : ` · ${seconds} s`}
        </p>
        <div className="mission-actions" data-panel="etagen">
          <p data-floors={stand.levelCount} data-floor={viewZ}>{floorLabel(stand.levelCount, viewZ)}</p>
          <button type="button" data-action="etage-runter" disabled={viewZ <= 0} onClick={() => setViewZ((value) => Math.max(0, value - 1))}>
            Etage runter
          </button>
          <button type="button" data-action="etage-hoch" disabled={viewZ >= stand.levelCount - 1} onClick={() => setViewZ((value) => Math.min(stand.levelCount - 1, value + 1))}>
            Etage hoch
          </button>
        </div>
        <div className="mission-actions" data-panel="aktionen">
          <button type="button" data-action="bewegen" aria-pressed={moveMode} disabled={locked || !offers.move} onClick={onMoveMode}>
            Bewegen
          </button>
          <button type="button" data-action="zielen" disabled={locked || !offers.aim} onClick={() => onCommand({ kind: "aim" })}>
            Zielen · {actionAp("aim")} AP
          </button>
          <button type="button" data-action="schuss" disabled={locked || !offers.shoot} onClick={() => onCommand({ kind: "shoot", targetId })}>
            Schuss · {actionAp("shot")} AP
          </button>
          <button type="button" data-action="nachladen" disabled={locked || !offers.reload} onClick={() => onCommand({ kind: "reload" })}>
            Nachladen · {actionAp("reload")} AP
          </button>
          {DIRECTIONS(offers.overwatch, locked, onCommand)}
          {offers.heal.map((target) => (
            <button
              key={`${target.id}-${target.part}`}
              type="button"
              data-action="heilen"
              data-target={target.id}
              data-part={target.part}
              disabled={locked}
              onClick={() => onCommand({ kind: "heal", targetId: target.id, part: target.part })}
            >
              Medkit {target.name} · {partLabel(target.part)} · {actionAp("heal")} AP
            </button>
          ))}
          <button type="button" data-action="terminal" disabled={locked || !offers.terminal} onClick={() => onCommand({ kind: "interact", targetId: "terminal" })}>
            Terminal kopieren
          </button>
          <button type="button" data-action="tuer" disabled={locked || !offers.door} onClick={() => onCommand({ kind: "interact", targetId: "shortcut" })}>
            Tür öffnen
          </button>
          <button type="button" data-action="extraktion" disabled={locked || !offers.extract} onClick={() => onCommand({ kind: "extract" })}>
            Extrahieren
          </button>
          <button type="button" data-action="bereit" disabled={locked || !offers.ready} onClick={() => onCommand({ kind: "ready" })}>
            Bereit
          </button>
        </div>
        <div className="mission-actions">
          <button type="button" data-action="drehen-links" onClick={() => viewRef.current?.turn(-1)}>
            Links drehen
          </button>
          <button type="button" data-action="drehen-rechts" onClick={() => viewRef.current?.turn(1)}>
            Rechts drehen
          </button>
          <button type="button" data-action="zoom-in" onClick={() => viewRef.current?.zoomBy(0.85)}>
            Näher
          </button>
          <button type="button" data-action="zoom-aus" onClick={() => viewRef.current?.zoomBy(1.15)}>
            Weiter
          </button>
          <button type="button" data-action="uebersicht" aria-pressed={overview} onClick={() => setOverview((value) => !value)}>
            Übersicht
          </button>
          <button type="button" data-action="animation" onClick={skipAnimation}>
            Animation überspringen
          </button>
        </div>
        <p data-preview={preview ? "1" : "0"}>{preview || "Vorschau wartet auf ein sichtbares Ziel."}</p>
        <p data-own-status={own?.status ?? ""}>
          {linkNote ? `${linkNote} ` : ""}
          {!linked && !linkNote ? "Verbindung verloren. " : ""}
          {gap ? "Stand wird erneuert. " : ""}
          {hint || textField(payload, "notice") || "Der Server bestätigt jede Aktion."}
        </p>
        {onRetry ? (
          <button type="button" data-action="erneut" onClick={onRetry}>
            Erneut verbinden
          </button>
        ) : null}
        {sheet ? <Sheet unit={sheet} own={sheet.id === stand.ownRunnerId} pose={pose.find((item) => item.id === sheet.id) ?? null} /> : null}
        <ul className="mission-slots" data-panel="crew">
          {stand.units
            .filter((unit) => unit.team === "crew")
            .map((unit) => (
              <li key={unit.id}>
                <button
                  type="button"
                  data-runner={unit.id}
                  data-status={unit.status}
                  data-hp={unit.hp}
                  data-ap={unit.ap}
                  data-x={unit.x}
                  data-y={unit.y}
                  data-z={unit.z}
                  data-holder={slotHolder(payload, unit.id)}
                  onClick={() => setSelectedId(unit.id)}
                >
                  {mark(unit.id)} {unit.name} · {statusLabel(unit.status)} · HP {unit.hp} · AP {unit.ap}
                </button>
              </li>
            ))}
        </ul>
        <div className="mission-overview" hidden={!overview} data-panel="uebersicht">
          {cells.map((cell) => (
            <button
              key={`${cell.x},${cell.y}`}
              type="button"
              data-cell={`${cell.x},${cell.y}`}
              data-kind={cell.kind}
              className={`cell kind-${cell.kind}`}
              style={{ gridColumn: cell.x + 1, gridRow: cell.y + 1 }}
              onClick={() => chooseRef.current(cell)}
            >
              {cellLabel(cell.kind, cell.unitId)}
            </button>
          ))}
        </div>
        <div className="mission-actions">
          <button type="button" data-action="einstellungen" onClick={onSettings}>
            Einstellungen
          </button>
          <button type="button" data-action="hilfe" onClick={onHelp}>
            Hilfe
          </button>
        </div>
      </aside>
    </main>
  );
}

function Sheet({
  unit,
  own,
  pose,
}: {
  unit: TacticalUnit;
  own: boolean;
  pose: { readonly hp: number } | null;
}) {
  const hp = pose?.hp ?? unit.hp;
  return (
    <section data-panel="bogen" data-sheet={unit.id} data-status={unit.status}>
      <h2>{unit.name}</h2>
      <p>
        {own ? "Eigener Runner" : "Nur beobachten"} · {unit.weapon === "sidearm" ? "Pistole" : "Gewehr"} · {statusLabel(unit.status)}
      </p>
      <p>
        HP {hp}/{unit.maxHp} · AP {unit.ap}/8 · Magazin {unit.magazine}/{unit.magazineSize} + {unit.reserveMagazines} · Medkit {unit.medkits}
        {unit.aiming ? " · gezielt" : ""}
        {unit.overwatch ? ` · Overwatch ${DIRECTION_LABEL[unit.overwatch]}` : ""}
      </p>
      <WoundList parts={unit.parts} />
    </section>
  );
}

function DIRECTIONS(enabled: boolean, locked: boolean, onCommand: (action: MissionAction) => void) {
  return (["n", "e", "s", "w"] as const).map((direction) => (
    <button key={direction} type="button" data-action={`overwatch-${direction}`} disabled={locked || !enabled} onClick={() => onCommand({ kind: "overwatch", direction })}>
      Overwatch {DIRECTION_LABEL[direction]}
    </button>
  ));
}

function pick(
  stand: TacticalStand,
  cell: Cell,
  moveMode: boolean,
  linked: boolean,
  pending: boolean,
  canMove: boolean,
  select: (id: string) => void,
  aim: (id: string) => void,
  hint: (text: string) => void,
  command: (action: MissionAction) => void,
  focus: (cell: Cell) => void,
) {
  focus(cell);
  if (moveMode && linked && !pending && canMove) {
    const wish = moveWish(stand, stand.ownRunnerId, cell);
    if (wish) {
      hint("");
      command(wish);
      return;
    }
  }
  const crew = stand.units.find((unit) => unit.team === "crew" && unit.status !== "extracted" && sameCell(unit, cell));
  if (crew) {
    select(crew.id);
    hint("");
    return;
  }
  const enemy = stand.units.find((unit) => unit.team === "enemy" && sameCell(unit, cell));
  if (enemy) {
    aim(enemy.id);
    hint("");
    return;
  }
  if (!moveMode) return;
  if (!linked || pending || !canMove) return;
  hint("Feld ist nicht erreichbar.");
}

function slotHolder(payload: unknown, runnerId: string): string {
  if (!payload || typeof payload !== "object" || !("slots" in payload)) return "";
  const slots = (payload as { slots?: unknown }).slots;
  if (!Array.isArray(slots)) return "";
  const found = slots.find((slot) => {
    return Boolean(slot) && typeof slot === "object" && "runnerId" in slot && (slot as { runnerId?: unknown }).runnerId === runnerId;
  });
  if (!found || typeof found !== "object" || !("holder" in found)) return "";
  const holder = (found as { holder?: unknown }).holder;
  return holder === "human" || holder === "bot" || holder === "reserviert" || holder === "offen" ? holder : "";
}

function numberField(payload: unknown, field: string): number {
  if (!payload || typeof payload !== "object") return 0;
  const value = (payload as Record<string, unknown>)[field];
  return typeof value === "number" ? value : 0;
}

function textField(payload: unknown, field: string): string {
  if (!payload || typeof payload !== "object") return "";
  const value = (payload as Record<string, unknown>)[field];
  return typeof value === "string" ? value : "";
}

function mark(id: string): string {
  if (id === "kite") return "K";
  if (id === "voss") return "V";
  if (id === "nera") return "N";
  if (id === "sol") return "S";
  return id.slice(0, 1).toUpperCase();
}

function statusLabel(status: string): string {
  if (status === "extracted") return "extrahiert";
  if (status === "down") return "ausgefallen";
  return "handlungsfähig";
}

function phaseLabel(phase: string): string {
  if (phase === "enemy") return "Gegner";
  if (phase === "ended") return "Beendet";
  return "Crew";
}

function cellLabel(kind: string, unitId: string): string {
  if (kind === "runner") return mark(unitId);
  if (kind === "enemy") return "G";
  if (kind === "terminal") return "T";
  if (kind === "door" || kind === "door-open") return "D";
  if (kind === "extract") return "X";
  if (kind === "cover") return "C";
  if (kind === "stair") return "S";
  if (kind === "passenger") return "P";
  if (kind === "freight") return "L";
  return "";
}
