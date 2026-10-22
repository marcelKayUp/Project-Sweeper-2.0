import { useEffect, useRef, useState } from "react";
import { Client } from "@colyseus/sdk";
import { CREW_AP, flatPath, type Cell, type FlatWalk } from "@neon/sim";
import { mountIsoWalk, type IsoWalkView } from "./mountIsoWalk.ts";
import {
  rasterEnd,
  rasterMove,
  rasterReset,
  readRasterStand,
  walkFromStand,
  type RasterWishBody,
} from "./rasterStand.ts";

const TOKEN_KEY = "neon-raster-token";
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

interface RasterSocket {
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
  body: RasterWishBody;
  resent: boolean;
}

export function IsoWalkScreen() {
  const serverUrl = new URLSearchParams(window.location.search).get("server") ?? "ws://127.0.0.1:2567";
  const hostRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<IsoWalkView | null>(null);
  const walkRef = useRef<FlatWalk | null>(null);
  const roomRef = useRef<RasterSocket | null>(null);
  const pendingRef = useRef<PendingWish | null>(null);
  const connectedRef = useRef(false);
  const chooseRef = useRef<(cell: Cell) => void>(() => {});
  const adoptRef = useRef<(payload: unknown) => void>(() => {});
  const [walk, setWalk] = useState<FlatWalk | null>(null);
  const [notice, setNotice] = useState("");
  const [status, setStatus] = useState("Verbinde mit dem Server.");
  const [busy, setBusy] = useState(false);
  const [connected, setConnected] = useState(false);
  const ready = walk !== null && connected && !busy;
  connectedRef.current = connected;

  adoptRef.current = (payload) => {
    const stand = readRasterStand(payload);
    if (!stand) {
      pendingRef.current = null;
      setBusy(false);
      setStatus("Antwort ist ungültig.");
      return;
    }
    const next = walkFromStand(stand);
    walkRef.current = next;
    setWalk(next);
    setNotice(stand.notice);
    setStatus("");
    connectedRef.current = true;
    setConnected(true);
    const pending = pendingRef.current;
    if (!pending) return;
    if (stand.commandId === pending.id) {
      pendingRef.current = null;
      setBusy(false);
      return;
    }
    if (stand.commandId === "" && !pending.resent) {
      pending.resent = true;
      roomRef.current?.send("befehl", pending.body);
    }
  };

  function sendWish(build: (commandId: string) => RasterWishBody) {
    const room = roomRef.current;
    if (!room || !walkRef.current || !connectedRef.current || pendingRef.current) return;
    const commandId = crypto.randomUUID();
    const body = build(commandId);
    pendingRef.current = { id: commandId, body, resent: false };
    setBusy(true);
    room.send("befehl", body);
  }

  chooseRef.current = (cell) => {
    const current = walkRef.current;
    if (!current || !connectedRef.current || pendingRef.current) return;
    const path = flatPath(current, cell);
    if (!path) {
      setNotice("Feld ist nicht erreichbar.");
      return;
    }
    if (path.length === 0) {
      setNotice("");
      return;
    }
    sendWish((commandId) => rasterMove(commandId, path));
  };

  function stepToward(x: number, y: number) {
    const current = walkRef.current;
    if (!current) return;
    sendWish((commandId) => rasterMove(commandId, [{ x: current.actor.x + x, y: current.actor.y + y }]));
  }

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const view = mountIsoWalk(host, (cell) => chooseRef.current(cell));
    viewRef.current = view;
    return () => {
      view.dispose();
      if (viewRef.current === view) viewRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (walk) viewRef.current?.sync(walk);
  }, [walk]);

  useEffect(() => {
    window.clearTimeout(releaseTimer);
    const handle = { cancelled: false, reload: false };
    const onHide = () => {
      handle.reload = true;
      window.clearTimeout(releaseTimer);
    };
    window.addEventListener("pagehide", onHide);
    void roomFor(serverUrl)
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
        rooms.delete(serverUrl);
        const message = caught instanceof Error ? caught.message : "";
        setStatus(safeText(message) ?? "Server nicht erreichbar.");
      });
    return () => {
      window.removeEventListener("pagehide", onHide);
      handle.cancelled = true;
      roomRef.current = null;
      connectedRef.current = false;
      if (handle.reload) return;
      releaseTimer = window.setTimeout(() => releaseRoom(serverUrl), 50);
    };
  }, [serverUrl]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
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
      const current = walkRef.current;
      if (!current) return;
      sendWish((commandId) => rasterMove(commandId, [{ x: current.actor.x + step.x, y: current.actor.y + step.y }]));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const line = busy ? "Warte auf den Server." : status || notice;

  return (
    <div className="frame">
      <div id="iso-root" ref={hostRef} />
      <aside className="iso-panel">
        <strong>Runner</strong>
        <p>{walk ? `Feld ${walk.actor.x}, ${walk.actor.y}` : "Feld —"}</p>
        <p>{walk ? `Runde ${walk.round}` : "Runde —"}</p>
        <p>{walk ? `AP ${walk.actor.ap} von ${CREW_AP}` : "AP —"}</p>
        <p className="iso-notice" role="status">
          {line}
        </p>
        <div className="iso-steps">
          <button className="iso-north" type="button" disabled={!ready} onClick={() => stepToward(0, -1)}>
            Nord
          </button>
          <button className="iso-west" type="button" disabled={!ready} onClick={() => stepToward(-1, 0)}>
            West
          </button>
          <button className="iso-east" type="button" disabled={!ready} onClick={() => stepToward(1, 0)}>
            Ost
          </button>
          <button className="iso-south" type="button" disabled={!ready} onClick={() => stepToward(0, 1)}>
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
        <button type="button" disabled={!ready} onClick={() => sendWish(rasterEnd)}>
          Runde beenden
        </button>
        <button type="button" disabled={!ready} onClick={() => sendWish(rasterReset)}>
          Neu
        </button>
        <p className="iso-hint">Der Server bestätigt jeden Schritt. Pfeile bleiben Himmelsrichtungen. Die gelbe Marke liegt im Norden.</p>
      </aside>
    </div>
  );
}

const rooms = new Map<string, Promise<RasterSocket>>();
let releaseTimer = 0;

function roomFor(url: string): Promise<RasterSocket> {
  const existing = rooms.get(url);
  if (existing) return existing;
  const created = openRaster(new Client(url));
  rooms.set(url, created);
  return created;
}

function releaseRoom(url: string) {
  const pending = rooms.get(url);
  if (!pending) return;
  rooms.delete(url);
  void pending
    .then((room) => {
      if (rooms.has(url)) return;
      clearToken();
      room.leave();
    })
    .catch(() => undefined);
}

async function openRaster(client: Client): Promise<RasterSocket> {
  const token = readToken();
  if (token) {
    try {
      return (await client.reconnect(token)) as unknown as RasterSocket;
    } catch {
      // Der bisherige Sitz ist nicht mehr offen. Ein neuer Raum folgt.
    }
  }
  return (await client.joinOrCreate("raster")) as unknown as RasterSocket;
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
