# Design audit (Phase 1)

Audit only. No app code, styles, or components were changed.

Alex’s main complaint: items feel too big and take up too much of the phone. Padding and vertical gaps are generous, and they are not the same from screen to screen. A 390px-wide screen should show more of the trip, not a single hero and one card.

The target is still Google Flights’ organization (one spacing scale, one row anatomy, a short type scale, aligned controls, a 1px border, little shadow). Touch targets stay at **44px** (Apple HIG minimum) and never past **48px** (Material’s usual ceiling). Hierarchy comes from weight and the existing gray steps, not from making type larger. Plan a Trip is the first screen to tighten. Journal and guide prose can keep a little more air than the planner.

Fonts stay **Outfit** and **Inter**. Colors stay the current `:root` palette. Phase 2 does not add a typeface, a weight, or a hex value. It uses the existing ones in fewer, smaller roles. Frosted glass stays on chrome only.

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

Anything taller than **44px** is spending space the touch guideline does not ask for. The header (76px), bottom bar (64px), trip tabs (52–58px), and day chips (60px) are the clear cases. Chips are the same 44px as buttons, so a filter row is as tall as a primary action. A few flight controls are shorter than the fields next to them (`35-flights-search.png`), which is the other failure: mismatched, not uniformly dense.

## What is oversized

Measured from the phone screenshots and the CSS that paints them. “Too big” here means it pushes the next piece of content off the first screen, or it is taller than a 44px touch target with no second line of text to justify the height.

### Text

| What | Size now | Where | Why it dominates |
| --- | --- | --- | --- |
| Home hero | min **37.6px**, up to 60px (`.text-hero`) | `01-home.png` | Clamp floor is `2.35rem`. On a 390px phone the title is already 38px before the three buttons. |
| Page titles | min **32px** (`.text-display`, `.text-title`) | Journal, guides, stays, flights, account | Every hub page opens with a 32px Outfit title plus a **19.2px** lead (`.text-lead`, line-height 1.65). |
| Drawer links | **30px** (`text-3xl`) | `23-nav-drawer.png` | Eight links of display type. A menu should be a list, not a poster. |
| Trip name on the photo | **30.4px** (`1.9rem`) | `27`–`29` | Sits inside a hero that is already most of the screen. |
| Empty-state titles | **24px** (`text-2xl`) | `32`, `34`, `36` | One sentence of instruction is set like a page headline, inside 24–32px of padding. |
| Planner section titles | **24px** and **19px** (`.plan-h2`, `.plan-h3`) | Plan a Trip | Headings between rows cost a row. |
| Body | **17px**, line-height **1.65** | `body` in `globals.css` | Fine for a journal article. Loose for a packing row or a fare. |
| Lead under titles | **19.2px**, line-height 1.65 | `SitePage`, `SectionHead` | A subtitle taller than the 16px row text in the planner. |

Sizes that already fit a dense UI and should be the ones we keep: **16px, 14px, 12px**. They are the most used (`text-base`, `text-sm`, `text-xs`). The oversized set is the display clamps and the one-off planner sizes (13px, 15px, 19px, 30px).

### Card padding

| Surface | Padding | Screenshot |
| --- | --- | --- |
| Start here cards | **24px** (`p-6`) | `02-home-mid.png` |
| Empty notices (stays, flights, experiences) | **24px**, **32px** from `sm` (`p-6 sm:p-8`) | `32`, `35`, `36` |
| Journal cards, guide hubs | **20px** (`p-5`) | `05`, `09` |
| Plan cards and page inset | **20px** (`.plan-pad`, `.section-shell`) | `26`, `28` |
| Tool cards | **16px** (`p-4`) | `15` |
| Stays search shell | **12px** (`p-3`) | `33` |

The same “card” is 12, 16, 20, 24, or 32px inside. Twenty pixels of padding on a 350px-wide phone card is 11% of the width before any type. Plan a Trip should use the 12px end. Reading cards can use 16px. 20, 24, and 32 should go.

### Controls taller than 44px

44×44 is the minimum hit area, not a reason to make the control’s box taller.

