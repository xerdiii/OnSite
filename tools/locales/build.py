"""Build the multilingual site.

    python tools/locales/build.py            # build, then report gaps
    python tools/locales/build.py --check    # report only, write nothing

The English pages in the repo root are the source. For every built
language this writes a real, fully translated page under /<code>/ with
its own title, description, canonical, hreflang set and structured data,
so a search engine sees the translation in the HTML without running any
JavaScript. It also writes sitemap.xml and the redirect table in
vercel.json, both of which are generated — do not edit them by hand.

What it does per page:
  · translates every visible string and the translatable attributes
    (assets/i18n/<code>.js, the same dictionary the runtime uses)
  · rewrites relative asset paths to absolute, because /de/preise is a
    directory deeper than the source
  · rewrites internal links to that language's slugs
  · replaces the head's SEO block with generated tags
  · keeps FAQ structured data in step with the translated questions
"""
import json
import os
import re
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
sys.path.insert(0, HERE)
from htmltext import translate, texts, collapse  # noqa: E402

CONFIG = json.load(open(os.path.join(HERE, 'config.json'), encoding='utf-8'))
SEO = json.load(open(os.path.join(HERE, 'seo.json'), encoding='utf-8'))
SITE = CONFIG['site']
BRAND = CONFIG['brand']
PAGES = CONFIG['pages']
BUILT = [l for l in CONFIG['languages'] if l['status'] == 'built']
BUILT_CODES = [l['code'] for l in BUILT]
APP_PAGES = set(CONFIG['app_pages'])

UNTRANSLATABLE = set(
    l.strip() for l in
    open(os.path.join(HERE, 'additions', '_untranslatable.txt'), encoding='utf-8')
    if l.strip())

PACKAGES = [
    ('Custom Website', '49', 'A single-page site with up to 20 sections from our 34.'),
    ('Website Redesign', '100', 'An existing site rebuilt, keeping the text and photographs.'),
    ('Full Website', '199', 'All 34 sections, plus search, analytics and the legal setup.'),
    ('Complete Package', '499', 'Branding, local SEO, three years of hosting and maintenance.'),
    ('Business Premium', '1049', 'The complete build with business email, automation and brand work.'),
]

READ_JS = ('global.window={};eval(require("fs").readFileSync(process.argv[1],"utf8"));'
           'process.stdout.write(JSON.stringify(window.SitehouseI18nStrings["%s"]))')


def dictionary(code):
    if code == 'en':
        return {}
    path = os.path.join(ROOT, 'assets', 'i18n', '%s.js' % code)
    out = subprocess.run(['node', '-e', READ_JS % code, path],
                         capture_output=True, text=True, encoding='utf-8')
    if out.returncode:
        sys.exit(out.stderr)
    return json.loads(out.stdout)


def esc(t):
    return (str(t).replace('&', '&amp;').replace('<', '&lt;')
            .replace('>', '&gt;').replace('"', '&quot;'))


def page_by_key(key):
    for p in PAGES:
        if p['key'] == key:
            return p
    return None


def url_for(key, code):
    page = page_by_key(key)
    if page.get('english_only'):
        code = 'en'
    slug = page['slugs'].get(code)
    if slug is None:
        return None
    return SITE + '/' + code + ('/' + slug if slug else '')


def path_for(key, code):
    page = page_by_key(key)
    if page.get('english_only'):
        code = 'en'
    slug = page['slugs'].get(code)
    return '/' + code + ('/' + slug if slug else '')


def languages_for(key):
    page = page_by_key(key)
    return ['en'] if page.get('english_only') else BUILT_CODES


# ── The head ──────────────────────────────────────────────────────
def hreflang_block(key):
    out = []
    for code in languages_for(key):
        out.append('<link rel="alternate" hreflang="%s" href="%s">' % (code, url_for(key, code)))
    out.append('<link rel="alternate" hreflang="x-default" href="%s">' % url_for(key, 'en'))
    return out


