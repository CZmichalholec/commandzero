# ARCHITECTURE

## 1. Overview
This project is a browser RTS game. It originally lived in a single HTML file. After the split, the runtime model stays the same:

- `index.html` keeps the DOM shell and load order
- CSS is split into a base layer and a mobile layer
- JavaScript is split into sequentially loaded chunks
- shared state still lives on `window` and in top-level variables
- the project is side-effect driven, not module driven
- multiplayer can use an optional Node relay server in `server/server.js`

## 2. JavaScript load order
1. `01_bootstrap_config.js`
   - UI bootstrap
   - resize logic
   - base settings and config helpers
   - team and faction visuals

2. `02_visibility_ai_fp.js`
   - day and night logic
   - discovery and visibility
   - AI pressure and strategic evaluation
   - first-person toggles and controls

3. `03_world_entities_transport.js`
   - map generation
   - entity factories
   - buildings and units
   - rail, shuttle, and transport logic
   - part of pathfinding preparation

4. `04_path_audio_build_mobile_ai.js`
   - pathfinding and collisions
   - audio and music runtime
   - build UI and production UI
   - mobile layout, touch, and fullscreen logic
   - part of AI and camera behavior

5. `05_units_render2d.js`
   - unit updates and economy
   - 2D map and entity rendering
   - overlays, HP, previews, part of the nuke HUD

6. `06_threejs_loop.js`
   - Three.js and first-person 3D layer
   - FP HUD
   - main game loop and frame scheduling

7. `07_graphics_modes_beauty.js`
   - graphics modes
   - beauty, minimal, and new-style rendering functions
   - later render helper overrides for the modern visual layer

8. `08_menu_multiplayer_tail.js`
   - AI mirror helpers
   - menu flow
   - multiplayer connect, disconnect, and LAN scan
   - late helpers and additional visual utilities

## 3. Architectural constraints
- HTML uses inline `onclick`, so some functions must remain globally reachable.
- The code is not written as ES modules. Do not change chunk order unless the dependency chain is fully understood and revalidated.
- Some functions are intentionally redefined later in the load chain, especially render helpers and graphics-mode behavior. That is part of the runtime, not duplication to remove automatically.
- `mod.js` is an optional override file for `UNIT_MODS` and must remain safe to load even when it contains minimal content.
- The runtime is order-sensitive. Many features rely on side effects during script evaluation.

## 4. Main edit zones
- UI and DOM layout → `index.html`
- common styles → `assets/css/base.css`
- mobile-specific behavior and layout → `assets/css/mobile.css`
- gameplay balance, prices, HP, range → mainly the first three JS chunks
- rendering and graphics → `05`, `06`, `07`
- menu and multiplayer → `08`

## 5. Integration-critical surfaces
These are the easiest places to break the app by accident:

- `<script>` tag order in `index.html`
- DOM ids used through `getElementById`, `querySelector`, or inline handlers
- global function names called directly from HTML
- asset paths in `href` and `src`
- optional fallback loading of `mod.js`
- late overrides in `07` and `08`

## 6. Safe refactor boundary
A refactor is only safe when all of the following remain true:

- every referenced local file still exists
- every inline HTML handler still resolves to a global function
- no required DOM id was renamed without updating all callers
- the reconstructed JS still matches the original behavior or has been intentionally changed and revalidated
- both 2D and FP / Three.js paths still work

## 7. Optional multiplayer server
- File: `server/server.js`
- Runtime: Node.js + `ws` package
- Role: thin lockstep relay only (rooming, seed assignment, command forwarding, ping/pong)
- Non-role: no authoritative game simulation; clients remain deterministic simulation owners
- Discovery: HTTP `GET /ping` on `PORT + 1` for LAN scan metadata
