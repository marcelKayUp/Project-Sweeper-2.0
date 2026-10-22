import { useEffect, useRef, useState } from "react";
import { Client } from "@colyseus/sdk";
import { actionAp, CREW_AP, EXTRACT_AP, INTERACT_AP, type Cell, type Direction } from "@neon/sim";
import { mountIsoBoard, type IsoBoardView } from "../iso/mountIsoBoard.ts";
import { sightBoard } from "../iso/sightBoard.ts";
import {
  readSightStand,
  shotLine,
  sightAim,
  sightEnd,
  sightExtract,
  sightHeal,
  sightInteract,
  sightMove,
  sightOverwatch,
  sightPath,
  sightReload,
  sightReset,
  sightShoot,
  type SightFamily,
  type SightStand,
  type SightUnit,
  type SightWishBody,
} from "./sightStand.ts";

const TOKEN_KEY = "neon-sicht-token";
const FAMILIES: readonly { value: SightFamily; label: string }[] = [
  { value: "office", label: "Büro" },
  { value: "laboratory", label: "Labor" },
  { value: "factory", label: "Fabrik" },
];
const STEPS: Readonly<Record<string, Cell>> = {
  ArrowUp: { x: 0, y: -1 },
  KeyW: { x: 0, y: -1 },
  ArrowRight: { x: 1, y: 0 },
  KeyD: { x: 1, y: 0 },
  ArrowDown: { x: 0, y: 1 },
  KeyS: { x: 0, y: 1 },
  ArrowLeft: { x: -1, y: 0 },
  KeyA: { x: -1, y: 0 },
};

interface Seat {
  seed: number;
  family: SightFamily;
  nonce: number;
}

interface SightSocket {
  reconnectionToken: string;
  leave: (consented?: boolean) => void;
  send: (type: string, payload?: unknown) => void;
  onMessage: (type: string, handler: (payload: unknown) => void) => void;
  onError: (handler: (code: number, message?: string) => void) => void;
  onLeave: (handler: (code: number) => void) => void;
  onReconnect: (handler: () => void) => void;
}

interface PendingWish {
  id: string;
  body: SightWishBody;
  resent: boolean;
}

