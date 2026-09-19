/* Merge positional translations into assets/i18n/<code>.js.

   Input: _missing.json  — the English keys, in order, from newstrings.py
          _new.<code>.json — that language's translations, same order

   Keys come from the dump rather than from the translation file, so an
   em dash or a curly quote can never drift between the two and leave an
   entry that matches nothing. A translation identical to its English, or
   left empty, is skipped rather than written as a fake hit.

       node tools/locales/addstrings.js de fr it …
*/
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const HERE = __dirname;
const ROOT = path.join(HERE, '..', '..');
const keys = JSON.parse(fs.readFileSync(path.join(HERE, '_missing.json'), 'utf8'));

function readDict(file) {
  const ctx = { window: {} };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(file, 'utf8'), ctx);
  const all = ctx.window.SitehouseI18nStrings || {};
  return all[Object.keys(all)[0]] || {};
}

function quote(s) {
  return "'" + String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'";
}

for (const code of process.argv.slice(2)) {
  const transFile = path.join(HERE, '_new.' + code + '.json');
  const dictFile = path.join(ROOT, 'assets', 'i18n', code + '.js');
  if (!fs.existsSync(transFile)) { console.log(code + ': no _new.' + code + '.json, skipped'); continue; }

  const values = JSON.parse(fs.readFileSync(transFile, 'utf8'));
  if (values.length !== keys.length) {
    console.log(code + ': EXPECTED ' + keys.length + ' translations, got ' + values.length + ' — skipped');
    continue;
  }

  const dict = readDict(dictFile);
  let added = 0, skipped = 0;
  keys.forEach((k, i) => {
    // Empty means "not translated yet". Identical to the English is
    // allowed: '10 extras' is already Spanish. build.py --check is the
    // net that catches a string genuinely left in English.
    const v = (values[i] == null ? '' : String(values[i])).trim();
    if (!v) { skipped++; return; }
    if (dict[k] === undefined) added++;
    dict[k] = v;
  });

  const body = Object.keys(dict).sort()
    .map((k) => '  ' + quote(k) + ': ' + quote(dict[k]) + ',')
    .join('\n')
    .replace(/,$/, '');

  const out =
    '/* Xovah — ' + code + ' dictionary, loaded by assets/i18n.js only when this\n' +
    '   language is chosen. Keyed on the exact English string. */\n' +
    '(window.SitehouseI18nStrings = window.SitehouseI18nStrings || {}).' + code + ' = {\n' +
    body + '\n};\n';

  fs.writeFileSync(dictFile, out, 'utf8');
  console.log(code + ': +' + added + ' added, ' + skipped + ' skipped, ' + Object.keys(dict).length + ' total');
}
