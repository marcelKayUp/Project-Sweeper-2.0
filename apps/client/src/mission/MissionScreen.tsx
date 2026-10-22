import { useEffect, useRef, useState } from "react";
import { Client } from "@colyseus/sdk";
import { PROTOCOL_VERSION } from "@neon/sim";
import {
  GHOST_DOOR,
  GHOST_EXTRACTION,
  GHOST_HEIGHT,
  GHOST_LOW_COVER,
  GHOST_TERMINAL,
  GHOST_WALLS,
  GHOST_WIDTH,
} from "@neon/sim/layout";
import { timeWish } from "./helpCopy.ts";
import { HelpPanel, SettingsPanel } from "./PrepPanels.tsx";
import { preferenceMarks, readPreferences, writePreferences, type UiPreferences } from "./preferences.ts";
import { createTeamFeed, takeBatch, takeSnapshot, type TeamBatch } from "./teamStore.ts";

const WALLS = new Set(GHOST_WALLS.map((cell) => key(cell.x, cell.y)));
const EXTRACTION = new Set(GHOST_EXTRACTION.map((cell) => key(cell.x, cell.y)));
const COVER = new Set(GHOST_LOW_COVER.map((cell) => key(cell.x, cell.y)));

interface SlotStand {
  runnerId: string;
  name: string;
  preset: string;
  ready: boolean;
  connected: boolean;
}

interface UnitStand {
  id: string;
  name: string;
  team: string;
  weapon: string;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  ap: number;
  range: number;
  magazine: number;
  magazineSize: number;
  reserveMagazines: number;
  status: string;
  ready: boolean;
}

interface Stand {
  ack: number;
  roomPhase: "lobby" | "mission" | "ended";
  ownRunnerId: string;
  coordinator: boolean;
  round: number;
  phase: string;
  revision: number;
  copies: number;
  doorOpen: boolean;
  outcome: "" | "sieg" | "niederlage";
  reason: string;
  resultRound: number;
  notice: string;
  phaseSeconds?: number;
  configRevision?: number;
  lastEventId?: number;
  width?: number;
  height?: number;
  knownCells?: Array<{ x: number; y: number }>;
  walls?: Array<{ x: number; y: number }>;
  lowCover?: Array<{ x: number; y: number }>;
  terminal?: { x: number; y: number } | null;
  door?: { x: number; y: number } | null;
  extraction?: Array<{ x: number; y: number }>;
  slots: SlotStand[];
  units: UnitStand[];
}

interface JoinRequest {
  mode: "create" | "join";
  name: string;
  code: string;
}

interface JoinedRoom {
  roomId: string;
  leave: () => void;
  send: (type: string, payload: unknown) => void;
  onMessage: (type: string, handler: (payload: unknown) => void) => void;
  onError: (handler: (code: number, message?: string) => void) => void;
  onLeave: (handler: (code: number) => void) => void;
}

