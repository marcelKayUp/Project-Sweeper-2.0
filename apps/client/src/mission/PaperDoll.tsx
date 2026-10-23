import { useRef, useState } from "react";
import { bodyFromCounts, PACK_CELLS, PACK_COLUMNS, type GearPost, type InventoryPlace, type PackFill, type PieceKind, type RunnerBody } from "@neon/sim";
import "./inventory.css";

interface GearStand {
  rifle: number;
  sidearm: number;
  rifleMagazines: number;
  sidearmMagazines: number;
  medkits: number;
  body?: RunnerBody;
}

interface LagerStand {
  rifle: number;
  sidearm: number;
  rifleMagazines: number;
  sidearmMagazines: number;
  medkits: number;
}

const STASH: readonly { readonly post: GearPost; readonly label: string }[] = [
  { post: "rifle", label: "Gewehr" },
  { post: "sidearm", label: "Pistole" },
  { post: "rifleMagazines", label: "Gewehrmagazin" },
  { post: "sidearmMagazines", label: "Pistolenmagazin" },
  { post: "medkits", label: "Medkit" },
];

const NAMES: Record<string, { readonly label: string; readonly accent: string; readonly hair: "short" | "crop" | "long" | "spike" }> = {
  kite: { label: "Kite", accent: "#9ecbff", hair: "short" },
  voss: { label: "Voss", accent: "#e7b15a", hair: "crop" },
  nera: { label: "Nera", accent: "#e7a0d4", hair: "long" },
  sol: { label: "Sol", accent: "#b9a6ff", hair: "spike" },
};

