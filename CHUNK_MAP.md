# CHUNK MAP — Command Zero

Quick cross-reference for AI-assisted editing.
Use alongside [ARCHITECTURE.md](ARCHITECTURE.md) and [INSTRUCTIONS.md](INSTRUCTIONS.md).

Each JS chunk file now contains an `/* === AI_HEADER_START === ... === AI_HEADER_END === */`
block at the top describing its content, globals, DOM ids, and safety notes.
The integrity check strips these headers before reconstruction comparison —
they do not affect the `python tools/integrity_check.py` result.

---

## HTML Inline Handler Functions

All targeted by `onclick` attributes in `index.html`. **Must remain global.**
Renaming any of these requires updating every `onclick` in `index.html` at the same time.

| Function | Chunk | Notes |
|----------|-------|-------|
| `buildCmd` | 04 | Sidebar unit/building buttons — most-called handler |
| `menuShowSP` | 08 | Opens single-player difficulty panel |
| `menuHideSP` | 08 | Closes single-player panel |
| `menuShowSettings` | 08 | Opens graphics/settings panel |
| `menuHideSettings` | 08 | Closes settings panel |
| `menuShowMP` | 08 | Opens multiplayer panel |
| `menuHideMP` | 08 | Closes multiplayer panel |
| `menuStartSP` | 08 | Starts single-player game — calls `init()` + `startLoop()` |
| `mpConnect` | 08 | Connects to multiplayer WebSocket relay |
| `mpDisconnect` | 08 | Disconnects and returns to menu |
| `mpScanLAN` | 08 | Scans LAN for relay servers |

---

## Key Global Constants (chunk 01)

Gameplay balance — safe to change **values**, not **names**.

| Name | Purpose |
|------|---------|
| `TILE` | Tile size in pixels — coordinate foundation for all chunks |
| `MAP_W`, `MAP_H` | Map dimensions in tiles |
| `GAME_VERSION` | Displayed in `#menu-version` span in index.html |
| `TEAM_COLORS` | Faction color map used by all render chunks |
| `UNIT_COST`, `TANK_COST`, `TOWER_COST`, `BASE_COST` | Build costs |
| `HOUSE_COST`, `APARTMENT_COST`, `TRAINING_COST` | Population building costs |
| `WALL_COST`, `RAIL_COST`, `TRAIN_COST`, `HARBOR_COST` | Infrastructure costs |
| `SILO_COST`, `RADAR_COST`, `DRONE_COST` | Special building/unit costs |
| `HELICOPTER_COST`, `SHIP_COST`, `LAUNCHER_COST`, `PATRIOT_COST` | Military costs |
| `TRAIN_TIME_UNIT`, `TRAIN_TIME_TANK`, etc. | Production time in ticks |
| `NUKE_COUNTDOWN` | Nuke flight time in ticks |
| `PATRIOT_NUKE_PROTECT_RADIUS` | Patriot missile intercept radius |
| `FIXED_STEP_MS` | Simulation step in milliseconds |

---

## Key Global State Variables

| Name | Defined in | Purpose |
|------|-----------|---------|
| `CZ_BOOT` | 01 | Boot sequencing state — completes in chunk 08 |
| `canvas`, `ctx` | 01 | Main 2D canvas element and 2D context |
| `camera` | 01 | `{x, y}` scroll position |
| `mobileView` | 01 | Mobile mode state object |
| `keysDown` | 01 | Keyboard state map |
| `fp` | 01/02 | First-person state object |
| `fpMode` | 02 | Boolean — is FP mode active? |
| `player`, `ai` | 03/04 | Faction data objects (units, buildings, resources) |
| `map` | 03/04 | 2D tile type array `map[y][x]` |
| `mode` | 04 | Current input mode string (e.g. `'select'`, `'build-tower'`) |
| `selection` | 04/05 | Array of currently selected entities |
| `gameOver` | 04 | Boolean/string — game-over state |
| `railTransportOrder` | 04 | Active rail transport command or null |
| `AudioRTS` | 04 | Audio system singleton |
| `tick` | 06 | Simulation tick counter |
| `fps` | 06 | Frames-per-second counter |
| `_loopStarted` | 06 | Guard — prevents double-starting game loop |
| `threeFP` | 06 | Three.js FP renderer state object |
| `selectedAIDifficulty` | 07/08 | AI difficulty string (`'basic'`/`'advanced'`/`'expert'`) |
| `MP` | 08 | Multiplayer state and WebSocket relay object |

---

## Cross-Chunk Dependency Order

Each chunk depends on everything loaded before it:

```
01  →  constants, canvas, camera, mobileView, CZ_BOOT
  02  →  nuke/patriot, day/night, FP mode, AI visibility
    03  →  A* pathfinding, entity geometry, entity factories
      04  →  init, obstacles, audio, buildCmd, mobile
        05  →  unit updates, minimap, UI, hit testing
          06  →  terrain cache, 2D draw, Three.js, game loop   ← LARGEST
            07  →  graphics mode overrides (intentional redefs)
              08  →  menus, multiplayer, all HTML handlers
```

---

## DOM IDs Cross-Reference

Used by JavaScript — do not rename without updating every JS chunk that uses the ID.