export function MissionScreen() {
  const serverUrl = new URLSearchParams(window.location.search).get("server") ?? "ws://127.0.0.1:2567";
  const [name, setName] = useState("Runner");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [join, setJoin] = useState<JoinRequest | null>(null);
  const [roomId, setRoomId] = useState("");
  const [stand, setStand] = useState<Stand | null>(null);
  const [feed, setFeed] = useState(createTeamFeed());
  const [moveMode, setMoveMode] = useState(false);
  const [prefs, setPrefs] = useState(() => readPreferences(window.localStorage));
  const [panel, setPanel] = useState<"none" | "settings" | "help">("none");
  const roomRef = useRef<JoinedRoom | null>(null);
  const commandNo = useRef(0);

  useEffect(() => {
    if (!join) return;
    const handle: { cancelled: boolean; room: JoinedRoom | null } = { cancelled: false, room: null };
    const client = new Client(serverUrl);
    const pending =
      join.mode === "create"
        ? client.create("mission", { name: join.name })
        : client.joinById(join.code, { name: join.name });
    void Promise.resolve(pending)
      .then((joined) => {
        const room = joined as unknown as JoinedRoom;
        if (handle.cancelled) {
          room.leave();
          return;
        }
        handle.room = room;
        roomRef.current = room;
        setRoomId(room.roomId);
        room.onMessage("stand", (payload) => {
          if (!isStand(payload)) return;
          setStand(payload);
          setFeed((current) =>
            takeSnapshot(current, {
              revision: payload.revision,
              lastEventId: typeof payload.lastEventId === "number" ? payload.lastEventId : current.lastEventId,
              ownRunnerId: payload.ownRunnerId,
              units: payload.units.map((unit) => ({ id: unit.id, hp: unit.hp })),
            }),
          );
        });
        room.onMessage("ereignisse", (payload) => {
          if (!isBatch(payload)) return;
          setFeed((current) => {
            const next = takeBatch(current, payload);
            if (next.gap && !current.gap) room.send("hallo", {});
            return next;
          });
        });
        room.send("hallo", {});
        room.onError((_code, message) => {
          setError(safeText(message) ?? "Verbindung unterbrochen.");
        });
        room.onLeave(() => {
          setError((current) => current || "Verbindung verloren.");
        });
      })
      .catch((caught: unknown) => {
        if (!handle.cancelled) setError(safeText(caught instanceof Error ? caught.message : "") ?? "Server nicht erreichbar.");
      });
    return () => {
      handle.cancelled = true;
      handle.room?.leave();
      roomRef.current = null;
    };
  }, [join, serverUrl]);

  function updatePrefs(next: UiPreferences): void {
    setPrefs(writePreferences(window.localStorage, next));
  }

  if (panel === "settings") return <SettingsPanel prefs={prefs} onChange={updatePrefs} onBack={() => setPanel("none")} />;
  if (panel === "help") return <HelpPanel prefs={prefs} onBack={() => setPanel("none")} />;

  if (stand?.outcome === "sieg" || stand?.outcome === "niederlage") {
    return <Result stand={stand} prefs={prefs} onHelp={() => setPanel("help")} onSettings={() => setPanel("settings")} />;
  }
  if (stand?.roomPhase === "mission") {
    return (
      <Battle
        stand={stand}
        prefs={prefs}
        gap={feed.gap}
        onHelp={() => setPanel("help")}
        onSettings={() => setPanel("settings")}
        moveMode={moveMode}
        onMoveMode={() => setMoveMode((value) => !value)}
        onCell={(x, y) => {
          if (!moveMode) return;
          sendCommand(roomRef.current, stand, commandNo, { kind: "move", x, y });
          setMoveMode(false);
        }}
        onCommand={(action) => sendCommand(roomRef.current, stand, commandNo, action)}
      />
    );
  }
  if (stand?.roomPhase === "lobby") {
    return (
      <Lobby
        stand={stand}
        prefs={prefs}
        roomId={roomId}
        onPreset={(preset) => roomRef.current?.send("lobby", { kind: "preset", preset })}
        onReady={() => roomRef.current?.send("lobby", { kind: "bereit", ready: true })}
        onStart={() => roomRef.current?.send("lobby", { kind: "start" })}
        onTime={(seconds) => {
          if (stand.coordinator) roomRef.current?.send("lobby", timeWish(seconds));
        }}
        onHelp={() => setPanel("help")}
        onSettings={() => setPanel("settings")}
      />
    );
  }
  return (
    <main className="mission mission-gate" data-menu="1" {...preferenceMarks(prefs)}>
      <form
        className="mission-card"
        data-screen="zugang"
        onSubmit={(event) => {
          event.preventDefault();
          setError("");
          setJoin({ mode: "create", name: name.trim() || "Runner", code: "" });
        }}
      >
        <p className="kicker">Neon Contract</p>
        <h1>Ghost Floor</h1>
        <label>
          Anzeigename
          <input data-field="name" value={name} maxLength={16} onChange={(event) => setName(event.target.value)} />
        </label>
        <label>
          Einladungscode
          <input data-field="code" value={code} onChange={(event) => setCode(event.target.value)} />
        </label>
        <div className="mission-actions">
          <button type="submit" data-action="erstellen" disabled={join !== null && !error}>
            Raum erstellen
          </button>
          <button
            type="button"
            data-action="beitreten"
            disabled={code.trim().length === 0 || (join !== null && !error)}
            onClick={() => {
              setError("");
              setJoin({ mode: "join", name: name.trim() || "Runner", code: code.trim() });
            }}
          >
            Beitreten
          </button>
          <button type="button" data-action="einstellungen" onClick={() => setPanel("settings")}>
            Einstellungen
          </button>
          <button type="button" data-action="hilfe" onClick={() => setPanel("help")}>
            Hilfe
          </button>
        </div>
        <p data-error={error ? "1" : "0"}>{error || (join ? "Verbinden …" : "Privater Raum, vier Plätze.")}</p>
      </form>
    </main>
  );
}

