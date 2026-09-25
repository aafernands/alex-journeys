# Design audit (Phase 1)

Audit only. No app code, styles, or components were changed.

Alex Journeys should feel as organized as Google Flights on a phone: one spacing scale, one card anatomy, a short type scale, matching control heights, shared alignment, a 1px border, little shadow, and a single accent reserved for the primary action. The warm paper palette, Outfit and Inter, and frosted-glass chrome stay.

Reference: iPhone screenshots of Google Flights (organization only, not Google’s visual style).

Captured at **390×844 CSS pixels, deviceScaleFactor 2** (image files are 780×1688). Local Next.js on 25 Sep 2026. Sample trip “Lisbon in October” was written to `localStorage` (`fj.plan-a-trip.active.v1`) so Plan a Trip could be opened with itinerary, bookings, and packing data.

## What was not reachable

These need live keys that are not set in this environment. They were not mocked.

| Surface | Why | What was captured instead |
| --- | --- | --- |
| Stays results, hotel detail, checkout, confirmation | `LITEAPI_API_KEY` unset. The page shows “Stays not configured”. | Empty stays (`32`) and the Lisbon search form (`33`). |
| Flights results, book, payment, confirmation | Same Nuitee key. | Empty flights (`34`) and a filled EWR→LIS search (`35`), plus the not-configured notice. |
| Signed-in account, saved trips, saved hotels | No reader session or Firebase. | Signed-out account (`21`), sign-in (`20`), forgot password (`22`). |
| Viator results grid | Widget is partner-hosted. | Experiences empty (`36`) and Lisbon with the existing Viator outbound button (`37`). Affiliate URLs were not edited. |

## Screenshot index

All files are in [`screenshots/`](screenshots/).

| File | Screen |
| --- | --- |
| `01-home.png` | Home, hero |
| `02-home-mid.png` | Home, Start here |
| `03-home-stories.png` | Home, stories and tools strips |
| `04-footer.png` | Footer and newsletter |
| `05-journal-index.png` | Journal index |
| `06-journal-index-scrolled.png` | Journal index, next cards |
| `07-journal-post.png` | Journal post (Toronto) |
| `08-journal-post-body.png` | Journal post, article body |
| `09-guides-index.png` | Guides index |
| `10-guide-money.png` | Guide hub, Money & budget |
| `11-places.png` | Places index |
| `12-place-iceland.png` | Place page, Iceland |
| `13-place-iceland-scrolled.png` | Iceland, below the hero |
| `14-start-here.png` | Start here |
| `15-tools.png` | Tools |
| `16-tools-scrolled.png` | Tools, next cards |
| `17-about.png` | About |
| `18-contact.png` | Contact |
| `19-search.png` | Search results for “lisbon” |
| `20-login.png` | Sign in |
| `21-account.png` | Account, signed out |
| `22-forgot-password.png` | Forgot password |
| `23-nav-drawer.png` | Menu drawer |
| `24-nav-drawer-places.png` | Menu, Places open |
| `25-search-panel.png` | Header search panel |
| `26-plan-empty.png` | Plan a Trip, empty setup |
| `27-plan-overview.png` | Plan a Trip, overview with data |
| `28-plan-itinerary.png` | Itinerary tab |
| `29-plan-bookings.png` | Bookings tab |
| `30-plan-packing.png` | Packing tab |
| `31-plan-add-menu.png` | Add to trip menu |
| `32-stays-empty.png` | Stays, no destination |
| `33-stays-search.png` | Stays search, Lisbon dates |
| `34-flights-empty.png` | Flights, empty fields |
| `35-flights-search.png` | Flights search, route filled |
| `36-experiences-empty.png` | Experiences, no destination |
| `37-experiences-place.png` | Experiences, Lisbon |

Side-by-side marks for the worst screens are in [`annotations/`](annotations/).

## Inventory

Scanned `src/**/*.{tsx,ts,css}` (349 files). There are **no CSS modules**. Values come from Tailwind classes in components and from `src/app/globals.css`. Inline styles are rare (hero image position, a few text shadows).

