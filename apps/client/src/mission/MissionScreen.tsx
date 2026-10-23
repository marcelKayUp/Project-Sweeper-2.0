import { useEffect, useRef, useState } from "react";
import { Client } from "@colyseus/sdk";
import { PROTOCOL_VERSION } from "@neon/sim";
import { timeWish } from "./helpCopy.ts";
import { HelpPanel, SettingsPanel } from "./PrepPanels.tsx";
import { preferenceMarks, readPreferences, writePreferences, type UiPreferences } from "./preferences.ts";
import { TacticalView } from "./TacticalView.tsx";
import { createTeamFeed, takeBatch, takeSnapshot, type TeamBatch } from "./teamStore.ts";
import type { MissionAction } from "./tactical.ts";

interface SlotStand {
  runnerId: string;
  name: string;
  preset: string;
  ready: boolean;
  connected: boolean;
  holder?: string;
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
  epoch?: number;
  control?: string;
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
  commandId?: string;
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
  mode: "create" | "join" | "resume";
  name: string;
  code: string;
  token: string;
}

const RESUME_KEY = "neon-mission-resume";

interface JoinedRoom {
  roomId: string;
  reconnectionToken?: string;
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
  const [linked, setLinked] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [prefs, setPrefs] = useState(() => readPreferences(window.localStorage));
  const [panel, setPanel] = useState<"none" | "settings" | "help">("none");
  const roomRef = useRef<JoinedRoom | null>(null);
  const releaseRef = useRef(true);
  const commandNo = useRef(0);
  if (pendingId && stand?.commandId === pendingId) setPendingId(null);

  useEffect(() => {
    if (!join) return;
    const handle: { cancelled: boolean; room: JoinedRoom | null } = { cancelled: false, room: null };
    const client = new Client(serverUrl);
    const keepReservation = () => {
      releaseRef.current = false;
    };
    window.addEventListener("pagehide", keepReservation);
    window.addEventListener("beforeunload", keepReservation);
    const pending =
      join.mode === "resume"
        ? client.reconnect(join.token)
        : join.mode === "create"
          ? client.create("mission", createOptions(join.name))
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
        writeToken(room.reconnectionToken);
        setLinked(true);
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
          setLinked(false);
          setPendingId(null);
          setError((current) => current || "Verbindung verloren.");
        });
      })
      .catch((caught: unknown) => {
        if (!handle.cancelled) setError(safeText(caught instanceof Error ? caught.message : "") ?? "Server nicht erreichbar.");
      });
    return () => {
      window.removeEventListener("pagehide", keepReservation);
      window.removeEventListener("beforeunload", keepReservation);
      handle.cancelled = true;
      setLinked(false);
      if (releaseRef.current) handle.room?.leave();
      releaseRef.current = true;
      roomRef.current = null;
    };
  }, [join, serverUrl]);

  function issue(action: MissionAction): void {
    const room = roomRef.current;
    if (!room || !stand?.ownRunnerId || pendingId || !linked || stand.control === "bot") return;
    commandNo.current += 1;
    const commandId = `${stand.ownRunnerId}-${commandNo.current}`;
    const epoch = typeof stand.epoch === "number" && stand.epoch >= 1 ? stand.epoch : 1;
    setPendingId(commandId);
    room.send("befehl", {
      protocol: PROTOCOL_VERSION,
      missionId: "ghost-floor",
      commandId,
      round: stand.round,
      phase: "crew",
      epoch,
      unitId: stand.ownRunnerId,
      action,
    });
  }

  function retry(): void {
    const token = readToken();
    if (!token) return;
    releaseRef.current = false;
    setError("");
    setJoin({ mode: "resume", name: name.trim() || "Runner", code: "", token });
  }

  function leaveToGate(): void {
    releaseRef.current = true;
    clearToken();
    setJoin(null);
    setStand(null);
    setPendingId(null);
    setMoveMode(false);
    setError("");
  }

  function updatePrefs(next: UiPreferences): void {
    setPrefs(writePreferences(window.localStorage, next));
  }

  if (panel === "settings") return <SettingsPanel prefs={prefs} onChange={updatePrefs} onBack={() => setPanel("none")} />;
  if (panel === "help") return <HelpPanel prefs={prefs} onBack={() => setPanel("none")} />;

  if (stand?.outcome === "sieg" || stand?.outcome === "niederlage") {
    return <Result stand={stand} prefs={prefs} onHelp={() => setPanel("help")} onSettings={() => setPanel("settings")} onLeave={leaveToGate} />;
  }
  if (stand?.roomPhase === "mission") {
    return (
      <TacticalView
        payload={stand}
        prefs={prefs}
        gap={feed.gap}
        linked={linked}
        pending={pendingId !== null}
        held={stand.control === "bot"}
        linkNote={linkNote(linked, stand.control, error)}
        moveMode={moveMode}
        onMoveMode={() => setMoveMode((value) => !value)}
        onCommand={(action) => {
          issue(action);
          if (action.kind === "move") setMoveMode(false);
        }}
        onRetry={!linked && readToken() ? retry : undefined}
        onHelp={() => setPanel("help")}
        onSettings={() => setPanel("settings")}
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
        onBot={() => roomRef.current?.send("lobby", { kind: "bot" })}
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
          setJoin({ mode: "create", name: name.trim() || "Runner", code: "", token: "" });
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
              setJoin({ mode: "join", name: name.trim() || "Runner", code: code.trim(), token: "" });
            }}
          >
            Beitreten
          </button>
          {readToken() ? (
            <button
              type="button"
              data-action="erneut"
              disabled={join !== null && !error}
              onClick={() => {
                setError("");
                setJoin({ mode: "resume", name: name.trim() || "Runner", code: "", token: readToken() ?? "" });
              }}
            >
              Wieder aufnehmen
            </button>
          ) : null}
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
  onBot,
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
  onBot: () => void;
  onTime: (seconds: 60 | 90 | 120) => void;
  onHelp: () => void;
  onSettings: () => void;
}) {
  const ready = stand.slots.every((slot) => slotPresent(slot) && slot.ready && (slot.preset === "rifle" || slot.preset === "sidearm"));
  const openSlot = stand.slots.some((slot) => !slotPresent(slot));
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
            <li key={slot.runnerId} data-slot={slot.runnerId} data-preset={slot.preset} data-ready={slot.ready ? "1" : "0"} data-connected={slot.connected ? "1" : "0"} data-holder={slot.holder ?? "offen"}>
              <span className="shape runner-mark">{mark(slot.runnerId)}</span>
              <span>
                <strong>{slot.runnerId}</strong>
                <small>{slotLabel(slot)}</small>
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
            <button type="button" data-action="bot" disabled={!openSlot} onClick={onBot}>
              Bot einsetzen
            </button>
          ) : null}
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

