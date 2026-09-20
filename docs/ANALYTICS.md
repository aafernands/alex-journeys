# Google Analytics 4 & Search Console

Fernandes Journeys loads **GA4 via gtag.js** only when a measurement ID is configured at build time. Unset or empty env vars inject **no** analytics scripts.

The privacy policy already describes anonymous/aggregated analytics *when enabled*.

## Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | For GA4 | GA4 measurement ID (`G-XXXXXXXX`) |
| `NEXT_PUBLIC_GA_ID` | Alias | Same as above if the primary name is unset |
| `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` | Optional | Search Console HTML-tag verification token |

These are **public** client values (they appear in the page HTML). They are not API secrets, but do **not** commit them in git. `.env*` is gitignored — use Vercel env vars and local `.env.local` only.

`NEXT_PUBLIC_GA_MEASUREMENT_ID` wins if both GA vars are set. Values that are not a GA4 id (`G-` + letters/digits) are ignored so a typo cannot inject a script.

## Create a GA4 property and get `G-XXXXXXXX`

1. Open [Google Analytics](https://analytics.google.com/) and sign in with the site owner Google account.
2. **Admin** (gear) → **Create** → **Property** (or use an existing property).
3. Name it (for example `Fernandes Journeys`), set timezone and currency, continue.
4. Skip optional business details if you want.
5. **Data collection** → **Web** → enter `https://www.fernandesjourneys.com`.
6. Copy the **Measurement ID** (`G-` followed by letters/digits).
7. In the property, confirm **Admin → Data streams → Web → Enhanced measurement** is on, including **Page changes based on browser history events**, so App Router client navigations count as pageviews.

## Add the ID on Vercel Production

1. Vercel → project **fernandes-journeys** → **Settings → Environment Variables**.
2. Add `NEXT_PUBLIC_GA_MEASUREMENT_ID` = `G-XXXXXXXX`.
3. Scope it to **Production** (and Preview only if you want test traffic in the same property — usually skip Preview).
4. **Redeploy** Production (env vars are inlined at **build** time; saving the variable alone is not enough).  
   Deployments → latest Production → **Redeploy**, or push an empty commit / wait for the next `main` deploy.

Local testing:

```bash
# .env.local (gitignored)
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXX
```

Restart `npm run dev` after changing it.

## What the site injects

When the ID is set, the root layout loads `next/script` with `strategy="afterInteractive"`:

1. `https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXX`
2. Inline `dataLayer` + `gtag('config', 'G-XXXXXXXX')`

When unset, that component returns `null` — no gtag URL, no `dataLayer` bootstrap.

`/cms` shares the root layout, so admin pageviews are included. Exclude `/cms` with a [GA4 internal-traffic or page-path filter](https://support.google.com/analytics/answer/10108813) if you do not want them in reports.

## Search Console HTML-tag verification

1. Open [Google Search Console](https://search.google.com/search-console) → add the `www.fernandesjourneys.com` (or domain) property.
2. Choose **HTML tag** verification (not DNS, not a file upload).
3. Google shows a meta tag like:

   ```html
   <meta name="google-site-verification" content="TOKEN_HERE" />
   ```

4. Copy **only** the `content` token (`TOKEN_HERE`), not the whole tag.
5. Set `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` on Vercel (Production) and **redeploy**.
6. Next.js emits `metadata.verification.google`, which renders that meta tag on every page.
7. In Search Console, click **Verify**.

Leave the variable unset to omit the meta tag.

DNS or HTML-file verification methods do not use this variable.

## Privacy

Public browsing copy already says analytics run only when enabled. Do not add measurement IDs to the repo or to screenshots of `.env` files.