Counts below are **public UI + `globals.css`**. The CMS reuses the same scale and is not a separate system. Tailwind spacing and type were resolved at a 16px root (`rem × 16`). Arbitrary values such as `text-[0.8125rem]` and CSS `font-size: 0.9rem` are included. Near-duplicates were **not** merged: `14px` and `13.6px` both count.

| Property | Distinct values | Where the bulk comes from |
| --- | ---: | --- |
| Font sizes | **38** | Tailwind `text-sm` / `text-xs` (14px, 12px) plus a long tail of one-off `rem` sizes and 6 fluid `clamp()` titles in `globals.css` |
| Spacing (padding, margin, gap) | **46** | Tailwind `p-3` `gap-2` `p-4` `p-5` `p-6` (12, 8, 16, 20, 24) plus fractional `rem` in `.plan-*` |
| Corner radii | **20** | `rounded-lg` 8px, pills, `rounded-xl` 12px, then plan radii that are not on that set |
| Color utilities | **82** | `text-heading`, `text-muted`, `text-accent`, `text-text`, `text-link`, plus opacity steps (`text-hero-type/80`, `bg-accent/15`, …) |
| Font weights | 6 | 400, 500, 600, 650, 700, 800. **650** is only in plan menus |
| Line heights | 15 | `leading-relaxed` (1.625) plus 1.2, 1.25, 1.3, 1.35, 1.375, 1.4, 1.5, 1.55, 1.6, 1.65, and a few fixed px |
| Border widths | 5 | **1px** is the rule (about 220 public uses). Also 0, 1.5px, 2px, 3px |
| Box shadows | 20 | Tailwind `shadow-sm` on stays, the shared glass shadow on chrome, and many one-off shadows |

Light theme tokens in `:root` (`globals.css`) are a small palette, about **20 named colors**:

| Token | Light value | Role today |
| --- | --- | --- |
| `--bg` | `#f6f0e6` | Page paper |
| `--surface` | `#ebe2d3` | Bands |
| `--surface-soft` | `#faf6ee` | Soft fill |
| `--white` | `#fffcf7` | Cards |
| `--heading` | `#1f1a14` | Titles |
| `--text` | `#3f382e` | Body |
| `--muted` | `#8a7d6b` | Secondary |
| `--muted-light` | `#c4b8a5` | Disabled-looking |
| `--ink` | `#2a241c` | Selected tabs, some buttons |
| `--near-black` | `#14110d` | Hero button text |
| `--accent` | `#d97706` | Eyebrows, icons, hovers, some buttons |
| `--accent-deep` | `#b45309` | Hover, a few labels |
| `--link` | `#9a3412` | Links and errors |
| `--border` | `#e0d4c2` | Hairline |
| `--border-strong` | `#cbbba3` | Secondary button border |
| `--sand` | `#d9ccb8` | Menu hover |
| `--steel` | `#6b7c6e` | Rare |
| `--on-solid` | `#fffcf7` | Text on amber or ink |
| `--hero-type` | `#f6f0e6` | Type on photos |
| `--ring` | `#d97706` | Focus, same as accent |

Glass tokens (`--glass-fill`, `--glass-shadow`, `--glass-blur`) are a separate layer and should stay limited to header, menus, and the floating tab bar.

### Font sizes actually in use

Heavy use, public + CSS:

| Size | Approx. uses | Source |
| --- | ---: | --- |
| 14px | 407 | `text-sm`, `.card-body`, `.card-cta` |
| 12px | 98 | `text-xs`, `.plan-chip`, `.plan-label`, drawer meta |
| 24px | 54 | `text-2xl`, `.plan-h2`, `.text-title` mobile |
| 20px | 39 | `text-xl` |
| 16px | 31 | `text-base`, `.plan-body`, `.plan-h4` |
| 30px | 27 | `text-3xl` drawer links |
| 18px | 25 | `text-lg`, `.card-title` |
| 13px | 11 | `.eyebrow`, `.kicker`, `.plan-caption` (`0.8125rem`) |
| 15px | a few | `.btn` and `.text-sm-tight` (`0.9375rem`) |
| 17px | 1 rule | `body` in `globals.css` |
| 19.2px | CSS | `.text-lead` (`1.2rem`) |
| 32–60px fluid | 6 clamps | `.text-display`, `.text-hero`, and a few section titles |

