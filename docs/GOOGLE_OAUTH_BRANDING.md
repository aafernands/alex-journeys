# Google OAuth branding verification — Fernandes Journeys

Checklist for Alex after this site deploy. The OAuth consent screen must match the public site.

## URLs to put in Google Cloud Console

| Consent screen field | Value |
| --- | --- |
| **Application name** | `Fernandes Journeys` (exact) |
| **Application home page** | `https://www.fernandesjourneys.com` (**not** `/cms`) |
| **Application privacy policy** | `https://www.fernandesjourneys.com/policies` |
| **Application terms of service** (optional) | `https://www.fernandesjourneys.com/policies#terms` |
| **Authorized domains** | `fernandesjourneys.com` |
| App purpose page (linked from site) | `https://www.fernandesjourneys.com/app` |

OAuth redirect URI (already needed for Auth.js):

`https://www.fernandesjourneys.com/api/auth/callback/google`

## Domain verification (manual — site cannot finish this alone)

Google’s “home page URL not registered to you” failure is **Search Console / domain ownership**, not a code bug.

1. Open [Google Search Console](https://search.google.com/search-console).
2. Verify **both**:
   - `fernandesjourneys.com` (Domain property preferred), **and**
   - `https://www.fernandesjourneys.com` (URL-prefix property if you use one).
3. Use the DNS TXT method (or HTML tag) Google shows. DNS must be at the registrar / DNS host that serves the domain (often WordPress.com DNS or the registrar).
4. Wait until Search Console shows **Verified**.
5. In Google Cloud Console → OAuth consent screen, confirm authorized domain `fernandesjourneys.com` is listed, then **resubmit branding verification**.

## Site checks already done in code

- Privacy policy at `/policies` documents Google Sign-In scopes (`openid`, `email`, `profile`), CMS vs reader use, retention, and contact.
- Public app-purpose page at `/app` states app name **Fernandes Journeys** and that Sign-In is for owner CMS + optional reader saves only.
- Homepage shows a crawlable “About this site & Google Sign-In” note and the **Fernandes Journeys** wordmark in the header (logo PNG may still show the old “alex journly” graphic; alt text and visible text say Fernandes Journeys).
- Root `/` is public (no auth middleware on `/`). Do **not** set the OAuth “Application home page” to `/cms`.

## After deploy

1. Confirm live:
   - https://www.fernandesjourneys.com → 200, no login wall
   - https://www.fernandesjourneys.com/policies → substantial privacy + OAuth section
   - https://www.fernandesjourneys.com/app → app purpose
2. Update consent screen fields exactly as in the table above.
3. Finish Search Console domain verification for apex + www.
4. Resubmit branding verification in Google Cloud Console.
