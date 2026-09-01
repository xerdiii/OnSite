/* Proves assets/oauth-catch.js forwards an OAuth return to /login from
   whatever page Supabase happened to drop it on, and stays out of the
   way otherwise.

   This is the file whose absence caused "Continue with Google sends me
   back to the landing page": Supabase honours redirectTo only if the
   exact URL is in the project allow-list, and otherwise delivers to the
   Site URL, which is the home page. Without this script that page has
   no idea what ?code= means.

   node tools/test-oauth-catch.js */
const fs = require('fs');
const vm = require('vm');

const SRC = fs.readFileSync('C:/projects/OnSite/assets/oauth-catch.js', 'utf8');

function run(pathname, search, hash) {
  let replaced = null;
  const ctx = {
    location: {
      pathname, search, hash,
      replace(to) { replaced = to; }
    }
  };
  ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext(SRC, ctx, { filename: 'oauth-catch.js' });
  return replaced;
}

const out = [];
const ok = (label, pass, extra) => out.push((pass ? '  PASS  ' : '  FAIL  ') + label + (!pass && extra ? '  -> ' + extra : ''));

// ── the reported bug: PKCE return delivered to the landing page ───
let r = run('/index.html', '?code=abc123&state=xyz', '');
ok('PKCE return on the landing page is forwarded', r === '/login?code=abc123&state=xyz', String(r));

r = run('/', '?code=abc123', '');
ok('…and from the bare root too', r === '/login?code=abc123', String(r));

r = run('/extras.html', '?code=abc123', '');
ok('…and from any other public page', r === '/login?code=abc123', String(r));

// ── implicit flow returns in the hash ────────────────────────────
r = run('/index.html', '', '#access_token=tok&type=bearer');
ok('implicit-flow token is forwarded', r === '/login#access_token=tok&type=bearer', String(r));

// ── errors must survive, or the user sees a blank form ───────────
r = run('/index.html', '?error=access_denied&error_description=User+denied', '');
ok('OAuth error is carried across', r === '/login?error=access_denied&error_description=User+denied', String(r));

r = run('/index.html', '', '#error_code=otp_expired');
ok('hash error is carried across', r === '/login#error_code=otp_expired', String(r));

// ── it must not touch anything else ──────────────────────────────
ok('ordinary page is left alone', run('/index.html', '', '') === null);
ok('unrelated query is left alone', run('/extras.html', '?utm_source=x', '') === null);
ok('a fragment link is left alone', run('/index.html', '', '#pricing') === null);

// ── no redirect loop: the pages that finish the job opt out ──────
ok('login does not forward to itself', run('/login.html', '?code=abc', '') === null);
ok('signup does not forward', run('/signup.html', '?code=abc', '') === null);
ok('onboarding does not forward', run('/onboarding.html', '?code=abc', '') === null);
ok('extensionless /login opts out too', run('/login', '?code=abc', '') === null);

console.log(out.join('\n'));
const failed = out.filter((l) => l.includes('FAIL')).length;
console.log(failed ? `\n${failed} FAILED` : '\nall oauth-catch checks passed');
process.exit(failed ? 1 : 0);
