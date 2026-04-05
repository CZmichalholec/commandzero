# FILE MAP

## Root
- `index.html` — main application shell
- `mod.js` — optional local unit override file
- `README.md` — project orientation
- `ARCHITECTURE.md` — architecture and dependency notes
- `INSTRUCTIONS.md` — editing rules and integration workflow
- `CHUNK_MAP.md` — inline handlers, global symbols, DOM ids, CSS class map, redefinition table
- `INTEGRITY_REPORT.md` — latest check result

## Server
- `server/server.js` — optional multiplayer relay server (WebSocket room relay + HTTP `/ping` discovery)

## CSS
- `assets/css/base.css` — base layout, menu, sidebar, desktop, common UI
- `assets/css/mobile.css` — mobile browser mode, fullscreen, touch HUD, FP mobile controls

## JavaScript
- `assets/js/01_bootstrap_config.js` — bootstrap, settings, faction visuals
- `assets/js/02_visibility_ai_fp.js` — visibility, AI pressure, first-person control
- `assets/js/03_world_entities_transport.js` — map, entity factory, rails, transport
- `assets/js/04_path_audio_build_mobile_ai.js` — pathfinding, audio, build UI, mobile, camera, AI helpers
- `assets/js/05_units_render2d.js` — unit update logic, economy, 2D render
- `assets/js/06_threejs_loop.js` — Three.js and main loop
- `assets/js/07_graphics_modes_beauty.js` — graphics mode overrides and beauty rendering
- `assets/js/08_menu_multiplayer_tail.js` — menu, multiplayer, late helpers

## Tools
- `tools/integrity_check.py` — validates syntax, references, DOM ids, chunk reconstruction, and shell structure

## Original backup
- `original/command_zero_station_fp_mobile_browser_adapt_fix14 (2).html`
