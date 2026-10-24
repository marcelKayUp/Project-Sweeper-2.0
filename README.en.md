# Sweepers

[Deutsch](README.md) · English

Cooperative cyberpunk tactics game for 4–8 players: one runner per person, shared contracts, cover, action points, and, in the long run, a persistent crew.

This is not a commercial project. It is a vibe coder's test bed for probing his own limits and those of the AI, and a casual game for him and his group of friends.

## Manual testing

`http://127.0.0.1:5173/` shows the sitemap from [NAVIGATION.md](docs/NAVIGATION.md) as a checklist. Surfaces that exist are linked. Planned surfaces have no jump. The test mission stays at `?stueck=sicht`. Gate, lobby, and that test mission need the game server. See [0039](docs/decisions/0039-testeinstieg-aus-der-sitemap.md).

## Visible directly on GitHub

GitHub shows these images itself. The test mission and the game server do not run there.

Cover, shooting, and action points do not need the game server. GitHub has one captured view of each:

- [Cover](artifacts/pieces/deckung/ours.png)
- [Shooting](artifacts/pieces/schuss/ours.png)
- [Action points](artifacts/pieces/aktionspunkte/ours.png)

GitHub also shows the contact sheets and the terminal preview as images. The accompanying HTML search stays local.

- [Characters](artifacts/asset-inspection/contact-characters.png), [weapons](artifacts/asset-inspection/contact-weapons.png), [components](artifacts/asset-inspection/contact-components.png)
- [Terminals](artifacts/terminals/contact-sheet.png), [workshop image](artifacts/terminals/workshop.png)

## Packages

Node.js 24.14.0 and pnpm 12.14.0 through Corepack. In the project folder, run `corepack pnpm install` once.

- [`@neon/sim`](packages/sim): deterministic rules. No graphics and no networking.
- [`@neon/generator`](packages/generator): semantic building generator.
- [`@neon/characters`](packages/characters): character recipes and checks, without a renderer.
- [`@neon/server`](apps/server): Colyseus game server.
- [`@neon/client`](apps/client): React interface, Babylon tactical view, and the older Phaser pieces.

`corepack pnpm test` checks simulation, generator, characters, and server. `corepack pnpm typecheck` also checks the client. Blender is needed only for character export, terminals, and asset inspection.

## Entry point for agents

The rules are in [AGENTS.md](AGENTS.md). Before a task, read this README, [ARCHITEKTUR.md](docs/ARCHITEKTUR.md), [PROTOTYP.md](docs/PROTOTYP.md), and the affected milestone in [ENTWICKLUNGSPLAN.md](docs/ENTWICKLUNGSPLAN.md).

The tag index lives in `rag/`. From the project folder:

```powershell
powershell -NoProfile -File tools/rag/NeonRag.ps1 -Tag MOD-03
```

Tags are `MOD-01`–`MOD-15`, `S01`–`S23`, `GEN-00`–`GEN-12` including partial tags such as `GEN-02A`, `AP-01`–`AP-36`, `M0`–`M7`, and decisions as `DEC-` plus the file number, for example `DEC-0024`. Several tags go in one call: `-Tag MOD-03,AP-05` or `-Tag S01-S04`. Free text uses `-Query Deckung`, and `-List` shows the tags. A hit contains the plan section, the MVP minimum contract, and references. Later stages do not automatically extend v0.1. If the index and a source document disagree, the source document wins. If the script reports stale sources, rebuild with:

```powershell
powershell -NoProfile -File tools/rag/NeonRag.ps1 -Build
```

`corepack pnpm rag` starts the same script.

**Project status, 21 October 2026:** Rule and graphics pieces and a local mission prototype are in place. New is a semantic building generator with its own workshop. The other planning documents remain proposals; a complete human MVP acceptance is not established by them.

Version 5 adds a real corridor network with its own room doors and short, geometrically checked sanitary routes: the CEO is at most 16 grid steps away via assistant and corridor. The workshop draws the selected restroom route. Area steps: 28×24, 32×28, and 32×32; occupancy stays unchanged. See [0014](docs/decisions/0014-flurerschliessung-und-sanitaerwege.md).

