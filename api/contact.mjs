/* ───────────────────────────────────────────────────────────────
   POST /api/contact  —  enquiries and project requests reach the inbox

   Two shapes come through here:

     · a plain message from the short form
     · a PROJECT REQUEST from the builder on /start — a package, its
       extras, an estimate and a brief

   Both land as email through Resend, server-side, so the API key never
   reaches the browser. One endpoint rather than two because the
   throttle, the honeypot, the escaping and the Resend wiring already
   live here, and a second copy of those is a second place to get them
   wrong. A body carrying `project` takes the project path; anything
   else behaves exactly as it did before.

   Vercel → Settings → Environment Variables:

     RESEND_API_KEY        re_xxx  from resend.com   ← the only one required
     NOTIFY_EMAIL          where messages should arrive (defaults below)
     FROM_EMAIL            xovah@your-verified-domain (defaults below)
     RECAPTCHA_SECRET_KEY  optional; when set, project requests must pass
                           reCAPTCHA v3 or they are refused with a 403

   FROM_EMAIL must be on a domain verified with Resend. You cannot send
   "from" a Gmail address whose DNS you do not control — that rule is
   what stops spoofing and it applies here too. Arriving AT Gmail is
   fine; that is NOTIFY_EMAIL, and it is where these go by default.

   Only the key has no sensible default: it is a secret, so it cannot
   live in the repository. Without it this replies 503 and the form says
   plainly that nothing was delivered, rather than pretending it was —
   and offers the visitor their own mail app instead, so the enquiry
   still reaches the same inbox.
   ─────────────────────────────────────────────────────────────── */

// Where messages go when NOTIFY_EMAIL is not set. The business mailbox,
// which carries info@, support@ and the other aliases, so every request
// lands in the same inbox the addresses on the site point at.
// Overridable, so production can point elsewhere without touching this.
const DEFAULT_TO = 'hello@xovahweb.com';

// Who it is sent AS. The domain is verified with Resend, so this needs
// no configuration; FROM_EMAIL still overrides it.
const DEFAULT_FROM = 'Xovahweb <hello@xovahweb.com>';

const esc = (v) => String(v == null ? '' : v)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const cap = (v, n) => String(v == null ? '' : v).trim().slice(0, n);

// A price from the browser, forced into a sane integer number of cents.
const cents = (v) => {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 && n < 100_000_000 ? Math.round(n) : 0;
};

const eur = (c) => '€' + (c / 100).toFixed(2);

/* ── Attachments ─────────────────────────────────────────────
   PDFs only, and every limit is re-checked here. The browser enforces
   the same three rules so a visitor is told early, but a POST does not
   have to come from the form, so nothing it claims is taken on trust:
   not the count, not the size, not the type, not the name. */
const MAX_FILES = 3;
const MAX_BYTES = 3 * 1024 * 1024;          // 3MB of actual PDF, before base64
const B64 = /^[A-Za-z0-9+/]+={0,2}$/;

// %PDF at the head of the decoded bytes. An extension proves nothing —
// this is what stops an .exe arriving named invoice.pdf.
const PDF_MAGIC = 'JVBERi0';                 // base64 of '%PDF-'

function cleanName(v) {
  const base = String(v == null ? '' : v).split(/[\\/]/).pop();
  const safe = base.replace(/[^A-Za-z0-9._ -]/g, '').replace(/^\.+/, '').trim();
  const named = safe.slice(0, 80) || 'attachment.pdf';
  return /\.pdf$/i.test(named) ? named : named + '.pdf';
}

function attachments(raw) {
  if (!Array.isArray(raw)) return { files: [], rejected: 0 };

  const files = [];
  let rejected = 0;
  let total = 0;

  for (const f of raw.slice(0, MAX_FILES)) {
    const content = String((f && f.content) || '').replace(/\s/g, '');
    if (!content || !B64.test(content) || !content.startsWith(PDF_MAGIC)) { rejected++; continue; }

    // Length of base64 maps to decoded bytes without decoding it first.
    const bytes = Math.floor(content.length * 3 / 4);
    if (bytes === 0 || total + bytes > MAX_BYTES) { rejected++; continue; }

    total += bytes;
    files.push({ filename: cleanName(f && f.filename), content, bytes });
  }

  if (Array.isArray(raw) && raw.length > MAX_FILES) rejected += raw.length - MAX_FILES;
  return { files, rejected };
}

const kb = (n) => n < 1024 * 1024
  ? Math.round(n / 1024) + ' KB'
  : (n / 1024 / 1024).toFixed(1) + ' MB';