export function PaperDoll({
  runnerId,
  label,
  gear,
  lager,
  open,
  notice,
  onMove,
  stashLabel = "Gemeinsames Lager",
}: {
  runnerId: string;
  label?: string;
  gear: GearStand;
  lager: LagerStand;
  open: boolean;
  notice: string;
  onMove: (von: InventoryPlace, nach: InventoryPlace) => void;
  stashLabel?: string;
}) {
  const body = gear.body ?? bodyFromCounts(gear);
  const drag = useRef<InventoryPlace | null>(null);
  const [selected, setSelected] = useState<InventoryPlace | null>(null);
  if (!body) return <p className="doll-note">Die Belegung dieses Runners fehlt.</p>;
  const worn = body;
  const look = NAMES[runnerId] ?? { label: runnerId || "Runner", accent: "#d5deea", hair: "short" as const };
  const title = label?.trim() || look.label;
  const rifleWorn = body.hands.left === "rifle" && body.hands.right === "rifle";
  const pistolHand = body.hands.right === "sidearm" ? "right" : body.hands.left === "sidearm" ? "left" : "";
  const selectedKind = selected ? kindAt(body, selected, lager) : null;

  function send(nach: InventoryPlace) {
    if (!open || !selected) return;
    onMove(selected, nach);
  }

  function begin(place: InventoryPlace) {
    drag.current = place;
    setSelected(place);
  }

  function finish(nach: InventoryPlace) {
    const von = drag.current;
    drag.current = null;
    if (!open || !von) return;
    onMove(von, nach);
  }

  function finishHand(hand: "left" | "right") {
    const von = drag.current;
    const kind = von ? kindAt(worn, von, lager) : null;
    finish(kind === "rifle" ? { area: "hands" } : { area: "hand", hand });
  }

  return (
    <section
      className="doll"
      data-doll={runnerId || "keiner"}
      data-doll-open={open ? "1" : "0"}
      data-worn-rifle={rifleWorn ? "1" : "0"}
      data-worn-sidearm={pistolHand}
      data-worn-medkit={body.belt === "medkit" ? "1" : "0"}
    >
      <h2>Inventar {title}</h2>
      <div className="doll-stage">
        <HandSlot
          title="Rechte Hand"
          hand="right"
          body={body}
          open={open}
          selected={selected}
          onSelect={begin}
          onDrop={() => finishHand("right")}
        />
        <div className="doll-figure" data-figure="silhouette" data-runner={runnerId}>
          <Silhouette name={look.label} accent={look.accent} hair={look.hair} />
          {rifleWorn ? <Worn place={{ area: "hands" }} kind="rifle" label="Gewehr" className="doll-worn-rifle" open={open} selected={selected} onSelect={begin} /> : null}
          {pistolHand === "right" ? <Worn place={{ area: "hand", hand: "right" }} kind="sidearm" label="Pistole" className="doll-worn-pistol-right" open={open} selected={selected} onSelect={begin} /> : null}
          {pistolHand === "left" ? <Worn place={{ area: "hand", hand: "left" }} kind="sidearm" label="Pistole" className="doll-worn-pistol-left" open={open} selected={selected} onSelect={begin} /> : null}
          {body.belt === "medkit" ? <Worn place={{ area: "belt" }} kind="medkit" label="Medkit" className="doll-worn-medkit" open={open} selected={selected} onSelect={begin} /> : null}
        </div>
        <HandSlot
          title="Linke Hand"
          hand="left"
          body={body}
          open={open}
          selected={selected}
          onSelect={begin}
          onDrop={() => finishHand("left")}
        />
        <div
          className="doll-slot doll-hands"
          data-drop="hands"
          onDragOver={(event) => allow(event, open)}
          onDrop={(event) => {
            event.preventDefault();
            finish({ area: "hands" });
          }}
        >
          <p>Beide Hände</p>
          {rifleWorn ? <Token place={{ area: "hands" }} kind="rifle" label="Gewehr" open={open} selected={selected} onSelect={begin} /> : <span>frei für ein Gewehr</span>}
        </div>
      </div>
      <div
        className="doll-slot"
        data-drop="belt"
        onDragOver={(event) => allow(event, open)}
        onDrop={(event) => {
          event.preventDefault();
          finish({ area: "belt" });
        }}
      >
        <p>Gürtel</p>
        {body.belt === "medkit" ? <Token place={{ area: "belt" }} kind="medkit" label="Medkit" open={open} selected={selected} onSelect={begin} /> : <span>frei für ein Medkit</span>}
      </div>
      <div className="doll-pack">
        <p>Rücken</p>
        <div className="doll-grid">
          {packCells(body).map((cell) => (
            <div
              key={cell.index}
              className="doll-cell"
              data-drop={`pack-${cell.index}`}
              data-span={cell.span}
              onDragOver={(event) => allow(event, open)}
              onDrop={(event) => {
                event.preventDefault();
                finish({ area: "pack", index: cell.index });
              }}
            >
              {cell.kind ? (
                <Token place={{ area: "pack", index: cell.index }} kind={cell.kind} label={labelOf(cell.kind)} open={open} selected={selected} onSelect={begin} />
              ) : (
                <span>{cell.index + 1}</span>
              )}
            </div>
          ))}
        </div>
      </div>
      <div className="doll-stash" data-panel="lager" data-lager-open={open ? "1" : "0"} data-lager-rifle={lager.rifle} data-lager-medkits={lager.medkits}>
        <p>{stashLabel}</p>
        <div className="doll-stash-row">
          {STASH.map((row) => (
            <article
              key={row.post}
              data-drop={`stash-${row.post}`}
              data-posten={row.post}
              data-lager-count={lager[row.post]}
              onDragOver={(event) => allow(event, open)}
              onDrop={(event) => {
                event.preventDefault();
                finish({ area: "stash", post: row.post });
              }}
            >
              <p>{row.label}</p>
              {lager[row.post] > 0 ? (
                <Token place={{ area: "stash", post: row.post }} kind={kindOfPost(row.post)} label={`${row.label} ${lager[row.post]}`} open={open} selected={selected} onSelect={begin} />
              ) : (
                <span>leer</span>
              )}
            </article>
          ))}
        </div>
      </div>
      <div className="doll-fallback">
        <p>Ohne Ziehen</p>
        <button type="button" data-move="hands" disabled={!open || !selected} onClick={() => send({ area: "hands" })}>
          Beide Hände
        </button>
        <button type="button" data-move="hand-left" disabled={!open || !selected} onClick={() => send({ area: "hand", hand: "left" })}>
          Linke Hand
        </button>
        <button type="button" data-move="hand-right" disabled={!open || !selected} onClick={() => send({ area: "hand", hand: "right" })}>
          Rechte Hand
        </button>
        <button type="button" data-move="belt" disabled={!open || !selected} onClick={() => send({ area: "belt" })}>
          Gürtel
        </button>
        <button type="button" data-move="pack" disabled={!open || !selected || !selectedKind} onClick={() => selectedKind && send(packDestination(body, selectedKind))}>
          Rücken
        </button>
        <button type="button" data-move="stash" disabled={!open || !selected || !selectedKind} onClick={() => selectedKind && send({ area: "stash", post: postOf(selectedKind) })}>
          Lager
        </button>
      </div>
      <p className="doll-note">Die Modulfigur trägt Gewehr, Pistole und Medkit nicht an Händen und Gürtel. Die Silhouette zeigt das Teil am Anker.</p>
      {notice ? <p className="doll-reject" data-doll-notice={notice}>{notice}</p> : null}
    </section>
  );
}

