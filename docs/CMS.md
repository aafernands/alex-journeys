# In-site CMS

Passcode- and OAuth-gated editor at **`/cms`** for publishing blog posts, CMS pages, destinations (map + climate), the media library, homepage website design (hero), and the author photo to GitHub. Signed-in admins also get **Admin console** in the header avatar menu (hidden for non-admin readers).

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
| Website design | `/cms/design` | Brand logos (black on light, white on dark), homepage hero, featured slideshow, section chrome |
| Help | `/cms/help` | Short publish checklist |

CMS layout sets `robots: noindex`.

## Setup (Vercel + local)

### 1. Auth.js (Google / GitHub) — recommended

Admins sign in with Google and/or GitHub. Only emails listed in **`CMS_ADMIN_EMAILS`** can access the CMS (case-insensitive, comma-separated).

| Variable | Required | Notes |
| --- | --- | --- |
| `AUTH_SECRET` | Yes for OAuth | Random secret for signing session cookies. Generate with `openssl rand -base64 32`. |
| `AUTH_URL` | Set on Production | `https://www.fernandesjourneys.com` (no path). Auth.js uses it for the OAuth callback host. Remove `NEXTAUTH_URL` if it disagrees. `AUTH_TRUST_HOST=true` does not override a wrong value. www vs apex, and the X `users/me` 403: [`docs/X-SIGN-IN.md`](./X-SIGN-IN.md). |
| `AUTH_TRUST_HOST` | Recommended on Vercel | Set to `true` so Auth.js trusts the `Host` / `X-Forwarded-Host` headers. |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | For Google | OAuth 2.0 client from Google Cloud Console. |
| `AUTH_GITHUB_ID` / `AUTH_GITHUB_SECRET` | For GitHub | OAuth App credentials. |
| `AUTH_TWITTER_ID` / `AUTH_TWITTER_SECRET` | For reader X sign-in only | OAuth 2.0 Client ID and Client Secret from the X Developer Portal. Does **not** unlock `/cms`. See [`docs/X-SIGN-IN.md`](./X-SIGN-IN.md). |
| `CMS_ADMIN_EMAILS` | Yes for OAuth | Comma-separated allowlist, e.g. `fernandesjourneys@gmail.com` (must include this address on Vercel for Admin console to appear in the header menu). |

Redirect URIs: `https://www.fernandesjourneys.com/api/auth/callback/{google\|github}` and local `http://localhost:3000/api/auth/callback/...`.

X (Twitter) is a **public reader** provider only. It is not shown on the CMS login, and an X session never sets `isAdmin`. Checklist: [`docs/X-SIGN-IN.md`](./X-SIGN-IN.md).

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

1. **New post** → title (slug auto), date, excerpt (counter + ~150–160 SEO guidance), featured image preview, destinations (Place pages), optional **Guides → Plan a trip**, rich text story Content, optional **Trip timeline** (structured day-by-day itinerary — separate from Content HTML; renders as a public timeline).
2. **Save draft** → `src/content/drafts/{slug}.json`.
3. **Publish** → `src/content/posts/{slug}.json` + `_index.json`; matching draft is removed when present.
4. Vercel redeploys → live at `/{slug}`.

**Widgets:** In the Content toolbar, **Widget** inserts a Viator partner card or a Custom HTML embed at the cursor. Viator asks for the partner id (prefilled from `VIATOR_PARTNER_ID`) and the `W-…` widget ref from the partner dashboard — not the script tag, and not tour copy. The public post loads the Viator script when a widget div is present. Custom HTML is stored in `div.cms-html-embed` so empty divs and iframes survive the visual editor. Script tags in that HTML are kept but do not run on the public page.

**Experiences page:** `/experiences` uses one Dynamic widget for whatever destination Plan a Trip passes (`?dest=`). Paste that widget’s `W-…` ref into `dynamicWidgetRef` in `src/content/experiences/viator.json`, or set `VIATOR_DYNAMIC_WIDGET_REF`. Partner id stays `P00143772` unless `VIATOR_PARTNER_ID` overrides it. Name the widget `plan-experiences` in Widgets Hub so it matches `data-vi-campaign`. Book Now inside the widget is not sent through `/out` (the iframe keeps the partner id). The “browse on Viator” text link still uses `/out?to=…&aff=1`.

Posts list supports search, destination filter, status (published/draft), View live, Edit, Duplicate, Delete (GitHub delete + index update).

### Pages (CMS-editable)

JSON under `src/content/pages/` loaded by App Router routes via `getPageBySlug` / `getPageWithFallback` (fallback defaults in `src/lib/page-defaults.ts` so builds never blank). Optional `sections` object holds structured extras (form labels, hub steps, media-kit stats, disclosure blurbs).

| Slug | Public path | Notes |
| --- | --- | --- |
| `about` | `/about` | Photo stays from Author photo CMS; body + next-step CTAs editable |
| `contact` | `/contact` | Intro + form labels/success copy via sections; form stays React |
| `start-here` | `/start-here` | Intro + step cards via sections |
| `media-kit` | `/media-kit` | Full kit copy + stats/lists via contentHtml + sections |
| `app` | `/app` | OAuth purpose page (kept for Google branding; not in primary nav/footer) |
| `guides` | `/guides` | Hub intro only; guide cards stay data-driven |
| `tools` | `/tools` | Intro + affiliate disclosure blurb; tool cards from nav data |
| `destinations` | `/destinations` | Index intro only; tree stays Destinations CMS |
| `blog` | `/blog` | Index intro only; posts from Posts CMS |
| `policies` | `/policies` | Legal hub (hash redirects); demoted from footer |
| `privacy` | `/privacy` | |
| `terms` | `/terms` | |
| `affiliate-disclosure` | `/affiliate-disclosure` | |

