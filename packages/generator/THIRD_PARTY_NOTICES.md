# Third-party code and references

## Adapted BSP rectangle splitting

`src/layout/bsp.ts`, function `splitRectangle`, adapts the vertical/horizontal
rectangle arithmetic from `splitContainer` in:

- Project: https://github.com/halftheopposite/bsp-dungeon-generator
- Commit: `ca8c5b4cb3df2bde2b269e59433cc0f93e6406c5`
- Source: `src/generate/dungeon.ts`, lines 132–198
- License: MIT, full text in `licenses/halftheopposite-MIT.txt`
- Copyright (c) 2021 Aymeric Chauvin

Changes: plain immutable rectangles, one cell reserved between child rectangles,
local seeded RNG supplied by the caller, exact room count and minimum-size
constraints, deterministic traversal and bounded layout search. No upstream
global RNG, nanoid IDs, renderer, runtime dependencies or graphics are included.

## Graph-layout design reference

- Project: https://github.com/OndrejNepozitek/Edgar-DotNet
- Commit: `258c83a88656bd6095255a1b749232ade2b87589`
- Reference: `README.md`, graph-based approach and handmade room templates
- Upstream license: MIT

The graph/door-template approach informed the new TypeScript constraint search.
No Edgar source code, binary, dependency or assets are copied. This is not a
port of Edgar's full algorithm, simulated annealing or polygon support.
