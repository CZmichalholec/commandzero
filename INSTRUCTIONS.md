# INSTRUCTIONS

## Goal
Keep the split project editable in Copilot and VS Code without breaking the runtime. Favor small, local changes. Preserve load order, references, global handlers, and working behavior.

## Hard rules
1. Do not merge the project back into one file.
2. Do not reorder JavaScript chunks unless the dependency chain is explicitly mapped and revalidated.
3. Keep all HTML-called global functions available on the global scope.
4. Do not rename DOM ids, file paths, or referenced globals without updating every caller.
5. Do not convert the project to modules, a framework, or a bundler-based setup unless that is an explicit task.
6. Do not remove later function redefinitions just because they look duplicated.
7. After every meaningful code change, run `python tools/integrity_check.py`.

## Change integration workflow
Use this sequence for any non-trivial edit:

1. **Locate the smallest correct file**
   - change UI shell → `index.html`
   - style-only change → CSS
   - gameplay / AI / map logic → early JS chunks
   - rendering / graphics → `05` to `07`
   - menu / multiplayer → `08`

2. **Map dependencies before editing**
   - which DOM ids are touched?
   - which globals are read or written?
   - does HTML call the function directly?
   - does another later chunk override the same function?
   - is the change used by both 2D and FP / Three.js modes?

3. **Edit one surface at a time**
   - one chunk is safer than many chunks
   - do not mix DOM renames, path changes, and gameplay edits in one pass
   - keep diffs narrow and easy to inspect

4. **Run reference safety checks**
   - local file references still exist
   - inline handlers still resolve
   - changed DOM ids still match all callers
   - no new script or stylesheet path is broken

5. **Run runtime sanity checks**
   - main menu opens
   - single-player start still works
   - settings panel still works
   - unit build buttons still resolve
   - 2D render starts
   - FP / Three.js mode still toggles
   - mobile layout still opens without obvious UI breakage

6. **Run integrity validation**
   - `python tools/integrity_check.py`
   - if a check fails, fix the root cause instead of weakening the check

## Reference safety checklist
Before finishing any change, verify these specifically:

- every `src` and `href` in `index.html` points to a real file
- every HTML `onclick` function name still exists in global JS scope
- every renamed DOM id was updated in JavaScript and HTML together
- optional elements use guards if they may be absent
- `mod.js` remains loadable
- no script tag was moved above a dependency it needs

## Safe change types
- comments and documentation
- local cleanup inside one chunk
- narrow bug fixes
- UI text changes
- defensive guards for optional DOM elements
- styling adjustments that do not change element identity

## High-risk change types
- automatic deduplication of functions
- moving logic across chunks without dependency review
- renaming DOM ids
- renaming functions used by HTML handlers
- changing script order
- changing asset paths
- refactoring render branches that affect both 2D and FP layers
- touching multiplayer URL logic without checking `ws://` and `wss://` behavior

## Rules for Copilot-generated edits
When using Copilot, require it to:

- state which file should be edited and why
- avoid touching unrelated chunks
- preserve script order and global names
- avoid speculative renames
- mention every reference-sensitive change
- recommend rerunning `python tools/integrity_check.py`

## Commit / patch guidance
For larger edits, include a short note with:

- files changed
- globals added, removed, or renamed
- DOM ids added, removed, or renamed
- whether 2D, FP, mobile, or multiplayer behavior was affected
- whether integrity checks passed

## Minimal release gate
Do not package a new ZIP until all of the following are true:

- integrity script passes
- `index.html` loads all local CSS and JS files
- menu actions resolve without missing function errors
- no new missing-reference errors appear in the browser console
- the app is tested from the extracted folder, not from a partial copy