function HandSlot({
  title,
  hand,
  body,
  open,
  selected,
  onSelect,
  onDrop,
}: {
  title: string;
  hand: "left" | "right";
  body: RunnerBody;
  open: boolean;
  selected: InventoryPlace | null;
  onSelect: (place: InventoryPlace) => void;
  onDrop: () => void;
}) {
  const fill = body.hands[hand];
  const place: InventoryPlace = fill === "rifle" ? { area: "hands" } : { area: "hand", hand };
  return (
    <div
      className="doll-slot"
      data-drop={hand === "left" ? "hand-left" : "hand-right"}
      onDragOver={(event) => allow(event, open)}
      onDrop={(event) => {
        event.preventDefault();
        onDrop();
      }}
    >
      <p>{title}</p>
      {fill === "sidearm" ? <Token place={place} kind="sidearm" label="Pistole" open={open} selected={selected} onSelect={onSelect} /> : null}
      {fill === "rifle" ? <span>Gewehr</span> : null}
      {fill === "empty" ? <span>frei</span> : null}
    </div>
  );
}

function Token({
  place,
  kind,
  label,
  open,
  selected,
  onSelect,
}: {
  place: InventoryPlace;
  kind: PieceKind;
  label: string;
  open: boolean;
  selected: InventoryPlace | null;
  onSelect: (place: InventoryPlace) => void;
}) {
  const pressed = samePlace(selected, place);
  return (
    <div
      className="doll-token"
      draggable={open}
      role="button"
      tabIndex={0}
      aria-pressed={pressed}
      data-piece={kind}
      data-place={placeKey(place)}
      onClick={() => onSelect(place)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect(place);
        }
      }}
      onDragStart={(event) => {
        if (!open) return;
        event.dataTransfer.setData("text/plain", placeKey(place));
        event.dataTransfer.effectAllowed = "move";
        onSelect(place);
      }}
    >
      {label}
    </div>
  );
}

function Worn({
  place,
  kind,
  label,
  className,
  open,
  selected,
  onSelect,
}: {
  place: InventoryPlace;
  kind: PieceKind;
  label: string;
  className: string;
  open: boolean;
  selected: InventoryPlace | null;
  onSelect: (place: InventoryPlace) => void;
}) {
  return (
    <div className={`doll-worn ${className}`} data-anchor={kind}>
      <Token place={place} kind={kind} label={label} open={open} selected={selected} onSelect={onSelect} />
    </div>
  );
}

function Silhouette({ name, accent, hair }: { name: string; accent: string; hair: "short" | "crop" | "long" | "spike" }) {
  return (
    <svg viewBox="0 0 180 280" role="img" aria-label={`Silhouette ${name}`}>
      <title>{`Silhouette ${name}`}</title>
      <path d="M78 214h24l8 58H70z" fill="#3c5166" stroke="#d5deea" />
      <path d="M54 214h24l-8 58H46z" fill="#3c5166" stroke="#d5deea" />
      <path d="M58 92h64l10 86H48z" fill="#5d7388" stroke={accent} strokeWidth="3" />
      <path d="M62 168h56v14H62z" fill="#121820" stroke={accent} />
      <circle cx="90" cy="58" r="28" fill="#d7c3b0" stroke="#d5deea" />
      {hair === "long" ? <path d="M62 50c0-28 56-28 56 0v46H62z" fill={accent} /> : null}
      {hair === "spike" ? <path d="M64 58 L78 18 L90 52 L102 16 L116 58Z" fill={accent} /> : null}
      {hair === "crop" ? <path d="M64 46c6-22 46-22 52 0v8H64z" fill={accent} /> : null}
      {hair === "short" ? <path d="M66 48c8-18 40-18 48 0v6H66z" fill={accent} /> : null}
      <path d="M48 104 L22 168" stroke="#d5deea" strokeWidth="10" strokeLinecap="round" />
      <path d="M132 104 L158 168" stroke="#d5deea" strokeWidth="10" strokeLinecap="round" />
      <circle cx="22" cy="176" r="8" fill="#d7c3b0" stroke={accent} />
      <circle cx="158" cy="176" r="8" fill="#d7c3b0" stroke={accent} />
    </svg>
  );
}

