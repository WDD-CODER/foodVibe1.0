"""Find class members (methods/fields) in src/app *.ts that no other code or template mentions.
Angular-aware: counts word hits across every .ts and .html under src/ (template-only usage keeps
a member alive). Iterates to a fixpoint: the bodies of members found unused are blanked and the
scan repeats, so orphan chains (A is only called by dead B) surface as round>1.
Skips: decorator metadata above the class line, lifecycle/interface methods, and fields whose
initializer has side effects (effect(), afterNextRender(), destroyRef.onDestroy()).
Usage: python3 -I unused-members.py <repo> <out.tsv>"""
import os, re, sys
repo, out = sys.argv[1:3]
SKIP = {'constructor', 'ngOnInit', 'ngOnDestroy', 'ngOnChanges', 'ngAfterViewInit', 'ngAfterContentInit',
        'ngAfterViewChecked', 'ngAfterContentChecked', 'ngDoCheck', 'transform', 'canActivate', 'canDeactivate',
        'intercept', 'resolve', 'validate', 'writeValue', 'registerOnChange', 'registerOnTouched',
        'setDisabledState', 'handleError', 'toString', 'get', 'set', 'if', 'for', 'switch', 'return', 'while'}
SIDE_EFFECT = re.compile(r'=\s*(effect|afterNextRender|afterRender)\(|\.onDestroy\(|\.subscribe\(')
DECL = re.compile(r'^  (?:@\w+\([^)]*\)\s*)?(?:(?:public|protected|private|readonly|static|override|async|get|set)\s+)*([A-Za-z_$][\w$]*)\s*(?:[(<=:!?]|\s*=)')
texts = {}
for root, _, fs in os.walk(os.path.join(repo, 'src')):
    for f in fs:
        if f.endswith(('.ts', '.html')):
            p = os.path.join(root, f); texts[os.path.relpath(p, repo)] = open(p, encoding='utf-8').read()

def span(lines, start):
    """Line range of a member starting at index `start`: until braces/parens balance at indent 2."""
    depth = 0; opened = False
    for j in range(start, len(lines)):
        for ch in lines[j]:
            if ch in '{([': depth += 1; opened = True
            elif ch in '})]': depth -= 1
        if opened and depth <= 0: return start, j
        if not opened and j > start and re.match(r'^  \S', lines[j]): return start, j - 1
    return start, start

members = []  # (path, line_no, name, scope, (s, e))
for path, text in texts.items():
    if not path.endswith('.ts') or '.spec.' in path or '/testing/' in path: continue
    lines = text.split('\n')
    cl = next((i for i, l in enumerate(lines) if re.match(r'^export (default )?(abstract )?class ', l)), None)
    if cl is None: continue
    seen = set()
    for i in range(cl + 1, len(lines)):
        line = lines[i]
        if SIDE_EFFECT.search(line): continue
        m = DECL.match(line)
        if not m or m.group(1) in SKIP or m.group(1) in seen: continue
        seen.add(m.group(1))
        scope = 'private' if 'private' in line.split(m.group(1))[0] else 'public'
        members.append((path, i + 1, m.group(1), scope, span(lines, i)))

dead = {}  # (path, name) -> round
spec_corpus = '\n'.join(t for k, t in texts.items() if '.spec.' in k)
rnd = 0
while True:
    rnd += 1
    blank = {}
    for (path, ln, name, scope, (s, e)) in members:
        if (path, name) in dead: blank.setdefault(path, []).append((s, e))
    corpus = []
    for k, t in texts.items():
        if '.spec.' in k: continue
        if k in blank:
            ls = t.split('\n')
            for s, e in blank[k]:
                for j in range(s, e + 1): ls[j] = ''
            t = '\n'.join(ls)
        corpus.append(t)
    corpus = '\n'.join(corpus)
    new = 0
    for (path, ln, name, scope, _) in members:
        if (path, name) in dead: continue
        w = re.compile(r'(?<![\w$])' + re.escape(name) + r'(?![\w$])')
        if len(w.findall(corpus)) - 1 <= 0:
            dead[(path, name)] = rnd; new += 1
    if new == 0: break
rows = []
for (path, ln, name, scope, _) in members:
    if (path, name) not in dead: continue
    w = re.compile(r'(?<![\w$])' + re.escape(name) + r'(?![\w$])')
    spec = len(w.findall(spec_corpus))
    rows.append(('UNUSED' if spec == 0 else 'TEST-ONLY', scope, path, ln, name, dead[(path, name)], spec))
with open(out, 'w') as o:
    o.write('class\tscope\tfile\tline\tmember\tround\tspec_hits\n')
    for r in sorted(rows): o.write('\t'.join(map(str, r)) + '\n')
from collections import Counter
print(Counter((r[0], r[1]) for r in rows), 'rounds:', rnd - 1, 'chain(round>1):', sum(1 for r in rows if r[5] > 1))
