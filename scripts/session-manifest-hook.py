#!/usr/bin/env python3
"""
PostToolUse hook — thin wrapper. The logic lives in scripts/lib/session-manifest.mjs (node); Claude Code runs it as
`guard.mjs manifest`. This file stays for hosts that call the script by name: it pipes stdin to that mode.
"""
import os
import subprocess
import sys


def main():
    here = os.path.dirname(os.path.abspath(__file__))
    try:
        subprocess.run(['node', os.path.join(here, 'lib', 'guard.mjs'), 'manifest'], input=sys.stdin.buffer.read(), timeout=5)
    except Exception:
        pass


if __name__ == '__main__':
    main()
