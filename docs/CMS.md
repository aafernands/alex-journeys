# In-site CMS

Passcode- and OAuth-gated editor at **`/cms`** for publishing blog posts and destinations (map + climate) to GitHub. There is **no public header link** — bookmark `/cms` directly.

Auth lives in `src/auth.ts` (Auth.js / next-auth v5) and `src/lib/cms/auth.ts` (CMS gate that ORs OAuth admin + optional passcode).

## Setup (Vercel + local)

### 1. Auth.js (Google / GitHub) — recommended

Admins sign in with Google and/or GitHub. Only emails listed in **`CMS_ADMIN_EMAILS`** can access the CMS (case-insensitive, comma-separated).

| Variable | Required | Notes |
| --- | --- | --- |
| `AUTH_SECRET` | Yes for OAuth | Random secret for signing session cookies. Generate with `openssl rand -base64 32`. |
| `AUTH_URL` | Optional | Canonical site URL, e.g. `https://www.fernandesjourneys.com`. On Vercel you can set `AUTH_TRUST_HOST=true` instead. |
| `AUTH_TRUST_HOST` | Recommended on Vercel | Set to `true` so Auth.js trusts the `Host` / `X-Forwarded-Host` headers. |
| `AUTH_GOOGLE_ID` | For Google | OAuth 2.0 Client ID from Google Cloud Console. |
| `AUTH_GOOGLE_SECRET` | For Google | OAuth 2.0 Client secret. |
| `AUTH_GITHUB_ID` | For GitHub | OAuth App Client ID. |
| `AUTH_GITHUB_SECRET` | For GitHub | OAuth App Client secret. |
| `CMS_ADMIN_EMAILS` | Yes for OAuth | e.g. `hello@alexjournly.com` (comma-separated allowlist). |

Providers are enabled only when their ID **and** secret env vars are present. Build succeeds without any of these secrets.

#### Google Cloud OAuth client

