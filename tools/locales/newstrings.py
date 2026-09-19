"""Dump the English strings a page still has no translation for, in a
stable order, so translations can be supplied positionally and the keys
never have to be retyped. Retyping them is how an em dash becomes a
hyphen and the entry silently stops matching.

    python tools/locales/newstrings.py services > missing.json
"""
import sys, os, json

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import build as B  # noqa: E402

key = sys.argv[1] if len(sys.argv) > 1 else 'services'
page = [p for p in B.PAGES if p['key'] == key]
if not page:
    sys.exit('no such page: ' + key)

# German stands in for all of them: the gap is the same set everywhere,
# because a string is either in every dictionary or in none.
lang = [l for l in B.BUILT if l['code'] == 'de'][0]
report = {}
B.build_page(page[0], 'de', lang, B.dictionary('de'), report)
items = report.get('de', {}).get(key, [])

sys.stdout.reconfigure(encoding='utf-8')
print(json.dumps(items, ensure_ascii=False, indent=1))
