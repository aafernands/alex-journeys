# Alex Journeys rebrand audit

Audit date: 2026-09-23. Scope: tracked repository text plus brand image assets. Existing site layout, classes, SVG geometry, and active logos are preserved. No infrastructure was migrated, and nothing was committed, merged, or pushed.

## Verification

- npm run build: passed.
- npm test: 203 passed, 0 failed. Updated obsolete domain expectations in auth, Pinterest, and Viator tests.
- npm run lint: failed with 34 errors and 22 warnings (React hooks/compiler rules and unused declarations). All 35 changed code/test files were linted against their HEAD versions: diagnostics are identical (4 existing errors and 7 existing warnings in changed files). The remaining findings are in unchanged files. No unrelated behavior changes were made to suppress these.
- Production HTTP/HTML checks: homepage, login, forgot/reset password, media kit, privacy, terms, policies, contact, search, flights, and stays all returned 200 with no old visible brand text. Homepage includes ALEX JOURNEYS, AIR MAIL, AJ, JOURNAL.
- Browser automation could not initialize (tool sandbox metadata error); no browser screenshot/layout verification was completed. Assets were visually inspected; newsletter classes and geometry were preserved.
- git diff --check: passed.

## Already current

Header/mobile navigation, footer, newsletter consent, legal pages, media kit, central metadata/JSON-LD, contact email, and social profiles already use Alex Journeys / alexjourneys.com / @alexjrnys. No old public social handle was found. Alex Fernandes is the author's name and remains unchanged.

## Files changed

- `README.md`
- `package.json`
- `public/brand/_archive/logo-alex-journly-white.png`
- `public/brand/_archive/logo-alex-journly.png`
- `public/brand/logo-alex-journly-white.png`
- `public/brand/logo-alex-journly.png`
- `public/brand/logo-fernandes-journeys-white.png`
- `public/brand/logo-fernandes-journeys-white.svg`
- `public/brand/logo-fernandes-journeys.png`
- `public/brand/logo-fernandes-journeys.svg`
- `scripts/auth-config.test.mjs`
- `scripts/pinterest.test.mjs`
- `scripts/twitter-oauth.test.mjs`
- `scripts/viator.test.mjs`
- `src/app/[slug]/page.tsx`
- `src/app/account/confirm-email/page.tsx`
- `src/app/account/page.tsx`
- `src/app/api/auth/change-email/request/route.ts`
- `src/app/api/auth/forgot-password/route.ts`
- `src/app/api/cms/users/[id]/send-reset/route.ts`
- `src/app/cms/help/page.tsx`
- `src/app/flights/book/page.tsx`
- `src/app/flights/confirmation/page.tsx`
- `src/app/flights/page.tsx`
- `src/app/login/page.tsx`
- `src/app/reset-password/page.tsx`
- `src/app/search/page.tsx`
- `src/app/stays/[hotelId]/page.tsx`
- `src/app/stays/page.tsx`
- `src/components/ReaderLoginForm.tsx`
- `src/components/ResetPasswordForm.tsx`
- `src/components/account/ProfileAvatar.tsx`
- `src/components/blog/BlogPostView.tsx`
- `src/components/blog/PostExperienceAffiliateWidget.tsx`
- `src/components/cms/CmsShell.tsx`
- `src/components/cms/LoginForm.tsx`
- `src/components/cms/PostForm.tsx`
- `src/components/destinations/CurrencyQuickFact.tsx`
- `src/components/newsletter/PostmarkWatermark.tsx`
- `src/components/pages/ContactForm.tsx`
- `src/components/stays/StayHotelOverview.tsx`
- `src/components/trip-planner/ItineraryHub.tsx`
- `src/content/posts/top-10-must-visit-european-cities.json`
- `src/content/posts/top-adventure-travel-destinations-for-2025.json`
- `src/content/posts/travel-mistake-never-again.json`
- `src/lib/auth-error-redirect.ts`
- `src/lib/reader-login-errors.ts`
- `src/lib/search-index.ts`
- `docs/REBRAND-AUDIT.md` (this report)

## Image assets

Active logo-on-light.png and logo-on-dark.png were visually verified as ALEX JOURNEYS. The favicon is an unlettered globe. Six publicly served legacy PNG paths (including _archive) now contain copies of those existing current logos; both legacy SVGs now say Alex Journeys. Legacy filenames remain so saved references do not break. The newsletter watermark is inline SVG, not a bitmap.

- `public/brand/_archive/logo-alex-journly-white.png`: updated artwork/text.
- `public/brand/_archive/logo-alex-journly.png`: updated artwork/text.
- `public/brand/logo-alex-journly-white.png`: updated artwork/text.
- `public/brand/logo-alex-journly.png`: updated artwork/text.
- `public/brand/logo-fernandes-journeys-white.png`: updated artwork/text.
- `public/brand/logo-fernandes-journeys-white.svg`: updated artwork/text.
- `public/brand/logo-fernandes-journeys.png`: updated artwork/text.
- `public/brand/logo-fernandes-journeys.svg`: updated artwork/text.

## Every original text match

Line numbers refer to the original files. Repeated matches on one line are listed separately. ?Updated? includes public copy, links, documentation overview, and test expectations; ?Retained? gives the reason.

