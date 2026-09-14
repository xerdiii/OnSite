/* ───────────────────────────────────────────────────────────────
   Xovah — local dev server

     npm run dev        →  http://localhost:5174

   Two things a plain file server does not do, and the site needs both:

   1. Clean URLs. Every link on the site is extensionless — /login, not
      /index.html — so a request for /login has to fall back to
      index.html. Real hosts do this (GitHub Pages and Netlify out of
      the box, Vercel with cleanUrls). Without it every page 404s.

   2. Range requests, so <video> streams in chunks the way it will in
      production instead of pulling whole files up front.
   ─────────────────────────────────────────────────────────────── */
const http = require('http');
const fs = require('fs');
const path = require('path');

const root = path.resolve(process.argv[2] || __dirname);
const port = Number(process.argv[3] || 5174);

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
  '.webp': 'image/webp', '.ico': 'image/x-icon',
  '.mp4': 'video/mp4', '.webm': 'video/webm', '.mov': 'video/quicktime',
  '.woff2': 'font/woff2', '.woff': 'font/woff'
};

function isFile(p) {
  try { return fs.statSync(p).isFile(); } catch (e) { return false; }
}

// /            → index.html
// /login       → index.html          (this is the one that was missing)
// /login/      → login/index.html, then index.html
function resolve(rel) {
  const base = path.join(root, path.normalize(rel).replace(/^([/\\])+/, ''));
  if (!base.startsWith(root)) return null;                 // no climbing out

  if (rel === '/' || rel === '') return path.join(root, 'index.html');
  if (isFile(base)) return base;
  if (isFile(base + '.html')) return base + '.html';
  if (isFile(path.join(base, 'index.html'))) return path.join(base, 'index.html');
  return null;
}

/* Vercel-style handlers, loaded on demand and cached, so editing one
   only costs a restart rather than a rebuild. */
const apiCache = new Map();

async function runApi(rel, req, res) {
  const file = path.join(root, rel.replace(/^\//, '') + '.mjs');
  if (!fs.existsSync(file)) {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'no such endpoint' }));
    return;
  }

  let mod = apiCache.get(file);
  if (!mod) {
    mod = await import('file://' + file.replace(/\\/g, '/'));
    apiCache.set(file, mod);
  }

  const body = await new Promise((resolve) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', () => resolve(''));
  });

  /* The handlers call res.status(n).json(o) and res.setHeader(); give
     them exactly that and nothing more, so anything they rely on here
     is something Vercel also provides. */
  const shim = {
    setHeader: (k, v) => res.setHeader(k, v),
    status(code) {
      shim._code = code;
      return shim;
    },
    json(payload) {
      res.writeHead(shim._code || 200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(payload));
      return shim;
    },
    _code: 200
  };

  try {
    await mod.default({ method: req.method, headers: req.headers, body }, shim);
  } catch (e) {
    console.error('api ' + rel + ' threw', e);
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'handler threw' }));
    }
  }
}

http.createServer((req, res) => {
  const rel = decodeURIComponent(req.url.split('?')[0]);

  if (rel.startsWith('/api/')) {
    runApi(rel, req, res);
    return;
  }

  // /login/ would serve the page, but its relative links would then resolve
  // against /login/ — 'signup' becoming /login/signup. Drop the slash first.
  if (rel.length > 1 && rel.endsWith('/') && isFile(path.join(root, rel.slice(1, -1) + '.html'))) {
    const query = req.url.split('?')[1];
    res.writeHead(301, { Location: rel.slice(0, -1) + (query ? '?' + query : '') });
    res.end();
    return;
  }

  const file = resolve(rel);

  if (!file) {
    // Serve the real 404 page, the way Vercel does, so the thing we
    // test locally is the thing visitors get.
    const page = path.join(root, '404.html');
    if (fs.existsSync(page)) {
      const body = fs.readFileSync(page);
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
      res.end(body);
      return;
    }
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('404 — nothing at ' + rel);
    return;
  }

  const stat = fs.statSync(file);
  const type = TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream';
  const head = { 'Content-Type': type, 'Cache-Control': 'no-store', 'Accept-Ranges': 'bytes' };
  const range = req.headers.range;

  if (range) {
    const m = /bytes=(\d*)-(\d*)/.exec(range);
    let start = m && m[1] ? parseInt(m[1], 10) : 0;
    let end = m && m[2] ? parseInt(m[2], 10) : stat.size - 1;
    if (isNaN(start) || start >= stat.size) {
      res.writeHead(416, { 'Content-Range': 'bytes */' + stat.size }).end();
      return;
    }
    if (end >= stat.size) end = stat.size - 1;
    head['Content-Range'] = 'bytes ' + start + '-' + end + '/' + stat.size;
    head['Content-Length'] = end - start + 1;
    res.writeHead(206, head);
    fs.createReadStream(file, { start: start, end: end }).pipe(res);
    return;
  }

  head['Content-Length'] = stat.size;
  res.writeHead(200, head);
  if (req.method === 'HEAD') { res.end(); return; }
  fs.createReadStream(file).pipe(res);
}).listen(port, function () {
  console.log('Xovah — serving ' + root + ' on http://localhost:' + port);
});
