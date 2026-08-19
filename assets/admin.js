/* ───────────────────────────────────────────────────────────────
   Onsite — internal admin (demo)
   Read-mostly views over the same mock store the dashboard uses.
   ─────────────────────────────────────────────────────────────── */
(function () {
  'use strict';

  var O = window.Onsite;
  if (!O.requireSession('admin')) return;

  var view = document.getElementById('view');
  var esc = O.esc;
  function money(c) { return O.euro(c); }

  function head(eyebrow, title, sub) {
    return '<p class="eyebrow text-ink-soft">' + esc(eyebrow) + '</p>' +
           '<h1 class="h-display doc-title mt-3">' + esc(title) + '</h1>' +
           (sub ? '<p class="mt-3 max-w-prose text-[0.9375rem] leading-relaxed text-ink-mid">' + esc(sub) + '</p>' : '');
  }

  // Status vocabulary shared across the admin tables.
  var TAGS = {
    paid:            ['tag-ok',   'Paid'],
    pending:         ['tag-wait', 'Pending'],
    cancelled:       ['tag-off',  'Cancelled'],
    active:          ['tag-ok',   'Active'],
    'pending-launch':['tag-wait', 'Starts at launch'],
    Live:            ['tag-ok',   'Live'],
    Building:        ['tag-due',  'Building'],
    'Ready for review': ['tag-due', 'Ready for review'],
    'Awaiting content': ['tag-wait', 'Awaiting content'],
    Cancelled:       ['tag-off',  'Cancelled'],
    completed:       ['tag-ok',   'Completed'],
    'in-progress':   ['tag-due',  'In progress'],
    answered:        ['tag-ok',   'Answered'],
    open:            ['tag-due',  'Open']
  };

  function tag(key) {
    var m = TAGS[key] || ['tag-wait', String(key)];
    return '<span class="tag ' + m[0] + '">' + esc(m[1]) + '</span>';
  }

  function stat(label, value, note) {
    return '<div class="card p-5"><p class="mono-label text-ink-soft">' + esc(label) + '</p>' +
      '<p class="h-section mt-2 text-xl">' + value + '</p>' +
      (note ? '<p class="mt-1 text-[0.8125rem] text-ink-soft">' + esc(note) + '</p>' : '') + '</div>';
  }

  function table(headers, rows) {
    return '<div class="overflow-x-auto"><table class="tbl m-cards"><thead><tr>' +
      headers.map(function (h) { return '<th>' + esc(h) + '</th>'; }).join('') +
      '</tr></thead><tbody>' + rows + '</tbody></table></div>';
  }

  var routes = {};

  routes['/overview'] = function () {
    var s = O.load(), u = s.users;
    var live = u.filter(function (x) { return x.website === 'Live'; }).length;
    var building = u.filter(function (x) { return x.website === 'Building' || x.website === 'Awaiting content'; }).length;
    var review = u.filter(function (x) { return x.website === 'Ready for review'; }).length;
    var mrr = u.filter(function (x) { return x.monthly === 'active'; })
               .reduce(function (t, x) { return t + x.monthlyCents; }, 0);
    var owed = u.filter(function (x) { return x.final === 'pending'; })
                .reduce(function (t, x) { return t + O.balance(x.oneTimeCents); }, 0);

    var attention = u.filter(function (x) { return x.website === 'Ready for review' || x.website === 'Awaiting content'; })
      .map(function (x, i) {
        return '<tr class="clickable" data-act="open-user" data-i="' + u.indexOf(x) + '">' +
          '<td class="name">' + esc(x.business) + '</td><td>' + esc(x.name) + '</td>' +
          '<td>' + tag(x.website) + '</td>' +
          '<td>' + (x.website === 'Ready for review' ? 'Waiting on customer approval' : 'Chase content') + '</td></tr>';
      }).join('');

    return head('Overview', 'Where every customer is right now.', null) +
      '<div class="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">' +
        stat('Customers', String(u.length)) +
        stat('Live websites', String(live)) +
        stat('In build', String(building + review), review + ' awaiting approval') +
        stat('Monthly recurring', money(mrr), 'from active subscriptions') +
        stat('Awaiting 75%', money(owed), 'across open projects') +
      '</div>' +
      '<div class="card mt-6 p-6"><p class="mono-label text-ink-soft">Needs attention</p>' +
        '<div class="mt-4">' + table(['Business', 'Contact', 'Status', 'Next action'], attention) + '</div>' +
      '</div>';
  };

  routes['/users'] = function () {
    var u = O.load().users;
    var rows = u.map(function (x, i) {
      return '<tr class="clickable" data-act="open-user" data-i="' + i + '">' +
        '<td class="name">' + esc(x.name) + '</td>' +
        '<td>' + esc(x.business) + '</td>' +
        '<td>' + esc(x.email) + '</td>' +
        '<td>' + tag(x.website) + '</td>' +
        '<td>' + tag(x.final === 'paid' ? 'paid' : x.final) + '</td>' +
        '<td class="font-mono">' + (x.monthlyCents ? money(x.monthlyCents) + ' / mo' : '—') + '</td>' +
        '<td>' + esc(O.date(x.created)) + '</td></tr>';
    }).join('');

    return head('Users', 'Every customer account.', 'Select a row to open the customer.') +
      '<div class="card mt-8 p-6">' +
        table(['Name', 'Business', 'Email', 'Website', 'Final payment', 'Monthly', 'Created'], rows) +
      '</div>';
  };

  routes['/user'] = function (i) {
    var u = O.load().users[i];
    if (!u) return head('Users', 'Customer not found.', null);
    var dep = O.deposit(u.oneTimeCents), bal = O.balance(u.oneTimeCents);

    return '<a href="#/users" class="text-[0.8125rem] font-semibold text-ink-mid hover:text-ink">← All users</a>' +
      '<div class="mt-4">' + head('Customer', u.business, u.name + ' · ' + u.email) + '</div>' +

      '<div class="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-4">' +
        stat('Website', tag(u.website)) +
        stat('Deposit (25%)', money(dep) + ' ' + tag(u.deposit)) +
        stat('Remaining (75%)', money(bal) + ' ' + tag(u.final)) +
        stat('Monthly', (u.monthlyCents ? money(u.monthlyCents) : '—') + ' ' + tag(u.monthly)) +
      '</div>' +

      '<div class="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">' +
        '<div class="card p-6"><p class="mono-label text-ink-soft">Order</p>' +
          '<table class="tbl m-cards mt-4"><tbody>' +
            '<tr><td class="name">One-time total</td><td class="font-mono">' + money(u.oneTimeCents) + '</td></tr>' +
            '<tr><td class="name">25% deposit</td><td class="font-mono">' + money(dep) + '</td></tr>' +
            '<tr><td class="name">Remaining 75%</td><td class="font-mono">' + money(bal) + '</td></tr>' +
            '<tr><td class="name">Monthly services</td><td class="font-mono">' + (u.monthlyCents ? money(u.monthlyCents) + ' / mo' : '—') + '</td></tr>' +
          '</tbody></table></div>' +
        '<div class="card p-6"><p class="mono-label text-ink-soft">Account</p>' +
          '<table class="tbl m-cards mt-4"><tbody>' +
            '<tr><td class="name">Contact</td><td>' + esc(u.name) + '</td></tr>' +
            '<tr><td class="name">Email</td><td>' + esc(u.email) + '</td></tr>' +
            '<tr><td class="name">Created</td><td>' + esc(O.date(u.created)) + '</td></tr>' +
            '<tr><td class="name">Website status</td><td>' + tag(u.website) + '</td></tr>' +
          '</tbody></table></div>' +
      '</div>';
  };

  routes['/orders'] = function () {
    var u = O.load().users;
    var rows = u.map(function (x, i) {
      return '<tr class="clickable" data-act="open-user" data-i="' + i + '">' +
        '<td class="name">' + esc(x.business) + '</td>' +
        '<td class="font-mono">' + money(x.oneTimeCents) + '</td>' +
        '<td class="font-mono">' + money(O.deposit(x.oneTimeCents)) + '</td>' +
        '<td>' + tag(x.deposit) + '</td>' +
        '<td class="font-mono">' + money(O.balance(x.oneTimeCents)) + '</td>' +
        '<td>' + tag(x.final) + '</td>' +
        '<td>' + esc(O.date(x.created)) + '</td></tr>';
    }).join('');

    return head('Orders', 'Every project and where its money is.',
      'One-time work is split 25/75 — deposit on order, balance once the customer approves.') +
      '<div class="card mt-8 p-6">' +
        table(['Business', 'One-time total', 'Deposit 25%', 'Deposit status', 'Remaining 75%', 'Final status', 'Ordered'], rows) +
      '</div>';
  };

  routes['/payments'] = function () {
    var u = O.load().users;
    var collected = u.reduce(function (t, x) {
      return t + O.deposit(x.oneTimeCents) + (x.final === 'paid' ? O.balance(x.oneTimeCents) : 0);
    }, 0);
    var outstanding = u.filter(function (x) { return x.final === 'pending'; })
                       .reduce(function (t, x) { return t + O.balance(x.oneTimeCents); }, 0);
    var mrr = u.filter(function (x) { return x.monthly === 'active'; })
               .reduce(function (t, x) { return t + x.monthlyCents; }, 0);

    var rows = u.map(function (x, i) {
      return '<tr class="clickable" data-act="open-user" data-i="' + i + '">' +
        '<td class="name">' + esc(x.business) + '</td>' +
        '<td class="font-mono">' + money(O.deposit(x.oneTimeCents)) + '</td><td>' + tag(x.deposit) + '</td>' +
        '<td class="font-mono">' + money(O.balance(x.oneTimeCents)) + '</td><td>' + tag(x.final) + '</td>' +
        '<td class="font-mono">' + (x.monthlyCents ? money(x.monthlyCents) + ' / mo' : '—') + '</td>' +
        '<td>' + tag(x.monthly) + '</td></tr>';
    }).join('');

    return head('Payments', 'One-time and recurring, side by side.', null) +
      '<div class="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">' +
        stat('Collected one-time', money(collected)) +
        stat('Outstanding 75%', money(outstanding), 'awaiting customer approval') +
        stat('Monthly recurring', money(mrr), 'active subscriptions only') +
      '</div>' +
      '<div class="card mt-6 p-6">' +
        table(['Business', 'Deposit', 'Status', 'Remaining', 'Status', 'Monthly', 'Status'], rows) +
      '</div>';
  };

  routes['/websites'] = function () {
    var u = O.load().users;
    var rows = u.map(function (x, i) {
      var next = { 'Live': 'Nothing — running', 'Building': 'Finish build', 'Ready for review': 'Waiting on approval',
                   'Awaiting content': 'Chase content', 'Cancelled': 'Archived' }[x.website] || '—';
      return '<tr class="clickable" data-act="open-user" data-i="' + i + '">' +
        '<td class="name">' + esc(x.business) + '</td><td>' + tag(x.website) + '</td>' +
        '<td>' + esc(next) + '</td><td>' + esc(O.date(x.created)) + '</td></tr>';
    }).join('');

    var s = O.load();
    return head('Websites', 'Build pipeline.', null) +
      '<div class="card mt-8 p-6"><p class="mono-label text-ink-soft">' + esc(s.customer.business) + ' — live project</p>' +
        '<ul class="track mt-4">' + O.stages().map(function (st) {
          var dot = st.state === 'done' ? '<span class="dot dot-done">✓</span>'
                  : st.state === 'active' ? '<span class="dot dot-active"></span>'
                  : '<span class="dot dot-wait"></span>';
          return '<li>' + dot + '<span><span class="block text-sm font-semibold">' + esc(st.label) + '</span>' +
            '<span class="block text-[0.8125rem] text-ink-soft">' + esc(st.note) + '</span></span></li>';
        }).join('') + '</ul>' +
      '</div>' +
      '<div class="card mt-6 p-6">' + table(['Business', 'Status', 'Next action', 'Started'], rows) + '</div>';
  };

  routes['/requests'] = function () {
    var s = O.load();
    var rows = s.changeRequests.slice().reverse().map(function (r) {
      return '<tr><td class="name">' + esc(r.id) + '</td><td>' + esc(s.customer.business) + '</td>' +
        '<td>' + esc(r.type) + '</td><td>' + esc(r.description) + '</td>' +
        '<td>' + esc(O.date(r.created)) + '</td><td>' + tag(r.status) + '</td>' +
        '<td><button class="btn btn-ghost px-3 py-1 text-[0.75rem]" data-act="advance-request" data-id="' + esc(r.id) + '">Advance</button></td></tr>';
    }).join('');

    return head('Change Requests', 'What customers have asked for.',
      'Advance moves a request pending → in progress → completed.') +
      '<div class="card mt-8 p-6">' +
        table(['Ref', 'Business', 'Type', 'Description', 'Sent', 'Status', ''], rows) +
      '</div>';
  };

  routes['/maintenance'] = function () {
    var s = O.load();
    var active = O.maintenanceActive();
    return head('Maintenance', 'Allowances and usage.', 'Unused changes do not roll over.') +
      '<div class="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">' +
        stat('Subscribers', active ? '1' : '0', '€19.99 / month each') +
        stat('Changes used', s.maintenance.used + ' / ' + s.maintenance.included, 'this month') +
        stat('Remaining', String(O.changesLeft()), 'resets on the 1st') +
      '</div>' +
      '<div class="card mt-6 p-6"><p class="mono-label text-ink-soft">By customer</p>' +
        table(['Business', 'Plan', 'Used', 'Remaining'],
          '<tr><td class="name">' + esc(s.customer.business) + '</td>' +
          '<td>' + (active ? 'Website Maintenance — €19.99 / mo' : 'None') + '</td>' +
          '<td>' + s.maintenance.used + '</td><td>' + O.changesLeft() + '</td></tr>') +
      '</div>';
  };

  routes['/subscriptions'] = function () {
    var u = O.load().users;
    var rows = u.filter(function (x) { return x.monthlyCents > 0; }).map(function (x, i) {
      return '<tr class="clickable" data-act="open-user" data-i="' + u.indexOf(x) + '">' +
        '<td class="name">' + esc(x.business) + '</td>' +
        '<td class="font-mono">' + money(x.monthlyCents) + ' / mo</td>' +
        '<td>' + tag(x.monthly) + '</td>' +
        '<td>' + (x.monthly === 'active' ? 'Billing monthly' : 'Starts when the site goes live') + '</td></tr>';
    }).join('');

    return head('Subscriptions', 'Recurring services.',
      'Monthly billing only starts once a website goes live.') +
      '<div class="card mt-8 p-6">' + table(['Business', 'Monthly', 'Status', 'Note'], rows) + '</div>';
  };

  routes['/support'] = function () {
    var s = O.load();
    var rows = s.support.slice().reverse().map(function (t) {
      return '<tr><td class="name">' + esc(t.id) + '</td><td>' + esc(s.customer.business) + '</td>' +
        '<td>' + esc(t.subject) + '</td><td>' + esc(O.date(t.created)) + '</td>' +
        '<td>' + tag(t.status) + '</td><td>' + t.messages.length + '</td></tr>';
    }).join('');

    return head('Support', 'Customer messages.', null) +
      '<div class="card mt-8 p-6">' + table(['Ref', 'Business', 'Subject', 'Opened', 'Status', 'Messages'], rows) + '</div>';
  };

  // Transactional email the application is designed to send. Nothing is
  // wired to a provider yet — this is the specification, and the preview
  // page renders each template in full.
  var EMAILS = [
    { key: 'deposit-received', name: 'Deposit received', trigger: '25% deposit succeeds', status: 'Specified' },
    { key: 'content-required', name: 'Content required', trigger: 'Deposit paid, content outstanding', status: 'Specified' },
    { key: 'website-ready',    name: 'Website ready for review', trigger: 'Build complete', status: 'Specified' },
    { key: 'final-due',        name: 'Final payment due', trigger: 'Customer approves the website', status: 'Specified' },
    { key: 'website-live',     name: 'Website live', trigger: 'Final 75% received', status: 'Specified' },
    { key: 'subscription-started', name: 'Monthly service started', trigger: 'Website goes live', status: 'Specified' },
    { key: 'payment-failed',   name: 'Payment failed', trigger: 'Monthly charge declines', status: 'Specified' },
    { key: 'verify-email',     name: 'Email verification code', trigger: 'Sign-up or sign-in', status: 'Simulated in demo' },
    { key: 'password-reset',   name: 'Password reset', trigger: 'Reset requested', status: 'Simulated in demo' }
  ];

  routes['/emails'] = function () {
    var rows = EMAILS.map(function (e) {
      return '<tr><td class="name">' + esc(e.name) + '</td><td>' + esc(e.trigger) + '</td>' +
        '<td>' + tag(e.status === 'Specified' ? 'pending' : 'pending') + ' <span class="text-[0.8125rem]">' + esc(e.status) + '</span></td>' +
        '<td><a class="btn btn-ghost px-3 py-1 text-[0.75rem]" href="emails.html#' + esc(e.key) + '">Preview</a></td></tr>';
    }).join('');

    return head('Email status', 'Transactional email the system sends.',
      'Templates are written and previewable. None are connected to a sending provider yet — that is the next integration.') +
      '<div class="card mt-8 p-6">' + table(['Email', 'Sent when', 'Status', ''], rows) + '</div>' +
      '<div class="card mt-6 p-6"><p class="mono-label text-ink-soft">Rules</p>' +
        '<ul class="mt-3 space-y-2 text-[0.8125rem] leading-relaxed text-ink-mid">' +
          '<li><span class="arrow">&rarr;</span> Never put passwords, full card details or verification codes in a URL.</li>' +
          '<li><span class="arrow">&rarr;</span> Verification codes expire; reset links are single-use and time-limited.</li>' +
          '<li><span class="arrow">&rarr;</span> Service email (build, payment, failure) is separate from marketing, which needs its own opt-in and an unsubscribe link.</li>' +
        '</ul></div>';
  };

  routes['/refunds'] = function () {
    var u = O.load().users;
    var cancelled = u.filter(function (x) { return x.monthly === 'cancelled' || x.final === 'cancelled'; });
    var rows = cancelled.length ? cancelled.map(function (x) {
      return '<tr class="clickable" data-act="open-user" data-i="' + u.indexOf(x) + '">' +
        '<td class="name">' + esc(x.business) + '</td><td>' + esc(x.name) + '</td>' +
        '<td>' + tag(x.website) + '</td>' +
        '<td class="font-mono">' + money(O.deposit(x.oneTimeCents)) + '</td>' +
        '<td>Deposit retained — build had started</td></tr>';
    }).join('') : '<tr><td colspan="5" class="text-ink-soft">No cancellations.</td></tr>';

    return head('Refunds &amp; cancellations', 'What stopped, and what was returned.',
      'Deposits cover work already done; balances are never charged on unapproved projects. Statutory rights override this table.') +
      '<div class="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">' +
        stat('Cancellations', String(cancelled.length)) +
        stat('Refunds issued', money(0), 'none to date') +
        stat('Balances never charged', money(cancelled.reduce(function (t, x) { return t + O.balance(x.oneTimeCents); }, 0)), 'unapproved projects') +
      '</div>' +
      '<div class="card mt-6 p-6">' + table(['Business', 'Contact', 'Website', 'Deposit', 'Outcome'], rows) + '</div>' +
      '<div class="card mt-6 p-6"><p class="mono-label text-ink-soft">Policy reminder</p>' +
        '<p class="mt-3 max-w-prose text-[0.8125rem] leading-relaxed text-ink-mid">Before refusing a refund, check the ' +
          '<a href="refunds.html" class="font-semibold text-accent underline underline-offset-2">Cancellation &amp; Refund Policy</a> ' +
          'and the customer\'s statutory position. Mandatory consumer rights cannot be excluded by the policy.</p></div>';
  };

  routes['/settings'] = function () {
    return head('Settings', 'Internal configuration.', 'Demo only — nothing here is persisted to a server.') +
      '<div class="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">' +
        '<div class="card p-6"><p class="mono-label text-ink-soft">Payment model</p>' +
          '<table class="tbl m-cards mt-4"><tbody>' +
            '<tr><td class="name">Deposit</td><td>25% of the one-time total</td></tr>' +
            '<tr><td class="name">Balance</td><td>75%, due on customer approval</td></tr>' +
            '<tr><td class="name">Monthly services</td><td>Start at launch, never during build</td></tr>' +
            '<tr><td class="name">Target delivery</td><td>7 days from receiving all content</td></tr>' +
          '</tbody></table></div>' +
        '<div class="card p-6"><p class="mono-label text-ink-soft">Demo controls</p>' +
          '<p class="mt-3 text-[0.8125rem] leading-relaxed text-ink-mid">The client dashboard and this admin share one mock store in your browser. Reset it to put the example customer back to “ready for review”.</p>' +
          '<button class="btn btn-ghost mt-4" data-act="reset-demo">Reset demo data</button>' +
          '<p id="reset-note" class="mt-3 hidden text-[0.8125rem] font-semibold text-accent">Demo data reset.</p>' +
        '</div>' +
      '</div>' +

      '<div class="card mt-6 border-dashed p-6">' +
        '<p class="mono-label text-ink-soft">Internal note — not shown to customers</p>' +
        '<p class="mt-3 max-w-prose text-[0.8125rem] leading-relaxed text-ink-mid">' +
          'These pages are a product/UX implementation and are not a substitute for legal advice. ' +
          'Before accepting real customers, review the Terms of Service, Privacy Policy, Cookie Policy, ' +
          'cancellation/refund terms, withdrawal/consumer-rights wording, tax information, and ' +
          'data-processing arrangements for the jurisdictions in which Onsite operates.' +
        '</p>' +
        '<p class="mt-3 max-w-prose text-[0.8125rem] leading-relaxed text-ink-mid">' +
          'Still to connect before launch: a real payment provider, real authentication with hashed ' +
          'passwords, the transactional email templates in ' +
          '<a href="emails.html" class="font-semibold text-accent underline underline-offset-2">emails.html</a>, ' +
          'and the contact and content forms. Every [PLACEHOLDER] in the policy pages and footer needs ' +
          'the real registered details.' +
        '</p>' +
      '</div>';
  };

  var actions = {
    'open-user': function (el) { location.hash = '#/user/' + el.getAttribute('data-i'); },
    'advance-request': function (el) {
      var s = O.load();
      var r = s.changeRequests.filter(function (x) { return x.id === el.getAttribute('data-id'); })[0];
      if (!r) return;
      r.status = r.status === 'pending' ? 'in-progress' : (r.status === 'in-progress' ? 'completed' : 'pending');
      O.save();
      render();
    },
    'reset-demo': function () {
      O.reset();
      O.signIn('team@onsite.demo', 'admin');
      document.getElementById('reset-note').classList.remove('hidden');
    },
    logout: function () { O.signOut(); location.href = 'login.html'; }
  };

  function render() {
    var hash = (location.hash || '#/overview').replace('#', '');
    var parts = hash.split('/');          // ['', 'user', '3']
    var route = '/' + (parts[1] || 'overview');
    var arg = parts[2];

    view.innerHTML = routes[route] ? routes[route](arg) : routes['/overview']();

    [].forEach.call(document.querySelectorAll('.app-nav a'), function (a) {
      a.classList.toggle('is-active', a.getAttribute('href') === '#' + route);
    });
    if (window.OnsiteMobile) { window.OnsiteMobile.labelTables(view); }
    window.scrollTo(0, 0);
  }

  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-act]');
    if (!el) return;
    var fn = actions[el.getAttribute('data-act')];
    if (fn) { e.preventDefault(); fn(el); }
  });

  document.getElementById('logout').addEventListener('click', actions.logout);
  document.getElementById('nav-toggle').addEventListener('click', function () {
    document.getElementById('sidebar').classList.toggle('hidden');
  });

  window.addEventListener('hashchange', render);
  render();
})();
