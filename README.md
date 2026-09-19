# Fernandes Journeys — Travel Blog

Alex’s personal travel blog for real journeys, destinations, and notes from the road. Built as **Fernandes Journeys** — a finished first version you can deploy and customize.

**Live:** [travel-lifestyle-site.vercel.app](https://travel-lifestyle-site.vercel.app)  
**Repo:** [github.com/aafernands/travel-lifestyle-site](https://github.com/aafernands/travel-lifestyle-site)

## Stack

- **Next.js** (App Router) + **TypeScript**
- **Tailwind CSS** v4
- **next/font** — Cormorant Garamond (display) + DM Sans (body)
- Blog posts as cleaned JSON under `src/content/posts/`
- Remote images from **WordPress/CDN** (alexjournly.com, i0.wp.com) and Unsplash for the hero

## WordPress migration

Blog content was migrated from the WordPress site **[alexjournly.com](https://alexjournly.com)** (REST API export).

- Source inventory: see `/workspace/wp-migration/` locally (or re-export from WP)
- Migration script: `scripts/migrate-wp-posts.mjs`
- Output: `src/content/posts/*.json` (30 posts) + `_index.json`
- Original publish dates and slugs are preserved
- HTML is cleaned (scripts, tracking widgets, WP class noise removed; headings, paragraphs, lists, images, and links kept)
- Featured images remain remote URLs for v1

Re-run the migrator if the source JSON is updated:

```bash
node scripts/migrate-wp-posts.mjs
```

## Design

- Warm ivory / cream canvas with charcoal ink, terracotta accents, and soft sage
- Editorial typography and generous spacing
- Mobile-first layout, sticky header, restrained hover/fade motion
- Semantic HTML, visible focus rings, skip link, and `prefers-reduced-motion` support

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Other scripts:

```bash
npm run build   # production build
npm run start   # serve the production build
npm run lint    # ESLint
```

## Customize content

| What | Where |
| --- | --- |
| Site name, hero, about, favorites | `src/data/content.ts` |
| Destinations tree | `src/data/destinations.ts` |
| Blog posts | `src/content/posts/` |
| Homepage featured posts | `src/content/posts/_index.json` → `featuredHomepage` |

Sections are React components under `src/components/`. Blog routes: `/blog` and `/blog/[slug]`.

## Deploy (Vercel)

1. Push this repo to GitHub (already set up for `aafernands/travel-lifestyle-site`).
2. Import the project in [Vercel](https://vercel.com/new).
3. Framework preset: **Next.js** — build command `npm run build`, output handled automatically.
4. Deploy. Optional: add a custom domain in the Vercel project settings.

You can also deploy with the Vercel CLI:

```bash
npx vercel
```

## Image attribution

- **Blog featured / inline images:** hosted on alexjournly.com / Jetpack CDN (`i0.wp.com`) from the WordPress migration.
- **Hero:** [Travel journal](https://unsplash.com/photos/X5BWooeOZew) on Unsplash (photo-1488646953014-85cb44e25828). Unsplash [License](https://unsplash.com/license): free to use; attribution appreciated but not required.

## Project structure

```
src/
  app/             # App Router — home, /blog, /destinations
  components/      # Header, Hero, Stories, About, blog cards, …
  content/posts/   # Migrated post JSON
  data/            # Site copy + destinations
  lib/posts.ts     # Post loaders
scripts/
  migrate-wp-posts.mjs
```

## Notes

- Newsletter form is UI-only (prevents default submit). Wire to Buttondown, Mailchimp, Resend, etc. when ready.
- Social links and `hello@fernandesjourneys.com` are placeholders.
