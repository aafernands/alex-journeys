# In-site CMS

Passcode- and OAuth-gated editor at **`/cms`** for publishing blog posts, CMS pages, destinations (map + climate), the media library, and the author photo to GitHub. There is **no public header link** — bookmark `/cms` directly.

Auth lives in `src/auth.ts` (Auth.js / next-auth v5) and `src/lib/cms/auth.ts` (CMS gate that ORs OAuth admin + optional passcode).

## CMS navigation

After sign-in, the shell provides:

| Section | Path | Purpose |
| --- | --- | --- |
| Dashboard | `/cms` | Stats, publish readiness, recent posts, drafts, quick actions |
| Posts | `/cms/posts` | Search/filter, edit, duplicate, delete; drafts + published |
| New / Edit post | `/cms/new`, `/cms/edit/[slug]` | Editor with SEO excerpt guidance, image preview, draft/publish, ⌘/Ctrl+S |
| Pages | `/cms/pages` | List/create/edit/delete JSON pages under `src/content/pages` |
| Destinations | `/cms/destinations` | Countries, map, climate, itinerary → `tree.json` |
| Media | `/cms/media` | Post image library + author photo |
| Help | `/cms/help` | Short publish checklist |

CMS layout sets `robots: noindex`.

## Setup (Vercel + local)

### 1. Auth.js (Google / GitHub) — recommended

Admins sign in with Google and/or GitHub. Only emails listed in **`CMS_ADMIN_EMAILS`** can access the CMS (case-insensitive, comma-separated).

| Variable | Required | Notes |
| --- | --- | --- |
| `AUTH_SECRET` | Yes for OAuth | Random secret for signing session cookies. Generate with `openssl rand -base64 32`. |
| `AUTH_URL` | Optional | Canonical site URL, e.g. `https://www.fernandesjourneys.com`. On Vercel you can set `AUTH_TRUST_HOST=true` instead. |
| `AUTH_TRUST_HOST` | Recommended on Vercel | Set to `true` so Auth.js trusts the `Host` / `X-Forwarded-Host` headers. |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | For Google | OAuth 2.0 client from Google Cloud Console. |
| `AUTH_GITHUB_ID` / `AUTH_GITHUB_SECRET` | For GitHub | OAuth App credentials. |
| `CMS_ADMIN_EMAILS` | Yes for OAuth | e.g. `hello@alexjournly.com` |

Redirect URIs: `https://www.fernandesjourneys.com/api/auth/callback/{google\|github}` and local `http://localhost:3000/api/auth/callback/...`.

### 2. Passcode (optional backup)

Set **`CMS_PASSCODE`** for a passcode fallback. Login shows **Or use passcode** when set.

### 3. GitHub token (for publishing)

Fine-grained PAT with **Contents: Read and write** on `aafernands/fernandes-journeys`.

| Variable | Required | Default |
| --- | --- | --- |
| `CMS_GITHUB_TOKEN` | Yes (or `GITHUB_TOKEN`) | — |
| `CMS_GITHUB_REPO` | No | `aafernands/fernandes-journeys` |
| `CMS_GITHUB_BRANCH` | No | `main` |

Never commit secrets. Never put them in client code. The dashboard only shows configured / missing — never values.

## Publishing flows

### Posts (stories)

1. **New post** → title (slug auto), date, excerpt (counter + ~150–160 SEO guidance), featured image preview, destinations, rich text (headings, lists, links, images, undo, HTML mode).
2. **Save draft** → `src/content/drafts/{slug}.json`.
3. **Publish** → `src/content/posts/{slug}.json` + `_index.json`; matching draft is removed when present.
4. Vercel redeploys → live at `/{slug}`.

Posts list supports search, destination filter, status (published/draft), View live, Edit, Duplicate, Delete (GitHub delete + index update).

### Pages (CMS-editable)

JSON under `src/content/pages/` loaded by App Router routes that call `getPageBySlug`:

| Slug | Public path |
| --- | --- |
| `culinary` | `/culinary` |
| `policies` | `/policies` |
| `travel-wallet` | `/travel-wallet` |

Create/edit/delete from **Pages**. New slugs need a matching `src/app/{slug}/page.tsx` that reads the JSON (or they will 404).

#### Code-only routes (not JSON-editable)

Homepage, About, Contact, Start here, Bucket list, Guides, Tools, Media kit, Destinations index, Blog index, Search — see `CODE_ONLY_PAGE_ROUTES` in `src/lib/pages.ts` and the CMS Help page.

### Destinations

Edits commit `src/content/destinations/tree.json` (`cms: update destinations`). Includes map pins, climate months, quick facts, suggested itinerary. Public country pages live at `/{slug}` (same pattern as posts). Index hubs stay at `/blog` and `/destinations`. Legacy `/blog/{slug}` and `/destinations/{slug}` permanently redirect to `/{slug}`.

### Media library

**Media** (`/cms/media`) indexes images from published posts (featured + inline `contentHtml`) into `src/content/media/_index.json`. Post and site assets are **project-hosted** under `public/media/` (including `public/media/migrated/` from the WordPress CDN migration). New uploads go to `public/media/`.

| Action | How |
| --- | --- |
| Browse / search / filter | Library tab — by source (upload / external) and used-in |
| Copy URL / edit alt / see used-by | Click a thumbnail in the detail panel |
| Add by URL | Form on Library tab → commits index via GitHub |
| Upload file | Same form → `public/media/{filename}` + index entry |
| Rescan | **Rescan posts → index** rebuilds `usedBy` from current posts/pages |
| Seed locally | `npm run seed:media` |

Post editor: featured image **Choose from library**; rich text **Image** opens the picker ( **URL** still pastes a link).

### Author photo

**Media → Author photo** tab → upload JPEG/PNG/WebP → commits `public/brand/alex-fernandes.*` + `src/data/author-photo.json`.

## Security notes

- OAuth: Google is open to **public readers**; CMS still requires `CMS_ADMIN_EMAILS` (`session.user.isAdmin`) or passcode. Reader sessions alone never unlock `/cms`.
- Passcode: server-only check; httpOnly cookie, HMAC-signed; never logged.
- `isCmsAuthenticated()` = OAuth admin **or** passcode session.
- Slugs sanitized (kebab-case); path traversal rejected.
- CMS layout: `robots: noindex`.

Public reader save/bookmarks: see [`READER-SAVED-POSTS.md`](./READER-SAVED-POSTS.md).

## How Alex publishes

1. Env vars on Vercel (Auth.js + allowlist, optional passcode, GitHub token).
2. Go to `https://www.fernandesjourneys.com/cms` → sign in.
3. Dashboard → check publish readiness → **New post** or open Posts/Pages/Destinations/Media.
4. Publish → wait for Vercel → open the live URL.