export function SightScreen() {
  const serverUrl = new URLSearchParams(window.location.search).get("server") ?? "ws://127.0.0.1:2567";
  const hostRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<IsoBoardView | null>(null);
  const standRef = useRef<SightStand | null>(null);
  const roomRef = useRef<SightSocket | null>(null);
  const pendingRef = useRef<PendingWish | null>(null);
  const connectedRef = useRef(false);
  const selectedRef = useRef("");
  const targetRef = useRef("");
  const chooseRef = useRef<(cell: Cell) => void>(() => {});
  const adoptRef = useRef<(payload: unknown) => void>(() => {});
  const routeRef = useRef<{ id: string; cells: Cell[] } | null>(null);
  const seenStand = useRef<SightStand | null>(null);
  const [seat, setSeat] = useState(startingSeat);
  const [draftSeed, setDraftSeed] = useState(String(seat.seed));
  const [draftFamily, setDraftFamily] = useState(seat.family);
  const [stand, setStand] = useState<SightStand | null>(null);
  const [selected, setSelected] = useState("");
  const [target, setTarget] = useState("");
  const [notice, setNotice] = useState("");
  const [status, setStatus] = useState("Verbinde mit dem Server.");
  const [busy, setBusy] = useState(false);
  const [connected, setConnected] = useState(false);
  const ready = stand !== null && connected && !busy;
  const selectedUnit = stand?.units.find((unit) => unit.id === selected) ?? null;
  const targetUnit = stand?.units.find((unit) => unit.id === target && unit.team === "enemy") ?? null;
  const crewPhase = stand?.phase === "crew" && stand.outcome === "";
  const canAct = ready && crewPhase && selectedUnit?.status === "active";
  const doorReady = Boolean(
    canAct && stand?.door && !stand.doorOpen && selectedUnit && adjacent(selectedUnit, stand.door) && selectedUnit.ap >= INTERACT_AP,
  );
  const terminalReady = Boolean(
    canAct &&
      stand?.terminal &&
      stand.copies < 2 &&
      selectedUnit &&
      adjacent(selectedUnit, stand.terminal) &&
      selectedUnit.ap >= INTERACT_AP,
  );
  const extractReady = Boolean(
    canAct &&
      stand &&
      selectedUnit &&
      stand.copies >= 2 &&
      stand.extraction.some((cell) => cell.x === selectedUnit.x && cell.y === selectedUnit.y) &&
      selectedUnit.ap >= EXTRACT_AP,
  );
  const heldRound = selectedUnit?.overwatch ? 1 : 0;
  const reloadReady = Boolean(
    canAct &&
      selectedUnit &&
      selectedUnit.magazine + heldRound < selectedUnit.magazineSize &&
      selectedUnit.reserveMagazines > 0 &&
      selectedUnit.ap >= actionAp("reload"),
  );
  const shootReady = Boolean(
    canAct &&
      targetUnit?.status === "active" &&
      selectedUnit &&
      selectedUnit.magazine + heldRound > 0 &&
      selectedUnit.ap >= actionAp("shot"),
  );
  const aimReady = Boolean(canAct && selectedUnit && !selectedUnit.aiming && selectedUnit.ap >= actionAp("aim"));
  const overwatchReady = Boolean(
    canAct && selectedUnit && !selectedUnit.overwatch && selectedUnit.magazine > 0 && selectedUnit.ap >= actionAp("overwatch"),
  );
  const patient = selectedUnit && stand ? healPatient(stand, selectedUnit) : null;
  const healReady = Boolean(canAct && patient);
  connectedRef.current = connected;

  function select(unitId: string) {
    selectedRef.current = unitId;
    setSelected(unitId);
  }

  function aimAt(unitId: string) {
    targetRef.current = unitId;
    setTarget(unitId);
  }

  function sendWish(build: (commandId: string) => SightWishBody) {
    const room = roomRef.current;
    if (!room || !standRef.current || !connectedRef.current || pendingRef.current) return;
    const commandId = crypto.randomUUID();
    const body = build(commandId);
    pendingRef.current = { id: commandId, body, resent: false };
    setBusy(true);
    room.send("befehl", body);
  }

  adoptRef.current = (payload) => {
    const next = readSightStand(payload);
    if (!next) {
      pendingRef.current = null;
      setBusy(false);
      setStatus("Antwort ist ungültig.");
      return;
    }
    standRef.current = next;
    setStand(next);
    setNotice(next.notice);
    setStatus("");
    connectedRef.current = true;
    setConnected(true);
    const nextSelected = keepCrew(next, selectedRef.current);
    selectedRef.current = nextSelected;
    setSelected(nextSelected);
    if (!next.units.some((unit) => unit.id === targetRef.current && unit.team === "enemy")) {
      targetRef.current = "";
      setTarget("");
    }
    const pending = pendingRef.current;
    if (!pending) return;
    if (next.commandId === pending.id) {
      pendingRef.current = null;
      setBusy(false);
      return;
    }
    if (next.commandId === "" && !pending.resent) {
      pending.resent = true;
      roomRef.current?.send("befehl", pending.body);
    }
  };

  chooseRef.current = (cell) => {
    const current = standRef.current;
    if (!current || !connectedRef.current || pendingRef.current) return;
    if (current.phase !== "crew" || current.outcome !== "") return;
    const crew = current.units.find((unit) => unit.team === "crew" && unit.status !== "extracted" && sameCell(unit, cell));
    if (crew) {
      select(crew.id);
      setNotice("");
      return;
    }
    const enemy = current.units.find((unit) => unit.team === "enemy" && sameCell(unit, cell));
    if (enemy) {
      aimAt(enemy.id);
      setNotice("");
      return;
    }
    const path = sightPath(current, selectedRef.current, cell);
    if (!path) {
      setNotice("Feld ist nicht erreichbar.");
      return;
    }
    if (path.length === 0) return;
    routeRef.current = { id: selectedRef.current, cells: path.map((step) => ({ x: step.x, y: step.y })) };
    sendWish((commandId) => sightMove(commandId, selectedRef.current, path));
  };

  function stepToward(x: number, y: number) {
    const current = standRef.current;
    const unit = current?.units.find((item) => item.id === selectedRef.current);
    if (!unit) return;
    sendWish((commandId) => sightMove(commandId, unit.id, [{ x: unit.x + x, y: unit.y + y }]));
  }

  function openOther() {
    const seed = readSeed(draftSeed);
    if (seed === null) {
      setNotice("Seed ist ungültig.");
      return;
    }
    if (standRef.current && seed === standRef.current.seed && draftFamily === standRef.current.family) {
      sendWish(sightReset);
      return;
    }
    const params = new URLSearchParams(window.location.search);
    params.set("stueck", "sicht");
    params.set("seed", String(seed));
    params.set("family", draftFamily);
    window.history.replaceState(null, "", `${window.location.pathname}?${params.toString()}`);
    clearToken();
    setSeat((current) => ({ seed, family: draftFamily, nonce: current.nonce + 1 }));
  }

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const view = mountIsoBoard(host, (cell) => chooseRef.current(cell));
    viewRef.current = view;
    return () => {
      view.dispose();
      if (viewRef.current === view) viewRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!stand) {
      seenStand.current = null;
      routeRef.current = null;
      viewRef.current?.clear();
      return;
    }
    const standChanged = stand !== seenStand.current;
    seenStand.current = stand;
    const pending = routeRef.current;
    let route: { id: string; cells: Cell[] } | null = null;
    if (pending && standChanged) {
      const unit = stand.units.find((item) => item.id === pending.id);
      const walked = unit ? routePrefix(pending.cells, unit) : null;
      if (walked && unit && (unit.status === "active" || unit.status === "down")) {
        route = { id: pending.id, cells: walked };
      }
      routeRef.current = null;
    }
    viewRef.current?.sync(sightBoard(stand, selected, target, route));
  }, [stand, selected, target]);

  useEffect(() => {
    window.clearTimeout(releaseTimer);
    const key = roomKey(serverUrl, seat.seed, seat.family, seat.nonce);
    const handle = { cancelled: false, reload: false };
    viewRef.current?.clear();
    standRef.current = null;
    pendingRef.current = null;
    connectedRef.current = false;
    setStand(null);
    setConnected(false);
    setBusy(false);
    setNotice("");
    setStatus("Verbinde mit dem Server.");
    const onHide = () => {
      handle.reload = true;
      window.clearTimeout(releaseTimer);
    };
    window.addEventListener("pagehide", onHide);
    void roomFor(key, serverUrl, seat.seed, seat.family)
      .then((room) => {
        if (handle.cancelled) return;
        roomRef.current = room;
        writeToken(room.reconnectionToken);
        room.onReconnect(() => {
          queueMicrotask(() => {
            if (!handle.cancelled) writeToken(room.reconnectionToken);
          });
        });
        room.onMessage("stand", (payload) => {
          if (!handle.cancelled) adoptRef.current(payload);
        });
        room.onError((_code, message) => {
          if (!handle.cancelled) setStatus(safeText(message) ?? "Verbindung unterbrochen.");
        });
        room.onLeave(() => {
          if (handle.cancelled || handle.reload) return;
          connectedRef.current = false;
          setConnected(false);
          pendingRef.current = null;
          setBusy(false);
          roomRef.current = null;
          setStatus("Verbindung verloren.");
        });
        room.send("hallo", {});
      })
      .catch((caught: unknown) => {
        if (handle.cancelled) return;
        rooms.delete(key);
        const message = caught instanceof Error ? caught.message : "";
        setStatus(safeText(message) ?? "Server nicht erreichbar.");
      });
    return () => {
      window.removeEventListener("pagehide", onHide);
      handle.cancelled = true;
      roomRef.current = null;
      connectedRef.current = false;
      if (handle.reload) return;
      const token = readToken();
      releaseTimer = window.setTimeout(() => releaseRoom(key, token), 50);
    };
  }, [serverUrl, seat.seed, seat.family, seat.nonce]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const focus = event.target;
      if (focus instanceof HTMLInputElement || focus instanceof HTMLSelectElement || focus instanceof HTMLTextAreaElement) return;
      if (event.code === "KeyQ") {
        event.preventDefault();
        viewRef.current?.turn(-1);
        return;
      }
      if (event.code === "KeyE") {
        event.preventDefault();
        viewRef.current?.turn(1);
        return;
      }
      const step = STEPS[event.code];
      if (!step) return;
      event.preventDefault();
      const current = standRef.current;
      const unit = current?.units.find((item) => item.id === selectedRef.current);
      if (!unit) return;
      sendWish((commandId) => sightMove(commandId, unit.id, [{ x: unit.x + step.x, y: unit.y + step.y }]));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const line = busy ? "Warte auf den Server." : status || notice;
  const aim = stand && selected && target ? shotLine(stand, selected, target) : "";
  const crew = stand?.units.filter((unit) => unit.team === "crew") ?? [];
  const enemies = stand?.units.filter((unit) => unit.team === "enemy") ?? [];
  const building = stand
    ? `${labelOf(stand.family)} · ${methodLabel(stand.method)} · ${stand.rooms} Räume · Seed ${stand.seed}`
    : "Karte —";

  return (
    <div className="frame">
      <div id="iso-root" ref={hostRef} />
      <aside className="iso-panel sight-panel">
        <strong>{selectedUnit?.name ?? "Sicht"}</strong>
        <p>{building}</p>
        <p>{stand ? `Runde ${stand.round} · Kopien ${stand.copies} von 2` : "Runde —"}</p>
        <p>{stand ? assignment(stand) : "Auftrag —"}</p>
        <p>{selectedUnit ? `Feld ${selectedUnit.x}, ${selectedUnit.y}` : "Feld —"}</p>
        <p>{selectedUnit ? `AP ${selectedUnit.ap} von ${CREW_AP}` : "AP —"}</p>
        <p>{selectedUnit ? `Leben ${selectedUnit.hp} von ${selectedUnit.maxHp}` : "Leben —"}</p>
        <p>{selectedUnit ? `Magazin ${selectedUnit.magazine} von ${selectedUnit.magazineSize}${selectedUnit.overwatch ? " · 1 reserviert" : ""}` : "Magazin —"}</p>
        <p>{selectedUnit ? `Medkit ${selectedUnit.medkits}` : "Medkit —"}</p>
        <p>{selectedUnit?.aiming ? "Gezielt." : selectedUnit?.overwatch ? `Overwatch ${directionName(selectedUnit.overwatch)}.` : "Keine Haltung."}</p>
        <p>{stand ? `Bekannt ${stand.known.length} · Sicht ${stand.visible.length}` : "Bekannt —"}</p>
        <p>{stand ? coverText(stand, selectedUnit) : "Deckung —"}</p>
        <p>{stand?.outcome === "sieg" ? "Sieg" : stand?.outcome === "niederlage" ? "Niederlage" : "Laufend"}</p>
        <p className="iso-shot">{aim}</p>
        <p className="iso-notice" role="status">
          {line}
        </p>
        {crew.map((unit) => (
          <button key={unit.id} type="button" aria-pressed={unit.id === selected} disabled={stand === null} onClick={() => select(unit.id)}>
            {unitLine(unit)}
          </button>
        ))}
        {enemies.length === 0 ? <p>Kein Gegner in Sicht.</p> : enemies.map((unit) => (
          <button key={unit.id} type="button" aria-pressed={unit.id === target} disabled={stand === null} onClick={() => aimAt(unit.id)}>
            {unitLine(unit)}
          </button>
        ))}
        <div className="iso-steps">
          <button className="iso-north" type="button" disabled={!canAct} onClick={() => stepToward(0, -1)}>
            Nord
          </button>
          <button className="iso-west" type="button" disabled={!canAct} onClick={() => stepToward(-1, 0)}>
            West
          </button>
          <button className="iso-east" type="button" disabled={!canAct} onClick={() => stepToward(1, 0)}>
            Ost
          </button>
          <button className="iso-south" type="button" disabled={!canAct} onClick={() => stepToward(0, 1)}>
            Süd
          </button>
        </div>
        <div className="iso-camera">
          <button type="button" onClick={() => viewRef.current?.turn(-1)}>
            Kamera links
          </button>
          <button type="button" onClick={() => viewRef.current?.turn(1)}>
            Kamera rechts
          </button>
        </div>
        <button type="button" disabled={!aimReady} onClick={() => selectedUnit && sendWish((commandId) => sightAim(commandId, selectedUnit.id))}>
          Zielen
        </button>
        <button type="button" disabled={!shootReady} onClick={() => selectedUnit && targetUnit && sendWish((commandId) => sightShoot(commandId, selectedUnit.id, targetUnit.id))}>
          Schießen
        </button>
        <button type="button" disabled={!reloadReady} onClick={() => selectedUnit && sendWish((commandId) => sightReload(commandId, selectedUnit.id))}>
          Nachladen
        </button>
        <button type="button" disabled={!healReady} onClick={() => selectedUnit && patient && sendWish((commandId) => sightHeal(commandId, selectedUnit.id, patient.id))}>
          {patient && patient.id !== selectedUnit?.id ? `Medkit · ${patient.name}` : "Medkit"}
        </button>
        {(["n", "e", "s", "w"] as const).map((direction) => (
          <button
            key={direction}
            type="button"
            disabled={!overwatchReady}
            onClick={() => selectedUnit && sendWish((commandId) => sightOverwatch(commandId, selectedUnit.id, direction))}
          >
            Overwatch {directionName(direction)}
          </button>
        ))}
        <button
          type="button"
          disabled={!doorReady}
          onClick={() => {
            const door = standRef.current?.door;
            if (!door || !selectedRef.current) return;
            sendWish((commandId) => sightInteract(commandId, selectedRef.current, door.id));
          }}
        >
          Tür öffnen
        </button>
        <button
          type="button"
          disabled={!terminalReady}
          onClick={() => {
            const terminal = standRef.current?.terminal;
            if (!terminal || !selectedRef.current) return;
            sendWish((commandId) => sightInteract(commandId, selectedRef.current, terminal.id));
          }}
        >
          Terminal hacken
        </button>
        <button type="button" disabled={!extractReady} onClick={() => selectedUnit && sendWish((commandId) => sightExtract(commandId, selectedUnit.id))}>
          Extrahieren
        </button>
        <button type="button" disabled={!canAct} onClick={() => sendWish(sightEnd)}>
          Runde beenden
        </button>
        <button type="button" disabled={!ready} onClick={() => sendWish(sightReset)}>
          Neu
        </button>
        <div className="iso-form">
          <input aria-label="Seed" inputMode="numeric" spellCheck={false} value={draftSeed} onChange={(event) => setDraftSeed(event.target.value)} />
          <select aria-label="Familie" value={draftFamily} onChange={(event) => setDraftFamily(readFamily(event.target.value) ?? "office")}>
            {FAMILIES.map((entry) => (
              <option key={entry.value} value={entry.value}>
                {entry.label}
              </option>
            ))}
          </select>
        </div>
        <button type="button" onClick={openOther}>
          Andere Karte
        </button>
        <p className="iso-hint">Der Server bestätigt jeden Schritt. Pfeile bleiben Himmelsrichtungen. Die gelbe Marke liegt im Norden. Ein Klick wählt Runner oder Gegner, sonst den Weg.</p>
      </aside>
    </div>
  );
}