/* ── reCAPTCHA v3 ────────────────────────────────────────────
   Verified here and nowhere else: a score the browser reports about
   itself is worth nothing, so the token is exchanged with Google
   server-side using the secret. RECAPTCHA_SECRET_KEY is read from the
   environment and never reaches the client — the page carries only the
   public site key.

   Unset secret means the check is not configured, and the form keeps
   working exactly as it did before. That is deliberate: switching this
   on should be a decision, not something a missing variable makes for
   you, and GET /api/contact reports which state you are in. Once the
   secret IS set, a token that fails is refused. */
const RECAPTCHA_ACTION = 'project_request';
const RECAPTCHA_MIN_SCORE = 0.5;

async function checkRecaptcha(token, ip) {
  const secret = process.env.RECAPTCHA_SECRET_KEY;
  if (!secret) return { ok: true, skipped: true };
  if (!token) return { ok: false, why: 'no token' };

  const form = new URLSearchParams({ secret, response: String(token).slice(0, 4000) });
  if (ip && ip !== 'unknown') form.set('remoteip', ip);

  let data;
  try {
    const r = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form
    });
    data = await r.json();
  } catch (e) {
    // Google unreachable. Refuse rather than wave it through: the whole
    // point of the check is that it cannot be skipped from outside.
    console.error('recaptcha unreachable', e);
    return { ok: false, why: 'verifier unreachable' };
  }

  if (!data.success) {
    return { ok: false, why: (data['error-codes'] || []).join(', ') || 'rejected' };
  }
  // A token minted for another action is a token lifted from another page.
  if (data.action && data.action !== RECAPTCHA_ACTION) {
    return { ok: false, why: 'action was ' + data.action };
  }
  if (typeof data.score === 'number' && data.score < RECAPTCHA_MIN_SCORE) {
    return { ok: false, why: 'score ' + data.score };
  }
  return { ok: true, score: data.score };
}

/* A best-effort throttle. Serverless instances are not shared, so this
   is a speed bump rather than a wall — it stops a script hammering one
   warm instance and burning the mail quota. A real limit needs shared
   state (Upstash, Vercel KV); noted rather than pretended. */
const seen = new Map();
const WINDOW = 60_000, MAX = 3;

function tooMany(ip) {
  const now = Date.now();
  for (const [k, v] of seen) if (now - v.first > WINDOW) seen.delete(k);
  const hit = seen.get(ip);
  if (!hit) { seen.set(ip, { first: now, n: 1 }); return false; }
  hit.n += 1;
  return hit.n > MAX;
}

async function send({ key, from, to, replyTo, subject, html, files }) {
  const payload = {
    from,
    to: [to],
    // So hitting reply in Gmail goes to the sender, not to nobody.
    reply_to: replyTo,
    // A newline in a subject is a header injection in every mail
    // system that builds headers by concatenation.
    subject: subject.replace(/[\r\n]+/g, ' '),
    html
  };
  if (files && files.length) {
    payload.attachments = files.map((f) => ({ filename: f.filename, content: f.content }));
  }

  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!r.ok) {
    const detail = await r.text();
    console.error('resend rejected', r.status, detail);
    return false;
  }
  return true;
}

