# Sitehouse — email templates

## Why these look the way they do

Email is not the web. These are built to the rules that actually apply
in Gmail, Outlook, Apple Mail and the rest:

- **Tables for layout.** Flexbox and grid are unsupported or broken in
  Outlook's Word rendering engine. Every layout here is a table.
- **Inline styles only.** Gmail strips `<style>` blocks in some
  contexts and most clients ignore external CSS entirely.
- **600px maximum.** The safe width for a desktop reading pane; below
  that it goes fluid for phones.
- **No web fonts.** Outlook and several mobile clients refuse them, and
  a font that fails to load can silently break letter-spacing — which
  would make a six-digit code unreadable. The stack is system fonts.
- **Works with images off.** Most clients block remote images until the
  reader allows them, so the brand is set as *text*, not a logo file.
  Nothing here depends on an image loading.
- **`color-scheme` declared.** Without it, Gmail and Apple Mail invert
  colours in dark mode and produce grey text on grey.
- **A preheader.** The hidden line mail apps show next to the subject.
  Left empty it fills with whatever markup comes first, which looks
  broken in a list of messages.
- **The code is selectable text**, never an image, so it can be copied
  and read out by a screen reader.

## Supabase variables

| Variable | What it is |
| --- | --- |
| `{{ .Token }}` | the 6-digit code — **this is the one that matters** |
| `{{ .ConfirmationURL }}` | one-click link, kept as a fallback |
| `{{ .Email }}` | the address being confirmed |
| `{{ .SiteURL }}` | https://sitehouse.eu |

Without `{{ .Token }}` in the template, Supabase only ever sends a link
and the six-digit box on the site can never be filled in.

## Files

### Supabase templates

Paste into **Authentication → Emails → Templates**. The subject line is
the first HTML comment in each file.

| File | Supabase template |
| --- | --- |
| `confirm-signup.html` | Confirm signup |
| `magic-link.html` | Magic Link |
| `reset-password.html` | Reset Password |
| `change-email.html` | Change Email Address |
| `invite-user.html` | Invite user |

### Ours to send — Supabase has no template for these

Both are security notices that fire *after* a change has already
succeeded. Supabase does not send them, so nothing warns the account
owner unless we do.

| File | Send it when | Send it to |
| --- | --- | --- |
| `password-changed.html` | `updateUser({password})` succeeds | the account address |
| `email-changed.html` | an email change is confirmed | **both the old and the new address** |

Sending the email-change notice only to the new address is the classic
hole: someone who takes an account over moves it to their own address
and the real owner's inbox stays silent.

Server-side placeholders in these two: `{{EMAIL}}`, `{{OLD_EMAIL}}`,
`{{WHEN}}`, `{{DEVICE}}`.

**TODO — Resend.** Create `/api/notify.mjs` (copy `/api/signup.mjs`,
which already has the Resend call, the HTML escaping and the honeypot),
inline the template, and call it from `assets/supabase-auth.js` inside
`setPassword()`'s `.then()`.