const rooms = new Map<string, Promise<SightSocket>>();
let releaseTimer = 0;

function startingSeat(): Seat {
  const params = new URLSearchParams(window.location.search);
  return {
    seed: readSeed(params.get("seed")) ?? 42,
    family: readFamily(params.get("family")) ?? "office",
    nonce: 0,
  };
}

function roomKey(url: string, seed: number, family: SightFamily, nonce: number): string {
  return `${url}|${seed}|${family}|${nonce}`;
}

function roomFor(key: string, url: string, seed: number, family: SightFamily): Promise<SightSocket> {
  const existing = rooms.get(key);
  if (existing) return existing;
  const created = openSight(new Client(url), seed, family);
  rooms.set(key, created);
  return created;
}

function releaseRoom(key: string, token: string | null) {
  const pending = rooms.get(key);
  if (!pending) return;
  rooms.delete(key);
  void pending
    .then((room) => {
      if (rooms.has(key)) return;
      if (readToken() === token) clearToken();
      room.leave(true);
    })
    .catch(() => undefined);
}

async function openSight(client: Client, seed: number, family: SightFamily): Promise<SightSocket> {
  const token = readToken();
  if (token) {
    try {
      return (await client.reconnect(token)) as unknown as SightSocket;
    } catch {
      // Der bisherige Sitz ist nicht mehr offen. Ein neuer Raum folgt.
    }
  }
  return (await client.create("sicht", { seed, family })) as unknown as SightSocket;
}

