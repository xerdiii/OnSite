/* ───────────────────────────────────────────────────────────────
   Paddle — the one file you edit

   Nothing here is secret. The client-side token is designed to be
   public: it can only open a checkout, never read your account or move
   money. The API key and the webhook secret are the secrets, and those
   live in Vercel's environment variables where the browser never sees
   them. Do not put either in this file.

   ── Setup ──────────────────────────────────────────────────────
   1. paddle.com → sign up → complete seller verification.
      Paddle reviews every seller before going live. This takes a few
      days and cannot be skipped, so start it early.

   2. Paddle → Catalog → Products. Create three products and give each
      a ONE-TIME price equal to the 25% deposit:

        Custom Website   — deposit  €12.50   (of €50)
        Full Website     — deposit  €50.00   (of €200)
        Complete Package — deposit  €125.00  (of €500)

      The remaining 75% is invoiced on approval, from Paddle → Invoices.

   3. Copy each price's id (pri_xxx) into PRICES below.

   4. Paddle → Developer Tools → Authentication → copy the
      "Client-side token" (starts test_ or live_) into TOKEN below.

   5. Set ENVIRONMENT to 'sandbox' while testing, 'production' when live.

   6. In Vercel → Settings → Environment Variables, set the secrets:
        PADDLE_WEBHOOK_SECRET   from Paddle → Developer Tools → Notifications
        RESEND_API_KEY          already needed by the contact form
        FROM_EMAIL              a domain verified with Resend

   Until TOKEN and PRICES are filled in, checkout stays switched off and
   every "Get your website" button keeps doing what it does today — it
   sends people to start.html. The site does not break while you wait
   for Paddle to approve you.
   ─────────────────────────────────────────────────────────────── */
window.PADDLE_CONFIG = {

  // 'sandbox' while testing, 'production' when you go live
  ENVIRONMENT: 'production',

  // Paddle → Developer Tools → Authentication → Client-side token
  TOKEN: 'live_4b56c524006d6c4490c8c9cf9a8',

  // Paddle → Catalog → Products → each price's id
  PRICES: {
    custom:   'pri_01m12rht9b46eng5thwwts8k1g',   // €12.50 deposit of €50
    full:     'pri_01m12rhthrdwwkcnwhsrcghqg9',   // €50.00 deposit of €200
    complete: 'pri_01m12rhtsd8a51dqz63tsyn8zq'    // €125.00 deposit of €500
  },

  /* What each package actually costs, in whole cents, so the checkout
     and the confirmation email agree with the pricing page. Change
     these together with assets/demo.js and the price cards. */
  TOTALS: {
    custom:   5000,
    full:     20000,
    complete: 50000
  }
};
