/* Does each account really get its own dashboard?
   Loads assets/demo.js against a stub localStorage and drives the same
   bind/unbind calls supabase-auth.js makes on sign-in and sign-out. */
const fs = require('fs');
const vm = require('vm');

function makeStorage() {
  const m = new Map();
  return {
    get length() { return m.size; },
    key: (i) => [...m.keys()][i] ?? null,
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => void m.set(k, String(v)),
    removeItem: (k) => void m.delete(k),
    clear: () => m.clear(),
    _dump: () => Object.fromEntries(m)
  };
}

function freshWindow(storage) {
  const win = {
    localStorage: storage,
    sessionStorage: makeStorage(),
    atob: (s) => Buffer.from(s, 'base64').toString('binary'),
    btoa: (s) => Buffer.from(s, 'binary').toString('base64'),
    location: { pathname: '/dashboard.html', hash: '', href: '', search: '' },
    document: { addEventListener() {}, querySelectorAll: () => [] },
    addEventListener() {}, setTimeout, clearTimeout, console
  };
  win.window = win;
  const ctx = vm.createContext(win);
  vm.runInContext(fs.readFileSync('C:/projects/OnSite/assets/demo.js', 'utf8'), ctx, { filename: 'demo.js' });
  return win;
}

const storage = makeStorage();
const out = [];
const ok = (label, pass) => out.push((pass ? '  PASS  ' : '  FAIL  ') + label);

// ── Alice signs in and saves work ───────────────────────────────
let w = freshWindow(storage);
let S = w.Sitehouse;
S.bindUser('alice-uid');
let s = S.load();
s.customer.firstName = 'Alice';
s.customer.email = 'alice@example.com';
s.tier = 'standard';
S.save();
const aliceKey = S.storeKey();
ok('Alice bucket is keyed to her uid  (' + aliceKey + ')', aliceKey === 'sitehouse.store.v2.alice-uid');

// ── Alice signs out on this shared machine ──────────────────────
S.unbindUser();
ok('after sign-out the live bucket is anon', S.storeKey() === 'sitehouse.store.v2.anon');
ok('signed-out read shows no name', !S.load().customer.firstName);
ok('signed-out read shows no tier', S.load().tier === 'none');

// ── Bob signs in on the same browser ────────────────────────────
S.bindUser('bob-uid');
const bobState = S.load();
ok('Bob does NOT see Alice\'s name', bobState.customer.firstName !== 'Alice');
ok('Bob does NOT see Alice\'s email', bobState.customer.email !== 'alice@example.com');
ok('Bob does NOT inherit Alice\'s tier', bobState.tier !== 'standard');
bobState.customer.firstName = 'Bob';
S.save();

// ── Alice comes back: her data must still be intact ─────────────
S.unbindUser();
S.bindUser('alice-uid');
ok('Alice\'s own data survived Bob\'s session', S.load().customer.firstName === 'Alice');
ok('Bob did not overwrite Alice\'s bucket', S.load().customer.email === 'alice@example.com');

// ── Anonymous work carries in ONLY to an empty account ──────────
const s2 = makeStorage();
let w2 = freshWindow(s2);
let S2 = w2.Sitehouse;
const anon = S2.load();
anon.customer.firstName = 'TypedBeforeSignup';
S2.save();
S2.bindUser('newbie-uid');
ok('anonymous work follows a brand-new account in', S2.load().customer.firstName === 'TypedBeforeSignup');
ok('anon bucket cleared after the carry', s2.getItem('sitehouse.store.v2.anon') === null);

// a returning account must NOT be overwritten by leftover anon work
S2.unbindUser();
const anon2 = S2.load();
anon2.customer.firstName = 'StrangerAtThisPC';
S2.save();
S2.bindUser('newbie-uid');
ok('returning account is NOT overwritten by anon work', S2.load().customer.firstName === 'TypedBeforeSignup');

// ── Nothing readable is left in a shared bucket after sign-out ──
S2.unbindUser();
ok('sign-out wipes the anon bucket', s2.getItem('sitehouse.store.v2.anon') === null);

console.log(out.join('\n'));
console.log('\nbuckets on disk:', Object.keys(storage._dump()).join(', '));
const failed = out.filter((l) => l.includes('FAIL')).length;
console.log(failed ? `\n${failed} FAILED` : '\nall isolation checks passed');
process.exit(failed ? 1 : 0);