function packCells(body: RunnerBody): { index: number; span: 1 | 2; kind: PieceKind | null }[] {
  const cells: { index: number; span: 1 | 2; kind: PieceKind | null }[] = [];
  for (let index = 0; index < PACK_CELLS; index += 1) {
    const cell = body.pack[index];
    if (cell === "rifleRest") continue;
    cells.push({ index, span: cell === "rifle" ? 2 : 1, kind: kindOfCell(cell ?? "empty") });
  }
  return cells;
}

function kindOfCell(cell: PackFill): PieceKind | null {
  if (cell === "rifle") return "rifle";
  if (cell === "sidearm") return "sidearm";
  if (cell === "rifleMagazine") return "rifleMagazine";
  if (cell === "sidearmMagazine") return "sidearmMagazine";
  return null;
}

function kindAt(body: RunnerBody, place: InventoryPlace, lager: LagerStand): PieceKind | null {
  if (place.area === "hands") return body.hands.left === "rifle" ? "rifle" : null;
  if (place.area === "hand") {
    const fill = body.hands[place.hand];
    if (fill === "sidearm") return "sidearm";
    if (fill === "rifle") return "rifle";
    return null;
  }
  if (place.area === "belt") return body.belt === "medkit" ? "medkit" : null;
  if (place.area === "pack") return kindOfCell(body.pack[place.index] === "rifleRest" ? "rifle" : (body.pack[place.index] ?? "empty"));
  if (lager[place.post] < 1) return null;
  return kindOfPost(place.post);
}

function kindOfPost(post: GearPost): PieceKind {
  if (post === "rifle") return "rifle";
  if (post === "sidearm") return "sidearm";
  if (post === "rifleMagazines") return "rifleMagazine";
  if (post === "sidearmMagazines") return "sidearmMagazine";
  return "medkit";
}

function postOf(kind: PieceKind): GearPost {
  if (kind === "rifle") return "rifle";
  if (kind === "sidearm") return "sidearm";
  if (kind === "rifleMagazine") return "rifleMagazines";
  if (kind === "sidearmMagazine") return "sidearmMagazines";
  return "medkits";
}

function packDestination(body: RunnerBody, kind: PieceKind): InventoryPlace {
  if (kind === "rifle") {
    for (let index = 0; index < PACK_CELLS; index += 1) {
      if (index % PACK_COLUMNS === PACK_COLUMNS - 1) continue;
      if (body.pack[index] === "empty" && body.pack[index + 1] === "empty") return { area: "pack", index };
    }
  }
  const index = body.pack.indexOf("empty");
  return { area: "pack", index: index < 0 ? 0 : index };
}

function allow(event: { preventDefault(): void; dataTransfer: DataTransfer | null }, open: boolean) {
  if (!open) return;
  event.preventDefault();
  if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
}

function samePlace(left: InventoryPlace | null, right: InventoryPlace): boolean {
  if (!left) return false;
  return placeKey(left) === placeKey(right);
}

function placeKey(place: InventoryPlace): string {
  if (place.area === "hand") return `hand:${place.hand}`;
  if (place.area === "pack") return `pack:${place.index}`;
  if (place.area === "stash") return `stash:${place.post}`;
  return place.area;
}

function labelOf(kind: PieceKind): string {
  if (kind === "rifle") return "Gewehr";
  if (kind === "sidearm") return "Pistole";
  if (kind === "rifleMagazine") return "Gewehrmagazin";
  if (kind === "sidearmMagazine") return "Pistolenmagazin";
  return "Medkit";
}
