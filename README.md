# Fernandes Journeys — Travel Blog

Alex Fernandes’s personal travel journal — destinations from past trips, trip notes, and photos from the road. User-facing brand **Fernandes Journeys** (logo PNG may still show the old alex journly wordmark until replaced).

**Live:** [travel-lifestyle-site.vercel.app](https://travel-lifestyle-site.vercel.app)  
**Repo:** [github.com/aafernands/travel-lifestyle-site](https://github.com/aafernands/travel-lifestyle-site)

## Stack

- **Next.js** (App Router) + **TypeScript**
- **Tailwind CSS** v4
- **next/font** — Montserrat (display) + Open Sans (body)
- Blog posts as cleaned JSON under `src/content/posts/`
- Static pages (policies, culinary, travel-wallet) under `src/content/pages/`
- Pillars: Places (`/destinations`), Stories (`/blog`), Guides (`/guides`), Tools (`/tools`)
- Also: `/bucket-list`, `/start-here`, `/contact`
- Unpublished draft: `src/content/drafts/` (not listed on /blog)
- Remote images from **WordPress/CDN** (alexjournly.com, i0.wp.com) and Unsplash

## WordPress migration

Blog content was migrated from **[alexjournly.com](https://alexjournly.com)** (REST API export).

- Migration script: `scripts/migrate-wp-posts.mjs`
- Output: `src/content/posts/*.json` (30 posts) + `_index.json`
- Original publish dates and slugs are preserved
- Featured images remain remote URLs for v1

```bash
node scripts/migrate-wp-posts.mjs
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

## Deploy

Connected to Vercel from `main`. Push to deploy.

## In-site CMS

Passcode-gated editor at **`/cms`** (not linked in the public header). Publishes posts to GitHub so Vercel redeploys.

1. Set `CMS_PASSCODE` and `CMS_GITHUB_TOKEN` on Vercel (and in local `.env.local`).
2. Visit `/cms`, unlock, create or edit a post, publish.
3. Full setup: [`docs/CMS.md`](docs/CMS.md).
