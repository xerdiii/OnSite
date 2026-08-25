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

  function syncProfile(sb, session) {
    if (!session) return Promise.resolve();
    var S = global.Sitehouse;
    var c = S ? S.load().customer : {};
    return sb.from('profiles').upsert({
      id: session.user.id,
      email: session.user.email,
      business: c.business || null,
      phone: c.phone || null
    }, { onConflict: 'id' }).then(function (r) {
      if (r.error) console.warn('profile sync', r.error.message);
    });
  }

  /* ── Public surface ────────────────────────────────────────── */
  var Auth = {
    /* Email → Supabase sends a 6-digit code. */
    sendCode: function (email) {
      return client().then(function (sb) {
        return sb.auth.signInWithOtp({
          email: String(email || '').trim(),
          options: { shouldCreateUser: true }
        });
      }).then(function (r) {
        if (r.error) throw r.error;
        return true;
      });
    },

    /* Code → a real session, or a real rejection. */
    verifyCode: function (email, token) {
      return client().then(function (sb) {
        return sb.auth.verifyOtp({
          email: String(email || '').trim(),
          token: String(token || '').trim(),
          type: 'email'
        }).then(function (r) {
          if (r.error) throw r.error;
          adopt(r.data.session);
          return syncProfile(sb, r.data.session).then(function () { return r.data.session; });
        });
      });
    },

    google: function (next) {
      return client().then(function (sb) {
        var back = global.location.origin + '/login.html' +
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
      return 'That did not work. Try again, or ask support.';
    },

    ready: client
  };

  global.SitehouseAuth = Auth;

  /* This file is a module, so it runs after any classic inline script
     on the page. Pages that need it wait for this event rather than
     assuming the global already exists. */
  try { doc.dispatchEvent(new CustomEvent('sitehouse:auth-ready')); } catch (e) {}

  /* Adopt whatever session already exists, as early as possible, so a
     page does not flash a signed-out state before catching up. */
  Auth.onChange(function () {});
})(window);
