#!/usr/bin/env python3

from __future__ import annotations

import sys
from pathlib import Path


def main() -> int:
    core_scripts = Path(__file__).resolve().parents[2] / "vibe-core" / "scripts"
    if str(core_scripts) not in sys.path:
        sys.path.insert(0, str(core_scripts))
    from session_tool import main as session_main

    return session_main(["annotate", *sys.argv[1:]])


if __name__ == "__main__":
    raise SystemExit(main())