function keepCrew(stand: SightStand, current: string): string {
  const crew = stand.units.filter((unit) => unit.team === "crew" && unit.status === "active");
  if (crew.some((unit) => unit.id === current)) return current;
  return crew[0]?.id ?? "";
}

function unitLine(unit: SightUnit): string {
  if (unit.status === "extracted") return `${unit.name} draußen`;
  if (unit.status === "down") return `${unit.name} kampfunfähig`;
  return `${unit.name} ${unit.hp}/${unit.maxHp} · AP ${unit.ap}`;
}

function labelOf(family: SightFamily): string {
  return FAMILIES.find((entry) => entry.value === family)?.label ?? "Büro";
}

function methodLabel(method: SightStand["method"]): string {
  if (method === "bsp") return "BSP";
  if (method === "graph") return "Graph";
  return "Flur";
}

function assignment(stand: SightStand): string {
  const terminal = stand.terminal ? `Terminal ${stand.terminal.x}, ${stand.terminal.y}` : "Terminal unentdeckt";
  const door = !stand.door ? "Tür unentdeckt" : stand.doorOpen ? "Tür offen" : `Tür zu ${stand.door.x}, ${stand.door.y}`;
  const active = stand.units.filter((unit) => unit.team === "crew" && unit.status === "active").length;
  const outside = stand.units.filter((unit) => unit.team === "crew" && unit.status === "extracted").length;
  if (stand.outcome === "sieg") return "Sieg. Die Kopien sind draußen.";
  if (stand.outcome === "niederlage") return "Niederlage.";
  if (stand.copies < 2) return `${terminal} · ${door} · ${stand.copies === 1 ? "noch eine Kopie" : "noch zwei Kopien"}`;
  return `${terminal} · ${door} · ${outside} draußen · ${active} noch im Einsatz`;
}