def json_ld(key, code, title, description, kept_faq):
    url = url_for(key, code)
    lang = code
    name = title.split(' | ')[0].split(' — ')[0].strip()
    graph = []

    org_id = SITE + '/#organization'
    site_id = SITE + '/#website'

    if key == 'home':
        graph.append({
            '@type': 'Organization', '@id': org_id, 'name': BRAND, 'alternateName': 'Xovah',
            'url': SITE, 'email': 'info@xovahweb.com',
            'logo': {'@type': 'ImageObject', 'url': SITE + '/assets/brand/xovah-logo-ink-v2.png',
                     'width': 473, 'height': 340},
            'image': SITE + '/assets/brand/xovah-card-v2.png',
            'description': description,
            'contactPoint': [{
                '@type': 'ContactPoint', 'contactType': 'sales', 'email': 'info@xovahweb.com',
                'availableLanguage': BUILT_CODES}],
        })
        graph.append({
            '@type': 'WebSite', '@id': site_id, 'url': SITE, 'name': BRAND,
            'publisher': {'@id': org_id}, 'inLanguage': lang,
        })
        graph.append({
            '@type': 'ProfessionalService', '@id': SITE + '/#service', 'name': BRAND, 'url': url,
            'image': SITE + '/assets/brand/xovah-card-v2.png', 'email': 'info@xovahweb.com',
            'parentOrganization': {'@id': org_id},
            'areaServed': [{'@type': 'Country', 'name': 'Kosovo'}, {'@type': 'Place', 'name': 'Europe'}],
            'serviceType': ['Web design', 'Website development', 'Landing page design',
                            'Local SEO', 'Website maintenance'],
            'priceRange': '€50–€500',
        })

    webpage = {
        '@type': 'ContactPage' if key == 'contact' else 'WebPage',
        '@id': url + '#webpage', 'url': url, 'name': name, 'description': description,
        'isPartOf': {'@id': site_id}, 'about': {'@id': org_id}, 'inLanguage': lang,
    }
    graph.append(webpage)

    if key != 'home':
        graph.append({
            '@type': 'BreadcrumbList', '@id': url + '#breadcrumb',
            'itemListElement': [
                {'@type': 'ListItem', 'position': 1, 'name': BRAND, 'item': url_for('home', code)},
                {'@type': 'ListItem', 'position': 2, 'name': name},
            ],
        })

    if key == 'pricing':
        graph.append({
            '@type': 'Service', '@id': url + '#packages', 'serviceType': 'Website design',
            'provider': {'@id': org_id}, 'areaServed': {'@type': 'Place', 'name': 'Europe'},
            'hasOfferCatalog': {
                '@type': 'OfferCatalog', 'name': name,
                'itemListElement': [{
                    '@type': 'Offer', 'name': pname, 'price': price, 'priceCurrency': 'EUR',
                    'description': pdesc, 'url': url,
                    'availability': 'https://schema.org/InStock',
                } for pname, price, pdesc in PACKAGES],
            },
        })

    if key == 'services':
        graph.append({
            '@type': 'Service', '@id': url + '#services', 'serviceType': [
                'Website design', 'Website development', 'Online booking setup', 'Local SEO',
                'Analytics setup', 'Logo design', 'Business email setup', 'Website maintenance'],
            'provider': {'@id': org_id}, 'areaServed': {'@type': 'Place', 'name': 'Europe'},
            'name': name,
        })

    if kept_faq:
        kept_faq['@id'] = url + '#faq'
        kept_faq['inLanguage'] = lang
        graph.append(kept_faq)

    return json.dumps({'@context': 'https://schema.org', '@graph': graph},
                      ensure_ascii=False, separators=(',', ':'))