function Result({
  stand,
  prefs,
  onHelp,
  onSettings,
  onLeave,
}: {
  stand: Stand;
  prefs: UiPreferences;
  onHelp: () => void;
  onSettings: () => void;
  onLeave: () => void;
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
          <button type="button" data-action="zur-lobby" onClick={onLeave}>
            Zum Zugang
          </button>
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

function createOptions(name: string): { name: string; seed?: number } {
  const seed = querySeed();
  return seed === null ? { name } : { name, seed };
}

function querySeed(): number | null {
  const raw = new URLSearchParams(window.location.search).get("seed");
  if (raw === null) return null;
  if (!/^\d{1,3}$/.test(raw)) return null;
  const seed = Number(raw);
  return seed >= 1 && seed <= 100 ? seed : null;
}

function slotPresent(slot: SlotStand): boolean {
  return slot.holder === "bot" || slot.connected;
}

function slotLabel(slot: SlotStand): string {
  if (slot.holder === "bot") return "Bot";
  if (slot.holder === "reserviert") return "reserviert";
  if (slot.holder === "human" || slot.connected) return "Mensch";
  return "frei";
}

function linkNote(linked: boolean, control: string | undefined, error: string): string {
  if (control === "bot") return "Der Bot hält den Runner bis zur nächsten Crewphase.";
  if (!linked) return error || "Verbindung verloren.";
  return "";
}

function readToken(): string | null {
  try {
    const value = sessionStorage.getItem(RESUME_KEY);
    return value && value.includes(":") ? value : null;
  } catch {
    return null;
  }
}

function writeToken(token: string | undefined) {
  if (!token || !token.includes(":")) return;
  try {
    sessionStorage.setItem(RESUME_KEY, token);
  } catch {
    // Ein Neuladen startet dann neu.
  }
}

function clearToken() {
  try {
    sessionStorage.removeItem(RESUME_KEY);
  } catch {
    // Der Speicher ist gesperrt.
  }
}

function ownPreset(stand: Stand): string {
  return stand.slots.find((slot) => slot.runnerId === stand.ownRunnerId)?.preset ?? "";
}

function crewSeconds(stand: Stand): 60 | 90 | 120 {
  if (stand.phaseSeconds === 60 || stand.phaseSeconds === 120) return stand.phaseSeconds;
  return 90;
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

function reasonText(reason: string): string {
  if (reason === "extraktion") return "Die Daten sind kopiert. Mindestens ein Runner ist draußen. Kein handlungsfähiger Runner bleibt auf der Karte.";
  if (reason === "rundenlimit") return "24 Runden sind vollständig beendet.";
  return "Kein handlungsfähiger Runner ist mehr im Einsatz, und der Auftrag ist offen.";
}

function isBatch(payload: unknown): payload is TeamBatch {
  if (!payload || typeof payload !== "object") return false;
  const value = payload as Partial<TeamBatch>;
  return typeof value.fromId === "number" && typeof value.toId === "number" && typeof value.targetRevision === "number" && Array.isArray(value.events);
}