function coverText(stand: SightStand, unit: SightUnit | null): string {
  if (stand.cover.length === 0) return "Keine bekannte Deckung.";
  const here = unit ? stand.cover.filter((cover) => cover.x === unit.x && cover.y === unit.y) : [];
  if (here.length > 0) return `Dieses Feld schützt die ${here.map(edgeName).join(" und ")}.`;
  if (!unit) return `Bekannte Deckung ${stand.cover.length}.`;
  const nearest = stand.cover.slice().sort((left, right) => {
    const distance = Math.abs(left.x - unit.x) + Math.abs(left.y - unit.y) - (Math.abs(right.x - unit.x) + Math.abs(right.y - unit.y));
    return distance || left.y - right.y || left.x - right.x;
  })[0];
  if (!nearest) return `Bekannte Deckung ${stand.cover.length}.`;
  return `Nächste Deckung ${nearest.x}, ${nearest.y} schützt die ${edgeName(nearest)}.`;
}

function edgeName(cover: { protects: Direction }): string {
  return `${directionName(cover.protects)}kante`;
}

function directionName(direction: Direction): string {
  if (direction === "n") return "Nord";
  if (direction === "e") return "Ost";
  if (direction === "s") return "Süd";
  return "West";
}

function healPatient(stand: SightStand, actor: SightUnit): SightUnit | null {
  if (actor.status !== "active" || actor.medkits < 1 || actor.ap < actionAp("heal")) return null;
  if (actor.hp < actor.maxHp) return actor;
  const allies = stand.units
    .filter((unit) => unit.team === "crew" && unit.status === "active" && unit.id !== actor.id && unit.hp < unit.maxHp && adjacent(actor, unit))
    .slice()
    .sort((left, right) => (left.id < right.id ? -1 : left.id > right.id ? 1 : 0));
  return allies[0] ?? null;
}