function Lobby({
  stand,
  prefs,
  roomId,
  onPreset,
  onReady,
  onStart,
  onTime,
  onHelp,
  onSettings,
}: {
  stand: Stand;
  prefs: UiPreferences;
  roomId: string;
  onPreset: (preset: "rifle" | "sidearm") => void;
  onReady: () => void;
  onStart: () => void;
  onTime: (seconds: 60 | 90 | 120) => void;
  onHelp: () => void;
  onSettings: () => void;
}) {
  const ready = stand.slots.every((slot) => slot.connected && slot.ready && (slot.preset === "rifle" || slot.preset === "sidearm"));
  return (
    <main
      className="mission"
      data-screen="lobby"
      data-room-phase="lobby"
      data-own-runner={stand.ownRunnerId}
      data-invite={roomId}
      data-ack={stand.ack}
      data-coordinator={stand.coordinator ? "1" : "0"}
      data-notice={stand.notice}
      {...preferenceMarks(prefs)}
    >
      <section className="mission-card" data-panel="briefing">
        <h1>Ghost Floor</h1>
        <p>Auftrag: das Terminal mit zwei Interaktionen zu je 4 AP kopieren. Danach extrahiert sich mindestens ein handlungsfähiger Runner für 1 AP, und kein handlungsfähiger Runner bleibt auf der Karte.</p>
        <p>Niederlage, wenn kein handlungsfähiger Runner mehr im Einsatz ist und der Auftrag offen bleibt, oder nach 24 vollständig beendeten Runden.</p>
        <p>Teamzug: alle Runner handeln, danach die Gegner. Die Crewfrist beträgt {crewSeconds(stand)} Sekunden. Bereit beendet die Phase früher.</p>
        <p>
          Einladung <strong data-invite-code={roomId}>{roomId}</strong>
        </p>
      </section>
      <section className="mission-card">
        <h2>Crew</h2>
        <ul className="mission-slots">
          {stand.slots.map((slot) => (
            <li key={slot.runnerId} data-slot={slot.runnerId} data-preset={slot.preset} data-ready={slot.ready ? "1" : "0"} data-connected={slot.connected ? "1" : "0"}>
              <span className="shape runner-mark">{mark(slot.runnerId)}</span>
              <span>
                <strong>{slot.runnerId}</strong>
                <small>{slot.connected ? "Mensch" : "frei"}</small>
              </span>
              <span>{slot.preset === "sidearm" ? "Pistole" : slot.preset === "rifle" ? "Gewehr" : "—"}</span>
              <span>{slot.ready ? "bereit" : "offen"}</span>
            </li>
          ))}
        </ul>
        <div className="mission-actions" data-panel="zeit">
          {([60, 90, 120] as const).map((seconds) => (
            <button
              key={seconds}
              type="button"
              data-action={`zeit-${seconds}`}
              aria-pressed={crewSeconds(stand) === seconds}
              disabled={!stand.coordinator || crewSeconds(stand) === seconds}
              onClick={() => onTime(seconds)}
            >
              {seconds} s
            </button>
          ))}
        </div>
        <div className="mission-actions" data-panel="ausruestung">
          <button type="button" data-preset="rifle" aria-pressed={ownPreset(stand) === "rifle"} onClick={() => onPreset("rifle")}>
            Gewehr
          </button>
          <button type="button" data-preset="sidearm" aria-pressed={ownPreset(stand) === "sidearm"} onClick={() => onPreset("sidearm")}>
            Pistole
          </button>
          <button type="button" data-action="bereit" onClick={onReady}>
            Bereit
          </button>
          {stand.coordinator ? (
            <button type="button" data-action="start" disabled={!ready} onClick={onStart}>
              Mission starten
            </button>
          ) : (
            <p>Die Koordination startet die Mission.</p>
          )}
        </div>
        <p>Gewehr: Reichweite 10, Magazin 6, zwei Reserve. Pistole: Reichweite 6, Magazin 8, zwei Reserve. Ein Medkit heilt 2 HP. Schuss 3 AP, Treffer 2 HP. Fassung {stand.configRevision ?? 1}.</p>
        <div className="mission-actions">
          <button type="button" data-action="einstellungen" onClick={onSettings}>
            Einstellungen
          </button>
          <button type="button" data-action="hilfe" onClick={onHelp}>
            Hilfe
          </button>
        </div>
        <p data-notice={stand.notice}>{stand.notice}</p>
      </section>
    </main>
  );
}

