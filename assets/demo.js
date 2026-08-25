/* ───────────────────────────────────────────────────────────────
   Sitehouse — demo data store and mock authentication
   DEMO ONLY. Nothing here is secure and nothing leaves the browser:
   state lives in localStorage, the "verification code" is generated
   client-side and shown on screen, and no password is ever checked.
   Replace with a real backend + auth provider before launch.
   ─────────────────────────────────────────────────────────────── */
(function (global) {
  'use strict';

  var KEY = 'sitehouse.demo.v1';

  // ── Money ────────────────────────────────────────────────────
  // Held in whole euro cents everywhere, formatted only at the edge.
  // Euro is the billing currency and the only one stored; display
  // follows whatever the visitor picked, when the switcher is loaded.
  function euro(cents) {
    if (global.SitehouseI18n) return global.SitehouseI18n.format(cents / 100);
    return '€' + (cents / 100).toFixed(2);
  }
  function euroMonth(cents) { return euro(cents) + ' / month'; }

  // Deposit is 25%, rounded down; the balance takes the remainder so
  // the two halves always add back to the total.
  function deposit(cents) { return Math.floor(cents * 0.25); }
  function balance(cents) { return cents - deposit(cents); }

  function date(iso) {
    var d = new Date(iso + 'T00:00:00');
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  // ── Seed data ────────────────────────────────────────────────
  // Janey's one-time total is Custom Website (€79.99) + Local SEO (€199.99).
  function seed() {
    return {
      session: null,

      // Which pack this account is on. load() merges only keys the seed
      // declares, so anything written at runtime has to exist here or it
      // is silently dropped on the next read.
      tier: 'custom',
      freePage: null,

      customer: {
        firstName: 'Jane',
        lastName: 'Whitfield',
        business: "Janey's Hair Studio",
        email: 'jane@janeys-hair.co.uk',
        phone: '+44 7700 900412',
        address: '14 Mill Street, Leeds LS1 5DQ',
        websiteUrl: 'janeys-hair.co.uk',
        googleProfile: 'Janey’s Hair Studio — Leeds',
        whatsapp: '+44 7700 900412',
        socials: {
          instagram: 'instagram.com/janeyshairstudio',
          facebook: 'facebook.com/janeyshairstudio',
          tiktok: ''
        },
        hours: [
          { day: 'Monday',    open: 'Closed' },
          { day: 'Tuesday',   open: '09:00 – 18:00' },
          { day: 'Wednesday', open: '09:00 – 18:00' },
          { day: 'Thursday',  open: '09:00 – 20:00' },
          { day: 'Friday',    open: '09:00 – 20:00' },
          { day: 'Saturday',  open: '08:30 – 16:00' },
          { day: 'Sunday',    open: 'Closed' }
        ],
        createdAt: '2026-08-04'
      },

      project: {
        // deposit → content → build → review → final payment → live
        stage: 'review',
        deliveryDate: '2026-08-19',
        lastUpdate: '2026-08-17',
        previewUrl: 'preview.sitehouse.eu',
        features: [
          'Contact form', 'Google Maps', 'WhatsApp button', 'Photo / gallery section',
          'Business information', 'Services section', 'Opening hours', 'Social links', 'Call button'
        ]
      },

      order: {
        oneTimeCents: 27998,      // 7999 + 19999
        monthlyCents: 4998,       // 2999 + 1999
        oneTimeItems: [
          { name: 'Custom Website', cents: 7999 },
          { name: 'Local SEO',      cents: 19999 }
        ],
        monthlyItems: [
          { name: 'Online Booking System', cents: 2999 },
          { name: 'Website Maintenance',   cents: 1999 }
        ]
      },

      payments: [
        { id: 'INV-1042', date: '2026-08-04', description: '25% deposit — Custom Website + Local SEO',
          cents: 6999, kind: 'one-time', status: 'paid' },
        { id: 'INV-1043', date: null, description: 'Remaining 75% — due after you approve the website',
          cents: 20999, kind: 'one-time', status: 'due-after-approval' }
      ],

      services: [
        { name: 'Custom Website',        cents: 7999,  cadence: 'once',  state: 'active' },
        { name: 'Local SEO',             cents: 19999, cadence: 'once',  state: 'active' },
        { name: 'Online Booking System', cents: 2999,  cadence: 'month', state: 'active' },
        { name: 'Website Maintenance',   cents: 1999,  cadence: 'month', state: 'active' },
        { name: 'Review Management',     cents: 2999,  cadence: 'month', state: 'available' },
        { name: 'Digital Menu',          cents: 1999,  cadence: 'month', state: 'available', setupCents: 4999 },
        { name: 'Social Media Content',  cents: null,  cadence: null,    state: 'soon' },
        { name: 'AI Receptionist',       cents: null,  cadence: null,    state: 'soon' }
      ],

      maintenance: { included: 15, used: 3 },

      // Support threads. Declared here or load() drops them on the
      // next read — it only merges keys the seed knows about.
      threads: [],

      // Ratings customers leave on their own dashboard. Seeded with a
      // few so the averages and the bars have something to draw; the
      // `mine` flag marks the one this account left, so the Rate us
      // button knows whether to say rate or edit.
      // Ratings customers leave on their own dashboard. Empty on
      // purpose: seeding it would put invented businesses on the public
      // page, and the band that renders them stays hidden until a real
      // one arrives.
      ratings: [],

      changeRequests: [
        { id: 'CR-118', type: 'Opening hours', description: 'Late opening on Thursdays until 20:00.',
          created: '2026-08-15', deadline: '', status: 'completed', notes: '' },
        { id: 'CR-121', type: 'Prices', description: 'Cut & blow dry goes from £38 to £42.',
          created: '2026-08-16', deadline: '2026-08-20', status: 'in-progress', notes: '' },
        { id: 'CR-124', type: 'Photos', description: 'Three new photos of the salon after the refit.',
          created: '2026-08-17', deadline: '', status: 'pending', notes: 'Photos sent by email.' }
      ],

      support: [
        { id: 'SUP-31', subject: 'Can I add a second phone number?', status: 'answered', created: '2026-08-12',
          messages: [
            { from: 'you',    at: '2026-08-12', body: 'Can the page show my mobile as well as the salon line?' },
            { from: 'Sitehouse', at: '2026-08-12', body: 'Yes — send both numbers and we will label them Salon and Mobile. No change request needed, it is part of the build.' }
          ] }
      ],

      notifications: [
        { id: 'N-4', at: '2026-08-17', text: 'Your website is ready for review.', read: false },
        { id: 'N-3', at: '2026-08-17', text: 'Your remaining 75% website payment becomes due once you approve.', read: false },
        { id: 'N-2', at: '2026-08-15', text: 'Your change request CR-118 has been completed.', read: true },
        { id: 'N-1', at: '2026-08-04', text: 'Deposit received — your project has been created.', read: true }
      ],

      // Admin-side roster. The first row is the customer above.
      users: [
        { name: 'Jane Whitfield',   business: "Janey's Hair Studio", email: 'jane@janeys-hair.co.uk',
          website: 'Ready for review', deposit: 'paid', final: 'pending', monthly: 'pending-launch',
          monthlyCents: 4998, oneTimeCents: 27998, created: '2026-08-04' },
        { name: 'Tomas Berisha',    business: 'Berisha Plumbing',    email: 'tomas@berishaplumbing.com',
          website: 'Live', deposit: 'paid', final: 'paid', monthly: 'active',
          monthlyCents: 1999, oneTimeCents: 7999, created: '2026-06-11' },
        { name: 'Aoife Doyle',      business: 'Doyle Dental Care',   email: 'aoife@doyledental.ie',
          website: 'Building', deposit: 'paid', final: 'pending', monthly: 'pending-launch',
          monthlyCents: 4998, oneTimeCents: 24999, created: '2026-08-13' },
        { name: 'Marco Ferretti',   business: 'Trattoria Ferretti',  email: 'marco@trattoriaferretti.it',
          website: 'Live', deposit: 'paid', final: 'paid', monthly: 'active',
          monthlyCents: 4998, oneTimeCents: 29998, created: '2026-05-02' },
        { name: 'Ellie Grant',      business: 'Grant Mobile Valeting', email: 'ellie@grantvaleting.co.uk',
          website: 'Awaiting content', deposit: 'paid', final: 'pending', monthly: 'pending-launch',
          monthlyCents: 0, oneTimeCents: 7999, created: '2026-08-16' },
        { name: 'Petrit Krasniqi',  business: 'Krasniqi Electrical',  email: 'petrit@krasniqielectric.com',
          website: 'Cancelled', deposit: 'paid', final: 'cancelled', monthly: 'cancelled',
          monthlyCents: 0, oneTimeCents: 7999, created: '2026-03-21' }
      ]
    };
  }

  // ── Catalogue ────────────────────────────────────────────
  // Single source of truth for the package builder in the dashboard.
  // Prices in cents; `from` marks a starting price we confirm before charging.
  // Single source of truth for the package builder and for every price
  // the dashboard prints. Cents everywhere; `from` marks a floor we
  // confirm in writing before charging.
  var CATALOG = {
    groups: {"website":"Website features","technical":"Business & technical","automation":"Automation","brand":"Brand & design"},

    websites: [
      { key: 'free', name: 'Free Landing Page', cents: 0, cap: 0, years: 0,
        blurb: 'One page, built and hosted by us, live inside 48 hours.',
        note: 'On an address we provide. Your own domain is the upgrade.' },
      { key: 'custom', name: 'Custom Website', cents: 7999, cap: 20, years: 1,
        blurb: 'Any twenty of the 34, your pick, on your own domain.',
        note: 'Three is the minimum, twenty the cap. Anything between costs the same.' },
      { key: 'full', name: 'Full Website', cents: 24999, cap: 34, years: 1,
        blurb: 'All 34 with no cap, plus the setup work every site needs anyway.',
        note: 'Search indexing, analytics, legal pages and spam protection are done, not sold.' },
      { key: 'complete', name: 'Complete Package', cents: 90000, cap: 34, years: 3,
        blurb: 'The Full Website plus the work around it, and three years of hosting.',
        note: 'Maintenance, Local SEO, logo and menu design, WhatsApp and business email included.' }
    ],

    features: [
      'About Us section',
      'FAQ section',
      'Price list',
      'Special offers section',
      'Promotions section',
      'Portfolio section',
      'Projects showcase',
      'Team / staff section',
      'Before & after section',
      'Service area section',
      'Pricing comparison',
      'Packages section',
      'Events section',
      'Announcements section',
      'Custom landing page',
      'Custom 404 page',
      'Product catalog',
      'Online menu',
      'PDF menu integration',
      'PDF catalog integration',
      'Downloadable documents',
      'Customer reviews integration',
      'Sticky navigation',
      'Sticky mobile buttons',
      'Back-to-top button',
      'Image lightbox',
      'FAQ accordion',
      'Interactive galleries',
      'Video section',
      'YouTube integration',
      'Business inquiry form',
      'Social sharing preview',
      'Custom favicon',
      'Mobile optimization'
    ],

    oneTime: [
      { group: 'website', name: 'Online booking system', cents: 6000 },
      { group: 'website', name: 'Appointment calendar', cents: 5000 },
      { group: 'website', name: 'Google Reviews integration', cents: 2000 },
      { group: 'website', name: 'Newsletter signup', cents: 2000 },
      { group: 'website', name: 'Email button', cents: 500 },
      { group: 'website', name: 'Job application form', cents: 2500 },
      { group: 'website', name: 'Careers section', cents: 1500 },
      { group: 'website', name: 'Multi-language website', cents: 5000, from: true },
      { group: 'website', name: 'Multiple locations', cents: 3000 },
      { group: 'website', name: 'Location selector', cents: 2500 },
      { group: 'website', name: 'Store locator', cents: 5000 },
      { group: 'website', name: 'Membership section', cents: 4000 },
      { group: 'website', name: 'Gift card section', cents: 3000 },
      { group: 'website', name: 'Loyalty program', cents: 6000, from: true },
      { group: 'website', name: 'Event registration', cents: 4000 },
      { group: 'website', name: 'Blog section', cents: 3000 },
      { group: 'website', name: 'News section', cents: 2000 },
      { group: 'website', name: 'Website search', cents: 3000 },
      { group: 'technical', name: 'Basic SEO setup', cents: 3000 },
      { group: 'technical', name: 'Google Search indexing', cents: 1500 },
      { group: 'technical', name: 'Google Business Profile setup', cents: 4000 },
      { group: 'technical', name: 'Google Business Profile optimization', cents: 5000 },
      { group: 'technical', name: 'Google Analytics setup', cents: 2500 },
      { group: 'technical', name: 'Google Search Console setup', cents: 2500 },
      { group: 'technical', name: 'Conversion tracking', cents: 4000 },
      { group: 'technical', name: 'Website visitor tracking', cents: 2500 },
      { group: 'technical', name: 'Professional business email setup', cents: 2500 },
      { group: 'technical', name: 'Email signature setup', cents: 1500 },
      { group: 'technical', name: 'Domain registration', cents: 1000 },
      { group: 'technical', name: 'Domain connection', cents: 1000 },
      { group: 'technical', name: 'SSL / HTTPS setup', cents: 1000 },
      { group: 'technical', name: 'Website migration', cents: 5000, from: true },
      { group: 'technical', name: 'Website redesign', cents: 10000, from: true },
      { group: 'technical', name: 'Website speed optimization', cents: 5000 },
      { group: 'technical', name: 'Image compression', cents: 1500 },
      { group: 'technical', name: 'Accessibility improvements', cents: 4000 },
      { group: 'technical', name: 'Cookie consent banner', cents: 2000 },
      { group: 'technical', name: 'Privacy policy page', cents: 2000 },
      { group: 'technical', name: 'Terms & conditions page', cents: 2000 },
      { group: 'technical', name: 'Custom legal pages', cents: 3000, from: true },
      { group: 'technical', name: 'Website backup system', cents: 3000 },
      { group: 'technical', name: 'Security configuration', cents: 4000 },
      { group: 'technical', name: 'Spam protection', cents: 2000 },
      { group: 'technical', name: 'Contact form spam protection', cents: 1500 },
      { group: 'technical', name: 'Broken-link checking', cents: 1500 },
      { group: 'automation', name: 'Automatic email notifications', cents: 2500 },
      { group: 'automation', name: 'Booking confirmation emails', cents: 3500 },
      { group: 'automation', name: 'Contact form email notifications', cents: 1500 },
      { group: 'automation', name: 'Quote request notifications', cents: 2000 },
      { group: 'automation', name: 'Automated customer responses', cents: 4000 },
      { group: 'automation', name: 'Appointment reminder emails', cents: 5000 },
      { group: 'automation', name: 'Email autoresponder setup', cents: 3500 },
      { group: 'automation', name: 'Lead notification system', cents: 4000 },
      { group: 'automation', name: 'Customer inquiry tracking', cents: 4000 },
      { group: 'automation', name: 'Simple CRM integration', cents: 7500, from: true },
      { group: 'brand', name: 'Logo Design', cents: 4999 },
      { group: 'brand', name: 'Brand Kit', cents: 7999 },
      { group: 'brand', name: 'Business Card Design', cents: 2999 },
      { group: 'brand', name: 'Flyer / Poster Design', cents: 3999 },
      { group: 'brand', name: 'Menu Design', cents: 3999 },
      { group: 'brand', name: 'Social Media Starter Pack', cents: 5999 },
      { group: 'brand', name: 'Promo Video / Short Ad', cents: 4999, from: true },
      { group: 'brand', name: 'AI Business Photos', cents: 3000, from: true },
      { group: 'brand', name: 'Google Review QR Card', cents: 1999 },
      { group: 'brand', name: 'WhatsApp Business Setup', cents: 3999 },
      { group: 'brand', name: 'Business Document Templates', cents: 2999 }
    ],

    monthly: [
      { name: 'Website maintenance', cents: 2000 },
      { name: 'Website content updates', cents: 1500 },
      { name: 'Monthly image updates', cents: 1500 },
      { name: 'Monthly text changes', cents: 1000 },
      { name: 'Monthly SEO maintenance', cents: 4000 },
      { name: 'Monthly SEO report', cents: 2500 },
      { name: 'Google Business Profile maintenance', cents: 3000 },
      { name: 'Website performance monitoring', cents: 2000 },
      { name: 'Security & backup monitoring', cents: 2500 },
      { name: 'Priority technical support', cents: 3000 }
    ],

    // What each paid tier already covers, so the builder can mark those
    // add-ons as included instead of charging for them twice.
    included: {
      free: [],
      custom: [],
      full: ['Basic SEO setup', 'Google Search indexing', 'Google Search Console setup',
             'Google Analytics setup', 'Conversion tracking', 'Cookie consent banner',
             'Privacy policy page', 'Terms & conditions page', 'Contact form spam protection'],
      complete: ['Basic SEO setup', 'Google Search indexing', 'Google Search Console setup',
                 'Google Analytics setup', 'Conversion tracking', 'Cookie consent banner',
                 'Privacy policy page', 'Terms & conditions page', 'Contact form spam protection',
                 'Google Business Profile setup', 'Google Business Profile optimization',
                 'Logo Design', 'Menu Design', 'WhatsApp Business Setup',
                 'Professional business email setup']
    },
    includedMonthly: { free: [], custom: [], full: [], complete: ['Website maintenance'] }
  };

  function emptyDraft() {
    return { base: null, features: [], oneTime: [], monthly: [], extras: [], agreed: false };
  }

  // ── Store ────────────────────────────────────────────────────
  var state = null;

  function load() {
    if (state) return state;
    var stored = null;
    try {
      var raw = global.localStorage.getItem(KEY);
      stored = raw ? JSON.parse(raw) : null;
    } catch (e) {
      stored = null;                      // private mode, corrupted JSON, etc.
    }
    // Merge over the seed rather than trusting what is stored: a store written
    // by an older version — or a half-written one — must not leave a view
    // reading properties off undefined.
    state = seed();
    if (stored && typeof stored === 'object') {
      Object.keys(state).forEach(function (k) {
        if (stored[k] !== undefined && stored[k] !== null) state[k] = stored[k];
      });
      if (stored.session !== undefined) state.session = stored.session;
      if (stored.draft !== undefined) state.draft = stored.draft;
      save();                             // write the healed shape back
    }
    return state;
  }

  function save() {
    try { global.localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* demo only */ }
  }

  function reset() {
    state = seed();
    save();
    return state;
  }

  // ── Mock auth ────────────────────────────────────────────────
  // A code is generated in the browser and displayed on screen. There is
  // no email, no SMS, no server and no password check.
  function newCode() {
    return String(Math.floor(100000 + Math.random() * 900000));
  }

  function signIn(email, role) {
    var s = load();
    s.session = { email: email || s.customer.email, role: role || 'customer', at: new Date().toISOString() };
    save();
  }

  /* Resolves with the session, or sends them to the login page and
     never resolves. Supabase rehydrates from storage asynchronously,
     so a synchronous read on page load sees nothing and would bounce
     a perfectly valid session. */
  function requireAuth() {
    var back = 'login.html?next=' + encodeURIComponent(
      global.location.pathname.split('/').pop() + global.location.hash);

    // supabase-auth.js is a module, so it executes AFTER this file and
    // after the dashboard script that calls this. Checking for it
    // synchronously bounced every signed-in visitor straight back to
    // the login page. Wait for it, with a ceiling so a genuinely
    // missing script still fails closed rather than hanging.
    function auth() {
      if (global.SitehouseAuth) return Promise.resolve(global.SitehouseAuth);
      return new Promise(function (resolve, reject) {
        var done = false;
        global.document.addEventListener('sitehouse:auth-ready', function () {
          done = true; resolve(global.SitehouseAuth);
        }, { once: true });
        setTimeout(function () { if (!done) reject(new Error('auth script never loaded')); }, 8000);
      });
    }

    return auth().catch(function () {
      global.location.href = back;
      return new Promise(function () {});
    }).then(function (A) {
      return A.session();
    }).then(function (s) {
      if (s) return s;
      global.location.href = back;
      return new Promise(function () {});
    });
  }

  function signOut() {
    var s = load();
    s.session = null;
    save();
  }

  function session() { return load().session; }

  // Pages behind the login gate call this on load.
  // Kept for anything still calling it synchronously. Real gating is
  // requireAuth() below, which waits for Supabase.
  function requireSession(role) {
    var s = session();
    if (!s || (role && s.role !== role)) {
      global.location.href = 'login.html?next=' + encodeURIComponent(
        global.location.pathname.split('/').pop() + global.location.hash
      );
      return null;
    }
    return s;
  }

  // ── Project stages ───────────────────────────────────────────
  var STAGES = [
    { key: 'deposit', label: '25% deposit',    doneNote: 'Paid',     waitNote: 'Waiting' },
    { key: 'content', label: 'Content',        doneNote: 'Received', waitNote: 'Waiting' },
    { key: 'build',   label: 'Website build',  doneNote: 'Complete', waitNote: 'Waiting' },
    { key: 'review',  label: 'Customer review',doneNote: 'Approved', waitNote: 'Waiting' },
    { key: 'final',   label: '75% final payment', doneNote: 'Paid',  waitNote: 'Waiting' },
    { key: 'live',    label: 'Website live',   doneNote: 'Live',     waitNote: 'Waiting' }
  ];

  // Everything before the current stage is done, the current one is active.
  function stages() {
    var current = load().project.stage;
    var idx = STAGES.map(function (s) { return s.key; }).indexOf(current);
    return STAGES.map(function (s, i) {
      return {
        key: s.key,
        label: s.label,
        state: i < idx ? 'done' : (i === idx ? 'active' : 'wait'),
        note: i < idx ? s.doneNote : (i === idx ? 'In progress' : s.waitNote)
      };
    });
  }

  function statusLabel() {
    var map = {
      deposit: 'Deposit received',
      content: 'Awaiting your content',
      build:   'Website in progress',
      review:  'Ready for review',
      final:   'Approved — final payment due',
      live:    'Live'
    };
    return map[load().project.stage] || 'In progress';
  }

  function advance(stageKey) {
    var s = load();
    s.project.stage = stageKey;
    s.project.lastUpdate = new Date().toISOString().slice(0, 10);
    save();
  }

  function notify(text) {
    var s = load();
    s.notifications.unshift({
      id: 'N-' + (s.notifications.length + 1),
      at: new Date().toISOString().slice(0, 10),
      text: text,
      read: false
    });
    save();
  }

  function unreadCount() {
    return load().notifications.filter(function (n) { return !n.read; }).length;
  }

  function markAllRead() {
    load().notifications.forEach(function (n) { n.read = true; });
    save();
  }

  function maintenanceActive() {
    return load().services.some(function (s) {
      return s.name === 'Website Maintenance' && s.state === 'active';
    });
  }

  function changesLeft() {
    var m = load().maintenance;
    return Math.max(0, m.included - m.used);
  }

  function escapeHtml(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  global.Sitehouse = {
    CATALOG: CATALOG, emptyDraft: emptyDraft,
    euro: euro, euroMonth: euroMonth, deposit: deposit, balance: balance, date: date,
    load: load, save: save, reset: reset,
    newCode: newCode, signIn: signIn, signOut: signOut, session: session, requireSession: requireSession,
    requireAuth: requireAuth,
    stages: stages, statusLabel: statusLabel, advance: advance,
    notify: notify, unreadCount: unreadCount, markAllRead: markAllRead,
    maintenanceActive: maintenanceActive, changesLeft: changesLeft,
    esc: escapeHtml
  };
})(window);