## Start the character workshop

`corepack pnpm dev:characters` opens the separately commissioned low-poly character creator at `http://127.0.0.1:5175/characters.html`. Under "Body model", male and female figures can be selected, each with its own rig: eleven and ten sets respectively, four combinable parts, accessories, optional colors, 62 bones, and 24 native animations. JSON and rigged GLBs keep the model source. Guide and source decisions: [CHARACTER_MODULAR.md](docs/CHARACTER_MODULAR.md), [0017](docs/decisions/0017-quaternius-figurenbibliothek.md), [0018](docs/decisions/0018-getrennte-figurenbibliotheken.md). The earlier procedural pilot remains available at `?quelle=prozedural`.

Agents can run the same production without a browser using `corepack pnpm generate:character --seed 42`. The tool combines local CC0 model parts from validated TypeScript/JSON recipes and does not use a model API or an extra subscription. The test mission `?stueck=sicht` shows these figures; crouch and reload are missing from the source library. See [0021](docs/decisions/0021-cc0-figuren-in-der-testmission.md).

## Check local assets

**Vehicle from an image reference:** `corepack pnpm generate:reference-vehicle` builds the local [image-reference pilot](docs/IMAGE_REFERENCE_PILOT.md): annotated contours, calculated image edges and camera approximation, and a parametric Blender/GLB model. Perspective, scale, and hidden form are assumptions; the comparison and the evidence are in the guide.

**Reusable asset families:** The project-local [skill `asset-families`](.agents/skills/asset-families/SKILL.md) and the [family contract](docs/ASSET_FAMILIES.md) separate geometry, materials/textures, and instance scale. Codex and Cursor use the shared entry point; Claude Code uses a short pointer to it. Switching the terminal generator and its loader is still open.

