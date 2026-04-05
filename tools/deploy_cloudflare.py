#!/usr/bin/env python3
"""
deploy_cloudflare.py  —  Deploy to Cloudflare Pages via GitHub push.

Cloudflare Pages is connected to github.com/CZmichalholec/commandzero and
watches the 'main' branch.  This script:
  1. Bumps the in-game patch version.
  2. Stages all changes, commits, and pushes to main.
  3. Cloudflare Pages CI picks up the push and publishes automatically.

Requirements:
  - Git is installed and on PATH.
  - The working copy has a remote named 'origin' pointing to the GitHub repo.
    If it does not exist the script offers to add it.
  - GitHub credentials are configured in git (SSH key, credential helper, or
    a personal-access-token stored in the OS keychain).  The script does NOT
    handle authentication — configure it once with:
      git remote set-url origin git@github.com:CZmichalholec/commandzero.git
    or an HTTPS PAT via the Git Credential Manager.

Run:
  python tools/deploy_cloudflare.py [--dry-run]
"""

import pathlib
import re
import subprocess
import sys
from datetime import datetime, timezone

GITHUB_REPO = "https://github.com/CZmichalholec/commandzero"
CF_PAGES_URL = "https://commandzero.michal-holec.workers.dev"
REMOTE_NAME  = "origin"
REMOTE_URL   = "https://github.com/CZmichalholec/commandzero.git"
BRANCH       = "main"


# ---------------------------------------------------------------------------
# Version helpers (shared logic with deploy.py)
# ---------------------------------------------------------------------------

def bump_game_version(root: pathlib.Path) -> tuple[str, str]:
    """Increment patch in GAME_VERSION; return (old, new)."""
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
        content,
    )

    boot_file.write_text(new_content, encoding="utf-8")
    print(f"  Bootstrap config updated: {current} → {new_version}")
    return current, new_version


# ---------------------------------------------------------------------------
# Git helpers
# ---------------------------------------------------------------------------

def _run(args: list[str], cwd: pathlib.Path, capture: bool = False) -> subprocess.CompletedProcess:
    return subprocess.run(
        args,
        cwd=str(cwd),
        capture_output=capture,
        text=True,
    )


def ensure_remote(root: pathlib.Path, dry_run: bool) -> None:
    """Add 'origin' if it does not exist; verify URL if it does."""
    result = _run(["git", "remote", "get-url", REMOTE_NAME], root, capture=True)
    if result.returncode != 0:
        print(f"  Remote '{REMOTE_NAME}' not found. Adding → {REMOTE_URL}")
        if not dry_run:
            _run(["git", "remote", "add", REMOTE_NAME, REMOTE_URL], root)
    else:
        configured = result.stdout.strip()
        if configured != REMOTE_URL:
            print(f"  Note: remote '{REMOTE_NAME}' points to {configured}")
            print(f"        Expected:  {REMOTE_URL}")
            print(f"        Continuing with the configured remote.")


def git_status_clean(root: pathlib.Path) -> bool:
    r = _run(["git", "status", "--porcelain"], root, capture=True)
    return r.stdout.strip() == ""


def git_add_all(root: pathlib.Path, dry_run: bool) -> None:
    print("  git add -A")
    if not dry_run:
        r = _run(["git", "add", "-A"], root)
        if r.returncode != 0:
            raise RuntimeError("git add failed")


def git_commit(root: pathlib.Path, message: str, dry_run: bool) -> None:
    print(f"  git commit -m \"{message}\"")
    if not dry_run:
        r = _run(["git", "commit", "-m", message], root)
        if r.returncode != 0:
            raise RuntimeError("git commit failed (nothing to commit?)")


def git_push(root: pathlib.Path, dry_run: bool) -> None:
    print(f"  git push {REMOTE_NAME} {BRANCH}")
    if not dry_run:
        r = _run(["git", "push", REMOTE_NAME, BRANCH], root)
        if r.returncode != 0:
            raise RuntimeError(
                "git push failed.\n"
                "  Check that your credentials are configured and the branch exists:\n"
                f"    git push --set-upstream {REMOTE_NAME} {BRANCH}"
            )


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> None:
    dry_run = "--dry-run" in sys.argv
    if dry_run:
        print("=== DRY RUN — no files will be modified, no commits made ===\n")

    root = pathlib.Path(__file__).parent.parent.resolve()
    timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")

    print(f"Project root : {root}")
    print(f"Target       : Cloudflare Pages ({CF_PAGES_URL})")
    print(f"Repository   : {GITHUB_REPO}")
    print(f"Branch       : {BRANCH}\n")

    # 1. Bump version
    print("Step 1/3 — Bumping game version…")
    _old, new_version = bump_game_version(root)
    print(f"  New version : v{new_version}\n")

    # 2. Git stage + commit
    print("Step 2/3 — Committing…")
    ensure_remote(root, dry_run)
    git_add_all(root, dry_run)
    commit_message = f"Deploy v{new_version} — {timestamp}"
    git_commit(root, commit_message, dry_run)
    print()

    # 3. Push to GitHub  →  Cloudflare Pages CI handles the rest
    print("Step 3/3 — Pushing to GitHub…")
    git_push(root, dry_run)
    print()

    if dry_run:
        print("=== DRY RUN complete — nothing was actually pushed ===")
    else:
        print("✓ Push complete!  Cloudflare Pages is now building…")
        print(f"  Dashboard : https://dash.cloudflare.com/ → Pages → commandzero")
        print(f"  Live URL  : {CF_PAGES_URL}")
        print(f"  Commit    : {commit_message}")


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"\n✗ Error: {exc}", file=sys.stderr)
        sys.exit(1)
