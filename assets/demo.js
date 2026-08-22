/* ───────────────────────────────────────────────────────────────
   Onsite — demo data store and mock authentication
   DEMO ONLY. Nothing here is secure and nothing leaves the browser:
   state lives in localStorage, the "verification code" is generated
   client-side and shown on screen, and no password is ever checked.
   Replace with a real backend + auth provider before launch.
   ─────────────────────────────────────────────────────────────── */
(function (global) {
  'use strict';

  var KEY = 'onsite.demo.v1';

  // ── Money ────────────────────────────────────────────────────
  // Held in whole cents everywhere, formatted only at the edge.
  function euro(cents) { return '€' + (cents / 100).toFixed(2); }
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
        previewUrl: 'preview.janeys-hair.co.uk',
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
            { from: 'Onsite', at: '2026-08-12', body: 'Yes — send both numbers and we will label them Salon and Mobile. No change request needed, it is part of the build.' }
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
  var CATALOG = {
    websites: [
      { key: 'custom', name: 'Custom Website', cents: 7999, minFeatures: 3,
        blurb: 'A professional custom landing-page website, built around the features you choose.',
        note: 'Pick at least three website features. Picking more never changes the price.' },
      { key: 'pro', name: 'Professional Website', cents: 24999, minFeatures: 0,
        blurb: 'The complete build, ready to go, with every website feature already in it.',
        note: 'All ten website features included. Monthly services are still separate.' }
    ],
    features: [
      'Contact form', 'Google Maps', 'WhatsApp button', 'Photo / gallery section',
      'Business information', 'Services section', 'Testimonials', 'Opening hours',
      'Social links', 'Call button'
    ],
    oneTime: [
      { name: 'Local SEO', cents: 19999,
        blurb: 'Page titles and descriptions, consistent business details, and a structure search engines can read. Not a subscription.' }
    ],
    monthly: [
      { name: 'Online Booking System', cents: 2999, blurb: 'Customers book appointments themselves, at the times you allow.' },
      { name: 'Website Maintenance',   cents: 1999, blurb: 'Up to 15 changes a month — text, photos, prices, hours.' },
      { name: 'Review Management',     cents: 2999, blurb: 'We help manage your Google Business and Maps reviews.' },
      { name: 'Digital Menu',          cents: 1999, setupCents: 4999, blurb: 'Your menu on the web, changed when the kitchen changes.' }
    ],
    extras: [
      { group: 'Brand & design', name: 'Logo Design', cents: 4999, blurb: 'A custom professional logo for your business.' },
      { group: 'Brand & design', name: 'Brand Kit', cents: 7999, blurb: 'Logo, brand colours, fonts and basic brand guidelines.' },
      { group: 'Brand & design', name: 'Business Card Design', cents: 2999, blurb: 'Ready for printing or sharing digitally.' },
      { group: 'Brand & design', name: 'Flyer / Poster Design', cents: 3999, blurb: 'For offers, events, services or announcements.' },
      { group: 'Brand & design', name: 'Menu Design', cents: 3999, blurb: 'For restaurants, cafés, salons and similar.' },
      { group: 'Social & marketing', name: 'Social Media Starter Pack', cents: 5999, blurb: 'Profile picture, banner and 5 branded posts.' },
      { group: 'Social & marketing', name: 'Promo Video / Short Ad', cents: 4999, from: true, blurb: 'Final price depends on length and complexity.' },
      { group: 'Social & marketing', name: 'AI Business Photos', cents: 3000, from: true, blurb: 'Final price depends on the number and complexity of images.' },
      { group: 'Social & marketing', name: 'Google Review QR Card', cents: 1999, blurb: 'Makes leaving a review easier. What they write is up to them.' },
      { group: 'Business setup', name: 'Professional Business Email Setup', cents: 2999, blurb: 'Setup only — a provider mailbox subscription is not included.' },
      { group: 'Business setup', name: 'WhatsApp Business Setup', cents: 3999, blurb: 'Profile, business information and contact details.' },
      { group: 'Business documents', name: 'Business Document Templates', cents: 2999, blurb: 'Invoice, quotation and receipt templates.' }
    ]
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

  function signOut() {
    var s = load();
    s.session = null;
    save();
  }

  function session() { return load().session; }

  // Pages behind the login gate call this on load.
  function requireSession(role) {
    var s = session();
    if (!s || (role && s.role !== role)) {
      global.location.href = 'login?next=' + encodeURIComponent(
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

  global.Onsite = {
    CATALOG: CATALOG, emptyDraft: emptyDraft,
    euro: euro, euroMonth: euroMonth, deposit: deposit, balance: balance, date: date,
    load: load, save: save, reset: reset,
    newCode: newCode, signIn: signIn, signOut: signOut, session: session, requireSession: requireSession,
    stages: stages, statusLabel: statusLabel, advance: advance,
    notify: notify, unreadCount: unreadCount, markAllRead: markAllRead,
    maintenanceActive: maintenanceActive, changesLeft: changesLeft,
    esc: escapeHtml
  };
})(window);
