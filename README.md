# Command Zero — split project (fixed version)

This folder was created by splitting the original monolithic HTML file into smaller parts for easier work in VS Code and with Copilot. This fixed version also resolves the broken packaging issue from the earlier bundle, where `index.html` was corrupted during the split.

## What is inside
- `index.html` — main entry shell
- `assets/css/base.css` — base and desktop styles
- `assets/css/mobile.css` — mobile and fullscreen styles
- `assets/js/01_*.js` to `08_*.js` — logical chunks of the original inline script
- `server/server.js` — optional multiplayer relay server (WebSocket + LAN discovery ping)
- `mod.js` — local placeholder for optional unit overrides
- `ARCHITECTURE.md` — architecture, runtime flow, and dependency notes
- `INSTRUCTIONS.md` — safe editing rules and change integration workflow
- `FILE_MAP.md` — concise file overview
- `INTEGRITY_REPORT.md` — latest integrity check result
- `tools/integrity_check.py` — script to rerun integrity checks
- `original/` — backup of the original source file

## Quick start
Open this folder in VS Code and run `index.html` through a simple local static server so the runtime behavior stays as close as possible to a real browser environment.

Examples:
- VS Code Live Server
- Python HTTP server
- any other static server

## Runtime note
The split preserves the original JavaScript execution order. The chunks are loaded sequentially and reconstruct the original inline script content exactly.

## Multiplayer relay server (optional)
Use the Node relay server when testing multiplayer outside pure local simulation.

```powershell
cd server
npm install ws
node .\server.js 8080
```

Default ports:
- WebSocket relay: `8080`
- HTTP LAN discovery ping endpoint: `8081` (`/ping`)

## Netlify deploy
Use the PowerShell script to deploy the project root to the Netlify site `commandzero`:

```powershell
.\tools\deploy_netlify.cmd
```

If your PowerShell policy blocks direct `.ps1` execution, use the `.cmd` wrapper above and do not dot-source the script. The `.cmd` flow does not execute a PowerShell script file, so it works on systems that require signed `.ps1` files.

If `NETLIFY_AUTH_TOKEN` is not set, the deploy script prompts for auth mode: paste token (recommended) or browser login.

Optional non-interactive usage with token:

```powershell
$env:NETLIFY_AUTH_TOKEN = "<your-token>"
.\tools\deploy_netlify.cmd -Site "commandzero"
```

Optional custom publish directory:

```powershell
.\tools\deploy_netlify.cmd -PublishDir "."
```

## Important
Run the app only after fully extracting the ZIP. `index.html` expects `assets/`, `mod.js`, `tools/`, and `original/` to exist next to it.
