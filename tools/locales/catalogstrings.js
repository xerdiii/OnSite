/* Catalogue and builder-UI strings that no dictionary covers yet.

   The builder renders package blurbs, notes and inclusion lists straight
   out of Sitehouse.CATALOG, and i18n.js translates whatever it finds in
   the DOM — so these need dictionary entries exactly like markup does.
   The short UI words are listed by hand because a generic scan of
   builder.js cannot tell 'All' the tab from 'All' the substring.

       node tools/locales/catalogstrings.js > tools/locales/_missing.json
*/
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..', '..');

// demo.js is an IIFE taking `window`, and reaches for document and
// localStorage on the way in. Enough of both to let it define CATALOG.
const doc = { readyState: 'complete', addEventListener() {}, querySelectorAll: () => [] };
const store = { length: 0, key: () => null, getItem: () => null, setItem() {}, removeItem() {} };
const win = { document: doc, localStorage: store, atob: (s) => Buffer.from(s, 'base64').toString('binary') };
win.window = win;
const ctx = { window: win, document: doc, localStorage: store };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'assets', 'demo.js'), 'utf8'), ctx);
const CAT = ctx.window.Sitehouse.CATALOG;

const found = new Set();
for (const w of CAT.websites) {
  if (w.blurb) found.add(w.blurb);
  if (w.note) found.add(w.note);
  (w.includes || []).forEach((i) => found.add(i));
}
Object.values(CAT.groups).forEach((g) => found.add(g));

// Rendered by builder.js, too short or too punctuated for a generic scan.
[
  'All', 'To', 'From', 'Subject', 'Message', 'Copy', 'Copied',
  'Package', 'Extras', 'Total', 'Reply to', 'Estimated total',
  'one-time', 'extra', 'extras', 'None', 'None added', 'Nothing chosen yet',
  'Continue', 'Choose a package to start', 'Send this email',
  'Clear everything and start again', 'Your package already covers everything in here.',
  'Send this to Xovah?', 'Yes, send it', 'Not yet',
  'That is', 'of extras you do not have to buy.',
  'Already in', 'required', 'optional', 'Add more detail'
].forEach((s) => found.add(s));

const de = fs.readFileSync(path.join(ROOT, 'assets', 'i18n', 'de.js'), 'utf8');
const have = new Set();
for (const m of de.matchAll(/^\s*'((?:[^'\\]|\\.)*)':/gm)) {
  have.add(m[1].replace(/\\'/g, "'").replace(/\\\\/g, '\\'));
}

process.stdout.write(JSON.stringify([...found].filter((t) => !have.has(t)).sort(), null, 1) + '\n');
