# In-site CMS

Passcode-gated editor at **`/cms`** for publishing blog posts and destinations (map + climate) to GitHub. There is **no public header link** — bookmark `/cms` directly.

Auth lives in `src/lib/cms/auth.ts` so you can later swap the passcode for real admin auth without rewriting pages.

## Setup (Vercel + local)

### 1. Passcode

Set **`CMS_PASSCODE`** in the Vercel project environment (Production + Preview as needed).

Locally, create `.env.local` (already gitignored via `.env*`):

```bash
CMS_PASSCODE=your-long-secret-passcode
```

Never commit this value. Never put it in client code.

If unset, `/cms` shows a setup message and does not crash.

### 2. GitHub token

Create a fine-grained personal access token with **Contents: Read and write** on repo `aafernands/fernandes-journeys`.

Set on Vercel (and locally):

| Variable | Required | Default |
| --- | --- | --- |
| `CMS_GITHUB_TOKEN` | Yes (or `GITHUB_TOKEN`) | — |
| `CMS_GITHUB_REPO` | No | `aafernands/fernandes-journeys` |
| `CMS_GITHUB_BRANCH` | No | `main` |

### 3. Publish

1. Visit `/cms` and enter the passcode (httpOnly cookie `fj_cms`, ~7 days).
2. Open **New post**, fill title / slug / date / excerpt / HTML / optional image & destinations.
3. **Publish** commits `src/content/posts/{slug}.json` and updates `_index.json` on `main`.
4. Vercel redeploys; the story appears on `/blog` after the deploy finishes.

Edit existing posts from the dashboard (**Edit**) — same publish path with update.

### 4. Later: real auth

Replace `src/lib/cms/auth.ts` (login cookie + `isCmsAuthenticated`) with your admin provider. Keep the same function names where possible so `/cms` pages and `/api/cms/*` stay stable.


### 5. Author photo

From the authenticated `/cms` dashboard, open **Author photo** (or scroll to that panel).

1. Choose a JPEG, PNG, or WebP (max ~2.5MB).
2. Preview, then **Upload author photo**.
3. The CMS commits `public/brand/alex-fernandes.{jpg|png|webp}` and updates `src/data/author-photo.json` (cache-bust query on `site.authorPhoto`).
4. After Vercel redeploys, the new photo appears on About, blog posts, Footer, homepage AuthorIntro, and media kit — no per-page code edits.



### 6. Destinations (countries, map, climate)

Destination pages and the header mega-menu read from **`src/content/destinations/tree.json`** (continents → countries). Types and helpers stay in `src/data/destinations.ts`.

From the authenticated `/cms` dashboard:

1. Open **Destinations** (or **New destination**).
2. Create or edit a country: name, slug, continent, region, blurb, hero image, optional trip label / featured post / highlights.
3. Optionally fill **Map** (center, zoom, pins) and **Climate** (summary, best time, 12 monthly rows).
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

- Passcode is checked only on the server (`POST /api/cms/login`).
- Cookie is httpOnly, `SameSite=lax`, `Secure` in production; payload is HMAC-signed with the passcode.
- Login is lightly rate-limited in memory.
- Slugs are sanitized (kebab-case only); path traversal is rejected.
- CMS layout sets `robots: noindex`.

## How Alex publishes

1. Ensure env vars are set on Vercel.
2. Go to `https://<your-domain>/cms`.
3. Unlock with the passcode.
4. **New post** → fill form → **Publish to GitHub**.
5. Wait for the Vercel deploy, then open `/blog/{slug}`.
6. To change the author headshot: **Author photo** on the dashboard → upload → wait for redeploy.
7. To add or edit a destination: **Destinations** → **New destination** (or Edit) → fill map/climate as needed → **Publish** → wait for redeploy → open `/destinations/{slug}`.
