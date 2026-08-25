/* ───────────────────────────────────────────────────────────────
   Sitehouse — real authentication

   Replaces the simulated sign-in. Two ways in, both genuine:

     · Google OAuth, via Supabase's provider redirect
     · A 6-digit code emailed by Supabase and verified server-side

   The code is no longer generated in the browser. It is created by
   Supabase, sent by email, and checked against the server — so it
   cannot be read off the page, and a wrong one is actually rejected.

   The publishable key below is safe in front-end code: it only ever
   grants what row-level security allows, and every table policy is
   scoped to auth.uid(). It is not a secret and is meant to ship.

   demo.js is untouched. It still holds the project, order, payments,
   ratings and support data; this file owns only the session. The two
   are joined in adopt(), which copies the real identity onto the
   local store so every existing dashboard view keeps working.
   ─────────────────────────────────────────────────────────────── */
(function (global) {
  'use strict';

  var URL_ = 'https://jepxnhehxfjxbhzmmilf.supabase.co';
  var KEY = 'sb_publishable_fOyQpR3sYeYdIPoPDM6XeQ_fQklorNM';
  var CDN = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

  var doc = global.document;
  var clientPromise = null;

  /* Was this page load the return leg of an OAuth redirect?
     Supabase only honours `redirectTo` if the exact URL is in the
     project's allow list; otherwise it quietly sends people to the
     Site URL instead — which is why Google sign-in was landing on the
     home page. Reading the marker before the client boots (it strips
     these from the URL) means we can finish the journey ourselves
     whichever page we were dropped on. */
  var CAME_BACK = (function () {
    var q = global.location.search || '';
    var h = global.location.hash || '';
    return /[?&]code=/.test(q) || /access_token=|[?&]error_code=/.test(h + q);
  })();

  /* Where they were trying to go before being asked to sign in. */
  function intended() {
    try {
      var q = new URLSearchParams(global.location.search).get('next');
      if (q && /^[A-Za-z0-9_-]+\.html(#[A-Za-z0-9/_-]*)?$/.test(q)) return q;
      var kept = global.sessionStorage.getItem('sitehouse.next');
      if (kept) return kept;
    } catch (e) {}
    return null;
  }

  function client() {
    if (clientPromise) return clientPromise;
    clientPromise = import(CDN).then(function (m) {
      return m.createClient(URL_, KEY, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          // The OAuth redirect comes back with the tokens in the URL
          // fragment; this consumes and clears them.
          detectSessionInUrl: true,
          flowType: 'pkce'
        }
      });
    });
    return clientPromise;
  }

  /* ── Bridge to the existing store ──────────────────────────────
     Everything already written expects Sitehouse.load().session and a
     customer object. Rather than rewrite twenty views, the real
     identity is copied onto the local store on every auth change. */
  function adopt(session) {
    var S = global.Sitehouse;
    if (!S) return;
    var s = S.load();

    if (!session) {
      s.session = null;
      S.save();
      return;
    }

    var u = session.user || {};
    var meta = u.user_metadata || {};

    s.session = {
      email: u.email || '',
      role: 'customer',
      at: new Date().toISOString(),
      uid: u.id,
      provider: (u.app_metadata && u.app_metadata.provider) || 'email',
      real: true                       // never a simulated session
    };

    // Only fill blanks. A name typed into the dashboard must not be
    // overwritten by whatever Google happens to have on file.
    if (u.email) s.customer.email = u.email;
    var name = meta.full_name || meta.name || '';
    if (name && !s.customer.firstName) {
      var bits = name.split(' ');
      s.customer.firstName = bits[0];
      s.customer.lastName = bits.slice(1).join(' ');
    }
    S.save();
  }

  var synced = Promise.resolve();       // the most recent profile sync

  function syncProfile(sb, session) {
    if (!session) return Promise.resolve();
    var S = global.Sitehouse;
    if (!S) return Promise.resolve();

    synced = sb.from('profiles')
      .select('business, phone')
      .eq('id', session.user.id)
      .maybeSingle()
      .then(function (r) {
        if (r.error) console.warn('profile read', r.error.message);
        var row = r.data || {};
        var st = S.load();
        var c = st.customer;

        // The account is the authority on anything it already knows.
        if (row.business && !c.business) c.business = row.business;
        if (row.phone && !c.phone) c.phone = row.phone;
        c.email = session.user.email || c.email;

        /* Somebody whose account already carries a business name has
           been through onboarding, whatever this particular browser
           remembers. Asking again is asking a customer to introduce
           themselves twice. */
        if (c.business && String(c.business).trim()) st.onboarded = true;
        S.save();

        return sb.from('profiles').upsert({
          id: session.user.id,
          email: session.user.email,
          business: c.business || null,
          phone: c.phone || null
        }, { onConflict: 'id' });
      })
      .then(function (r) {
        if (r && r.error) console.warn('profile sync', r.error.message);
      })
      ['catch'](function (e) { console.warn('profile sync', e && e.message); });

    return synced;
  }

  /* Nothing that talks to a mail server is allowed to hang the button.
     Supabase's auth endpoint waits ~35s on a bad SMTP host and then
     returns 504; without this the UI sat on "Sending…" for as long as
     the request took, which reads as broken long before it is. */
  function withTimeout(promise, ms, what) {
    var timer;
    return Promise.race([
      promise.then(function (v) { clearTimeout(timer); return v; },
                   function (e) { clearTimeout(timer); throw e; }),
      new Promise(function (_, reject) {
        timer = setTimeout(function () {
          var err = new Error('timeout:' + what);
          err.timeout = true;
          reject(err);
        }, ms);
      })
    ]);
  }

  /* ── Public surface ────────────────────────────────────────── */
  var Auth = {
    /* Email → Supabase sends a 6-digit code. */
    sendCode: function (email, opts) {
      opts = opts || {};
      return withTimeout(client().then(function (sb) {
        return sb.auth.signInWithOtp({
          email: String(email || '').trim(),
          options: {
            // false on the reset/recovery paths: sending a code to an
            // address with no account would silently create one.
            shouldCreateUser: opts.createUser !== false
          }
        });
      }).then(function (r) {
        if (r.error) throw r.error;
        return true;
      }), 20000, 'send');
    },

    /* Code → a real session, or a real rejection. */
    verifyCode: function (email, token) {
      return withTimeout(client().then(function (sb) {
        return sb.auth.verifyOtp({
          email: String(email || '').trim(),
          token: String(token || '').trim(),
          type: 'email'
        }).then(function (r) {
          if (r.error) throw r.error;
          adopt(r.data.session);
          return syncProfile(sb, r.data.session).then(function () { return r.data.session; });
        });
      }), 20000, 'verify');
    },

    /* Sets a new password on the account that is currently signed in.
       The reset flow signs them in with a code first, so by the time
       this runs the session is real and Supabase knows who they are. */
    setPassword: function (password) {
      return withTimeout(client().then(function (sb) {
        return sb.auth.updateUser({ password: String(password || '') });
      }).then(function (r) {
        if (r.error) throw r.error;
        return true;
      }), 20000, 'password');
    },

    /* Email + password, for accounts that have set one. */
    signInWithPassword: function (email, password) {
      return withTimeout(client().then(function (sb) {
        return sb.auth.signInWithPassword({
          email: String(email || '').trim(),
          password: String(password || '')
        });
      }).then(function (r) {
        if (r.error) throw r.error;
        adopt(r.data.session);
        return r.data.session;
      }), 20000, 'password-login');
    },

    google: function (next) {
      // Remember the destination on this device. If Supabase ignores
      // redirectTo and drops them on the Site URL, the router below
      // still knows where they were going.
      try { global.sessionStorage.setItem('sitehouse.next', next || 'dashboard.html'); } catch (e) {}

      return client().then(function (sb) {
        // Extensionless on purpose. Supabase matches redirect_to against
        // its allow list as a literal string, and the list holds
        // ".../login". Vercel's cleanUrls serves /login from login.html,
        // and the dev server resolves it the same way, so this one form
        // is valid everywhere and actually matches.
        var back = global.location.origin + '/login' +
                   (next ? '?next=' + encodeURIComponent(next) : '');
        return sb.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: back,
            queryParams: { access_type: 'offline', prompt: 'consent' }
          }
        });
      }).then(function (r) {
        if (r.error) throw r.error;
        return true;                    // the browser is navigating away
      });
    },

    /* Has this account told us who they are yet? Google gives us a
       name and an email and nothing else, so the business name is the
       one thing still missing before a package can be built. */
    needsOnboarding: function () {
      var S = global.Sitehouse;
      if (!S) return false;
      var st = S.load();
      if (st.onboarded) return false;
      var c = st.customer || {};
      return !c.business || !String(c.business).trim() || st.tier === 'none';
    },

    session: function () {
      return client()
        .then(function (sb) { return sb.auth.getSession(); })
        .then(function (r) { return (r.data && r.data.session) || null; });
    },

    signOut: function () {
      return client().then(function (sb) { return sb.auth.signOut(); })
        .then(function () { adopt(null); });
    },

    /* Fires on sign-in, sign-out, token refresh and on returning from
       the Google redirect. */
    onChange: function (fn) {
      return client().then(function (sb) {
        sb.auth.onAuthStateChange(function (event, session) {
          adopt(session);
          if (session && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION')) syncProfile(sb, session);
          try { fn(event, session); } catch (e) { /* a listener must not break auth */ }
        });
        return sb;
      });
    },

    /* Supabase's messages are written for developers. These are for
       the person who mistyped a digit. */
    message: function (err) {
      var m = String((err && err.message) || err || '').toLowerCase();
      if (m.indexOf('expired') > -1) return 'That code has expired. Ask for a new one.';
      if (m.indexOf('invalid') > -1 || m.indexOf('token') > -1) return 'That code does not match. Check the digits and try again.';
      if (m.indexOf('rate') > -1 || m.indexOf('security purposes') > -1) return 'Too many attempts. Wait a minute and try again.';
      if (m.indexOf('provider is not enabled') > -1) return 'Google sign-in is not switched on for this site yet.';
      // Supabase returns this when no SMTP is configured. It is a setup
      // problem on our side, not something the visitor did wrong, so it
      // must not read like a rejected code.
      if (m.indexOf('sending confirmation email') > -1 || m.indexOf('error sending') > -1) {
        return 'We could not send the code — email is not switched on for this site yet. ' +
               'Use Google above, or write to help@sitehouse.eu.';
      }
      if (m.indexOf('failed to fetch') > -1) return 'No connection. Check your internet and try again.';
      // Our own ceiling, or Supabase's 504 when SMTP does not answer.
      if (m.indexOf('timeout') > -1 || m.indexOf('504') > -1 || m.indexOf('upstream') > -1) {
        return 'The email server is not responding. Use Google above, or write to help@sitehouse.eu.';
      }
      if (m.indexOf('user not found') > -1 || m.indexOf('signups not allowed') > -1) {
        return 'We have no account with that address. Check the spelling, or create one.';
      }
      if (m.indexOf('should be different') > -1) return 'That is the password you already have. Pick a different one.';
      if (m.indexOf('at least') > -1 && m.indexOf('character') > -1) return 'Passwords need at least eight characters.';
      return 'That did not work. Try again, or ask support.';
    },

    ready: client
  };

  global.SitehouseAuth = Auth;

  /* This file is a module, so it runs after any classic inline script
     on the page. Pages that need it wait for this event rather than
     assuming the global already exists. */
  try { doc.dispatchEvent(new CustomEvent('sitehouse:auth-ready')); } catch (e) {}

  /* ── Finish the journey ────────────────────────────────────────
     A signed-in person who has just come back from Google must end up
     in the dashboard, not wherever Supabase happened to drop them.
     This runs on every page precisely because we cannot rely on being
     dropped on the right one.

     It only ever redirects when there is something to finish: the
     OAuth return leg, or sitting on the login/signup pages while
     already signed in. Browsing the site signed in is left alone. */
  function pageName() {
    var last = global.location.pathname.split('/').pop().replace(/\.html$/, '');
    return last === '' || last === 'index' ? 'home' : last;
  }

  function route(session) {
    if (!session) return;

    var here = pageName();
    var onAuthPage = here === 'login' || here === 'signup';
    if (!CAME_BACK && !onAuthPage) return;      // nothing to finish

    // What the account already knows beats what this browser remembers,
    // so wait for the profile before deciding anything.
    synced['catch'](function () {}).then(function () { routeNow(session, here); });
  }

  function routeNow(session, here) {
    // Business name first. Everything downstream — the package
    // builder, the order, the invoice — is addressed to a business,
    // and Google cannot tell us what it is called.
    if (Auth.needsOnboarding() && here !== 'onboarding') {
      global.location.replace('onboarding.html');
      return;
    }

    if (here === 'onboarding') return;          // it will move them on itself

    var next = intended() || 'dashboard.html';
    try { global.sessionStorage.removeItem('sitehouse.next'); } catch (e) {}
    global.location.replace(next);
  }

  /* Adopt whatever session already exists, as early as possible, so a
     page does not flash a signed-out state before catching up. */
  Auth.onChange(function (event, session) {
    if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') route(session);
  });

  Auth.route = route;
  Auth.cameBack = CAME_BACK;
})(window);