function Battle({
  stand,
  prefs,
  gap,
  moveMode,
  onMoveMode,
  onCell,
  onCommand,
  onHelp,
  onSettings,
}: {
  stand: Stand;
  prefs: UiPreferences;
  gap: boolean;
  moveMode: boolean;
  onMoveMode: () => void;
  onCell: (x: number, y: number) => void;
  onCommand: (action: { kind: "interact"; targetId: "terminal" } | { kind: "extract" } | { kind: "ready" }) => void;
  onHelp: () => void;
  onSettings: () => void;
}) {
  const own = stand.units.find((unit) => unit.id === stand.ownRunnerId);
  const occupied = new Map(stand.units.filter((unit) => unit.status !== "extracted").map((unit) => [key(unit.x, unit.y), unit]));
  const seen = seenMap(stand);
  const width = seen?.width ?? GHOST_WIDTH;
  const height = seen?.height ?? GHOST_HEIGHT;
  return (
    <main
      className="mission"
      data-screen="einsatz"
      data-room-phase="mission"
      data-phase={stand.phase}
      data-round={stand.round}
      data-copies={stand.copies}
      data-ack={stand.ack}
      data-own-runner={stand.ownRunnerId}
      data-move={moveMode ? "1" : "0"}
      data-gap={gap ? "1" : "0"}
      data-notice={stand.notice}
      {...preferenceMarks(prefs)}
    >
      <div className="mission-map" role="grid" aria-label="Ghost Floor">
        {rows(height).map((y) =>
          columns(width).map((x) => {
            const id = key(x, y);
            const unit = occupied.get(id);
            const kind = seen ? seenKind(seen, id, unit, stand.doorOpen) : cellKind(id, unit, stand.doorOpen);
            return (
              <button key={id} type="button" role="gridcell" data-cell={id} data-kind={kind} className={`cell kind-${kind}`} onClick={() => onCell(x, y)}>
                {cellLabel(kind, unit)}
              </button>
            );
          }),
        )}
      </div>
      <aside className="mission-side">
        <p className="kicker">Runde {stand.round}</p>
        <h1>{phaseLabel(stand.phase)}</h1>
        <p>Kopie {stand.copies}/2 · Tür {stand.doorOpen ? "offen" : "zu"}</p>
        {own ? (
          <p data-own-status={own.status}>
            {own.name} · {own.weapon === "sidearm" ? "Pistole" : "Gewehr"} · HP {own.hp}/{own.maxHp} · AP {own.ap}/8 · Magazin {own.magazine}/{own.magazineSize} + {own.reserveMagazines}
          </p>
        ) : null}
        <div className="mission-actions">
          <button type="button" data-action="bewegen" aria-pressed={moveMode} onClick={onMoveMode} disabled={stand.phase !== "crew"}>
            Bewegen
          </button>
          <button
            type="button"
            data-action="terminal"
            onClick={() => onCommand({ kind: "interact", targetId: "terminal" })}
            disabled={stand.phase !== "crew" || (seen !== null && stand.terminal == null)}
          >
            Terminal kopieren
          </button>
          <button type="button" data-action="extraktion" onClick={() => onCommand({ kind: "extract" })} disabled={stand.phase !== "crew"}>
            Extrahieren
          </button>
          <button type="button" data-action="bereit" onClick={() => onCommand({ kind: "ready" })} disabled={stand.phase !== "crew"}>
            Bereit
          </button>
          <button type="button" data-action="einstellungen" onClick={onSettings}>
            Einstellungen
          </button>
          <button type="button" data-action="hilfe" onClick={onHelp}>
            Hilfe
          </button>
        </div>
        <p>Schritt 1 AP. Terminal 4 AP, orthogonal daneben. Extraktion 1 AP in der Zone am Westrand.</p>
        <p data-notice={stand.notice}>{gap ? "Stand wird erneuert." : stand.notice || "Der Server bestätigt jede Aktion."}</p>
        <ul className="mission-slots">
          {stand.units
            .filter((unit) => unit.team === "crew")
            .map((unit) => (
              <li key={unit.id}>
                <span className="shape runner-mark">{mark(unit.id)}</span>
                {unit.name} · {statusLabel(unit.status)} · HP {unit.hp} · AP {unit.ap}
              </li>
            ))}
        </ul>
      </aside>
    </main>
  );
}

