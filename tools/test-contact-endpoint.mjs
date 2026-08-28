/* Drives api/contact.mjs with a stub req/res and a stubbed fetch, so
   the routing and the guards are checked without sending real mail.
   node tools/test-contact-endpoint.mjs */

let sentTo = null, sentFrom = null, sentReplyTo = null, sentSubject = null, calls = 0;
globalThis.fetch = async (_url, opts) => {
  calls += 1;
  const b = JSON.parse(opts.body);
  sentTo = b.to; sentFrom = b.from; sentReplyTo = b.reply_to; sentSubject = b.subject;
  return { ok: true, status: 200, text: async () => '' };
};

function call(handler, body, ip = '1.1.1.1') {
  const req = { method: 'POST', headers: { 'x-forwarded-for': ip }, body };
  let code = 0, payload = null;
  const res = {
    setHeader() {}, status(c) { code = c; return res; }, json(p) { payload = p; return res; }
  };
  return handler(req, res).then(() => ({ code, payload }));
}

const out = [];
const ok = (l, pass, extra) => out.push((pass ? '  PASS  ' : '  FAIL  ') + l + (!pass && extra ? '  → ' + extra : ''));

const good = { name: 'Jane', email: 'jane@example.com', subject: 'Website', message: 'Hello there' };

// ── unconfigured ─────────────────────────────────────────────────
delete process.env.RESEND_API_KEY;
delete process.env.FROM_EMAIL;
delete process.env.NOTIFY_EMAIL;
let { default: h } = await import('file:///C:/projects/OnSite/api/contact.mjs?a=1');
ok('503 when Resend is not configured', (await call(h, good)).code === 503);

// ── configured ───────────────────────────────────────────────────
process.env.RESEND_API_KEY = 're_test';
process.env.FROM_EMAIL = 'hello@sitehouse.eu';
({ default: h } = await import('file:///C:/projects/OnSite/api/contact.mjs?b=2'));

let r = await call(h, good, '2.2.2.2');
ok('valid message is accepted', r.code === 200, JSON.stringify(r.payload));
ok('defaults to the owner Gmail', Array.isArray(sentTo) && sentTo[0] === 'erdiiithaci@gmail.com', String(sentTo));
ok('sends from the verified domain', sentFrom === 'hello@sitehouse.eu', String(sentFrom));
ok('reply-to is the sender, so Reply works', sentReplyTo === 'jane@example.com', String(sentReplyTo));

// ── NOTIFY_EMAIL still wins ──────────────────────────────────────
process.env.NOTIFY_EMAIL = 'ops@sitehouse.eu';
({ default: h } = await import('file:///C:/projects/OnSite/api/contact.mjs?c=3'));
await call(h, good, '3.3.3.3');
ok('NOTIFY_EMAIL overrides the default', sentTo[0] === 'ops@sitehouse.eu', String(sentTo));
delete process.env.NOTIFY_EMAIL;

({ default: h } = await import('file:///C:/projects/OnSite/api/contact.mjs?d=4'));

// ── validation ───────────────────────────────────────────────────
ok('missing message rejected', (await call(h, { name: 'J', email: 'j@e.com' }, '4.4.4.4')).code === 400);
ok('bad email rejected', (await call(h, { ...good, email: 'nope' }, '5.5.5.5')).code === 400);
ok('GET rejected', (await (async () => {
  let code = 0;
  await h({ method: 'GET', headers: {} }, { setHeader() {}, status(c) { code = c; return this; }, json() { return this; } });
  return code;
})()) === 405);

// ── honeypot: accepted, but nothing sent ─────────────────────────
const before = calls;
const hp = await call(h, { ...good, company: 'bot inc' }, '6.6.6.6');
ok('honeypot looks accepted to the bot', hp.code === 200);
ok('honeypot sends no mail', calls === before);

// ── header injection ─────────────────────────────────────────────
await call(h, { ...good, subject: 'Hi\r\nBcc: victim@example.com' }, '7.7.7.7');
ok('newlines stripped from the subject', !/[\r\n]/.test(sentSubject), JSON.stringify(sentSubject));

// ── throttle ─────────────────────────────────────────────────────
const codes = [];
for (let i = 0; i < 5; i++) codes.push((await call(h, good, '9.9.9.9')).code);
ok('throttles after 3 from one IP', codes.filter((c) => c === 429).length === 2, codes.join(','));

console.log(out.join('\n'));
const failed = out.filter((l) => l.includes('FAIL')).length;
console.log(failed ? `\n${failed} FAILED` : '\nall contact endpoint checks passed');
process.exit(failed ? 1 : 0);
