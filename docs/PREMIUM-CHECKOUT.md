# Premium on-site checkout (`/premium/join`)

A 3-step checkout on the site: email → name → payment (Stripe Payment Element).
The `/premium` join buttons link to `/premium/join?plan=monthly|yearly`.

## Env

| Var | Where | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_STRIPE_PREMIUM_PUBLISHABLE_KEY` | Vercel (Preview + Production) | **New.** `pk_test_…` / `pk_live_…` from the **Premium** Stripe account (the same account as `STRIPE_SECRET_KEY`). Must match its test/live mode. Redeploy after adding. `STRIPE_PREMIUM_PUBLISHABLE_KEY` also works. |
| `STRIPE_SECRET_KEY`, `STRIPE_PREMIUM_PRICE_MONTHLY`, `STRIPE_PREMIUM_PRICE_YEARLY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PREMIUM_TRIAL_DAYS` | existing | unchanged |

`STRIPE_PUBLISHABLE_KEY` / `NUITEE_STRIPE_PUBLISHABLE_KEY` belong to the flights (Nuitee) account and are never used here.

Without the Premium publishable key (or with a mode mismatch) the site falls back to the phase-1 hosted Stripe Checkout (sign-in first). If Stripe.js can't load on step 3, a "Continue on Stripe Checkout" button appears.

Apple Pay only shows once the site domain is registered under Stripe → Settings → Payment method domains for the Premium account.

## How it works

1. Step 3 renders the Payment Element in deferred-intent mode (no Stripe objects yet).
2. On Pay: `POST /api/premium/subscribe` validates email/name server-side, maps the plan to the env price id, creates or reuses a Stripe Customer, and creates a subscription with `payment_behavior=default_incomplete`, `save_default_payment_method=on_subscription`, and the trial from env (`trial_settings.end_behavior.missing_payment_method=cancel`). Returns the invoice PaymentIntent secret (no trial) or the pending SetupIntent secret (trial).
3. The client runs `confirmPayment` / `confirmSetup` (`redirect: if_required`, 3DS in Stripe's modal; redirect methods come back to `/premium/join?sub=…&redirect_status=…`).
4. `POST /api/premium/subscribe/confirm` re-reads the subscription from Stripe and writes membership right away. The webhook repeats the sync.

Unfinished attempts are reused when the price matches and canceled otherwise, so going back and forth doesn't pile up subscriptions. Existing active/trialing members get "You're already a member".

A trialing subscription that still has a pending SetupIntent and no default payment method is stored as `incomplete`, not a membership.

## Linking purchases to accounts

- Signed in: `userId` is in the subscription metadata (as with hosted Checkout).
- Signed out: the buyer email is in metadata. The webhook resolves the owner as metadata `userId` → the reader holding that Stripe customer → a reader account with that email (`getUserByEmail`) → otherwise `premiumPending/{sha256(email)}`.
- Reader docs are keyed per provider (Google/X ids, `cred_<hash>` for email/password), so a pending record is not pre-created as a user doc. The first time a signed-in reader with that session email hits `/api/premium/status`, `/account`, or a members-only story, `getReaderMembership` moves the pending membership onto `users/{id}` and tags the Stripe subscription/customer with `userId`.

## Test (Stripe test mode)

1. Add `NEXT_PUBLIC_STRIPE_PREMIUM_PUBLISHABLE_KEY=pk_test_…` in Vercel and redeploy.
2. Signed out, open `/premium`, tap the join button → `/premium/join?plan=yearly`.
3. Email + confirm, name, then card `4242 4242 4242 4242`, any future date, any CVC. 3DS: `4000 0027 6000 3184`. Decline: `4000 0000 0000 0002`.
4. See "Welcome to Premium". Sign in (or create an account) with the same email → Account shows Premium.
5. Signed in: step 1 is skipped (Step 2 of 3). Try again as a member → "You're already a member".
