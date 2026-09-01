/* ───────────────────────────────────────────────────────────────
   Sitehouse — catch a sign-in that landed on the wrong page

   Supabase only honours the `redirectTo` we ask for if that exact
   URL is in the project's redirect allow-list. When it is not, it
   quietly ignores us and sends people to the project's Site URL
   instead — which for us is the landing page.

   The landing page had no auth script, so the return arrived, the
   `?code=` in the address bar meant nothing to anybody, no session
   was ever created, and the visitor was left standing on the home
   page still signed out. From their side: "I pressed Continue with
   Google and it just took me to the front page."

   This is fifteen lines and no dependencies, so it can go on every
   page cheaply. It does not load Supabase and it does not check
   anything — it only notices the markers of an OAuth return and
   hands the whole thing to /login, which has the real client and
   knows how to finish. The PKCE verifier lives in localStorage on
   the same origin, so moving pages costs nothing.

   Fixing the allow-list in Supabase is still worth doing — one less
   redirect — but this means the sign-in works either way, which is
   the part that should not depend on a setting in a dashboard.
   ─────────────────────────────────────────────────────────────── */
(function () {
  'use strict';

  var here = location.pathname.split('/').pop().replace(/\.html$/, '');
  // /login and /signup already handle this themselves.
  if (here === 'login' || here === 'signup' || here === 'onboarding') return;

  var q = location.search || '';
  var h = location.hash || '';

  /* Both shapes: PKCE returns ?code=…, the implicit flow returns
     #access_token=…, and either can come back as an error instead. */
  var isReturn = /[?&]code=/.test(q) ||
                 /access_token=/.test(h) ||
                 /[?&]error(_code|_description)?=/.test(q) ||
                 /[&#]error(_code|_description)?=/.test(h);

  if (!isReturn) return;

  /* Carry the whole thing across untouched — the code, the state, and
     any error Google sent, so /login can say what went wrong rather
     than showing a blank form. */
  location.replace('/login' + q + h);
})();