| Control | Height | Notes |
| --- | ---: | --- |
| Site header bar | **76px** | Icon buttons inside it are already 44px. The extra 32px is logo and padding. |
| Bottom tab bar | **64px**, plus ~10px float | Each tab’s hit area could be 44px. The bar’s own height and the active 32px pill stack chrome. Clearance under pages is about **95px** plus the safe area. |
| Trip tab bar | **58px** bar, **52px** buttons | Fixed over the list. Labels are 12px, so the bar is mostly padding. |
| Day chips | **60px** | Two lines of type do not need 60px. 44px holds a weekday and a date. |
| Category chips, inputs, `.btn` | **44px** | At the guideline. Category chips should look smaller (36px) and keep a 44px hit area, or a row of filters is as tall as the form. |
| Icon tiles | **44px** square | Same visual size as a button, so a guide card leads with a button-sized ornament. |

### Heroes and images

| Image | Height on a 390×844 phone | Screenshot |
| --- | --- | --- |
| Home hero | **100dvh** (the whole screen) | `01-home.png` |
| Open-trip photo | **min 396px** (`20rem` + 76px header), full width, square corners | `27`, `28`, `29` |
| Journal card photo | **~220px** (`aspect-[16/10]` on a ~350px card) before the title | `05` |
| Place page photo | Full-bleed hero, then the facts start below | `12-place-iceland.png` |
| Post hero | Full-bleed photo before the article | `07-journal-post.png` |

On the open trip, the first screen is the photograph, the title, and two buttons. The day’s plans start on the next scroll. That is the opposite of an overview.

### Vertical gaps

| Gap | Size | Where |
| --- | ---: | --- |
| Section band | **48px** top and bottom, **64px** from 768px | `.section-band` on home and `SitePage` |
| Space under a hub title | **40px** | `.hub-follow` |
| Space between hub blocks | **48px** | `.hub-block` |
| Crumbs to eyebrow | **32px** | `mt-8` in `SitePage` |
| Plan blocks | **24px** between blocks, **20px** between subsections | `--plan-block`, `--plan-section` |
| Card grids | **16px** (`gap-4`) or **20px** (`sm:gap-5`) | Journal, guides, start here |

A journal index therefore spends roughly: 76px header + 32px title block + 40px before the first card + 220px photo + 20px padding. The title of the first story sits past the middle of the phone. A planner with a 396px hero never reaches a second row.

### Shadows and borders

Content cards are mostly flat, which is right. Exceptions:

- Stays and checkout use Tailwind `shadow-sm` **and** `border-line` / `bg-canvas`. Those color names are **not** in the theme, so the border utility does not resolve to `--border`. The stays search card reads as a soft shadow instead of the hairline used everywhere else (`33-stays-search.png`).
- Glass chrome uses `--glass-shadow` (`0 10px 28px` at 12% ink) plus a top sheen. That is appropriate for the header, drawer, and floating bars only.
- Plan dialogs, photo controls, and a few overlays each have a unique shadow (`0 24px 80px`, `0 20px 40px -16px`, and others).

Borders are 1px `--border` on panels. Plan timeline rows add a **3px** left rail in the item accent. Focus rings are 2px accent, which is fine and separate from the border token.

### Accent is not reserved

`text-accent` appears about **259** times on public components: eyebrows (`.eyebrow` is accent), icons, hovers, and some labels. `--link` (`#9a3412`) is a second warm color for text links and errors. Primary buttons are `.btn-primary` (amber), `.btn-ink` (near-black, “Add to trip”), or cream-on-photo (home hero). Three fills read as “the button” (`01-home.png`, `27-plan-overview.png`).

## Ranked issues

Ordered by how much they waste the phone, which is Alex’s complaint. Organization problems that remain after the size is fixed are included.

