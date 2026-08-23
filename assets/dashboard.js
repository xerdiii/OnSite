/* ───────────────────────────────────────────────────────────────
   Onsite — client dashboard (demo)
   Hash-routed sections rendered into #view. All state is the mock
   store in demo.js; no network calls, no real payments.
   ─────────────────────────────────────────────────────────────── */
(function () {
  'use strict';

  var O = window.Onsite;
  if (!O.requireSession('customer')) return;

  var view = document.getElementById('view');
  var esc = O.esc;

  // ── Small helpers ────────────────────────────────────────────
  function money(c) { return O.euro(c); }

  function head(eyebrow, title, sub) {
    return '<p class="eyebrow text-ink-soft">' + esc(eyebrow) + '</p>' +
           '<h1 class="h-display doc-title mt-3">' + esc(title) + '</h1>' +
           (sub ? '<p class="mt-3 max-w-prose text-[0.9375rem] leading-relaxed text-ink-mid">' + esc(sub) + '</p>' : '');
  }

  function statusTag(state) {
    var map = {
      paid:      ['tag-ok',   'Paid'],
      pending:   ['tag-wait', 'Pending'],
      due:       ['tag-due',  'Due'],
      active:    ['tag-ok',   'Active'],
      inactive:  ['tag-off',  'Not active'],
      soon:      ['tag-soon', 'Coming soon'],
      completed: ['tag-ok',   'Completed'],
      'in-progress': ['tag-due', 'In progress'],
      answered:  ['tag-ok',   'Answered'],
      open:      ['tag-due',  'Open']
    };
    var m = map[state] || ['tag-wait', state];
    return '<span class="tag ' + m[0] + '">' + esc(m[1]) + '</span>';
  }

  function tracker() {
    return '<ul class="track">' + O.stages().map(function (s) {
      var dot = s.state === 'done' ? '<span class="dot dot-done">✓</span>'
              : s.state === 'active' ? '<span class="dot dot-active"></span>'
              : '<span class="dot dot-wait"></span>';
      var tone = s.state === 'wait' ? 'text-ink-soft' : 'text-ink';
      return '<li>' + dot +
        '<span class="min-w-0 flex-1"><span class="block text-sm font-semibold ' + tone + '">' + esc(s.label) + '</span>' +
        '<span class="block text-[0.8125rem] text-ink-soft">' + esc(s.note) + '</span></span></li>';
    }).join('') + '</ul>';
  }

  // ── Sections ─────────────────────────────────────────────────
  var routes = {};

  routes['/overview'] = function () {
    var s = O.load(), o = s.order;
    var dep = O.deposit(o.oneTimeCents), bal = O.balance(o.oneTimeCents);
    var paidDeposit = s.project.stage !== 'deposit';
    var live = s.project.stage === 'live';

    return head('Overview', 'Welcome back, ' + s.customer.firstName + '.',
      s.customer.business + ' — ' + O.statusLabel() + '.') +

      '<div class="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">' +
        '<div class="card p-5"><p class="mono-label text-ink-soft">Website status</p>' +
          '<p class="h-section mt-2 text-lg">' + esc(O.statusLabel()) + '</p>' +
          '<p class="mt-1 text-[0.8125rem] text-ink-soft">Updated ' + esc(O.date(s.project.lastUpdate)) + '</p></div>' +
        '<div class="card p-5"><p class="mono-label text-ink-soft">Paid so far</p>' +
          '<p class="h-section mt-2 text-lg">' + money(paidDeposit ? dep : 0) + '</p>' +
          '<p class="mt-1 text-[0.8125rem] text-ink-soft">of ' + money(o.oneTimeCents) + ' one-time</p></div>' +
        '<div class="card p-5"><p class="mono-label text-ink-soft">Monthly services</p>' +
          '<p class="h-section mt-2 text-lg">' + money(o.monthlyCents) + '</p>' +
          '<p class="mt-1 text-[0.8125rem] text-ink-soft">' + (live ? 'Billing monthly' : 'Starts when you go live') + '</p></div>' +
      '</div>' +

      '<div class="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-5">' +
        '<div class="card p-6 lg:col-span-3">' +
          '<p class="mono-label text-ink-soft">Project progress</p>' +
          '<div class="mt-4">' + tracker() + '</div>' +
          '<a href="#/website" class="btn btn-primary mt-5">Open my website</a>' +
        '</div>' +
        '<div class="card p-6 lg:col-span-2">' +
          '<p class="mono-label text-ink-soft">What happens next</p>' +
          '<ul class="timeline mt-4 text-[0.8125rem] leading-relaxed text-ink-mid">' +
            '<li><span class="font-semibold text-ink">Review your website.</span> Open it, look through every section and tell us anything that is wrong.</li>' +
            '<li class="pending"><span class="font-semibold text-ink">Approve it.</span> Approval is what makes the remaining 75% due — ' + money(bal) + '.</li>' +
            '<li class="pending"><span class="font-semibold text-ink">Go live.</span> Your site is published and your monthly services begin.</li>' +
          '</ul>' +
        '</div>' +
      '</div>';
  };

  routes['/website'] = function () {
    var s = O.load(), p = s.project, o = s.order;
    var bal = O.balance(o.oneTimeCents);
    var stage = p.stage;

    var action = '';
    if (stage === 'review') {
      action = '<div class="card-ink mt-6 p-6">' +
        '<p class="mono-label text-white/70">Your move</p>' +
        '<h3 class="h-section mt-2 text-xl text-white">Ready for your review</h3>' +
        '<p class="mt-2 text-[0.8125rem] leading-relaxed text-white/80">Look through the preview. When you are happy, approve it — that is what makes the remaining 75% (' + money(bal) + ') due. Nothing is charged automatically.</p>' +
        '<div class="mt-5 flex flex-wrap gap-3">' +
          '<button class="btn btn-light" data-act="approve">Approve website</button>' +
          '<button class="btn btn-ghost" data-act="changes">Something needs changing</button>' +
        '</div></div>';
    } else if (stage === 'final') {
      action = '<div class="card-ink mt-6 p-6">' +
        '<p class="mono-label text-white/70">Final payment</p>' +
        '<h3 class="h-section mt-2 text-xl text-white">Approved — ' + money(bal) + ' now due</h3>' +
        '<p class="mt-2 text-[0.8125rem] leading-relaxed text-white/80">Once this is paid your website goes live and your monthly services begin.</p>' +
        '<button class="btn btn-light mt-5" data-act="pay-final">Pay ' + money(bal) + ' &amp; go live</button></div>';
    } else if (stage === 'live') {
      action = '<div class="card mt-6 p-6"><p class="mono-label text-ink-soft">Live</p>' +
        '<h3 class="h-section mt-2 text-xl">Your website is live</h3>' +
        '<p class="mt-2 text-[0.8125rem] leading-relaxed text-ink-mid">Paid in full. Monthly services are running — see <a href="#/services" class="font-semibold text-accent underline underline-offset-2">My Services</a>.</p></div>';
    }

    return head('My Website', s.customer.business, null) +

      '<div class="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">' +
        '<div class="card p-5"><p class="mono-label text-ink-soft">Status</p><p class="h-section mt-2 text-base">' + esc(O.statusLabel()) + '</p></div>' +
        '<div class="card p-5"><p class="mono-label text-ink-soft">Address</p><p class="h-section mt-2 text-base">' + esc(s.customer.websiteUrl) + '</p></div>' +
        '<div class="card p-5"><p class="mono-label text-ink-soft">Delivery date</p><p class="h-section mt-2 text-base">' + esc(O.date(p.deliveryDate)) + '</p></div>' +
        '<div class="card p-5"><p class="mono-label text-ink-soft">Last update</p><p class="h-section mt-2 text-base">' + esc(O.date(p.lastUpdate)) + '</p></div>' +
      '</div>' +

      action +

      '<div class="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-5">' +
        '<div class="card p-6 lg:col-span-3">' +
          '<p class="mono-label text-ink-soft">Build progress</p>' +
          '<div class="mt-4">' + tracker() + '</div>' +
        '</div>' +
        '<div class="card p-6 lg:col-span-2">' +
          '<p class="mono-label text-ink-soft">Preview</p>' +
          '<p class="mt-3 text-[0.8125rem] leading-relaxed text-ink-mid">Your build is staged at <span class="font-semibold text-ink">' + esc(p.previewUrl) + '</span>.</p>' +
          '<button class="btn btn-ghost mt-4" data-act="preview">Open preview</button>' +
          '<p id="preview-note" class="mt-3 hidden text-[0.8125rem] leading-relaxed text-ink-soft">The staging site is simulated in this demo — there is no live preview to open yet.</p>' +
          '<p class="mono-label mt-6 text-ink-soft">Domain &amp; hosting</p>' +
          '<table class="tbl m-cards mt-3"><tbody>' +
            '<tr><td class="name">Domain</td><td>' + esc(s.customer.websiteUrl) + '</td></tr>' +
            '<tr><td class="name">Managed by</td><td>Onsite</td></tr>' +
            '<tr><td class="name">Hosting</td><td>' + (p.stage === 'live' ? 'Live — served by Onsite' : 'Staged, not yet published') + '</td></tr>' +
            '<tr><td class="name">SSL / HTTPS</td><td>' + (p.stage === 'live' ? 'Active' : 'Issued at launch') + '</td></tr>' +
          '</tbody></table>' +
          '<p class="mono-label mt-6 text-ink-soft">Selected features</p>' +
          '<ul class="mt-3 space-y-1.5 text-[0.8125rem] text-ink-mid">' +
            p.features.map(function (f) { return '<li><span class="arrow">&rarr;</span> ' + esc(f) + '</li>'; }).join('') +
          '</ul>' +
        '</div>' +
      '</div>';
  };

  routes['/payments'] = function () {
    var s = O.load(), o = s.order;
    var dep = O.deposit(o.oneTimeCents), bal = O.balance(o.oneTimeCents);
    var stage = s.project.stage;
    var finalPaid = stage === 'live';
    var monthlyRunning = stage === 'live';

    var rows = s.payments.map(function (p) {
      var st = p.status === 'paid' ? 'paid' : (stage === 'final' ? 'due' : 'pending');
      return '<tr><td class="name">' + esc(p.id) + '</td><td>' + esc(p.description) + '</td>' +
        '<td>' + (p.date ? esc(O.date(p.date)) : '—') + '</td>' +
        '<td class="font-mono">' + money(p.cents) + '</td>' +
        '<td>' + statusTag(st) + '</td>' +
        '<td><button class="btn btn-ghost px-3 py-1 text-[0.75rem]" data-act="invoice" data-id="' + esc(p.id) + '">Receipt</button></td></tr>';
    }).join('');

    return head('Payments', 'One-time and monthly, kept apart.',
      'Your website is a one-time cost split 25/75. Monthly services are separate and only start once you are live.') +

      '<div class="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">' +
        '<div class="card p-5"><p class="mono-label text-ink-soft">One-time website total</p><p class="h-section mt-2 text-xl">' + money(o.oneTimeCents) + '</p></div>' +
        '<div class="card p-5"><p class="mono-label text-ink-soft">Paid</p><p class="h-section mt-2 text-xl">' + money(finalPaid ? o.oneTimeCents : dep) + '</p><p class="mt-1 text-[0.8125rem] text-ink-soft">25% deposit' + (finalPaid ? ' + 75% balance' : '') + '</p></div>' +
        '<div class="card p-5"><p class="mono-label text-ink-soft">Outstanding</p><p class="h-section mt-2 text-xl">' + money(finalPaid ? 0 : bal) + '</p><p class="mt-1 text-[0.8125rem] text-ink-soft">' + (finalPaid ? 'Nothing outstanding' : 'Due after approval') + '</p></div>' +
      '</div>' +

      '<div class="card mt-6 p-6">' +
        '<p class="mono-label text-ink-soft">Website — ' + money(o.oneTimeCents) + ' one-time</p>' +
        '<ul class="timeline mt-4 text-[0.8125rem] leading-relaxed text-ink-mid">' +
          '<li><span class="font-semibold text-ink">25% deposit — ' + money(dep) + '</span><br>Paid ' + esc(O.date('2026-08-04')) + '. This started the project.</li>' +
          '<li' + (finalPaid ? '' : ' class="pending"') + '><span class="font-semibold text-ink">Remaining 75% — ' + money(bal) + '</span><br>' +
            (finalPaid ? 'Paid in full.' : 'Due after you approve the finished website.') + '</li>' +
          '<li' + (monthlyRunning ? '' : ' class="pending"') + '><span class="font-semibold text-ink">Monthly services — ' + money(o.monthlyCents) + ' / month</span><br>' +
            (monthlyRunning ? 'Billing monthly from launch.' : 'Not charged until your website goes live.') + '</li>' +
        '</ul>' +
      '</div>' +

      '<div class="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">' +
        '<div class="card p-6"><p class="mono-label text-ink-soft">Monthly services</p>' +
          '<table class="tbl m-cards mt-4"><tbody>' +
            o.monthlyItems.map(function (m) {
              return '<tr><td class="name">' + esc(m.name) + '</td><td class="font-mono">' + money(m.cents) + ' / mo</td><td>' +
                statusTag(monthlyRunning ? 'active' : 'pending') + '</td></tr>';
            }).join('') +
            '<tr><td class="name">Total</td><td class="font-mono">' + money(o.monthlyCents) + ' / mo</td><td></td></tr>' +
          '</tbody></table>' +
          '<p class="mt-4 text-[0.8125rem] leading-relaxed text-ink-soft">' +
            (monthlyRunning ? 'Next monthly payment: ' + esc(O.date('2026-09-18')) + '.' : 'First monthly payment is taken on the day your website goes live.') +
          '</p>' +
        '</div>' +
        '<div class="card p-6"><p class="mono-label text-ink-soft">Invoices &amp; receipts</p>' +
          '<div class="mt-4 overflow-x-auto"><table class="tbl m-cards">' +
            '<thead><tr><th>Ref</th><th>Description</th><th>Date</th><th>Amount</th><th>Status</th><th></th></tr></thead>' +
            '<tbody>' + rows + '</tbody></table></div>' +
          '<p id="invoice-note" class="mt-3 hidden text-[0.8125rem] text-ink-soft"></p>' +
        '</div>' +
      '</div>';
  };

  routes['/business'] = function () {
    var c = O.load().customer;
    function f(id, label, val, hint) {
      return '<div class="field"><label for="' + id + '">' + esc(label) + '</label>' +
        (hint ? '<span class="hint">' + esc(hint) + '</span>' : '') +
        '<input id="' + id + '" type="text" value="' + esc(val) + '"></div>';
    }

    return head('Business Information', 'What your website says about you.',
      'Edit anything here and send it to us. Nothing publishes automatically — every edit becomes a change request we action.') +

      '<div class="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">' +
        '<div class="card p-6"><p class="mono-label text-ink-soft">Contact details</p>' +
          '<div class="mt-5 grid grid-cols-1 gap-5">' +
            f('bi-business', 'Business name', c.business) +
            f('bi-owner', 'Owner name', c.firstName + ' ' + c.lastName) +
            f('bi-email', 'Email', c.email) +
            f('bi-phone', 'Phone', c.phone) +
            f('bi-address', 'Address', c.address) +
            f('bi-url', 'Website address', c.websiteUrl) +
          '</div></div>' +

        '<div class="card p-6"><p class="mono-label text-ink-soft">Profiles &amp; links</p>' +
          '<div class="mt-5 grid grid-cols-1 gap-5">' +
            f('bi-google', 'Google Business profile', c.googleProfile) +
            f('bi-whatsapp', 'WhatsApp number', c.whatsapp) +
            f('bi-instagram', 'Instagram', c.socials.instagram) +
            f('bi-facebook', 'Facebook', c.socials.facebook) +
            f('bi-tiktok', 'TikTok', c.socials.tiktok, 'Leave blank if you do not use it.') +
          '</div></div>' +
      '</div>' +

      '<div class="card mt-6 p-6"><p class="mono-label text-ink-soft">Opening hours</p>' +
        '<div class="mt-4 overflow-x-auto"><table class="tbl m-cards"><tbody>' +
          c.hours.map(function (h) {
            return '<tr><td class="name">' + esc(h.day) + '</td><td>' + esc(h.open) + '</td></tr>';
          }).join('') +
        '</tbody></table></div>' +
        '<p class="mt-4 text-[0.8125rem] text-ink-soft">To change your hours, send it as a change request — it counts as one of your monthly changes.</p>' +
      '</div>' +

      '<div class="card mt-6 p-6"><p class="mono-label text-ink-soft">Website content</p>' +
        '<div class="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">' +
          [['Services', '9 services listed'], ['Prices', 'Shown against each service'],
           ['Photos', '14 photos in the gallery'], ['Logo', 'Supplied, in use'],
           ['About section', '2 paragraphs'], ['Testimonials', 'Not on the page yet']].map(function (i) {
            return '<div class="card-quiet p-4"><p class="text-sm font-semibold">' + esc(i[0]) + '</p>' +
              '<p class="mt-1 text-[0.8125rem] text-ink-soft">' + esc(i[1]) + '</p></div>';
          }).join('') +
        '</div>' +
      '</div>' +

      '<div class="mt-6 flex flex-wrap items-center gap-4">' +
        '<button class="btn btn-primary" data-act="submit-business">Send changes to Onsite</button>' +
        '<p class="text-[0.8125rem] text-ink-soft">Creates a change request. Nothing goes live until we action it.</p>' +
      '</div>' +
      '<p id="business-done" class="mt-4 hidden text-[0.8125rem] font-semibold text-accent"></p>';
  };

  routes['/request'] = function () {
    var s = O.load();
    var active = O.maintenanceActive();
    var left = O.changesLeft();

    if (!active) {
      return head('Request a Change', 'Website Maintenance is not active.',
        'Change requests are part of the Website Maintenance subscription. Without it, changes are quoted individually.') +
        '<div class="card mt-8 p-6">' +
          '<p class="mono-label text-ink-soft">Website Maintenance</p>' +
          '<p class="h-section mt-2 text-2xl">€19.99 <span class="text-base text-ink-soft">/ month</span></p>' +
          '<p class="mt-3 max-w-prose text-[0.8125rem] leading-relaxed text-ink-mid">Up to 15 reasonable changes a month — text, photos, opening hours, prices, services and business information.</p>' +
          '<button class="btn btn-primary mt-5" data-act="activate-maintenance">Activate Website Maintenance — €19.99/month</button>' +
        '</div>';
    }

    var rows = s.changeRequests.slice().reverse().map(function (r) {
      return '<tr><td class="name">' + esc(r.id) + '</td><td>' + esc(r.type) + '</td>' +
        '<td class="max-w-sm">' + esc(r.description) + '</td>' +
        '<td>' + esc(O.date(r.created)) + '</td><td>' + statusTag(r.status) + '</td></tr>';
    }).join('');

    return head('Request a Change', 'Tell us what to change.',
      'Send it here and we handle it. You will see the status move from pending to in progress to completed.') +

      '<div class="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-5">' +
        '<div class="card p-6 lg:col-span-3">' +
          '<div class="field"><label for="cr-type">Change type</label>' +
            '<select id="cr-type">' +
              ['Text', 'Photos', 'Opening hours', 'Prices', 'Services', 'Business information', 'Something else']
                .map(function (t) { return '<option>' + t + '</option>'; }).join('') +
            '</select></div>' +
          '<div class="field mt-5"><label for="cr-desc">Description</label>' +
            '<span class="hint">What should change, and what should it say instead?</span>' +
            '<textarea id="cr-desc"></textarea></div>' +
          '<div class="field mt-5"><label for="cr-text">Exact text (optional)</label>' +
            '<span class="hint">Paste the wording you want used and we will use it as written.</span>' +
            '<textarea id="cr-text"></textarea></div>' +
          '<div class="grid grid-cols-1 gap-5 sm:grid-cols-2">' +
            '<div class="field mt-5"><label for="cr-photo">Photo upload</label><input id="cr-photo" type="file" accept="image/*" multiple></div>' +
            '<div class="field mt-5"><label for="cr-deadline">Requested deadline</label><input id="cr-deadline" type="date"></div>' +
          '</div>' +
          '<div class="field mt-5"><label for="cr-notes">Additional notes</label><textarea id="cr-notes"></textarea></div>' +
          '<button class="btn btn-primary mt-6" data-act="submit-change">Submit change request</button>' +
          '<p id="cr-done" class="mt-4 hidden text-[0.8125rem] font-semibold text-accent"></p>' +
        '</div>' +

        '<div class="lg:col-span-2">' +
          '<div class="card p-6"><p class="mono-label text-ink-soft">Your allowance</p>' +
            '<p class="h-section mt-2 text-2xl">' + left + ' / ' + s.maintenance.included + '</p>' +
            '<p class="mt-1 text-[0.8125rem] text-ink-soft">changes remaining this month</p>' +
            '<p class="mt-4 text-[0.8125rem] leading-relaxed text-ink-soft">Unused changes do not roll over into next month.</p>' +
          '</div>' +
          '<div class="card mt-4 p-6"><p class="mono-label text-ink-soft">Not included</p>' +
            '<ul class="mt-3 space-y-1.5 text-[0.8125rem] text-ink-mid">' +
              ['Major redesigns', 'New functionality', 'New pages beyond scope', 'Custom development']
                .map(function (i) { return '<li><span class="arrow">&rarr;</span> ' + i + '</li>'; }).join('') +
            '</ul>' +
            '<p class="mt-3 text-[0.8125rem] text-ink-soft">These are quoted separately.</p>' +
          '</div>' +
        '</div>' +
      '</div>' +

      '<div class="card mt-6 p-6"><p class="mono-label text-ink-soft">Your requests</p>' +
        '<div class="mt-4 overflow-x-auto"><table class="tbl m-cards">' +
          '<thead><tr><th>Ref</th><th>Type</th><th>Description</th><th>Sent</th><th>Status</th></tr></thead>' +
          '<tbody>' + rows + '</tbody></table></div>' +
      '</div>';
  };

  routes['/maintenance'] = function () {
    var s = O.load();
    var active = O.maintenanceActive();
    var left = O.changesLeft();

    var history = s.changeRequests.slice().reverse().map(function (r) {
      return '<tr><td class="name">' + esc(r.id) + '</td><td>' + esc(r.type) + '</td>' +
        '<td>' + esc(O.date(r.created)) + '</td><td>' + statusTag(r.status) + '</td></tr>';
    }).join('');

    return head('Website Maintenance', 'Changes, handled.',
      'Send us what needs updating and we do it — no editor to learn, no plugin to update.') +

      '<div class="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-5">' +
        '<div class="card p-6 lg:col-span-3">' +
          '<div class="flex flex-wrap items-baseline justify-between gap-3">' +
            '<p class="h-section text-2xl">€19.99 <span class="text-base text-ink-soft">/ month</span></p>' +
            statusTag(active ? 'active' : 'inactive') +
          '</div>' +
          '<p class="mono-label mt-6 text-ink-soft">Included every month</p>' +
          '<ul class="mt-3 grid grid-cols-1 gap-1.5 text-[0.8125rem] text-ink-mid sm:grid-cols-2">' +
            ['Up to 15 website changes', 'Text updates', 'Photo updates', 'Opening hours',
             'Prices', 'Services', 'Business information']
              .map(function (i) { return '<li><span class="arrow">&rarr;</span> ' + i + '</li>'; }).join('') +
          '</ul>' +
          (active
            ? '<button class="btn btn-ghost mt-6" data-act="cancel-maintenance">Cancel maintenance</button>'
            : '<button class="btn btn-primary mt-6" data-act="activate-maintenance">Activate — €19.99/month</button>') +
        '</div>' +

        '<div class="card p-6 lg:col-span-2">' +
          '<p class="mono-label text-ink-soft">This month</p>' +
          '<p class="h-section mt-2 text-3xl">' + left + ' / ' + s.maintenance.included + '</p>' +
          '<p class="mt-1 text-[0.8125rem] text-ink-soft">changes remaining</p>' +
          '<div class="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-line">' +
            '<div class="h-full bg-accent" style="width:' + Math.round((s.maintenance.used / s.maintenance.included) * 100) + '%"></div>' +
          '</div>' +
          '<p class="mt-4 text-[0.8125rem] leading-relaxed text-ink-soft">' + s.maintenance.used + ' used. Unused changes do not roll over — the allowance resets on the 1st.</p>' +
          '<a href="#/request" class="btn btn-primary btn-block mt-5">Request a change</a>' +
        '</div>' +
      '</div>' +

      '<div class="card mt-6 p-6"><p class="mono-label text-ink-soft">Recent requests</p>' +
        '<div class="mt-4 overflow-x-auto"><table class="tbl m-cards">' +
          '<thead><tr><th>Ref</th><th>Type</th><th>Sent</th><th>Status</th></tr></thead>' +
          '<tbody>' + history + '</tbody></table></div>' +
      '</div>';
  };

  routes['/services'] = function () {
    var s = O.load();
    var live = s.project.stage === 'live';

    function card(sv) {
      var price = sv.cents == null ? '—'
        : (sv.cadence === 'month' ? money(sv.cents) + ' / month' : money(sv.cents) + ' one-time');
      var setup = sv.setupCents ? '<p class="mt-1 text-[0.8125rem] text-ink-soft">Plus ' + money(sv.setupCents) + ' one-time setup</p>' : '';
      var action = sv.state === 'active'
          ? '<p class="mt-4 text-[0.8125rem] text-ink-soft">' + (sv.cadence === 'month' ? (live ? 'Billing monthly.' : 'Starts when your website goes live.') : 'Paid as part of your project.') + '</p>'
        : sv.state === 'available'
          ? '<button class="btn btn-primary mt-4" data-act="activate-service" data-name="' + esc(sv.name) + '">Activate</button>'
          : '<button class="btn btn-ghost mt-4" disabled>Not available yet</button>';

      return '<div class="card p-5">' +
        '<div class="flex items-start justify-between gap-3">' +
          '<p class="h-section text-base">' + esc(sv.name) + '</p>' +
          statusTag(sv.state === 'available' ? 'inactive' : sv.state) +
        '</div>' +
        '<p class="mt-2 font-mono text-[0.8125rem] text-ink-mid">' + price + '</p>' + setup + action +
      '</div>';
    }

    var active = s.services.filter(function (x) { return x.state === 'active'; });
    var avail  = s.services.filter(function (x) { return x.state === 'available'; });
    var soon   = s.services.filter(function (x) { return x.state === 'soon'; });

    return head('My Services', 'Everything you have, and everything you could add.', null) +
      '<p class="mono-label mt-8 text-ink-soft">Active</p>' +
      '<div class="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">' + active.map(card).join('') + '</div>' +
      '<p class="mono-label mt-8 text-ink-soft">Available to add</p>' +
      '<div class="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">' + avail.map(card).join('') + '</div>' +
      '<p class="mono-label mt-8 text-ink-soft">Coming soon</p>' +
      '<div class="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">' + soon.map(card).join('') + '</div>' +
      '<p class="mt-4 text-[0.8125rem] text-ink-soft">Coming-soon services cannot be ordered yet. We will tell you when they open.</p>';
  };

  // ── Build your package ───────────────────────────────────
  function draft() {
    var s = O.load();
    if (!s.draft) { s.draft = O.emptyDraft(); O.save(); }
    return s.draft;
  }

  // One-time and monthly totals for whatever is currently selected.
  function draftTotals() {
    var d = draft(), C = O.CATALOG;
    var once = 0, month = 0;

    var base = C.websites.filter(function (w) { return w.key === d.base; })[0];
    if (base) once += base.cents;

    C.oneTime.forEach(function (i) { if (d.oneTime.indexOf(i.name) > -1) once += i.cents; });
    C.monthly.forEach(function (m) {
      if (d.monthly.indexOf(m.name) < 0) return;
      month += m.cents;
      if (m.setupCents) once += m.setupCents;   // Digital Menu setup is one-time
    });
    C.extras.forEach(function (x) { if (d.extras.indexOf(x.name) > -1) once += x.cents; });

    return { once: once, month: month, deposit: O.deposit(once), balance: O.balance(once), base: base };
  }

  function draftReady() {
    var d = draft(), t = draftTotals();
    if (!t.base) return false;
    if (t.base.minFeatures && d.features.length < t.base.minFeatures) return false;
    return d.agreed;
  }

  routes['/build'] = function () {
    var C = O.CATALOG, d = draft(), t = draftTotals(), s = O.load();
    var isCustom = d.base === 'custom';
    var isPro = d.base === 'pro';
    var featuresOn = isPro ? C.features.slice() : d.features;

    function tile(on, name, priceHtml, tagHtml, blurb, act, key, off) {
      return '<button type="button" class="build-card' + (on ? ' is-on' : '') + '"' +
        (off ? ' disabled' : '') + ' data-act="' + act + '" data-key="' + esc(key) + '">' +
        '<span class="flex items-baseline justify-between gap-3">' +
          '<span class="h-section text-base">' + esc(name) + '</span>' +
          (priceHtml ? '<span class="h-section whitespace-nowrap text-base text-ink">' + priceHtml + '</span>' : '') +
        '</span>' +
        (tagHtml ? '<span class="mt-2 block">' + tagHtml + '</span>' : '') +
        (blurb ? '<span class="mt-2 block text-[0.8125rem] leading-snug text-ink-mid">' + esc(blurb) + '</span>' : '') +
        '<span class="build-state">' + (on ? '✓ Added' : 'Add') + '</span>' +
      '</button>';
    }

    // Step 1 — website
    var websites = C.websites.map(function (w) {
      return tile(d.base === w.key, w.name, money(w.cents), '<span class="tag tag-once">One-time</span>',
        w.blurb + ' ' + w.note, 'pick-base', w.key);
    }).join('');

    // Step 2 — features
    var featureNote = !d.base
      ? 'Choose a website first.'
      : (isPro
          ? 'All ten website features are included in the Professional Website. Nothing to choose.'
          : 'Pick at least three. ' + d.features.length + ' of ' + 3 + ' selected — picking more never changes the price.');

    var features = C.features.map(function (f) {
      return tile(featuresOn.indexOf(f) > -1, f, '', '', '', 'toggle-feature', f, !isCustom);
    }).join('');

    // Step 3 — services
    var oneTimeAddons = C.oneTime.map(function (i) {
      return tile(d.oneTime.indexOf(i.name) > -1, i.name, money(i.cents),
        '<span class="tag tag-once">One-time</span>', i.blurb, 'toggle-onetime', i.name, !d.base);
    }).join('');

    var monthly = C.monthly.map(function (m) {
      var price = money(m.cents);
      var tags = '<span class="tag tag-month">Per month</span>' +
        (m.setupCents ? ' <span class="tag tag-once">+ ' + money(m.setupCents) + ' setup</span>' : '');
      return tile(d.monthly.indexOf(m.name) > -1, m.name, price, tags, m.blurb, 'toggle-monthly', m.name, !d.base);
    }).join('');

    // Step 4 — extras, grouped
    var groups = {};
    C.extras.forEach(function (x) { (groups[x.group] = groups[x.group] || []).push(x); });
    var extras = Object.keys(groups).map(function (g) {
      return '<p class="mono-label mt-6 text-ink-soft">' + esc(g) + '</p>' +
        '<div class="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-3">' +
        groups[g].map(function (x) {
          return tile(d.extras.indexOf(x.name) > -1, x.name,
            (x.from ? 'From ' : '') + money(x.cents),
            '<span class="tag tag-once">One-time</span>', x.blurb, 'toggle-extra', x.name, !d.base);
        }).join('') + '</div>';
    }).join('');

    // Summary lines
    var onceLines = [];
    if (t.base) onceLines.push([t.base.name, money(t.base.cents)]);
    C.oneTime.forEach(function (i) { if (d.oneTime.indexOf(i.name) > -1) onceLines.push([i.name, money(i.cents)]); });
    C.monthly.forEach(function (m) {
      if (d.monthly.indexOf(m.name) > -1 && m.setupCents) onceLines.push([m.name + ' — setup', money(m.setupCents)]);
    });
    C.extras.forEach(function (x) { if (d.extras.indexOf(x.name) > -1) onceLines.push([x.name + (x.from ? ' — from' : ''), money(x.cents)]); });

    var monthLines = C.monthly.filter(function (m) { return d.monthly.indexOf(m.name) > -1; })
      .map(function (m) { return [m.name, money(m.cents) + ' / mo']; });

    function rows(list, empty) {
      if (!list.length) return '<li class="py-2.5 text-ink-soft">' + empty + '</li>';
      return list.map(function (l) {
        return '<li class="flex items-baseline justify-between gap-4 border-b border-line-firm py-2.5">' +
          '<span>' + esc(l[0]) + '</span><span class="text-ink">' + l[1] + '</span></li>';
      }).join('');
    }

    var blocked = !t.base ? 'Choose a website to continue.'
      : (isCustom && d.features.length < 3) ? 'Pick at least three website features.'
      : (!d.agreed ? 'Agree to the Terms of Service to continue.'
      : 'Only the 25% deposit is charged today.');

    var warn = (s.project && s.project.stage && s.project.stage !== 'live')
      ? '<div class="demo-note mt-4">You already have a project in progress. Submitting this package replaces it in the demo.</div>'
      : '';

    return head('Build your package', 'Choose what you need.',
      'Pick your website, the features it should have, any services, and any extras. You pay 25% today and the remaining 75% once you have reviewed and approved the finished site.') +

      '<div class="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-10">' +

        '<div class="lg:col-span-7 xl:col-span-8">' +

          '<div class="border-t-2 border-accent pt-5">' +
            '<div class="flex flex-wrap items-baseline gap-x-4"><span class="mono-label text-ink-soft">Step 01</span>' +
            '<h2 class="h-section text-xl">Your website</h2>' +
            '<span class="ml-auto mono-label text-ink-soft">Both paid once</span></div>' +
            '<div class="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">' + websites + '</div>' +
          '</div>' +

          '<div class="mt-10 border-t-2 border-accent pt-5">' +
            '<div class="flex flex-wrap items-baseline gap-x-4"><span class="mono-label text-ink-soft">Step 02</span>' +
            '<h2 class="h-section text-xl">Website features</h2>' +
            '<span class="ml-auto mono-label text-ink-soft">' + (isPro ? 'All included' : d.features.length + ' selected') + '</span></div>' +
            '<p class="mt-3 max-w-prose text-[0.8125rem] leading-relaxed text-ink-mid">' + esc(featureNote) + '</p>' +
            '<div class="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-3">' + features + '</div>' +
          '</div>' +

          '<div class="mt-10 border-t-2 border-accent pt-5">' +
            '<div class="flex flex-wrap items-baseline gap-x-4"><span class="mono-label text-ink-soft">Step 03</span>' +
            '<h2 class="h-section text-xl">Services</h2></div>' +
            '<p class="mono-label mt-5 text-ink-soft">One-time</p>' +
            '<div class="mt-3 grid grid-cols-1 gap-2.5">' + oneTimeAddons + '</div>' +
            '<p class="mono-label mt-6 text-ink-soft">Monthly — starts when your website goes live</p>' +
            '<div class="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">' + monthly + '</div>' +
          '</div>' +

          '<div class="mt-10 border-t-2 border-accent pt-5">' +
            '<div class="flex flex-wrap items-baseline gap-x-4"><span class="mono-label text-ink-soft">Step 04</span>' +
            '<h2 class="h-section text-xl">Business extras</h2>' +
            '<span class="ml-auto mono-label text-ink-soft">Optional · one-time</span></div>' +
            extras +
          '</div>' +

        '</div>' +

        '<div class="lg:col-span-5 xl:col-span-4">' +
          '<div class="lg:sticky lg:top-24">' +
            '<div class="overflow-hidden rounded-lg border border-line bg-paper">' +
              '<div class="border-b border-line px-5 py-4"><p class="eyebrow text-ink-soft">Your order</p></div>' +

              '<div class="px-5 py-4">' +
                '<p class="eyebrow text-ink-soft">One-time</p>' +
                '<ul class="mt-2 font-mono text-[0.8125rem] text-ink-mid">' + rows(onceLines, 'Nothing selected yet') + '</ul>' +
                '<div class="mt-2 flex items-baseline justify-between gap-4 border-t border-line-firm pt-2.5">' +
                  '<span class="mono-label text-ink">One-time total</span>' +
                  '<span class="h-section text-lg text-ink">' + money(t.once) + '</span></div>' +
              '</div>' +

              '<div class="border-t border-line px-5 py-4">' +
                '<p class="eyebrow text-ink-soft">Monthly</p>' +
                '<ul class="mt-2 font-mono text-[0.8125rem] text-ink-mid">' + rows(monthLines, 'No monthly services selected') + '</ul>' +
                '<div class="mt-2 flex items-baseline justify-between gap-4 border-t border-line-firm pt-2.5">' +
                  '<span class="mono-label text-ink">Monthly total</span>' +
                  '<span class="h-section text-lg text-ink">' + money(t.month) + ' / month</span></div>' +
              '</div>' +

              '<div class="bg-accent px-5 py-5 text-white">' +
                '<div class="flex items-baseline justify-between gap-4">' +
                  '<span class="mono-label text-white">Pay today</span>' +
                  '<span class="h-section text-2xl">' + money(t.deposit) + '</span></div>' +
                '<p class="mt-1.5 text-xs leading-relaxed text-white/70">25% deposit to start your website.</p>' +
                '<div class="mt-4 flex items-baseline justify-between gap-4 border-t border-white/20 pt-4">' +
                  '<span class="mono-label text-white/70">After approval</span>' +
                  '<span class="h-section text-lg">' + money(t.balance) + '</span></div>' +
                '<p class="mt-1.5 text-xs leading-relaxed text-white/70">The remaining 75%, due only once you approve the finished site.</p>' +
                '<div class="mt-4 flex items-baseline justify-between gap-4 border-t border-white/20 pt-4">' +
                  '<span class="mono-label text-white/70">Monthly after launch</span>' +
                  '<span class="h-section text-lg">' + money(t.month) + '</span></div>' +

                '<label class="mt-5 flex cursor-pointer items-start gap-2.5 border-t border-white/20 pt-4">' +
                  '<input type="checkbox" data-act="toggle-agree" class="mt-0.5 h-4 w-4 flex-none accent-white"' + (d.agreed ? ' checked' : '') + '>' +
                  '<span class="text-xs leading-relaxed text-white/80">I have read and agree to the ' +
                    '<a href="terms" class="font-semibold text-white underline underline-offset-2">Terms of Service</a> ' +
                    'and acknowledge the payment schedule shown above.</span></label>' +

                '<button class="btn btn-light btn-block mt-4" data-act="pay-deposit"' + (draftReady() ? '' : ' disabled') + '>' +
                  (t.deposit > 0 ? 'Pay ' + money(t.deposit) + ' deposit &amp; start' : 'Pay deposit &amp; start') + '</button>' +
                '<p class="mt-2.5 text-center text-xs text-white/60">' + esc(blocked) + '</p>' +
                '<p class="mt-2 text-center text-[0.6875rem] leading-relaxed text-white/50">Demo build — no card is taken and no money moves.</p>' +
              '</div>' +

              '<div class="border-t border-line px-5 py-4">' +
                '<button class="text-[0.8125rem] font-semibold text-ink-mid hover:text-ink" data-act="clear-draft">Clear this package</button>' +
              '</div>' +
            '</div>' +
            warn +
          '</div>' +
        '</div>' +

      '</div>';
  };

  routes['/subscriptions'] = function () {
    var s = O.load(), o = s.order;
    var live = s.project.stage === 'live';
    var nextBilling = live ? O.date('2026-09-18') : 'When your website goes live';

    var rows = o.monthlyItems.map(function (m) {
      return '<tr><td class="name">' + esc(m.name) + '</td>' +
        '<td class="font-mono">' + money(m.cents) + ' / month</td>' +
        '<td>Monthly</td>' +
        '<td>' + esc(nextBilling) + '</td>' +
        '<td>' + statusTag(live ? 'active' : 'pending') + '</td>' +
        '<td><button class="btn btn-ghost px-3 py-1 text-[0.75rem]" data-act="cancel-service" data-name="' + esc(m.name) + '">Cancel</button></td></tr>';
    }).join('');

    return head('Subscriptions', 'What recurs, and when.',
      'Monthly services are separate from your one-time website cost. They start at launch and can be stopped at any time.') +

      '<div class="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">' +
        '<div class="card p-5"><p class="mono-label text-ink-soft">Monthly total</p><p class="h-section mt-2 text-xl">' + money(o.monthlyCents) + '</p></div>' +
        '<div class="card p-5"><p class="mono-label text-ink-soft">Billing frequency</p><p class="h-section mt-2 text-xl">Monthly</p><p class="mt-1 text-[0.8125rem] text-ink-soft">No minimum term</p></div>' +
        '<div class="card p-5"><p class="mono-label text-ink-soft">Next billing date</p><p class="h-section mt-2 text-base">' + esc(nextBilling) + '</p></div>' +
      '</div>' +

      '<div class="card mt-6 p-6"><p class="mono-label text-ink-soft">Active subscriptions</p>' +
        '<div class="mt-4 overflow-x-auto"><table class="tbl m-cards">' +
          '<thead><tr><th>Service</th><th>Price</th><th>Billing</th><th>Next payment</th><th>Status</th><th></th></tr></thead>' +
          '<tbody>' + (rows || '<tr><td colspan="6" class="text-ink-soft">No monthly services selected.</td></tr>') + '</tbody>' +
        '</table></div>' +
        '<p id="sub-note" class="mt-4 hidden text-[0.8125rem] font-semibold text-accent"></p>' +
      '</div>' +

      '<div class="card mt-6 p-6"><p class="mono-label text-ink-soft">Cancelling</p>' +
        '<ul class="mt-3 space-y-2 text-[0.8125rem] leading-relaxed text-ink-mid">' +
          '<li><span class="arrow">&rarr;</span> Cancel here or by email — no minimum term, no reason required.</li>' +
          '<li><span class="arrow">&rarr;</span> Cancellation takes effect at the end of the period you have already paid for.</li>' +
          '<li><span class="arrow">&rarr;</span> Cancelling a service does not take your website offline.</li>' +
          '<li><span class="arrow">&rarr;</span> Full detail in the <a href="refunds" class="font-semibold text-accent underline underline-offset-2">Cancellation &amp; Refund Policy</a>.</li>' +
        '</ul>' +
        '<a href="#/services" class="btn btn-ghost mt-5">Add a service</a>' +
      '</div>';
  };

  routes['/account'] = function () {
    var s = O.load(), c = s.customer;
    function f(id, label, val, type) {
      return '<div class="field"><label for="' + id + '">' + esc(label) + '</label>' +
        '<input id="' + id + '" type="' + (type || 'text') + '" value="' + esc(val || '') + '"></div>';
    }
    function toggle(id, label, hint, on) {
      return '<label class="flex cursor-pointer items-start gap-3 border-b border-line py-3">' +
        '<input id="' + id + '" type="checkbox" class="mt-1 h-4 w-4 flex-none accent-accent"' + (on ? ' checked' : '') + '>' +
        '<span><span class="block text-sm font-semibold">' + esc(label) + '</span>' +
        '<span class="block text-[0.8125rem] text-ink-soft">' + esc(hint) + '</span></span></label>';
    }

    return head('Account Settings', 'Your details and preferences.', null) +

      '<div class="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">' +
        '<div class="card p-6"><p class="mono-label text-ink-soft">Personal information</p>' +
          '<div class="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2">' +
            f('ac-first', 'First name', c.firstName) + f('ac-last', 'Last name', c.lastName) +
          '</div>' +
          '<div class="mt-5 grid grid-cols-1 gap-5">' +
            f('ac-email', 'Email', c.email, 'email') + f('ac-phone', 'Phone', c.phone, 'tel') +
          '</div>' +
          '<button class="btn btn-primary mt-6" data-act="save-account">Save changes</button>' +
          '<p id="account-done" class="mt-3 hidden text-[0.8125rem] font-semibold text-accent"></p>' +
        '</div>' +

        '<div>' +
          '<div class="card p-6"><p class="mono-label text-ink-soft">Business information</p>' +
            '<div class="mt-5 grid grid-cols-1 gap-5">' +
              f('ac-business', 'Business name', c.business) + f('ac-address', 'Address', c.address) +
            '</div>' +
            '<p class="mt-4 text-[0.8125rem] text-ink-soft">Changing what appears on your website? Use <a href="#/business" class="font-semibold text-accent underline underline-offset-2">Business Information</a> instead.</p>' +
          '</div>' +

          '<div class="card mt-6 p-6"><p class="mono-label text-ink-soft">Password</p>' +
            '<div class="mt-5 grid grid-cols-1 gap-5">' +
              '<div class="field"><label for="ac-pw">New password</label><input id="ac-pw" type="password"></div>' +
              '<div class="field"><label for="ac-pw2">Confirm password</label><input id="ac-pw2" type="password"></div>' +
            '</div>' +
            '<button class="btn btn-ghost mt-5" data-act="save-password">Update password</button>' +
            '<p id="pw-done" class="mt-3 hidden text-[0.8125rem] font-semibold text-accent"></p>' +
          '</div>' +
        '</div>' +
      '</div>' +

      '<div class="card mt-6 p-6"><p class="mono-label text-ink-soft">Notification preferences</p>' +
        '<div class="mt-4">' +
          toggle('nt-project', 'Project updates', 'Build progress, review ready, going live.', true) +
          toggle('nt-payment', 'Payment reminders', 'When the remaining 75% or a monthly payment is due.', true) +
          toggle('nt-changes', 'Change requests', 'When a request moves to in progress or completed.', true) +
          toggle('nt-news', 'Product news', 'New services such as AI Receptionist when they open.', false) +
        '</div>' +
      '</div>' +

      '<div class="card mt-6 p-6"><p class="mono-label text-ink-soft">Session</p>' +
        '<p class="mt-3 text-[0.8125rem] text-ink-mid">Signed in as ' + esc(s.session ? s.session.email : c.email) + '.</p>' +
        '<button class="btn btn-ghost mt-4" data-act="logout">Log out</button>' +
      '</div>';
  };

  routes['/support'] = function () {
    var s = O.load();
    var threads = s.support.slice().reverse().map(function (t) {
      return '<div class="card p-5">' +
        '<div class="flex flex-wrap items-start justify-between gap-3">' +
          '<p class="h-section text-base">' + esc(t.subject) + '</p>' + statusTag(t.status) +
        '</div>' +
        '<p class="mt-1 text-[0.8125rem] text-ink-soft">' + esc(t.id) + ' · ' + esc(O.date(t.created)) + '</p>' +
        '<ul class="timeline mt-4 text-[0.8125rem] leading-relaxed text-ink-mid">' +
          t.messages.map(function (m) {
            return '<li><span class="font-semibold text-ink">' + esc(m.from === 'you' ? 'You' : m.from) + '</span> · ' +
              esc(O.date(m.at)) + '<br>' + esc(m.body) + '</li>';
          }).join('') +
        '</ul></div>';
    }).join('');

    return head('Support', 'Need help?',
      'Ask about your website, your payments, or anything else. We answer here.') +

      '<div class="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-5">' +
        '<div class="card p-6 lg:col-span-3">' +
          '<div class="field"><label for="sup-topic">What is it about?</label>' +
            '<select id="sup-topic">' +
              ['My website', 'Payments', 'A change request', 'My account', 'Something else']
                .map(function (t) { return '<option>' + t + '</option>'; }).join('') +
            '</select></div>' +
          '<div class="field mt-5"><label for="sup-subject">Subject</label><input id="sup-subject" type="text"></div>' +
          '<div class="field mt-5"><label for="sup-body">Message</label><textarea id="sup-body"></textarea></div>' +
          '<button class="btn btn-primary mt-6" data-act="send-support">Send message</button>' +
          '<p id="sup-done" class="mt-4 hidden text-[0.8125rem] font-semibold text-accent"></p>' +
        '</div>' +
        '<div class="card p-6 lg:col-span-2">' +
          '<p class="mono-label text-ink-soft">Faster answers</p>' +
          '<ul class="mt-3 space-y-2 text-[0.8125rem] text-ink-mid">' +
            '<li><span class="arrow">&rarr;</span> Website changes go through <a href="#/request" class="font-semibold text-accent underline underline-offset-2">Request a Change</a>, not support.</li>' +
            '<li><span class="arrow">&rarr;</span> Payment questions are usually answered on <a href="#/payments" class="font-semibold text-accent underline underline-offset-2">Payments</a>.</li>' +
            '<li><span class="arrow">&rarr;</span> Terms, cancellation and ownership are in the <a href="terms" class="font-semibold text-accent underline underline-offset-2">Terms of Service</a>.</li>' +
          '</ul>' +
        '</div>' +
      '</div>' +

      '<p class="mono-label mt-8 text-ink-soft">Previous messages</p>' +
      '<div class="mt-3 grid grid-cols-1 gap-3">' + (threads || '<p class="text-[0.8125rem] text-ink-soft">No messages yet.</p>') + '</div>';
  };

  // ── Actions ──────────────────────────────────────────────────
  function toggleIn(list, value) {
    var i = list.indexOf(value);
    if (i > -1) { list.splice(i, 1); } else { list.push(value); }
  }

  var actions = {
    'pick-base': function (el) {
      var d = draft();
      var key = el.getAttribute('data-key');
      // Switching website starts the feature choice again — the professional
      // build ticks everything, so its picks must not carry into a custom one.
      if (d.base !== key) { d.features = []; }
      d.base = key;
      O.save();
      render(true);
    },
    'toggle-feature': function (el) { toggleIn(draft().features, el.getAttribute('data-key')); O.save(); render(true); },
    'toggle-onetime': function (el) { toggleIn(draft().oneTime, el.getAttribute('data-key')); O.save(); render(true); },
    'toggle-monthly': function (el) { toggleIn(draft().monthly, el.getAttribute('data-key')); O.save(); render(true); },
    'toggle-extra':   function (el) { toggleIn(draft().extras,  el.getAttribute('data-key')); O.save(); render(true); },
    'toggle-agree':   function () { var d = draft(); d.agreed = !d.agreed; O.save(); render(true); },
    'clear-draft':    function () { var s = O.load(); s.draft = O.emptyDraft(); O.save(); render(true); },

    'pay-deposit': function () {
      if (!draftReady()) return;
      var s = O.load(), d = draft(), t = draftTotals(), C = O.CATALOG;

      var onceItems = [{ name: t.base.name, cents: t.base.cents }];
      C.oneTime.forEach(function (i) { if (d.oneTime.indexOf(i.name) > -1) onceItems.push({ name: i.name, cents: i.cents }); });
      C.monthly.forEach(function (m) {
        if (d.monthly.indexOf(m.name) > -1 && m.setupCents) onceItems.push({ name: m.name + ' — setup', cents: m.setupCents });
      });
      C.extras.forEach(function (x) { if (d.extras.indexOf(x.name) > -1) onceItems.push({ name: x.name, cents: x.cents }); });

      s.order = {
        oneTimeCents: t.once,
        monthlyCents: t.month,
        oneTimeItems: onceItems,
        monthlyItems: C.monthly.filter(function (m) { return d.monthly.indexOf(m.name) > -1; })
                               .map(function (m) { return { name: m.name, cents: m.cents }; })
      };

      s.project.features = d.base === 'pro' ? C.features.slice() : d.features.slice();
      s.project.stage = 'content';

      var today = new Date().toISOString().slice(0, 10);
      s.payments = [
        { id: 'INV-' + (1050 + Math.floor(Math.random() * 40)), date: today,
          description: '25% deposit — ' + t.base.name, cents: t.deposit, kind: 'one-time', status: 'paid' },
        { id: 'INV-' + (1090 + Math.floor(Math.random() * 40)), date: null,
          description: 'Remaining 75% — due after you approve the website', cents: t.balance, kind: 'one-time', status: 'due-after-approval' }
      ];

      // Services follow what was actually bought
      s.services.forEach(function (sv) {
        if (sv.cadence === 'month') { sv.state = d.monthly.indexOf(sv.name) > -1 ? 'active' : 'available'; }
        else if (sv.cadence === 'once' && sv.state !== 'soon') {
          sv.state = (sv.name === t.base.name || d.oneTime.indexOf(sv.name) > -1) ? 'active' : 'available';
        }
      });

      s.draft = O.emptyDraft();
      O.save();
      O.notify('Deposit of ' + money(t.deposit) + ' received — your project has started. Send us your content next.');
      location.hash = '#/overview';
      render();
    },

    approve: function () {
      O.advance('final');
      O.notify('Website approved — your remaining 75% payment is now due.');
      render();
    },
    changes: function () { location.hash = '#/request'; },
    'pay-final': function () {
      O.advance('live');
      var s = O.load();
      s.payments[1].status = 'paid';
      s.payments[1].date = new Date().toISOString().slice(0, 10);
      O.save();
      O.notify('Final payment received — your website is live and your monthly services have started.');
      render();
    },
    preview: function () { document.getElementById('preview-note').classList.remove('hidden'); },
    invoice: function (el) {
      var n = document.getElementById('invoice-note');
      n.textContent = 'Receipt ' + el.getAttribute('data-id') + ' would download here. Invoicing is not wired up in this demo.';
      n.classList.remove('hidden');
    },
    'submit-business': function () {
      var s = O.load();
      s.changeRequests.push({
        id: 'CR-' + (125 + s.changeRequests.length),
        type: 'Business information',
        description: 'Business information updated from the dashboard.',
        created: new Date().toISOString().slice(0, 10),
        deadline: '', status: 'pending', notes: ''
      });
      if (O.maintenanceActive()) { s.maintenance.used = Math.min(s.maintenance.included, s.maintenance.used + 1); }
      O.save();
      O.notify('Change request received — your business information is queued for review.');
      var d = document.getElementById('business-done');
      d.textContent = 'Sent to Onsite. Nothing has been published yet — we will action it and mark it completed.';
      d.classList.remove('hidden');
      paintBell();
    },
    'submit-change': function () {
      var desc = document.getElementById('cr-desc').value.trim();
      var done = document.getElementById('cr-done');
      if (!desc) { done.textContent = 'Add a short description so we know what to change.'; done.classList.remove('hidden'); return; }
      if (O.changesLeft() <= 0) { done.textContent = 'You have used all 15 changes this month. The allowance resets on the 1st.'; done.classList.remove('hidden'); return; }
      var s = O.load();
      s.changeRequests.push({
        id: 'CR-' + (125 + s.changeRequests.length),
        type: document.getElementById('cr-type').value,
        description: desc,
        created: new Date().toISOString().slice(0, 10),
        deadline: document.getElementById('cr-deadline').value,
        status: 'pending',
        notes: document.getElementById('cr-notes').value.trim()
      });
      s.maintenance.used = Math.min(s.maintenance.included, s.maintenance.used + 1);
      O.save();
      O.notify('Change request received. We will move it to in progress shortly.');
      render();
    },
    'activate-maintenance': function () {
      var s = O.load();
      s.services.forEach(function (x) { if (x.name === 'Website Maintenance') x.state = 'active'; });
      if (!s.order.monthlyItems.some(function (m) { return m.name === 'Website Maintenance'; })) {
        s.order.monthlyItems.push({ name: 'Website Maintenance', cents: 1999 });
        s.order.monthlyCents += 1999;
      }
      O.save();
      O.notify('Website Maintenance is active — 15 changes a month.');
      render();
    },
    'cancel-maintenance': function () {
      var s = O.load();
      s.services.forEach(function (x) { if (x.name === 'Website Maintenance') x.state = 'available'; });
      s.order.monthlyItems = s.order.monthlyItems.filter(function (m) { return m.name !== 'Website Maintenance'; });
      s.order.monthlyCents = s.order.monthlyItems.reduce(function (t, m) { return t + m.cents; }, 0);
      O.save();
      O.notify('Website Maintenance cancelled. It stays available until the end of the paid month.');
      render();
    },
    'cancel-service': function (el) {
      var name = el.getAttribute('data-name');
      var s = O.load();
      s.services.forEach(function (x) { if (x.name === name) x.state = 'available'; });
      s.order.monthlyItems = s.order.monthlyItems.filter(function (m) { return m.name !== name; });
      s.order.monthlyCents = s.order.monthlyItems.reduce(function (t, m) { return t + m.cents; }, 0);
      O.save();
      O.notify(name + ' cancelled. It stays available until the end of the period you have paid for.');
      render();
      var n = document.getElementById('sub-note');
      if (n) {
        n.textContent = name + ' cancelled. It runs until the end of the paid period, then stops.';
        n.classList.remove('hidden');
      }
    },
    'activate-service': function (el) {
      var name = el.getAttribute('data-name');
      var s = O.load();
      var sv = s.services.filter(function (x) { return x.name === name; })[0];
      if (!sv) return;
      sv.state = 'active';
      if (sv.cadence === 'month' && !s.order.monthlyItems.some(function (m) { return m.name === name; })) {
        s.order.monthlyItems.push({ name: name, cents: sv.cents });
        s.order.monthlyCents += sv.cents;
      }
      O.save();
      O.notify(name + ' is now active.');
      render();
    },
    'save-account': function () {
      var s = O.load(), c = s.customer;
      c.firstName = document.getElementById('ac-first').value.trim() || c.firstName;
      c.lastName  = document.getElementById('ac-last').value.trim()  || c.lastName;
      c.email     = document.getElementById('ac-email').value.trim() || c.email;
      c.phone     = document.getElementById('ac-phone').value.trim() || c.phone;
      c.business  = document.getElementById('ac-business').value.trim() || c.business;
      c.address   = document.getElementById('ac-address').value.trim() || c.address;
      O.save();
      var d = document.getElementById('account-done');
      d.textContent = 'Saved.';
      d.classList.remove('hidden');
      paintWho();
    },
    'save-password': function () {
      var a = document.getElementById('ac-pw').value, b = document.getElementById('ac-pw2').value;
      var d = document.getElementById('pw-done');
      d.textContent = !a ? 'Enter a new password.'
        : a !== b ? 'Those passwords do not match.'
        : 'Password updated. (Demo only — nothing is stored.)';
      d.classList.remove('hidden');
    },
    'send-support': function () {
      var subject = document.getElementById('sup-subject').value.trim();
      var body = document.getElementById('sup-body').value.trim();
      var done = document.getElementById('sup-done');
      if (!body) { done.textContent = 'Write a message first.'; done.classList.remove('hidden'); return; }
      var s = O.load();
      s.support.push({
        id: 'SUP-' + (32 + s.support.length),
        subject: subject || document.getElementById('sup-topic').value,
        status: 'open',
        created: new Date().toISOString().slice(0, 10),
        messages: [{ from: 'you', at: new Date().toISOString().slice(0, 10), body: body }]
      });
      O.save();
      O.notify('Message sent to Onsite. We usually reply the same working day.');
      render();
    },
    logout: function () {
      O.signOut();
      location.href = 'login';
    }
  };

  // ── Chrome ───────────────────────────────────────────────────
  function paintWho() {
    var s = O.load();
    document.getElementById('who').textContent = s.customer.business;
  }

  function paintBell() {
    var s = O.load();
    var n = O.unreadCount();
    var badge = document.getElementById('bell-count');
    badge.textContent = n;
    badge.classList.toggle('hidden', n === 0);
    document.getElementById('bell-list').innerHTML = s.notifications.map(function (x) {
      return '<li class="border-b border-line px-4 py-3 last:border-b-0">' +
        '<p class="text-[0.8125rem] leading-snug ' + (x.read ? 'text-ink-soft' : 'font-semibold text-ink') + '">' + esc(x.text) + '</p>' +
        '<p class="mt-1 text-[0.75rem] text-ink-soft">' + esc(O.date(x.at)) + '</p></li>';
    }).join('');
  }

  function paintNav(route) {
    [].forEach.call(document.querySelectorAll('.app-nav a'), function (a) {
      a.classList.toggle('is-active', a.getAttribute('href') === '#' + route);
    });
  }

  // Bottom tabs mirror the sidebar on phones; Requests maps to the
  // change-request route, which is where people actually go.
  function paintTabs(route) {
    [].forEach.call(document.querySelectorAll('.m-tab'), function (t) {
      t.classList.toggle('is-on', t.getAttribute('data-tab') === route);
    });
  }

  // A compact always-visible total while building a package on a phone.
  function paintStickyBar(route) {
    var bar = document.getElementById('m-build-bar');
    if (!bar) return;
    var on = route === '/build';
    document.body.classList.toggle('has-sticky-bar', on);
    if (!on) { bar.classList.remove('is-up'); return; }

    var t = draftTotals();
    bar.querySelector('[data-bar-figure]').textContent =
      money(t.once) + ' one-time' + (t.month ? ' + ' + money(t.month) + '/mo' : '');
    bar.querySelector('[data-bar-sub]').textContent =
      t.once ? 'Pay today ' + money(t.deposit) + ' — 25% deposit' : 'Choose a website to begin';
    var btn = bar.querySelector('[data-bar-cta]');
    btn.disabled = !draftReady();
    btn.textContent = draftReady() ? 'Pay ' + money(t.deposit) + ' & start' : 'Continue';
    bar.classList.add('is-up');
  }

  /* render(true) keeps you where you were.
     Ticking a feature rebuilds the view — that is how this screen has
     always worked — but it also used to throw the page back to the top
     and drop focus, so choosing three things in a row meant scrolling
     back down three times. Arriving at a new route should start at the
     top; changing something on the route you are already on should not
     move you at all. */
  function render(keepPlace) {
    var y = keepPlace ? (window.scrollY || window.pageYOffset) : 0;
    var refocus = null;

    if (keepPlace && document.activeElement && document.activeElement.closest) {
      var was = document.activeElement.closest('[data-act]');
      if (was) {
        refocus = '[data-act="' + was.getAttribute('data-act') + '"]' +
                  (was.getAttribute('data-key')
                    ? '[data-key="' + was.getAttribute('data-key').replace(/"/g, '\\"') + '"]'
                    : '');
      }
    }

    var route = (location.hash || '#/overview').replace('#', '');
    if (!routes[route]) route = '/overview';
    view.innerHTML = routes[route]();
    paintNav(route);
    paintTabs(route);
    paintBell();
    paintWho();
    paintStickyBar(route);
    if (window.OnsiteMobile) { window.OnsiteMobile.labelTables(view); }

    window.scrollTo(0, y);
    if (refocus) {
      var again = view.querySelector(refocus);
      if (again) again.focus({ preventScroll: true });
    }
  }

  // Delegated so re-rendered markup keeps working.
  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-act]');
    if (!el) return;
    var fn = actions[el.getAttribute('data-act')];
    if (fn) { e.preventDefault(); fn(el); }
  });

  document.getElementById('bell').addEventListener('click', function () {
    document.getElementById('bell-panel').classList.toggle('hidden');
  });
  document.getElementById('mark-read').addEventListener('click', function () {
    O.markAllRead();
    paintBell();
  });
  document.getElementById('logout').addEventListener('click', actions.logout);
  document.getElementById('nav-toggle').addEventListener('click', function () {
    document.getElementById('sidebar').classList.toggle('hidden');
  });
  document.addEventListener('click', function (e) {
    var panel = document.getElementById('bell-panel');
    if (!panel.classList.contains('hidden') &&
        !e.target.closest('#bell-panel') && !e.target.closest('#bell')) {
      panel.classList.add('hidden');
    }
  });

  window.addEventListener('hashchange', function () { render(false); });
  render();
})();
