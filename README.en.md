# Sweepers

[Deutsch](README.md) · English

Cooperative cyberpunk tactics game for 4–8 players: one runner per person, shared contracts, cover, action points, and, in the long run, a persistent crew.

This is not a commercial project. It is a vibe coder's test bed for probing his own limits and those of the AI, and a casual game for him and his group of friends.

- [Overview](#overview)
- [Game concept](#game-concept)
- [Technical concept](#technical-concept)
- [How to run](#how-to-run)
- [Agents](#agents)
- [Source](#source)

## Overview

**Status, 23 October 2026.** Rule and graphics pieces, a local mission prototype, and a semantic building generator with its own workshop are in place. The headless evidence for the core mission lives in `@neon/sim` and `@neon/bots`: six enemy roles, one mission-oriented crew bot, and versioned replays. The four-player lobby, reconnect, and human acceptance are open. The planning documents remain proposals. See [0030](docs/decisions/0030-gegnerpolicies-und-missionsbot.md).

`http://127.0.0.1:5173/` shows the sitemap from [NAVIGATION.md](docs/NAVIGATION.md) as a checklist. Surfaces that exist are linked. Planned surfaces have no jump. The test mission stays at `?stueck=sicht`. Gate, lobby, and that test mission need the game server. See [0039](docs/decisions/0039-testeinstieg-aus-der-sitemap.md).

GitHub shows these images itself. The test mission and the game server do not run there. Cover, shooting, and action points do not need the game server. GitHub has one captured view of each:

- [Cover](artifacts/pieces/deckung/ours.png)
- [Shooting](artifacts/pieces/schuss/ours.png)
- [Action points](artifacts/pieces/aktionspunkte/ours.png)

GitHub also shows the contact sheets and the terminal preview as images. The accompanying HTML search stays local.

- [Characters](artifacts/asset-inspection/contact-characters.png), [weapons](artifacts/asset-inspection/contact-weapons.png), [components](artifacts/asset-inspection/contact-components.png)
- [Terminals](artifacts/terminals/contact-sheet.png), [workshop image](artifacts/terminals/workshop.png)

## Game concept

**v0.1 "Sweepers – core mission":** four runners on a 20 × 20 map, a shared team turn, AP, cover, sight, shooting, overwatch, hacking, extraction, and reconnect. Two weapons, two enemy types, bots, and simple placeholders. The handmade reference mission is still called Ghost Floor in the planning documents.

**v0.2 "Sweepers – comparison test":** simultaneous planning as a second variant, up to eight runners, a scout drone, a third enemy type, a third weapon, alarm and deletion, one simple injury, and hotjoin by taking over a bot. Both turn models are compared with humans.

This split is a scope recommendation. The source concept already names the drone, three enemy types, and both turn models for its slice. They stay in the plan and are integrated after the first playable intermediate state.

- **Turn model:** the team turn comes first. The final choice follows the A/B comparison.
- **Player count:** four for the first playable state. Eight is the mandatory later validation step.
- **Rule complexity:** orthographic 3D tactical view, four movement directions, shared team sight, a small selection of weapons and enemies. Height levels are map data. A height bonus is not included.
- **Mission length:** the first core mission is provisionally 15–30 minutes. The full comparison test checks the product goal of 30–60 minutes.
- **Hotjoin:** first take over an existing bot runner. A new reinforcement runner at a safe entry point follows later.
- **Persistence:** mission and replays first. Character development and the safehouse follow a positive tactics test.
- **Generators:** the tactical problem first, then the environment. Data theft in a building is the first generator stage. Streets, WFC, and further mission families follow later. See [0008](docs/decisions/0008-hierarchischer-missionsgenerator.md). AI text and image templates are produced outside the run.

[MVP.md](docs/MVP.md) defines the first playable state v0.1, the end-to-end player path, and the shared acceptance:

- [15 system modules](docs/MVP_MODULE.md)
- [23 screens and views](docs/MVP_SCREENS.md)
- [13 generator and tool modules](docs/MVP_GENERATOREN.md)

The first MVP needs 13 of the planned views plus the mission menu, mostly as small panels. The skill list, level-up, and city map have a documented minimum and are not pulled into v0.1 by that. "MVP" here means the four-player tactics test. The full 4–8 player goal is checked in v0.2, and the first persistent campaign loop follows in M6. All described evidence is still open.

The early path remains main menu, lobby, runner, equipment, briefing, mission, result. The [tiered character development](docs/CHARAKTERENTWICKLUNG.md) belongs to the later M6 planning. Numbers and concrete rules remain open.

[Organization landscape version 8](docs/ORGANISATIONEN.md) describes competitive structures for later stories. The [catalog](docs/ORGANISATIONSKATALOG.md) provides 70 actor profiles. Concrete incidents, people, and places appear only from a scenario instance. See [0020](docs/decisions/0020-organisationslandschaft-und-lokale-konflikte.md).

Outside explicitly made decisions, the documents remain drafts. Existing implementations and tests demonstrate their own slice.

## Technical concept

A TypeScript rules core runs independently of graphics and networking. The server executes it as the authority. Babylon.js presents the tactical view, React the interface, and Colyseus connects the players. The camera is orthographic, tilted by 45 degrees, and rotates in 90-degree steps. Vitest checks rules and replays, Playwright browser flows. The continuation is the playable form of `?stueck=raster` and `?stueck=sicht`. See [0013](docs/decisions/0013-isometrische-fortsetzung.md), [0024](docs/decisions/0024-ein-start-fuer-die-testmission.md), and [0007](docs/decisions/0007-babylon-taktikansicht.md).

The packages are still named `@neon/…`. That is the workspace name. The game is called Sweepers.

- [`@neon/sim`](packages/sim): deterministic rules. No graphics and no networking.
- [`@neon/bots`](packages/bots): crew bots on the filtered team view. No rule authority of their own.
- [`@neon/generator`](packages/generator): semantic building generator.
- [`@neon/characters`](packages/characters): character recipes and checks, without a renderer.
- [`@neon/server`](apps/server): Colyseus game server.
- [`@neon/client`](apps/client): React interface, Babylon tactical view, and the older Phaser pieces.

Foundations:

1. [Technical architecture concept](docs/ARCHITEKTUR.md)
2. [Prioritized development plan](docs/ENTWICKLUNGSPLAN.md), milestones M0–M6, optional generator track M7
3. [AGENTS.md](AGENTS.md)
4. [First playable prototype](docs/PROTOTYP.md)

For review, read the prototype scope first, then the architecture and the development plan. Numeric rule values are starting assumptions for tests.

The concepts also live in four planning documents: [15 system modules](docs/MODULE.md), [23 views](docs/SCREENS.md), [13 generators](docs/GENERATOREN.md), and [36 work packages](docs/ARBEITSPAKETE.md). The screen list distinguishes full-screen pages, panels, and dialog states. The marked sections are available as a tag index in `rag/`. Retrieval is under [Agents](#agents).

Figures and weapons come from [Quaternius](https://quaternius.com/) and are available under [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/). That covers both character libraries and the weapons in `Models&Animations`. The male library is the [Ultimate Modular Characters](https://quaternius.com/packs/ultimatemodularcharacters.html) pack. Source and checksum of the male master are in [provenance.json](assets/source/characters/quaternius/provenance.json). Terminals, the reference truck, and other props made in this project are models of their own.

The building generator, at `semantic-building/7`, derives the floor count from footprint and staff, at most four. Plates are compact 28×24, standard 32×28, and large 32×32. Reception, server, loading, executive office, boardroom, records, and the community garden count once per building. The other functions count once per floor. Upper floors repeat the drawn plate. From the second floor, a stair and the family's lift sit on the hall. Guide: [GEBAEUDEGENERATOR.md](docs/GEBAEUDEGENERATOR.md), [0040](docs/decisions/0040-grundflaeche-personal-und-etagen.md), [0038](docs/decisions/0038-etagen-treppen-und-aufzuege.md). Demand, corridors, and floor-plan method: [0011](docs/decisions/0011-bedarfsbasiertes-raumprogramm.md), [0014](docs/decisions/0014-flurerschliessung-und-sanitaerwege.md), [0010](docs/decisions/0010-bsp-und-graph-grundrisse.md).

The earlier corporation designs KASANE, CONCORD, PARALLAX, and VERDANT were discarded as the world foundation, see [0019](docs/decisions/0019-bisherige-konzernentwuerfe-verworfen.md). They remain in the technical catalog. WFC and loading a generator package in the normal mission screen are open. M7 is not complete, see [0009](docs/decisions/0009-semantischer-gebaeudegenerator.md).

## How to run

Node.js 24.14.0 and pnpm 12.14.0 through Corepack. Blender is needed for character export, terminals, and asset inspection.

### Windows setup

Node.js 24.14.0 from [nodejs.org](https://nodejs.org/) is required. In the project folder, once:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File tools/setup-windows.ps1
```

The script checks Node.js, enables Corepack and pnpm, and installs the workspaces for game, server, client, and generators. A Python dependency is installed only when the building or mission generator has a requirements file. If Python is missing, the script reports that and still sets up the rest.

### Game

In two windows, after `corepack pnpm install` in the project folder:

```powershell
corepack pnpm --filter @neon/server start
corepack pnpm --filter @neon/client dev
```

`corepack pnpm dev` starts the same pair and opens [http://127.0.0.1:5173/](http://127.0.0.1:5173/). Without parameters that is the entry page. The test mission stays at `?stueck=sicht`. `?stueck=deckung` keeps the older Phaser view. The 8×8 grid stays at `?stueck=raster`.

`corepack pnpm test` checks simulation, crew bots, generator, characters, and server. `corepack pnpm typecheck` also checks the client.

### Building generator

`corepack pnpm dev:generator` opens the workshop at [http://127.0.0.1:5174/generator.html](http://127.0.0.1:5174/generator.html): corporate office, research laboratory, or factory and warehouse, demand report, floor plan, 3D, and JSON export. Floor up and floor down switch the drawn plate. The game server is not required for that.

### Characters

`corepack pnpm dev:characters` opens the character creator at [http://127.0.0.1:5175/characters.html](http://127.0.0.1:5175/characters.html). Male and female figures each have their own rig. Guide: [CHARACTER_MODULAR.md](docs/CHARACTER_MODULAR.md), [0017](docs/decisions/0017-quaternius-figurenbibliothek.md), [0018](docs/decisions/0018-getrennte-figurenbibliotheken.md). The procedural pilot remains at `?quelle=prozedural`.

Without a browser: `corepack pnpm generate:character --seed 42`. The test mission shows these figures. Crouch and reload are missing from the source library. See [0021](docs/decisions/0021-cc0-figuren-in-der-testmission.md).

### Assets

- `corepack pnpm dev:terminals` opens the [terminal preview](http://127.0.0.1:5176/terminals.html). Production: `corepack pnpm generate:terminals`. Guide: [TERMINAL_PILOT.md](docs/TERMINAL_PILOT.md).
- `corepack pnpm inspect:assets` examines `../Models&Animations`. Results are under `artifacts/asset-inspection`. Guide: [ASSET_INSPECTION.md](docs/ASSET_INSPECTION.md).
- `corepack pnpm generate:reference-vehicle` builds the [image-reference pilot](docs/IMAGE_REFERENCE_PILOT.md). `corepack pnpm generate:tracked-drone` builds the tracked drone from [ASSET_PARTS.md](docs/ASSET_PARTS.md).
- `corepack pnpm setup:reference-analysis`, then `corepack pnpm analyze:reference`. Guide: [IMAGE_REFERENCE_ANALYSIS.md](docs/IMAGE_REFERENCE_ANALYSIS.md).
- `corepack pnpm check:asset-parts` and `corepack pnpm audit:asset` check parts and motion poses. Contract: [ASSET_QUALITY.md](docs/ASSET_QUALITY.md).
- Family contract: [ASSET_FAMILIES.md](docs/ASSET_FAMILIES.md) and the [skill `asset-families`](.agents/skills/asset-families/SKILL.md). Pipeline proposal: [ASSET_PIPELINE.md](docs/ASSET_PIPELINE.md), [0015](docs/decisions/0015-agentengesteuerte-asset-pipeline.md).

## Agents

The rules are in [AGENTS.md](AGENTS.md). For offline asset jobs, those rules, [ASSET_START.md](docs/ASSET_START.md), and the asset skill are enough. For other tasks, read this README, [ARCHITEKTUR.md](docs/ARCHITEKTUR.md), [PROTOTYP.md](docs/PROTOTYP.md), and the affected milestone in [ENTWICKLUNGSPLAN.md](docs/ENTWICKLUNGSPLAN.md).

```powershell
corepack pnpm asset execute --job assets/jobs/cabinet-base.json
```

A bounded change is passed with `--field` and `--value`. Known color series run with `asset batch`. The existing reference truck also has `init --template reference-truck-v1 --job assets/jobs/mein-lkw.json`. Technical delivery, mechanical review, and artistic approval stay separate.

Optional image segmentation: `corepack pnpm setup:sam2 --device cpu`, then `corepack pnpm generate:reference-vehicle --sam2 --analysis-only`. Guide: [SAM2_SEGMENTATION.md](docs/SAM2_SEGMENTATION.md).

The tag index lives in `rag/`. Tags are `MOD-01`–`MOD-15`, `S01`–`S23`, `GEN-00`–`GEN-12` including partial tags such as `GEN-02A`, `AP-01`–`AP-36`, `M0`–`M7`, and decisions as `DEC-` plus the file number, for example `DEC-0024`.

```powershell
powershell -NoProfile -File tools/rag/NeonRag.ps1 -Tag MOD-03
powershell -NoProfile -File tools/rag/NeonRag.ps1 -Build
```

Several tags go in one call: `-Tag MOD-03,AP-05` or `-Tag S01-S04`. Free text uses `-Query Deckung`, and `-List` shows the tags. `corepack pnpm rag` starts the same script. A hit contains the plan section, the MVP minimum contract, and references. Later stages do not automatically extend v0.1. If the index and a source document disagree, the source document wins.

## Source

[NEON_CONTRACT_Konzept.md](NEON_CONTRACT_Konzept.md) was read in full and copied unchanged from `C:\Users\kaup\Downloads\NEON_CONTRACT_Konzept.md`. The file `NEON_CONTRACT_Konzept (1).md` present there as well is byte-identical. The game is called Sweepers. The source file keeps its name.

SHA-256 of the source file and the project copy:

`EA3D29DA68580144AC1F49BF90AEB60ABBF53CF2DAFF7203AFA2E340F352B38F`

The original describes itself as a concept for discussion. The newer documents separate product goals from proposed technical decisions and test values. Checked official stack sources are at the end of the architecture concept.
