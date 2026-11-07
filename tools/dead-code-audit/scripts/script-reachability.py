"""Reachability of script files from real entry points (not just "someone mentions it").
Usage: python3 -I script-reachability.py <repo> <out.tsv> <dir> [<dir>...]
ROOTS = files that a human/CI/hook actually executes from: package.json files, .husky/*,
.github/workflows/*, .claude/settings.json, .claude/commands/*, .claude/skills/**, .claude/agents/*,
.cursor/**, AGENTS.md, CLAUDE.md, kit.config.json, render.yaml, playwright*.config.ts, plus app code
(src/, server/ excluding server/scripts and server/migrations/tools).
A script is REACHABLE if a root mentions it, or a reachable script mentions it (BFS).
A script mentioned only by other unreachable scripts is an ISLAND (closed cluster)."""
import os, re, subprocess, sys
repo, out, *dirs = sys.argv[1:]
ROOT_RE = re.compile(r'^(package\.json|server/package\.json|\.husky/|\.github/workflows/|\.claude/(settings\.json|commands/|skills/|agents/)|\.cursor/|AGENTS\.md|CLAUDE\.md|kit\.config\.json|render\.yaml|playwright[^/]*\.config\.ts|src/|server/(?!scripts/|migrations/tools/|test/))')
GLOB_ROOTS = {'scripts/test/': 'package.json test:scripts glob', 'server/test/': 'vitest include glob'}
files = []
for d in dirs:
    for root, _, fs in os.walk(os.path.join(repo, d)):
        if any(x in root for x in ('node_modules', 'fixtures', 'generated', 'source-data')): continue
        for f in fs:
            if f.endswith(('.mjs', '.js', '.cjs', '.ps1', '.sh', '.py')):
                files.append(os.path.relpath(os.path.join(root, f), repo))
fileset = set(files)
callers = {}
for f in files:
    base = os.path.basename(f); stem = os.path.splitext(base)[0]
    pat = re.escape(base) + '|' + re.escape(stem) + r"['\"]"
    r = subprocess.run(['git', 'grep', '-lE', pat], cwd=repo, capture_output=True, text=True)
    callers[f] = [h for h in r.stdout.split('\n') if h and h != f]
reach = {}
for f in files:
    if any(f.startswith(g) and f.endswith('.test.mjs') for g in ('scripts/test/',)): reach[f] = GLOB_ROOTS['scripts/test/']
    roots = [c for c in callers[f] if ROOT_RE.match(c) and c not in fileset]
    if roots: reach[f] = roots[0]
changed = True
while changed:
    changed = False
    for f in files:
        if f in reach: continue
        via = [c for c in callers[f] if c in reach]
        if via: reach[f] = 'via ' + via[0]; changed = True
rows = []
for f in sorted(files):
    if f in reach: cls = 'REACHABLE'
    elif any(c in fileset for c in callers[f]): cls = 'ISLAND'
    elif callers[f]: cls = 'DOCS-ONLY'
    else: cls = 'NO-REFS'
    rows.append((cls, f, reach.get(f, ''), ';'.join(callers[f][:3]), subprocess.run(['git', 'log', '-1', '--format=%cs', '--', f], cwd=repo, capture_output=True, text=True).stdout.strip()))
with open(out, 'w') as o:
    o.write('class\tfile\treached_from\tsome_callers\tlast_commit\n')
    for r in rows: o.write('\t'.join(r) + '\n')
from collections import Counter
print(Counter(r[0] for r in rows))
