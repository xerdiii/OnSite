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
  var LOCAL_PAGE = /^[A-Za-z0-9_-]+(\.html)?(#[A-Za-z0-9/_-]*)?$/;

  function intended() {
    try {
      var q = new URLSearchParams(global.location.search).get('next');
      if (q && LOCAL_PAGE.test(q)) return q;
      // Same test on the remembered value. A destination is a
      // destination whichever way it arrived, and an unchecked one is
      // an open redirect waiting for somebody to find it.
      var kept = global.sessionStorage.getItem('sitehouse.next');
      if (kept && LOCAL_PAGE.test(kept)) return kept;
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

    if (!session) {
      // Back to the anonymous bucket, and wipe it. Nothing from this
      // session may be readable by the next person at this computer.
      if (S.unbindUser) S.unbindUser();
      var blank = S.load();
      blank.session = null;
      S.save();
      return;
    }

    var u = session.user || {};

    // Before any read: this account's own bucket, not whatever the
    // browser was last holding.
    if (S.bindUser) S.bindUser(u.id);
    var s = S.load();
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
  var currentUid = null;

  /* Which copy of the dashboard is newer. Both carry a stamp, written
     whenever the store is saved. Last write wins — with no server-side
     merge there is no honest alternative, and the alternative people
     reach for (always prefer the server) silently discards work done
     offline. */
  function stamp(state) {
    var t = state && state.savedAt ? Date.parse(state.savedAt) : 0;
    return isNaN(t) ? 0 : t;
  }

  /* Fields the browser must never be trusted to set. `tier` decides
     what a customer is entitled to, so it is listed here as a reminder
     that the server has to own it once there is a checkout — today
     nothing is charged, so nothing is at stake yet. */
  function shipState(state) {
    var copy = {};
    for (var k in state) {
      if (!Object.prototype.hasOwnProperty.call(state, k)) continue;
      if (k === 'session') continue;             // the session is Supabase's, not ours
      copy[k] = state[k];
    }
    return copy;
  }

  function syncProfile(sb, session) {
    if (!session) return Promise.resolve();
    var S = global.Sitehouse;
    if (!S) return Promise.resolve();

    currentUid = session.user.id;

    synced = sb.from('profiles')
      .select('business, phone, tier, app_state, app_state_at')
      .eq('id', session.user.id)
      .maybeSingle()
      .then(function (r) {
        if (r.error) console.warn('profile read', r.error.message);
        var row = r.data || {};
        var st = S.load();

        /* The account's copy of the dashboard, if it is newer than this
           browser's. A brand-new browser has a stamp of 0, so the
           account always wins there — which is the whole point. */
        var remote = row.app_state;
        if (remote && typeof remote === 'object' && stamp(remote) > stamp(st)) {
          S.replaceState(remote);
          st = S.load();
        }

        var c = st.customer;
        // The account is the authority on anything it already knows.
        if (row.business && !c.business) c.business = row.business;
        if (row.phone && !c.phone) c.phone = row.phone;
        if (row.tier && row.tier !== 'none' && st.tier === 'none') st.tier = row.tier;
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
          phone: c.phone || null,
          tier: st.tier || 'none',
          app_state: shipState(st),
          app_state_at: new Date().toISOString()
        }, { onConflict: 'id' });
      })
      .then(function (r) {
        if (r && r.error) console.warn('profile sync', r.error.message);
      })
      ['catch'](function (e) { console.warn('profile sync', e && e.message); });

    return synced;
  }

  /* ── Pushing changes back ──────────────────────────────────────
     Every click in the builder writes to the store. Sending each one
     would be a request per keystroke, so they are collected and sent
     once things go quiet — and once more on the way out of the page,
     because a customer who closes the tab after choosing a package
     should not lose the package. */
  var pushTimer = null;
  var pushWanted = false;

  function pushNow() {
    pushWanted = false;
    if (pushTimer) { clearTimeout(pushTimer); pushTimer = null; }

    var S = global.Sitehouse;
    if (!S || !currentUid) return Promise.resolve();
    var st = S.load();

    return client().then(function (sb) {
      return sb.from('profiles').upsert({
        id: currentUid,
        business: (st.customer && st.customer.business) || null,
        phone: (st.customer && st.customer.phone) || null,
        tier: st.tier || 'none',
        app_state: shipState(st),
        app_state_at: new Date().toISOString()
      }, { onConflict: 'id' });
    }).then(function (r) {
      if (r && r.error) console.warn('state push', r.error.message);
    })['catch'](function (e) { console.warn('state push', e && e.message); });
  }

  function schedulePush() {
    if (!currentUid) return;               // nothing to push to yet
    pushWanted = true;
    if (pushTimer) clearTimeout(pushTimer);
    pushTimer = setTimeout(pushNow, 1200);
  }

  /* The store tells us when it changes; we decide when to send. */
  if (global.Sitehouse && global.Sitehouse.onSave) global.Sitehouse.onSave(schedulePush);

  /* pagehide fires when a tab is closed, navigated away from, or sent
     to the background on iOS — where unload never runs at all. */
  global.addEventListener('pagehide', function () { if (pushWanted) pushNow(); });
  global.document.addEventListener('visibilitychange', function () {
    if (global.document.visibilityState === 'hidden' && pushWanted) pushNow();
  });

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

  /* Each rule is a label and a test. Order is the order they are
     shown, easiest to satisfy first. */
  var PASSWORD_RULES = [
    { key: 'length',    label: 'At least 8 characters', ok: function (p) { return p.length >= 8; } },
    { key: 'lowercase', label: 'A lowercase letter',    ok: function (p) { return /[a-z]/.test(p); } },
    { key: 'uppercase', label: 'An uppercase letter',   ok: function (p) { return /[A-Z]/.test(p); } },
    { key: 'digit',     label: 'A number',              ok: function (p) { return /\d/.test(p); } },
    { key: 'symbol',    label: 'A symbol, like ! or ?', ok: function (p) {
        // Anything that is not a letter, a digit or a space.
        return /[^A-Za-z0-9\s]/.test(p);
      } }
  ];

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

    /* Email + password → an account, plus the confirmation code.

       Supabase deliberately does not error when the address is already
       registered; it returns a user with an empty identities array
       instead, so a signup form cannot be used to find out who has an
       account. We pass that signal back as `existing` without ever
       saying so outright, and the code they receive signs them into
       the account that is already there. */
    signUp: function (email, password) {
      return withTimeout(client().then(function (sb) {
        return sb.auth.signUp({
          email: String(email || '').trim(),
          password: String(password || ''),
          options: { emailRedirectTo: global.location.origin + '/login' }
        });
      }).then(function (r) {
        if (r.error) throw r.error;
        var u = r.data && r.data.user;
        var existing = !!(u && Array.isArray(u.identities) && u.identities.length === 0);
        return { user: u, session: (r.data && r.data.session) || null, existing: existing };
      }), 20000, 'signup');
    },

    /* The signup code is a different type from the sign-in code, and
       verifying it with the wrong one fails for no visible reason. */
    verifySignup: function (email, token) {
      var addr = String(email || '').trim();
      var code = String(token || '').trim();
      return withTimeout(client().then(function (sb) {
        return sb.auth.verifyOtp({ email: addr, token: code, type: 'signup' })
          .then(function (r) {
            /* An address that was already confirmed rejects type
               'signup'. That is not a bad code — it is somebody signing
               in through the signup form, so try the sign-in type
               before telling them the digits are wrong. */
            if (r.error) return sb.auth.verifyOtp({ email: addr, token: code, type: 'email' });
            return r;
          })
          .then(function (r) {
            if (r.error) throw r.error;
            adopt(r.data.session);
            return syncProfile(sb, r.data.session).then(function () { return r.data.session; });
          });
      }), 20000, 'verify');
    },

    resendSignup: function (email) {
      return withTimeout(client().then(function (sb) {
        return sb.auth.resend({ type: 'signup', email: String(email || '').trim() });
      }).then(function (r) {
        if (r.error) throw r.error;
        return true;
      }), 20000, 'resend');
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

    /* Save one or two named fields immediately rather than waiting for
       the debounce — onboarding uses this so the answer is on the
       account before the page navigates away. */
    saveProfile: function (fields) {
      var S = global.Sitehouse;
      if (S) {
        var st = S.load();
        if (fields && fields.business) st.customer.business = fields.business;
        if (fields && fields.phone) st.customer.phone = fields.phone;
        if (fields && fields.tier) st.tier = fields.tier;
        S.save();
      }
      return pushNow();
    },

    /* Force the working copy up to the account now. */
    flush: pushNow,

    /* What is still missing from a password, as a list the caller can
       render. Empty means the server will accept it. */
    passwordRules: PASSWORD_RULES,

    passwordProblems: function (pw) {
      var p = String(pw || '');
      return PASSWORD_RULES.filter(function (r) { return !r.ok(p); });
    },

    /* Change the password of the account that is signed in.

       Two of the project's settings shape this. "Require current
       password" means the old one must come along for the ride.
       "Secure password change" means a session older than 24 hours is
       not trusted on its own — Supabase answers reauthentication_needed
       and expects a nonce it emails to the account. Neither was handled
       before, so changing a password simply failed. */
    changePassword: function (currentPassword, newPassword) {
      return withTimeout(client().then(function (sb) {
        var fields = { password: String(newPassword || '') };
        if (currentPassword) fields.current_password = String(currentPassword);
        return sb.auth.updateUser(fields);
      }).then(function (r) {
        if (r.error) throw r.error;
        return true;
      }), 20000, 'password');
    },

    /* Ask Supabase to email a six-digit nonce, for the case above. */
    reauthenticate: function () {
      return withTimeout(client().then(function (sb) {
        return sb.auth.reauthenticate();
      }).then(function (r) {
        if (r.error) throw r.error;
        return true;
      }), 20000, 'reauth');
    },

    /* The same change, with the emailed nonce attached. */
    changePasswordWithNonce: function (nonce, newPassword, currentPassword) {
      return withTimeout(client().then(function (sb) {
        var fields = { password: String(newPassword || ''), nonce: String(nonce || '') };
        if (currentPassword) fields.current_password = String(currentPassword);
        return sb.auth.updateUser(fields);
      }).then(function (r) {
        if (r.error) throw r.error;
        return true;
      }), 20000, 'password');
    },

    session: function () {
      return client()
        .then(function (sb) { return sb.auth.getSession(); })
        .then(function (r) { return (r.data && r.data.session) || null; });
    },

    signOut: function () {
      currentUid = null;
      pushWanted = false;
      if (pushTimer) { clearTimeout(pushTimer); pushTimer = null; }

      /* scope:'global' revokes every refresh token on the account, so
         signing out here signs out the other tabs and the other
         devices too. That is what people mean by "log out". */
      return client()
        .then(function (sb) { return sb.auth.signOut({ scope: 'global' }); })
        .then(function (r) { if (r && r.error) console.warn('sign out', r.error.message); })
        ['catch'](function (e) { console.warn('sign out', e && e.message); })
        .then(function () {
          adopt(null);
          // Belt and braces: if the network call failed, the tokens are
          // still gone from this browser.
          try {
            var ls = global.localStorage;
            for (var i = ls.length - 1; i >= 0; i--) {
              var k = ls.key(i);
              if (k && k.indexOf('sb-') === 0 && k.indexOf('-auth-token') > -1) ls.removeItem(k);
            }
          } catch (e2) {}
        });
    },

    /* One place that knows how to leave. replace() rather than href, so
       the Back button cannot walk into the page they just left. */
    signOutAndLeave: function (where) {
      return Auth.signOut().then(function () {
        global.location.replace(where || 'login.html');
      });
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

    /* Call from any page that must not be readable without a session.
       Covers three things one guard cannot:
         · signing out in another tab
         · a refresh token that has expired or been revoked
         · the back button restoring the page from the bfcache, which
           replays no scripts at all, so nothing else would notice */
    guard: function (where) {
      var back = where || ('login.html?next=' + encodeURIComponent(
        global.location.pathname.split('/').pop() + global.location.hash));

      function out() { global.location.replace(back); }

      Auth.onChange(function (event, session) {
        if (event === 'SIGNED_OUT' || (!session && event !== 'INITIAL_SESSION')) out();
      });

      global.addEventListener('pageshow', function (e) {
        if (!e.persisted) return;         // a normal load already checked
        Auth.session().then(function (session) { if (!session) out(); });
      });

      // Coming back to a tab left open for hours: the refresh may have
      // failed while it was hidden.
      global.document.addEventListener('visibilitychange', function () {
        if (global.document.visibilityState !== 'visible') return;
        Auth.session().then(function (session) { if (!session) out(); });
      });
    },

    /* Supabase's messages are written for developers. These are for
       the person who mistyped a digit. */
    message: function (err) {
      var m = String((err && err.message) || err || '').toLowerCase();
      var code = (err && (err.code || err.name)) || '';

      /* supabase-js raises AuthWeakPasswordError with a `reasons`
         array, which is the only place the server says WHICH rule was
         missed. Turning that into the actual list beats "weak
         password", which tells somebody nothing about what to type. */
      if (code === 'weak_password' || m.indexOf('password should') > -1 || m.indexOf('weak') > -1) {
        var reasons = (err && err.reasons) || [];
        var need = PASSWORD_RULES.filter(function (r) {
          return reasons.length ? reasons.indexOf(r.key) > -1 : false;
        });
        if (!need.length) {
          return 'That password is not strong enough. It needs eight characters with a capital, ' +
                 'a lowercase letter, a number and a symbol.';
        }
        return 'That password still needs: ' +
               need.map(function (r) { return r.label.toLowerCase(); }).join(', ') + '.';
      }

      if (code === 'same_password' || m.indexOf('should be different') > -1) {
        return 'That is the password you already have. Pick a different one.';
      }
      if (code === 'reauthentication_needed' || m.indexOf('reauthentication needed') > -1) {
        return 'For your security, confirm it is you. We have emailed a six-digit code.';
      }
      if (code === 'reauthentication_not_valid') {
        return 'That confirmation code does not match. Check the digits, or ask for a new one.';
      }
      if (m.indexOf('current password') > -1) {
        return 'That is not your current password.';
      }
      if (code === 'over_email_send_rate_limit' || code === 'over_request_rate_limit') {
        return 'Too many attempts. Wait a minute and try again.';
      }
      if (code === 'email_address_invalid') {
        return 'That address will not work here — example.com and test domains are refused. Use a real one.';
      }
      /* Order matters and the combined case comes first: Supabase says
         "Token has expired or is invalid" for a wrong code AND for a
         stale one, so neither single answer is honest. */
      if (m.indexOf('expired') > -1 && m.indexOf('invalid') > -1) {
        return 'That code is wrong or has expired. Check the digits, or send a new one.';
      }
      if (m.indexOf('expired') > -1) return 'That code has expired. Send a new one.';
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
        /* Deliberately not "no account exists". This page should not be
           usable as a way to test which addresses are registered, but
           it still has to tell somebody who mistyped what to do. */
        return 'We could not send a code to that address. Check the spelling — ' +
               'or create an account if you have not signed up yet.';
      }
      if (m.indexOf('already registered') > -1 || m.indexOf('already been registered') > -1) {
        return 'There is already an account on that address. Sign in instead, or reset the password.';
      }
      if (m.indexOf('invalid login credentials') > -1) {
        /* Supabase returns this for a wrong password AND for an address
           with no account, and does not distinguish. Neither do we —
           partly because we cannot, and partly because saying which
           would turn the login form into an account-existence check. */
        return 'That email and password do not match. Check both, or ask for a code instead.';
      }
      if (m.indexOf('email not confirmed') > -1) {
        return 'This address has not been confirmed yet. Ask for a code and enter it to finish signing up.';
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
