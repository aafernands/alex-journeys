# Cloudflare Turnstile (spam protection)

Public forms use [Cloudflare Turnstile](https://developers.cloudflare.com/turnstile/) (managed widget — green check). The client shows the widget when the site key is set; the server verifies tokens when the secret is set.

## Behavior

| Env | Effect |
| --- | --- |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` set | Widget renders above submit; client blocks submit without a token |
| `TURNSTILE_SECRET_KEY` set | API routes require a successful `siteverify` |
| Secret **not** set | Server skips verification (local/dev not blocked) |
| Site key **not** set | No widget; production forms still work without Turnstile |

Prefer setting **both** on Vercel Production (and Preview if you test there).

## Create a widget

1. Open [Cloudflare Dashboard → Turnstile](https://dash.cloudflare.com/?to=/:account/turnstile).
2. **Add widget** → mode **Managed** (default green check).
3. Domains (hostname allowlist):
   - `fernandesjourneys.com`
   - `www.fernandesjourneys.com`
   - `*.vercel.app` (or your exact Vercel project host)
   - `localhost` (for local testing)
4. Copy the **Site Key** and **Secret Key**.

## Vercel env vars

Exact names (add under Project → Settings → Environment Variables, then **redeploy**):

| Variable | Visibility | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Public (client) | Widget site key |
| `TURNSTILE_SECRET_KEY` | Server only | `siteverify` secret |

Local: same keys in `.env.local` (gitignored). Restart `npm run dev` after changes.

## Forms covered

- Newsletter (`NewsletterForm` + `POST /api/newsletter`)
- Contact (`ContactForm` — client gate before mailto)
- Forgot password (`ForgotPasswordForm` + `POST /api/auth/forgot-password`)
- Create account (`ReaderLoginForm` signup + `POST /api/auth/register`)

**Not** on CMS admin forms or authenticated profile / change-password.

## Token field

APIs expect JSON field `turnstileToken` (string). Verification hits `https://challenges.cloudflare.com/turnstile/v0/siteverify`.