**Terminal family:** `corepack pnpm dev:terminals` opens the [3D preview](http://127.0.0.1:5176/terminals.html) for 18 locally produced props: three construction types, two sizes, and three organization colors. Produce them with `corepack pnpm generate:terminals`. Guide, GLB/Blend deliveries, and checks: [TERMINAL_PILOT.md](docs/TERMINAL_PILOT.md). The pilot uses the existing Blender/Python/NumPy setup without new dependencies and does not change mission rules.

`corepack pnpm inspect:assets` examines the commissioned folder `../Models&Animations` in a separate Blender process. A hash cache, rig/clip comparison, and contact sheets avoid repeated one-off analyses. Sources stay unchanged; results are under `artifacts/asset-inspection`. Other source paths can be passed directly to the Node CLI. Guide, findings, and checks: [ASSET_INSPECTION.md](docs/ASSET_INSPECTION.md).

## Start the building generator

The earlier corporation designs KASANE, CONCORD, PARALLAX, and VERDANT were discarded as the world foundation on the user's instruction; see [0019](docs/decisions/0019-bisherige-konzernentwuerfe-verworfen.md). They remain in the existing technical catalog, which still needs an integration step before the new organization landscape replaces it. Site role, department, fit-out level, building history, and condition of repair still affect office forms, hierarchy, required adjacencies, and the 2D/3D fit-out. Executive and assistant seats remain part of the existing occupancy. Technical inventory and historical evidence: [0012](docs/decisions/0012-konzernidentitaet-und-bueroorganisation.md).

`corepack pnpm dev:generator` opens the workshop at `http://127.0.0.1:5174/generator.html`: corporate office, research laboratory, or factory/warehouse with demand-based room counts, four runners, a data-theft objective, hard checks, graph/3D preview, and JSON export. Guide and evidence: [GEBAEUDEGENERATOR.md](docs/GEBAEUDEGENERATOR.md). Several playable floors, WFC, and loading in the normal mission screen are still open.

`corepack pnpm dev` starts the game server and the client and opens `http://127.0.0.1:5173/`. Without parameters that is the entry page. The test mission stays `?stueck=sicht`: the server builds the compact map with `generateBuilding` and sends only known ground, visible enemies, and directional cover. `?stueck=deckung` keeps the older Phaser view. The 8×8 grid stays at `?stueck=raster`. See [0024](docs/decisions/0024-ein-start-fuer-die-testmission.md).

Version 3 derives room counts and minimum areas from occupancy, workplaces, process stations, and storage demand. The report explains capacities and separates on-site functions from the rest of the building. Example: 24 office workplaces produce six offices; a mission floor can declare reception and delivery as off-site. These are versioned game assumptions in grid cells, not building-code planning. See [0011](docs/decisions/0011-bedarfsbasiertes-raumprogramm.md). Variable BSP floor plans, graph embedding, and the MIT provenance continue; see [0010](docs/decisions/0010-bsp-und-graph-grundrisse.md).

## Foundations

[Organization landscape version 8](docs/ORGANISATIONEN.md) describes competitive structures for HTN-driven stories: resources, dependencies, interests, six cooperation forms, and shared task and method families. The [catalog](docs/ORGANISATIONSKATALOG.md) provides 70 actor profiles. Concrete incidents, people, and places appear only from a scenario instance. Replacing the technical catalog and implementing the planner remain open. Source and scope decision: [0020](docs/decisions/0020-organisationslandschaft-und-lokale-konflikte.md).

1. [Technical architecture concept](docs/ARCHITEKTUR.md): independent simulation, server authority, both turn models, multiplayer, information hiding, replays, bots, and later storage.
2. [Prioritized development plan](docs/ENTWICKLUNGSPLAN.md): milestones M0–M6, optional generator track M7, dependencies, and checkable acceptance.
3. [AGENTS.md](AGENTS.md): project-wide working rules for coding agents.
4. [Definition of the first playable prototype](docs/PROTOTYP.md): concrete mission, starting rules, feature scope, and limits.

For review, read the prototype scope first, then the architecture and the development plan. Numeric rule values are starting assumptions for tests.

## Concrete MVP minimum

[MVP.md](docs/MVP.md) defines the first playable state v0.1, the end-to-end player path, and the shared acceptance. For each area it describes what must work at minimum:

- [15 system modules](docs/MVP_MODULE.md): required functions, data, error cases, concrete evidence, and later extensions.
- [23 screens/views](docs/MVP_SCREENS.md): visible elements, operation, states, data source, and acceptance.
- [13 generator/tool modules](docs/MVP_GENERATOREN.md): templates and checks required for v0.1, and the smallest usable generator version when introduced later.

The first MVP needs 13 of the planned views plus the mission menu, mostly as small panels. The skill list, level-up, city map, and other later functions also have a documented minimum; that does not automatically pull them into v0.1.

The working definition of "MVP" means the four-player tactics test. The full 4–8 player goal is checked in v0.2, and the first persistent campaign loop follows in M6. All described evidence is still open.

## Modular planning

The [agent-driven low-poly asset pipeline](docs/ASSET_PIPELINE.md) examines ten existing repositories and proposes local Blender recipes, optional MCP control, GLB checks, and a small production pilot. Codex, Claude Code, or Cursor should be usable without extra subscriptions. The broad prop and environment pipeline remains a planning proposal, [0015](docs/decisions/0015-agentengesteuerte-asset-pipeline.md); the separately commissioned figure pilot is carried out by the workshop described above.

The concepts are also split into four connected planning documents:

1. [Module plan](docs/MODULE.md): **15 system modules** with responsibilities, data contracts, dependencies, and acceptance.
2. [Screens and player flows](docs/SCREENS.md): **23 views**, including main menu, lobby, character selection/creation, equipment, play view, tactical and strategic overview maps, skill list, level-up, and settings.
3. [Generators](docs/GENERATOREN.md): **13 generator/tool modules**, including level structure, NPCs, encounters, equipment, loot, and quality checks. Level and NPCs are split further into submodules.
4. [Work packages](docs/ARBEITSPAKETE.md): **36 packages that can be planned individually**, with scope, minimum dependencies, size class, and a checkable result.

The marked sections are also available as a tag index in `rag/`. Retrieve one with `powershell -NoProfile -File tools/rag/NeonRag.ps1 -Tag MOD-03`. Rebuild it with the same call and `-Build`. If they disagree, the source document wins.

For a shared review, look at screens and player flows first, then modules and work packages. The screen list distinguishes full-screen pages, panels, and dialog states; it does not mean 23 separately built full-screen applications.

The early path remains main menu → lobby/runner/equipment/briefing → mission → result. Skill development and campaign screens follow later. The reference mission stays handmade. The separately commissioned building prototype brings the local generator track forward; M7 and its play acceptance are open. See [0009](docs/decisions/0009-semantischer-gebaeudegenerator.md).

The [tiered character development](docs/CHARAKTERENTWICKLUNG.md) documents Physical/Social/Mental, cheaper specializations past value thresholds, and proposals for connecting them to XP/levels and equipment actions. It belongs to the later M6 planning; numbers and concrete rules remain open for review.

## Recommended direction

A TypeScript rules core runs independently of graphics and networking. The server executes it as the authority. Babylon.js presents the tactical view, React the interface, and Colyseus connects the players. The camera is orthographic, tilted by 45 degrees, and rotates in 90-degree steps. Vitest checks rules and replays, Playwright browser flows. The continuation is the playable form of `?stueck=raster` and `?stueck=sicht`. `corepack pnpm dev` opens it directly; see [decision 0013](docs/decisions/0013-isometrische-fortsetzung.md), [0024](docs/decisions/0024-ein-start-fuer-die-testmission.md), and [0007](docs/decisions/0007-babylon-taktikansicht.md).

**v0.1 "Ghost Floor – core mission":** four runners on a 20 × 20 map, a shared team turn, AP, cover, sight, shooting, overwatch, hacking, extraction, and reconnect. Two weapons, two enemy types, bots, and simple placeholders.

**v0.2 "Ghost Floor – comparison test":** simultaneous planning as a second variant, up to eight runners, a scout drone, a third enemy type, a third weapon, alarm/deletion, one simple injury, and hotjoin by taking over a bot. Both turn models are compared with humans.

This split is a new scope recommendation. The original concept already names the drone, three enemy types, and both turn models for its slice. They stay in the plan, but they are integrated after the first playable intermediate state.

## Decisions for our review

- **Turn model:** develop the team turn first; the final choice comes only after the A/B comparison.
- **Player count:** four for the first playable state; eight as a mandatory later validation step.
- **Rule complexity:** orthographic 3D tactical view, four movement directions, shared team sight, a small selection of weapons and enemies. Height levels are map data; a height bonus is not included.
- **Mission length:** the first core mission is provisionally 15–30 minutes; the full comparison test checks the product goal of 30–60 minutes.
- **Hotjoin:** first take over an existing bot runner; a new reinforcement runner at a safe entry point follows later.
- **Persistence:** mission and replays first; character development and the safehouse after a positive tactics test.
- **Generators:** the tactical problem first, then the environment. Data theft in a building is the first generator stage; streets, WFC, and further mission families follow later. See [decision 0008](docs/decisions/0008-hierarchischer-missionsgenerator.md). AI text and image templates are produced outside the run.

Outside explicitly made decisions, the documents remain drafts. Existing implementations and tests demonstrate their own slice, not a blanket approval or a completed milestone acceptance.

## Source and provenance

[NEON_CONTRACT_Konzept.md](NEON_CONTRACT_Konzept.md) was read in full and copied unchanged from `C:\Users\kaup\Downloads\NEON_CONTRACT_Konzept.md`. The file `NEON_CONTRACT_Konzept (1).md` present there as well is byte-identical.

SHA-256 of the source file and the project copy:

`EA3D29DA68580144AC1F49BF90AEB60ABBF53CF2DAFF7203AFA2E340F352B38F`

The original describes itself as a concept for discussion. The newer documents therefore separate product goals from proposed technical decisions and test values. Checked official stack sources are at the end of the architecture concept.
