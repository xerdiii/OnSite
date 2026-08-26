/* ───────────────────────────────────────────────────────────────
   POST /api/signup  —  a free landing page request lands in your inbox

   A Vercel serverless function. The static site cannot send mail, and a
   form that posts straight to Gmail does not exist without handing your
   address to every scraper on the internet — so the browser posts here,
   and this posts to Resend, server-side, with the key never leaving the
   server.

   Set these in Vercel → Settings → Environment Variables:

     RESEND_API_KEY   re_xxx        from resend.com, free tier is 3k/month
     NOTIFY_EMAIL     you@sitehouse…   where the requests should arrive
     FROM_EMAIL       sitehouse@your-verified-domain

   FROM_EMAIL has to be on a domain you verified with Resend. You cannot
   send "from" a Gmail address you do not control the DNS for — that is
   the rule that stops spoofing, and it applies to you too. Arriving AT
   Gmail is fine; that is just NOTIFY_EMAIL.

   With the variables unset the endpoint replies 503 and the form falls
   back to its local demo behaviour, so nothing breaks before you wire
   the account up.
   ─────────────────────────────────────────────────────────────── */

const esc = (v) => String(v == null ? '' : v)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

// Only ever emit a link we are willing to click. Anything that is not
// plain http(s) is shown as text instead of becoming an href.
const safeUrl = (v) => {
  const raw = String(v == null ? '' : v).trim();
  try {
    const u = new URL(raw);
    return (u.protocol === 'http:' || u.protocol === 'https:') ? raw : null;
  } catch { return null; }
};

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
  const to = process.env.NOTIFY_EMAIL;
  const from = process.env.FROM_EMAIL;
  if (!key || !to || !from) {
    return res.status(503).json({ error: 'mail not configured' });
  }

  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
  if (tooMany(ip)) {
    res.setHeader('Retry-After', '60');
    return res.status(429).json({ error: 'too many requests' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    // A 100KB form is not a form. Parsing an unbounded string is how a
    // single request eats the function's whole memory budget.
    if (body.length > 20_000) return res.status(413).json({ error: 'too large' });
    try { body = JSON.parse(body); } catch { return res.status(400).json({ error: 'bad json' }); }
  }
  body = body || {};

  // A honeypot the real form leaves empty. Bots fill everything in.
  if (body.company) return res.status(200).json({ ok: true });

  const need = ['name', 'maps', 'phone', 'social', 'email'];
  const missing = need.filter((k) => !String(body[k] || '').trim());
  if (missing.length) return res.status(400).json({ error: 'missing', fields: missing });

  // Every field is length-capped. Without this one request can compose
  // a megabyte-long email, and Resend will happily send it.
  const cap = (v, n) => String(v == null ? '' : v).trim().slice(0, n);
  const name = cap(body.name, 120);
  const phone = cap(body.phone, 40);
  const email = cap(body.email, 200);
  const social = cap(body.social, 300);
  const mapsUrl = safeUrl(body.maps);
  const mapsText = cap(body.maps, 500);

  if (!EMAIL.test(email)) return res.status(400).json({ error: 'bad email' });

  // Seven days, not seven hundred rows.
  const hours = (Array.isArray(body.hours) ? body.hours : []).slice(0, 7);
  const hoursRows = hours
    .map((h) => `<tr><td style="padding:2px 14px 2px 0;color:#666">${esc(cap(h && h.day, 20))}</td><td>${esc(cap(h && h.open, 40))}</td></tr>`)
    .join('');

  const html = `
      <h2 style="font:600 18px system-ui;margin:0 0 14px">Free landing page — ${esc(name)}</h2>
    <table style="font:14px system-ui;border-collapse:collapse">
      <tr><td style="padding:3px 14px 3px 0;color:#666">Business</td><td><b>${esc(name)}</b></td></tr>
      <tr><td style="padding:3px 14px 3px 0;color:#666">Phone</td><td>${esc(phone)}</td></tr>
      <tr><td style="padding:3px 14px 3px 0;color:#666">Email</td><td>${esc(email)}</td></tr>
      <tr><td style="padding:3px 14px 3px 0;color:#666">Maps</td><td>${
        mapsUrl ? `<a href="${esc(mapsUrl)}">${esc(mapsUrl)}</a>` : esc(mapsText) + ' (not a link)'
      }</td></tr>
      <tr><td style="padding:3px 14px 3px 0;color:#666">Social</td><td>${esc(social)}</td></tr>
      <tr><td style="padding:3px 14px 3px 0;color:#666">Files</td><td>${
        Number(body.images) || 0} photo(s), ${Number(body.video) || 0} video</td></tr>
    </table>
    ${hoursRows ? `<h3 style="font:600 14px system-ui;margin:18px 0 6px">Opening hours</h3>
      <table style="font:14px system-ui;border-collapse:collapse">${hoursRows}</table>` : ''}
    <p style="font:13px system-ui;color:#888;margin-top:20px">
      Due within 48 hours — by ${esc(new Date(Date.now() + 172800000).toUTCString())}.
    </p>`;

  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from,
        to: [to],
        // So hitting reply in Gmail goes to the customer, not to nobody.
        reply_to: email,
        // A newline in a subject is a header injection in every mail
        // system that builds headers by concatenation.
        subject: `Free landing page — ${name.replace(/[\r\n]+/g, ' ')}`,
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
