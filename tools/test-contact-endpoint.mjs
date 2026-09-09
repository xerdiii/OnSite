import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';

/* Resolved from this file, never hardcoded — the project folder has
   been renamed once already and took every harness down with it.
   pathToFileURL handles Windows separators; hand-rolling that escaping
   is what broke the first attempt. */
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const api = (f, bust) => pathToFileURL(join(ROOT, 'api', f)).href + (bust ? '?' + bust : '');

/* Drives api/contact.mjs with a stub req/res and a stubbed fetch, so
   the routing and the guards are checked without sending real mail.
   node tools/test-contact-endpoint.mjs */

let sentTo = null, sentFrom = null, sentReplyTo = null, sentSubject = null, sentHtml = null, calls = 0;
globalThis.fetch = async (_url, opts) => {
  calls += 1;
  const b = JSON.parse(opts.body);
  sentTo = b.to; sentFrom = b.from; sentReplyTo = b.reply_to; sentSubject = b.subject;
  sentHtml = b.html;
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
let { default: h } = await import(api("contact.mjs", "a=1"));
ok('503 when Resend is not configured', (await call(h, good)).code === 503);

// ── configured ───────────────────────────────────────────────────
process.env.RESEND_API_KEY = 're_test';
process.env.FROM_EMAIL = 'info@xovahweb.com';
({ default: h } = await import(api("contact.mjs", "b=2")));

let r = await call(h, good, '2.2.2.2');
ok('valid message is accepted', r.code === 200, JSON.stringify(r.payload));
ok('defaults to the owner Gmail', Array.isArray(sentTo) && sentTo[0] === 'erdiiithaci@gmail.com', String(sentTo));
ok('sends from the verified domain', sentFrom === 'info@xovahweb.com', String(sentFrom));
ok('reply-to is the sender, so Reply works', sentReplyTo === 'jane@example.com', String(sentReplyTo));

// ── NOTIFY_EMAIL still wins ──────────────────────────────────────
process.env.NOTIFY_EMAIL = 'info@xovahweb.com';
({ default: h } = await import(api("contact.mjs", "c=3")));
await call(h, good, '3.3.3.3');
ok('NOTIFY_EMAIL overrides the default', sentTo[0] === 'info@xovahweb.com', String(sentTo));
delete process.env.NOTIFY_EMAIL;

({ default: h } = await import(api("contact.mjs", "d=4")));

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


// ── The quote fields ────────────────────────────────────────────
({ default: h } = await import(api('contact.mjs', 'e=5')));
calls = 0;
r = await call(h, {
  name: 'Arben Krasniqi', email: 'arben@example.com',
  business: 'Kafja e Vogel', service: 'Full Website', budget: '200-500',
  message: 'A site for our coffee shop, with a menu.'
}, '8.8.8.8');
ok('submission with the quote fields is accepted', r.code === 200, JSON.stringify(r.payload));
ok('business reaches the email', /Kafja e Vogel/.test(sentHtml || ''));
ok('service reaches the email', /Full Website/.test(sentHtml || ''));
ok('budget reaches the email', /200-500/.test(sentHtml || ''));
ok('subject names the service and the business',
   /Full Website/.test(sentSubject || '') && /Kafja e Vogel/.test(sentSubject || ''), sentSubject);

/* business is a real field; company is the trap. Swapping the two would
   silently switch off spam protection, so pin the distinction. */
({ default: h } = await import(api('contact.mjs', 'f=6')));
calls = 0;
r = await call(h, {
  name: 'Bot', email: 'bot@example.com', message: 'buy cheap things',
  business: 'Real Business Ltd', company: 'trap'
}, '8.8.4.4');
ok('honeypot still blocks when the business field is filled',
   r.code === 200 && calls === 0, 'calls=' + calls);

({ default: h } = await import(api('contact.mjs', 'g=7')));
calls = 0;
r = await call(h, {
  name: 'Nora', email: 'nora@example.com', message: 'Just a question.',
  business: '', service: '', budget: ''
}, '4.4.4.4');
ok('service and budget are optional', r.code === 200 && calls === 1, 'calls=' + calls);
ok('an unset service reads "Not sure yet"', /Not sure yet/.test(sentHtml || ''));

console.log(out.join('\n'));
const failed = out.filter((l) => l.includes('FAIL')).length;
console.log(failed ? `\n${failed} FAILED` : '\nall contact endpoint checks passed');
process.exit(failed ? 1 : 0);
