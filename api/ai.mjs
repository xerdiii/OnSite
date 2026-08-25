/* ───────────────────────────────────────────────────────────────
   POST /api/ai  —  the dashboard assistant

   Provider-agnostic on purpose. Groq, OpenRouter, Together, Cerebras,
   Mistral, DeepSeek, Google's compatibility endpoint and a local
   Ollama all speak the same /chat/completions shape, so switching
   between them is three environment variables and no code:

     AI_BASE_URL   https://api.groq.com/openai/v1
     AI_API_KEY    gsk_...
     AI_MODEL      llama-3.3-70b-versatile

   Ollama on your own machine is the same thing with
   AI_BASE_URL=http://localhost:11434/v1 and any non-empty key — but
   read the note in the assistant panel first: a function running on
   Vercel cannot reach your laptop.

   Why this exists at all rather than calling the provider from the
   browser: an API key in front-end JavaScript is a key you have given
   away. Anyone can open the network tab, lift it, and spend your
   quota. The key lives here and never leaves the server.
   ─────────────────────────────────────────────────────────────── */

const MAX_MESSAGES = 12;      // keep the context small; this is a helpdesk, not a novel
const MAX_CHARS = 1500;       // per message, before we stop trusting the client
const TIMEOUT_MS = 25000;

/* A short, blunt brief. Longer system prompts cost tokens on every
   single turn and mostly make the model chattier, which is the
   opposite of what someone checking their invoice wants. */
function brief(ctx) {
  return [
    'You are the assistant inside the Sitehouse client dashboard.',
    'Sitehouse builds one-page websites for small businesses.',
    '',
    'Rules:',
    '- Be brief. Two or three sentences unless asked for more.',
    '- Never invent prices, dates or account facts. If it is not in the',
    '  context below, say you do not know and point them at Support.',
    '- Never promise a delivery date. The build target is 7 days from',
    '  the last piece of content, and it is a target, not a promise.',
    '- You cannot change the account, take payment or approve a site.',
    '  Tell them which page does that instead.',
    '- Plain language. No marketing voice.',
    '',
    'Their account right now:',
    JSON.stringify(ctx)
  ].join('\n');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'POST only' });
  }

  const base = process.env.AI_BASE_URL;
  const key = process.env.AI_API_KEY;
  const model = process.env.AI_MODEL;

  if (!base || !key || !model) {
    // Not an error the customer should see as a failure — the panel
    // falls back to answering account questions from local data.
    return res.status(503).json({ error: 'not_configured' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { return res.status(400).json({ error: 'bad_json' }); }
  }
  body = body || {};

  const incoming = Array.isArray(body.messages) ? body.messages : [];
  if (!incoming.length) return res.status(400).json({ error: 'no_messages' });

  // Trust nothing about shape or size: the client is a browser.
  const messages = incoming
    .slice(-MAX_MESSAGES)
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_CHARS) }));

  if (!messages.length) return res.status(400).json({ error: 'no_messages' });

  const ctx = body.context && typeof body.context === 'object' ? body.context : {};

  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), TIMEOUT_MS);

  try {
    const r = await fetch(base.replace(/\/$/, '') + '/chat/completions', {
      method: 'POST',
      signal: ac.signal,
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: [{ role: 'system', content: brief(ctx) }, ...messages],
        temperature: 0.3,
        max_tokens: 500
      })
    });

    clearTimeout(timer);

    if (!r.ok) {
      const detail = await r.text();
      console.error('ai upstream', r.status, detail.slice(0, 400));
      // 429 is the one worth naming: on a free tier it is the normal
      // failure, and "try again in a minute" is actionable.
      return res.status(r.status === 429 ? 429 : 502)
                .json({ error: r.status === 429 ? 'rate_limited' : 'upstream' });
    }

    const data = await r.json();
    const text = data && data.choices && data.choices[0] &&
                 data.choices[0].message && data.choices[0].message.content;

    if (!text) return res.status(502).json({ error: 'empty' });
    return res.status(200).json({ text: String(text).trim() });

  } catch (e) {
    clearTimeout(timer);
    const aborted = e && e.name === 'AbortError';
    console.error('ai failed', aborted ? 'timeout' : e);
    return res.status(504).json({ error: aborted ? 'timeout' : 'failed' });
  }
}
