# Transactional emails

All site email goes through **Resend** (`src/lib/email.ts`, plain `fetch` to
`https://api.resend.com/emails`). This matches the Nurse Intensive app, which
also sends through Resend's REST API with the same kind of inline-styled HTML
templates, a "Support" sender and a reply-to of the support inbox.

Templates live in `src/lib/emails/` and every one ships HTML **and** a
plain-text version:

- `layout.ts`: branded shell (orange `#d97706` header band with "Alex Journeys"
  and a status line, "Hi {first name}", optional details table, one button
  (`#b45309` on hover), a note, "The Alex Journeys Team", footer with the support
  address and © line). Cream `#f6f0e6` background, ink `#2a241c` text.
- `templates.ts`: one function per email.
- `samples.ts`: sample data for previews.

## Previews

- CMS: **/cms/emails** (CMS admins only) shows every template with sample
  data, with "Open" (raw HTML) and "Plain text" links, plus the current From
  and Reply-To.
- API: `GET /api/cms/emails/preview?id=<id>&format=html|text` (CMS admins only).
- Script (no server needed):
  `node --experimental-strip-types --import ./scripts/alias-register.mjs scripts/render-emails.mjs ./email-previews`

## What we send and when

| Email | Template id | Fires when |
| --- | --- | --- |
| Confirm your email (6-digit code + button) | `verify-email` | Email/password sign-up, or "Send a new code" on `/verify-email` or `/account` |
| Finish adding a password | `add-password` | Someone signs up with email + password for an email that already has a Google/X account. The password turns on only after the owner taps the link. |
| Password reset | `password-reset` | `/forgot-password`, or **Send reset link** on CMS → Users |
| Confirm new email / heads-up to old email | `email-change-confirm`, `email-change-notice` | Account → Profile settings → change email |
| Welcome to Premium / free trial started | `premium-welcome`, `premium-trial-started` | Webhook: first time a new subscription (created in the last 3 days) is active or trialing (`checkout.session.completed`, `customer.subscription.created/updated`). Trial version shows trial end date and first charge. |
| Trial ending soon | `trial-ending` | Webhook: `customer.subscription.trial_will_end` (Stripe sends it 3 days before), skipped if the trial is already set to cancel |
| Subscription renewed | `subscription-renewed` | Webhook: `invoice.paid` with `billing_reason = subscription_cycle` and an amount above 0 (includes the first charge after a trial) |
| Payment failed | `payment-failed` | Webhook: `invoice.payment_failed` (not the very first checkout payment, which the checkout page already shows). Button goes to Account → Membership, where "Manage membership" opens the Stripe portal. |
| Membership canceled (access until …) | `subscription-canceled` | Webhook: `customer.subscription.updated` when renewal is turned off (`cancel_at_period_end` / `cancel_at` changed) |
| Support: message received / reply / resolved / inbox alert | `ticket-received`, `ticket-reply`, `ticket-closed`, `ticket-staff-alert` | Help & Contact form and CMS → Support. See [SUPPORT.md](./SUPPORT.md). |
| Membership ended | `subscription-ended` | Webhook: `customer.subscription.deleted`, only if the "canceled" email was not already sent for that subscription |

### No double sends

Each Premium email has a key (`welcome:{sub}`, `trial-ending:{sub}:{trialEnd}`,
`renewed:{invoice}`, `payment-failed:{invoice}`, `cancel:{sub}`). Before sending,
the webhook creates `emailSends/{sha256(key)}` in Firestore (with the Stripe
event id and type). If the doc already exists the email is skipped, so Stripe
retries and repeated subscription updates never send twice. If Resend rejects
the send, the doc is removed so the next retry can try again. Email problems
never fail the webhook.

In the Stripe dashboard, the webhook endpoint must subscribe to these events:
`checkout.session.completed`, `customer.subscription.created`,
`customer.subscription.updated`, `customer.subscription.deleted`,
`customer.subscription.trial_will_end`, `invoice.paid`,
`invoice.payment_failed` (the last two/three may be new for this endpoint).

## Email verification

Why: a guest Premium purchase waits in `premiumPending/{sha256(email)}` for
whoever signs in with that email. Without verification anyone could register
the buyer's email with a password and claim it.

- New email/password accounts start with `emailVerified: false`. After sign-up
  the reader lands on `/verify-email` (skippable) and gets a 6-digit code and a
  button link, valid 30 minutes.