def head_block(key, code, lang_meta, title, description, kept_faq):
    url = url_for(key, code)
    card = SITE + '/assets/brand/xovah-card-v2.png'
    alt = '%s — %s' % (BRAND, description.split('.')[0])
    alternates = [l for l in BUILT if l['code'] != code and code in page_by_key(key)['slugs']]
    out = [
        '<title>%s</title>' % esc(title),
        '<meta name="description" content="%s">' % esc(description),
        '<link rel="canonical" href="%s">' % url,
        '<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1">',
        '',
    ]
    out += hreflang_block(key)
    out += [
        '',
        '<meta property="og:type" content="website">',
        '<meta property="og:site_name" content="%s">' % BRAND,
        '<meta property="og:locale" content="%s">' % lang_meta['locale'],
    ]
    if not page_by_key(key).get('english_only'):
        out += ['<meta property="og:locale:alternate" content="%s">' % l['locale'] for l in alternates]
    out += [
        '<meta property="og:url" content="%s">' % url,
        '<meta property="og:title" content="%s">' % esc(title),
        '<meta property="og:description" content="%s">' % esc(description),
        '<meta property="og:image" content="%s">' % card,
        '<meta property="og:image:width" content="1200">',
        '<meta property="og:image:height" content="630">',
        '<meta property="og:image:alt" content="%s">' % esc(alt),
        '',
        '<meta name="twitter:card" content="summary_large_image">',
        '<meta name="twitter:url" content="%s">' % url,
        '<meta name="twitter:title" content="%s">' % esc(title),
        '<meta name="twitter:description" content="%s">' % esc(description),
        '<meta name="twitter:image" content="%s">' % card,
        '<meta name="twitter:image:alt" content="%s">' % esc(alt),
        '',
        '<script type="application/ld+json">%s</script>' % json_ld(key, code, title, description, kept_faq),
    ]
    return '\n'.join(out)


# ── Rewriting the body ────────────────────────────────────────────
# What each English source filename becomes in a language's URLs. Names
# that no longer have a page of their own point at the page that replaced
# them, so an old link in hand-written markup still lands somewhere real.
# 'build' is deliberately absent: it is an app page, so it falls through
# to the APP_PAGES branch below and stays /build. Mapping it to 'services'
# aimed every "Start a Project" button in every language at the extras
# list instead of the builder, which left the builder reachable only by
# typing its address.
LINK_KEYS = {'index': 'home', 'pricing': 'pricing', 'extras': 'services',
             'features': 'features', 'contact': 'contact', 'faq': 'faq',
             'terms': 'terms', 'privacy': 'privacy', 'refunds': 'refunds',
             'cookies': 'cookies', 'start': 'services',
             'free': 'home'}

HREF = re.compile(r'(\s(?:href|action)=")([^"]+)(")')


def rewrite_links(html, code):
    def one(m):
        pre, value, post = m.groups()
        if re.match(r'^(https?:|mailto:|tel:|#|//|/assets/)', value):
            return m.group(0)
        if value in ('./', '/', ''):
            return pre + (path_for('home', code) or '/') + post
        raw = value.lstrip('./')
        path, _, tail = raw.partition('#')
        path, _, query = path.partition('?')
        if query:
            query = '?' + query
        if tail:
            tail = '#' + tail
        name = re.sub(r'\.html$', '', path.lstrip('/'))
        if not name and value.startswith('#'):
            return m.group(0)
        if name in APP_PAGES and name not in LINK_KEYS:
            return pre + '/' + name + query + tail + post
        if name in LINK_KEYS:
            return pre + path_for(LINK_KEYS[name], code) + query + tail + post
        if value in ('/', ''):
            return pre + path_for('home', code) + query + tail + post
        return m.group(0)
    return HREF.sub(one, html)


ASSET = re.compile(r'(?<=[\'"(,\s])assets/')


def rewrite_assets(html):
    return ASSET.sub('/assets/', html)


HEAD_STRIP = [
    re.compile(r'[ \t]*<title>.*?</title>\n?', re.S | re.I),
    re.compile(r'[ \t]*<meta\s+name="description"[^>]*>\n?', re.I),
    re.compile(r'[ \t]*<meta\s+name="robots"[^>]*>\n?', re.I),
    re.compile(r'[ \t]*<link\s+rel="canonical"[^>]*>\n?', re.I),
    re.compile(r'[ \t]*<link\s+rel="alternate"[^>]*hreflang[^>]*>\n?', re.I),
    re.compile(r'[ \t]*<meta\s+property="og:[^"]*"[^>]*>\n?', re.I),
    re.compile(r'[ \t]*<meta\s+name="twitter:[^"]*"[^>]*>\n?', re.I),
    re.compile(r'[ \t]*<script type="application/ld\+json">.*?</script>\n?', re.S | re.I),
]