| ID | Element | Used in chunks |
|----|---------|---------------|
| `#canvas` | `<canvas>` | 01, 02, 04, 05, 06 |
| `#canvas-container` | `<div>` | 01, 04, 05, 06 |
| `#fps` | `<span>` | 01, 06 |
| `#mode-display` | `<span>` | 04, 05 |
| `#main-menu` | `<div>` | 01, 02, 04, 08 |
| `#menu-root` | `<div>` | 02, 08 |
| `#menu-version` | `<span>` | 01 (version display) |
| `#sp-panel` | `<div>` | 08 |
| `#mp-panel` | `<div>` | 08 |
| `#settings-menu-panel` | `<div>` | 07, 08 |
| `#log` | `<div>` | 05 |
| `#footer` | `<div>` | 04, 05 |
| `#sidebar` | `<div>` | 01, 04, 05 |
| `#header` | `<div>` | 01, 04 |
| `#message` | `<div>` | 06 |
| `#three-holder` | `<div>` | 02, 06 |
| `#fp-ui` | `<div>` | 02, 06 |
| `#fp-hint` | `<div>` | 04, 06 |
| `#fp-stats` | `<div>` | 06 |
| `#fp-charge` | `<div>` | 06 |
| `#fp-charge-fill` | `<div>` | 06 |
| `#fp-charge-text` | `<div>` | 06 |
| `#fp-cockpit` | `<div>` | 06 |
| `#fp-crosshair` | `<div>` | 06 |
| `#heli-bomb-hud` | `<div>` | 06 |
| `#heli-bomb-fill` | `<div>` | 06 |
| `#heli-bomb-text` | `<div>` | 06 |
| `#ping-disp` | `<span>` | 06, 08 |
| `#mp-status` | `<span>` | 08 |
| `#mp-conn-log` | `<div>` | 08 |
| `#mp-overlay` | `<div>` | 08 |
| `#lan-results` | `<div>` | 08 |
| `#mp-server-ip` | `<input>` | 08 |
| `#mp-room-id` | `<input>` | 08 |
| `#mp-server-port` | `<input>` | 08 |
| `#mobile-touch-hud` | `<div>` | 04, 05 |
| `#mobile-build-cancel` | `<button>` | 04, 05 |
| `#mobile-fs-btn` | `<button>` | 04 |
| `#mobile-fp-btn` | `<button>` | 04 |
| `#mobile-fp-controls` | `<div>` | 04 |
| `#mobile-fp-fire` | `<button>` | 04 |
| `#mobile-fp-exit` | `<button>` | 04 |
| `#mobile-fp-up/down/left/right/back` | `<button>` | 04 |
| `#mobile-fp-turn-left/right` | `<button>` | 04 |
| `#music-sidebar-slider` | `<input>` | 04 |
| `#auto-ai` | `<input type="checkbox">` | 04, 07 |
| `#unit-floating-tip` | `<div>` | 05 |

---

## CSS Classes Toggled by JavaScript

These class names must stay in sync between JS and CSS.

| Class | Applied to | Set in chunk | Purpose |
|-------|-----------|-------------|---------|
| `.mobile-browser` | `html`, `body` | 04 | Activates mobile layout |
| `.fp-mobile-active` | `html`, `body` | 02, 04 | FP mode active on mobile |
| `.open` | panel `<div>` elements | 08 | Shows a menu panel |
| `.show` | `#message` | 06 | Shows victory/defeat overlay |
| `.active` | `.graphics-mode-btn` | 07 | Highlights selected graphics mode |
| `.mobile-hint-hidden` | `#footer` | 04 | Hides footer hint on mobile |
| `.player-log`, `.ai-log`, `.combat-log` | log rows | 05 | Log message coloring |

---

## Intentional Function Redefinitions (chunk 07 overrides chunk 06)

These functions are defined **twice** by design — chunk 07 wins at runtime.
**Do NOT remove the chunk-07 versions** thinking they are accidental duplicates.

| Function | First in | Override in | Why |
|----------|---------|------------|-----|
| `drawMapNewStyle` | 06 | 07 | Beauty rendering replaces basic version |
| `drawMapBeauty` | 06 (stub) | 07 | Full beauty mode implementation |
| *(other render helpers)* | 06 | 07 | Graphics mode switching |

---

## Integrity Check Quick Reference

```
python tools/integrity_check.py
```

Checks (all must pass — `"all_ok": true`):

| Check | What it validates |
|-------|-----------------|
| `css_reconstruction_exact` | `base.css` + `mobile.css` == original `<style>` block |
| `js_reconstruction_exact` | Chunks 01-08 concatenated == original inline `<script>` |
| `index_matches_expected` | `index.html` shell matches expected structure |
| `local_references_exist` | All `src`/`href` paths in index.html resolve to real files |
| `javascript_syntax` | All JS files pass `node --check` |
| `inline_handler_functions_present` | All HTML `onclick` targets exist in JS |
| `html_shell_structure` | Correct count of `<script>` (10), `<link>` (2) tags |
| `no_inline_monolith_left_in_index` | No inline `<script>` block in index.html |

**Note:** AI documentation headers in JS/CSS files are stripped before reconstruction
comparison. Adding or editing headers does not affect check results.