- Counts as verified: code or link confirmed; Google sign-in with the same
  email; a used password reset link; a confirmed email change. Older Google or
  GitHub profiles without the field count as verified.
- Existing email/password accounts (created before this change) are
  unverified. `/account` shows a "Confirm your email" panel with the code form
  and "Send a new code" (and says a membership is waiting when one is).
- Limits: one email per minute and five per hour per account (stored on
  `emailVerifications/{userId}`), 10 sends per hour per IP, 5 wrong codes then
  a new code is needed, 15 confirm attempts per 10 minutes per IP.
- Gates: claiming `premiumPending`, and the webhook's email match
  (`resolveMembershipTarget`), only go to accounts that verified the email.
  Memberships bought while signed in (metadata `userId`) are unaffected.
- Signing up with a password for an email that already has a Google account no
  longer attaches the password immediately: it waits as `pendingPasswordHash`
  until the owner taps the emailed link.

Firestore collections added: `emailVerifications/{userId}`,
`emailSends/{hash}`. Server-only (Admin SDK); no client rules needed.

## Environment variables

| Variable | Needed | Example / default |
| --- | --- | --- |
| `RESEND_API_KEY` | Yes, to send anything. Missing = emails are logged and skipped, nothing crashes (forgot-password shows "not available"). | `re_…` (already used for password reset + inbound) |
| `EMAIL_FROM` | Yes for production | `Alex Journeys Support <support@alexjourneys.com>`. Default `Alex Journeys <onboarding@resend.dev>` only delivers to the Resend account owner. |
| `EMAIL_REPLY_TO` | Optional | Defaults to `SUPPORT_EMAIL` |
| `SUPPORT_EMAIL` | Optional | `support@alexjourneys.com` (shown in every footer) |
| `SUPPORT_INBOUND_EMAIL`, `SUPPORT_NOTIFY_EMAIL`, `SUPPORT_REPLY_NAME` | Optional | Support tickets, see [SUPPORT.md](./SUPPORT.md) |
| `AUTH_URL` | Already set | Base for links in emails (`https://www.alexjourneys.com`) |
| `STRIPE_WEBHOOK_SECRET`, `STRIPE_SECRET_KEY`, price ids | Already set | Premium emails come from the existing webhook |

## DNS for alexjourneys.com (Resend domain verification)

1. Resend dashboard → **Domains** → **Add domain** → `alexjourneys.com`
   (region: US East is fine). The same Resend account used for Nurse Intensive
   works; a single account can verify several domains, and one API key can
   send from all of them (or create a new key limited to this domain).
2. Add the records Resend shows at the DNS host for alexjourneys.com. Typically:
   - **DKIM**: TXT `resend._domainkey` → `p=MIGfMA0…` (value from Resend)
   - **SPF** (for the bounce subdomain): MX `send` → `feedback-smtp.us-east-1.amazonses.com` (priority 10) and TXT `send` → `v=spf1 include:amazonses.com ~all`
   - **DMARC** (recommended): TXT `_dmarc` → `v=DMARC1; p=none; rua=mailto:support@alexjourneys.com`
   These live on subdomains, so they do not clash with existing root MX/SPF
   records (e.g. Google Workspace) or the inbound trip-forwarding records in
   [TRIPS-INBOUND.md](./TRIPS-INBOUND.md).
3. Click **Verify** in Resend and wait for all records to show Verified.
4. In Vercel (Production, and Preview if wanted) set `EMAIL_FROM`,
   optionally `SUPPORT_EMAIL` / `EMAIL_REPLY_TO`, and redeploy.
5. Make sure `support@alexjourneys.com` is a real inbox or forward, since
   replies go there.
6. Stripe → Developers → Webhooks → the Alex Journeys endpoint → add
   `customer.subscription.trial_will_end` and `invoice.paid` if missing.

## Testing

- `npm test` includes `scripts/emails.test.mjs` (templates, verification rules,
  webhook email planning, send/skip behavior) and
  `scripts/email-verification-gate.test.mjs` (pending claim needs a verified
  email).
- Stripe test mode: `stripe trigger customer.subscription.trial_will_end`,
  `stripe trigger invoice.payment_failed`, or use a test clock to advance a
  trial and a renewal.