| File:line | Original match and context | Disposition |
| --- | --- | --- |
| `README.md:1` | # Fernandes Journeys — Travel Blog | Updated - current Alex Journeys branding, URL, or test expectation. |
| `README.md:3` | tinations from past trips, trip notes, and photos from the road. User-facing brand **Fernandes Journeys** (logo PNG may still show the old alex journly wordmark until replaced). | Updated - current Alex Journeys branding, URL, or test expectation. |
| `README.md:3` | the road. User-facing brand **Fernandes Journeys** (logo PNG may still show the old alex journly wordmark until replaced). | Updated - current Alex Journeys branding, URL, or test expectation. |
| `README.md:5` | **Live:** [fernandes-journeys.vercel.app](https://fernandes-journeys.vercel.app) | Updated - current Alex Journeys branding, URL, or test expectation. |
| `README.md:5` | **Live:** [fernandes-journeys.vercel.app](https://fernandes-journeys.vercel.app) | Updated - current Alex Journeys branding, URL, or test expectation. |
| `README.md:6` | **Repo:** [github.com/aafernands/fernandes-journeys](https://github.com/aafernands/fernandes-journeys) | Retained - Existing package/repository identifier; not public branding. |
| `README.md:6` | **Repo:** [github.com/aafernands/fernandes-journeys](https://github.com/aafernands/fernandes-journeys) | Retained - Existing package/repository identifier; not public branding. |
| `README.md:23` | Blog content was migrated from **[alexjournly.com](https://alexjournly.com)** (REST API export). **Media CDN migration is complete** — former WordPress/Jetpack | Retained - Historical comment or migration provenance; does not affect public output. |
| `README.md:23` | Blog content was migrated from **[alexjournly.com](https://alexjournly.com)** (REST API export). **Media CDN migration is complete** — former WordPress/Jetpack ('i0.wp.com') assets now | Retained - Historical comment or migration provenance; does not affect public output. |
| `README.md:88` | '/stays' searches and books hotels on Fernandes Journeys through Nuitee Connect. The browser never sees the key. | Updated - current Alex Journeys branding, URL, or test expectation. |
| `docs/ANALYTICS.md:3` | Fernandes Journeys loads **GA4 via gtag.js** only when a measurement ID is configured at build time. Unset or empty env vars | Retained - Historical/setup documentation; no runtime output or external configuration changes. |
| `docs/ANALYTICS.md:23` | 3. Name it (for example 'Fernandes Journeys'), set timezone and currency, continue. | Retained - Historical/setup documentation; no runtime output or external configuration changes. |
| `docs/ANALYTICS.md:25` | 5. **Data collection** → **Web** → enter 'https://www.fernandesjourneys.com'. | Retained - Historical/setup documentation; no runtime output or external configuration changes. |
| `docs/ANALYTICS.md:31` | 1. Vercel → project **fernandes-journeys** → **Settings → Environment Variables**. | Retained - Historical/setup documentation; no runtime output or external configuration changes. |
| `docs/ANALYTICS.md:59` | pen [Google Search Console](https://search.google.com/search-console) → add the 'www.fernandesjourneys.com' (or domain) property. | Retained - Historical/setup documentation; no runtime output or external configuration changes. |
| `docs/CMS.md:33` | \| 'AUTH_URL' \| Set on Production \| 'https://www.fernandesjourneys.com' (no path). Auth.js uses it for the OAuth callback host. Remove 'NEXTAUTH_URL' if it disagrees. 'AUTH_T | Retained - Historical/setup documentation; no runtime output or external configuration changes. |
| `docs/CMS.md:38` | \| 'CMS_ADMIN_EMAILS' \| Yes for OAuth \| Comma-separated allowlist, e.g. 'fernandesjourneys@gmail.com' (must include this address on Vercel for Admin console to appear in the header menu). \| | Retained - Historical/setup documentation; no runtime output or external configuration changes. |
| `docs/CMS.md:40` | Redirect URIs: 'https://www.fernandesjourneys.com/api/auth/callback/{google\\|github}' and local 'http://localhost:3000/api/auth/callback/...'. | Retained - Historical/setup documentation; no runtime output or external configuration changes. |
| `docs/CMS.md:50` | Fine-grained PAT with **Contents: Read and write** on 'aafernands/fernandes-journeys'. | Retained - Historical/setup documentation; no runtime output or external configuration changes. |
| `docs/CMS.md:55` | \| 'CMS_GITHUB_REPO' \| No \| 'aafernands/fernandes-journeys' \| | Retained - Historical/setup documentation; no runtime output or external configuration changes. |
| `docs/CMS.md:132` | r upload → 'public/brand/logo-on-light.*' / 'logo-on-dark.*'. Defaults: '/brand/logo-fernandes-journeys.png' and '/brand/logo-fernandes-journeys-white.png'. Header uses both (theme); footer always uses the whit | Retained - Historical/setup documentation; no runtime output or external configuration changes. |
| `docs/CMS.md:132` | / 'logo-on-dark.*'. Defaults: '/brand/logo-fernandes-journeys.png' and '/brand/logo-fernandes-journeys-white.png'. Header uses both (theme); footer always uses the white mark. JSON-LD organization logo uses th | Retained - Historical/setup documentation; no runtime output or external configuration changes. |
| `docs/CMS.md:146` | shown only when 'session.user.isAdmin' is true — ensure 'CMS_ADMIN_EMAILS' includes 'fernandesjourneys@gmail.com' on Vercel. | Retained - Historical/setup documentation; no runtime output or external configuration changes. |
| `docs/CMS.md:157` | 2. Go to 'https://www.fernandesjourneys.com/cms' → sign in. | Retained - Historical/setup documentation; no runtime output or external configuration changes. |
| `docs/GOOGLE_OAUTH_BRANDING.md:1` | # Google OAuth branding verification — Fernandes Journeys | Retained - Historical/setup documentation; no runtime output or external configuration changes. |
| `docs/GOOGLE_OAUTH_BRANDING.md:9` | \| **Application name** \| 'Fernandes Journeys' (exact) \| | Retained - Historical/setup documentation; no runtime output or external configuration changes. |
| `docs/GOOGLE_OAUTH_BRANDING.md:10` | \| **Application home page** \| 'https://www.fernandesjourneys.com' (**not** '/cms') \| | Retained - Historical/setup documentation; no runtime output or external configuration changes. |
| `docs/GOOGLE_OAUTH_BRANDING.md:11` | \| **Application privacy policy** \| 'https://www.fernandesjourneys.com/privacy' \| | Retained - Historical/setup documentation; no runtime output or external configuration changes. |
| `docs/GOOGLE_OAUTH_BRANDING.md:12` | \| **Application terms of service** (optional) \| 'https://www.fernandesjourneys.com/terms' \| | Retained - Historical/setup documentation; no runtime output or external configuration changes. |
| `docs/GOOGLE_OAUTH_BRANDING.md:13` | \| **Authorized domains** \| 'fernandesjourneys.com' \| | Retained - Historical/setup documentation; no runtime output or external configuration changes. |
| `docs/GOOGLE_OAUTH_BRANDING.md:14` | \| App purpose page (linked from site) \| 'https://www.fernandesjourneys.com/app' \| | Retained - Historical/setup documentation; no runtime output or external configuration changes. |
| `docs/GOOGLE_OAUTH_BRANDING.md:18` | 'https://www.fernandesjourneys.com/api/auth/callback/google' | Retained - Historical/setup documentation; no runtime output or external configuration changes. |
| `docs/GOOGLE_OAUTH_BRANDING.md:26` | - 'fernandesjourneys.com' (Domain property preferred), **and** | Retained - Historical/setup documentation; no runtime output or external configuration changes. |
| `docs/GOOGLE_OAUTH_BRANDING.md:27` | - 'https://www.fernandesjourneys.com' (URL-prefix property if you use one). | Retained - Historical/setup documentation; no runtime output or external configuration changes. |
| `docs/GOOGLE_OAUTH_BRANDING.md:30` | 5. In Google Cloud Console → OAuth consent screen, confirm authorized domain 'fernandesjourneys.com' is listed, then **resubmit branding verification**. | Retained - Historical/setup documentation; no runtime output or external configuration changes. |
| `docs/GOOGLE_OAUTH_BRANDING.md:35` | - Public app-purpose page at '/app' states app name **Fernandes Journeys** and that Sign-In is for owner CMS + optional reader saves only. | Retained - Historical/setup documentation; no runtime output or external configuration changes. |
| `docs/GOOGLE_OAUTH_BRANDING.md:36` | - Homepage shows a crawlable “About this site & Google Sign-In” note and the **Fernandes Journeys** wordmark in the header (logo PNG may still show the old “alex journly” graphic; alt text and visible tex | Retained - Historical/setup documentation; no runtime output or external configuration changes. |
| `docs/GOOGLE_OAUTH_BRANDING.md:36` | the **Fernandes Journeys** wordmark in the header (logo PNG may still show the old “alex journly” graphic; alt text and visible text say Fernandes Journeys). | Retained - Historical/setup documentation; no runtime output or external configuration changes. |
| `docs/GOOGLE_OAUTH_BRANDING.md:36` | ogo PNG may still show the old “alex journly” graphic; alt text and visible text say Fernandes Journeys). | Retained - Historical/setup documentation; no runtime output or external configuration changes. |
| `docs/GOOGLE_OAUTH_BRANDING.md:42` | - https://www.fernandesjourneys.com → 200, no login wall | Retained - Historical/setup documentation; no runtime output or external configuration changes. |
| `docs/GOOGLE_OAUTH_BRANDING.md:43` | - https://www.fernandesjourneys.com/privacy → substantial privacy + OAuth section | Retained - Historical/setup documentation; no runtime output or external configuration changes. |
| `docs/GOOGLE_OAUTH_BRANDING.md:44` | - https://www.fernandesjourneys.com/policies → legal hub (privacy / terms / affiliate); not in primary nav | Retained - Historical/setup documentation; no runtime output or external configuration changes. |
| `docs/GOOGLE_OAUTH_BRANDING.md:45` | - https://www.fernandesjourneys.com/app → app purpose (kept for branding; not promoted in marketing nav) | Retained - Historical/setup documentation; no runtime output or external configuration changes. |
| `docs/OUTBOUND.md:3` | When a reader clicks a link that leaves **fernandesjourneys.com**, they briefly land on a branded departure page, then continue to the destination (~4 seconds). Metaph | Retained - Historical/setup documentation; no runtime output or external configuration changes. |
| `docs/READER-AUTH.md:60` | Reset link: '{AUTH_URL \\|\\| https://www.fernandesjourneys.com}/reset-password?token={raw}'. | Retained - Historical/setup documentation; no runtime output or external configuration changes. |
| `docs/READER-AUTH.md:128` | \| 'AUTH_URL' \| Production: 'https://www.fernandesjourneys.com' (no path). Used for reset links and for the OAuth callback host. A wrong host (apex vs www) drops the | Retained - Historical/setup documentation; no runtime output or external configuration changes. |
| `docs/READER-AUTH.md:135` | \| 'INBOUND_EMAIL_DOMAIN' \| Optional. Default 'inbound.fernandesjourneys.com'. \| | Retained - Historical/setup documentation; no runtime output or external configuration changes. |
| `docs/READER-AUTH.md:137` | \| 'EMAIL_FROM' \| Optional. Default for testing: 'Fernandes Journeys &lt;onboarding@resend.dev&gt;' (Resend’s shared sender). With that default, Resend **only sends to the Resend ac | Retained - Historical/setup documentation; no runtime output or external configuration changes. |
| `docs/READER-AUTH.md:137` | er email** until you verify a domain and set 'EMAIL_FROM' to an address on it (e.g. 'Fernandes Journeys &lt;contact@fernandesjourneys.com&gt;'). \| | Retained - Historical/setup documentation; no runtime output or external configuration changes. |
| `docs/READER-AUTH.md:137` | a domain and set 'EMAIL_FROM' to an address on it (e.g. 'Fernandes Journeys &lt;contact@fernandesjourneys.com&gt;'). \| | Retained - Historical/setup documentation; no runtime output or external configuration changes. |
| `docs/SECURITY_PHASE_3.md:1` | # Fernandes Journeys - Security Phase 3 | Retained - Historical/setup documentation; no runtime output or external configuration changes. |
| `docs/TRIPS-INBOUND.md:42` | EMAIL_DOMAIN' \| Recommended \| Host on the copied address. Default if unset: 'inbound.fernandesjourneys.com'. Must match the receiving domain below. \| | Retained - Historical/setup documentation; no runtime output or external configuration changes. |
| `docs/TRIPS-INBOUND.md:49` | Do **not** put this MX on the root domain 'fernandesjourneys.com'. That domain already receives mail. Resend delivers only to the MX with the lowest priority number, so | Retained - Historical/setup documentation; no runtime output or external configuration changes. |
| `docs/TRIPS-INBOUND.md:51` | 1. Resend → **Domains** → **Add domain** → 'inbound.fernandesjourneys.com'. | Retained - Historical/setup documentation; no runtime output or external configuration changes. |
| `docs/TRIPS-INBOUND.md:60` | Name 'inbound' on 'fernandesjourneys.com' is 'inbound.fernandesjourneys.com'. Priority **10** must be the only / lowest MX on that subdomain. TT | Retained - Historical/setup documentation; no runtime output or external configuration changes. |
| `docs/TRIPS-INBOUND.md:60` | Name 'inbound' on 'fernandesjourneys.com' is 'inbound.fernandesjourneys.com'. Priority **10** must be the only / lowest MX on that subdomain. TTL Auto is fine. | Retained - Historical/setup documentation; no runtime output or external configuration changes. |
| `docs/TRIPS-INBOUND.md:63` | - Endpoint: 'https://www.fernandesjourneys.com/api/inbound/email' | Retained - Historical/setup documentation; no runtime output or external configuration changes. |
| `docs/TRIPS-INBOUND.md:66` | 7. Set 'INBOUND_EMAIL_DOMAIN=inbound.fernandesjourneys.com' and redeploy. | Retained - Historical/setup documentation; no runtime output or external configuration changes. |
| `docs/TRIPS-INBOUND.md:70` | ss shape for a **new** mailbox (and for **Get a new address**): '{slug}-{NN}@inbound.fernandesjourneys.com', for example 'alex-24@inbound.fernandesjourneys.com'. | Retained - Historical/setup documentation; no runtime output or external configuration changes. |
| `docs/TRIPS-INBOUND.md:70` | ddress**): '{slug}-{NN}@inbound.fernandesjourneys.com', for example 'alex-24@inbound.fernandesjourneys.com'. | Retained - Historical/setup documentation; no runtime output or external configuration changes. |
| `docs/TRIPS-INBOUND.md:96` | "to": ["alex-24@inbound.fernandesjourneys.com"], | Retained - Historical/setup documentation; no runtime output or external configuration changes. |
| `docs/TRIPS-INBOUND.md:137` | "to": "alex-24@inbound.fernandesjourneys.com", | Retained - Historical/setup documentation; no runtime output or external configuration changes. |
| `docs/TRIPS.md:25` | \| Guest \| 'localStorage' draft in this browser ('fj.plan-a-trip.active.v1') \| | Retained - Historical/setup documentation; no runtime output or external configuration changes. |
| `docs/TURNSTILE.md:21` | - 'fernandesjourneys.com' | Retained - Historical/setup documentation; no runtime output or external configuration changes. |
| `docs/TURNSTILE.md:22` | - 'www.fernandesjourneys.com' | Retained - Historical/setup documentation; no runtime output or external configuration changes. |
| `docs/X-SIGN-IN.md:1` | # X (Twitter) reader sign-in — Fernandes Journeys | Retained - Historical/setup documentation; no runtime output or external configuration changes. |
| `docs/X-SIGN-IN.md:16` | \| 'AUTH_URL' \| **Set on Production** to 'https://www.fernandesjourneys.com' (no path, no trailing slash). See below. \| | Retained - Historical/setup documentation; no runtime output or external configuration changes. |
| `docs/X-SIGN-IN.md:26` | 'https://www.fernandesjourneys.com/api/auth/callback/twitter' | Retained - Historical/setup documentation; no runtime output or external configuration changes. |
| `docs/X-SIGN-IN.md:28` | Set Production 'AUTH_URL' to 'https://www.fernandesjourneys.com'. | Retained - Historical/setup documentation; no runtime output or external configuration changes. |
| `docs/X-SIGN-IN.md:30` | If 'AUTH_URL' is the apex ('https://fernandesjourneys.com') while the browser is on www, Auth.js sends X a callback on a different host than the one that stored | Retained - Historical/setup documentation; no runtime output or external configuration changes. |
| `docs/X-SIGN-IN.md:32` | On the production host, the state and PKCE cookies are set with 'Domain=.fernandesjourneys.com', 'Secure', 'SameSite=Lax', and 'Path=/', so www and the apex both send them. The CSRF cookie stays hos | Retained - Historical/setup documentation; no runtime output or external configuration changes. |
| `docs/X-SIGN-IN.md:38` | . Open [developer.x.com](https://developer.x.com/) → your project → the app used for Fernandes Journeys (or create one). | Retained - Historical/setup documentation; no runtime output or external configuration changes. |
| `docs/X-SIGN-IN.md:44` | h X** again. If X does not show a new consent screen and sign-in still fails, revoke Fernandes Journeys in X settings (Settings → Security and account access → Apps and sessions) and try again. | Retained - Historical/setup documentation; no runtime output or external configuration changes. |
| `docs/X-SIGN-IN.md:50` | \| Production (required — this is the callback Auth.js advertises) \| 'https://www.fernandesjourneys.com/api/auth/callback/twitter' \| | Retained - Historical/setup documentation; no runtime output or external configuration changes. |
| `docs/X-SIGN-IN.md:51` | pex, only if that host can open '/login' without redirecting to www first \| 'https://fernandesjourneys.com/api/auth/callback/twitter' \| | Retained - Historical/setup documentation; no runtime output or external configuration changes. |
| `docs/X-SIGN-IN.md:58` | 6. Website URL: 'https://www.fernandesjourneys.com' | Retained - Historical/setup documentation; no runtime output or external configuration changes. |
| `docs/X-SIGN-IN.md:59` | 7. Optional but useful on the app settings: privacy 'https://www.fernandesjourneys.com/privacy', terms 'https://www.fernandesjourneys.com/terms'. | Retained - Historical/setup documentation; no runtime output or external configuration changes. |
| `docs/X-SIGN-IN.md:59` | pp settings: privacy 'https://www.fernandesjourneys.com/privacy', terms 'https://www.fernandesjourneys.com/terms'. | Retained - Historical/setup documentation; no runtime output or external configuration changes. |
| `docs/X-SIGN-IN.md:86` | as 'Configuration'. \| '/login' says the state cookie was lost. Stay on 'https://www.fernandesjourneys.com', in a normal window. Production state and PKCE cookies use 'Domain=.fernandesjourneys.com', 'Secure', | Retained - Historical/setup documentation; no runtime output or external configuration changes. |
| `docs/X-SIGN-IN.md:86` | desjourneys.com', in a normal window. Production state and PKCE cookies use 'Domain=.fernandesjourneys.com', 'Secure', 'SameSite=Lax', 'Path=/'. Refresh and try Continue with X again. \| | Retained - Historical/setup documentation; no runtime output or external configuration changes. |
| `package-lock.json:2` | "name": "fernandes-journeys", | Retained - Existing package/repository identifier; not public branding. |
| `package-lock.json:8` | "name": "fernandes-journeys", | Retained - Existing package/repository identifier; not public branding. |
| `package.json:2` | "name": "fernandes-journeys", | Retained - Existing package/repository identifier; not public branding. |
| `package.json:5` | "description": "Fernandes Journeys — Alex’s travel blog for personal travel blog — destinations from past trips.", | Updated - current Alex Journeys branding, URL, or test expectation. |
| `public/brand/logo-fernandes-journeys-white.svg:1` | &lt;svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 220" role="img" aria-label="Fernandes Journeys"&gt; | Updated - accessible title and visible wordmark. |
| `public/brand/logo-fernandes-journeys-white.svg:2` | &lt;title&gt;Fernandes Journeys&lt;/title&gt; | Updated - accessible title and visible wordmark. |
| `public/brand/logo-fernandes-journeys.svg:1` | &lt;svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 220" role="img" aria-label="Fernandes Journeys"&gt; | Updated - accessible title and visible wordmark. |
| `public/brand/logo-fernandes-journeys.svg:2` | &lt;title&gt;Fernandes Journeys&lt;/title&gt; | Updated - accessible title and visible wordmark. |
| `scripts/auth-config.test.mjs:159` | assert.match(readerLoginErrorMessage("InvalidCheck"), /www\.fernandesjourneys\.com/); | Updated - current Alex Journeys branding, URL, or test expectation. |
| `scripts/auth-config.test.mjs:174` | assert.match(check, /www\.fernandesjourneys\.com/); | Updated - current Alex Journeys branding, URL, or test expectation. |
| `scripts/cdn-migration-failures.json:2` | "note": "These fernandesjourneys.com Photon URLs returned 403 (origin moved to Vercel). Removed from content HTML/media index rather than le | Retained - Historical migration source, failure record, or integration fixture retained. |
| `scripts/cdn-migration-failures.json:5` | "https://i0.wp.com/fernandesjourneys.com/wp-content/uploads/2024/01/minimalist-blue-travel-infographic-template-1-1-410x1024.png?resize=410%2C10 | Retained - Historical migration source, failure record, or integration fixture retained. |
| `scripts/cdn-migration-failures.json:6` | "https://i0.wp.com/fernandesjourneys.com/wp-content/uploads/2024/03/img_6599-768x1024.jpg?resize=640%2C853&ssl=1", | Retained - Historical migration source, failure record, or integration fixture retained. |
| `scripts/cdn-migration-failures.json:7` | "https://i0.wp.com/fernandesjourneys.com/wp-content/uploads/2024/03/img_6772-768x1024.jpg?resize=640%2C853&ssl=1", | Retained - Historical migration source, failure record, or integration fixture retained. |
| `scripts/cdn-migration-failures.json:8` | "https://i0.wp.com/fernandesjourneys.com/wp-content/uploads/2024/03/img_6855-768x1024.jpg?resize=640%2C853&ssl=1", | Retained - Historical migration source, failure record, or integration fixture retained. |
| `scripts/cdn-migration-failures.json:9` | "https://i0.wp.com/fernandesjourneys.com/wp-content/uploads/2024/03/img_6808-768x1024.jpg?resize=640%2C853&ssl=1", | Retained - Historical migration source, failure record, or integration fixture retained. |
| `scripts/cdn-migration-failures.json:10` | "https://i0.wp.com/fernandesjourneys.com/wp-content/uploads/2024/03/img_6839-1024x768.jpg?resize=640%2C480&ssl=1", | Retained - Historical migration source, failure record, or integration fixture retained. |
| `scripts/cdn-migration-failures.json:11` | "https://i0.wp.com/fernandesjourneys.com/wp-content/uploads/2024/03/img_7317-1-768x1024.jpg?resize=640%2C853&ssl=1", | Retained - Historical migration source, failure record, or integration fixture retained. |
| `scripts/cdn-migration-failures.json:12` | "https://i0.wp.com/fernandesjourneys.com/wp-content/uploads/2024/03/img_7536-1024x768.jpg?resize=640%2C480&ssl=1", | Retained - Historical migration source, failure record, or integration fixture retained. |
| `scripts/cdn-migration-failures.json:13` | "https://i0.wp.com/fernandesjourneys.com/wp-content/uploads/2024/03/img_7456-768x1024.jpg?resize=640%2C853&ssl=1", | Retained - Historical migration source, failure record, or integration fixture retained. |
| `scripts/cdn-migration-failures.json:14` | "https://i0.wp.com/fernandesjourneys.com/wp-content/uploads/2024/03/img_9633-1-473x1024.png?resize=473%2C1024&ssl=1", | Retained - Historical migration source, failure record, or integration fixture retained. |
| `scripts/cdn-migration-failures.json:15` | "https://i0.wp.com/fernandesjourneys.com/wp-content/uploads/2024/03/img_7426-768x1024.jpg?resize=640%2C853&ssl=1", | Retained - Historical migration source, failure record, or integration fixture retained. |
| `scripts/cdn-migration-failures.json:16` | "https://i0.wp.com/fernandesjourneys.com/wp-content/uploads/2024/03/img_7371-1024x768.jpg?resize=640%2C480&ssl=1", | Retained - Historical migration source, failure record, or integration fixture retained. |
| `scripts/cdn-migration-failures.json:17` | "https://i0.wp.com/fernandesjourneys.com/wp-content/uploads/2024/03/img_7343-768x1024.jpg?resize=640%2C853&ssl=1", | Retained - Historical migration source, failure record, or integration fixture retained. |
| `scripts/cdn-migration-failures.json:18` | "https://i0.wp.com/fernandesjourneys.com/wp-content/uploads/2024/03/img_7613-768x1024.jpg?resize=640%2C853&ssl=1", | Retained - Historical migration source, failure record, or integration fixture retained. |
| `scripts/cdn-migration-failures.json:19` | "https://i0.wp.com/fernandesjourneys.com/wp-content/uploads/2024/03/img_7588-768x1024.jpg?resize=640%2C853&ssl=1", | Retained - Historical migration source, failure record, or integration fixture retained. |
| `scripts/cdn-migration-failures.json:20` | "https://i0.wp.com/fernandesjourneys.com/wp-content/uploads/2024/03/img_7583-768x1024.jpg?resize=640%2C853&ssl=1", | Retained - Historical migration source, failure record, or integration fixture retained. |
| `scripts/cdn-migration-failures.json:21` | "https://i0.wp.com/fernandesjourneys.com/wp-content/uploads/2024/03/img_7604-768x1024.jpg?resize=640%2C853&ssl=1", | Retained - Historical migration source, failure record, or integration fixture retained. |
| `scripts/cdn-migration-failures.json:22` | "https://i0.wp.com/fernandesjourneys.com/wp-content/uploads/2024/03/img_7595-768x1024.jpg?resize=640%2C853&ssl=1" | Retained - Historical migration source, failure record, or integration fixture retained. |
| `scripts/inbound.test.mjs:29` | const DOMAIN = "inbound.fernandesjourneys.com"; | Retained - Inbound receiving domain unchanged; migration not established. |
| `scripts/migrate-cdn-assets.mjs:15` | "FernandesJourneysMediaMigrator/1.0 (+https://www.fernandesjourneys.com; hello@alexjournly.com)"; | Retained - Historical migration source, failure record, or integration fixture retained. |
| `scripts/migrate-cdn-assets.mjs:15` | "FernandesJourneysMediaMigrator/1.0 (+https://www.fernandesjourneys.com; hello@alexjournly.com)"; | Retained - Historical migration source, failure record, or integration fixture retained. |
| `scripts/migrate-cdn-assets.mjs:15` | "FernandesJourneysMediaMigrator/1.0 (+https://www.fernandesjourneys.com; hello@alexjournly.com)"; | Retained - Historical migration source, failure record, or integration fixture retained. |
| `scripts/migrate-cdn-assets.mjs:22` | /https?:\/\/(?:i[0-3]\.wp\.com\|(?:www\.)?(?:alexjournly\|fernandesjourneys)\.com)[^\s"'&lt;&gt;\\)]+/gi; | Retained - Historical migration source, failure record, or integration fixture retained. |
| `scripts/migrate-cdn-assets.mjs:22` | /https?:\/\/(?:i[0-3]\.wp\.com\|(?:www\.)?(?:alexjournly\|fernandesjourneys)\.com)[^\s"'&lt;&gt;\\)]+/gi; | Retained - Historical migration source, failure record, or integration fixture retained. |
| `scripts/migrate-cdn-assets.mjs:80` | // path is /alexjournly.com/wp-content/... | Retained - Historical migration source, failure record, or integration fixture retained. |
| `scripts/migrate-cdn-assets.mjs:156` | Referer: "https://www.fernandesjourneys.com/", | Retained - Historical migration source, failure record, or integration fixture retained. |
| `scripts/migrate-cdn-assets.mjs:381` | } else if (typeof item.url === "string" && /i[0-3]\.wp\.com\|alexjournly\.com\/wp-content\|fernandesjourneys\.com\/wp-content/i.test(item.url)) { | Retained - Historical migration source, failure record, or integration fixture retained. |
| `scripts/migrate-cdn-assets.mjs:381` | se if (typeof item.url === "string" && /i[0-3]\.wp\.com\|alexjournly\.com\/wp-content\|fernandesjourneys\.com\/wp-content/i.test(item.url)) { | Retained - Historical migration source, failure record, or integration fixture retained. |
| `scripts/migrate-wp-posts.mjs:3` | * Source: /workspace/wp-migration/all-posts.json (alexjournly.com) | Retained - Historical migration source, failure record, or integration fixture retained. |
| `scripts/migrate-wp-posts.mjs:272` | site: "https://alexjournly.com", | Retained - Historical migration source, failure record, or integration fixture retained. |
| `scripts/migrate-wp-posts.mjs:273` | url: post.link \|\| 'https://alexjournly.com/${slug}/', | Retained - Historical migration source, failure record, or integration fixture retained. |
| `scripts/migrate-wp-posts.mjs:301` | source: "alexjournly.com WordPress REST API", | Retained - Historical migration source, failure record, or integration fixture retained. |
| `scripts/phase2-security.test.mjs:53` | process.env.CMS_GITHUB_REPO = "aafernands/fernandes-journeys"; | Retained - Existing package/repository identifier; not public branding. |
| `scripts/pinterest.test.mjs:14` | "https://www.fernandesjourneys.com/media/falls.jpg", | Updated - current Alex Journeys branding, URL, or test expectation. |
| `scripts/pinterest.test.mjs:36` | pageUrl: "https://www.fernandesjourneys.com/niagara-falls", | Updated - current Alex Journeys branding, URL, or test expectation. |
| `scripts/pinterest.test.mjs:48` | "https://www.fernandesjourneys.com/niagara-falls", | Updated - current Alex Journeys branding, URL, or test expectation. |
| `scripts/pinterest.test.mjs:56` | "https://www.fernandesjourneys.com/media/photo.jpg", | Updated - current Alex Journeys branding, URL, or test expectation. |
| `scripts/pinterest.test.mjs:72` | assert.equal(isPinnableImageSrc("/brand/logo-alex-journly.png"), false); | Updated - current Alex Journeys branding, URL, or test expectation. |
| `scripts/pinterest.test.mjs:85` | const pageUrl = "https://www.fernandesjourneys.com/iceland"; | Updated - current Alex Journeys branding, URL, or test expectation. |
| `scripts/pinterest.test.mjs:102` | encodeURIComponent("https://www.fernandesjourneys.com/media/blue-lagoon.jpg"), | Updated - current Alex Journeys branding, URL, or test expectation. |
| `scripts/pinterest.test.mjs:111` | '&lt;img src="/brand/logo-alex-journly.png" alt="Fernandes Journeys" width="180" height="54" /&gt;'; | Updated - current Alex Journeys branding, URL, or test expectation. |
| `scripts/pinterest.test.mjs:111` | '&lt;img src="/brand/logo-alex-journly.png" alt="Fernandes Journeys" width="180" height="54" /&gt;'; | Updated - current Alex Journeys branding, URL, or test expectation. |
| `scripts/twitter-oauth.test.mjs:45` | new Request("https://www.fernandesjourneys.com/api/auth/signin/twitter", { | Updated - current Alex Journeys branding, URL, or test expectation. |
| `scripts/twitter-oauth.test.mjs:52` | callbackUrl: "https://www.fernandesjourneys.com/account", | Updated - current Alex Journeys branding, URL, or test expectation. |
| `scripts/twitter-oauth.test.mjs:84` | "https://www.fernandesjourneys.com/api/auth/callback/twitter", | Updated - current Alex Journeys branding, URL, or test expectation. |
| `scripts/twitter-oauth.test.mjs:102` | url: new URL("https://www.fernandesjourneys.com/api/auth"), | Updated - current Alex Journeys branding, URL, or test expectation. |
| `scripts/twitter-oauth.test.mjs:128` | url: new URL("https://www.fernandesjourneys.com/api/auth"), | Updated - current Alex Journeys branding, URL, or test expectation. |
| `scripts/twitter-oauth.test.mjs:166` | const ORIGIN = "https://www.fernandesjourneys.com"; | Updated - current Alex Journeys branding, URL, or test expectation. |
| `scripts/twitter-oauth.test.mjs:541` | AUTH_URL: "https://www.fernandesjourneys.com", | Updated - current Alex Journeys branding, URL, or test expectation. |
| `scripts/twitter-oauth.test.mjs:543` | assert.equal(cookies.state.options.domain, ".fernandesjourneys.com"); | Updated - current Alex Journeys branding, URL, or test expectation. |
| `scripts/twitter-oauth.test.mjs:549` | ".fernandesjourneys.com", | Updated - current Alex Journeys branding, URL, or test expectation. |
| `scripts/twitter-oauth.test.mjs:563` | AUTH_URL: "https://fernandesjourneys.com", | Updated - current Alex Journeys branding, URL, or test expectation. |
| `scripts/twitter-oauth.test.mjs:566` | ".fernandesjourneys.com", | Updated - current Alex Journeys branding, URL, or test expectation. |
| `scripts/twitter-oauth.test.mjs:570` | it("sets Domain=.fernandesjourneys.com on the state and PKCE cookies Auth.js sends", async () =&gt; { | Updated - current Alex Journeys branding, URL, or test expectation. |
| `scripts/twitter-oauth.test.mjs:572` | new Request("https://www.fernandesjourneys.com/api/auth/signin/twitter", { | Updated - current Alex Journeys branding, URL, or test expectation. |
| `scripts/twitter-oauth.test.mjs:579` | callbackUrl: "https://www.fernandesjourneys.com/account", | Updated - current Alex Journeys branding, URL, or test expectation. |
| `scripts/twitter-oauth.test.mjs:595` | AUTH_URL: "https://www.fernandesjourneys.com", | Updated - current Alex Journeys branding, URL, or test expectation. |
| `scripts/twitter-oauth.test.mjs:604` | assert.match(state, /Domain=\.fernandesjourneys\.com/i); | Updated - current Alex Journeys branding, URL, or test expectation. |
| `scripts/twitter-oauth.test.mjs:608` | assert.match(pkce, /Domain=\.fernandesjourneys\.com/i); | Updated - current Alex Journeys branding, URL, or test expectation. |
| `scripts/twitter-oauth.test.mjs:630` | location: "https://www.fernandesjourneys.com/login?error=Configuration", | Updated - current Alex Journeys branding, URL, or test expectation. |
| `scripts/twitter-oauth.test.mjs:632` | "__Secure-authjs.state=; Max-Age=0; Path=/; Domain=.fernandesjourneys.com; Secure; HttpOnly; SameSite=Lax", | Updated - current Alex Journeys branding, URL, or test expectation. |
| `scripts/twitter-oauth.test.mjs:641` | /Domain=\.fernandesjourneys\.com/i, | Updated - current Alex Journeys branding, URL, or test expectation. |
| `scripts/viator.test.mjs:66` | pageUrl: "https://www.fernandesjourneys.com/toronto-travel-guide", | Updated - current Alex Journeys branding, URL, or test expectation. |
| `src/app/[slug]/page.tsx:73` | 'Notes from my trip to ${dest.name} — Fernandes Journeys.', | Updated - current Alex Journeys branding, URL, or test expectation. |
| `src/app/account/confirm-email/page.tsx:7` | description: "Confirm your new Fernandes Journeys account email.", | Updated - current Alex Journeys branding, URL, or test expectation. |
| `src/app/account/page.tsx:39` | "Your Fernandes Journeys journal — trips you’re planning and stories you’ve saved.", | Updated - current Alex Journeys branding, URL, or test expectation. |
| `src/app/account/page.tsx:194` | &lt;p className="eyebrow"&gt;Fernandes Journeys&lt;/p&gt; | Updated - current Alex Journeys branding, URL, or test expectation. |
| `src/app/api/auth/change-email/request/route.ts:99` | &lt;p&gt;Confirm your new email address for Fernandes Journeys.&lt;/p&gt; | Updated - current Alex Journeys branding, URL, or test expectation. |
| `src/app/api/auth/change-email/request/route.ts:105` | "Confirm your new email address for Fernandes Journeys:", | Updated - current Alex Journeys branding, URL, or test expectation. |
| `src/app/api/auth/change-email/request/route.ts:113` | subject: "Confirm your new Fernandes Journeys email", | Updated - current Alex Journeys branding, URL, or test expectation. |
| `src/app/api/auth/change-email/request/route.ts:123` | &lt;p&gt;A request was made to change your Fernandes Journeys account email to &lt;strong&gt;${escapeHtml(result.newEmail)}&lt;/strong&gt;.&lt;/p&gt; | Updated - current Alex Journeys branding, URL, or test expectation. |
| `src/app/api/auth/change-email/request/route.ts:127` | 'A request was made to change your Fernandes Journeys account email to ${result.newEmail}.', | Updated - current Alex Journeys branding, URL, or test expectation. |
| `src/app/api/auth/change-email/request/route.ts:133` | subject: "Email change requested on Fernandes Journeys", | Updated - current Alex Journeys branding, URL, or test expectation. |
| `src/app/api/auth/forgot-password/route.ts:128` | &lt;p&gt;We received a request to reset your Fernandes Journeys password.&lt;/p&gt; | Updated - current Alex Journeys branding, URL, or test expectation. |
| `src/app/api/auth/forgot-password/route.ts:134` | 'Reset your Fernandes Journeys password:', | Updated - current Alex Journeys branding, URL, or test expectation. |
| `src/app/api/auth/forgot-password/route.ts:142` | subject: "Reset your Fernandes Journeys password", | Updated - current Alex Journeys branding, URL, or test expectation. |
| `src/app/api/cms/users/[id]/send-reset/route.ts:96` | &lt;p&gt;We received a request to reset your Fernandes Journeys password.&lt;/p&gt; | Updated - current Alex Journeys branding, URL, or test expectation. |
| `src/app/api/cms/users/[id]/send-reset/route.ts:102` | 'Reset your Fernandes Journeys password:', | Updated - current Alex Journeys branding, URL, or test expectation. |
| `src/app/api/cms/users/[id]/send-reset/route.ts:110` | subject: "Reset your Fernandes Journeys password", | Updated - current Alex Journeys branding, URL, or test expectation. |
| `src/app/cms/help/page.tsx:19` | Short publish checklist for Fernandes Journeys. Full setup notes live | Updated - current Alex Journeys branding, URL, or test expectation. |
| `src/app/flights/book/page.tsx:31` | description: "Fare details and sandbox booking on Fernandes Journeys.", | Updated - current Alex Journeys branding, URL, or test expectation. |
| `src/app/flights/book/page.tsx:102` | description="Fare details and booking on Fernandes Journeys." | Updated - current Alex Journeys branding, URL, or test expectation. |
| `src/app/flights/book/page.tsx:117` | Sandbox fare. Booking finishes on Fernandes Journeys through Nuitee and is not a live charge. | Updated - current Alex Journeys branding, URL, or test expectation. |
| `src/app/flights/confirmation/page.tsx:21` | description: "Confirmation for a flight booked on Fernandes Journeys.", | Updated - current Alex Journeys branding, URL, or test expectation. |
| `src/app/flights/page.tsx:42` | ? 'Flights from ${query.origin} to ${query.destination}, searched and booked on Fernandes Journeys.' | Updated - current Alex Journeys branding, URL, or test expectation. |
| `src/app/globals.css:1096` | Size, spacing, and nested radius only. Colors and font families stay on FJ tokens. | Retained - Historical comment or migration provenance; does not affect public output. |
| `src/app/login/page.tsx:16` | "Sign in to Fernandes Journeys to save stories and trip plans.", | Updated - current Alex Journeys branding, URL, or test expectation. |
| `src/app/reset-password/page.tsx:8` | description: "Choose a new Fernandes Journeys reader password.", | Updated - current Alex Journeys branding, URL, or test expectation. |
| `src/app/search/page.tsx:9` | "Search Stories, Guides, Places, and key pages across Fernandes Journeys.", | Updated - current Alex Journeys branding, URL, or test expectation. |
| `src/app/stays/[hotelId]/page.tsx:35` | description: "Room rates and sandbox booking on Fernandes Journeys.", | Updated - current Alex Journeys branding, URL, or test expectation. |
| `src/app/stays/page.tsx:33` | ? 'Hotels in ${query.destination}, searched and booked on Fernandes Journeys.' | Updated - current Alex Journeys branding, URL, or test expectation. |
| `src/auth.ts:131` | // www and apex share state + PKCE (Domain=.fernandesjourneys.com, Secure, | Retained - Historical comment or migration provenance; does not affect public output. |
| `src/components/ReaderLoginForm.tsx:130` | &lt;p className="eyebrow text-accent"&gt;Fernandes Journeys&lt;/p&gt; | Updated - current Alex Journeys branding, URL, or test expectation. |
| `src/components/ReaderLoginForm.tsx:216` | &lt;p className="eyebrow text-accent"&gt;Fernandes Journeys&lt;/p&gt; | Updated - current Alex Journeys branding, URL, or test expectation. |
| `src/components/ResetPasswordForm.tsx:97` | &lt;p className="eyebrow text-accent"&gt;Fernandes Journeys&lt;/p&gt; | Updated - current Alex Journeys branding, URL, or test expectation. |
| `src/components/account/ProfileAvatar.tsx:19` | const source = name.trim() \|\| email.trim() \|\| "FJ"; | Updated - current Alex Journeys branding, URL, or test expectation. |
| `src/components/blog/BlogPostView.tsx:280` | Fernandes Journeys — is where I write down places I&apos;ve been | Updated - current Alex Journeys branding, URL, or test expectation. |
| `src/components/blog/PostExperienceAffiliateWidget.tsx:43` | Affiliate experience widget. If you book through it, Fernandes Journeys may earn | Updated - current Alex Journeys branding, URL, or test expectation. |
| `src/components/cms/CmsShell.tsx:136` | Fernandes Journeys | Updated - current Alex Journeys branding, URL, or test expectation. |
| `src/components/cms/CmsShell.tsx:169` | Fernandes Journeys | Updated - current Alex Journeys branding, URL, or test expectation. |
| `src/components/cms/LoginForm.tsx:64` | &lt;p className="eyebrow text-accent"&gt;Fernandes Journeys&lt;/p&gt; | Updated - current Alex Journeys branding, URL, or test expectation. |
| `src/components/cms/PostForm.tsx:565` | Script tags are removed for security; Fernandes Journeys loads the approved | Updated - current Alex Journeys branding, URL, or test expectation. |
| `src/components/destinations/CurrencyQuickFact.tsx:28` | const STORAGE_KEY = "fj:saved-currency-conversions"; | Retained - Persistent storage/cache or booking identifier retained for compatibility. |
| `src/components/destinations/CurrencyQuickFact.tsx:295` | Saved in your Fernandes Journeys travel tools on this device. | Updated - current Alex Journeys branding, URL, or test expectation. |
| `src/components/newsletter/PostmarkWatermark.tsx:48` | FERNANDES JOURNEYS | Updated - current Alex Journeys branding, URL, or test expectation. |
| `src/components/newsletter/PostmarkWatermark.tsx:116` | FJ | Updated - current Alex Journeys branding, URL, or test expectation. |
| `src/components/pages/ContactForm.tsx:60` | 'Fernandes Journeys contact from ${first}${last ? ' ${last}' : ""}', | Updated - current Alex Journeys branding, URL, or test expectation. |
| `src/components/stays/StayBooker.tsx:228` | clientReference.current = 'fj-${crypto.randomUUID()}'; | Retained - Persistent storage/cache or booking identifier retained for compatibility. |
| `src/components/stays/StayHotelOverview.tsx:501` | Sandbox rate. Booking finishes on Fernandes Journeys through Nuitee and is not a live charge. | Updated - current Alex Journeys branding, URL, or test expectation. |
| `src/components/trip-planner/ItineraryHub.tsx:741` | credit: "Fernandes Journeys", | Updated - current Alex Journeys branding, URL, or test expectation. |
| `src/content/drafts/ios-26-boarding-pass-experience.json:16` | "site": "https://alexjournly.com", | Retained - Historical WordPress source provenance, not rendered as public links. |
| `src/content/drafts/ios-26-boarding-pass-experience.json:17` | "url": "https://alexjournly.com/?p=14997", | Retained - Historical WordPress source provenance, not rendered as public links. |
| `src/content/geo/world-countries.json:1` | ,69.766],[28.592,69.065]]]}},{"type":"Feature","properties":{"name":"Fiji","iso_a2":"FJ","iso_a3":"FJI"},"geometry":{"type":"MultiPolygon","coordinates":[[[[178.374,-17.34],[178.718,-17.628],[178.553,-18.151],[ | Retained - FJ is the ISO country code for Fiji, not branding. |
| `src/content/pages/_index.json:3` | "source": "alexjournly.com WordPress via wpcom-mcp-content-authoring", | Retained - Historical WordPress source provenance, not rendered as public links. |
| `src/content/pages/culinary.json:8` | "site": "https://alexjournly.com", | Retained - Historical WordPress source provenance, not rendered as public links. |
| `src/content/pages/culinary.json:9` | "url": "https://alexjournly.com/culinary/", | Retained - Historical WordPress source provenance, not rendered as public links. |
| `src/content/pages/policies.json:8` | "site": "https://alexjournly.com", | Retained - Historical WordPress source provenance, not rendered as public links. |
| `src/content/pages/policies.json:9` | "url": "https://alexjournly.com/policies-disclosures/", | Retained - Historical WordPress source provenance, not rendered as public links. |
| `src/content/pages/travel-wallet.json:8` | "site": "https://alexjournly.com", | Retained - Historical WordPress source provenance, not rendered as public links. |
| `src/content/pages/travel-wallet.json:9` | "url": "https://alexjournly.com/travel-wallet/", | Retained - Historical WordPress source provenance, not rendered as public links. |
| `src/content/posts/10-tips-for-amazing-adventure.json:15` | "site": "https://alexjournly.com", | Retained - Historical WordPress source provenance, not rendered as public links. |
| `src/content/posts/10-tips-for-amazing-adventure.json:16` | "url": "https://alexjournly.com/10-tips-for-amazing-adventure/", | Retained - Historical WordPress source provenance, not rendered as public links. |
| `src/content/posts/15-steps-to-effortlessly-plan-your-next-adventure.json:15` | "site": "https://alexjournly.com", | Retained - Historical WordPress source provenance, not rendered as public links. |
| `src/content/posts/15-steps-to-effortlessly-plan-your-next-adventure.json:16` | "url": "https://alexjournly.com/15-steps-to-effortlessly-plan-your-next-adventure/", | Retained - Historical WordPress source provenance, not rendered as public links. |
| `src/content/posts/_index.json:3` | "source": "alexjournly.com WordPress REST API", | Retained - Historical WordPress source provenance, not rendered as public links. |
| `src/content/posts/automatic-refunds-for-flight.json:15` | "site": "https://alexjournly.com", | Retained - Historical WordPress source provenance, not rendered as public links. |
| `src/content/posts/automatic-refunds-for-flight.json:16` | "url": "https://alexjournly.com/automatic-refunds-for-flight/", | Retained - Historical WordPress source provenance, not rendered as public links. |
| `src/content/posts/best-solo-travel-destinations.json:15` | "site": "https://alexjournly.com", | Retained - Historical WordPress source provenance, not rendered as public links. |
| `src/content/posts/best-solo-travel-destinations.json:16` | "url": "https://alexjournly.com/best-solo-travel-destinations/", | Retained - Historical WordPress source provenance, not rendered as public links. |
| `src/content/posts/best-travel-apps.json:15` | "site": "https://alexjournly.com", | Retained - Historical WordPress source provenance, not rendered as public links. |
| `src/content/posts/best-travel-apps.json:16` | "url": "https://alexjournly.com/best-travel-apps/", | Retained - Historical WordPress source provenance, not rendered as public links. |
| `src/content/posts/discover-the-top-accommodation-sites-of-2025.json:15` | "site": "https://alexjournly.com", | Retained - Historical WordPress source provenance, not rendered as public links. |
| `src/content/posts/discover-the-top-accommodation-sites-of-2025.json:16` | "url": "https://alexjournly.com/discover-the-top-accommodation-sites-of-2025/", | Retained - Historical WordPress source provenance, not rendered as public links. |
| `src/content/posts/guide-to-overcoming-jet-lag.json:15` | "site": "https://alexjournly.com", | Retained - Historical WordPress source provenance, not rendered as public links. |
| `src/content/posts/guide-to-overcoming-jet-lag.json:16` | "url": "https://alexjournly.com/guide-to-overcoming-jet-lag/", | Retained - Historical WordPress source provenance, not rendered as public links. |
| `src/content/posts/how-to-score-cheap-flights.json:15` | "site": "https://alexjournly.com", | Retained - Historical WordPress source provenance, not rendered as public links. |
| `src/content/posts/how-to-score-cheap-flights.json:16` | "url": "https://alexjournly.com/how-to-score-cheap-flights/", | Retained - Historical WordPress source provenance, not rendered as public links. |
| `src/content/posts/marron-bells.json:17` | "site": "https://alexjournly.com", | Retained - Historical WordPress source provenance, not rendered as public links. |
| `src/content/posts/marron-bells.json:18` | "url": "https://alexjournly.com/marron-bells/", | Retained - Historical WordPress source provenance, not rendered as public links. |
| `src/content/posts/nj-wine-expo-2024.json:17` | "site": "https://alexjournly.com", | Retained - Historical WordPress source provenance, not rendered as public links. |
| `src/content/posts/nj-wine-expo-2024.json:18` | "url": "https://alexjournly.com/nj-wine-expo-2024/", | Retained - Historical WordPress source provenance, not rendered as public links. |
| `src/content/posts/nuuk-airport-opening.json:17` | "site": "https://alexjournly.com", | Retained - Historical WordPress source provenance, not rendered as public links. |
| `src/content/posts/nuuk-airport-opening.json:18` | "url": "https://alexjournly.com/nuuk-airport-opening/", | Retained - Historical WordPress source provenance, not rendered as public links. |
| `src/content/posts/real-id-requirements-2025.json:17` | "site": "https://alexjournly.com", | Retained - Historical WordPress source provenance, not rendered as public links. |
| `src/content/posts/real-id-requirements-2025.json:18` | "url": "https://alexjournly.com/real-id-requirements-2025/", | Retained - Historical WordPress source provenance, not rendered as public links. |
| `src/content/posts/save-money-accommodation.json:15` | "site": "https://alexjournly.com", | Retained - Historical WordPress source provenance, not rendered as public links. |
| `src/content/posts/save-money-accommodation.json:16` | "url": "https://alexjournly.com/save-money-accommodation/", | Retained - Historical WordPress source provenance, not rendered as public links. |
| `src/content/posts/stay-on-budget-travel-spending-journal.json:15` | "site": "https://alexjournly.com", | Retained - Historical WordPress source provenance, not rendered as public links. |
| `src/content/posts/stay-on-budget-travel-spending-journal.json:16` | "url": "https://alexjournly.com/stay-on-budget-travel-spending-journal/", | Retained - Historical WordPress source provenance, not rendered as public links. |
| `src/content/posts/sustainable-travel-tips.json:15` | "site": "https://alexjournly.com", | Retained - Historical WordPress source provenance, not rendered as public links. |
| `src/content/posts/sustainable-travel-tips.json:16` | "url": "https://alexjournly.com/sustainable-travel-tips/", | Retained - Historical WordPress source provenance, not rendered as public links. |
| `src/content/posts/the-ultimate-insiders-guide-to-u-s-ski-destinations.json:17` | "site": "https://alexjournly.com", | Retained - Historical WordPress source provenance, not rendered as public links. |
| `src/content/posts/the-ultimate-insiders-guide-to-u-s-ski-destinations.json:18` | "url": "https://alexjournly.com/the-ultimate-insiders-guide-to-u-s-ski-destinations/", | Retained - Historical WordPress source provenance, not rendered as public links. |
| `src/content/posts/top-10-must-visit-european-cities.json:13` | f you’re planning a longer stay, check out our full guide, &lt;strong&gt;&lt;a href=\"https://fernandesjourneys.com/discovering-iceland/\" rel=\"noopener noreferrer\" target=\"_blank\"&gt;Discovering Iceland: A Week in the | Updated - current Alex Journeys branding, URL, or test expectation. |
| `src/content/posts/top-10-must-visit-european-cities.json:15` | "site": "https://alexjournly.com", | Retained - Historical WordPress source provenance, not rendered as public links. |
| `src/content/posts/top-10-must-visit-european-cities.json:16` | "url": "https://alexjournly.com/top-10-must-visit-european-cities/", | Retained - Historical WordPress source provenance, not rendered as public links. |
| `src/content/posts/top-adventure-travel-destinations-for-2025.json:13` | -widget-ref=\"W-ff1377a4-6216-4e8a-87d5-72d15bfb35c9\"&gt;&lt;/div&gt;\n\n\n&lt;a href=\"https://fernandesjourneys.com/redirect?url=https://ladygaga.com\" rel=\"noopener noreferrer\" target=\"_blank\"&gt;Test Link Redirect&lt;/a | Updated - current Alex Journeys branding, URL, or test expectation. |
| `src/content/posts/top-adventure-travel-destinations-for-2025.json:13` | their best light.&lt;/p&gt;\n\n&lt;h2&gt;4. Iceland&lt;/h2&gt;\n&lt;h3&gt;Why Go:&lt;/h3&gt;\n&lt;p&gt;&lt;a href=\"https://fernandesjourneys.com/discovering-iceland/\" rel=\"noopener noreferrer\" target=\"_blank\"&gt;Iceland &lt;/a&gt;is a land of otherworl | Updated - current Alex Journeys branding, URL, or test expectation. |
| `src/content/posts/top-adventure-travel-destinations-for-2025.json:15` | "site": "https://alexjournly.com", | Retained - Historical WordPress source provenance, not rendered as public links. |
| `src/content/posts/top-adventure-travel-destinations-for-2025.json:16` | "url": "https://alexjournly.com/top-adventure-travel-destinations-for-2025/", | Retained - Historical WordPress source provenance, not rendered as public links. |
| `src/content/posts/top-travel-credit-cards.json:15` | "site": "https://alexjournly.com", | Retained - Historical WordPress source provenance, not rendered as public links. |
| `src/content/posts/top-travel-credit-cards.json:16` | "url": "https://alexjournly.com/top-travel-credit-cards/", | Retained - Historical WordPress source provenance, not rendered as public links. |
| `src/content/posts/travel-insurance-allianz-world-nomads.json:15` | "site": "https://alexjournly.com", | Retained - Historical WordPress source provenance, not rendered as public links. |
| `src/content/posts/travel-insurance-allianz-world-nomads.json:16` | "url": "https://alexjournly.com/travel-insurance-allianz-world-nomads/", | Retained - Historical WordPress source provenance, not rendered as public links. |
| `src/content/posts/travel-mistake-never-again.json:11` | ars, I’ve made plenty of little mistakes on the road: forgetting a &lt;a href=\"https://fernandesjourneys.com/travel-tech-essentials/\" rel=\"noopener noreferrer\" target=\"_blank\"&gt;charger&lt;/a&gt;, &lt;a href=\"https:// | Updated - current Alex Journeys branding, URL, or test expectation. |
| `src/content/posts/travel-mistake-never-again.json:11` | ials/\" rel=\"noopener noreferrer\" target=\"_blank\"&gt;charger&lt;/a&gt;, &lt;a href=\"https://fernandesjourneys.com/travel-with-minimal-luggage/\" rel=\"noopener noreferrer\" target=\"_blank\"&gt;packing&lt;/a&gt; too many cloth | Updated - current Alex Journeys branding, URL, or test expectation. |
| `src/content/posts/travel-the-world-on-a-budget.json:15` | "site": "https://alexjournly.com", | Retained - Historical WordPress source provenance, not rendered as public links. |
| `src/content/posts/travel-the-world-on-a-budget.json:16` | "url": "https://alexjournly.com/travel-the-world-on-a-budget/", | Retained - Historical WordPress source provenance, not rendered as public links. |
| `src/content/posts/travel-with-minimal-luggage.json:15` | "site": "https://alexjournly.com", | Retained - Historical WordPress source provenance, not rendered as public links. |
| `src/content/posts/travel-with-minimal-luggage.json:16` | "url": "https://alexjournly.com/travel-with-minimal-luggage/", | Retained - Historical WordPress source provenance, not rendered as public links. |
| `src/content/posts/wine-lovers-destinations.json:15` | "site": "https://alexjournly.com", | Retained - Historical WordPress source provenance, not rendered as public links. |
| `src/content/posts/wine-lovers-destinations.json:16` | "url": "https://alexjournly.com/wine-lovers-destinations/", | Retained - Historical WordPress source provenance, not rendered as public links. |
| `src/content/posts/wise-card-review.json:15` | "site": "https://alexjournly.com", | Retained - Historical WordPress source provenance, not rendered as public links. |
| `src/content/posts/wise-card-review.json:16` | "url": "https://alexjournly.com/wise-card-review/", | Retained - Historical WordPress source provenance, not rendered as public links. |
| `src/content/trip-planner/partners.json:32` | "affiliateUrlTemplate": "https://rentcars.com/en/?requestorid=9563&utm_source=fernandesjourneys.com&utm_medium=afiliado-link&utm_campaign=rent-car", | Retained - Partner attribution parameter retained; not a site destination or visible label. |
| `src/content/trip-planner/partners.json:33` | "affiliateUrl": "https://rentcars.com/en/?requestorid=9563&utm_source=fernandesjourneys.com&utm_medium=afiliado-link&utm_campaign=rent-car", | Retained - Partner attribution parameter retained; not a site destination or visible label. |
| `src/data/content.ts:3` | * Blog posts live in src/content/posts/ (migrated from alexjournly.com). | Retained - Historical comment or migration provenance; does not affect public output. |
| `src/data/destinations.ts:2` | * Past-trip destinations for Fernandes Journeys. | Retained - Historical comment or migration provenance; does not affect public output. |
| `src/lib/auth-error-redirect.ts:67` | url = new URL(location, "https://www.fernandesjourneys.com"); | Updated - current Alex Journeys branding, URL, or test expectation. |
| `src/lib/cms/github-atomic.ts:8` | const DEFAULT_REPO = "aafernands/fernandes-journeys"; | Retained - Existing package/repository identifier; not public branding. |
| `src/lib/cms/github.ts:28` | const DEFAULT_REPO = "aafernands/fernandes-journeys"; | Retained - Existing package/repository identifier; not public branding. |
| `src/lib/cms/rate-limit.ts:74` | const redisKey = 'fj:ratelimit:${key}'; | Retained - Persistent storage/cache or booking identifier retained for compatibility. |
| `src/lib/experiences.ts:22` | /** MCID already used on Fernandes Journeys Viator links. */ | Retained - Historical comment or migration provenance; does not affect public output. |
| `src/lib/flights-itinerary.ts:39` | const PENDING_KEY = "fj.plan-a-trip.pending-flights.v1"; | Retained - Persistent storage/cache or booking identifier retained for compatibility. |
| `src/lib/flights-itinerary.ts:428` | const CONFIRMATIONS_KEY = "fj.flight-confirmations.v1"; | Retained - Persistent storage/cache or booking identifier retained for compatibility. |
| `src/lib/inbound-address.ts:13` | * INBOUND_EMAIL_DOMAIN (default inbound.fernandesjourneys.com). | Retained - Inbound receiving domain unchanged; migration not established. |
| `src/lib/inbound-address.ts:16` | const DEFAULT_DOMAIN = "inbound.fernandesjourneys.com"; | Retained - Inbound receiving domain unchanged; migration not established. |
| `src/lib/outbound.ts:9` | "fernandesjourneys.com", | Retained - Legacy own-host compatibility; prevents old internal links being treated as affiliate exits. |
| `src/lib/outbound.ts:10` | "www.fernandesjourneys.com", | Retained - Legacy own-host compatibility; prevents old internal links being treated as affiliate exits. |
| `src/lib/reader-login-errors.ts:21` | ookie on the way back from x.com, so this attempt could not be verified. Stay on www.fernandesjourneys.com, use a normal window (not private browsing), and try Continue with X again.", | Updated - current Alex Journeys branding, URL, or test expectation. |
| `src/lib/search-index.ts:13` | "Meet Alex Fernandes — the traveler behind Fernandes Journeys, a personal trip journal of places already visited.", | Updated - current Alex Journeys branding, URL, or test expectation. |
| `src/lib/search-index.ts:21` | "New to Fernandes Journeys? Plan a trip and book flights and stays, or start with Places, Stories, and Guides. Gear and apps are affi | Updated - current Alex Journeys branding, URL, or test expectation. |
| `src/lib/stays-itinerary.ts:28` | const PENDING_KEY = "fj.plan-a-trip.pending-stays.v1"; | Retained - Persistent storage/cache or booking identifier retained for compatibility. |
| `src/lib/stays.ts:12` | const CLIENT_REF_RE = /^fj-[0-9a-f-]{8,80}$/i; | Retained - Persistent storage/cache or booking identifier retained for compatibility. |
| `src/lib/trip-planner-model.ts:177` | "https://rentcars.com/en/?requestorid=9563&utm_source=fernandesjourneys.com&utm_medium=afiliado-link&utm_campaign=rent-car"; | Retained - Partner attribution parameter retained; not a site destination or visible label. |
| `src/lib/trip-planner-storage.ts:12` | const CHECKS_KEY = "fj.plan-a-trip.checks.v1"; | Retained - Persistent storage/cache or booking identifier retained for compatibility. |
| `src/lib/trip-planner-storage.ts:13` | const ACTIVE_KEY = "fj.plan-a-trip.active.v1"; | Retained - Persistent storage/cache or booking identifier retained for compatibility. |
| `src/lib/trip-planner-storage.ts:14` | const BACKUP_KEY = "fj.plan-a-trip.backup.v1"; | Retained - Persistent storage/cache or booking identifier retained for compatibility. |
| `src/lib/trip-planner-storage.ts:276` | const GUEST_ORIGIN_KEY = "fj.plan-a-trip.guest-origin.v1"; | Retained - Persistent storage/cache or booking identifier retained for compatibility. |
| `src/lib/trip-planner-storage.ts:277` | const MERGE_DISMISS_KEY = "fj.plan-a-trip.merge-dismissed.v1"; | Retained - Persistent storage/cache or booking identifier retained for compatibility. |
| `src/lib/trip-planner-storage.ts:278` | const LEGACY_MERGE_FLAG = "fj.plan-a-trip.merge-offer"; | Retained - Persistent storage/cache or booking identifier retained for compatibility. |
| `src/lib/trip-planner-storage.ts:279` | const LEGACY_DISMISS_FLAG = "fj.plan-a-trip.merge-dismissed"; | Retained - Persistent storage/cache or booking identifier retained for compatibility. |
| `src/lib/viator.ts:1` | /** Viator Orion partner widgets recovered from alexjournly.com. */ | Retained - Historical comment or migration provenance; does not affect public output. |
