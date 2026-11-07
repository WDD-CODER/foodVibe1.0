"""Classify knip 'unused export' findings.
Usage: python3 -I classify-exports.py <repo> <knip-prod.json> <knip-dev.json> <out.tsv>
For every export knip-prod flags: count word-boundary hits of the symbol
 - in its own file (minus the declaration line)
 - in *.spec.ts files
 - in other non-spec source (src/, server/, shared/, scripts/) incl. .html
and whether knip-dev (tests as entries) also flags it.
Class: DEAD (no use anywhere), EXPORT-ONLY (used inside its own file only),
TEST-ONLY (used only by specs), CHECK (hits elsewhere: strings/templates/server)."""
import json, os, re, subprocess, sys
repo, prod, dev, out = sys.argv[1:5]
def items(path):
    d = json.load(open(path)); r = set()
    for i in d['issues']:
        for k in ('exports', 'types'):
            for e in i.get(k) or []:
                r.add((i['file'], e['name'], k))
    return r
P, D = items(prod), items(dev)
def grep(name, paths, extra=()):
    cmd = ['grep', '-rlwE', re.escape(name), *paths, '--include=*.ts', '--include=*.js',
           '--include=*.mjs', '--include=*.cjs', '--include=*.html', *extra]
    r = subprocess.run(cmd, cwd=repo, capture_output=True, text=True)
    return [l for l in r.stdout.split('\n') if l and '/node_modules/' not in l and '/dist/' not in l and 'fixtures/' not in l]
rows = []
for f, name, kind in sorted(P):
    own = open(os.path.join(repo, f), encoding='utf-8').read()
    own_hits = len(re.findall(r'\b' + re.escape(name) + r'\b', own)) - 1
    files = grep(name, ['src', 'server', 'shared', 'scripts'])
    files = [x for x in files if x != f]
    spec = [x for x in files if '.spec.' in x or '/test/' in x or x.endswith('.test.js') or x.endswith('.test.mjs')]
    other = [x for x in files if x not in spec]
    if other: cls = 'CHECK'
    elif spec and own_hits <= 0: cls = 'TEST-ONLY'
    elif spec: cls = 'TEST+INTERNAL'
    elif own_hits > 0: cls = 'EXPORT-ONLY'
    else: cls = 'DEAD'
    rows.append((cls, kind, f, name, own_hits, len(spec), ';'.join(other[:4]), 'dev-flagged' if (f, name, kind) in D else ''))
with open(out, 'w') as o:
    o.write('class\tkind\tfile\tsymbol\town_hits\tspec_files\tother_files\tdev\n')
    for r in rows: o.write('\t'.join(map(str, r)) + '\n')
from collections import Counter
print(Counter(r[0] for r in rows))
