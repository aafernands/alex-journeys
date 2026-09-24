# Google OAuth branding verification — Alex Journeys

Checklist for Alex after this site deploy. The OAuth consent screen must match the public site.

## URLs to put in Google Cloud Console

| Consent screen field | Value |
| --- | --- |
| **Application name** | `Alex Journeys` (exact) |
| **Application home page** | `https://www.alexjourneys.com` (**not** `/cms`) |
| **Application privacy policy** | `https://www.alexjourneys.com/privacy` |
| **Application terms of service** (optional) | `https://www.alexjourneys.com/terms` |
| **Authorized domains** | `alexjourneys.com` |
| App purpose page (linked from site) | `https://www.alexjourneys.com/app` |

OAuth redirect URI (already needed for Auth.js):

`https://www.alexjourneys.com/api/auth/callback/google`

## Domain verification (manual — site cannot finish this alone)

Google’s “home page URL not registered to you” failure is **Search Console / domain ownership**, not a code bug.

1. Open [Google Search Console](https://search.google.com/search-console).
2. Verify **both**:
   - `alexjourneys.com` (Domain property preferred), **and**
   - `https://www.alexjourneys.com` (URL-prefix property if you use one).
3. Use the DNS TXT method (or HTML tag) Google shows. DNS must be at the registrar / DNS host that serves the domain (often WordPress.com DNS or the registrar).
4. Wait until Search Console shows **Verified**.
5. In Google Cloud Console → OAuth consent screen, confirm authorized domain `alexjourneys.com` is listed, then **resubmit branding verification**.

## Site checks already done in code

- Privacy policy at `/privacy` documents Google Sign-In scopes (`openid`, `email`, `profile`), CMS vs reader use, retention, and contact.
- Public app-purpose page at `/app` states app name **Alex Journeys** and that Sign-In is for owner CMS + optional reader saves only.
- Homepage shows a crawlable “About this site & Google Sign-In” note and the **Alex Journeys** wordmark in the header (logo PNG may still show the old “alex journly” graphic; alt text and visible text say Alex Journeys).
- Root `/` is public (no auth middleware on `/`). Do **not** set the OAuth “Application home page” to `/cms`.

## After deploy

1. Confirm live:
   - https://www.alexjourneys.com → 200, no login wall
   - https://www.alexjourneys.com/privacy → substantial privacy + OAuth section
   - https://www.alexjourneys.com/policies → legal hub (privacy / terms / affiliate); not in primary nav
   - https://www.alexjourneys.com/app → app purpose (kept for branding; not promoted in marketing nav)
2. Update consent screen fields exactly as in the table above.
3. Finish Search Console domain verification for apex + www.
4. Resubmit branding verification in Google Cloud Console.