def build_page(page, code, lang_meta, dict_, report):
    src = open(os.path.join(ROOT, page['source']), encoding='utf-8').read()

    # keep the page's own FAQ data, translated; everything else is generated
    kept_faq = None
    for m in re.finditer(r'<script type="application/ld\+json">(.*?)</script>', src, re.S):
        try:
            data = json.loads(m.group(1))
        except ValueError:
            continue
        if isinstance(data, dict) and data.get('@type') == 'FAQPage':
            kept_faq = data

    def lookup(text):
        if code == 'en':
            return text
        if text in UNTRANSLATABLE:
            return text
        return dict_.get(text)

    body, missing = translate(src, lookup)
    if missing:
        report.setdefault(code, {})[page['key']] = sorted(set(missing))

    if kept_faq:
        def walk(node):
            if isinstance(node, dict):
                return {k: walk(v) for k, v in node.items()}
            if isinstance(node, list):
                return [walk(v) for v in node]
            if isinstance(node, str):
                hit = lookup(collapse(node))
                return hit if hit else node
            return node
        kept_faq = walk(kept_faq)

    for rx in HEAD_STRIP:
        body = rx.sub('', body)

    seo = SEO[page['key']][code if not page.get('english_only') else 'en']
    head = head_block(page['key'], code, lang_meta, seo['title'], seo['description'], kept_faq)
    body = re.sub(r'(<meta name="viewport"[^>]*>\n)', r'\1' + head.replace('\\', '\\\\') + '\n', body, count=1)

    body = re.sub(r'<html[^>]*>',
                  '<html lang="%s" dir="%s" data-built-lang="%s">' % (code, lang_meta['dir'], code),
                  body, count=1)

    body = rewrite_assets(body)
    body = rewrite_links(body, code)
    body = body.replace('</head>', routes_script(code) + '</head>', 1)

    slug = page['slugs'].get(code) if not page.get('english_only') else page['slugs']['en']
    out_dir = os.path.join(ROOT, code)
    out_name = 'index.html' if slug == '' else slug + '.html'
    os.makedirs(out_dir, exist_ok=True)
    return os.path.join(out_dir, out_name), body


def routes_script(code):
    """So scripts that write links ('pricing.html') can point them at this language."""
    routes = {}
    for page in PAGES:
        routes[page['key']] = {c: path_for(page['key'], c) for c in languages_for(page['key'])}
    data = {'lang': code, 'routes': routes, 'app': sorted(APP_PAGES),
            # keyed on the English source filename, which is what the
            # scripts that write their own markup still use
            'names': {p['key']: p['source'].replace('.html', '') for p in PAGES}}
    return ('<script>window.XovahRoutes=%s;</script>\n'
            % json.dumps(data, ensure_ascii=False, separators=(',', ':')))


# ── Sitemap and redirects ─────────────────────────────────────────
def sitemap():
    rows = ['<?xml version="1.0" encoding="UTF-8"?>',
            '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"',
            '        xmlns:xhtml="http://www.w3.org/1999/xhtml">']
    for page in PAGES:
        for code in languages_for(page['key']):
            rows.append('  <url>')
            rows.append('    <loc>%s</loc>' % url_for(page['key'], code))
            for other in languages_for(page['key']):
                rows.append('    <xhtml:link rel="alternate" hreflang="%s" href="%s"/>'
                            % (other, url_for(page['key'], other)))
            rows.append('    <xhtml:link rel="alternate" hreflang="x-default" href="%s"/>'
                        % url_for(page['key'], 'en'))
            rows.append('    <changefreq>%s</changefreq>' % page['changefreq'])
            rows.append('    <priority>%s</priority>' % page['priority'])
            rows.append('  </url>')
    rows.append('</urlset>')
    return '\n'.join(rows) + '\n'


