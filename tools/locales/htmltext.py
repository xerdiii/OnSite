"""Walk the text of a hand-written HTML page the way assets/i18n.js does.

The runtime translator keys every visible text node on its whitespace-
collapsed English text, skipping <script>, <style>, <textarea>, anything
inside [data-no-i18n] and the price spans (.cur). The build does the same
at build time, so a page served as /de/preise already says German in its
HTML and search engines read it without running any JavaScript.

This is a small tokenizer rather than a full parser: the site's markup is
written by hand and well-formed, and a tokenizer keeps every byte that is
not translated exactly as it was.
"""
import html
import re

TOKEN = re.compile(
    r'<!--.*?-->'
    r'|<(script|style|textarea)\b[^>]*>.*?</\1\s*>'
    r'|<!?[A-Za-z/][^>]*>',
    re.S | re.I,
)
VOID = {'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link',
        'meta', 'source', 'track', 'wbr'}
ATTRS = ('placeholder', 'aria-label', 'title', 'alt')
ATTR_RE = re.compile(r'(\s)(placeholder|aria-label|title|alt)="([^"]*)"', re.I)


def collapse(t):
    return re.sub(r'\s+', ' ', t).strip()


def esc_text(t):
    return t.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')


def esc_attr(t):
    return esc_text(t).replace('"', '&quot;')


def _skip_ctx(stack):
    for tag, attrs in stack:
        if 'data-no-i18n' in attrs:
            return True
    return bool(stack) and re.search(r'class="[^"]*\bcur\b', stack[-1][1] or '') is not None


def walk(src, body_only=True):
    """Yield ('text', start, end, raw) and ('tag', start, end, raw) pieces."""
    start = 0
    if body_only:
        m = re.search(r'<body\b[^>]*>', src, re.I)
        start = m.end() if m else 0
    pos = start
    stack = []
    out = [('head', 0, start, src[:start])]
    for m in TOKEN.finditer(src, start):
        if m.start() > pos:
            out.append(('text', pos, m.start(), src[pos:m.start()], _skip_ctx(stack)))
        raw = m.group(0)
        kind = 'tag'
        tm = re.match(r'<(/?)([A-Za-z][\w-]*)', raw)
        if tm and not raw.startswith('<!'):
            closing, name = tm.group(1), tm.group(2).lower()
            if m.group(1):
                kind = 'raw'
            elif closing:
                for i in range(len(stack) - 1, -1, -1):
                    if stack[i][0] == name:
                        del stack[i:]
                        break
            elif name not in VOID and not raw.endswith('/>'):
                stack.append((name, raw))
        out.append((kind, m.start(), m.end(), raw, _skip_ctx(stack)))
        pos = m.end()
    if pos < len(src):
        out.append(('text', pos, len(src), src[pos:], False))
    return out


def texts(src):
    """Every translatable English string on the page (text nodes and attributes)."""
    found = []
    for piece in walk(src):
        kind, raw = piece[0], piece[3]
        if kind == 'text' and not piece[4]:
            key = collapse(html.unescape(raw))
            if key and re.search(r'[A-Za-z]', key):
                found.append(key)
        elif kind == 'tag' and not piece[4]:
            for _, attr, val in ATTR_RE.findall(raw):
                key = collapse(html.unescape(val))
                if key and re.search(r'[A-Za-z]', key):
                    found.append(key)
    return found


def translate(src, lookup):
    """Rewrite the body, replacing every string lookup() knows. Returns (html, missing)."""
    parts, missing = [], []
    for piece in walk(src):
        kind, raw = piece[0], piece[3]
        if kind == 'head':
            parts.append(raw)
        elif kind == 'text' and not piece[4]:
            key = collapse(html.unescape(raw))
            if not key or not re.search(r'[A-Za-z]', key):
                parts.append(raw)
                continue
            hit = lookup(key)
            if hit is None:
                missing.append(key)
                parts.append(raw)
            else:
                lead = re.match(r'^\s*', raw).group(0)
                tail = re.search(r'\s*$', raw).group(0)
                parts.append(lead + esc_text(hit) + tail)
        elif kind == 'tag' and not piece[4]:
            def sub(m):
                key = collapse(html.unescape(m.group(3)))
                if not key or not re.search(r'[A-Za-z]', key):
                    return m.group(0)
                hit = lookup(key)
                if hit is None:
                    missing.append(key)
                    return m.group(0)
                return '%s%s="%s"' % (m.group(1), m.group(2), esc_attr(hit))
            parts.append(ATTR_RE.sub(sub, raw))
        else:
            parts.append(raw)
    return ''.join(parts), missing
