"""Audit the built site.

    python tools/locales/audit.py

Checks what a crawler would check, over the generated pages rather than
the English sources: unique titles and descriptions, exactly one H1,
canonical pointing at itself, hreflang sets that agree with each other,
images with real alt text and dimensions, internal links that resolve,
valid JSON-LD, and a sitemap that matches the files on disk.

Exits non-zero if anything is wrong, so it can gate a deploy.
"""
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
CONFIG = json.load(open(os.path.join(HERE, 'config.json'), encoding='utf-8'))
SITE = CONFIG['site']
BUILT = [l['code'] for l in CONFIG['languages'] if l['status'] == 'built']
APP = set(CONFIG['app_pages'])

problems = []
pages = {}


def note(kind, where, detail):
    problems.append((kind, where, detail))


def one(rx, s, flags=re.S | re.I):
    m = re.search(rx, s, flags)
    return m.group(1).strip() if m else None


for code in BUILT:
    folder = os.path.join(ROOT, code)
    for name in sorted(os.listdir(folder)):
        if not name.endswith('.html'):
            continue
        path = '/' + code + ('' if name == 'index.html' else '/' + name[:-5])
        pages[path] = open(os.path.join(folder, name), encoding='utf-8').read()

titles, descriptions = {}, {}

for path, html in sorted(pages.items()):
    title = one(r'<title>(.*?)</title>', html)
    desc = one(r'<meta name="description" content="(.*?)">', html)
    canon = one(r'<link rel="canonical" href="(.*?)">', html)
    robots = one(r'<meta name="robots" content="(.*?)">', html)
    h1 = re.findall(r'<h1\b[^>]*>(.*?)</h1>', html, re.S)
    lang = one(r'<html lang="([^"]+)"', html)

    if not title:
        note('missing title', path, '')
    if not desc:
        note('missing description', path, '')
    if title:
        titles.setdefault(title, []).append(path)
    if desc:
        descriptions.setdefault(desc, []).append(path)
    if len(title or '') > 65:
        note('long title', path, '%d chars' % len(title))
    if desc and len(desc) > 175:
        note('long description', path, '%d chars' % len(desc))

    if canon != SITE + path:
        note('canonical mismatch', path, canon)
    if robots and 'noindex' in robots:
        note('noindex on a public page', path, robots)
    if len(h1) == 0:
        note('missing H1', path, '')
    if len(h1) > 1:
        note('multiple H1', path, '%d' % len(h1))
    if lang != path.split('/')[1]:
        note('lang attribute', path, lang)

    # hreflang: every alternate must exist and point back
    alts = dict(re.findall(r'<link rel="alternate" hreflang="([^"]+)" href="([^"]+)">', html))
    if 'x-default' not in alts:
        note('no x-default', path, '')
    for code, url in alts.items():
        if code == 'x-default':
            continue
        target = url.replace(SITE, '')
        if target not in pages:
            note('hreflang to a missing page', path, url)
            continue
        back = dict(re.findall(r'<link rel="alternate" hreflang="([^"]+)" href="([^"]+)">', pages[target]))
        if back.get(path.split('/')[1]) != SITE + path:
            note('hreflang not reciprocal', path, url)

    # images
    for img in re.findall(r'<img\b[^>]*>', html):
        alt = one(r'alt="([^"]*)"', img, re.I)
        if alt is None:
            note('image without alt', path, img[:70])
        elif len(alt.split()) < 2:
            note('thin alt text', path, alt)
        if 'width=' not in img or 'height=' not in img:
            note('image without dimensions', path, img[:70])
        if 'loading=' not in img:
            note('image without loading hint', path, img[:70])

    # internal links resolve
    for href in set(re.findall(r'\shref="(/[^"]*)"', html)):
        target = href.split('#')[0].split('?')[0].rstrip('/')
        if not target or target.startswith('/assets/'):
            continue
        name = target.strip('/')
        if target in pages or name in APP:
            continue
        if os.path.exists(os.path.join(ROOT, name + '.html')) or os.path.exists(os.path.join(ROOT, name)):
            continue
        note('internal link to nowhere', path, href)

    # structured data parses
    for block in re.findall(r'<script type="application/ld\+json">(.*?)</script>', html, re.S):
        try:
            json.loads(block)
        except ValueError as e:
            note('invalid JSON-LD', path, str(e))

for title, where in titles.items():
    if len(where) > 1:
        note('duplicate title', ', '.join(where), title)
for desc, where in descriptions.items():
    if len(where) > 1:
        note('duplicate description', ', '.join(where), desc[:60])

# sitemap agrees with the files
sitemap = open(os.path.join(ROOT, 'sitemap.xml'), encoding='utf-8').read()
listed = set(re.findall(r'<loc>(.*?)</loc>', sitemap))
for url in listed:
    if url.replace(SITE, '') not in pages:
        note('sitemap lists a missing page', url, '')
for path in pages:
    if SITE + path not in listed:
        note('page missing from sitemap', path, '')

robots = open(os.path.join(ROOT, 'robots.txt'), encoding='utf-8').read()
if 'Sitemap: %s/sitemap.xml' % SITE not in robots:
    note('robots.txt', '', 'no sitemap line')
for line in re.findall(r'Disallow: (\S+)', robots):
    for path in pages:
        if path.startswith(line.rstrip('/')) and line != '/':
            note('robots.txt blocks a public page', path, line)

print('audited %d built pages' % len(pages))
if not problems:
    print('no problems found')
    sys.exit(0)
for kind, where, detail in problems:
    print('  %-34s %-28s %s' % (kind, where, detail[:70]))
print('%d problems' % len(problems))
sys.exit(1)