export default async function handler(req, res) {
  /* A health check, so "the form is broken" can be told apart from "the
     key was never set" without sending a test message to find out.
     Booleans only: whether each variable exists, never what is in it. */
  if (req.method === 'GET') {
    return res.status(200).json({
      ok: true,
      RESEND_API_KEY: !!process.env.RESEND_API_KEY,
      NOTIFY_EMAIL: !!process.env.NOTIFY_EMAIL,
      FROM_EMAIL: !!process.env.FROM_EMAIL,
      RECAPTCHA_SECRET_KEY: !!process.env.RECAPTCHA_SECRET_KEY
    });
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'POST only' });
  }

  const key = process.env.RESEND_API_KEY;
  const to = process.env.NOTIFY_EMAIL || DEFAULT_TO;
  const from = process.env.FROM_EMAIL || DEFAULT_FROM;
  if (!key) {
    return res.status(503).json({ error: 'mail not configured' });
  }

  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
  if (tooMany(ip)) {
    res.setHeader('Retry-After', '60');
    return res.status(429).json({ error: 'too many requests' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    // A project request can carry PDFs, base64'd, which inflates them by
    // a third. Vercel refuses a request body over 4.5MB before this code
    // ever runs, so the ceiling sits just under it: enough for the 3MB of
    // attachments the builder allows, and still a ceiling, because
    // parsing an unbounded string is how one request eats the whole
    // memory budget.
    if (body.length > 4_400_000) return res.status(413).json({ error: 'too large' });
    try { body = JSON.parse(body); } catch { return res.status(400).json({ error: 'bad json' }); }
  }
  body = body || {};

  // A honeypot the real form leaves empty. Bots fill everything in.
  if (body.company) return res.status(200).json({ ok: true });

  if (body.project) return projectRequest(req, res, body, { key, to, from });

  const name = cap(body.name, 120);
  const email = cap(body.email, 200);
  const business = cap(body.business, 200);
  const service = cap(body.service, 120);
  const budget = cap(body.budget, 60);
  const message = cap(body.message, 5000);

  /* Built here rather than accepted from the form, so the subject line
     always says something useful and can never be steered by input. */
  const subject = service ? service + ' - ' + (business || name) : (business || name);

  const missing = [];
  if (!name) missing.push('name');
  if (!email) missing.push('email');
  if (!message) missing.push('message');
  if (missing.length) return res.status(400).json({ error: 'missing', fields: missing });

  if (!EMAIL.test(email)) return res.status(400).json({ error: 'bad email' });

  const html = `
    <h2 style="font:600 18px system-ui;margin:0 0 14px">Contact form — ${esc(name)}</h2>
    <table style="font:14px system-ui;border-collapse:collapse">
      <tr><td style="padding:3px 14px 3px 0;color:#666">Name</td><td><b>${esc(name)}</b></td></tr>
      <tr><td style="padding:3px 14px 3px 0;color:#666">Email</td><td>${esc(email)}</td></tr>
      <tr><td style="padding:3px 14px 3px 0;color:#666">Business</td><td>${esc(business) || '—'}</td></tr>
      <tr><td style="padding:3px 14px 3px 0;color:#666">Service</td><td>${esc(service) || 'Not sure yet'}</td></tr>
      <tr><td style="padding:3px 14px 3px 0;color:#666">Budget</td><td>${esc(budget) || 'Not sure yet'}</td></tr>
    </table>
    <h3 style="font:600 14px system-ui;margin:18px 0 6px">Message</h3>
    <p style="font:14px/1.6 system-ui;white-space:pre-wrap;margin:0">${esc(message)}</p>`;

  try {
    const ok = await send({
      key, from, to, replyTo: email,
      subject: `Contact — ${subject || name}`,
      html
    });
    return ok
      ? res.status(200).json({ ok: true })
      : res.status(502).json({ error: 'mail rejected' });
  } catch (e) {
    console.error('mail failed', e);
    return res.status(502).json({ error: 'mail failed' });
  }
}

/* ═══════════════════════════════════════════════════════════════
   A project request from the builder on /start

   What assets/project.js posts:

     email:   'reply@address'              the one required field
     project: {
       package: { key, name, cents },
       extras:  [ { name, cents }, … ],
       totalCents: 39400,                  what the browser displayed
       brief:   'free text',
       details: { businessName, siteType, style, colours,
                  features, references, notes }
     }

   THE TOTAL IS NOT TAKEN ON TRUST. It is recomputed from the line
   items and compared with what the browser claimed, so a figure edited
   in devtools cannot quietly become the number sitting in your inbox —
   and if the two disagree the email says so in red rather than picking
   one silently.

   The individual line prices do still come from the browser. Pricing
   them here would mean a second copy of a seventy-item catalogue, and
   a second copy is a second thing to forget to update. That trade is
   fine while this is a REQUEST: nothing is charged, and you agree the
   figure before any work starts.

   TODO — if this ever takes a payment, that trade stops being fine.
   A checkout must price the order on the server from the selected keys
   alone and ignore every number the browser sends.
   ═══════════════════════════════════════════════════════════════ */
async function projectRequest(req, res, body, { key, to, from }) {
  const p = body.project || {};

  const email = cap(body.email, 200);
  if (!EMAIL.test(email)) return res.status(400).json({ error: 'bad email' });

  const pack = p.package || {};
  const packName = cap(pack.name, 120);
  const packCents = cents(pack.cents);
  if (!packName) return res.status(400).json({ error: 'missing', fields: ['package'] });

  const brief = cap(p.brief, 5000);
  if (!brief) return res.status(400).json({ error: 'missing', fields: ['brief'] });

  // After the cheap checks, before anything is sent or attached.
  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
  const spam = await checkRecaptcha(body.recaptchaToken, ip);
  if (!spam.ok) {
    console.warn('recaptcha refused a project request:', spam.why);
    return res.status(403).json({ error: 'failed verification' });
  }

  // Seventy in the catalogue today; the cap is a ceiling, not a limit.
  const extras = (Array.isArray(p.extras) ? p.extras : [])
    .slice(0, 100)
    .map((x) => ({ name: cap(x && x.name, 120), cents: cents(x && x.cents) }))
    .filter((x) => x.name);

  const d = p.details || {};
  const details = [
    ['Business / project name', cap(d.businessName, 160)],
    ['Website type',            cap(d.siteType, 120)],
    ['Preferred style',         cap(d.style, 160)],
    ['Colour preferences',      cap(d.colours, 160)],
    ['Features needed',         cap(d.features, 1500)],
    ['Reference websites',      cap(d.references, 1500)],
    ['Anything else',           cap(d.notes, 1500)],
    ['Files to download',       cap(d.filesLink, 500)]
  ].filter(([, v]) => v);

  const { files, rejected } = attachments(p.files);

  const computed = packCents + extras.reduce((n, x) => n + x.cents, 0);
  const claimed = cents(p.totalCents);
  const mismatch = claimed !== computed;

  const who = cap(d.businessName, 160);

  const extraRows = extras.length
    ? extras.map((x) =>
        `<tr><td style="padding:3px 16px 3px 0">${esc(x.name)}</td>` +
        `<td style="padding:3px 0;text-align:right;white-space:nowrap">${eur(x.cents)}</td></tr>`
      ).join('')
    : '<tr><td style="padding:3px 0;color:#666" colspan="2">None selected</td></tr>';

  const detailRows = details.map(([k, v]) =>
    `<tr><td style="padding:4px 16px 4px 0;color:#666;vertical-align:top;white-space:nowrap">${esc(k)}</td>` +
    `<td style="padding:4px 0;white-space:pre-wrap">${esc(v)}</td></tr>`
  ).join('');

  const html = `
    <h2 style="font:600 18px system-ui;margin:0 0 4px">Project request${who ? ' — ' + esc(who) : ''}</h2>
    <p style="font:13px system-ui;color:#666;margin:0 0 20px">Reply to ${esc(email)}</p>

    <h3 style="font:600 13px system-ui;text-transform:uppercase;letter-spacing:.06em;color:#666;margin:0 0 6px">Package</h3>
    <table style="font:14px system-ui;border-collapse:collapse;width:100%;max-width:520px">
      <tr><td style="padding:3px 16px 3px 0"><b>${esc(packName)}</b></td>
          <td style="padding:3px 0;text-align:right;white-space:nowrap"><b>${eur(packCents)}</b></td></tr>
    </table>

    <h3 style="font:600 13px system-ui;text-transform:uppercase;letter-spacing:.06em;color:#666;margin:20px 0 6px">Extras (${extras.length})</h3>
    <table style="font:14px system-ui;border-collapse:collapse;width:100%;max-width:520px">${extraRows}</table>

    <table style="font:15px system-ui;border-collapse:collapse;width:100%;max-width:520px;margin:14px 0 0;border-top:2px solid #111">
      <tr><td style="padding:10px 16px 3px 0"><b>Estimated total</b></td>
          <td style="padding:10px 0 3px;text-align:right;white-space:nowrap"><b>${eur(computed)}</b></td></tr>
    </table>
    ${mismatch ? `<p style="font:13px system-ui;color:#b00;margin:8px 0 0">
      The browser displayed ${eur(claimed)}. The figure above was recomputed from the line items — check before quoting.
    </p>` : ''}

    ${files.length || rejected ? `
      <h3 style="font:600 13px system-ui;text-transform:uppercase;letter-spacing:.06em;color:#666;margin:24px 0 6px">Attached (${files.length})</h3>
      <table style="font:14px system-ui;border-collapse:collapse;max-width:520px">
        ${files.map((f) =>
          `<tr><td style="padding:3px 16px 3px 0">${esc(f.filename)}</td>` +
          `<td style="padding:3px 0;color:#666;white-space:nowrap">${kb(f.bytes)}</td></tr>`
        ).join('')}
      </table>
      ${rejected ? `<p style="font:13px system-ui;color:#b00;margin:6px 0 0">
        ${rejected} file${rejected === 1 ? ' was' : 's were'} not attached — over the size limit, or not a PDF.
      </p>` : ''}` : ''}

    <h3 style="font:600 13px system-ui;text-transform:uppercase;letter-spacing:.06em;color:#666;margin:24px 0 6px">What they need</h3>
    <p style="font:14px/1.6 system-ui;white-space:pre-wrap;margin:0">${esc(brief)}</p>
    ${detailRows
      ? `<h3 style="font:600 13px system-ui;text-transform:uppercase;letter-spacing:.06em;color:#666;margin:24px 0 6px">Project details</h3>
         <table style="font:14px system-ui;border-collapse:collapse;max-width:560px">${detailRows}</table>`
      : ''}`;

  try {
    const ok = await send({
      key, from, to, replyTo: email,
      subject: `Project request — ${who || packName} — ${eur(computed)}`,
      html, files
    });
    return ok
      ? res.status(200).json({ ok: true })
      : res.status(502).json({ error: 'mail rejected' });
  } catch (e) {
    console.error('mail failed', e);
    return res.status(502).json({ error: 'mail failed' });
  }
}