function Result({
  stand,
  prefs,
  onHelp,
  onSettings,
}: {
  stand: Stand;
  prefs: UiPreferences;
  onHelp: () => void;
  onSettings: () => void;
}) {
  const success = stand.outcome === "sieg";
  return (
    <main className="mission mission-gate" data-screen="ergebnis" data-mission-result={stand.outcome} data-result-round={stand.resultRound} data-own-runner={stand.ownRunnerId} data-ack={stand.ack} {...preferenceMarks(prefs)}>
      <section className="mission-card">
        <p className="kicker">Ghost Floor</p>
        <h1>{success ? "Erfolg" : "Niederlage"}</h1>
        <p>Runde {stand.resultRound}</p>
        <p>{reasonText(stand.reason)}</p>
        <p>Dauer: nicht gemessen</p>
        <ul className="mission-slots">
          {stand.units
            .filter((unit) => unit.team === "crew")
            .map((unit) => (
              <li key={unit.id} data-runner={unit.id} data-status={unit.status}>
                <span className="shape runner-mark">{mark(unit.id)}</span>
                {unit.name} · {statusLabel(unit.status)}
              </li>
            ))}
        </ul>
        <div className="mission-actions">
          <button type="button" data-action="einstellungen" onClick={onSettings}>
            Einstellungen
          </button>
          <button type="button" data-action="hilfe" onClick={onHelp}>
            Hilfe
          </button>
        </div>
      </section>
    </main>
  );
}

function sendCommand(
  room: JoinedRoom | null,
  stand: Stand,
  counter: { current: number },
  action: { kind: "move"; x: number; y: number } | { kind: "interact"; targetId: "terminal" } | { kind: "extract" } | { kind: "ready" },
): void {
  if (!room || !stand.ownRunnerId) return;
  counter.current += 1;
  room.send("befehl", {
    protocol: PROTOCOL_VERSION,
    missionId: "ghost-floor",
    commandId: `${stand.ownRunnerId}-${counter.current}`,
    round: stand.round,
    phase: "crew",
    epoch: 1,
    unitId: stand.ownRunnerId,
    action,
  });
}

function isStand(payload: unknown): payload is Stand {
  if (!payload || typeof payload !== "object") return false;
  const value = payload as Partial<Stand>;
  return (
    typeof value.ack === "number" &&
    (value.roomPhase === "lobby" || value.roomPhase === "mission" || value.roomPhase === "ended") &&
    typeof value.ownRunnerId === "string" &&
    typeof value.coordinator === "boolean" &&
    typeof value.round === "number" &&
    typeof value.phase === "string" &&
    typeof value.copies === "number" &&
    typeof value.doorOpen === "boolean" &&
    (value.outcome === "" || value.outcome === "sieg" || value.outcome === "niederlage") &&
    typeof value.reason === "string" &&
    typeof value.resultRound === "number" &&
    typeof value.notice === "string" &&
    Array.isArray(value.slots) &&
    Array.isArray(value.units)
  );
}

