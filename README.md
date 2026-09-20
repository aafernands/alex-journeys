# Fernandes Journeys — Travel Blog

Alex Fernandes’s personal travel journal — destinations from past trips, trip notes, and photos from the road. User-facing brand **Fernandes Journeys** (logo PNG may still show the old alex journly wordmark until replaced).

**Live:** [fernandes-journeys.vercel.app](https://fernandes-journeys.vercel.app)  
**Repo:** [github.com/aafernands/fernandes-journeys](https://github.com/aafernands/fernandes-journeys)

## Stack

- **Next.js** (App Router) + **TypeScript**
- **Tailwind CSS** v4
- **next/font** — Montserrat (display) + Open Sans (body)
- Blog posts as cleaned JSON under `src/content/posts/`
- Static pages (About, Contact, Start here, Media kit, legal, Tools) under `src/content/pages/`
- Pillars: Places (`/destinations`), Stories (`/blog`), Guides (`/guides`), plus Tools (`/tools`)
- Also: `/start-here`, `/contact`, `/about`, `/media-kit`
- Thin leftovers `/culinary`, `/bucket-list`, `/travel-wallet` permanently redirect into Guides
- Unpublished draft: `src/content/drafts/` (not listed on /blog)
- Images are **project-hosted** under `public/media/` (plus Unsplash for a few stock shots)

## WordPress migration (complete)

Blog content was migrated from **[alexjournly.com](https://alexjournly.com)** (REST API export). **Media CDN migration is complete** — former WordPress/Jetpack (`i0.wp.com`) assets now live under `public/media/migrated/` and content references `/media/migrated/...`. Publishing stays on **GitHub** (CMS → GitHub → Vercel); WordPress is no longer used for runtime assets.

- Post migration script: `scripts/migrate-wp-posts.mjs` (historical)
- CDN asset migration: `scripts/migrate-cdn-assets.mjs`
- Output: `src/content/posts/*.json` (30 posts) + `_index.json`
- Original publish dates and slugs are preserved

```bash
node scripts/migrate-wp-posts.mjs
node scripts/migrate-cdn-assets.mjs
```

## Design

Restyled to match the WordPress editorial look (with fixes):

- Light, photo-led travel editorial — full-bleed hero, uppercase Montserrat headlines
- Accent orange `#F97316` for primary CTAs only; link blue `#2192DD`; surfaces `#E7EBF0`
- Sticky header: transparent over hero → frosted white after scroll; logo wordmark in header
- Destination **photo** pills; **Hidden Gems** featured tray; Traveler’s Journal footer
- Post pages: dark full-bleed hero, byline, 18/27 body, disclosure + TOC
- **Not** copied: fixed orange dock, stuck weather widget, Elementor clutter, dual hamburger+nav

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

```bash
npm run build
```


## Outbound links

External and affiliate links pause briefly on **`/out?to=…`** (departure interstitial) before redirecting. See [`docs/OUTBOUND.md`](docs/OUTBOUND.md).

## Deploy

Connected to Vercel from `main`. Push to deploy.

## Reader accounts, saved posts & comments

Public **Sign in** (email/password or Google) in the header; readers manage saved posts on **Account** (`/account`). Password reset uses Resend — see [`docs/READER-AUTH.md`](docs/READER-AUTH.md). Saved posts setup: [`docs/READER-SAVED-POSTS.md`](docs/READER-SAVED-POSTS.md).

Post pages include **Share**, **Comments** (jump), and a moderated comment thread. Comments need Firestore (same env as saved posts) and are approved in **CMS → Comments**. See [`docs/COMMENTS.md`](docs/COMMENTS.md).

Public forms (newsletter, contact, register, forgot password) use Cloudflare Turnstile when configured — see [`docs/TURNSTILE.md`](docs/TURNSTILE.md).

## Analytics

Google Analytics 4 (gtag) loads only when `NEXT_PUBLIC_GA_MEASUREMENT_ID` (or alias `NEXT_PUBLIC_GA_ID`) is set at build time. Optional Search Console HTML-tag verification uses `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION`. Setup, Vercel Production, and redeploy steps: [`docs/ANALYTICS.md`](docs/ANALYTICS.md).

## In-site CMS

Passcode-gated editor at **`/cms`** (not linked in the public header). Publishes posts to GitHub so Vercel redeploys.

1. Set `CMS_PASSCODE` and `CMS_GITHUB_TOKEN` on Vercel (and in local `.env.local`).
2. Visit `/cms`, unlock, create or edit a post, publish.
3. Full setup: [`docs/CMS.md`](docs/CMS.md).