function routePrefix(cells: readonly Cell[], unit: Cell): Cell[] | null {
  const index = cells.findIndex((cell) => cell.x === unit.x && cell.y === unit.y);
  if (index < 0) return null;
  return cells.slice(0, index + 1).map((cell) => ({ x: cell.x, y: cell.y }));
}

function adjacent(from: Cell, to: Cell): boolean {
  return Math.abs(from.x - to.x) + Math.abs(from.y - to.y) === 1;
}

function sameCell(from: Cell, to: Cell): boolean {
  return from.x === to.x && from.y === to.y;
}

function readSeed(value: string | null): number | null {
  if (value === null || !/^\d+$/.test(value)) return null;
  const seed = Number(value);
  if (!Number.isSafeInteger(seed) || seed > 0xffffffff) return null;
  return seed;
}

function readFamily(value: string | null): SightFamily | null {
  if (value === "office" || value === "laboratory" || value === "factory") return value;
  return null;
}

function readToken(): string | null {
  try {
    return sessionStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

function writeToken(token: string) {
  if (!token.includes(":")) return;
  try {
    sessionStorage.setItem(TOKEN_KEY, token);
  } catch {
    // Ein Neuladen startet dann neu.
  }
}

function clearToken() {
  try {
    sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    // Der Speicher ist gesperrt.
  }
}

function safeText(value: string | undefined): string | null {
  if (!value) return null;
  return /^[\p{L}\p{N} .,:!?()\-]{1,140}$/u.test(value) ? value : null;
}
