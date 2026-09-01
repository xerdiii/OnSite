/* ───────────────────────────────────────────────────────────────
   Xovah — per-user data layer

   Every table behind this module carries a user_id and is fenced by
   RLS (auth.uid() = user_id). That is the actual boundary: it holds
   whether or not this file is used correctly, and it holds against a
   forged request from a browser console, because it is enforced by
   Postgres and not by any code that ships to the client.

   So the rules here are conveniences, not protections:
     · user_id is stamped on insert because the WITH CHECK demands it,
       not because it is what keeps rows apart.
     · No method takes a user id. There is no way to ask this module
       for somebody else's rows, and if you did, RLS would return none.

   What a customer may NOT write, by policy rather than by omission:
     · invoices and payments at all — those are staff/service-role
       only, so a browser can never mark itself paid.
     · orders.status = 'paid' or 'completed'.
     · profiles.role — a trigger reverts any self-promotion.

   Money stays in whole euro cents, matching assets/demo.js.
   ─────────────────────────────────────────────────────────────── */
(function (global) {
  'use strict';

  function auth() {
    var A = global.SitehouseAuth;
    if (!A || !A.client) return Promise.reject(new Error('auth not loaded'));
    return A.client();
  }

  function me() {
    var A = global.SitehouseAuth;
    return A.session().then(function (s) {
      return (s && s.user && s.user.id) || null;
    });
  }

  /* supabase-js returns {data,error} rather than rejecting. Left as is,
     a failed query reads as an empty dashboard, which is the one thing
     worse than an error — so every call funnels through here. */
  function unwrap(res) {
    if (res && res.error) throw res.error;
    return res ? res.data : null;
  }

  function collection(name, opts) {
    var order = (opts && opts.order) || 'created_at';
    var asc = !!(opts && opts.ascending);

    return {
      /* Implicitly "mine": RLS decides the row set, not this filter. */
      list: function (limit) {
        return auth().then(function (sb) {
          var q = sb.from(name).select('*').order(order, { ascending: asc });
          if (limit) q = q.limit(limit);
          return q.then(unwrap);
        });
      },

      get: function (id) {
        return auth().then(function (sb) {
          return sb.from(name).select('*').eq('id', id).maybeSingle().then(unwrap);
        });
      },

      create: function (row) {
        return Promise.all([auth(), me()]).then(function (r) {
          var sb = r[0], uid = r[1];
          if (!uid) throw new Error('not signed in');
          var body = Object.assign({}, row, { user_id: uid });
          return sb.from(name).insert(body).select().single().then(unwrap);
        });
      },

      /* No user_id filter here on purpose: RLS already restricts the
         update to rows this account owns, and passing one would imply
         the caller gets to choose. */
      update: function (id, patch) {
        return auth().then(function (sb) {
          var body = Object.assign({}, patch);
          delete body.user_id;                 // never reassign ownership
          delete body.id;
          return sb.from(name).update(body).eq('id', id).select().single().then(unwrap);
        });
      },

      remove: function (id) {
        return auth().then(function (sb) {
          return sb.from(name).delete().eq('id', id).then(unwrap);
        });
      }
    };
  }

  var orders = collection('orders');
  var invoices = collection('invoices');
  var payments = collection('payments');
  var threads = collection('support_threads', { order: 'updated_at' });
  var messages = collection('support_messages', { order: 'created_at', ascending: true });
  var changes = collection('change_requests');
  var notifications = collection('notifications');

  var DB = {
    orders: orders,
    invoices: invoices,
    payments: payments,
    supportThreads: threads,
    supportMessages: messages,
    changeRequests: changes,
    notifications: notifications,

    /* The order the dashboard is currently working on — the newest one
       still open. A draft is the package builder's working copy. */
    currentOrder: function () {
      return auth().then(function (sb) {
        return sb.from('orders').select('*')
          .in('status', ['draft', 'pending'])
          .order('created_at', { ascending: false })
          .limit(1).maybeSingle().then(unwrap);
      });
    },

    /* Deposit is 25% rounded down and the balance takes the remainder,
       so the two halves always add back to the total — same rule as
       Sitehouse.deposit()/balance(), kept here so a row written by this
       module cannot disagree with what the dashboard renders. */
    totals: function (order) {
      var oneTime = (order && order.one_time_cents) || 0;
      var deposit = Math.floor(oneTime * 0.25);
      return {
        oneTimeCents: oneTime,
        monthlyCents: (order && order.monthly_cents) || 0,
        depositCents: deposit,
        balanceCents: oneTime - deposit
      };
    },

    messagesIn: function (threadId) {
      return auth().then(function (sb) {
        return sb.from('support_messages').select('*')
          .eq('thread_id', threadId)
          .order('created_at', { ascending: true })
          .then(unwrap);
      });
    },

    /* True only for an account whose profiles.role is 'staff'. The
       answer comes from the database, not from a list in a JS file
       that anyone can read and nobody can enforce. */
    isStaff: function () {
      return auth().then(function (sb) {
        return sb.rpc('is_staff').then(function (res) {
          if (res && res.error) throw res.error;
          return res && res.data === true;
        });
      })['catch'](function () { return false; });
    }
  };

  global.SitehouseDB = DB;
})(window);