One-offs (1–2 uses): 9px, 9.6px, 10px, 10.4px, 10.88px, 11px, 11.2px, 11.52px, 12.8px, 13.6px, 14.4px, 15.2px, 16.32px, 16.8px, 19px, 21.6px, 28px, 30.4px, 32px, 36px, 37.6px, 48px, and the clamps. Many of the fractional ones live only in `.plan-*` rules in `globals.css` (`0.65rem`, `0.68rem`, `0.7rem`, `0.72rem`, `0.78rem`, `0.8rem`, `0.85rem`, `0.9rem`, `0.95rem`, `1.02rem`, `1.05rem`, `1.9rem`).

### Spacing

On the 4px grid and used often: **0, 2, 4, 6, 8, 10, 12, 14, 16, 20, 24, 28, 32, 36, 40, 48, 56, 64**. The proposed scale (4 / 8 / 12 / 16 / 24 / 32 / 48) is already the majority. The noise is everything else.

Off the proposed scale but common:

- **20px** (`p-5`, `section-shell` padding `1.25rem`, plan card padding) — about 129 public uses
- **6px, 10px, 14px, 2px** — half-steps from Tailwind
- **48px / 64px** section padding (`.section-band` is 48px mobile, 64px from `md`)

One-off lengths in `globals.css`: 0.8px, 1.6px, 1.92px, 2.4px, 3.2px, 4.8px, 5.6px, 6.4px, 7.2px, 8.8px, 9.6px, 10.4px, 11.2px, 12.8px, 13.6px, 14.4px, 15.2px, 18.4px. These are `rem` values such as `0.05rem`, `0.3rem`, `0.35rem`, `0.45rem`, `0.55rem`, `0.65rem`, `0.7rem`, `0.85rem`, `1.15rem`.

Page inset is **20px** (`.section-shell`). Plan setup padding is `clamp(1.25rem, 4vw, 3rem)`. Card padding jumps between **12, 16, 20, and 24px** (`p-3` stays search, `p-4` tools, `p-5` journal cards, `p-6` start-here and empty notices).

### Radii

| Radius | Uses | Typical source |
| --- | ---: | --- |
| 8px | 72 | `.btn`, `.icon-tile`, `rounded-lg` |
| pill | 86 | chips, badges, bottom-nav active blob, stays search summary |
| 12px | 52 | `.panel` (`rounded-xl`) |
| 4px | 5 public | mostly CMS; public site barely uses it |
| 6px | 12 | `rounded-md` |
| 16px | 9 | `rounded-2xl`, some plan surfaces |
| 0 | 11 | header, full-bleed heroes |
| 999px | 15 | a second “almost pill” in CSS, not `9999px` |
| 20px | 4 | plan setup shell `1.5rem` |

One-offs: **1px, 2px, 10.4px, 11.2px, 12.8px, 13.6px, 14.4px, 18.4px, 23.2px, 24px, 25.6px**. The trip tab bar is `1.45rem` (23.2px). The site tab bar is `1.6rem` (25.6px). Plan timeline rows are `0.7rem` (11.2px). Plan cards are `1.15rem` (18.4px). The plan shell variable is **28px**.

### Control heights

| Control | Height today | Notes |
| --- | --- | --- |
| `.btn` | min 44px | padding `10px 20px`, type 15px |
| `.plan-input`, `.plan-chip` | min 44px | chips are as tall as buttons |
| Header icon buttons | 44×44 (`h-11 w-11`) | inside a **76px** bar (`h-[4.75rem]`) |
| Bottom nav | 64px bar, 32px active pill | `rounded-[1.6rem]` |
| Trip workspace tabs | min 52px (`3.25rem`) on phones | fixed glass bar, 12px labels |
| Day chips | min 60px | `.plan-week-day-picker` |
| OAuth buttons | min 44px but 13px type | `.btn-oauth` |
| Stays search summary | min 44px, inner icon circle 36px | pill, not the same shape as `.plan-input` |

