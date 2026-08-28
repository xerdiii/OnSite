/* ───────────────────────────────────────────────────────────────
   POST /api/paddle-webhook  —  Paddle tells us a deposit was paid

   This is the only thing that may treat an order as paid. The browser
   being redirected to a success page proves nothing: anyone can visit
   that URL. Paddle signs every notification, this verifies the
   signature, and only then does the order email go out.

   Set in Vercel → Settings → Environment Variables:

     PADDLE_WEBHOOK_SECRET   Paddle → Developer Tools → Notifications
     RESEND_API_KEY          same key the contact form uses
     FROM_EMAIL              a domain verified with Resend
     NOTIFY_EMAIL            optional; defaults to the owner's Gmail

   Then in Paddle → Developer Tools → Notifications, add a destination
   pointing at https://your-domain/api/paddle-webhook and subscribe it
   to transaction.completed.
   ─────────────────────────────────────────────────────────────── */
import crypto from 'node:crypto';

// Vercel parses JSON bodies by default. The signature is computed over
// the exact bytes Paddle sent, so a parsed-and-restringified body will
// not match — the raw stream is not optional here.
export const config = { api: { bodyParser: false } };

const DEFAULT_TO = 'erdiiithaci@gmail.com';

// Paddle retries on non-2xx, and a retry must not send a second email.
// Instance-local, so it is a strong guard within one warm instance and
// no guard at all across cold starts — the honest fix is a shared
// store, which this site has no database for. Duplicates are possible
// and would be visible as two identical emails, not two charges.
const handled = new Set();

const esc = (v) => String(v == null ? '' : v)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const money = (cents, cur) =>
  (cur || 'EUR') + ' ' + (Number(cents || 0) / 100).toFixed(2);

function rawBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      // A webhook body is small. Refuse to buffer something that isn't.
      if (size > 1_000_000) { reject(new Error('body too large')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

/* Paddle-Signature: ts=1671552777;h1=eb4d0dc8... */
function parseSignature(header) {
  const out = {};
  String(header || '').split(';').forEach((part) => {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = part.slice(i + 1).trim();
  });
  return out;
}

function verify(raw, header, secret) {
  const { ts, h1 } = parseSignature(header);
  if (!ts || !h1) return false;

  // Replay window. A signature stays valid forever without this, so a
  // captured request could be replayed months later.
  const age = Math.abs(Date.now() / 1000 - Number(ts));
  if (!Number.isFinite(age) || age > 300) return false;

  const expected = crypto
    .createHmac('sha256', secret)
    .update(ts + ':' + raw.toString('utf8'))
    .digest('hex');

  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(h1, 'utf8');
  // timingSafeEqual throws on length mismatch, which is itself a leak
  // of information — check length first, then compare in constant time.
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'POST only' });
  }

  const secret = process.env.PADDLE_WEBHOOK_SECRET;
  if (!secret) return res.status(503).json({ error: 'webhook not configured' });

  let raw;
  try { raw = await rawBody(req); }
  catch { return res.status(413).json({ error: 'too large' }); }

  if (!verify(raw, req.headers['paddle-signature'], secret)) {
    // Deliberately terse. An attacker probing this endpoint learns
    // nothing about why their forgery failed.
    console.warn('paddle webhook: bad signature');
    return res.status(401).json({ error: 'bad signature' });
  }

  let event;
  try { event = JSON.parse(raw.toString('utf8')); }
  catch { return res.status(400).json({ error: 'bad json' }); }

  // Acknowledge anything we do not act on, or Paddle keeps retrying it.
  if (event.event_type !== 'transaction.completed') {
    return res.status(200).json({ ok: true, ignored: event.event_type });
  }

  const id = event.event_id || event.notification_id || '';
  if (id && handled.has(id)) return res.status(200).json({ ok: true, duplicate: true });
  if (id) handled.add(id);

  const d = event.data || {};
  const custom = d.custom_data || {};
  const currency = d.currency_code || 'EUR';
  const paid = d.details?.totals?.grand_total ?? d.details?.totals?.total ?? null;
  const email = d.customer?.email || d.billing_details?.email || '—';
  const name = d.customer?.name || '—';

  const PACKAGE = { custom: 'Custom Website', full: 'Full Website', complete: 'Complete Package' };
  const label = PACKAGE[custom.package] || custom.package || 'Unknown package';

  const key = process.env.RESEND_API_KEY;
  const from = process.env.FROM_EMAIL;
  const to = process.env.NOTIFY_EMAIL || DEFAULT_TO;

  // The payment is real whether or not the email sends. Never 500 here:
  // that tells Paddle to retry a transaction that already succeeded.
  if (!key || !from) {
    console.error('paddle webhook: paid but mail not configured', d.id);
    return res.status(200).json({ ok: true, emailed: false });
  }

  const html = `
    <h2 style="font:600 18px system-ui;margin:0 0 4px">Deposit paid — ${esc(label)}</h2>
    <p style="font:14px system-ui;color:#666;margin:0 0 16px">Paddle transaction ${esc(d.id || '—')}</p>
    <table style="font:14px system-ui;border-collapse:collapse">
      <tr><td style="padding:3px 14px 3px 0;color:#666">Customer</td><td><b>${esc(name)}</b></td></tr>
      <tr><td style="padding:3px 14px 3px 0;color:#666">Email</td><td>${esc(email)}</td></tr>
      <tr><td style="padding:3px 14px 3px 0;color:#666">Package</td><td>${esc(label)}</td></tr>
      <tr><td style="padding:3px 14px 3px 0;color:#666">Paid now</td><td><b>${esc(money(paid, currency))}</b></td></tr>
      <tr><td style="padding:3px 14px 3px 0;color:#666">Still owed</td><td>${esc(money(custom.balance_cents, currency))}</td></tr>
      <tr><td style="padding:3px 14px 3px 0;color:#666">Order total</td><td>${esc(money(custom.total_cents, currency))}</td></tr>
      <tr><td style="padding:3px 14px 3px 0;color:#666">Started from</td><td>${esc(custom.source || '—')}</td></tr>
    </table>
    <p style="font:13px system-ui;color:#888;margin-top:20px">
      Invoice the remaining ${esc(money(custom.balance_cents, currency))} from Paddle once the site is approved.
    </p>`;

  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from,
        to: [to],
        reply_to: email !== '—' ? email : undefined,
        subject: `Deposit paid — ${label} — ${money(paid, currency)}`.replace(/[\r\n]+/g, ' '),
        html
      })
    });
    if (!r.ok) console.error('resend rejected', r.status, (await r.text()).slice(0, 400));
    return res.status(200).json({ ok: true, emailed: r.ok });
  } catch (e) {
    console.error('paddle webhook: mail failed', e);
    return res.status(200).json({ ok: true, emailed: false });
  }
}
