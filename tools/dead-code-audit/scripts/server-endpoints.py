"""List every Express endpoint (router.<verb>('path')) and check whether any client/server/script
code references its path. Usage: python3 -I server-endpoints.py <repo> <out.tsv>
Path params (:id) are matched as wildcards; the router mount prefix comes from app.js app.use()."""
import os, re, sys
repo, out = sys.argv[1:3]
app = open(os.path.join(repo, 'server/app.js'), encoding='utf-8').read()
mounts = {}
for prefix, var in re.findall(r"app\.use\('([^']+)',\s*(\w+)\)", app):
    m = re.search(r"const\s+(?:\{\s*)?" + var + r"(?:\s*\})?\s*=\s*require\('([^']+)'\)", app)
    if m: mounts[os.path.normpath(os.path.join('server', m.group(1))) + '.js'] = prefix
client = []
for base in ('src/app', 'scripts', 'e2e', 'e2e-qa'):
    for root, _, fs in os.walk(os.path.join(repo, base)):
        for f in fs:
            if f.endswith(('.ts', '.mjs', '.js', '.html')):
                client.append(open(os.path.join(root, f), encoding='utf-8', errors='ignore').read())
client = '\n'.join(client)
rows = []
for rfile, prefix in mounts.items():
    src = open(os.path.join(repo, rfile), encoding='utf-8').read()
    for verb, path in re.findall(r"router\.(get|post|put|patch|delete)\(\s*['\"]([^'\"]+)['\"]", src):
        # last literal segment is the most specific thing a client must mention
        segs = [s for s in path.split('/') if s and not s.startswith(':')]
        needle = segs[-1] if segs else None
        if needle is None:
            cls = 'ROOT'  # e.g. GET /api/v1/data/:type - matched by prefix usage
            hit = prefix.split('/')[-1] in client
        else:
            hit = re.search(r"""['"`/]""" + re.escape(needle) + r"""(?![\w-])""", client) is not None
            cls = 'CALLED' if hit else 'NO-CALLER'
        rows.append((cls, verb.upper(), prefix + path, rfile))
with open(out, 'w') as o:
    o.write('class\tverb\tpath\tfile\n')
    for r in rows: o.write('\t'.join(r) + '\n')
from collections import Counter
print(Counter(r[0] for r in rows))
for r in rows:
    if r[0] == 'NO-CALLER': print('\t'.join(r))
