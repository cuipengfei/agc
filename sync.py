#!/usr/bin/env python3
"""仓库根目录兼容入口；实际实现位于 src/agc_sync。"""

from __future__ import annotations

import sys

from src.agc_sync.cli import main


if __name__ == "__main__":
    try:
        raise SystemExit(main(sys.argv[1:]))
    except (OSError, UnicodeError, ValueError, RuntimeError) as exc:
        print(str(exc), file=sys.stderr)
        raise SystemExit(2)