Inputs are not 48px. Chips are not a 36px visual with a 44px hit area. Several buttons in the flights row are shorter than the fields beside them (`35-flights-search.png`).

### Shadows and borders

Content cards are mostly flat, which is right. Exceptions:

- Stays and checkout use Tailwind `shadow-sm` **and** `border-line` / `bg-canvas`. Those color names are **not** in the theme, so the border utility does not resolve to `--border`. The stays search card reads as a soft shadow instead of the hairline used everywhere else (`33-stays-search.png`).
- Glass chrome uses `--glass-shadow` (`0 10px 28px` at 12% ink) plus a top sheen. That is appropriate for the header, drawer, and floating bars only.
- Plan dialogs, photo controls, and a few overlays each have a unique shadow (`0 24px 80px`, `0 20px 40px -16px`, and others).

Borders are 1px `--border` on panels. Plan timeline rows add a **3px** left rail in the item accent. Focus rings are 2px accent, which is fine and separate from the border token.

### Accent is not reserved

`text-accent` appears about **259** times on public components: eyebrows (`.eyebrow` is accent), icons, hovers, and some labels. `--link` (`#9a3412`) is a second warm color for text links and errors. Primary buttons are `.btn-primary` (amber), `.btn-ink` (near-black, “Add to trip”), or cream-on-photo (home hero). Three fills read as “the button” (`01-home.png`, `27-plan-overview.png`).

## Per page

Ranked by how much they break the phone layout, not by how many pixels differ.

### Plan a Trip — open trip (highest)

Screens: `27-plan-overview.png`, `28-plan-itinerary.png`, `29-plan-bookings.png`, `30-plan-packing.png`, `31-plan-add-menu.png`. Marks: `annotations/plan-overview-annotated.png`, `annotations/plan-itinerary-annotated.png`.

1. The destination photo fills the phone. Title, dates, and actions sit on the photo; the itinerary starts underneath. Overview, itinerary, and bookings all pay this cost, so the working list is a scroll away.
2. Two primary actions compete: ink “Add to trip” and amber “Book the flight” (`27`, `29`).
3. The trip tab bar is a second floating glass control (23px radius, 12px stacked labels, ink selection). It is not the site tab bar, and it covers the last row (`28`, `30`).
4. Card radii and padding change by tab: hero is square and full-bleed, overview cards are ~18px radius with 20px padding, timeline rows are ~11px with a 3px rail, day chips are 12px radius and 60px tall (`28`).
5. Bookings lanes (`29`) repeat icon + title + gray line + trailing action, but each lane sizes the icon, the button, and the gap differently. External partner buttons and in-site “Book the flight” don’t share a button.
6. Packing (`30`) is the closest to a quiet list, then the suggestion chips and category groups introduce another density.
7. The add menu (`31`) is glass with 8px item radius and 16px type, which does not match the 12px tab labels under it.
8. Type inside the planner is its own scale (`.plan-h2` 24px, `.plan-h3` 19px, `.plan-caption` 13px, plus the 12–15px one-offs above).

Empty setup (`26-plan-empty.png`) is calmer: one white sheet, chips, and a disabled Continue. It still uses the 28px plan radius, 44px chips, and a display-sized question that the rest of the site would set as a page title.

### Home

Screens: `01-home.png`, `02-home-mid.png`, `03-home-stories.png`. Marks: `annotations/home-annotated.png`.

1. The hero is a full viewport. That can stay as the editorial opening. The three actions under it cannot: filled cream, ghost outline, and an underlined text link (`01`).
2. Header is 76px with a large logo and 44px icons. The floating tab bar then adds a third chrome height (`01`).
3. Start here (`02`) centers a display title and an accent eyebrow, then uses 24px card padding. Story and guide strips on the same page (`03`) use different card padding and left-aligned headers.
4. Section bands alternate paper, white, and soft surface with 48px vertical padding. The rhythm is large compared with the 12–16px gaps inside the cards.