1. Open [Google Cloud Console → APIs & Services → Credentials](https://console.cloud.google.com/apis/credentials).
2. Create an **OAuth 2.0 Client ID** (Web application).
3. Authorized redirect URIs:
   - Production: `https://www.fernandesjourneys.com/api/auth/callback/google`
   - Also add apex if used: `https://fernandesjourneys.com/api/auth/callback/google`
   - Local: `http://localhost:3000/api/auth/callback/google`
4. Copy Client ID → `AUTH_GOOGLE_ID`, Client secret → `AUTH_GOOGLE_SECRET`.

#### GitHub OAuth App

1. Open [GitHub → Settings → Developer settings → OAuth Apps](https://github.com/settings/developers) → **New OAuth App**.
2. Homepage URL: `https://www.fernandesjourneys.com` (or `http://localhost:3000` for a separate local app).
3. Authorization callback URL:
   - Production: `https://www.fernandesjourneys.com/api/auth/callback/github`
   - Local: `http://localhost:3000/api/auth/callback/github`
4. Copy Client ID → `AUTH_GITHUB_ID`, generate a client secret → `AUTH_GITHUB_SECRET`.

#### Local `.env.local` example

```bash
AUTH_SECRET=replace-with-openssl-rand-base64-32
AUTH_TRUST_HOST=true
AUTH_GOOGLE_ID=...
AUTH_GOOGLE_SECRET=...
AUTH_GITHUB_ID=...
AUTH_GITHUB_SECRET=...
CMS_ADMIN_EMAILS=hello@alexjournly.com

# Optional backup (see below)
CMS_PASSCODE=your-long-secret-passcode
```

Never commit these values. Never put them in client code.

### 2. Passcode (optional backup)

Set **`CMS_PASSCODE`** if you want a passcode fallback alongside OAuth. The login UI shows **Or use passcode** under the OAuth buttons when this is set.

If neither OAuth nor passcode is configured, `/cms` shows a setup message and does not crash.

### 3. GitHub token (for publishing)

Create a fine-grained personal access token with **Contents: Read and write** on repo `aafernands/fernandes-journeys`.

Set on Vercel (and locally):

| Variable | Required | Default |
| --- | --- | --- |
| `CMS_GITHUB_TOKEN` | Yes (or `GITHUB_TOKEN`) | — |
| `CMS_GITHUB_REPO` | No | `aafernands/fernandes-journeys` |
| `CMS_GITHUB_BRANCH` | No | `main` |

### 4. Publish

1. Visit `/cms` and sign in with Google/GitHub (allowlisted email) or the passcode.
2. Open **New post**, fill title / slug / date / excerpt / HTML / optional image & destinations.
3. **Publish** commits `src/content/posts/{slug}.json` and updates `_index.json` on `main`.
4. Vercel redeploys; the story appears on `/blog` after the deploy finishes.

Edit existing posts from the dashboard (**Edit**) — same publish path with update.

### 5. Author photo

From the authenticated `/cms` dashboard, open **Author photo** (or scroll to that panel).

1. Choose a JPEG, PNG, or WebP (max ~2.5MB).
2. Preview, then **Upload author photo**.
3. The CMS commits `public/brand/alex-fernandes.{jpg|png|webp}` and updates `src/data/author-photo.json` (cache-bust query on `site.authorPhoto`).
4. After Vercel redeploys, the new photo appears on About, blog posts, Footer, homepage AuthorIntro, and media kit — no per-page code edits.

### 6. Destinations (countries, map, climate, quick facts, itinerary)

Destination pages and the header mega-menu read from **`src/content/destinations/tree.json`** (continents → countries). Types and helpers stay in `src/data/destinations.ts`.

From the authenticated `/cms` dashboard:

1. Open **Destinations** (or **New destination**).
2. Create or edit a country: name, slug, continent, region, blurb, hero image, optional trip label / featured post / highlights.
3. Optionally fill **Suggested itinerary** (title + repeatable day rows: day label, title, detail — from real trip notes only), **Quick facts** (best time, currency, language, plugs, tap water, time zone), **Map** (center, zoom, pins), and **Climate** (summary, best time, 12 monthly rows). Empty itinerary days / quick-fact fields are omitted on the page; best time falls back to Climate when the quick-facts best time is blank.
4. **Publish** commits `tree.json` with message `cms: update destinations`.
5. After Vercel redeploys, `/destinations/{slug}`, the destinations index, header menu, and sitemap pick up the change.

URLs:

| Page | Path |
| --- | --- |
| List by continent | `/cms/destinations` |
| New country | `/cms/destinations/new` |
| Edit country | `/cms/destinations/edit/{slug}` |
| API | `POST /api/cms/destinations` |

Body shape: `{ country, continentId, continentName?, update? }`. Auth + GitHub token required (same as posts).

## Security notes

- OAuth: only emails in `CMS_ADMIN_EMAILS` can sign in; `session.user.isAdmin` is set in Auth.js JWT/session callbacks.
- Passcode (optional): checked only on the server (`POST /api/cms/login`). Cookie is httpOnly, `SameSite=lax`, `Secure` in production; payload is HMAC-signed with the passcode.
- `isCmsAuthenticated()` is true if either an Auth.js admin session **or** a valid passcode cookie is present.
- Login is lightly rate-limited in memory (passcode path).
- Slugs are sanitized (kebab-case only); path traversal is rejected.
- CMS layout sets `robots: noindex`.

## How Alex publishes

1. Ensure env vars are set on Vercel (Auth.js + allowlist, optional passcode, GitHub token).
2. Go to `https://www.fernandesjourneys.com/cms`.
3. **Continue with Google** or **Continue with GitHub** (or unlock with the passcode).
4. **New post** → fill form → **Publish to GitHub**.
5. Wait for the Vercel deploy, then open `/blog/{slug}`.
6. To change the author headshot: **Author photo** on the dashboard → upload → wait for redeploy.
7. To add or edit a destination: **Destinations** → **New destination** (or Edit) → fill itinerary / quick facts / map / climate as needed → **Publish** → wait for redeploy → open `/destinations/{slug}`.
