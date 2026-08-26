/* Drive api/ai.mjs directly with a stub req/res and a stubbed fetch,
   to prove the throttle actually returns 429 and stops calling
   upstream — rather than assuming it does because the code reads right. */
process.env.AI_BASE_URL = 'https://example.invalid/v1';
process.env.AI_API_KEY = 'test-key';
process.env.AI_MODEL = 'test-model';

let upstreamCalls = 0;
globalThis.fetch = async () => {
  upstreamCalls += 1;
  return {
    ok: true,
    status: 200,
    json: async () => ({ choices: [{ message: { content: 'stub reply' } }] })
  };
};

const { default: handler } = await import('file:///C:/projects/OnSite/api/ai.mjs');

function call(ip, body) {
  const req = {
    method: 'POST',
    headers: { 'x-forwarded-for': ip },
    body: body ?? { messages: [{ role: 'user', content: 'where is my invoice?' }] }
  };
  let code = 0, payload = null;
  const res = {
    setHeader() {},
    status(c) { code = c; return res; },
    json(p) { payload = p; return res; }
  };
  return handler(req, res).then(() => ({ code, payload }));
}

const codes = [];
for (let i = 0; i < 15; i++) codes.push((await call('9.9.9.9')).code);

const other = await call('4.4.4.4');                 // a different IP must be unaffected
const big = await call('7.7.7.7', 'x'.repeat(50_000)); // over MAX_BODY

console.log('codes for 15 calls from one IP :', codes.join(' '));
console.log('first 429 at call #           :', codes.indexOf(429) + 1);
console.log('different IP still allowed     :', other.code, JSON.stringify(other.payload));
console.log('oversized body                 :', big.code, JSON.stringify(big.payload));
console.log('upstream calls actually made   :', upstreamCalls, '(should equal the non-429 count)');
