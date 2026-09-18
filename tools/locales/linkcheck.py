"""Ask the dev server for every URL the built pages reference.

    npm run dev          (or: node dev-server.js . 5174)
    python tools/locales/linkcheck.py

Every href and src on every built page, plus the sitemap's URLs, are
requested against the local server. Anything that is not 200 is printed
with the page that pointed at it. External links are listed, not fetched.
"""
import os
import re
import sys
import urllib.request
import urllib.error

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
BASE = 'http://localhost:5174'
LANGS = ('en', 'sq', 'de', 'fr', 'it', 'es', 'pt', 'nl', 'sv', 'tr')

pages = []
for code in LANGS:
    folder = os.path.join(ROOT, code)
    if not os.path.isdir(folder):
        continue
    for name in sorted(os.listdir(folder)):
        if name.endswith('.html'):
            pages.append((code, name, os.path.join(folder, name)))
for name in ('404.html',):
    pages.append(('', name, os.path.join(ROOT, name)))

REF = re.compile(r'(?:href|src)="([^"#][^"]*)"')
cache = {}
problems = []
external = set()


def check(url):
    if url in cache:
        return cache[url]
    req = urllib.request.Request(BASE + url, method='GET', headers={'User-Agent': 'linkcheck'})
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            cache[url] = r.status
    except urllib.error.HTTPError as e:
        cache[url] = e.code
    except Exception as e:
        cache[url] = str(e)
    return cache[url]


for code, name, path in pages:
    html = open(path, encoding='utf-8').read()
    where = '/%s/%s' % (code, name) if code else '/' + name
    for ref in set(REF.findall(html)):
        if ref.startswith(('http://', 'https://', 'mailto:', 'tel:', 'data:')):
            external.add(ref.split('?')[0])
            continue
        url = ref if ref.startswith('/') else '/' + ref
        status = check(url.split('#')[0])
        if status != 200:
            problems.append((where, ref, status))

print('checked %d pages, %d distinct URLs' % (len(pages), len(cache)))
if problems:
    for where, ref, status in sorted(set(problems)):
        print('  %-28s %-46s %s' % (where, ref[:46], status))
    print('%d broken references' % len(set(problems)))
else:
    print('no broken references')

print('\nexternal links referenced (not fetched):')
for e in sorted(external):
    print('  ' + e)
sys.exit(1 if problems else 0)
