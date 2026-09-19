# Alex Journly — Travel & Lifestyle Site

A polished personal travel & lifestyle website with an editorial, magazine-inspired aesthetic. Built for **Alex Journly** as a finished first version you can deploy and customize.

**Live repo:** [github.com/aafernands/travel-lifestyle-site](https://github.com/aafernands/travel-lifestyle-site)

## Stack

- **Next.js** (App Router) + **TypeScript**
- **Tailwind CSS** v4
- **next/font** — Cormorant Garamond (display) + DM Sans (body)
- Remote images from **Unsplash** (see attribution below)

## Design

- Warm ivory / cream canvas with charcoal ink, terracotta accents, and soft sage
- Editorial typography and generous spacing (travel magazine × personal brand)
- Mobile-first layout, sticky header, restrained hover/fade motion
- Semantic HTML, visible focus rings, skip link, and `prefers-reduced-motion` support
- Sample content clearly labeled so you can replace it safely

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

Edit placeholder copy, stories, favorites, and social links in:

```
src/data/content.ts
```

Sections are React components under `src/components/`.

## Deploy (Vercel)

1. Push this repo to GitHub (already set up for `aafernands/travel-lifestyle-site`).
2. Import the project in [Vercel](https://vercel.com/new).
3. Framework preset: **Next.js** — build command `npm run build`, output handled automatically.
4. Deploy. Optional: add a custom domain in the Vercel project settings.

You can also deploy with the Vercel CLI:

```bash
npx vercel
```

## Image attribution (Unsplash)

Hero and story images use free Unsplash URLs. Photographers / links (replace with your own assets anytime):

| Use | Unsplash photo |
| --- | --- |
| Hero | [Travel journal](https://unsplash.com/photos/X5BWooeOZew) — photo-1488646953014-85cb44e25828 |
| Kyoto | [Japanese temple](https://unsplash.com/photos/8wTPqxlnKM4) — photo-1493976040374-85c8e12f0c0e |
| Amalfi | [Positano coastline](https://unsplash.com/photos/U6t80TW_CYM) — photo-1516483638261-f4dbaf036963 |
| Marrakech | [Moroccan architecture](https://unsplash.com/photos/t7K4aafF4gA) — photo-1539020140153-e479b8c22e70 |
| Patagonia | [Mountain night](https://unsplash.com/photos/pYYuCDfndD4) — photo-1519681393784-d120267933ba |
| About | [Traveler alley](https://unsplash.com/photos/M4Xloxnf0b0) — photo-1527631746610-bca00a040d60 |

Unsplash [License](https://unsplash.com/license): free to use; attribution appreciated but not required.

## Project structure

```
src/
  app/           # App Router layout + home page
  components/    # Header, Hero, Stories, About, Favorites, Newsletter, Footer
  data/          # Site copy and sample content
```

## Notes

- Newsletter form is UI-only (prevents default submit). Wire to Buttondown, Mailchimp, Resend, etc. when ready.
- Social links and `hello@alexjournly.com` are placeholders.
