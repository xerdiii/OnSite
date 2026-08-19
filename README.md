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
