# Onsite

Static marketing site plus a demo client dashboard and admin area.

## Build

Tailwind is compiled, not loaded from a CDN:

```
npm install
npm run css        # one-off build
npm run css:watch  # rebuild while editing
```

`assets/tailwind.css` is the generated file — edit `tailwind.config.js` or the
markup, never that file directly. Colours resolve through the custom properties
in `assets/theme.css`, which is what makes light and dark work from one set of
tokens.

## Not wired up yet

Payments and sign-in are simulated: `assets/demo.js` holds the mock store, the
verification code is generated in the browser, and no card is ever taken. The
placeholders in the legal pages ([LEGAL BUSINESS NAME] and friends) need real
details before this takes customers.

## Design notes

One accent colour — the green from `favicon.svg` — carries the buttons, links,
figures and the drawn underline in the headline. Everything else is paper, ink
and a hairline. Three faces: Instrument Serif for headlines, Inter for anything
that has to be read or clicked, IBM Plex Mono for eyebrows and tags.

The website previews in the hero and the work section (`assets/previews.css`)
are drawn in HTML, not screenshots. Each frame carries its own three colours on
the element (`--s-bg` / `--s-ink` / `--s-acc`) and sizes its own text from the
frame width, so one markup block works at any size and the mock palettes never
leak into the site's own. The businesses inside them are invented, and the page
says so — there are no client sites to show yet.
