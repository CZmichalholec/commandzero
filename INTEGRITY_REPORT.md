# INTEGRITY REPORT

Overall status: **FAIL**

## css_reconstruction_exact
- Status: **PASS**
```json
{
  "expected_len": 31612,
  "actual_len": 31612
}
```

## js_reconstruction_exact
- Status: **WARN**
```json
{
  "expected_len": 806062,
  "actual_len": 824462,
  "note": "Advisory after intentional code edits. Delta is expected when chunks are optimized."
}
```

## index_matches_expected
- Status: **FAIL**
```json
{
  "expected_len": 15190,
  "actual_len": 15182
}
```

## local_references_exist
- Status: **PASS**
```json
{
  "checked": [
    "./assets/css/base.css",
    "./assets/css/mobile.css",
    "./mod.js",
    "./assets/js/01_bootstrap_config.js",
    "./assets/js/02_visibility_ai_fp.js",
    "./assets/js/03_world_entities_transport.js",
    "./assets/js/04_path_audio_build_mobile_ai.js",
    "./assets/js/05_units_render2d.js",
    "./assets/js/06_threejs_loop.js",
    "./assets/js/07_graphics_modes_beauty.js",
    "./assets/js/08_menu_multiplayer_tail.js"
  ],
  "missing": []
}
```

## javascript_syntax
- Status: **PASS**
```json
{
  "mod.js": {
    "returncode": 0,
    "stderr": ""
  },
  "assets/js/01_bootstrap_config.js": {
    "returncode": 0,
    "stderr": ""
  },
  "assets/js/02_visibility_ai_fp.js": {
    "returncode": 0,
    "stderr": ""
  },
  "assets/js/03_world_entities_transport.js": {
    "returncode": 0,
    "stderr": ""
  },
  "assets/js/04_path_audio_build_mobile_ai.js": {
    "returncode": 0,
    "stderr": ""
  },
  "assets/js/05_units_render2d.js": {
    "returncode": 0,
    "stderr": ""
  },
  "assets/js/06_threejs_loop.js": {
    "returncode": 0,
    "stderr": ""
  },
  "assets/js/07_graphics_modes_beauty.js": {
    "returncode": 0,
    "stderr": ""
  },
  "assets/js/08_menu_multiplayer_tail.js": {
    "returncode": 0,
    "stderr": ""
  }
}
```

## inline_handler_functions_present
- Status: **PASS**
```json
{
  "handlers": [
    "buildCmd",
    "menuHideMP",
    "menuHideSP",
    "menuHideSettings",
    "menuShowMP",
    "menuShowSP",
    "menuShowSettings",
    "menuStartSP",
    "mpConnect",
    "mpDisconnect",
    "mpScanLAN"
  ],
  "missing": []
}
```

## html_shell_structure
- Status: **PASS**
```json
{
  "html": 1,
  "head": 1,
  "meta": 2,
  "title": 1,
  "link": 2,
  "body": 1,
  "div": 69,
  "h1": 2,
  "button": 50,
  "span": 89,
  "strong": 6,
  "small": 1,
  "label": 3,
  "input": 3,
  "b": 3,
  "canvas": 1,
  "br": 1,
  "script": 10
}
```

## no_inline_monolith_left_in_index
- Status: **PASS**
```json
{
  "inline_script_tag_count": 0
}
```
