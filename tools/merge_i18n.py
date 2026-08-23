"""Merge _i18n_<lang>.json translation dumps into assets/i18n.js STRINGS dict.
Hand-written entries already in i18n.js win over JSON values.
Usage: python tools/merge_i18n.py"""
import json, re, io, os

ROOT = 'C:/projects/OnSite'
I18N = os.path.join(ROOT, 'assets', 'i18n.js')
LANGS = ['sq', 'de', 'fr', 'it', 'es', 'pt', 'nl', 'sv', 'tr']

def js_str(s):
    return "'" + s.replace('\\', '\\\\').replace("'", "\\'") + "'"

src = open(I18N, encoding='utf-8').read()
var_start = src.index('var STRINGS = {')
start = var_start + len('var STRINGS = {')
end = src.index('\n  };', start)
block = src[start:end]

def parse_entries(t):
    e = {}
    for m in re.finditer(r"'((?:[^'\\]|\\.)+)'\s*:\s*'((?:[^'\\]|\\.)+)'", t):
        k = m.group(1).replace("\\'", "'").replace('\\\\', '\\')
        v = m.group(2).replace("\\'", "'").replace('\\\\', '\\')
        e[k] = v
    return e

existing = {}
parts = re.split(r"\n    (\w{2}): \{", block)
for i in range(1, len(parts), 2):
    existing[parts[i]] = parse_entries(parts[i + 1])

merged_all = {}
for lang in LANGS:
    p = os.path.join(ROOT, f'_i18n_{lang}.json')
    ex = existing.get(lang, {})
    if not os.path.exists(p):
        print(f'!! missing {lang} dump — keeping {len(ex)} existing entries')
        merged_all[lang] = dict(ex)
        continue
    data = json.load(open(p, encoding='utf-8'))
    merged = dict(data)
    merged.update(ex)  # hand translations win
    merged_all[lang] = merged
    print(f'{lang}: {len(merged)} entries ({len(ex)} hand-written kept, {len(merged)-len(ex)} from JSON)')

out = io.StringIO()
out.write('var STRINGS = {\n')
for lang in LANGS:
    entries = merged_all[lang]
    if not entries:
        continue
    out.write(f'    {lang}: {{\n')
    line = '      '
    items = sorted(entries.items())
    for i, (k, v) in enumerate(items):
        piece = js_str(k) + ': ' + js_str(v) + (', ' if i < len(items) - 1 else '')
        if len(line) + len(piece) > 110 and line.strip():
            out.write(line.rstrip() + '\n')
            line = '      '
        line += piece
    if line.strip():
        out.write(line.rstrip() + '\n')
    out.write('    },\n')
out.write('  };')

new_src = src[:var_start] + out.getvalue() + src[end + len('\n  };'):]
open(I18N, 'w', encoding='utf-8').write(new_src)

chk = os.popen(f'node --check "{I18N}"').read()
print('node --check:', chk.strip() or 'OK')