1. **The open trip does not fit an overview on one screen.** The photo is at least 396px, the header is 76px, and the tab bar is another 58px. Itinerary, bookings, and overview all pay this before the first plan row (`27`, `28`, `29`).
2. **Chrome and controls are taller than a 44px touch target.** Header 76px, site tab bar 64px, trip tabs 52–58px, day chips 60px. The guideline is the floor, and these are past it.
3. **Titles are display size on every kind of page.** Hero type floors at 38px, hub titles at 32px, drawer links at 30px, empty states at 24px, with a 19px lead under hub titles. Weight and gray would do the hierarchy in less space.
4. **Vertical gaps and card padding are large and uneven.** Section bands are 48px (64px on larger widths), the gap under a hub title is 40px, and card padding jumps among 12, 16, 20, 24, and 32px.
5. **Photos take the first screen on home, journal cards, posts, and place pages.** Home is `100dvh`. A story card spends ~220px on a 16/10 image before its title (`01`, `05`, `07`, `12`).
6. **Two tab bars, and two “primary” buttons.** The trip bar does not match the site bar. “Add to trip” is ink and “Book the flight” is amber (`27`, `29`). Amber is also eyebrows, icons, and hovers (~259 `text-accent` uses).
7. **Rows that should scan are not one anatomy.** Itinerary, bookings, packing, tools, and guides each align the icon, the gray line, and the trailing action differently, so a dense list still looks uneven (`28`, `29`, `15`, `09`).
8. **Planner type is a second scale.** 24px and 19px headings, 13px captions, 15px buttons, and fractional `rem` gaps live only in `.plan-*`.
9. **Empty states are oversized cards.** Stays, flights, and experiences use a 24px title and 24–32px padding to say one sentence (`32`, `34`, `36`).
10. **Stays cards do not use the shared hairline.** They ask for `border-line` and `bg-canvas` (not in the theme) and add `shadow-sm` (`33`).

## Per page

The notes under each page point at the screenshot. The size problems above are the ranking.

### Plan a Trip — open trip (highest)

Screens: `27-plan-overview.png`, `28-plan-itinerary.png`, `29-plan-bookings.png`, `30-plan-packing.png`, `31-plan-add-menu.png`. Marks: `annotations/plan-overview-annotated.png`, `annotations/plan-itinerary-annotated.png`.

1. The destination photo is the page. At least 396px of image, then a 30px title, then buttons. The first itinerary row is on the next screen (`27`, `28`, `29`). This is the density failure to fix first.
2. Day chips are 60px and category chips are 44px, so a week of dates uses more vertical space than the plans on those dates (`28`).
3. Two primary actions compete: ink “Add to trip” and amber “Book the flight” (`27`, `29`). Both are full-width and 44px, stacked.
4. The trip tab bar is a second floating glass control (about 58px, 12px stacked labels). It covers the last row (`28`, `30`).
5. Card padding is 20px and radii change by tab: overview cards ~18px radius, timeline rows ~11px with a 3px rail (`28`).
5. Bookings lanes (`29`) repeat icon + title + gray line + trailing action, but each lane sizes the icon, the button, and the gap differently. External partner buttons and in-site “Book the flight” don’t share a button.
6. Packing (`30`) is the closest to a quiet list, then the suggestion chips and category groups introduce another density.
7. The add menu (`31`) is glass with 8px item radius and 16px type, which does not match the 12px tab labels under it.
8. Type inside the planner is its own scale (`.plan-h2` 24px, `.plan-h3` 19px, `.plan-caption` 13px, plus the 12–15px one-offs above).

Empty setup (`26-plan-empty.png`) is calmer: one white sheet, chips, and a disabled Continue. The question is still display-sized, the sheet radius is 28px, and the chips are 44px tall, so the first screen holds the question and a few chips rather than the whole setup.

### Home

Screens: `01-home.png`, `02-home-mid.png`, `03-home-stories.png`. Marks: `annotations/home-annotated.png`.

1. The hero is the entire phone (`min-h-[100dvh]`), with 38px type. Start here is not on the first screen (`01`). A photo opening can stay for the journal mood, but it should end high enough that the next section is visible.
2. Under that title, three actions use three shapes: filled cream, ghost outline, and an underlined text link (`01`).
3. The header is 76px and the floating tab bar is 64px (`01`). Together they are a lot of chrome around an already full-screen image.
4. Start here (`02`) uses a 32px centered title, an accent eyebrow, 24px card padding, and 48px of band padding. Story strips on the same page (`03`) use another padding and a left-aligned header.

