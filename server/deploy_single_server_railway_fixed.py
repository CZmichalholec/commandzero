#!/usr/bin/env python3
import argparse
import json
import os
import shutil
import subprocess
import sys
from pathlib import Path


def is_windows():
    return os.name == "nt"


def find_command(*names):
    for name in names:
        path = shutil.which(name)
        if path:
            return path
    return None


def resolve_node():
    return find_command("node.exe", "node") if is_windows() else find_command("node")


def resolve_npm():
    if is_windows():
        return find_command("npm.cmd", "npm.exe", "npm")
    return find_command("npm")


def resolve_npx():
    if is_windows():
        return find_command("npx.cmd", "npx.exe", "npx")
    return find_command("npx")


def resolve_railway():
    if is_windows():
        return find_command("railway.cmd", "railway.exe", "railway")
    return find_command("railway")


def run(cmd, check=True):
    print(">", " ".join(cmd))
    return subprocess.run(cmd, check=check)


def capture(cmd):
    return subprocess.run(cmd, capture_output=True, text=True)


def fail(msg):
    print(f"\nChyba: {msg}")
    sys.exit(1)


def ensure_server_js():
    if not Path("server.js").exists():
        fail("ve složce není server.js")


def write_minimal_package_json():
    pkg_path = Path("package.json")
    if pkg_path.exists():
        print("OK: package.json už existuje")
        return

    pkg = {
        "name": "railway-server",
        "version": "1.0.0",
        "private": True,
        "main": "server.js",
        "scripts": {
            "start": "node server.js"
        },
        "dependencies": {
            "ws": "^8.18.3"
        }
    }

    pkg_path.write_text(json.dumps(pkg, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print("Vytvořeno minimální package.json")


def ensure_package_json_content():
    pkg_path = Path("package.json")
    if not pkg_path.exists():
        fail("package.json neexistuje")

    try:
        data = json.loads(pkg_path.read_text(encoding="utf-8"))
    except Exception as e:
        fail(f"package.json nejde přečíst: {e}")

    changed = False
    scripts = data.setdefault("scripts", {})
    if scripts.get("start") != "node server.js":
        scripts["start"] = "node server.js"
        changed = True

    deps = data.setdefault("dependencies", {})
    if "ws" not in deps:
        deps["ws"] = "^8.18.3"
        changed = True

    if changed:
        pkg_path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        print("Upraven package.json (start + ws)")
    else:
        print("OK: package.json už obsahuje start script i ws")


def ensure_node_and_npm():
    node = resolve_node()
    npm = resolve_npm()

    if not node:
        fail(
            "nenašla jsem Node.js v PATH.\n"
            "Nainstaluj Node.js z oficiálního instalátoru a pak zavři/otevři terminál znovu.\n"
            "Ověření:\n"
            "  node -v\n"
            "  npm -v"
        )

    if not npm:
        fail(
            "nenašla jsem npm v PATH.\n"
            "To přesně odpovídá chybě WinError 2 v tracebacku.\n"
            "Po instalaci Node.js zkus v novém terminálu:\n"
            "  node -v\n"
            "  npm -v\n"
            "Teprve potom spusť skript znovu."
        )

    print(f"OK: Node.js nalezeno: {node}")
    print(f"OK: npm nalezeno: {npm}")
    return node, npm


def ensure_node_modules(npm_cmd):
    if Path("node_modules").exists():
        print("OK: node_modules existuje")
        return
    print("Instaluji npm závislosti...")
    run([npm_cmd, "install"])


def ensure_railway_cli(npm_cmd):
    railway = resolve_railway()
    if railway:
        print(f"OK: Railway CLI nalezeno: {railway}")
        return railway

    print("Railway CLI není nainstalované. Instaluji přes npm...")
    run([npm_cmd, "install", "-g", "@railway/cli"])

    railway = resolve_railway()
    if railway:
        print(f"OK: Railway CLI nainstalováno: {railway}")
        return railway

    npx = resolve_npx()
    if npx:
        print("Railway CLI není globálně v PATH, použiji npx variantu.")
        return None

    fail("Railway CLI se nepodařilo najít ani po instalaci.")


def railway_cmd_parts(railway_path):
    if railway_path:
        return [railway_path]

    npx = resolve_npx()
    if not npx:
        fail("nenašla jsem npx, takže nejde spustit Railway CLI ani přes npx")
    return [npx, "@railway/cli"]


def is_logged_in(railway_path):
    result = capture(railway_cmd_parts(railway_path) + ["whoami"])
    return result.returncode == 0


def ensure_login(railway_path):
    if is_logged_in(railway_path):
        print("OK: už jsi přihlášený do Railway.")
        return
    print("Nejsi přihlášený. Otevírám Railway login...")
    run(railway_cmd_parts(railway_path) + ["login"])


def ensure_init(railway_path, do_init=False):
    if do_init:
        print("Spouštím railway init...")
        run(railway_cmd_parts(railway_path) + ["init"])
    else:
        print("Přeskakuji railway init. Pokud projekt ještě není propojený, spusť skript s --init.")


def deploy(railway_path):
    print("Spouštím deploy přes railway up...")
    run(railway_cmd_parts(railway_path) + ["up"])


def maybe_create_domain(railway_path):
    print("Zkouším vytvořit public domain...")
    result = subprocess.run(railway_cmd_parts(railway_path) + ["domain"])
    if result.returncode != 0:
        print("Public domain se nepodařilo vytvořit automaticky.")
        print("Zkus ji v Railway dashboardu nebo znovu přes railway domain.")


def main():
    parser = argparse.ArgumentParser(description="Deploy jediného server.js souboru na Railway")
    parser.add_argument("--init", action="store_true", help="Spustí railway init před deployem")
    parser.add_argument("--domain", action="store_true", help="Po deployi zkusí vytvořit public domain")
    parser.add_argument("--skip-npm-install", action="store_true", help="Přeskočí npm install")
    args = parser.parse_args()

    ensure_server_js()

    print("Kontroluji Node.js a npm...")
    _, npm_cmd = ensure_node_and_npm()

    print("\nPřipravuji package.json pro samotný server.js...")
    write_minimal_package_json()
    ensure_package_json_content()

    if not args.skip_npm_install:
        print()
        ensure_node_modules(npm_cmd)

    print("\nKontroluji Railway CLI...")
    railway_path = ensure_railway_cli(npm_cmd)

    print("\nKontroluji přihlášení...")
    ensure_login(railway_path)

    print("\nKontroluji inicializaci projektu...")
    ensure_init(railway_path, args.init)

    print("\nNasazuji aplikaci...")
    deploy(railway_path)

    if args.domain:
        print()
        maybe_create_domain(railway_path)

    print("\nHotovo.")
    print("První spuštění:")
    print("  python deploy_single_server_railway_fixed.py --init --domain")
    print("Další deploy:")
    print("  python deploy_single_server_railway_fixed.py")


if __name__ == "__main__":
    main()
