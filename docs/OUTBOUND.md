# Outbound interstitial (`/out`)

When a reader clicks a link that leaves **alexjourneys.com**, they briefly land on a branded departure page, then continue to the destination (~4 seconds). Metaphor: leaving the journal — warm paper UI, destination hostname, honest copy (affiliate line only when the link is marked affiliate).

## URL shape

```
/out?to=<urlencoded absolute https-or-http URL>
/out?to=...&aff=1
```

- `to` — required; must be an absolute `http:` / `https:` URL.
- `aff=1` — optional; shows the affiliate disclosure on the pause page.
- Blocked: `javascript:`, `data:`, other schemes, credentials in the URL, and same-site hosts (use normal in-app navigation instead).
- Page is `noindex` (metadata + `robots.txt` disallow).

## Helpers

- `outboundHref(url, { affiliate? })` → `/out?to=...` (or unchanged for relative / own-host / mailto).
- `<OutboundLink href affiliate?>` — prefer this for public external / affiliate anchors.
- `rewriteHtmlExternalLinks(html)` — used by `PostContent` for CMS / migrated HTML.

## Wired surfaces

- Tools cards (`ToolCard`, home `ToolsStrip`) — affiliate
- Footer social + Buy me a coffee
- Blog byline Instagram links
- Media kit platform cards (external only)
- Post / page HTML body links via `PostContent`

CMS preview links, auth absolute URLs, and same-site paths are **not** routed through `/out`.

## Reduced motion

If `prefers-reduced-motion: reduce`, the delay shortens to ~400ms; a **Continue now** control is always available.