### Journal

Screens: `05-journal-index.png`, `06-journal-index-scrolled.png`, `07-journal-post.png`, `08-journal-post-body.png`. Marks: `annotations/journal-annotated.png`.

1. The index can stay looser than the planner, and it is looser than it needs to be. A 32px title, 40px before the grid, then a ~220px 16/10 photo means the first story’s title sits past the middle of the phone (`05`).
2. Cards pad at 20px (`p-5`) with a 16px grid gap. Card titles are 18px, which is a reasonable step down from a 24px page title. The photo and the padding are what feel big, not the 14px excerpt.
3. The 64px tab bar covers the next card (`05`, `06`).
4. The post (`07`, `08`) is the reading page: a full-bleed photo, then 17px body at 1.65 line-height. That measure is the one to keep. The hero above it is the part to shorten. Share and save controls don’t match the 44px button.

### Menu, search, and footer

Screens: `23-nav-drawer.png`, `24-nav-drawer-places.png`, `25-search-panel.png`, `04-footer.png`. Marks: `annotations/nav-drawer-annotated.png`.

1. Drawer links are `text-3xl` (30px). Each row is a headline. Places opens into a smaller list (`24`) that doesn’t share that row’s type or height. A menu at 16px with a 12px gray subtitle would show the whole list without scrolling.
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
- `.btn` already meets the 44px touch minimum. The work is to stop growing chrome and images past that, not to make buttons taller.
- Glass limited to chrome (header, drawer, tab bar, add menu), not on scrolling article text.
- A repeated row idea already exists: icon, primary line, gray secondary line, trailing action (tools, guides, itinerary, bookings, packing).

## Proposed system (Phase 2, not built)

Same fonts. Same palette. Two densities.

**Compact** is for screens where the point is to see many items: Plan a Trip, Stays, Flights, and the experiences booking bar. The planner is the strictest. The first screen of an open trip should show the destination, the dates, and several plan rows, not a poster.

**Comfortable** is for reading: journal posts, guide prose, about, and the home story strips. More air than the planner, less than today’s 48px bands and 32px titles.

Neither density adds a font, a weight, or a color. Outfit stays the display face (already loaded at 500–800). Inter stays the text face (already loaded at 400–700). Every size below is already in the CSS (`text-xl`, `text-lg`, `text-base`, `text-sm`, `text-xs`, and the 17px `body`). The fluid clamps, the 30px drawer links, and the one-off planner sizes are dropped from use, not replaced with new ones.

### Spacing

Only **4, 8, 12, 16, 24**. 32 and 48 stay off phone layouts. 20px (`p-5`, `.plan-pad`) is retired.

| Token | px | Compact (planner, stays, flights) | Comfortable (journal, guides, home) |
| --- | ---: | --- | --- |
| `space-1` | 4 | Icon to text, label to value | Same |
| `space-2` | 8 | Gap between cards and rows, title to gray line | Gap inside a card |
| `space-3` | 12 | Card padding, page inset | Gap between cards |
| `space-4` | 16 | Only the horizontal page inset if 12px feels cramped on a form | Card padding, page inset |
| `space-6` | 24 | Between major blocks (setup vs list). Not between rows | Under a page header, between home bands |

Today’s 40px `.hub-follow`, 48px `.section-band`, and 64px desktop band become 24px on the phone. Home bands can use 24px as well. A reading page does not need 48px of empty paper to feel calm.

### Type

Five sizes, all existing. Outfit for `title` only. Inter for everything else, including compact page titles if they sit in a list header (16px semibold is enough there).

| Token | Size | Weight | Line height | Compact | Comfortable |
| --- | ---: | ---: | ---: | --- | --- |
| `title` | 20px | 700 | 1.25 | Screen title (“Lisbon in October”). One per view | Card title, section header |
| `body` | 16px | 400 | 1.5 | Row primary line, input text, section label (600) | UI around an article |
| `reading` | 17px | 400 | 1.65 | Not used | Journal and guide prose. This is today’s `body` rule. Keep it |
| `secondary` | 14px | 400 | 1.4 | Gray line under a row, button label, empty-state sentence | Excerpt, card body |
| `caption` | 12px | 500 | 1.35 | Meta, tab labels, eyebrows, timestamps | Same |

