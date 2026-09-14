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

     RESEND_API_KEY   re_xxx      from resend.com
     NOTIFY_EMAIL     where messages should arrive (defaults below)
     FROM_EMAIL       xovah@your-verified-domain

   FROM_EMAIL must be on a domain verified with Resend. You cannot send
   "from" a Gmail address whose DNS you do not control — that rule is
   what stops spoofing and it applies here too. Arriving AT Gmail is
   fine; that is NOTIFY_EMAIL, and it is where these go by default.

   With the variables unset this replies 503 and the form says plainly
   that nothing was delivered, rather than pretending it was.
   ─────────────────────────────────────────────────────────────── */

// Where messages go when NOTIFY_EMAIL is not set. Overridable, so
// production can point somewhere else without touching this file.
const DEFAULT_TO = 'erdiiithaci@gmail.com';

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

async function send({ key, from, to, replyTo, subject, html }) {
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from,
      to: [to],
      // So hitting reply in Gmail goes to the sender, not to nobody.
      reply_to: replyTo,
      // A newline in a subject is a header injection in every mail
      // system that builds headers by concatenation.
      subject: subject.replace(/[\r\n]+/g, ' '),
      html
    })
  });
  if (!r.ok) {
    const detail = await r.text();
    console.error('resend rejected', r.status, detail);
    return false;
  }
  return true;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'POST only' });
  }

  const key = process.env.RESEND_API_KEY;
  const to = process.env.NOTIFY_EMAIL || DEFAULT_TO;
  const from = process.env.FROM_EMAIL;
  if (!key || !from) {
    return res.status(503).json({ error: 'mail not configured' });
  }

  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
  if (tooMany(ip)) {
    res.setHeader('Retry-After', '60');
    return res.status(429).json({ error: 'too many requests' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    // A project request carries a brief and seven optional fields, so
    // the ceiling is higher than a contact message — but still a
    // ceiling. Parsing an unbounded string is how one request eats the
    // whole memory budget.
    if (body.length > 60_000) return res.status(413).json({ error: 'too large' });
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
    ['Anything else',           cap(d.notes, 1500)]
  ].filter(([, v]) => v);

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
