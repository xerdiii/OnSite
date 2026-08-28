/* Drives api/paddle-webhook.mjs with a stub request stream and a
   stubbed Resend, and tries to forge its way past the signature check.

   The point of this file: the webhook is the ONLY thing that may treat
   an order as paid, so "it looks right" is not good enough.

   node tools/test-paddle-webhook.mjs */
import crypto from 'node:crypto';
import { Readable } from 'node:stream';

const SECRET = 'pdl_ntfset_test_secret';
process.env.PADDLE_WEBHOOK_SECRET = SECRET;
process.env.RESEND_API_KEY = 're_test';
process.env.FROM_EMAIL = 'hello@sitehouse.eu';

let mails = [];
globalThis.fetch = async (_u, opts) => {
  mails.push(JSON.parse(opts.body));
  return { ok: true, status: 200, text: async () => '' };
};

const { default: handler } = await import('file:///C:/projects/OnSite/api/paddle-webhook.mjs');

function sign(body, secret = SECRET, ts = Math.floor(Date.now() / 1000)) {
  const h1 = crypto.createHmac('sha256', secret).update(ts + ':' + body).digest('hex');
  return `ts=${ts};h1=${h1}`;
}

function call(body, signature, method = 'POST') {
  const req = Readable.from([Buffer.from(body)]);
  req.method = method;
  req.headers = signature ? { 'paddle-signature': signature } : {};
  let code = 0, payload = null;
  const res = {
    setHeader() {}, status(c) { code = c; return res; }, json(p) { payload = p; return res; }
  };
  return handler(req, res).then(() => ({ code, payload }));
}

const event = (id = 'evt_1') => JSON.stringify({
  event_id: id,
  event_type: 'transaction.completed',
  data: {
    id: 'txn_abc',
    currency_code: 'EUR',
    customer: { email: 'jane@example.com', name: 'Jane' },
    details: { totals: { grand_total: '5000' } },
    custom_data: { package: 'full', total_cents: 20000, deposit_cents: 5000, balance_cents: 15000, source: '/index.html' }
  }
});

const out = [];
const ok = (l, pass, extra) => out.push((pass ? '  PASS  ' : '  FAIL  ') + l + (!pass && extra ? '  → ' + extra : ''));

// ── forgery attempts ─────────────────────────────────────────────
ok('no signature → 401', (await call(event(), null)).code === 401);
ok('garbage signature → 401', (await call(event(), 'ts=123;h1=deadbeef')).code === 401);
ok('signed with the wrong secret → 401',
   (await call(event(), sign(event(), 'wrong_secret'))).code === 401);

// body swapped after signing — the classic tamper
const signed = sign(event());
const tampered = event().replace('"balance_cents":15000', '"balance_cents":0');
ok('body tampered after signing → 401', (await call(tampered, signed)).code === 401);

// replay of a genuinely-signed request from long ago
const oldTs = Math.floor(Date.now() / 1000) - 4000;
ok('replayed old timestamp → 401',
   (await call(event(), sign(event(), SECRET, oldTs))).code === 401);

ok('GET → 405', (await call('', null, 'GET')).code === 405);

const forgedMails = mails.length;
ok('no forgery sent any email', forgedMails === 0, String(forgedMails));

// ── the genuine article ──────────────────────────────────────────
mails = [];
const body = event('evt_real');
let r = await call(body, sign(body));
ok('valid signature → 200', r.code === 200, JSON.stringify(r.payload));
ok('order email sent', mails.length === 1, String(mails.length));
ok('email goes to the owner Gmail', mails[0]?.to?.[0] === 'erdiiithaci@gmail.com', String(mails[0]?.to));
ok('subject names package and amount',
   /Full Website/.test(mails[0]?.subject || '') && /50\.00/.test(mails[0]?.subject || ''),
   mails[0]?.subject);
ok('email shows the outstanding balance', /150\.00/.test(mails[0]?.html || ''));
ok('reply-to is the customer', mails[0]?.reply_to === 'jane@example.com', String(mails[0]?.reply_to));

// ── retries must not double-send ─────────────────────────────────
mails = [];
await call(body, sign(body));
ok('Paddle retry is deduplicated', mails.length === 0, String(mails.length));

// ── events we do not act on ──────────────────────────────────────
const other = JSON.stringify({ event_id: 'evt_x', event_type: 'subscription.updated', data: {} });
r = await call(other, sign(other));
ok('unhandled event acknowledged with 200', r.code === 200 && r.payload.ignored === 'subscription.updated');

// ── paid but mail broken: never 500, or Paddle retries a real charge ─
delete process.env.RESEND_API_KEY;
const { default: h2 } = await import('file:///C:/projects/OnSite/api/paddle-webhook.mjs?nomail=1');
const b2 = event('evt_nomail');
const req2 = Readable.from([Buffer.from(b2)]);
req2.method = 'POST';
req2.headers = { 'paddle-signature': sign(b2) };
let code2 = 0, pay2 = null;
await h2(req2, { setHeader() {}, status(c) { code2 = c; return this; }, json(p) { pay2 = p; return this; } });
ok('mail down still returns 200 (no retry storm)', code2 === 200 && pay2.emailed === false,
   code2 + ' ' + JSON.stringify(pay2));

console.log(out.join('\n'));
const failed = out.filter((l) => l.includes('FAIL')).length;
console.log(failed ? `\n${failed} FAILED` : '\nall paddle webhook checks passed');
process.exit(failed ? 1 : 0);