No 24px, 30px, 32px, or 38px type on the phone. Hierarchy is weight (400 vs 600 vs 700) and color (`--heading`, `--text`, `--muted`), which is how a scannable list works in HIG and Material. Drawer links move from 30px to 16px with a 12px subtitle. Empty states use a 14px sentence and one button, not a 24px headline.

Eyebrows stay 12px, weight 600, uppercase, in existing `--muted`. They stop using `--accent`, so amber is not a heading style.

Weights in use: **400, 500, 600, 700**. Those are already on Inter and Outfit. Drop synthesized **650**. Hero **800** is unused once the hero clamp is gone.

### Controls

Hit area is at least **44×44**. Nothing in the app UI grows past **48px** unless the row has two text lines, and even then the row is 48px, not 56 or 60.

| Control | Visual height | Hit area | Type |
| --- | ---: | ---: | --- |
| Button | 44px | 44px | 14px / 600 |
| Input, select | 44px | 44px | 16px / 400 |
| Chip | 36px | 44px | 14px / 600 |
| Icon button | 44px | 44px | — |
| Compact list row | 48px when it has a gray line, 44px when it does not | full row | 16px + 14px, or 14px + 12px in the planner if a row is one line plus meta |
| Tab bar | 48px including padding | 44px per tab | 12px label, icon 20px |
| Header bar | 48px content height | 44px icons | Logo scales down to fit. Today’s 76px bar does not |

Day chips become 44px (weekday + date on one compact stack, or a single line). Category chips stay visually 36px. The trip photo, if it stays, is a strip of about **72–96px** or a one-line summary under the header, not a 396px hero. Home and place heroes, on the comfortable pages, cap near **half the screen** so the next section is visible. Journal card images get shorter than 16/10 (a 2/1 crop is about 175px on this phone, and a 16/9 crop is about 197px; either beats 220px plus 20px of padding).

Primary button: existing `--accent` fill, `--on-solid` label, `--accent-deep` hover. Secondary: `--white` fill, 1px `--border`, `--heading` label. Selected tab or chip: `--ink` fill, `--on-solid` label. One primary per screen. “Add to trip” becomes secondary (or a 44px icon button), and the booking action keeps the accent.

### Radius, border, shadow

| Token | Value | Use |
| --- | --- | --- |
| `radius-control` | 8px | Buttons, inputs, icon buttons. Already `.btn` |
| `radius-card` | 12px | Cards, dialogs, menus. Already `.panel` |
| `radius-pill` | 999px | Chips and the search summary only |

One border: **1px solid `var(--border)`**. Selected controls use the existing `--ink` or `--accent` fill. `border-line` is not a token. Do not add one. Map those rules to `--border`.

Shadow policy: **none on cards and rows**. The existing glass shadow stays on floating chrome only. No `shadow-sm` on stays cards. A shorter header and a 48px tab bar still use that glass. They just stop being 76px and 64px.

### Color roles

No new colors. The hex values below are the ones already in `:root`. The change is where each one is allowed.

| Role | Existing token | Light value | Use |
| --- | --- | --- | --- |
| Primary text | `--heading` | `#1f1a14` | Titles, list primary line |
| Body text | `--text` | `#3f382e` | Prose, secondary sentences |
| Muted text | `--muted` | `#8a7d6b` | Gray line, captions, placeholders, eyebrows |
| Link | `--link` | `#9a3412` | Inline links only. Not buttons, not errors-as-links mixed with the primary button on the same card |
| Accent | `--accent` | `#d97706` | Primary button fill and focus ring (`--ring` is already this hex) |
| Accent hover | `--accent-deep` | `#b45309` | Primary button hover only |
| Paper | `--bg` | `#f6f0e6` | Page |
| Card | `--white` | `#fffcf7` | Cards |
| Soft well | `--surface-soft` | `#faf6ee` | Chip rest state, grouped wells |
| Selected fill | `--ink` | `#2a241c` | Selected tab or chip |
| On solid | `--on-solid` | `#fffcf7` | Label on accent or ink |
| On photos | `--hero-type` | `#f6f0e6` | Type sitting on a photograph |

