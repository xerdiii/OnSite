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
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

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

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { return res.status(400).json({ error: 'bad json' }); }
  }
  body = body || {};

  // A honeypot the real form leaves empty. Bots fill everything in.
  if (body.company) return res.status(200).json({ ok: true });

  const need = ['name', 'maps', 'phone', 'social', 'email'];
  const missing = need.filter((k) => !String(body[k] || '').trim());
  if (missing.length) return res.status(400).json({ error: 'missing', fields: missing });

  const hours = Array.isArray(body.hours) ? body.hours : [];
  const hoursRows = hours
    .map((h) => `<tr><td style="padding:2px 14px 2px 0;color:#666">${esc(h.day)}</td><td>${esc(h.open)}</td></tr>`)
    .join('');

  const html = `
    <h2 style="font:600 18px system-ui;margin:0 0 14px">Free landing page — ${esc(body.name)}</h2>
    <table style="font:14px system-ui;border-collapse:collapse">
      <tr><td style="padding:3px 14px 3px 0;color:#666">Business</td><td><b>${esc(body.name)}</b></td></tr>
      <tr><td style="padding:3px 14px 3px 0;color:#666">Phone</td><td>${esc(body.phone)}</td></tr>
      <tr><td style="padding:3px 14px 3px 0;color:#666">Email</td><td>${esc(body.email)}</td></tr>
      <tr><td style="padding:3px 14px 3px 0;color:#666">Maps</td><td><a href="${esc(body.maps)}">${esc(body.maps)}</a></td></tr>
      <tr><td style="padding:3px 14px 3px 0;color:#666">Social</td><td>${esc(body.social)}</td></tr>
      <tr><td style="padding:3px 14px 3px 0;color:#666">Files</td><td>${esc(body.images || 0)} photo(s), ${esc(body.video || 0)} video</td></tr>
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
        reply_to: String(body.email).trim(),
        subject: `Free landing page — ${String(body.name).trim()}`,
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
