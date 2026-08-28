/* ───────────────────────────────────────────────────────────────
   POST /api/contact  —  the contact form lands in your inbox

   Same shape as /api/signup: the browser posts here, this posts to
   Resend server-side, and the API key never leaves the server.

   Vercel → Settings → Environment Variables:

     RESEND_API_KEY   re_xxx      from resend.com
     NOTIFY_EMAIL     where messages should arrive (defaults below)
     FROM_EMAIL       sitehouse@your-verified-domain

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
    // A 20KB contact message is not a contact message. Parsing an
    // unbounded string is how one request eats the whole memory budget.
    if (body.length > 20_000) return res.status(413).json({ error: 'too large' });
    try { body = JSON.parse(body); } catch { return res.status(400).json({ error: 'bad json' }); }
  }
  body = body || {};

  // A honeypot the real form leaves empty. Bots fill everything in.
  if (body.company) return res.status(200).json({ ok: true });

  const cap = (v, n) => String(v == null ? '' : v).trim().slice(0, n);
  const name = cap(body.name, 120);
  const email = cap(body.email, 200);
  const subject = cap(body.subject, 200);
  const message = cap(body.message, 5000);

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
      <tr><td style="padding:3px 14px 3px 0;color:#666">Subject</td><td>${esc(subject) || '—'}</td></tr>
    </table>
    <h3 style="font:600 14px system-ui;margin:18px 0 6px">Message</h3>
    <p style="font:14px/1.6 system-ui;white-space:pre-wrap;margin:0">${esc(message)}</p>`;

  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from,
        to: [to],
        // So hitting reply in Gmail goes to the sender, not to nobody.
        reply_to: email,
        // A newline in a subject is a header injection in every mail
        // system that builds headers by concatenation.
        subject: `Contact — ${(subject || name).replace(/[\r\n]+/g, ' ')}`,
        html
      })
    });

    if (!r.ok) {
      const detail = await r.text();
      console.error('resend rejected', r.status, detail);
      return res.status(502).json({ error: 'mail rejected' });
    }
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('mail failed', e);
    return res.status(502).json({ error: 'mail failed' });
  }
}