Phase D redirects (JSON may remain as archive; public URLs 301): `culinary` and `bucket-list` → `/guides/experiences`; `travel-wallet` → `/guides/money-budget`.

Create/edit/delete from **Pages**. Known slugs have explicit routes. **New CMS-only slugs** without a dedicated `src/app/{slug}/page.tsx` are served by the catch-all `src/app/[slug]/page.tsx` when they do not collide with a post or destination (and are not reserved app routes).

#### Code-only / app routes (not marketing Pages)

`/account`, `/login`, `/forgot-password`, `/reset-password`, `/search`, `/cms/*`, `/api/*` — see `CODE_ONLY_PAGE_ROUTES`. Individual posts and destination country pages use **Posts** and **Destinations**, not Pages.

### Destinations

Edits commit `src/content/destinations/tree.json` (`cms: update destinations`). Includes map pins, climate months, quick facts, suggested itinerary. Public country pages live at `/{slug}` (same pattern as posts). Index hubs stay at `/blog` and `/destinations`. Legacy `/blog/{slug}` and `/destinations/{slug}` permanently redirect to `/{slug}`.

### Media library

**Media** (`/cms/media`) indexes images from published posts (featured + inline `contentHtml`) into `src/content/media/_index.json`. Post and site assets are **project-hosted** under `public/media/` (including `public/media/migrated/` from the WordPress CDN migration). New uploads go to `public/media/`.

| Action | How |
| --- | --- |
| Browse / search / filter | Library tab — by source (upload / external) and used-in |
| Copy URL / edit alt / see used-by | Click a thumbnail in the detail panel |
| Add by URL | Form on Library tab → commits index via GitHub |
| Upload file | Same form → client-side compress (longest edge ~2048px, JPEG/WebP ~0.82) then `public/media/{filename}` + index entry · hard max ~8MB |
| Rescan | **Rescan posts → index** rebuilds `usedBy` from current posts/pages |
| Seed locally | `npm run seed:media` |

Post editor: featured image **Choose from library**; rich text **Image** opens the picker ( **URL** still pastes a link).

### Author photo

**Media → Author photo** tab → upload JPEG/PNG/WebP → commits `public/brand/alex-fernandes.*` + `src/data/author-photo.json`.

### Website design (brand logos + homepage)

**Website design** (`/cms/design`) edits `src/data/site-design.json` (Git-backed like the author photo).

| Control | Notes |
| --- | --- |
| Brand logos | **Logo on light** (black mark) and **Logo on dark** (white mark). Library pick or upload → `public/brand/logo-on-light.*` / `logo-on-dark.*`. Defaults: `/brand/logo-fernandes-journeys.png` and `/brand/logo-fernandes-journeys-white.png`. Header uses both (theme); footer always uses the white mark. JSON-LD organization logo uses the black mark. |
| Hero image | Full-bleed headline photo only. Library or upload → `public/media/hero-…` |
| Alt + location label | Small location label on the hero photo |
| Eyebrow, tagline, subtitle | Copy over the hero photo |
| Primary / secondary CTAs | Label + href |
| Object position / overlay | Fine-tune crop and soft darken |
| “From the road” strip | Show/hide + labels under hero CTAs |
| Featured slideshow | Separate field-note card under the hero. Add/remove/reorder slides; each slide has image (library or upload), alt, caption, note, badge, optional stats, optional story link |
| Homepage sections | Start here (incl. cards JSON), Places, Latest stories, Guides, Tools, OAuth note, Author intro (incl. portrait via media library) |

Theme tokens (fonts/colors) UI is intentionally out of scope for now — stub note on the Design page.

## Security notes

- OAuth: Google is open to **public readers**; CMS still requires `CMS_ADMIN_EMAILS` (`session.user.isAdmin`) or passcode. Reader sessions alone never unlock `/cms`. The header **Admin console** item is shown only when `session.user.isAdmin` is true — ensure `CMS_ADMIN_EMAILS` includes `fernandesjourneys@gmail.com` on Vercel.
- Passcode: server-only check; httpOnly cookie, HMAC-signed; never logged.
- `isCmsAuthenticated()` = OAuth admin **or** passcode session.
- Slugs sanitized (kebab-case); path traversal rejected.
- CMS layout: `robots: noindex`.

Public reader save/bookmarks: see [`READER-SAVED-POSTS.md`](./READER-SAVED-POSTS.md).

## How Alex publishes

1. Env vars on Vercel (Auth.js + allowlist, optional passcode, GitHub token).
2. Go to `https://www.fernandesjourneys.com/cms` → sign in.
3. Dashboard → check publish readiness → **New post**, Posts/Pages/Destinations/Media, or **Website design** for brand logos and the homepage hero.
4. Publish → wait for Vercel → open the live URL.
