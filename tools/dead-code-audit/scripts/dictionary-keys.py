"""Find dictionary.json keys no code mentions.
Usage: python3 -I dictionary-keys.py <repo> <out.tsv>
A key is LITERAL-USED if it appears as a quoted string (or bare word in a template) anywhere in
src/, server/ or shared/. Otherwise, if a dynamic key builder exists whose literal prefix/suffix
matches (`'prefix_' + x`, `prefix_${x}`, `x + '_suffix'`), it is DYNAMIC-POSSIBLE; else UNUSED.
Groups that hold data values (units, categories, allergens, ...) are translated from stored
entity fields, so only their presence in seed/master data counts - reported separately."""
import json, os, re, sys
repo, out = sys.argv[1:3]
d = json.load(open(os.path.join(repo, 'public/assets/data/dictionary.json'), encoding='utf-8'))
corpus = []
for base in ('src', 'server', 'shared'):
    for root, dirs, fs in os.walk(os.path.join(repo, base)):
        if 'node_modules' in root or 'generated' in root: continue
        for f in fs:
            if f.endswith(('.ts', '.html', '.js', '.json')) and '.spec.' not in f and 'dictionary.json' not in f:
                corpus.append(open(os.path.join(root, f), encoding='utf-8', errors='ignore').read())
text = '\n'.join(corpus)
quoted = set(re.findall(r"""['"`]([A-Za-z0-9_.\- ]+)['"`]""", text))
words = set(re.findall(r'[A-Za-z0-9_]+', text))
prefixes = set(re.findall(r"""['"`]([A-Za-z0-9_]+_)['"`]\s*\+""", text)) | set(re.findall(r"""`([A-Za-z0-9_]+_)\$\{""", text))
suffixes = set(re.findall(r"""\+\s*['"`](_[A-Za-z0-9_]+)['"`]""", text)) | set(re.findall(r"""\}(_[A-Za-z0-9_]+)`""", text))
rows = []
for group, entries in d.items():
    for key in entries:
        k = key.lower()
        if key in quoted or k in quoted: cls = 'USED'
        elif any(k.startswith(p.lower()) for p in prefixes) or any(k.endswith(s.lower()) for s in suffixes): cls = 'DYNAMIC-POSSIBLE'
        elif key in words: cls = 'BARE-WORD'  # e.g. enum member / field name that may be translated as a value
        else: cls = 'UNUSED'
        rows.append((cls, group, key))
with open(out, 'w', encoding='utf-8') as o:
    o.write('class\tgroup\tkey\n')
    for r in rows: o.write('\t'.join(r) + '\n')
from collections import Counter
c = Counter((r[1], r[0]) for r in rows)
for g in d: print(g, {k[1]: v for k, v in c.items() if k[0] == g})