`--near-black`, `--sand`, `--steel`, `--surface`, `--muted-light`, and `--border-strong` stay in the theme for the cases that already use them (photo-button text, menu hover, hairline emphasis). They are not a second accent and not a new scale.

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
| `Button` | 44px. Primary, secondary, ghost. One radius | Home hero, notices, planner, login, account, contact, flights, stays, experiences. Variants already sketched as `.btn`, `.btn-primary`, `.btn-secondary`, `.btn-ink` |
| `Input` | 44px, 8px radius | Plan setup, flights, stays, login, contact, newsletter, header search, drawer search |
| `Chip` | 36px visual, 44px hit, pill | Plan category chips, affiliate badge, day chips (today 60px), packing suggestions, destination pills |
| `Card` | Compact padding 12px, comfortable padding 16px, 12px radius, no shadow | Journal `PostCard`, guide hubs, tool cards, start-here cards, empty notices, plan panels (`.panel`) |
| `ListRow` | 44–48px. Icon, 16/14 or 14/12, trailing action | Itinerary rows, booking lanes, packing rows, tool cards, guide cards, footer links, search results, drawer rows |
| `SectionHeader` | Compact title 20px, comfortable title 20px, one 14px muted subtitle. Left aligned. No 32px display | `SectionHead` on the home page, `SitePage` title block, plan headings, guide and journal headers |
| `IconTile` | 32px visual inside the row, not a 44px button | `.icon-tile` on guides and tools. Planner rows use a different glyph column |
| `EmptyState` | 14px sentence, 12px padding, one 44px button | The same notice is copied in stays, flights, and experiences. Account signed-out is a cousin |
| `AppBar` | One 48px glass bar | `MobileBottomNav` (64px today) and `.plan-workspace-tabs` (58px today) |
| `SearchSummary` | One 44px row: place, dates, travelers | Stays summary pill, flights fields, experiences trip bar, plan hero meta. Replaces the 396px trip photo as the overview header |

`SitePage` stays the page frame. It should consume `SectionHeader` instead of mixing breadcrumbs, accent eyebrows, and `text-display`.

## Rollout

Each phase ships the tokens and the shared components onto one cluster of screens. Later phases only consume them.

1. **Phase 2 — foundation + Plan a Trip (compact).** Add the compact tokens. Build `Button`, `Input`, `Chip`, `Card`, `ListRow`, `SectionHeader`, `AppBar`, `SearchSummary`. Apply them to `/guides/plan-a-trip`: drop the 396px hero to a summary row, 12px card padding, 44px controls, 48px rows. Empty setup, overview, itinerary, bookings, packing, and the add menu should each show more than one block on the first screen.
2. **Phase 3 — Stays, Flights, checkout (compact).** Same density as the planner. Replace `border-line` / `bg-canvas` / `shadow-sm` with `--border` and no shadow. One search summary, one result row, one hotel or fare card. Shrink the empty notices. Live keys are still needed to check results and detail. The search and empty states can move first.
3. **Phase 4 — Home, journal, guides, places (comfortable).** Keep Outfit, Inter, and the paper palette. Shorten heroes so they are not the whole phone. Page titles 20px, card padding 16px, section gaps 24px, prose stays 17px. Journal cards keep more air than planner rows, and they lose the 220px-before-the-title crop.
4. **Phase 5 — Experiences, Tools, account, nav, cleanup.** Drawer links down from 30px to a 16px row. Header down from 76px toward 48px. One tab bar at 48px. Tools keeps its current affiliate URLs. Delete unused sizes, the 650 weight, one-off radii, and the plan-only spacing variables once nothing references them.

## How to reproduce the counts

From the repo root, a scan of `src/**/*.{tsx,ts,css}` that:

- resolves Tailwind spacing and `text-*` sizes with a 16px root
- includes `font-size`, padding, margin, gap, `border-radius`, and color utilities in `globals.css`
- does not merge nearby values

yields 38 font sizes, 46 spacing lengths, 20 radii, and 82 color utilities on the public site plus `globals.css`.
