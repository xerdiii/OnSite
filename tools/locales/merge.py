"""Merge tools/locales/additions/<lang>.json into assets/i18n/<lang>.js.

The additions files are keyed by the line number of the English string in
additions/_keys.txt, so a translator works from one numbered list rather
than repeating the English. An empty value means "leave it in English" —
brand names, email addresses and example URLs — and those keys are
listed in additions/_untranslatable.txt so the build does not report
them as gaps.

    python tools/locales/merge.py

It also repairs the Turkish file, where an earlier tool wrote Python
expressions and stray quotes into the values instead of plain strings.
"""
import json
import os
import re
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
HERE = os.path.join(ROOT, 'tools', 'locales', 'additions')
LANGS = ['sq', 'de', 'fr', 'it', 'es', 'pt', 'nl', 'sv', 'tr']
LANG_FILES = set('%s.json' % c for c in LANGS)

READ_JS = ('global.window={};eval(require("fs").readFileSync(process.argv[1],"utf8"));'
           'process.stdout.write(JSON.stringify(window.SitehouseI18nStrings["%s"]))')


def load(code):
    path = os.path.join(ROOT, 'assets', 'i18n', '%s.js' % code)
    out = subprocess.run(['node', '-e', READ_JS % code, path],
                         capture_output=True, text=True, encoding='utf-8')
    if out.returncode:
        sys.exit(out.stderr)
    return json.loads(out.stdout)


def repair(value):
    """Undo a previous tool's escapes: "'a' if False else 'b'" -> b, "'a'" -> a."""
    v = value.strip()
    if ' if False else ' in v:
        v = v.split(' if False else ')[-1].strip()
    if len(v) > 1 and v[0] == v[-1] and v[0] in '\'"' and v[1:-1].count(v[0]) == 0:
        v = v[1:-1]
    return v.replace("\\'", "'").replace('\\"', '"')


def js_string(s):
    return "'" + s.replace('\\', '\\\\').replace("'", "\\'").replace('\n', '\\n') + "'"


def write(code, dictionary):
    lines = ['/* Xovah — %s dictionary, loaded by assets/i18n.js only when this' % code,
             '   language is chosen. Keyed on the exact English string. */',
             '(window.SitehouseI18nStrings = window.SitehouseI18nStrings || {}).%s = {' % code]
    items = sorted(dictionary.items(), key=lambda kv: kv[0])
    for i, (k, v) in enumerate(items):
        comma = ',' if i < len(items) - 1 else ''
        lines.append('  %s: %s%s' % (js_string(k), js_string(v), comma))
    lines.append('};')
    path = os.path.join(ROOT, 'assets', 'i18n', '%s.js' % code)
    open(path, 'w', encoding='utf-8', newline='').write('\n'.join(lines) + '\n')


def main():
    keys = [l.rstrip('\n') for l in
            open(os.path.join(HERE, '_keys.txt'), encoding='utf-8').read().split('\n') if l.strip()]
    untranslatable = set()
    added_total = 0

    for code in LANGS:
        d = load(code)
        before = len(d)

        if code == 'tr':
            fixed = 0
            for k, v in list(d.items()):
                r = repair(v)
                if r != v:
                    d[k] = r
                    fixed += 1
            print('tr: repaired %d values' % fixed)

        extra = json.load(open(os.path.join(HERE, '%s.json' % code), encoding='utf-8'))
        for idx, value in extra.items():
            key = keys[int(idx)]
            if not value:
                untranslatable.add(key)
                continue
            d[key] = value

        # later rounds are keyed on the English string itself: one file
        # per batch of new copy, every language in it
        for name in sorted(os.listdir(HERE)):
            if not name.endswith('.json') or name in LANG_FILES:
                continue
            batch = json.load(open(os.path.join(HERE, name), encoding='utf-8'))
            for english, by_lang in batch.items():
                if english.startswith('_') or not isinstance(by_lang, dict):
                    continue
                if by_lang.get(code):
                    d[english] = by_lang[code]
        write(code, d)
        added_total += len(d) - before
        print('%s: %d -> %d strings' % (code, before, len(d)))

    open(os.path.join(HERE, '_untranslatable.txt'), 'w', encoding='utf-8', newline='') \
        .write('\n'.join(sorted(untranslatable)) + '\n')
    print('untranslatable (kept in English everywhere): %d' % len(untranslatable))


if __name__ == '__main__':
    main()
