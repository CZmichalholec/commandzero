# GitHub Copilot Instructions

Treat this project as a browser RTS game split out of one large HTML file.

## Primary objective
Make targeted edits without breaking load order, global handlers, file references, DOM ids, or compatibility between 2D, mobile, and FP / Three.js paths.

## Non-negotiable rules
- Keep the JavaScript chunk order intact.
- Do not rewrite the project into a framework or ES modules unless explicitly requested.
- Preserve global functions used by inline HTML event handlers.
- Preserve all existing local file references unless the task explicitly changes them.
- Do not rename DOM ids without updating every usage.
- Do not remove later function redefinitions unless they are proven dead and the change is explicitly requested.
- Prefer changing one chunk at a time.

## Before generating changes
1. Identify the smallest correct file to edit.
2. Check whether the change touches:
   - global functions
   - DOM ids
   - `src` / `href` paths
   - script order dependencies
   - both 2D and FP / Three.js code paths
3. Avoid speculative cleanup outside the requested scope.

## Change style
- Prefer narrow patches over wide refactors.
- Preserve naming unless renaming is required.
- Add guards for optional DOM elements instead of assuming they always exist.
- Keep behavior stable first; improve structure second.

## Quick reference documents
Before editing, consult these files for exact chunk contents, globals, and DOM ids:
- `CHUNK_MAP.md` — all inline handler targets, key globals, DOM ids, CSS class toggles, intentional redefinitions
- `ARCHITECTURE.md` — chunk descriptions, load order, constraints, edit zones
- `INSTRUCTIONS.md` — change workflow, risk categories, reference safety checklist

Each JS chunk (`assets/js/01_*.js` … `08_*.js`) and `assets/css/base.css` contain
an `/* === AI_HEADER_START === … === AI_HEADER_END === */` block at the top.
Read that header first — it lists what the chunk contains, which globals it defines,
which DOM ids it touches, and what is safe vs high-risk to edit.
The integrity check strips these headers before comparison; they do not affect `all_ok`.

## After generating changes
Always summarize:
- which files changed
- which globals, ids, or references were affected
- what manual smoke test should be run
- that `python tools/integrity_check.py` should be rerun
