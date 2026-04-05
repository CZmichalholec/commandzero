# Game Version Management

## Overview
The game version is automatically bumped before each deployment. The version is displayed in the main menu and stored in two locations:
- **Source of truth**: `assets/js/01_bootstrap_config.js` → `const GAME_VERSION='X.Y.Z'`
- **Display**: `assets/js/01_bootstrap_config.js` updates `#menu-version` at runtime if the menu is present

## Current Version
- **v0.1.1** (bumped automatically during last deployment)

## Deployment Process
When you run `python tools/deploy.py`:
1. Version is read from `01_bootstrap_config.js`
2. Patch version is automatically incremented (e.g., 0.1.0 → 0.1.1)
3. The bootstrap config is updated before packaging
4. Changes are zipped and deployed to Netlify
5. The main menu version label is rendered from `GAME_VERSION` at runtime

## Manual Version Updates
If you need to change the version manually (major or minor version bump):
1. Edit `assets/js/01_bootstrap_config.js` → change `const GAME_VERSION='X.Y.Z'`
2. Run deployment normally (will further bump the patch version)

## Version Format
Uses semantic versioning: `MAJOR.MINOR.PATCH`
- **0** = Major version (game foundation)
- **1** = Minor version (features/content)
- **1** = Patch version (auto-incremented per deployment)

## Notes
- The version bump happens **before** deployment, so uncommitted changes in `assets/js/01_bootstrap_config.js` are expected after `python tools/deploy.py`
- Consider committing the version change after successful deployment
- No manual version management needed for patch releases