def redirects():
    """Old English URLs, and any English slug typed under a language folder."""
    out = [{'source': '/', 'destination': '/en', 'permanent': True}]
    for page in PAGES:
        key, en_slug = page['key'], page['slugs']['en']
        if en_slug:
            for src in ('/' + en_slug, '/' + en_slug + '.html'):
                out.append({'source': src, 'destination': path_for(key, 'en'), 'permanent': True})
    out.append({'source': '/extras', 'destination': path_for('services', 'en'), 'permanent': True})
    out.append({'source': '/extras.html', 'destination': path_for('services', 'en'), 'permanent': True})
    out.append({'source': '/index.html', 'destination': '/en', 'permanent': True})
    out.append({'source': '/support', 'destination': path_for('contact', 'en'), 'permanent': True})
    out.append({'source': '/support.html', 'destination': path_for('contact', 'en'), 'permanent': True})

    langs = '|'.join(BUILT_CODES)
    # an app page reached from inside a language folder belongs at the root
    for name in sorted(APP_PAGES):
        out.append({'source': '/:lang(%s)/%s' % (langs, name), 'destination': '/' + name,
                    'permanent': False})
    # the English slug inside a language folder goes to that language's slug
    for page in PAGES:
        key, en_slug = page['key'], page['slugs']['en']
        if not en_slug:
            continue
        for code in BUILT_CODES:
            slug = page['slugs'].get(code) if not page.get('english_only') else None
            target = path_for(key, code) if slug is not None else path_for(key, 'en')
            if code == 'en' or target == '/%s/%s' % (code, en_slug):
                continue
            out.append({'source': '/%s/%s' % (code, en_slug), 'destination': target, 'permanent': True})
    for code in BUILT_CODES:
        out.append({'source': '/%s/index' % code, 'destination': '/' + code, 'permanent': True})

    # pages that have been retired: their old URLs go to the language home
    for gone in CONFIG.get('gone', []):
        key = gone.get('to')
        def home_or(code):
            return path_for(key, code) if key else '/' + code
        for code, slug in gone.get('slugs', {}).items():
            if code in BUILT_CODES and slug:
                out.append({'source': '/%s/%s' % (code, slug), 'destination': home_or(code),
                            'permanent': True})
        for alias in gone.get('english_aliases', []):
            out.append({'source': '/' + alias, 'destination': home_or('en'), 'permanent': True})
            out.append({'source': '/%s.html' % alias, 'destination': home_or('en'), 'permanent': True})
            for code in BUILT_CODES:
                out.append({'source': '/%s/%s' % (code, alias), 'destination': home_or(code),
                            'permanent': True})
    return out


def main():
    check_only = '--check' in sys.argv
    report = {}
    written = 0

    for lang in BUILT:
        code = lang['code']
        d = dictionary(code)
        for page in PAGES:
            if page.get('english_only') and code != 'en':
                continue
            path, html = build_page(page, code, lang, d, report)
            if not check_only:
                open(path, 'w', encoding='utf-8', newline='').write(html)
                written += 1

    if not check_only:
        open(os.path.join(ROOT, 'sitemap.xml'), 'w', encoding='utf-8', newline='').write(sitemap())
        vercel_path = os.path.join(ROOT, 'vercel.json')
        vercel = json.load(open(vercel_path, encoding='utf-8'))
        vercel['redirects'] = redirects()
        open(vercel_path, 'w', encoding='utf-8', newline='').write(
            json.dumps(vercel, indent=2, ensure_ascii=False) + '\n')
        print('wrote %d pages, sitemap.xml, %d redirects' % (written, len(vercel['redirects'])))

    gaps = 0
    for code in sorted(report):
        for key in sorted(report[code]):
            items = report[code][key]
            gaps += len(items)
            print('  untranslated %s/%s: %d  e.g. %r' % (code, key, len(items), items[0][:60]))
    print('translation gaps: %d' % gaps)
    return 1 if gaps else 0


if __name__ == '__main__':
    sys.exit(main())