function safeText(value: string | undefined): string | null {
  if (!value) return null;
  return /^[\p{L}\p{N} .,:!?()\-]{1,140}$/u.test(value) ? value : null;
}

function ownPreset(stand: Stand): string {
  return stand.slots.find((slot) => slot.runnerId === stand.ownRunnerId)?.preset ?? "";
}

function crewSeconds(stand: Stand): 60 | 90 | 120 {
  if (stand.phaseSeconds === 60 || stand.phaseSeconds === 120) return stand.phaseSeconds;
  return 90;
}

function cellKind(id: string, unit: UnitStand | undefined, doorOpen: boolean): string {
  if (unit?.team === "crew") return "runner";
  if (unit?.team === "enemy") return "enemy";
  if (id === key(GHOST_TERMINAL.x, GHOST_TERMINAL.y)) return "terminal";
  if (id === key(GHOST_DOOR.x, GHOST_DOOR.y)) return doorOpen ? "door-open" : "door";
  if (WALLS.has(id)) return "wall";
  if (EXTRACTION.has(id)) return "extract";
  if (COVER.has(id)) return "cover";
  return "floor";
}

function cellLabel(kind: string, unit: UnitStand | undefined): string {
  if (kind === "runner") return mark(unit?.id ?? "");
  if (kind === "enemy") return "W";
  if (kind === "terminal") return "T";
  if (kind === "door" || kind === "door-open") return "D";
  if (kind === "extract") return "X";
  if (kind === "cover") return "C";
  return "";
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

function reasonText(reason: string): string {
  if (reason === "extraktion") return "Die Daten sind kopiert. Mindestens ein Runner ist draußen. Kein handlungsfähiger Runner bleibt auf der Karte.";
  if (reason === "rundenlimit") return "24 Runden sind vollständig beendet.";
  return "Kein handlungsfähiger Runner ist mehr im Einsatz, und der Auftrag ist offen.";
}

function key(x: number, y: number): string {
  return `${x},${y}`;
}

function seenMap(stand: Stand): SeenMap | null {
  if (!Array.isArray(stand.knownCells)) return null;
  return {
    known: new Set(stand.knownCells.map((cell) => key(cell.x, cell.y))),
    walls: new Set((stand.walls ?? []).map((cell) => key(cell.x, cell.y))),
    cover: new Set((stand.lowCover ?? []).map((cell) => key(cell.x, cell.y))),
    extraction: new Set((stand.extraction ?? []).map((cell) => key(cell.x, cell.y))),
    terminal: stand.terminal ? key(stand.terminal.x, stand.terminal.y) : "",
    door: stand.door ? key(stand.door.x, stand.door.y) : "",
    width: stand.width && stand.width > 0 ? stand.width : GHOST_WIDTH,
    height: stand.height && stand.height > 0 ? stand.height : GHOST_HEIGHT,
  };
}

function seenKind(seen: SeenMap, id: string, unit: UnitStand | undefined, doorOpen: boolean): string {
  if (!seen.known.has(id)) return "fog";
  if (unit?.team === "crew") return "runner";
  if (unit?.team === "enemy") return "enemy";
  if (id === seen.terminal) return "terminal";
  if (id === seen.door) return doorOpen ? "door-open" : "door";
  if (seen.walls.has(id)) return "wall";
  if (seen.extraction.has(id)) return "extract";
  if (seen.cover.has(id)) return "cover";
  return "floor";
}

function isBatch(payload: unknown): payload is TeamBatch {
  if (!payload || typeof payload !== "object") return false;
  const value = payload as Partial<TeamBatch>;
  return typeof value.fromId === "number" && typeof value.toId === "number" && typeof value.targetRevision === "number" && Array.isArray(value.events);
}

interface SeenMap {
  readonly known: ReadonlySet<string>;
  readonly walls: ReadonlySet<string>;
  readonly cover: ReadonlySet<string>;
  readonly extraction: ReadonlySet<string>;
  readonly terminal: string;
  readonly door: string;
  readonly width: number;
  readonly height: number;
}

function columns(length: number): number[] {
  return Array.from({ length }, (_item, index) => index);
}

function rows(length: number): number[] {
  return Array.from({ length }, (_item, index) => index);
}
