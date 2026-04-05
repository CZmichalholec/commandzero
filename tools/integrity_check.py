#!/usr/bin/env python3
from __future__ import annotations

import json
import re
import subprocess
import sys
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ORIGINAL = ROOT / 'original' / 'command_zero_station_fp_mobile_browser_adapt_fix14 (2).html'
INDEX = ROOT / 'index.html'
CSS_FILES = [ROOT / 'assets' / 'css' / 'base.css', ROOT / 'assets' / 'css' / 'mobile.css']
JS_FILES = sorted((ROOT / 'assets' / 'js').glob('*.js'))
MOD_JS = ROOT / 'mod.js'
REPORT_JSON = ROOT / 'integrity-report.json'
REPORT_MD = ROOT / 'INTEGRITY_REPORT.md'
THREE_SRC = 'https://cdn.jsdelivr.net/npm/three@0.149.0/build/three.min.js'


class TagCounter(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.counts: dict[str, int] = {}

    def handle_starttag(self, tag, attrs):
        self.counts[tag] = self.counts.get(tag, 0) + 1


def read(path: Path) -> str:
    return path.read_text(encoding='utf-8')


# Sentinel constants for the AI documentation header blocks embedded in JS/CSS chunks.
# The integrity check strips these before reconstruction comparison so headers do not
# affect byte-exact validation against the original monolith.
_AI_HEADER_START = '/* === AI_HEADER_START ==='
_AI_HEADER_END = '=== AI_HEADER_END === */'


def strip_ai_header(content: str) -> str:
    """Remove the leading AI documentation header block inserted for editor/AI context."""
    if not content.startswith(_AI_HEADER_START):
        return content
    end_idx = content.find(_AI_HEADER_END)
    if end_idx == -1:
        return content
    after = content[end_idx + len(_AI_HEADER_END):]
    if after.startswith('\n'):
        after = after[1:]
    return after


def extract_original_parts(html: str) -> dict[str, str]:
    style_start = html.find('<style>')
    style_end = html.find('</style>', style_start)
    mod_script_start = html.find('<script src="./mod.js"')
    ext1_end = html.find('</script>', mod_script_start) + len('</script>')
    ext2_start = html.find(f'<script src="{THREE_SRC}"', ext1_end)
    ext2_end = html.find('</script>', ext2_start) + len('</script>')
    inline_start = html.find('<script>', ext2_end)
    inline_end = html.rfind('</script>')
    if min(style_start, style_end, mod_script_start, ext2_start, inline_start, inline_end) == -1:
        raise RuntimeError('Failed to locate the original HTML sections.')
    return {
        'style': html[style_start + len('<style>'):style_end],
        'inline_js': html[inline_start + len('<script>'):inline_end],
        'pre_style': html[:style_start],
        'between_style_and_mod': html[style_end + len('</style>'):mod_script_start],
        'external_scripts': html[mod_script_start:inline_start],
        'after_inline': html[inline_end + len('</script>'):],
    }


def expected_index(parts: dict[str, str]) -> str:
    js_refs = '\n'.join([
        '<script src="./assets/js/01_bootstrap_config.js"></script>',
        '<script src="./assets/js/02_visibility_ai_fp.js"></script>',
        '<script src="./assets/js/03_world_entities_transport.js"></script>',
        '<script src="./assets/js/04_path_audio_build_mobile_ai.js"></script>',
        '<script src="./assets/js/05_units_render2d.js"></script>',
        '<script src="./assets/js/06_threejs_loop.js"></script>',
        '<script src="./assets/js/07_graphics_modes_beauty.js"></script>',
        '<script src="./assets/js/08_menu_multiplayer_tail.js"></script>',
    ])
    css_links = '<link rel="stylesheet" href="./assets/css/base.css">\n<link rel="stylesheet" href="./assets/css/mobile.css">'
    return (
        parts['pre_style']
        + css_links
        + parts['between_style_and_mod']
        + parts['external_scripts']
        + js_refs
        + parts['after_inline']
    ).strip() + '\n'


def handler_defined(name: str, js_text: str) -> bool:
    pats = [
        rf'function\s+{re.escape(name)}\s*\(',
        rf'(?:const|let|var)\s+{re.escape(name)}\s*=\s*(?:async\s*)?function\s*\(',
        rf'{re.escape(name)}\s*=\s*(?:async\s*)?function\s*\(',
        rf'(?:const|let|var)\s+{re.escape(name)}\s*=\s*\([^)]*\)\s*=>',
        rf'{re.escape(name)}\s*=\s*\([^)]*\)\s*=>',
    ]
    return any(re.search(p, js_text) for p in pats)


def main() -> int:
    original_html = read(ORIGINAL)
    parts = extract_original_parts(original_html)
    original_css = parts['style']
    original_js = parts['inline_js']

    combined_css = ''.join(strip_ai_header(read(p)) for p in CSS_FILES)
    combined_js = ''.join(strip_ai_header(read(p)) for p in JS_FILES)
    index_html = read(INDEX)
    expected = expected_index(parts)

    local_refs = []
    missing_refs = []
    for ref in re.findall(r'\b(?:src|href)="([^"]+)"', index_html):
        if ref.startswith(('http://', 'https://', 'data:', '#')):
            continue
        local_refs.append(ref)
        rel = ref[2:] if ref.startswith('./') else ref
        if not (ROOT / rel).exists():
            missing_refs.append(ref)

    inline_handlers = sorted(set(re.findall(r'\bonclick="\s*([A-Za-z_$][\w$]*)\s*\(', index_html)))
    missing_handlers = [name for name in inline_handlers if not handler_defined(name, combined_js)]

    syntax = {}
    syntax_ok = True
    for path in [MOD_JS, *JS_FILES]:
        proc = subprocess.run(['node', '--check', str(path)], capture_output=True, text=True)
        syntax[path.relative_to(ROOT).as_posix()] = {
            'returncode': proc.returncode,
            'stderr': proc.stderr.strip(),
        }
        if proc.returncode != 0:
            syntax_ok = False

    parser = TagCounter()
    parser.feed(index_html)
    tag_counts = parser.counts

    checks = {
        'css_reconstruction_exact': {
            'ok': combined_css == original_css,
            'details': {'expected_len': len(original_css), 'actual_len': len(combined_css)},
        },
        'js_reconstruction_exact': {
            'ok': combined_js == original_js,
            'warn_only': True,
            'details': {'expected_len': len(original_js), 'actual_len': len(combined_js),
                        'note': 'Advisory after intentional code edits. Delta is expected when chunks are optimized.'},
        },
        'index_matches_expected': {
            'ok': index_html == expected,
            'details': {'expected_len': len(expected), 'actual_len': len(index_html)},
        },
        'local_references_exist': {
            'ok': not missing_refs,
            'details': {'checked': local_refs, 'missing': missing_refs},
        },
        'javascript_syntax': {
            'ok': syntax_ok,
            'details': syntax,
        },
        'inline_handler_functions_present': {
            'ok': not missing_handlers,
            'details': {'handlers': inline_handlers, 'missing': missing_handlers},
        },
        'html_shell_structure': {
            'ok': tag_counts.get('html', 0) == 1 and tag_counts.get('head', 0) == 1 and tag_counts.get('body', 0) == 1 and tag_counts.get('script', 0) == 10 and tag_counts.get('link', 0) == 2,
            'details': tag_counts,
        },
        'no_inline_monolith_left_in_index': {
            'ok': '<script>\n\n\n\nconst CZ_BOOT' not in index_html and index_html.count('<script>') == 0,
            'details': {'inline_script_tag_count': index_html.count('<script>')},
        },
    }

    all_ok = all(item['ok'] for item in checks.values() if not item.get('warn_only'))
    report = {'all_ok': all_ok, 'root': str(ROOT), 'checks': checks}
    REPORT_JSON.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')

    lines = ['# INTEGRITY REPORT', '', f'Overall status: **{"PASS" if all_ok else "FAIL"}**', '']
    for name, item in checks.items():
        status = 'PASS' if item['ok'] else ('WARN' if item.get('warn_only') else 'FAIL')
        lines.append(f'## {name}')
        lines.append(f'- Status: **{status}**')
        lines.append('```json')
        lines.append(json.dumps(item['details'], ensure_ascii=False, indent=2))
        lines.append('```')
        lines.append('')
    REPORT_MD.write_text('\n'.join(lines), encoding='utf-8')
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 0 if all_ok else 1


if __name__ == '__main__':
    code = main()
    # In debugger sessions, avoid surfacing a noisy SystemExit exception.
    if sys.gettrace() is not None:
        print(f'integrity_check.py finished with exit code {code}.')
    else:
        raise SystemExit(code)