### Journal

Screens: `05-journal-index.png`, `06-journal-index-scrolled.png`, `07-journal-post.png`, `08-journal-post-body.png`. Marks: `annotations/journal-annotated.png`.

1. Index title is the fluid display size. Card titles are 18px (`.card-title`). Meta is 12px uppercase. There is no step between the page title and the card (`05`).
2. Cards pad at 20px (`p-5`) with a 16px grid gap. Guide cards on `/guides` use the same panel but a horizontal icon row and 20px padding in a different arrangement (`09`).
3. The tab bar covers the next card (`05`, `06`). Clearance exists in CSS, but the last visible card still sits under the bar in these shots.
4. The post (`07`, `08`) is a different page type: full-bleed photo, then a long measure. Body is the 17px site default while cards on the index are 14px. Share and save controls don’t match `.btn` height.

### Menu, search, and footer

Screens: `23-nav-drawer.png`, `24-nav-drawer-places.png`, `25-search-panel.png`, `04-footer.png`. Marks: `annotations/nav-drawer-annotated.png`.

1. Drawer links are `text-3xl` (~30px) with tight leading and uneven vertical padding (`23`). Places expands into a smaller list (`24`) that doesn’t share row height with the parent items.
2. The drawer search field, the header search panel (`25`), and trip inputs are three search shapes.
3. Sign-in in the drawer is a text button. Sign-in on `/login` is a filled amber button (`20`).
4. Footer (`04`) is the most structured block on the marketing site: a kicker, a title, columns, hairlines. Link size and column gap still don’t match the drawer or the guide lists. The newsletter form is another input height.

### Flights and stays

Screens: `32`–`35`. Marks: `annotations/flights-annotated.png`.

1. Flights (`34`, `35`) shows a real search form. Fields, the date control, traveler stepper, and Search button do not share one height or one corner radius. Search sits on the right of a two-column row and looks shorter than the fields.
2. The “not configured” notice is a second card with a display-sized title and 24–32px padding, stacked under a tighter form (`35`).
3. “Plan a trip” under the notice uses the link color, while Search uses amber (`35`).
4. Stays without a destination (`32`) is only the notice. With a destination (`33`) the summary is a pill (36px icon circle, 14px title, 12px gray line) and the editor uses `border-line`, which is not a theme color. Results and hotel detail could not be opened.

### Guides, places, tools, experiences

Screens: `09`, `10`, `11`–`13`, `15`, `16`, `36`, `37`.

1. Guides index (`09`) is the best card grid: icon tile, title, gray body, “Open hub” link. Padding is 20px (`p-5`) and the icon tile is 44px with an 8px radius. Tool cards (`15`) are the same idea with 16px padding, a 14px gap (`gap-3.5`), and a 10px “Affiliate” chip (`text-[0.625rem]`).
2. A guide hub (`10`) switches to a link list under a display title. Rows don’t use the icon-column anatomy of the index.
3. Places (`11`) is another card grid, then a map. The place page (`12`, `13`) returns to a full-bleed photo and a different fact-strip layout.
4. Experiences (`36`, `37`) copies the stays/flights notice, then a trip bar and an outbound button. The trip bar is a third “where / when” summary, after the planner hero and the stays pill.

### Account and sign-in

Screens: `20`, `21`, `22`, `18`.

1. Sign-in (`20`) is a centered card. Google is a full-width button, X is a narrower pill, and the email fields don’t match `.plan-input` padding. Primary submit is amber, which is correct, but the social buttons compete with it.
2. Account signed-out (`21`) is a short panel and one button, visually closer to the empty notices than to the sign-in card.
3. Contact (`18`) and forgot password (`22`) are further one-off forms.

### What is already consistent

Worth keeping in Phase 2:

- Paper background, cream cards, ink headings, muted secondary text.
- Outfit for titles, Inter for body.
- `.panel` hairline and 12px radius on guides, journal, and tools.
- `.btn` at least 44px tall.
- Glass limited to chrome (header, drawer, tab bar, add menu), not on scrolling article text.
- A repeated row idea already exists: icon, primary line, gray secondary line, trailing action (tools, guides, itinerary, bookings, packing).

## Proposed system (Phase 2, not built)

Map tokens onto the current fonts and palette. Do not introduce a new typeface or a new hue.

### Spacing

Use only **4, 8, 12, 16, 24, 32, 48**.

| Token | px | Use |
| --- | ---: | --- |
| `space-1` | 4 | Label to value, icon to text |
| `space-2` | 8 | Inside a row, between title and secondary line |
| `space-3` | 12 | Gap between cards, gap inside a card |
| `space-4` | 16 | Card padding, page inset on phones, input padding-x |
| `space-6` | 24 | Between sections inside a page |
| `space-8` | 32 | Space under a page header |
| `space-12` | 48 | Major band padding |

Retire 20px as a card padding (`p-5` and `.plan-pad`). Page inset moves from 20px to 16px on phones. Section bands move from 48/64 to 32 under the header and 48 between major home bands.

### Type

Five sizes. Outfit only for `display` and `title`. Inter for the rest.

| Token | Size | Weight | Line height | Use |
| --- | ---: | ---: | ---: | --- |
| `display` | 30px | 700 | 1.2 | One page title. Mobile only; no clamp |
| `title` | 20px | 700 | 1.25 | Card title, section header, dialog title |
| `body` | 16px | 400 | 1.5 | Paragraphs, input text, list primary line |
| `secondary` | 14px | 400 | 1.4 | Secondary gray line, button label |
| `caption` | 12px | 500 | 1.35 | Meta, timestamps, tab labels, eyebrows |

Eyebrows stay 12px, weight 600, tracking `0.06em`, uppercase, color **muted** (not amber). Drop 13, 15, 17, 19, 19.2, and the fluid clamps from the mobile scale. Body copy moves from 17px to 16px so it matches inputs and list rows. Drawer links move from 30px to `title` (20px) with a `caption` subtitle.

Weights in the system: **400, 500, 600, 700**. Drop 650 and 800.

### Controls

| Control | Visual height | Hit area | Radius | Type |
| --- | ---: | ---: | ---: | --- |
| Button | 48px | 48px | 8px | 14px / 600 |
| Input, select | 48px | 48px | 8px | 16px / 400 |
| Chip | 36px | 44px | pill | 14px / 600 |
| Icon button | 44px | 44px | 8px | — |
| List row | min 56px | full row | 12px if boxed, 0 if divided | 16px + 14px |

Primary button: fill `--accent` (`#d97706`), label `--on-solid`. Hover `--accent-deep`. Secondary: `--white` fill, 1px `--border`, label `--heading`. Selected tab or chip: `--ink` fill, `--on-solid` label. No third fill.

### Radius, border, shadow

| Token | Value | Use |
| --- | --- | --- |
| `radius-control` | 8px | Buttons, inputs, icon buttons, icon tiles |
| `radius-card` | 12px | Cards, dialogs, menus |
| `radius-pill` | 999px | Chips, search summary, tab-bar shell |

One border: **1px solid `var(--border)`** (`#e0d4c2`). Selected controls use `--ink` or `--accent` as the fill, not a second border color. Delete `border-line`.

Shadow policy: **none on cards and rows**. One shadow, the existing glass shadow, on floating chrome only (header, drawer, tab bar, popover). No `shadow-sm` on stays cards.

### Color roles

| Role | Token | Value | Allowed use |
| --- | --- | --- | --- |
| Primary text | `--heading` | `#1f1a14` | Titles, list primary line |
| Secondary text | `--text` | `#3f382e` | Body |
| Muted text | `--muted` | `#8a7d6b` | Secondary line, captions, placeholders |
| Accent | `--accent` | `#d97706` | Primary button fill, focus ring, and nothing else |
| Paper | `--bg` | `#f6f0e6` | Page |
| Card | `--white` | `#fffcf7` | Cards |
| Soft | `--surface-soft` | `#faf6ee` | Grouped wells, chip rest state |

