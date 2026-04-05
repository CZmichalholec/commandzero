#!/usr/bin/env python3
"""
deploy.py  —  One-command deploy to Netlify 'commandzero' site.
Hardcoded token, no prompts. Run: python tools/deploy.py
"""

import io
import json
import pathlib
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
import zipfile
from datetime import datetime, timezone

NETLIFY_API = "https://api.netlify.com/api/v1"
TOKEN = "nfp_TegMP5t6a9YRHSbSdi9i56iCTkKE83CF8e1b"
SITE = "commandzero"
SKIP = {".git", ".venv", "__pycache__", "node_modules", ".env", ".idea"}
ALLOW = {".github"}  # Dot directories that should be included in ZIP
# Netlify CDN refuses to serve files under dot-prefixed directories.
# Remap them to underscore-prefixed paths so they are reachable via HTTP.
DOT_REMAP = {".github": "_github"}


def _api_get(path: str) -> dict:
    req = urllib.request.Request(
        f"{NETLIFY_API}{path}",
        headers={"Authorization": f"Bearer {TOKEN}"}
    )
    try:
        with urllib.request.urlopen(req) as r:
            return json.loads(r.read())
    except urllib.error.HTTPError as e:
        body = e.read().decode(errors="replace")
        raise RuntimeError(f"API error {e.code}: {body}") from e


def _api_post(path: str, data: bytes) -> dict:
    req = urllib.request.Request(
        f"{NETLIFY_API}{path}",
        data=data,
        headers={
            "Authorization": f"Bearer {TOKEN}",
            "Content-Type": "application/zip",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req) as r:
            return json.loads(r.read())
    except urllib.error.HTTPError as e:
        body = e.read().decode(errors="replace")
        raise RuntimeError(f"API error {e.code}: {body}") from e


def resolve_site_id(site: str) -> str:
    """Get site UUID by name."""
    sites = _api_get("/sites")
    for s in sites:
        if s.get("name") == site or s.get("id") == site:
            return s["id"]
    raise RuntimeError(f"Site '{site}' not found")


def zip_dir(root: pathlib.Path) -> bytes:
    """Create ZIP archive of project."""
    buf = io.BytesIO()
    root = root.resolve()
    with zipfile.ZipFile(buf, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=6) as zf:
        for p in sorted(root.rglob("*")):
            rel = p.relative_to(root)
            # Skip files/dirs if any path part is:
            # - a dot-directory NOT in ALLOW list, OR
            # - in the SKIP set
            skip = False
            for part in rel.parts:
                if (part.startswith(".") and part not in ALLOW) or part in SKIP:
                    skip = True
                    break
            if skip:
                continue
            if p.is_file():
                arc_path = rel.as_posix()
                # Remap dot-prefixed directories so Netlify can serve them
                for dot, under in DOT_REMAP.items():
                    if arc_path.startswith(dot + '/'):
                        arc_path = under + arc_path[len(dot):]
                        break
                zf.write(p, arc_path)
    return buf.getvalue()


def bump_game_version(root: pathlib.Path) -> str:
    """Parse version, increment patch, and update files."""
    boot_file = root / "assets" / "js" / "01_bootstrap_config.js"
    if not boot_file.exists():
        raise RuntimeError(f"Bootstrap file not found: {boot_file}")

    content = boot_file.read_text(encoding="utf-8")
    match = re.search(r"const GAME_VERSION='([^']+)'", content)
    if not match:
        raise RuntimeError("GAME_VERSION constant not found in bootstrap file")

    current = match.group(1)
    parts = current.split(".")
    if len(parts) != 3:
        raise RuntimeError(f"Invalid version format: {current}")

    try:
        parts[2] = str(int(parts[2]) + 1)
    except ValueError:
        raise RuntimeError(f"Invalid patch version: {parts[2]}")

    new_version = ".".join(parts)

    new_content = re.sub(
        r"const GAME_VERSION='[^']+'",
        f"const GAME_VERSION='{new_version}'",
        content
    )
    boot_file.write_text(new_content, encoding="utf-8")
    print(f"  Bootstrap config updated: v{new_version}")

    return new_version


def main():
    # Get project root (parent of tools dir)
    root = pathlib.Path(__file__).parent.parent.resolve()
    message = f"Deploy {datetime.now(timezone.utc):%Y-%m-%d %H:%M UTC}"

    print(f"Deploying '{root.name}' to Netlify site '{SITE}'…\n")
    
    # Bump version before deployment
    print(f"Bumping game version…")
    new_version = bump_game_version(root)
    print(f"  New version: v{new_version}\n")

    # Get site ID
    print(f"Resolving site '{SITE}'…")
    site_id = resolve_site_id(SITE)
    print(f"  ID: {site_id}")

    # Create archive
    print(f"\nZipping…")
    data = zip_dir(root)
    print(f"  Size: {len(data) // 1024} KB")

    # Deploy
    print(f"\nUploading to Netlify…")
    params = urllib.parse.urlencode({"title": message})
    result = _api_post(f"/sites/{site_id}/deploys?{params}", data)

    url = result.get("deploy_url") or result.get("url") or "(check dashboard)"
    print(f"\n✓ Deploy complete!")
    print(f"  URL  : {url}")
    print(f"  ID   : {result.get('id')}")
    print(f"  Time : {message}")


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(f"\n✗ Error: {e}", file=sys.stderr)
        sys.exit(1)
