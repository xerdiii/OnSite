/* Dump the builder's English strings that no dictionary covers yet.

   build.html is one page for every language rather than ten generated
   ones, so build.py never sees it and cannot report its gaps. The text
   still gets translated the same way — i18n.js sweeps the DOM — which
   means the strings only have to exist in assets/i18n/<code>.js.

   Both sources matter: the markup, and the literals builder.js writes
   into the page at runtime.

       node tools/locales/builderstrings.js > tools/locales/_missing.json
*/
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const de = fs.readFileSync(path.join(ROOT, 'assets', 'i18n', 'de.js'), 'utf8');
const found = new Set();

/* i18n.js matches against textContent, where the browser has already
   turned &mdash; into an em dash. A key written with the entity intact
   would never match anything. */
const ENTITIES = {
  '&mdash;': '—', '&ndash;': '–', '&nbsp;': ' ',
  '&hellip;': '…', '&euro;': '€', '&rarr;': '→',
  '&ldquo;': '“', '&rdquo;': '”', '&rsquo;': '’',
  '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'"
};
const decode = (s) => s.replace(/&[a-z]+;|&#\d+;/gi, (e) => ENTITIES[e] || e);

function keep(t) {
  if (t.length < 3 || !/[A-Za-z]{3}/.test(t)) return false;
  if (/@|^https?:/.test(t)) return false;            // addresses are not copy
  // Copy starts with a letter. A leading comma or quote means the regex
  // caught the seam between two concatenated code fragments.
  if (!/^[A-Za-zÀ-ɏ]/.test(t)) return false;
  if (/:\s*$/.test(t)) return false;                 // an object key
  return true;
}

const html = fs.readFileSync(path.join(ROOT, 'build.html'), 'utf8')
  .replace(/<script[\s\S]*?<\/script>/g, '')
  .replace(/<style[\s\S]*?<\/style>/g, '');

for (const m of html.matchAll(/>([^<>]+)</g)) {
  const t = decode(m[1].replace(/\s+/g, ' ').trim());
  if (keep(t)) found.add(t);
}
for (const m of html.matchAll(/(?:placeholder|aria-label|title|alt)="([^"]+)"/g)) {
  const t = decode(m[1].replace(/\s+/g, ' ').trim());
  if (keep(t)) found.add(t);
}

/* Literals from builder.js. The file concatenates markup across lines, so
   anything carrying code punctuation is a fragment rather than a sentence
   and is dropped — translating those would corrupt the page. */
const js = fs.readFileSync(path.join(ROOT, 'assets', 'builder.js'), 'utf8')
  // Prose in a comment is not copy, and an apostrophe in one reads as
  // the start of a string literal.
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^[ \t]*\/\/.*$/gm, '')
  // An Error's message is for the log, never for the page.
  .replace(/new Error\([^)]*\)/g, 'new Error()');
for (const m of js.matchAll(/'((?:[^'\\\n]|\\.)+)'/g)) {
  const t = m[1].replace(/\\'/g, "'").trim();
  if (!keep(t)) continue;
  if (t.split(' ').length < 2) continue;
  if (/[<>{}()\[\];=+|]/.test(t)) continue;          // code, not copy
  if (/^(use strict|bx-|is-|data-|utf|POST|GET|application|Content-)/.test(t)) continue;
  if (/\.(js|css|html)\b|^\//.test(t)) continue;
  found.add(t);
}

/* Exact keys, not substrings. A substring test drops 'Choose a package'
   the moment 'Choose a package to start' exists, and the string then
   stays English on the page with nothing to show why. */
const have = new Set();
for (const m of de.matchAll(/^\s*'((?:[^'\\]|\\.)*)':/gm)) {
  have.add(m[1].replace(/\\'/g, "'").replace(/\\\\/g, '\\'));
}

const missing = [...found].filter((t) => !have.has(t)).sort();

process.stdout.write(JSON.stringify(missing, null, 1) + '\n');