`--link` stops being a second accent. Inline links use `--heading` with an underline. Errors can use `--link` until a dedicated danger token exists; they should not look like text links and a primary button at the same time.

`--accent-deep` remains the primary-button hover only.

### Shared components to build

These are the repeats. Today they are copied as class strings, not components (except where noted).

| Component | Job | Used today on |
| --- | --- | --- |
| `Button` | Primary, secondary, ghost. One height, one radius | Home hero, notices, planner, login, account, contact, flights, stays, experiences. Variants already sketched as `.btn`, `.btn-primary`, `.btn-secondary`, `.btn-ink` |
| `Input` | Text, select, date. 48px, 8px radius | Plan setup, flights, stays, login, contact, newsletter, header search, drawer search |
| `Chip` | 36px visual, 44px hit, pill | Plan category chips, affiliate badge, day chips, packing suggestions, destination pills |
| `Card` | 16px padding, 12px radius, 1px border, no shadow | Journal `PostCard`, guide hubs, tool cards, start-here cards, empty notices, plan panels (`.panel`) |
| `ListRow` | Icon column, primary 16px, secondary 14px muted, trailing action | Itinerary rows, booking lanes, packing rows, tool cards, guide cards, footer links, search results, drawer rows |
| `SectionHeader` | Title 20px or page 30px, one muted subtitle, left aligned | `SectionHead` on the home page, `SitePage` title block, plan headings, guide and journal headers |
| `IconTile` | 40px box, 8px radius, 1px border | `.icon-tile` on guides and tools. Planner rows use a different glyph column |
| `EmptyState` | One card, one sentence, one primary button | The same notice is copied in stays, flights, and experiences. Account signed-out is a cousin |
| `AppBar` | One floating bar pattern | `MobileBottomNav` and `.plan-workspace-tabs` should be the same shell with different items |
| `SearchSummary` | Place, dates, travelers on one row | Stays summary pill, flights fields, experiences trip bar, plan hero meta. One row, not four |

`SitePage` stays the page frame. It should consume `SectionHeader` instead of mixing breadcrumbs, accent eyebrows, and `text-display`.

## Rollout

Each phase ships the tokens and the shared components onto one cluster of screens. Later phases only consume them.

1. **Phase 2 — foundation + Plan a Trip.** Add the tokens to `globals.css` / `@theme`. Build `Button`, `Input`, `Chip`, `Card`, `ListRow`, `SectionHeader`, `AppBar`. Apply them to `/guides/plan-a-trip` (empty setup, overview, itinerary, bookings, packing, add menu). This is the densest screen and the one that invented the parallel `.plan-*` scale.
2. **Phase 3 — Stays, Flights, checkout.** Replace `border-line` / `bg-canvas` / `shadow-sm`. One search summary, one result row, one hotel/fare card. Needs the live keys to check results and detail; the search and empty states can move first.
3. **Phase 4 — Home, journal, guides, places.** Keep the photo heroes. Unify card padding, section headers, and the type steps on `/`, `/blog`, a post, `/guides`, a guide hub, `/destinations`, and a place page.
4. **Phase 5 — Experiences, Tools, account, nav, cleanup.** Drawer, header search, footer, sign-in, account, contact, tools. Tools keeps its current affiliate URLs. Delete unused sizes, the 650 weight, one-off radii, and the plan-only spacing variables once nothing references them.

## How to reproduce the counts

From the repo root, a scan of `src/**/*.{tsx,ts,css}` that:

- resolves Tailwind spacing and `text-*` sizes with a 16px root
- includes `font-size`, padding, margin, gap, `border-radius`, and color utilities in `globals.css`
- does not merge nearby values

yields 38 font sizes, 46 spacing lengths, 20 radii, and 82 color utilities on the public site plus `globals.css`.
